import emmaCentroidsData from './emmaCentroids.json';

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
  magnitude?: number;
  basin?: string;
  eventType?: string;
}

// ─── AF Airports ─────────────────────────────────────────────────────────────
const AF_AIRPORTS = [
  { icao: 'LFPG', lat: 49.0128,  lon:   2.5500, iso3: 'FRA', name: 'Paris CDG' },
  { icao: 'LFPO', lat: 48.7233,  lon:   2.3794, iso3: 'FRA', name: 'Paris Orly' },
  { icao: 'LFLL', lat: 45.7256,  lon:   5.0811, iso3: 'FRA', name: 'Lyon Saint-Exupéry' },
  { icao: 'LFMN', lat: 43.6584,  lon:   7.2159, iso3: 'FRA', name: 'Nice' },
  { icao: 'LFBO', lat: 43.6293,  lon:   1.3678, iso3: 'FRA', name: 'Toulouse' },
  { icao: 'LFRS', lat: 47.1532,  lon:  -1.6108, iso3: 'FRA', name: 'Nantes' },
  { icao: 'LFRB', lat: 48.4479,  lon:  -4.4185, iso3: 'FRA', name: 'Brest' },
  { icao: 'LFRN', lat: 48.0695,  lon:  -1.7348, iso3: 'FRA', name: 'Rennes' },
  { icao: 'LFML', lat: 43.4393,  lon:   5.2214, iso3: 'FRA', name: 'Marseille' },
  { icao: 'LFBD', lat: 44.8283,  lon:  -0.7156, iso3: 'FRA', name: 'Bordeaux' },
  { icao: 'LFST', lat: 48.5383,  lon:   7.6283, iso3: 'FRA', name: 'Strasbourg' },
  { icao: 'EDDF', lat: 50.0379,  lon:   8.5622, iso3: 'DEU', name: 'Francfort' },
  { icao: 'EDDM', lat: 48.3537,  lon:  11.7750, iso3: 'DEU', name: 'Munich' },
  { icao: 'EDDB', lat: 52.3667,  lon:  13.5033, iso3: 'DEU', name: 'Berlin' },
  { icao: 'EDDH', lat: 53.6304,  lon:   9.9882, iso3: 'DEU', name: 'Hambourg' },
  { icao: 'EHAM', lat: 52.3086,  lon:   4.7639, iso3: 'NLD', name: 'Amsterdam' },
  { icao: 'EBBR', lat: 50.9014,  lon:   4.4844, iso3: 'BEL', name: 'Bruxelles' },
  { icao: 'EGLL', lat: 51.4775,  lon:  -0.4614, iso3: 'GBR', name: 'Londres Heathrow' },
  { icao: 'EGPF', lat: 55.8719,  lon:  -4.4331, iso3: 'GBR', name: 'Glasgow' },
  { icao: 'LEMD', lat: 40.4936,  lon:  -3.5668, iso3: 'ESP', name: 'Madrid' },
  { icao: 'LEBL', lat: 41.2971,  lon:   2.0785, iso3: 'ESP', name: 'Barcelone' },
  { icao: 'LEAL', lat: 38.2822,  lon:  -0.5582, iso3: 'ESP', name: 'Alicante' },
  { icao: 'LEPA', lat: 39.5517,  lon:   2.7388, iso3: 'ESP', name: 'Palma' },
  { icao: 'LIRF', lat: 41.8003,  lon:  12.2389, iso3: 'ITA', name: 'Rome Fiumicino' },
  { icao: 'LIMC', lat: 45.6306,  lon:   8.7281, iso3: 'ITA', name: 'Milan Malpensa' },
  { icao: 'LIPZ', lat: 45.5053,  lon:  12.3519, iso3: 'ITA', name: 'Venise' },
  { icao: 'LSZH', lat: 47.4647,  lon:   8.5492, iso3: 'CHE', name: 'Zurich' },
  { icao: 'LSGG', lat: 46.2380,  lon:   6.1089, iso3: 'CHE', name: 'Genève' },
  { icao: 'LPPT', lat: 38.7813,  lon:  -9.1359, iso3: 'PRT', name: 'Lisbonne' },
  { icao: 'LPFR', lat: 37.0144,  lon:  -7.9659, iso3: 'PRT', name: 'Faro' },
  { icao: 'LGAV', lat: 37.9364,  lon:  23.9445, iso3: 'GRC', name: 'Athènes' },
  { icao: 'ESSA', lat: 59.6519,  lon:  17.9186, iso3: 'SWE', name: 'Stockholm' },
  { icao: 'ENGM', lat: 60.1939,  lon:  11.1004, iso3: 'NOR', name: 'Oslo' },
  { icao: 'EKCH', lat: 55.6181,  lon:  12.6561, iso3: 'DNK', name: 'Copenhague' },
  { icao: 'EFHK', lat: 60.3172,  lon:  24.9633, iso3: 'FIN', name: 'Helsinki' },
  { icao: 'LOWW', lat: 48.1103,  lon:  16.5697, iso3: 'AUT', name: 'Vienne' },
  { icao: 'EPWA', lat: 52.1657,  lon:  20.9671, iso3: 'POL', name: 'Varsovie' },
  { icao: 'LKPR', lat: 50.1008,  lon:  14.2600, iso3: 'CZE', name: 'Prague' },
  { icao: 'LHBP', lat: 47.4369,  lon:  19.2556, iso3: 'HUN', name: 'Budapest' },
  { icao: 'LROP', lat: 44.5722,  lon:  26.1022, iso3: 'ROU', name: 'Bucarest' },
  { icao: 'KJFK', lat: 40.6413,  lon: -73.7781, iso3: 'USA', name: 'New York JFK' },
  { icao: 'KEWR', lat: 40.6895,  lon: -74.1745, iso3: 'USA', name: 'New York Newark' },
  { icao: 'KBOS', lat: 42.3656,  lon: -71.0096, iso3: 'USA', name: 'Boston' },
  { icao: 'KORD', lat: 41.9742,  lon: -87.9073, iso3: 'USA', name: 'Chicago' },
  { icao: 'KLAX', lat: 33.9425,  lon:-118.4081, iso3: 'USA', name: 'Los Angeles' },
  { icao: 'KMIA', lat: 25.7959,  lon: -80.2870, iso3: 'USA', name: 'Miami' },
  { icao: 'KIAD', lat: 38.9531,  lon: -77.4565, iso3: 'USA', name: 'Washington Dulles' },
  { icao: 'KATL', lat: 33.6367,  lon: -84.4281, iso3: 'USA', name: 'Atlanta' },
  { icao: 'KSEA', lat: 47.4502,  lon:-122.3088, iso3: 'USA', name: 'Seattle' },
  { icao: 'KPDX', lat: 45.5898,  lon:-122.5951, iso3: 'USA', name: 'Portland' },
  { icao: 'KBWI', lat: 39.1754,  lon: -76.6683, iso3: 'USA', name: 'Baltimore' },
  { icao: 'KDEN', lat: 39.8561,  lon:-104.6737, iso3: 'USA', name: 'Denver' },
  { icao: 'SBGR', lat: -23.4356, lon: -46.4731, iso3: 'BRA', name: 'São Paulo' },
  { icao: 'SCEL', lat: -33.3930, lon: -70.7858, iso3: 'CHL', name: 'Santiago' },
  { icao: 'MMMX', lat: 19.4363,  lon: -99.0721, iso3: 'MEX', name: 'Mexico' },
  { icao: 'TFFR', lat: 16.2653,  lon: -61.5272, iso3: 'GLP', name: 'Pointe-à-Pitre' },
  { icao: 'TFFF', lat: 14.5910,  lon: -61.0032, iso3: 'MTQ', name: 'Fort-de-France' },
  { icao: 'SOCA', lat:  4.8221,  lon: -52.3676, iso3: 'GUF', name: 'Cayenne' },
  { icao: 'FMEE', lat: -20.8871, lon:  55.5116, iso3: 'REU', name: 'La Réunion' },
  { icao: 'FMCH', lat: -11.5337, lon:  43.2719, iso3: 'COM', name: 'Moroni' },
  { icao: 'FMMI', lat: -18.7969, lon:  47.4788, iso3: 'MDG', name: 'Antananarivo' },
  { icao: 'FIMP', lat: -20.4302, lon:  57.6836, iso3: 'MUS', name: 'Mauritius' },
  { icao: 'DAAG', lat: 36.6910,  lon:   3.2154, iso3: 'DZA', name: 'Alger' },
  { icao: 'DTTA', lat: 36.8510,  lon:  10.2272, iso3: 'TUN', name: 'Tunis' },
  { icao: 'GMMN', lat: 33.3675,  lon:  -7.5898, iso3: 'MAR', name: 'Casablanca' },
  { icao: 'GOBD', lat: 14.6704,  lon: -17.0726, iso3: 'SEN', name: 'Dakar' },
  { icao: 'DIAP', lat:  5.2614,  lon:  -3.9263, iso3: 'CIV', name: 'Abidjan' },
  { icao: 'DNMM', lat:  6.5774,  lon:   3.3215, iso3: 'NGA', name: 'Lagos' },
  { icao: 'FOOL', lat:  0.4586,  lon:   9.4123, iso3: 'GAB', name: 'Libreville' },
  { icao: 'FCBB', lat: -4.2517,  lon:  15.2531, iso3: 'COG', name: 'Brazzaville' },
  { icao: 'HTDA', lat: -6.8781,  lon:  39.2026, iso3: 'TZA', name: 'Dar es Salaam' },
  { icao: 'HAAB', lat:  8.9779,  lon:  38.7993, iso3: 'ETH', name: 'Addis Abeba' },
  { icao: 'OMDB', lat: 25.2528,  lon:  55.3644, iso3: 'ARE', name: 'Dubaï' },
  { icao: 'OERK', lat: 24.9576,  lon:  46.6988, iso3: 'SAU', name: 'Riyad' },
  { icao: 'VHHH', lat: 22.3080,  lon: 113.9185, iso3: 'HKG', name: 'Hong Kong' },
  { icao: 'RJTT', lat: 35.5494,  lon: 139.7798, iso3: 'JPN', name: 'Tokyo' },
  { icao: 'WSSS', lat:  1.3644,  lon: 103.9915, iso3: 'SGP', name: 'Singapour' },
  { icao: 'ZBAA', lat: 40.0801,  lon: 116.5846, iso3: 'CHN', name: 'Pékin' },
  { icao: 'ZSPD', lat: 31.1434,  lon: 121.8052, iso3: 'CHN', name: 'Shanghai' },
  { icao: 'VABB', lat: 19.0896,  lon:  72.8656, iso3: 'IND', name: 'Mumbai' },
  { icao: 'VIDP', lat: 28.5562,  lon:  77.1000, iso3: 'IND', name: 'Delhi' },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function getAirportsNearCoords(lat: number, lon: number, radiusKm = 400): string[] {
  return AF_AIRPORTS
    .filter(a => haversineKm(lat, lon, a.lat, a.lon) <= radiusKm)
    .map(a => a.icao);
}

function getAirportsByCountry(iso3: string): string[] {
  return AF_AIRPORTS.filter(a => a.iso3 === iso3).map(a => a.icao);
}

function regionFromCoords(lat: number, lon: number): string {
  if (lon > 60) return 'ASIE';
  if (lon > 20 && lat < 40) return 'AFR';
  if (lon > -20 && lat < 40) return 'AFR';
  if (lon < -30 && lat > 20) return 'AMN';
  if (lon < -30 && lat <= 20) return 'AMS';
  return 'EUR';
}

function basinFromCoords(lat: number, lon: number): string {
  if (lon > 30 && lat < 30) return 'Océan Indien';
  if (lon > 100) return 'Pacifique SW';
  if (lon < -40) return 'Atlantique';
  return 'Océan Indien';
}

// ─── NOAA ─────────────────────────────────────────────────────────────────────
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
  MAZ015: ['KBOS'], MAZ016: ['KBOS'],
  ILZ006: ['KORD'], ILZ012: ['KORD'], ILZ013: ['KORD'],
  ILZ014: ['KORD'], ILZ103: ['KORD'], ILZ104: ['KORD'],
  CAZ006: ['KLAX'], CAZ041: ['KLAX'], CAZ042: ['KLAX'],
  CAZ043: ['KLAX'], CAZ044: ['KLAX'], CAZ045: ['KLAX'],
  CAZ087: ['KLAX'],
  FLZ063: ['KMIA'], FLZ066: ['KMIA'], FLZ068: ['KMIA'],
  FLZ069: ['KMIA'], FLZ072: ['KMIA'], FLZ073: ['KMIA'],
  FLZ074: ['KMIA'], FLZ075: ['KMIA'],
  WAZ001: ['KSEA'], WAZ503: ['KSEA'], WAZ504: ['KSEA'],
  WAZ505: ['KSEA'], WAZ506: ['KSEA'], WAZ507: ['KSEA'],
  WAZ508: ['KSEA'], WAZ509: ['KSEA'], WAZ555: ['KSEA'],
  WAZ556: ['KSEA'], WAZ558: ['KSEA'], WAZ559: ['KSEA'],
  COZ001: ['KDEN'], COZ002: ['KDEN'], COZ003: ['KDEN'],
  COZ039: ['KDEN'], COZ040: ['KDEN'], COZ041: ['KDEN'],
  MNZ060: ['KMSP'], MNZ061: ['KMSP'], MNZ062: ['KMSP'],
  MNZ063: ['KMSP'], MNZ068: ['KMSP'], MNZ069: ['KMSP'],
  MNZ070: ['KMSP'],
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
      {
        headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/geo+json' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      console.error('[NOAA] HTTP', res.status);
      return alerts;
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json') && !ct.includes('geo+json')) {
      console.error('[NOAA] Unexpected content-type:', ct);
      return alerts;
    }
    const json = await res.json();
    const raw: Alert[] = [];

    for (const f of (json.features ?? [])) {
      const p = f.properties;
      if (!RELEVANT_EVENTS.has(p.event)) continue;

      const zones = p.geocode?.UGC ?? [];
      const airportSet = new Set<string>();
      for (const zone of zones) {
        const found = NWS_ZONE_AIRPORTS[zone];
        if (found) found.forEach((a: string) => airportSet.add(a));
      }
      const airports = [...airportSet];
      if (airports.length === 0) continue;

      const airportCoords = airports
        .map(icao => AF_AIRPORTS.find(a => a.icao === icao))
        .filter((a): a is typeof AF_AIRPORTS[0] => a != null);
      const lat = airportCoords.length
        ? airportCoords.reduce((s, a) => s + a.lat, 0) / airportCoords.length
        : undefined;
      const lon = airportCoords.length
        ? airportCoords.reduce((s, a) => s + a.lon, 0) / airportCoords.length
        : undefined;

      raw.push({
        id: `NOAA-${p.id}`,
        source: 'NOAA',
        region: 'AMN',
        severity: noaaSeverity(p.event),
        phenomenon: p.event,
        country: 'United States',
        airports,
        ...(lat !== undefined ? { lat } : {}),
        ...(lon !== undefined ? { lon } : {}),
        validFrom: p.onset || p.effective || '',
        validTo: p.expires || '',
        headline: p.headline || p.event,
        description: p.description?.slice(0, 500) || p.headline || '',
        link: p['@id'] || 'https://www.weather.gov/alerts',
      });
    }

    const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
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
        const mergedCoords = airports
          .map(icao => AF_AIRPORTS.find(ap => ap.icao === icao))
          .filter((ap): ap is typeof AF_AIRPORTS[0] => ap != null);
        const lat = mergedCoords.length
          ? mergedCoords.reduce((s, ap) => s + ap.lat, 0) / mergedCoords.length
          : ex.lat;
        const lon = mergedCoords.length
          ? mergedCoords.reduce((s, ap) => s + ap.lon, 0) / mergedCoords.length
          : ex.lon;
        seen.set(key, { ...ex, severity, airports, ...(lat !== undefined ? { lat } : {}), ...(lon !== undefined ? { lon } : {}) });
      }
    }
    alerts.push(...seen.values());
  } catch (e) {
    console.error('[NOAA]', e);
  }
  return alerts;
}

