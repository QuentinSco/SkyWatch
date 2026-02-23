import { getAirportsNearCoords, getAirportsByCountry } from '/lib/normalize.js';

const PROXY = '/api/proxy?url=';

const MA_FEED_SLUGS = {
  AT: 'austria', BA: 'bosnia-and-herzegovina', BE: 'belgium', BG: 'bulgaria',
  CY: 'cyprus', CZ: 'czech-republic', DE: 'germany', DK: 'denmark',
  ES: 'spain', FI: 'finland', FR: 'france', GR: 'greece', HR: 'croatia',
  HU: 'hungary', IE: 'ireland', IL: 'israel', IS: 'iceland', IT: 'italy',
  LT: 'lithuania', LV: 'latvia', MD: 'moldova', ME: 'montenegro',
  MK: 'north-macedonia', MT: 'malta', NL: 'netherlands', PL: 'poland',
  PT: 'portugal', RO: 'romania', RS: 'serbia', SI: 'slovenia', SK: 'slovakia',
};

const MA_COUNTRY_ISO2_TO_ISO3 = {
  AT: 'AUT', BA: 'BIH', BE: 'BEL', BG: 'BGR', CY: 'CYP', CZ: 'CZE',
  DE: 'DEU', DK: 'DNK', ES: 'ESP', FI: 'FIN', FR: 'FRA', GR: 'GRC',
  HR: 'HRV', HU: 'HUN', IE: 'IRL', IL: 'ISR', IS: 'ISL', IT: 'ITA',
  LT: 'LTU', LV: 'LVA', MD: 'MDA', ME: 'MNE', MK: 'MKD', MT: 'MLT',
  NL: 'NLD', PL: 'POL', PT: 'PRT', RO: 'ROU', RS: 'SRB', SI: 'SVN',
  SK: 'SVK',
};

const MA_COUNTRY_NAME = {
  AT: 'Austria', BA: 'Bosnia and Herzegovina', BE: 'Belgium', BG: 'Bulgaria',
  CY: 'Cyprus', CZ: 'Czech Republic', DE: 'Germany', DK: 'Denmark',
  ES: 'Spain', FI: 'Finland', FR: 'France', GR: 'Greece', HR: 'Croatia',
  HU: 'Hungary', IE: 'Ireland', IL: 'Israel', IS: 'Iceland', IT: 'Italy',
  LT: 'Lithuania', LV: 'Latvia', MD: 'Moldova', ME: 'Montenegro',
  MK: 'North Macedonia', MT: 'Malta', NL: 'Netherlands', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', RS: 'Serbia', SI: 'Slovenia', SK: 'Slovakia',
};

const AWT_LABEL = {
  1: 'Vent violent', 2: 'Neige / Verglas', 3: 'Orages', 4: 'Brouillard',
  5: 'Chaleur extrême', 6: 'Froid extrême', 7: 'Événement côtier',
  10: 'Pluie intense', 11: 'Inondation', 12: 'Inondation / Pluie',
};

const EXCLUDED_AWT = new Set([8, 9, 13]);

const MIN_LEVEL = {
  1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 10: 2, 11: 2, 12: 2,
};

function levelToSeverity(level) {
  if (level >= 4) return 'red';
  if (level === 3) return 'orange';
  return 'yellow';
}

let emmaCentroidsCache = null;

async function getEmmaCentroids() {
  if (emmaCentroidsCache) return emmaCentroidsCache;
  try {
    const res = await fetch('/lib/emmaCentroids.json');
    if (res.ok) emmaCentroidsCache = await res.json();
  } catch (_) {}
  return emmaCentroidsCache ?? {};
}

async function fetchCountryFeed(iso2, slug, emmaCentroids) {
  const alerts = [];
  const iso3 = MA_COUNTRY_ISO2_TO_ISO3[iso2] ?? '';
  const countryName = MA_COUNTRY_NAME[iso2] ?? iso2;
  const feedUrl = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-${slug}`;
  const url = PROXY + encodeURIComponent(feedUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/xml, text/xml, */*' },
    });
    clearTimeout(timer);
    if (!res.ok) return alerts;
    const xml = await res.text();

    for (const item of xml.split('<item>').slice(1)) {
      const getTag = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const title = getTag('title');
      if (!title || title === countryName) continue;

      const description = getTag('description');
      const pubDate = getTag('pubDate');
      const link = getTag('link') || `https://www.meteoalarm.org?region=${iso2}`;

      const emmaMatch = link.match(/EMMA_ID:([A-Z]{2}\d+)/);
      const emmaCode = emmaMatch ? emmaMatch[1] : null;

      const eventRegex = /data-awareness-level="(\d+)"[^>]*data-awareness-type="(\d+)"/g;
      let match;
      const events = [];
      while ((match = eventRegex.exec(description)) !== null) {
        events.push({ level: parseInt(match[1], 10), awt: parseInt(match[2], 10) });
      }

      if (events.length === 0) continue;

      const significant = events.filter(e =>
        !EXCLUDED_AWT.has(e.awt) && e.level >= (MIN_LEVEL[e.awt] ?? 2)
      );
      if (significant.length === 0) continue;

      const byType = new Map();
      for (const e of significant) {
        if (!byType.has(e.awt) || e.level > byType.get(e.awt)) {
          byType.set(e.awt, e.level);
        }
      }

      const regionCentroid = emmaCode ? emmaCentroids[emmaCode] : null;
      const lat = regionCentroid?.lat ?? null;
      const lon = regionCentroid?.lon ?? null;
      const regionName = regionCentroid?.name ?? title;

      const isRemoteIsland = regionCentroid
        ? (regionCentroid.lon < -22) || (regionCentroid.lon < -14 && regionCentroid.lat < 35)
        : false;

      const airports = (regionCentroid && !isRemoteIsland)
        ? getAirportsNearCoords(regionCentroid.lat, regionCentroid.lon, 300)
        : iso3
          ? getAirportsByCountry(iso3)
          : [];

      for (const [awt, level] of byType.entries()) {
        const severity = levelToSeverity(level);
        const phenomenon = AWT_LABEL[awt] ?? `Phénomène type ${awt}`;
        const levelLabel = level >= 4 ? 'ROUGE' : level === 3 ? 'ORANGE' : 'JAUNE';

        alerts.push({
          id: `MA-${emmaCode ?? countryName}-${awt}-${pubDate}`,
          source: 'MeteoAlarm',
          region: 'EUR',
          severity,
          phenomenon,
          country: countryName,
          airports,
          lat,
          lon,
          validFrom: pubDate,
          validTo: pubDate,
          headline: `Alerte ${levelLabel} ${phenomenon} — ${regionName} (${countryName})`,
          description: `Niveau ${levelLabel} — ${phenomenon} dans la région ${regionName}, ${countryName}`,
          link,
        });
      }
    }
  } catch (e) {
    clearTimeout(timer);
    if (e.name !== 'AbortError') console.error(`[MeteoAlarm:${iso2}]`, e);
  }
  return alerts;
}

export async function fetchMeteoAlarm() {
  const emmaCentroids = await getEmmaCentroids();
  const results = await Promise.allSettled(
    Object.entries(MA_FEED_SLUGS).map(([iso2, slug]) =>
      fetchCountryFeed(iso2, slug, emmaCentroids)
    )
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
