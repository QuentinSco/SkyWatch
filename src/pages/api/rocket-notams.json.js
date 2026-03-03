/**
 * API endpoint: /api/rocket-notams.json
 * Fetches AHA/DRA rocket NOTAMs from FAA.
 *
 * Strategy:
 *   1. FAA Official API (api.faa.gov) — if FAA_CLIENT_ID + FAA_CLIENT_SECRET are set in env
 *   2. Direct query to notams.aim.faa.gov — public, no key, same source as old `notams` npm package
 *   Returns GeoJSON FeatureCollection. No mock data.
 */

import { parseRocketNotam } from '../../../JS/notamRocket.js';

const FAA_CLIENT_ID     = import.meta.env.FAA_CLIENT_ID;
const FAA_CLIENT_SECRET = import.meta.env.FAA_CLIENT_SECRET;

// FIRs / ARTCCs covering US rocket launch sites
// ZMA = Miami (Cape Canaveral), ZHU = Houston (Starbase), ZLA = LA (Vandenberg), ZJX = Jacksonville
const ROCKET_FIRS = ['ZMA', 'ZHU', 'ZLA', 'ZJX'];

const NOTAM_SEARCH_URL = 'https://notams.aim.faa.gov/notamSearch/search';
const FAA_TOKEN_URL    = 'https://api.faa.gov/oauth/token';
const FAA_NOTAM_URL    = 'https://api.faa.gov/notams/v1/notams';

// ─── Approach A : FAA Official API (requires env credentials) ─────────────────
async function fetchViaOfficialAPI() {
  // Step 1: get OAuth2 bearer token
  const tokenRes = await fetch(FAA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     FAA_CLIENT_ID,
      client_secret: FAA_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`FAA token request failed: HTTP ${tokenRes.status}`);
  }

  const { access_token } = await tokenRes.json();

  // Step 2: query NOTAMs filtered by space keywords
  // Paginate through all results (FAA API returns max 100 per page)
  let allItems = [];
  let pageNum  = 1;
  let hasMore  = true;

  while (hasMore) {
    const url = new URL(FAA_NOTAM_URL);
    url.searchParams.set('keywords',  'SPACE LAUNCH');
    url.searchParams.set('pageSize',  '100');
    url.searchParams.set('pageNum',   String(pageNum));

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept':        'application/json',
      },
    });

    if (!res.ok) break;

    const data = await res.json();
    const items = data?.items || data?.notamList || [];
    allItems = allItems.concat(items);

    hasMore = items.length === 100;
    pageNum++;
  }

  // The official API wraps the raw NOTAM in a text field — extract it
  return allItems.map(item => {
    const raw = item?.notam?.text ||
                item?.icaoMessage ||
                item?.traditionalMessage ||
                item?.coreNOTAMData?.notam?.text ||
                JSON.stringify(item); // last resort
    return raw;
  }).filter(Boolean);
}

// ─── Approach B : Direct notams.aim.faa.gov query (no credentials needed) ────
// Replicates exactly what the deprecated `notams` npm package did:
// POST form-encoded to the NOTAM search endpoint with ARTCC designators.
async function fetchViaAimFAA() {
  const allRaw = [];

  await Promise.all(ROCKET_FIRS.map(async (fir) => {
    try {
      const res = await fetch(NOTAM_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Mimic a browser request — the FAA search endpoint can block bots
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept':     'application/json, text/plain, */*',
          'Origin':     'https://notams.aim.faa.gov',
          'Referer':    'https://notams.aim.faa.gov/notamSearch/',
        },
        body: new URLSearchParams({
          // Replicate the form submission used by PilotWeb / aim.faa.gov
          designatorsForTFR:      fir,
          retrieveArtcc:          'false',
          sortColumns:            'CLMN_LSID+ASC+',
          formatType:             'DOMESTIC',
          retrievalType:          'ALL',
          pageSize:               '150',
          pageNum:                '1',
          action:                 'notamRetrievalByICAOs',
          openItems:              'false',
        }),
      });

      if (!res.ok) {
        console.warn(`[rocket-notams] aim.faa.gov returned HTTP ${res.status} for ${fir}`);
        return;
      }

      const json = await res.json();

      // Response shape: { notamList: [ { icaoMessage, traditionalMessage, ... }, ... ] }
      const list = json?.notamList || json?.items || [];
      list.forEach(item => {
        const raw = item?.icaoMessage ||
                    item?.traditionalMessage ||
                    item?.notam?.text ||
                    item?.coreNOTAMData?.notam?.text;
        if (raw) allRaw.push(raw.trim());
      });

    } catch (err) {
      console.warn(`[rocket-notams] fetchViaAimFAA error for ${fir}:`, err.message);
    }
  }));

  return allRaw;
}

// ─── GeoJSON builder ─────────────────────────────────────────────────────────
function buildGeoJSON(rawNotams, source) {
  const now = new Date();

  // Deduplicate by raw text
  const unique = [...new Set(rawNotams)];

  const features = unique
    .map(raw => {
      try {
        return parseRocketNotam(raw);
      } catch {
        return null;
      }
    })
    .filter(n =>
      n &&
      n.polygon?.length >= 3 && // valid polygon needs at least 3 points
      (!n.validity?.end || new Date(n.validity.end) > now) // filter expired
    )
    .map(n => {
      const coords = [
        ...n.polygon.map(p => [p.lng, p.lat]),
        [n.polygon[0].lng, n.polygon[0].lat], // close ring
      ];
      return {
        type: 'Feature',
        properties: {
          notamType:      n.notamType,
          notamNumber:    n.notamNumber,
          classification: n.classification,
          status:         n.status,
          confidence:     n.confidence,
          missionId:      n.missionId,
          validFrom:      n.validity?.start?.toISOString() ?? null,
          validTo:        n.validity?.end?.toISOString()   ?? null,
          altitudeLower:  n.altitude.lower,
          altitudeUpper:  n.altitude.upper,
          raw:            n.raw.substring(0, 500),
        },
        geometry: {
          type:        'Polygon',
          coordinates: [coords],
        },
      };
    });

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      generated: now.toISOString(),
      count:     features.length,
      source,
      firs:      ROCKET_FIRS,
    },
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  let rawNotams = [];
  let source    = 'unknown';

  try {
    if (FAA_CLIENT_ID && FAA_CLIENT_SECRET) {
      console.log('[rocket-notams] Using FAA Official API (api.faa.gov)');
      rawNotams = await fetchViaOfficialAPI();
      source    = 'FAA Official API (api.faa.gov)';
    } else {
      console.log('[rocket-notams] No credentials — falling back to notams.aim.faa.gov');
      rawNotams = await fetchViaAimFAA();
      source    = 'notams.aim.faa.gov (direct)';
    }

    console.log(`[rocket-notams] Raw NOTAMs fetched: ${rawNotams.length}`);

    const geojson = buildGeoJSON(rawNotams, source);

    console.log(`[rocket-notams] Rocket zones returned: ${geojson.features.length}`);

    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=300', // 5-min cache
      },
    });

  } catch (error) {
    console.error('[rocket-notams] Fatal error:', error);

    return new Response(
      JSON.stringify({
        type:     'FeatureCollection',
        features: [],
        metadata: {
          error:     error.message,
          generated: new Date().toISOString(),
          hint: FAA_CLIENT_ID
            ? 'FAA Official API failed — check FAA_CLIENT_ID / FAA_CLIENT_SECRET'
            : 'Set FAA_CLIENT_ID + FAA_CLIENT_SECRET in env for the official API, or the notams.aim.faa.gov fallback may be rate-limited.',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