// ─── GDACS ────────────────────────────────────────────────────────────────────
const GDACS_TYPE_LABELS: Record<string, string> = {
  EQ: 'Tremblement de terre',
  TC: 'Cyclone tropical',
  FL: 'Inondation',
  VO: 'Éruption volcanique',
  WF: 'Incendie',
  TS: 'Tsunami',
};

const GDACS_IMPACT_RADIUS: Record<string, number> = {
  EQ: 500, TC: 800, FL: 300, VO: 400, WF: 300, TS: 1000,
};

const GDACS_RELEVANT_TYPES = new Set(['EQ', 'TC', 'FL', 'VO', 'TS']);

function gdacsGetTag(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function gdacsParseLevel(item: string): number {
  const raw = gdacsGetTag(item, 'gdacs:alertlevel').toLowerCase();
  if (raw === 'red') return 3;
  if (raw === 'orange') return 2;
  return 1;
}

function gdacsParseCoords(item: string): { lat: number; lon: number } | null {
  const geoLat = gdacsGetTag(item, 'geo:lat');
  const geoLon = gdacsGetTag(item, 'geo:long');
  if (geoLat && geoLon) return { lat: parseFloat(geoLat), lon: parseFloat(geoLon) };

  const point = gdacsGetTag(item, 'georss:point');
  if (point) {
    const parts = point.trim().split(/\s+/);
    if (parts.length === 2) return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
  }
  return null;
}

function gdacsParseEventType(item: string): string | null {
  const et = gdacsGetTag(item, 'gdacs:eventtype').toUpperCase();
  if (GDACS_RELEVANT_TYPES.has(et)) return et;

  const title = gdacsGetTag(item, 'title').toLowerCase();
  if (title.includes('earthquake')) return 'EQ';
  if (title.includes('tropical') || title.includes('cyclone') ||
    title.includes('typhoon') || title.includes('hurricane')) return 'TC';
  if (title.includes('flood')) return 'FL';
  if (title.includes('volcano')) return 'VO';
  if (title.includes('tsunami')) return 'TS';
  return null;
}

export async function fetchGDACS(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error('[GDACS] HTTP', res.status);
      return alerts;
    }

    const xml = await res.text();

    for (const item of xml.split('<item>').slice(1)) {
      const eventType = gdacsParseEventType(item);
      if (!eventType) continue;

      const level = gdacsParseLevel(item);

      const severityRaw = gdacsGetTag(item, 'gdacs:severity');
      const windMatch = severityRaw.match(/(\d+(?:\.\d+)?)\s*km\/h/i);
      const windKmh = windMatch ? parseFloat(windMatch[1]) : null;

      const isTcByWind = eventType === 'TC' && windKmh !== null && windKmh >= 120;
      if (level < 2 && !isTcByWind) continue;

      const coords = gdacsParseCoords(item);
      if (!coords) continue;

      const { lat, lon } = coords;
      const title = gdacsGetTag(item, 'title');
      const description = gdacsGetTag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const pubDate = gdacsGetTag(item, 'pubDate');
      const link = gdacsGetTag(item, 'link') || 'https://www.gdacs.org';
      const gdacsCountry = gdacsGetTag(item, 'gdacs:country');
      const eventName = gdacsGetTag(item, 'gdacs:eventname') || '';
      const magRaw = gdacsGetTag(item, 'gdacs:magnitude');
      const magnitude = magRaw ? parseFloat(magRaw) : windKmh ?? undefined;
      const eventId = gdacsGetTag(item, 'gdacs:eventid') || `${eventType}-${lat}-${lon}`;

      const radius = GDACS_IMPACT_RADIUS[eventType] ?? 400;
      const airports = getAirportsNearCoords(lat, lon, radius);
      const region = regionFromCoords(lat, lon);
      const basin = eventType === 'TC' ? basinFromCoords(lat, lon) : undefined;

      const country = gdacsCountry || (eventType === 'TC' ? (basin ?? '') : eventName);

      let severity: Severity;
      if (level >= 3) severity = 'red';
      else if (level === 2) severity = 'orange';
      else if (windKmh !== null && windKmh >= 180) severity = 'red';
      else severity = 'orange';
      const label = GDACS_TYPE_LABELS[eventType] ?? 'Événement';
      const magStr = windKmh ? ` ${windKmh} km/h` : magnitude ? ` M${magnitude}` : '';
      const tcName = eventType === 'TC' && eventName ? ` (${eventName})` : '';

      alerts.push({
        id: `gdacs-${eventId}`,
        source: 'GDACS',
        region,
        severity,
        phenomenon: label,
        eventType,
        country,
        airports,
        lat,
        lon,
        validFrom: pubDate,
        validTo: null,
        headline: `${label}${magStr}${tcName} — ${country || 'Région inconnue'}`,
        description,
        link,
        ...(basin ? { basin } : {}),
        ...(magnitude ? { magnitude } : {}),
      });
    }

    alerts.sort((a, b) => {
      const sev: Record<string, number> = { red: 3, orange: 2, yellow: 1 };
      if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity];
      return (b.magnitude ?? 0) - (a.magnitude ?? 0);
    });
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.error('[GDACS]', e);
  }
  return alerts;
}

