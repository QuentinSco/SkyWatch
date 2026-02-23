import { noaaSeverity } from '/lib/normalize.js';

const RELEVANT_EVENTS = new Set([
  'Blizzard Warning', 'Winter Storm Warning', 'Winter Storm Watch',
  'Ice Storm Warning', 'Heavy Snow Warning', 'High Wind Warning', 'High Wind Watch',
  'Hurricane Warning', 'Hurricane Watch', 'Tropical Storm Warning', 'Tropical Storm Watch',
  'Tornado Warning', 'Tornado Watch', 'Dense Fog Advisory', 'Freezing Fog Advisory',
  'Extreme Cold Warning', 'Wind Chill Warning', 'Dust Storm Warning',
  'Flood Warning', 'Coastal Flood Warning',
]);

const NWS_ZONE_AIRPORTS = {
  // New York
  NYZ063: ['KJFK', 'KEWR'], NYZ064: ['KJFK'], NYZ065: ['KJFK'],
  NYZ066: ['KJFK'], NYZ067: ['KJFK'], NYZ068: ['KJFK'],
  NYZ069: ['KJFK'], NYZ070: ['KJFK'], NYZ071: ['KJFK'],
  NYZ072: ['KJFK'], NYZ073: ['KJFK'], NYZ074: ['KJFK'],
  NYZ075: ['KJFK'], NYZ078: ['KJFK'], NYZ079: ['KJFK'],
  NYZ080: ['KJFK'], NYZ081: ['KJFK'],

  // New Jersey
  NJZ001: ['KEWR'], NJZ002: ['KEWR'], NJZ004: ['KEWR'],
  NJZ006: ['KEWR'], NJZ103: ['KEWR'], NJZ104: ['KEWR'],
  NJZ106: ['KEWR'], NJZ107: ['KEWR'], NJZ108: ['KEWR'],

  // Connecticut
  CTZ001: ['KEWR'], CTZ002: ['KEWR'], CTZ005: ['KEWR'],
  CTZ006: ['KEWR'], CTZ007: ['KEWR'], CTZ008: ['KEWR'],
  CTZ009: ['KEWR'], CTZ010: ['KEWR'], CTZ011: ['KEWR'],
  CTZ012: ['KEWR'], CTZ013: ['KEWR'],

  // Massachusetts
  MAZ001: ['KBOS'], MAZ002: ['KBOS'], MAZ003: ['KBOS'],
  MAZ004: ['KBOS'], MAZ005: ['KBOS'], MAZ006: ['KBOS'],
  MAZ007: ['KBOS'], MAZ013: ['KBOS'], MAZ014: ['KBOS'],
  MAZ015: ['KBOS'], MAZ016: ['KBOS'],

  // Illinois / Chicago
  ILZ006: ['KORD'], ILZ012: ['KORD'], ILZ013: ['KORD'],
  ILZ014: ['KORD'], ILZ103: ['KORD'], ILZ104: ['KORD'],

  // California
  CAZ006: ['KLAX'], CAZ041: ['KLAX'], CAZ042: ['KLAX'],
  CAZ043: ['KLAX'], CAZ044: ['KLAX'], CAZ045: ['KLAX'],
  CAZ087: ['KLAX'],

  // Florida
  FLZ063: ['KMIA'], FLZ066: ['KMIA'], FLZ068: ['KMIA'],
  FLZ069: ['KMIA'], FLZ072: ['KMIA'], FLZ073: ['KMIA'],
  FLZ074: ['KMIA'], FLZ075: ['KMIA'],

  // Washington
  WAZ001: ['KSEA'], WAZ503: ['KSEA'], WAZ504: ['KSEA'],
  WAZ505: ['KSEA'], WAZ506: ['KSEA'], WAZ507: ['KSEA'],
  WAZ508: ['KSEA'], WAZ509: ['KSEA'], WAZ555: ['KSEA'],
  WAZ556: ['KSEA'], WAZ558: ['KSEA'], WAZ559: ['KSEA'],

  // Colorado
  COZ001: ['KDEN'], COZ002: ['KDEN'], COZ003: ['KDEN'],
  COZ039: ['KDEN'], COZ040: ['KDEN'], COZ041: ['KDEN'],

  // Minnesota
  MNZ060: ['KMSP'], MNZ061: ['KMSP'], MNZ062: ['KMSP'],
  MNZ063: ['KMSP'], MNZ068: ['KMSP'], MNZ069: ['KMSP'],
  MNZ070: ['KMSP'],

  // Texas
  TXZ103: ['KIAH'], TXZ163: ['KIAH'], TXZ164: ['KIAH'],
  TXZ176: ['KIAH'], TXZ177: ['KIAH'], TXZ178: ['KIAH'],

  // Oregon
  ORZ006: ['KPDX'], ORZ007: ['KPDX'], ORZ008: ['KPDX'],
};

const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };

function getAirportsFromZones(zones) {
  const airports = new Set();
  for (const zone of zones) {
    const found = NWS_ZONE_AIRPORTS[zone];
    if (found) {
      found.forEach(a => airports.add(a));
    }
  }
  return [...airports];
}

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

      const zones = p.geocode?.UGC ?? [];
      const airports = getAirportsFromZones(zones);

      if (airports.length === 0) continue;

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
