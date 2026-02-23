// Server-side alert fetching logic

type Severity = 'red' | 'orange' | 'yellow';

interface Alert {
  id: string;
  source: string;
  region: string;
  severity: Severity;
  phenomenon: string;
  country: string;
  airports: string[];
  validFrom: string;
  validTo: string | null;
  headline: string;
  description?: string;
  link?: string;
  lat?: number;
  lon?: number;
}

// NOAA Configuration
const NWS_ZONE_AIRPORTS: Record<string, string[]> = {
  NYZ063: ['KJFK', 'KEWR'], NYZ064: ['KJFK'], NYZ065: ['KJFK'],
  NYZ066: ['KJFK'], NYZ067: ['KJFK'], NYZ068: ['KJFK'],
  NYZ069: ['KJFK'], NYZ070: ['KJFK'], NYZ071: ['KJFK'],
  NYZ072: ['KJFK'], NYZ073: ['KJFK'], NYZ074: ['KJFK'],
  NYZ075: ['KJFK'], NYZ078: ['KJFK'], NYZ079: ['KJFK'],
  NYZ080: ['KJFK'], NYZ081: ['KJFK'],
  NJZ001: ['KEWR'], NJZ002: ['KEWR'], NJZ004: ['KEWR'],
  NJZ006: ['KEWR'], NJZ103: ['KEWR'], NJZ104: ['KEWR'],
  NJZ106: ['KEWR'], NJZ107: ['KEWR'], NJZ108: ['KEWR'],
  CTZ001: ['KEWR'], CTZ002: ['KEWR'], CTZ005: ['KEWR'],
  CTZ006: ['KEWR'], CTZ007: ['KEWR'], CTZ008: ['KEWR'],
  CTZ009: ['KEWR'], CTZ010: ['KEWR'], CTZ011: ['KEWR'],
  CTZ012: ['KEWR'], CTZ013: ['KEWR'],
  MAZ001: ['KBOS'], MAZ002: ['KBOS'], MAZ003: ['KBOS'],
  MAZ004: ['KBOS'], MAZ005: ['KBOS'], MAZ006: ['KBOS'],
  MAZ007: ['KBOS'], MAZ013: ['KBOS'], MAZ014: ['KBOS'],
  ILZ006: ['KORD'], ILZ012: ['KORD'], ILZ013: ['KORD'],
  ILZ014: ['KORD'], ILZ103: ['KORD'], ILZ104: ['KORD'],
  CAZ006: ['KLAX'], CAZ041: ['KLAX'], CAZ042: ['KLAX'],
  CAZ043: ['KLAX'], CAZ044: ['KLAX'], CAZ045: ['KLAX'],
  FLZ063: ['KMIA'], FLZ066: ['KMIA'], FLZ068: ['KMIA'],
  FLZ069: ['KMIA'], FLZ072: ['KMIA'], FLZ073: ['KMIA'],
  WAZ001: ['KSEA'], WAZ503: ['KSEA'], WAZ504: ['KSEA'],
  WAZ505: ['KSEA'], WAZ506: ['KSEA'], WAZ507: ['KSEA'],
  WAZ508: ['KSEA'], WAZ509: ['KSEA'], WAZ555: ['KSEA'],
  COZ001: ['KDEN'], COZ002: ['KDEN'], COZ003: ['KDEN'],
  COZ039: ['KDEN'], COZ040: ['KDEN'], COZ041: ['KDEN'],
  MNZ060: ['KMSP'], MNZ061: ['KMSP'], MNZ062: ['KMSP'],
  MNZ063: ['KMSP'], MNZ068: ['KMSP'], MNZ069: ['KMSP'],
  TXZ103: ['KIAH'], TXZ163: ['KIAH'], TXZ164: ['KIAH'],
  TXZ176: ['KIAH'], TXZ177: ['KIAH'], TXZ178: ['KIAH'],
  ORZ006: ['KPDX'], ORZ007: ['KPDX'], ORZ008: ['KPDX'],
};