// ─── VAAC ─────────────────────────────────────────────────────────────────────
// Volcanic Ash Advisory Centers — flux RSS ICAO
// Couverture : Londres (EUR/AFR/ATL), Toulouse (ATL/AFR/EUR), Montréal (AMN/AMS),
//              Washington (AMN/AMC), Anchorage (PAC/AMN), Tokyo (ASIE/PAC)
const VAAC_FEEDS = [
  {
    id: 'london',
    name: 'VAAC Londres',
    url: 'https://www.metoffice.gov.uk/hazardmanager/vaac/rss/all_vaac_feed.rss',
  },
  {
    id: 'toulouse',
    name: 'VAAC Toulouse',
    url: 'https://vaac.meteo.fr/rss/vaac_feed.rss',
  },
  {
    id: 'montreal',
    name: 'VAAC Montréal',
    url: 'https://crpg.meteo.gc.ca/vaac/rss/en/vaac_rss.xml',
  },
  {
    id: 'washington',
    name: 'VAAC Washington',
    url: 'https://www.ssd.noaa.gov/VAAC/vaac_msgs_rss.xml',
  },
  {
    id: 'anchorage',
    name: 'VAAC Anchorage',
    url: 'https://vaac.arh.noaa.gov/doc.php?type=vaa&output=rss',
  },
  {
    id: 'tokyo',
    name: 'VAAC Tokyo',
    url: 'https://ds.data.jma.go.jp/svd/vaac/data/rss/tyo_vaac_advisory.rss',
  },
];

function vaacGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function vaacParseVolcanoCoords(text: string): { lat: number; lon: number } | null {
  const m = text.match(/([NS])\s*(\d+(?:\.\d+)?)\s+([EW])\s*(\d+(?:\.\d+)?)/i);
  if (!m) {
    const m2 = text.match(/(\d+(?:\.\d+)?)\s*([NS])\s+(\d+(?:\.\d+)?)\s*([EW])/i);
    if (!m2) return null;
    const lat = parseFloat(m2[1]) * (m2[2].toUpperCase() === 'S' ? -1 : 1);
    const lon = parseFloat(m2[3]) * (m2[4].toUpperCase() === 'W' ? -1 : 1);
    return { lat, lon };
  }
  const lat = parseFloat(m[2]) * (m[1].toUpperCase() === 'S' ? -1 : 1);
  const lon = parseFloat(m[4]) * (m[3].toUpperCase() === 'W' ? -1 : 1);
  return { lat, lon };
}

function vaacParseFlLevel(text: string): string {
  const m = text.match(/FL\s*(\d{3})/i);
  return m ? `FL${m[1]}` : '';
}

function vaacParseFirArea(text: string): string {
  const m = text.match(/FIR\s*[:\-]?\s*([A-Z\s]{3,30})/i);
  return m ? m[1].trim() : '';
}

