import { getAirportsNearCoords, getAirportsByCountry, getCentroid } from '/lib/normalize.js';

const PROXY    = 'https://api.allorigins.win/raw?url=';
const FEED_URL = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-europe';

const COUNTRY_NAME_ISO3 = {
  France: 'FRA', Germany: 'DEU', Spain: 'ESP', Italy: 'ITA',
  'United Kingdom': 'GBR', Portugal: 'PRT', Netherlands: 'NLD',
  Belgium: 'BEL', Switzerland: 'CHE', Austria: 'AUT', Poland: 'POL',
  Romania: 'ROU', Croatia: 'HRV', Greece: 'GRC', Sweden: 'SWE',
  Norway: 'NOR', Denmark: 'DNK', Finland: 'FIN', 'Czech Republic': 'CZE',
  Slovakia: 'SVK', Hungary: 'HUN', Bulgaria: 'BGR', Slovenia: 'SVN',
  Serbia: 'SRB', Ireland: 'IRL', Luxembourg: 'LUX', Andorra: 'AND',
};

const AWT_LABEL = {
  1:  'Vent violent',
  2:  'Neige / Verglas',
  3:  'Orages',
  4:  'Brouillard',
  5:  'Chaleur extrême',
  6:  'Froid extrême',
  7:  'Événement côtier',
  8:  'Feux de forêt',
  9:  'Avalanche',
  10: 'Pluie intense',
  11: 'Inondation',
  12: 'Inondation / Pluie',
};

// Phénomènes non pertinents pour le dispatch
const EXCLUDED_AWT = new Set([8, 9, 13]);

// Pays non desservis AF
const EXCLUDED_COUNTRIES = new Set([
  'Ukraine', 'Belarus', 'Moldova', 'Kosovo', 'Albania',
  'North Macedonia', 'Bosnia and Herzegovina', 'Andorra',
  'Montenegro', 'San Marino', 'Liechtenstein', 'Armenia',
  'Azerbaijan', 'Georgia',
]);

// Seuil minimum par phénomène (niveau MeteoAlarm 1-4)
// MeteoAlarm : 1=vert, 2=jaune, 3=orange, 4=rouge
// Pour le vent, on exige niveau 3+ (orange/rouge) car niveau 2 = < 60 km/h sans impact dispatch
const MIN_LEVEL = {
  1:  3,   // Vent : niveau orange minimum (~75-90 km/h)
  2:  2,   // Neige / Verglas : jaune suffit
  3:  2,   // Orages
  4:  2,   // Brouillard
  5:  2,   // Chaleur
  6:  2,   // Froid
  7:  2,   // Côtier
  10: 2,   // Pluie
  11: 2,   // Inondation
  12: 2,   // Inondation / Pluie
};

function levelToSeverity(level) {
  if (level >= 4) return 'red';
  if (level === 3) return 'orange';
  return 'yellow';
}

export async function fetchMeteoAlarm() {
  const alerts = [];
  try {
    const url = PROXY + encodeURIComponent(FEED_URL);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/xml, text/xml, */*' },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    for (const item of xml.split('<item>').slice(1)) {
      const getTag = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const title   = getTag('title');
      const country = title.replace(/^MeteoAlarm\s+/i, '').trim();
      if (!country) continue;

      if (EXCLUDED_COUNTRIES.has(country)) continue;

      const description = getTag('description');
      const pubDate     = getTag('pubDate');
      const link        = getTag('link') || 'https://www.meteoalarm.org';

      const eventRegex = /data-awareness-level="(\d+)"[^>]*data-awareness-type="(\d+)"/g;
      let match;
      const events = [];
      while ((match = eventRegex.exec(description)) !== null) {
        const level = parseInt(match[1], 10);
        const awt   = parseInt(match[2], 10);
        events.push({ level, awt });
      }

      if (events.length === 0) continue;

      // Filtre : phénomène pertinent + seuil minimum par type
      const significant = events.filter(e =>
        !EXCLUDED_AWT.has(e.awt) &&
        e.level >= (MIN_LEVEL[e.awt] ?? 2)
      );
      if (significant.length === 0) continue;

      // Groupe par type, garde le niveau max
      const byType = new Map();
      for (const e of significant) {
        if (!byType.has(e.awt) || e.level > byType.get(e.awt)) {
          byType.set(e.awt, e.level);
        }
      }

      const iso3     = COUNTRY_NAME_ISO3[country] ?? '';
      const centroid = iso3 ? getCentroid(iso3) : null;
      const lat      = centroid?.lat ?? null;
      const lon      = centroid?.lon ?? null;
      const airports = centroid
        ? getAirportsNearCoords(centroid.lat, centroid.lon, 600)
        : iso3
          ? getAirportsByCountry(iso3)
          : [];

      for (const [awt, level] of byType.entries()) {
        const severity   = levelToSeverity(level);
        const phenomenon = AWT_LABEL[awt] ?? `Phénomène type ${awt}`;

        alerts.push({
          id:          'MA-' + country + '-' + awt + '-' + pubDate,
          source:      'MeteoAlarm',
          region:      'EUR',
          severity,
          phenomenon,
          country,
          airports,
          lat,
          lon,
          validFrom:   pubDate,
          validTo:     pubDate,
          headline:    `${severity === 'red' ? 'Alerte rouge' : severity === 'orange' ? 'Alerte orange' : 'Alerte jaune'} ${phenomenon} — ${country}`,
          description: `Niveau ${level >= 4 ? 'ROUGE' : level === 3 ? 'ORANGE' : 'JAUNE'} — ${phenomenon} en ${country}`,
          link,
        });
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[MeteoAlarm]', e);
  }
  return alerts;
}
