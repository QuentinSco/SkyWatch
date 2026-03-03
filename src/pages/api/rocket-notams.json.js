/**
 * API endpoint: /api/rocket-notams.json
 * Fetches AHA/DRA rocket NOTAMs using Aviation Weather Center API
 * 
 * Strategy:
 *   1. Query aviationweather.gov NOTAM data service (free, public)
 *   2. Filter for space operations keywords
 *   3. Parse with our rocket NOTAM parser
 *   Returns GeoJSON FeatureCollection
 */

import { parseRocketNotam } from '../../../JS/notamRocket.js';

// Aviation Weather Center NOTAM endpoint (public, no auth required)
const AWC_NOTAM_URL = 'https://aviationweather.gov/cgi-bin/data/notam.php';

// Major airports near US rocket launch sites
const ROCKET_AIRPORTS = [
  'KXMR',  // Cape Canaveral Space Force Station
  'KCOF',  // Patrick SFB (near Cape Canaveral)
  'KMCO',  // Orlando (ZMA FIR - covers Cape area)
  'KVBG',  // Vandenberg Space Force Base
  'KBRO',  // Brownsville (near SpaceX Starbase)
  'KWRI',  // Wallops Flight Facility
];

const SPACE_KEYWORDS = [
  'SPACE', 'LAUNCH', 'AHA', 'DRA', 'ANOMALY HAZARD',
  'DEBRIS RESPONSE', 'ROCKET', 'STARLINK', 'STLNK',
  'SPACEX', 'BLUE ORIGIN', 'ULA', 'ORBITAL',
];

async function fetchNotamsFromAWC() {
  const allNotams = [];

  for (const icao of ROCKET_AIRPORTS) {
    try {
      const url = `${AWC_NOTAM_URL}?ids=${icao}`;
      console.log(`[rocket-notams] Fetching ${icao}...`);
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SkyWatch/1.0 (Aviation Weather Aggregator)',
          'Accept': 'text/plain, text/html',
        },
      });

      if (!res.ok) {
        console.warn(`[rocket-notams] AWC returned HTTP ${res.status} for ${icao}`);
        continue;
      }

      const text = await res.text();
      
      // AWC returns plain text NOTAMs, one per line or block
      // Split by common NOTAM delimiters
      const notams = text
        .split(/\n(?=[A-Z!])/)
        .filter(line => line.trim().length > 50); // Filter out short lines

      console.log(`[rocket-notams] ${icao}: ${notams.length} NOTAMs`);

      // Filter for space-related NOTAMs
      const spaceNotams = notams.filter(notam => {
        const upper = notam.toUpperCase();
        return SPACE_KEYWORDS.some(kw => upper.includes(kw));
      });

      console.log(`[rocket-notams] ${icao}: ${spaceNotams.length} space NOTAMs`);
      allNotams.push(...spaceNotams);

    } catch (error) {
      console.error(`[rocket-notams] Error fetching ${icao}:`, error.message);
    }
  }

  return allNotams;
}

// Fallback: Manual TFR check via FAA TFR list (if AWC fails)
async function fetchTFRList() {
  try {
    // FAA publishes active TFRs as a text list
    const res = await fetch('https://tfr.faa.gov/tfr2/list.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    
    // Extract TFR numbers that might be space-related
    // Format: "3/1234 EFFECTIVE 03/03/2026..."
    const tfrPattern = /(\d+\/\d+).*?(SPACE|LAUNCH|ROCKET)/gi;
    const matches = [...html.matchAll(tfrPattern)];
    
    console.log(`[rocket-notams] Found ${matches.length} potential space TFRs`);
    
    // For each TFR number, we'd need to fetch full details
    // This is a placeholder - full implementation would query each TFR
    return [];
    
  } catch (error) {
    console.error('[rocket-notams] TFR list fetch failed:', error.message);
    return [];
  }
}

function buildGeoJSON(rawNotams, source) {
  const now = new Date();

  // Deduplicate
  const unique = [...new Set(rawNotams)];

  const features = unique
    .map(raw => {
      try {
        return parseRocketNotam(raw);
      } catch (err) {
        console.warn('[rocket-notams] Parse error:', err.message);
        return null;
      }
    })
    .filter(n =>
      n &&
      n.polygon?.length >= 3 &&
      (!n.validity?.end || new Date(n.validity.end) > now)
    )
    .map(n => {
      const coords = [
        ...n.polygon.map(p => [p.lng, p.lat]),
        [n.polygon[0].lng, n.polygon[0].lat],
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
      note: features.length === 0 
        ? 'No active rocket launch NOTAMs found. This is normal if no launches are scheduled.'
        : undefined,
    },
  };
}

export async function GET() {
  try {
    console.log('[rocket-notams] Starting fetch from Aviation Weather Center...');
    
    let rawNotams = await fetchNotamsFromAWC();
    let source = 'Aviation Weather Center (aviationweather.gov)';

    // If AWC returns nothing, try TFR list as fallback
    if (rawNotams.length === 0) {
      console.log('[rocket-notams] No NOTAMs from AWC, trying TFR list...');
      rawNotams = await fetchTFRList();
      source = 'FAA TFR List (tfr.faa.gov)';
    }

    console.log(`[rocket-notams] Total raw NOTAMs: ${rawNotams.length}`);

    const geojson = buildGeoJSON(rawNotams, source);

    console.log(`[rocket-notams] Rocket zones after parsing: ${geojson.features.length}`);

    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=300',
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
          hint: 'Aviation Weather Center API failed. This service is free but may have rate limits. For production use, consider registering for api.faa.gov credentials.',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