function vaacSeverity(flLevel: string): Severity {
  if (!flLevel) return 'yellow';
  const fl = parseInt(flLevel.replace('FL', ''), 10);
  if (fl >= 200) return 'red';
  if (fl >= 100) return 'orange';
  return 'yellow';
}

export async function fetchVAAC(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const results = await Promise.allSettled(
    VAAC_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
          'Accept': 'application/xml, text/xml, application/rss+xml, */*',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.warn(`[VAAC ${feed.id}] HTTP ${res.status}`);
        return { feed, items: [] as string[] };
      }
      const xml = await res.text();
      const items = xml.split('<item>').slice(1);
      return { feed, items };
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { feed, items } = result.value;

    for (const item of items) {
      const title       = vaacGetTag(item, 'title');
      const description = vaacGetTag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const pubDate     = vaacGetTag(item, 'pubDate');
      const link        = vaacGetTag(item, 'link') || feed.url;
      const combined    = `${title} ${description}`;

      const volcanoMatch = combined.match(/VOLCANO[:\s]+([A-Z][A-Z\s\-']+?)(?:\s{2,}|\n|\/|PSN|FL|ERUPTION|SIGMET)/i);
      const volcanoName  = volcanoMatch ? volcanoMatch[1].trim() : 'Volcan inconnu';

      const coords = vaacParseVolcanoCoords(combined);
      if (!coords) continue;

      const { lat, lon } = coords;
      const flLevel  = vaacParseFlLevel(combined);
      const severity = vaacSeverity(flLevel);
      const region   = regionFromCoords(lat, lon);
      const airports = getAirportsNearCoords(lat, lon, 600);

      const firArea = vaacParseFirArea(combined);
      const countryLabel = firArea || feed.name;

      const flStr = flLevel ? ` — Cendres ${flLevel}` : '';
      const headline = `Avis cendres volcaniques : ${volcanoName}${flStr} (${feed.name})`;

      const validToMatch = combined.match(/(\d{2}\/\d{4}Z)/g);
      const validTo = validToMatch && validToMatch.length > 0
        ? (() => {
            const now = new Date();
            const [dayTime] = [validToMatch[validToMatch.length - 1]];
            const day = parseInt(dayTime.slice(0, 2), 10);
            const hh  = parseInt(dayTime.slice(3, 5), 10);
            const mm  = parseInt(dayTime.slice(5, 7), 10);
            const d   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hh, mm));
            if (d.getTime() < Date.now() - 86400000) {
              d.setUTCMonth(d.getUTCMonth() + 1);
            }
            return d.toISOString();
          })()
        : null;

      alerts.push({
        id: `vaac-${feed.id}-${volcanoName.replace(/\s/g, '')}-${pubDate}`,
        source: 'VAAC',
        region,
        severity,
        phenomenon: 'Cendres volcaniques',
        country: countryLabel,
        airports,
        lat,
        lon,
        validFrom: pubDate,
        validTo,
        headline,
        description: description.slice(0, 500),
        link,
        eventType: 'VAAC',
      });
    }
  }

  return alerts;
}

