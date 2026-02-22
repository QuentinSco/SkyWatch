import { noaaSeverity } from '/lib/normalize.js';

const RELEVANT_EVENTS = new Set([
  'Blizzard Warning', 'Winter Storm Warning', 'Winter Storm Watch',
  'Ice Storm Warning', 'Heavy Snow Warning', 'High Wind Warning', 'High Wind Watch',
  'Hurricane Warning', 'Hurricane Watch', 'Tropical Storm Warning', 'Tropical Storm Watch',
  'Tornado Warning', 'Tornado Watch', 'Dense Fog Advisory', 'Freezing Fog Advisory',
  'Extreme Cold Warning', 'Wind Chill Warning', 'Dust Storm Warning',
  'Flood Warning', 'Coastal Flood Warning',
]);

const STATE_AIRPORTS = [
  ['New York',       'KJFK'], ['New Jersey',     'KEWR'], ['Massachusetts',  'KBOS'],
  ['Illinois',       'KORD'], ['California',     'KLAX'], ['Florida',        'KMIA'],
  ['Texas',          'KIAH'], ['Virginia',       'KIAD'], ['Georgia',        'KATL'],
  ['Washington',     'KSEA'], ['Colorado',       'KDEN'], ['Minnesota',      'KMSP'],
  ['Nevada',         'KLAS'], ['Arizona',        'KPHX'], ['Michigan',       'KDTW'],
  ['Pennsylvania',   'KPHL'], ['North Carolina', 'KCLT'], ['Oregon',         'KPDX'],
  ['Utah',           'KSLC'], ['Louisiana',      'KMSY'], ['Maryland',       'KBWI'],
  ['Ohio',           'KCMH'], ['Alaska',         'PANC'], ['Hawaii',         'PHNL'],
  ['Indiana',        'KIND'], ['Wisconsin',      'KMKE'], ['Missouri',       'KSTL'],
  ['Tennessee',      'KBNA'],
];

const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };

export async function fetchNOAA() {
  const alerts = [];
  try {
    const res = await fetch(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update',
      { headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/geo+json' } }
    );
    const json = await res.json();
    const raw = [];

    for (const f of (json.features ?? [])) {
      const p = f.properties;
      if (!RELEVANT_EVENTS.has(p.event)) continue;

      const airports = STATE_AIRPORTS
        .filter(([s]) => (p.areaDesc || '').includes(s))
        .map(([, icao]) => icao);

      raw.push({
        id:          `NOAA-${p.id}`,
        source:      'NOAA',
        region:      'AMN',
        severity:    noaaSeverity(p.event),
        phenomenon:  p.event,
        country:     'United States',
        airports,
        validFrom:   p.onset || p.effective || '',
        validTo:     p.expires || '',
        headline:    p.headline || p.event,
        description: p.description?.slice(0, 500) || p.headline || '',
        link:        p['@id'] || 'https://www.weather.gov/alerts',
      });
    }

    // Déduplication stricte : une ligne par phénomène
    // Garde le niveau le plus élevé + fusionne tous les aéroports
    const seen = new Map();
    for (const a of raw) {
      const key = a.phenomenon;
      if (!seen.has(key)) {
        seen.set(key, { ...a });
      } else {
        const ex = seen.get(key);
        const severity = SEVERITY_ORDER[a.severity] < SEVERITY_ORDER[ex.severity]
          ? a.severity
          : ex.severity;
        const airports = [...new Set([...ex.airports, ...a.airports])];
        seen.set(key, { ...ex, severity, airports });
      }
    }

    alerts.push(...seen.values());
  } catch (e) {
    console.error('[NOAA]', e);
  }
  return alerts;
}