const RELEVANT_EVENTS = new Set([
  'Blizzard Warning', 'Winter Storm Warning', 'Winter Storm Watch',
  'Ice Storm Warning', 'Heavy Snow Warning', 'High Wind Warning', 'High Wind Watch',
  'Hurricane Warning', 'Hurricane Watch', 'Tropical Storm Warning', 'Tropical Storm Watch',
  'Tornado Warning', 'Tornado Watch', 'Dense Fog Advisory', 'Freezing Fog Advisory',
  'Extreme Cold Warning', 'Wind Chill Warning', 'Dust Storm Warning',
  'Flood Warning', 'Coastal Flood Warning',
]);

function noaaSeverity(event: string): Severity {
  const e = event.toLowerCase();
  if (e.includes('warning') || e.includes('blizzard')) return 'red';
  if (e.includes('watch')) return 'orange';
  return 'yellow';
}

export async function fetchNOAA(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update',
      { headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/geo+json' } }
    );
    const json = await res.json();
    const raw: Alert[] = [];

    for (const f of (json.features ?? [])) {
      const p = f.properties;
      if (!RELEVANT_EVENTS.has(p.event)) continue;

      const zones = p.geocode?.UGC ?? [];
      const airportSet = new Set<string>();

      for (const zone of zones) {
        const found = NWS_ZONE_AIRPORTS[zone];
        if (found) found.forEach(a => airportSet.add(a));
      }

      const airports = [...airportSet];
      if (airports.length === 0) continue;

      raw.push({
        id: `NOAA-${p.id}`,
        source: 'NOAA',
        region: 'AMN',
        severity: noaaSeverity(p.event),
        phenomenon: p.event,
        country: 'United States',
        airports,
        validFrom: p.onset || p.effective || '',
        validTo: p.expires || '',
        headline: p.headline || p.event,
        description: p.description?.slice(0, 500) || p.headline || '',
        link: p['@id'] || 'https://www.weather.gov/alerts',
      });
    }

    const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };
    const seen = new Map<string, Alert>();

    for (const a of raw) {
      const key = a.phenomenon;
      if (!seen.has(key)) {
        seen.set(key, { ...a });
      } else {
        const ex = seen.get(key)!;
        const severity = SEVERITY_ORDER[a.severity] < SEVERITY_ORDER[ex.severity]
          ? a.severity : ex.severity;
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

export async function fetchGDACS(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
    });

    if (!res.ok) {
      console.error('[GDACS] HTTP', res.status);
      return alerts;
    }

    const xml = await res.text();

    for (const item of xml.split('<item>').slice(1)) {
      const getTag = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      };

      const alertLevel = getTag('gdacs:alertlevel').toLowerCase();
      if (!alertLevel || alertLevel === 'green') continue;

      const eventType = getTag('gdacs:eventtype').toUpperCase();
      const country = getTag('gdacs:country') || getTag('dc:subject') || '';
      const title = getTag('title');
      const link = getTag('link');
      const pubDate = getTag('pubDate');

      let severity: Severity = 'yellow';
      if (alertLevel === 'red') severity = 'red';
      else if (alertLevel === 'orange') severity = 'orange';

      const typeLabels: Record<string, string> = {
        TC: 'Cyclone tropical', EQ: 'Tremblement de terre',
        FL: 'Inondation', VO: 'Volcan', WF: 'Incendie', TS: 'Tsunami',
      };

      alerts.push({
        id: `GDACS-${getTag('gdacs:eventid') || Math.random()}`,
        source: 'GDACS',
        region: 'ASIE',
        severity,
        phenomenon: typeLabels[eventType] || eventType,
        country,
        airports: [],
        validFrom: pubDate,
        validTo: null,
        headline: title,
        description: getTag('description').slice(0, 500),
        link,
      });
    }
  } catch (e) {
    console.error('[GDACS]', e);
  }
  return alerts;
}

export async function fetchMeteoAlarm(): Promise<Alert[]> {
  return [];
}