// ─── MeteoAlarm ───────────────────────────────────────────────────────────────
const AWT_LABEL: Record<number, string> = {
  1: 'Vent violent', 2: 'Neige / Verglas', 3: 'Orages', 4: 'Brouillard',
  5: 'Chaleur extrême', 6: 'Froid extrême', 7: 'Événement côtier',
  10: 'Pluie intense', 11: 'Inondation', 12: 'Inondation / Pluie',
};

const EXCLUDED_AWT = new Set([8, 9, 13]);

const MIN_LEVEL: Record<number, number> = {
  1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 10: 4, 11: 4, 12: 4,
};

const MA_COUNTRY_ISO2_TO_ISO3: Record<string, string> = {
  AT: 'AUT', BA: 'BIH', BE: 'BEL', BG: 'BGR', CY: 'CYP', CZ: 'CZE',
  DE: 'DEU', DK: 'DNK', ES: 'ESP', FI: 'FIN', FR: 'FRA', GR: 'GRC',
  HR: 'HRV', HU: 'HUN', IE: 'IRL', IL: 'ISR', IS: 'ISL', IT: 'ITA',
  LT: 'LTU', LV: 'LVA', MD: 'MDA', ME: 'MNE', MK: 'MKD', MT: 'MLT',
  NL: 'NLD', PL: 'POL', PT: 'PRT', RO: 'ROU', RS: 'SRB', SI: 'SVN',
  SK: 'SVK',
};

const MA_COUNTRY_NAME: Record<string, string> = {
  AT: 'Austria', BA: 'Bosnia and Herzegovina', BE: 'Belgium', BG: 'Bulgaria',
  CY: 'Cyprus', CZ: 'Czech Republic', DE: 'Germany', DK: 'Denmark',
  ES: 'Spain', FI: 'Finland', FR: 'France', GR: 'Greece', HR: 'Croatia',
  HU: 'Hungary', IE: 'Ireland', IL: 'Israel', IS: 'Iceland', IT: 'Italy',
  LT: 'Lithuania', LV: 'Latvia', MD: 'Moldova', ME: 'Montenegro',
  MK: 'North Macedonia', MT: 'Malta', NL: 'Netherlands', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', RS: 'Serbia', SI: 'Slovenia', SK: 'Slovakia',
};

const MA_FEED_SLUGS: Record<string, string> = {
  AT: 'austria', BA: 'bosnia-and-herzegovina', BE: 'belgium', BG: 'bulgaria',
  CY: 'cyprus', CZ: 'czech-republic', DE: 'germany', DK: 'denmark',
  ES: 'spain', FI: 'finland', FR: 'france', GR: 'greece', HR: 'croatia',
  HU: 'hungary', IE: 'ireland', IL: 'israel', IS: 'iceland', IT: 'italy',
  LT: 'lithuania', LV: 'latvia', MD: 'moldova', ME: 'montenegro',
  MK: 'north-macedonia', MT: 'malta', NL: 'netherlands', PL: 'poland',
  PT: 'portugal', RO: 'romania', RS: 'serbia', SI: 'slovenia', SK: 'slovakia',
};

type EmmaCentroid = { lat: number; lon: number; country: string; name: string };
const emmaCentroidsImport = emmaCentroidsData as Record<string, EmmaCentroid>;

export async function fetchMeteoAlarm(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const emmaCentroids = emmaCentroidsImport;

  const countryEntries = Object.entries(MA_FEED_SLUGS);
  const results = await Promise.allSettled(
    countryEntries.map(async ([iso2, slug]) => {
      const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-${slug}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
          'Accept': 'application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { iso2, items: [] };
      const xml = await res.text();
      return { iso2, xml };
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled' || !('xml' in result.value)) continue;
    const { iso2, xml } = result.value as { iso2: string; xml: string };
    const iso3 = MA_COUNTRY_ISO2_TO_ISO3[iso2] ?? '';
    const countryName = MA_COUNTRY_NAME[iso2] ?? iso2;

    for (const item of xml.split('<item>').slice(1)) {
      const getTag = (tag: string) => {
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
      const events: { level: number; awt: number }[] = [];
      while ((match = eventRegex.exec(description)) !== null) {
        events.push({ level: parseInt(match[1], 10), awt: parseInt(match[2], 10) });
      }

      if (events.length === 0) continue;

      const significant = events.filter(e =>
        !EXCLUDED_AWT.has(e.awt) && e.level >= (MIN_LEVEL[e.awt] ?? 2)
      );
      if (significant.length === 0) continue;

      const byType = new Map<number, number>();
      for (const e of significant) {
        if (!byType.has(e.awt) || e.level > byType.get(e.awt)!) {
          byType.set(e.awt, e.level);
        }
      }

      const regionCentroid = emmaCode ? emmaCentroids[emmaCode] : null;
      const lat = regionCentroid?.lat;
      const lon = regionCentroid?.lon;
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
        const severity: Severity = level >= 4 ? 'red' : level === 3 ? 'orange' : 'yellow';
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
          ...(lat !== undefined ? { lat } : {}),
          ...(lon !== undefined ? { lon } : {}),
          validFrom: pubDate,
          validTo: pubDate,
          headline: `Alerte ${levelLabel} ${phenomenon} — ${regionName} (${countryName})`,
          description: `Niveau ${levelLabel} — ${phenomenon} dans la région ${regionName}, ${countryName}`,
          link,
        });
      }
    }
  }
  return alerts;
}
