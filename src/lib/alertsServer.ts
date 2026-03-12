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
  volcanoName?: string;
  tcBulletinLabel?: string;
  tcBulletinUrl?: string;
}

// ─── AF Airports ─────────────────────────────────────────────────────────────────────────────
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
  { icao: 'KSFO', lat: 37.6213,  lon:-122.3790, iso3: 'USA', name: 'San Francisco' },
  { icao: 'KMIA', lat: 25.7959,  lon: -80.2870, iso3: 'USA', name: 'Miami' },
  { icao: 'KIAD', lat: 38.9531,  lon: -77.4565, iso3: 'USA', name: 'Washington Dulles' },
  { icao: 'KATL', lat: 33.6367,  lon: -84.4281, iso3: 'USA', name: 'Atlanta' },
  { icao: 'KSEA', lat: 47.4502,  lon:-122.3088, iso3: 'USA', name: 'Seattle' },
  { icao: 'KPDX', lat: 45.5898,  lon:-122.5951, iso3: 'USA', name: 'Portland' },
  { icao: 'KBWI', lat: 39.1754,  lon: -76.6683, iso3: 'USA', name: 'Baltimore' },
  { icao: 'KDEN', lat: 39.8561,  lon:-104.6737, iso3: 'USA', name: 'Denver' },
  { icao: 'PHOG', lat: 20.8986,  lon:-156.4305, iso3: 'USA', name: 'Maui (Kahului)' },
  { icao: 'PHNL', lat: 21.3187,  lon:-157.9224, iso3: 'USA', name: 'Honolulu' },
  { icao: 'SBGR', lat: -23.4356, lon: -46.4731, iso3: 'BRA', name: 'São Paulo' },
  { icao: 'SCEL', lat: -33.3930, lon: -70.7858, iso3: 'CHL', name: 'Santiago' },
  { icao: 'MMMX', lat: 19.4363,  lon: -99.0721, iso3: 'MEX', name: 'Mexico' },
  { icao: 'TFFR', lat: 16.2653,  lon: -61.5272, iso3: 'GLP', name: 'Pointe-à-Pitre' },
  { icao: 'TFFF', lat: 14.5910,  lon: -61.0032, iso3: 'MTQ', name: 'Fort-de-France' },
  { icao: 'SOCA', lat:  4.8221,  lon: -52.3676, iso3: 'GUF', name: 'Cayenne' },
  { icao: 'NTAA', lat: -17.5534, lon:-149.6066, iso3: 'PYF', name: 'Papeete Tahiti' },
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

// ─── Volcans Hawaii → NTAA (Papeete) ─────────────────────────────────────────────────────────
// Les volcans de Hawaii (Big Island, ~19°N 155°W) sont à ~4 200 km de Tahiti.
// Aucun rayon de proximité ne peut relier les deux ; on force le mapping explicitement.
// Liste non exhaustive — couvre les volcans actifs gérés par le VAAC Washington.
const HAWAII_VOLCANO_NAMES = new Set([
  'KILAUEA', 'MAUNA LOA', 'MAUNA KEA', 'HUALALAI', 'LOIHI',
  'KILAUEA VOLCANO', 'MAUNA LOA VOLCANO',
]);

/** Retourne true si le nom de volcan correspond à Hawaii. */
function isHawaiiVolcano(name: string | null | undefined): boolean {
  if (!name) return false;
  return HAWAII_VOLCANO_NAMES.has(name.toUpperCase().trim());
}

/**
 * Retourne les aéroports proches des coordonnées, en ajoutant NTAA
 * si les coordonnées correspondent à la zone Hawaii (volcanisme actif).
 * Hawaii : lat ∈ [18, 23], lon ∈ [-161, -154]
 */
function getAirportsNearCoordsWithOverride(lat: number, lon: number, radiusKm: number, volcanoName?: string | null): string[] {
  const base = getAirportsNearCoords(lat, lon, radiusKm);
  const isHawaii = (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154) || isHawaiiVolcano(volcanoName);
  if (isHawaii && !base.includes('NTAA')) {
    return [...base, 'NTAA'];
  }
  return base;
}

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

function tcBulletinLink(lat: number, lon: number): { label: string; url: string } {
  if (lon >= 20 && lon < 90 && lat < 30) {
    return {
      label: 'Bulletin RSMC La Réunion',
      url:   'https://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/anglais/activitedevstop/rsmc/',
    };
  }
  if (lon >= 90) {
    return {
      label: 'Bulletin JTWC',
      url:   'https://www.metoc.navy.mil/jtwc/jtwc.html',
    };
  }
  if (lon <= -100) {
    return {
      label: 'Bulletin NHC — Pac. Est',
      url:   'https://www.nhc.noaa.gov/?epac',
    };
  }
  return {
    label: 'Bulletin NHC — Atlantique',
    url:   'https://www.nhc.noaa.gov/?atlc',
  };
}

/** Supprime les wrappers CDATA d'une chaîne XML : <!\[CDATA\[...\]\]> → contenu brut */
function stripCdata(s: string): string {
  let result = s;
  let start = result.indexOf('<![CDATA[');
  while (start !== -1) {
    const end = result.indexOf(']]>', start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(start + 9, end) + result.slice(end + 3);
    start = result.indexOf('<![CDATA[', start);
  }
  return result;
}

// ─── NOAA ────────────────────────────────────────────────────────────────────────────────────

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
  CAZ006: ['KSFO'], CAZ007: ['KSFO'], CAZ008: ['KSFO'],
  CAZ509: ['KSFO'], CAZ510: ['KSFO'], CAZ511: ['KSFO'],
  CAZ512: ['KSFO'], CAZ513: ['KSFO'], CAZ514: ['KSFO'],
  CAZ515: ['KSFO'], CAZ516: ['KSFO'], CAZ517: ['KSFO'],
  CAZ518: ['KSFO'], CAZ519: ['KSFO'], CAZ520: ['KSFO'],
  CAZ041: ['KLAX'], CAZ042: ['KLAX'], CAZ043: ['KLAX'],
  CAZ044: ['KLAX'], CAZ045: ['KLAX'], CAZ087: ['KLAX'],
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

const NOAA_PHENOMENON_FR: Record<string, string> = {
  'Blizzard Warning':           'Blizzard',
  'Winter Storm Warning':       'Neige / Verglas',
  'Winter Storm Watch':         'Neige / Verglas',
  'Ice Storm Warning':          'Gel / Verglas',
  'Heavy Snow Warning':         'Neige',
  'High Wind Warning':          'Vent violent',
  'High Wind Watch':            'Vent violent',
  'Hurricane Warning':          'Hurricane',
  'Hurricane Watch':            'Hurricane',
  'Tropical Storm Warning':     'Cyclone tropical',
  'Tropical Storm Watch':       'Cyclone tropical',
  'Tornado Warning':            'Tornade',
  'Tornado Watch':              'Tornade',
  'Dense Fog Advisory':         'Brouillard',
  'Freezing Fog Advisory':      'Brouillard',
  'Extreme Cold Warning':       'Froid extrême',
  'Wind Chill Warning':         'Froid extrême',
  'Dust Storm Warning':         'Poussière / Sable',
  'Flood Warning':              'Inondation',
  'Coastal Flood Warning':      'Inondation / Pluie',
};

const RELEVANT_EVENTS = new Set(Object.keys(NOAA_PHENOMENON_FR));

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

      const phenomenon = NOAA_PHENOMENON_FR[p.event] ?? p.event;

      raw.push({
        id: `NOAA-${p.id}`,
        source: 'NOAA',
        region: 'AMN',
        severity: noaaSeverity(p.event),
        phenomenon,
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

// ─── GDACS ────────────────────────────────────────────────────────────────────────────────────
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
  return m ? stripCdata(m[1]).trim() : '';
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
    const now = Date.now();
    const maxAgeDays = 7;

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
      
      // Filtre de date : rejeter les événements de plus de 7 jours
      if (pubDate) {
        try {
          const pubTime = new Date(pubDate).getTime();
          if (!isNaN(pubTime) && now - pubTime > maxAgeDays * 86400000) {
            continue;
          }
        } catch {
          // Si la date ne peut pas être parsée, on conserve l'alerte
        }
      }

      const link = gdacsGetTag(item, 'link') || 'https://www.gdacs.org';
      const gdacsCountry = gdacsGetTag(item, 'gdacs:country');
      const eventName = gdacsGetTag(item, 'gdacs:eventname') || '';
      const magRaw = gdacsGetTag(item, 'gdacs:magnitude');
      const magnitude = magRaw ? parseFloat(magRaw) : windKmh ?? undefined;
      const eventId = gdacsGetTag(item, 'gdacs:eventid') || `${eventType}-${lat}-${lon}`;

      const radius = GDACS_IMPACT_RADIUS[eventType] ?? 400;
      // Pour les volcans GDACS, on utilise le override Hawaii → NTAA
      const airports = eventType === 'VO'
        ? getAirportsNearCoordsWithOverride(lat, lon, radius, eventName)
        : getAirportsNearCoords(lat, lon, radius);
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

      const tcBulletin = eventType === 'TC' ? tcBulletinLink(lat, lon) : undefined;

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
        ...(tcBulletin ? { tcBulletinLabel: tcBulletin.label, tcBulletinUrl: tcBulletin.url } : {}),
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
// ─── VAAC — tous les 9 centres mondiaux ──────────────────────────────────────────────────────

function hasAshCloudExtent(text: string): boolean {
  const extentPatterns = [
    /([NS])\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*\s+[NS]\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*/i,
    /extent.*?[0-9.-]+\s*[NS]\s+to\s+[0-9.-]+\s*[NS]/i,
    /[NS]\d{2,3}\s*[EW]\d{2,3}\s*[-–]\s*[NS]\d{2,3}\s*[EW]\d{2,3}/i,
    /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/i,
    /within\s+[0-9.-]+\s*km\s+of/i,
    /bounded\s+by/i,
    /box\s+from/i,
    /ashCloudExtent/i,
    /(-?\d+\.?\d+\s+-?\d+\.?\d+\s+){2,}/,
  ];
  return extentPatterns.some(p => p.test(text));
}

function vaacGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
}

function vaacParseVolcanoCoords(text: string): { lat: number; lon: number } | null {
  const m = text.match(/([NS])\s*(\d+(?:\.\d+)?)\s+([EW])\s*(\d+(?:\.\d+)?)/i);
  if (!m) {
    const m2 = text.match(/(\d+(?:\.\d+)?)\s*([NS])\s+(\d+(?:\.\d+)?)\s*([EW])/i);
    if (!m2) return null;
    return {
      lat: parseFloat(m2[1]) * (m2[2].toUpperCase() === 'S' ? -1 : 1),
      lon: parseFloat(m2[3]) * (m2[4].toUpperCase() === 'W' ? -1 : 1),
    };
  }
  return {
    lat: parseFloat(m[2]) * (m[1].toUpperCase() === 'S' ? -1 : 1),
    lon: parseFloat(m[4]) * (m[3].toUpperCase() === 'W' ? -1 : 1),
  };
}

function vaacParseFlLevel(text: string): string {
  const m = text.match(/FL\s*(\d{3})/i);
  return m ? `FL${m[1]}` : '';
}

function vaacSeverity(flLevel: string): Severity {
  if (!flLevel) return 'yellow';
  const fl = parseInt(flLevel.replace('FL', ''), 10);
  if (fl >= 200) return 'red';
  if (fl >= 100) return 'orange';
  return 'yellow';
}

function iwxxmGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function parseVaaTextBlock(block: string, sourceName: string, region: string, sourceUrl: string): Alert | null {
  try {
    const clean = block.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');

    if (!hasAshCloudExtent(clean)) return null;

    const get = (tag: string) =>
      clean.match(new RegExp(`${tag}[:\\s]+([^\\n\\r]{2,60})`, 'i'))?.[1]?.trim() ?? '';

    const volcanoRaw = get('VOLCANO') || 'Inconnu';
    const volcano = volcanoRaw !== 'Inconnu' ? volcanoRaw : null;
    const dtg     = get('DTG');
    const psn     = get('PSN');
    const flLevel = vaacParseFlLevel(clean);
    const coords  = vaacParseVolcanoCoords(psn || clean);
    const severity = vaacSeverity(flLevel);

    let lat = coords?.lat;
    let lon = coords?.lon;
    if (!coords) {
      const psnDM = psn.match(/([NS])(\d{2})(\d{2})\s+([EW])(\d{3})(\d{2})/i);
      if (psnDM) {
        lat = (parseInt(psnDM[2]) + parseInt(psnDM[3]) / 60) * (psnDM[1].toUpperCase() === 'S' ? -1 : 1);
        lon = (parseInt(psnDM[5]) + parseInt(psnDM[6]) / 60) * (psnDM[4].toUpperCase() === 'W' ? -1 : 1);
      }
    }

    const volcanoDisplay = volcano ?? 'Volcan';
    const airports = (lat != null && lon != null)
      ? getAirportsNearCoordsWithOverride(lat, lon, 800, volcano)
      : [];

    return {
      id:         `VAAC-${sourceName}-${volcanoDisplay.replace(/\s+/g, '_')}-${dtg || Date.now()}`,
      source:     'VAAC',
      region,
      severity,
      phenomenon: 'Cendres volcaniques',
      country:    get('AREA') || sourceName,
      airports,
      ...(lat != null && lon != null ? { lat, lon } : {}),
      validFrom:  new Date().toISOString(),
      validTo:    null,
      headline:   `Cendres volcaniques — ${volcanoDisplay}${flLevel ? ' ' + flLevel : ''} (VAAC ${sourceName})`,
      description: clean.slice(0, 400).trim(),
      link:       sourceUrl,
      eventType:  'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    };
  } catch {
    return null;
  }
}

function parseVAACRssItem(item: string, sourceName: string, region: string): Alert | null {
  try {
    const title       = vaacGetTag(item, 'title');
    const description = vaacGetTag(item, 'description');
    const link        = vaacGetTag(item, 'link');
    const pubDate     = vaacGetTag(item, 'pubDate') || vaacGetTag(item, 'dc:date');
    const text        = `${title}\n${description}`;

    if (!hasAshCloudExtent(text)) return null;

    const flLevel  = vaacParseFlLevel(text);
    const coords   = vaacParseVolcanoCoords(text);
    const severity = vaacSeverity(flLevel);

    const volcanoRaw = title.match(/VOLCANO:\s*([^\n/|,]+)/i)?.[1]?.trim()
      || title.match(/^([A-Z\s]+(?:VOLCANO)?)\s/i)?.[1]?.trim()
      || null;
    const volcano = volcanoRaw && volcanoRaw !== 'Inconnu' ? volcanoRaw : null;

    const airports = coords
      ? getAirportsNearCoordsWithOverride(coords.lat, coords.lon, 800, volcano)
      : [];

    return {
      id:         `VAAC-${sourceName}-${(volcano ?? 'unknown').replace(/\s+/g, '_')}-${pubDate}`,
      source:     'VAAC',
      region,
      severity,
      phenomenon: 'Cendres volcaniques',
      country:    vaacGetTag(item, 'dc:subject') || sourceName,
      airports,
      ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
      validFrom:  pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      validTo:    null,
      headline:   `Cendres volcaniques — ${volcano ?? 'Volcan'}${flLevel ? ' ' + flLevel : ''} (VAAC ${sourceName})`,
      description: description.slice(0, 400),
      link,
      eventType:  'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    };
  } catch {
    return null;
  }
}

async function fetchVAACRss(
  sourceName: string,
  url: string,
  region: string,
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':     'application/rss+xml,text/xml,application/xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn(`[VAAC ${sourceName}] HTTP ${res.status}`); return alerts; }

    const xml   = await res.text();
    const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);

    if (items.length === 0) {
      console.log(`[VAAC ${sourceName}] Aucun advisory actif`);
      return alerts;
    }

    for (const item of items) {
      const alert = parseVAACRssItem(item, sourceName, region);
      if (alert) alerts.push(alert);
    }
    console.log(`[VAAC ${sourceName}] ${alerts.length}/${items.length} advisory(ies) avec extent`);
  } catch (e) {
    console.warn(`[VAAC ${sourceName}]`, e instanceof Error ? e.message : e);
  }
  return alerts;
}

async function fetchVAACHtml(
  sourceName: string,
  url: string,
  region: string,
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn(`[VAAC ${sourceName}] HTTP ${res.status}`); return alerts; }

    const html   = await res.text();
    const hasVAA = /VA\s+ADVISORY|VOLCANIC\s+ASH\s+ADVISORY/i.test(html);
    if (!hasVAA) { console.log(`[VAAC ${sourceName}] Aucun advisory actif`); return alerts; }

    const blocks = html
      .split(/(?=VA\s+ADVISORY)/i)
      .filter(b => b.trim().length > 30);

    for (const block of blocks.slice(0, 10)) {
      const alert = parseVaaTextBlock(block, sourceName, region, url);
      if (alert) alerts.push(alert);
    }
    console.log(`[VAAC ${sourceName}] ${alerts.length}/${blocks.length} advisory(ies) avec extent`);
  } catch (e) {
    console.warn(`[VAAC ${sourceName}]`, e instanceof Error ? e.message : e);
  }
  return alerts;
}

const VAAC_WASHINGTON_BASE   = 'https://www.ospo.noaa.gov/products/atmosphere/vaac';
const VAAC_WASHINGTON_ORIGIN = 'https://www.ospo.noaa.gov';

async function fetchVAACWashington(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const listRes = await fetch(`${VAAC_WASHINGTON_BASE}/messages.html`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
      signal:  AbortSignal.timeout(10000),
    });
    if (!listRes.ok) { console.warn(`[VAAC Washington] listing HTTP ${listRes.status}`); return alerts; }

    const html     = await listRes.text();
    const xmlLinks: string[] = [];
    const linkRe   = /href="([^"]*\/xml_files\/FVXX\d+_\d+_\d+\.xml)"/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].startsWith('http') ? m[1] : `${VAAC_WASHINGTON_ORIGIN}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
      if (!xmlLinks.includes(href)) xmlLinks.push(href);
    }
    if (xmlLinks.length === 0) { console.warn('[VAAC Washington] aucun fichier XML'); return alerts; }

    const xmlResults = await Promise.allSettled(
      xmlLinks.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
          signal:  AbortSignal.timeout(10000),
        }).then(r => r.ok ? r.text() : Promise.reject(r.status))
      )
    );

    for (let i = 0; i < xmlResults.length; i++) {
      const res = xmlResults[i];
      if (res.status !== 'fulfilled') continue;
      const xml = res.value;

      const hasIwxxmExtent =
        /<(?:[^:>]+:)?posList[^>]*>[^<]{10,}<\/(?:[^:>]+:)?posList>/i.test(xml) ||
        /<(?:[^:>]+:)?ashCloud[^/][^>]*>[\s\S]{20,}<\/(?:[^:>]+:)?ashCloud>/i.test(xml);

      if (!hasIwxxmExtent) {
        console.debug('[VAAC Washington] skip (no ash polygon):', xmlLinks[i]);
        continue;
      }

      const volcanoBlockMatch = xml.match(/<(?:[^:>]+:)?EruptingVolcano[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?EruptingVolcano>/i);
      let volcanoName: string | null = null;
      if (volcanoBlockMatch) {
        const volcanoBlock = volcanoBlockMatch[1];
        const nameMatch = volcanoBlock.match(/<(?:[^:>]+:)?name(?:\s[^>]*)?>([^<]*)<\/(?:[^:>]+:)?name>/i);
        if (nameMatch) {
          const raw = nameMatch[1].replace(/<[^>]+>/g, '').trim();
          volcanoName = raw.replace(/\s+\d+$/, '').trim() || null;
        }
      }

      const posTag = xml.match(/<gml:pos[^>]*>([\s\S]*?)<\/gml:pos>/i);
      if (!posTag) continue;
      const parts = posTag[1].trim().split(/\s+/);
      if (parts.length < 2) continue;
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const issueTimeRaw    = iwxxmGetTag(xml, 'timePosition');
      const stateOrRegion   = iwxxmGetTag(xml, 'stateOrRegion');
      const advisoryNumber  = iwxxmGetTag(xml, 'advisoryNumber');
      const eruptionDetails = iwxxmGetTag(xml, 'eruptionDetails');

      const upperLimitMatch = xml.match(/<(?:[^:>]+:)?upperLimit\s+uom="FL"[^>]*>(\d+)<\/(?:[^:>]+:)?upperLimit>/i);
      const flValue  = upperLimitMatch ? parseInt(upperLimitMatch[1], 10) : 0;
      const flLevel  = flValue > 0 ? `FL${String(flValue).padStart(3, '0')}` : '';

      const dirMatch  = xml.match(/<(?:[^:>]+:)?directionOfMotion[^>]*>(\d+(?:\.\d+)?)<\/(?:[^:>]+:)?directionOfMotion>/i);
      const spdMatch  = xml.match(/<(?:[^:>]+:)?speedOfMotion[^>]*>(\d+(?:\.\d+)?)<\/(?:[^:>]+:)?speedOfMotion>/i);
      const direction = dirMatch ? Math.round(parseFloat(dirMatch[1])) : null;
      const speedKt   = spdMatch ? Math.round(parseFloat(spdMatch[1])) : null;

      const nextAdvisoryBlock   = xml.match(/<(?:[^:>]+:)?nextAdvisoryTime[^>]*>[\s\S]*?<\/(?:[^:>]+:)?nextAdvisoryTime>/i);
      const noFurtherAdvisory   = /NO_FURTHER_ADVISORIES|no further advisories/i.test(xml);
      const nextAdvisoryTimeStr = nextAdvisoryBlock
        ? (nextAdvisoryBlock[0].match(/<gml:timePosition[^>]*>([^<]+)<\/gml:timePosition>/i) || [])[1] || null
        : null;

      if (noFurtherAdvisory) continue;
      if (nextAdvisoryTimeStr && new Date(nextAdvisoryTimeStr) < new Date()) continue;

      const volcanoDisplay = volcanoName ?? 'Volcan inconnu';
      const flStr    = flLevel ? ` — Cendres ${flLevel}` : '';
      const motionStr = direction !== null && speedKt !== null ? ` | ${direction}° / ${speedKt} kt` : '';

      // Mapping explicite Hawaii → NTAA : les volcans hawaïens (~19°N, 155°W)
      // sont à ~4 200 km de Tahiti, hors de tout rayon de proximité standard.
      const airports = getAirportsNearCoordsWithOverride(lat, lon, 600, volcanoName);

      alerts.push({
        id:          `vaac-washington-${volcanoDisplay.replace(/\s/g, '')}-${issueTimeRaw}`,
        source:      'VAAC',
        region:      regionFromCoords(lat, lon),
        severity:    vaacSeverity(flLevel),
        phenomenon:  'Cendres volcaniques',
        country:     stateOrRegion || 'Amérique centrale',
        airports,
        lat, lon,
        validFrom:   issueTimeRaw,
        validTo:     nextAdvisoryTimeStr,
        headline:    `Avis cendres volcaniques : ${volcanoDisplay}${flStr}${motionStr} (VAAC Washington)`,
        description: [
          advisoryNumber  ? `Advisory ${advisoryNumber}` : '',
          eruptionDetails,
          flLevel         ? `Niveau : ${flLevel}` : '',
          direction !== null ? `Direction : ${direction}°` : '',
          speedKt   !== null ? `Vitesse : ${speedKt} kt` : '',
        ].filter(Boolean).join(' — ').slice(0, 500),
        link:        xmlLinks[i],
        eventType:   'VAAC',
        ...(volcanoName ? { volcanoName } : {}),
      });
    }
  } catch (e) {
    console.error('[VAAC Washington]', e);
  }
  return alerts;
}

// ─── VAAC Tokyo — scraping dédié ──────────────────────────────────────────────────────────────
// La JMA publie ses advisories sur https://www.data.jma.go.jp/vaac/data/vaac_list.html
// sous forme d'un tableau de liens "Text". Chaque lien pointe vers un fichier texte brut
// contenant le corps de l'advisory. Les advisories JMA ne comportent pas systématiquement
// de polygone ashCloudExtent, donc le filtre hasAshCloudExtent est désactivé pour Tokyo.
const VAAC_TOKYO_LIST = 'https://www.data.jma.go.jp/vaac/data/vaac_list.html';
const VAAC_TOKYO_BASE = 'https://www.data.jma.go.jp';

/** Parse une page HTML d'advisory JMA et retourne une Alert.
 *  Format PSN JMA : N5639 E16122 (degrés-minutes compacts, sans espace interne).
 *  Filtre les advisories "NO FURTHER ADVISORIES" (cendres non détectées).
 */
function parseVAACTokyoText(text: string, fileUrl: string): Alert | null {
  try {
    // Dépouiller le HTML : balises, entités, retours chariot
    const clean = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ');

    // Ignorer les advisories sans cendres détectables
    if (/NO FURTHER ADVISORIES/i.test(clean)) return null;
    // Ignorer si les cendres ne sont pas identifiables satellite
    if (/VA NOT IDENTIFIABLE FM SATELLITE/i.test(clean)) return null;

    const get = (tag: string) =>
      clean.match(new RegExp(`${tag}[:\\s]+([^\\n]{2,80})`, 'i'))?.[1]?.trim() ?? '';

    const volcanoRaw = get('VOLCANO');
    // Nettoyer le suffixe numérique (ex: "SHEVELUCH 300270" → "SHEVELUCH")
    const volcano = volcanoRaw
      ? volcanoRaw.replace(/\s+\d{6}$/, '').trim() || null
      : null;

    const dtg  = get('DTG');
    const psn  = get('PSN');
    const area = get('AREA') || 'Asie';

    const flLevel  = vaacParseFlLevel(clean);
    const severity = vaacSeverity(flLevel);

    // Format PSN JMA : N5639 E16122 (DDMM compact, sans espace dans le groupe)
    // Aussi accepté : N 56.39 E 161.22 (décimal avec espace)
    function parsePSN(s: string): { lat: number; lon: number } | null {
      // Degré-minute compact : N5639 E16122 ou S0215 W07834
      const dm = s.match(/([NS])(\d{2})(\d{2})\s+([EW])(\d{2,3})(\d{2})/i);
      if (dm) {
        return {
          lat: (parseInt(dm[2]) + parseInt(dm[3]) / 60) * (dm[1].toUpperCase() === 'S' ? -1 : 1),
          lon: (parseInt(dm[5]) + parseInt(dm[6]) / 60) * (dm[4].toUpperCase() === 'W' ? -1 : 1),
        };
      }
      // Décimal : N 56.39 E 161.22 ou N56.39 E161.22
      return vaacParseVolcanoCoords(s);
    }

    const coords = parsePSN(psn) ?? parsePSN(clean);

    const volcanoDisplay = volcano ?? 'Volcan inconnu';
    const airports = coords != null
      ? getAirportsNearCoordsWithOverride(coords.lat, coords.lon, 800, volcano)
      : [];

    // Description : extraire les lignes utiles
    const descLines = clean
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^(FVFE|Tokyo VAAC|Volcanic Ash Advisory|Back to)/i.test(l));
    const description = descLines.slice(0, 12).join(' | ').slice(0, 500);

    return {
      id:          `VAAC-Tokyo-${volcanoDisplay.replace(/\s+/g, '_')}-${dtg || Date.now()}`,
      source:      'VAAC',
      region:      'ASIE',
      severity,
      phenomenon:  'Cendres volcaniques',
      country:     area,
      airports,
      ...(coords != null ? { lat: coords.lat, lon: coords.lon } : {}),
      validFrom:   new Date().toISOString(),
      validTo:     null,
      headline:    `Cendres volcaniques — ${volcanoDisplay}${flLevel ? ' ' + flLevel : ''} (VAAC Tokyo)`,
      description,
      link:        fileUrl,
      eventType:   'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    };
  } catch {
    return null;
  }
}

async function fetchVAACTokyo(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    // 1. Récupérer la page liste
    const listRes = await fetch(VAAC_TOKYO_LIST, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!listRes.ok) {
      console.warn(`[VAAC Tokyo] listing HTTP ${listRes.status}`);
      return alerts;
    }

    const html = await listRes.text();

    // 2. Extraire les liens "Text" des advisories récents (< 24h)
    // Format réel JMA : liens en _Text.html, date dans la première <td> de chaque ligne
    // ex: <td>2026/03/12 07:15:00</td> ... href="/vaac/data/TextData/2026/20260312_..._Text.html"
    const now = Date.now();
    const maxAge = 24 * 3600 * 1000;
    const textLinks: string[] = [];

    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const row = rowMatch[1];
      const linkMatch = row.match(/href="([^"]*_Text\.html)"/i);
      if (!linkMatch) continue;
      const href = linkMatch[1];

      // Date dans la première <td> : "2026/03/12 07:15:00"
      const dateMatch = row.match(/<td[^>]*>\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s*<\/td>/i);
      if (dateMatch) {
        const iso = dateMatch[1].replace(/\//g, '-').replace(' ', 'T') + 'Z';
        const rowDate = new Date(iso).getTime();
        if (!isNaN(rowDate) && now - rowDate > maxAge) continue;
      }

      const fullUrl = href.startsWith('http')
        ? href
        : `${VAAC_TOKYO_BASE}${href.startsWith('/') ? '' : '/'}${href}`;
      if (!textLinks.includes(fullUrl)) textLinks.push(fullUrl);
    }

    if (textLinks.length === 0) {
      console.log('[VAAC Tokyo] Aucun advisory récent (< 24h)');
      return alerts;
    }

    // 3. Fetcher chaque fichier texte en parallèle
    const fileResults = await Promise.allSettled(
      textLinks.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
          signal:  AbortSignal.timeout(8000),
        }).then(r => r.ok ? r.text() : Promise.reject(r.status))
      )
    );

    for (let i = 0; i < fileResults.length; i++) {
      const res = fileResults[i];
      if (res.status !== 'fulfilled') continue;
      const alert = parseVAACTokyoText(res.value, textLinks[i]);
      if (alert) alerts.push(alert);
    }

    console.log(`[VAAC Tokyo] ${alerts.length}/${textLinks.length} advisory(ies) parsé(s)`);
  } catch (e) {
    console.warn('[VAAC Tokyo]', e instanceof Error ? e.message : e);
  }
  return alerts;
}

export async function fetchVAAC(): Promise<Alert[]> {
  const results = await Promise.allSettled([
    fetchVAACWashington(),
    fetchVAACHtml('Anchorage', 'https://www.weather.gov/vaac/VA_advisories', 'AMN'),
    fetchVAACHtml('Montreal', 'https://weather.gc.ca/eer/vaac/index_e.html', 'AMN'),
    fetchVAACHtml('Buenos Aires', 'https://www.ssd.noaa.gov/VAAC/OTH/BA/messages.html', 'AMS'),
    fetchVAACHtml('London',   'https://www.ssd.noaa.gov/VAAC/OTH/UK/messages.html',             'EUR'),
    fetchVAACRss('Toulouse',  'https://vaac.meteo.fr/rss/vaac_feed.rss',                         'EUR'),
    fetchVAACTokyo(),
    fetchVAACHtml('Darwin',   'http://www.bom.gov.au/aviation/volcanic-ash/',                    'ASIE'),
    fetchVAACHtml('Wellington','http://vaac.metservice.com/',                                    'PAC'),
  ]);

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ─── SWPC (NOAA Space Weather) ────────────────────────────────────────────────────────────────
// Alertes impactant l'aviation : GNSS/GPS, Communications HF/SATCOM, Radiations équipages
//
// Seuils retenus (NOAA scales) :
//   GNSS      → tempête géomagnétique G3+ (Kp≥7) : dégradation GPS sévère
//   HF/SATCOM → radio blackout R3+ (éruption ≥X1) : coupure HF sur face illuminée du globe
//   Radiation → S3+ proton storm (≥10³ pfu) : dose équipages significative routes polaires
//
// Niveaux 1 et 2 ignorés — impact opérationnel insuffisant pour l'aviation commerciale.
//
// product_id mappings SWPC :
//   K07W/K07A/K08W… → géomagnétique G3+ (Kp≥7)
//   A40F/A50F/A99F  → Watch géomagnétique G3+
//   XRA             → X-Ray / flare (R-scale)
//   P11W/P11A…      → Proton storm (S-scale)

type SwpcCategory = 'GNSS' | 'HF_SATCOM' | 'RADIATION';

interface SwpcRule {
  match: (productId: string, message: string) => boolean;
  category: SwpcCategory;
  phenomenon: string;
  severity: (message: string) => Severity;
  headline: (message: string) => string;
}

// Extrait le niveau G/R/S depuis le message (ex: "G3 - Strong" → 3)
function swpcScale(msg: string, letter: 'G' | 'R' | 'S'): number {
  const m = msg.match(new RegExp(`${letter}(\\d)\\s*[-–]`, 'i'));
  return m ? parseInt(m[1], 10) : 0;
}

// Extrait la date "Valid From" ou "Begin Time" du message SWPC
function swpcValidFrom(msg: string): string {
  const m = msg.match(/(?:Valid From|Begin Time|Threshold Reached)[:\s]+([\w\s:]+UTC)/i);
  if (m) {
    const d = new Date(m[1].trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

// Extrait la date de fin du message SWPC.
// Reconnait : "Valid To", "Now Valid Until" (Watches/Warnings)
// et "End Time" (messages SUMMARY de type XRA/flare).
function swpcValidTo(msg: string): string | null {
  const m = msg.match(/(?:Valid To|Now Valid Until|End Time)[:\s]+([\w\s:]+UTC)/i);
  if (m) {
    const d = new Date(m[1].trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

const SWPC_RULES: SwpcRule[] = [
  // ── Tempête géomagnétique G3+ → impact GNSS sévère ──────────────────────
  {
    match: (id, msg) => {
      if (/^K(0[7-9]|[1-9]\d)[WA]$/i.test(id)) return true;
      if (/^A[4-9]\dF$/i.test(id)) return true;
      if (swpcScale(msg, 'G') >= 3) return true;
      return false;
    },
    category: 'GNSS',
    phenomenon: 'Perturbation GNSS/GPS',
    severity: (msg) => {
      const g = swpcScale(msg, 'G');
      if (g >= 4) return 'red';
      return 'orange';
    },
    headline: (msg) => {
      const g = swpcScale(msg, 'G');
      const label = g >= 5 ? 'G5 Extrême' : g === 4 ? 'G4 Sévère' : 'G3 Fort';
      return `Tempête géomagnétique ${label} — Perturbations GNSS/GPS sévères`;
    },
  },

  // ── Radio blackout R3+ (flare ≥X1) → coupure HF/SATCOM ─────────────────
  {
    match: (id, msg) => {
      if (/^XRA$/i.test(id)) return true;
      if (swpcScale(msg, 'R') >= 3) return true;
      return false;
    },
    category: 'HF_SATCOM',
    phenomenon: 'Radio Blackout HF',
    severity: (msg) => {
      const r = swpcScale(msg, 'R');
      if (r >= 4) return 'red';
      return 'orange';
    },
    headline: (msg) => {
      const r = swpcScale(msg, 'R');
      const label = r >= 5 ? 'R5 Extrême' : r === 4 ? 'R4 Sévère' : 'R3 Fort';
      return `Radio Blackout ${label} — Coupure HF/SATCOM sur face illuminée`;
    },
  },

  // ── Radiation storm S3+ → dose équipages routes polaires ────────────────
  {
    match: (id, msg) => {
      if (/^P1[01][WA]$/i.test(id)) return true;
      if (swpcScale(msg, 'S') >= 3) return true;
      return false;
    },
    category: 'RADIATION',
    phenomenon: 'Radiation Storm',
    severity: (msg) => {
      const s = swpcScale(msg, 'S');
      if (s >= 4) return 'red';
      return 'orange';
    },
    headline: (msg) => {
      const s = swpcScale(msg, 'S');
      const label = s >= 5 ? 'S5 Extrême' : s === 4 ? 'S4 Sévère' : 'S3 Fort';
      return `Radiation Storm ${label} — Évitement routes polaires recommandé`;
    },
  },
];

export async function fetchSWPC(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/alerts.json', {
      headers: {
        'User-Agent': 'SkyWatch/1.0 (aviation alerts)',
        'Accept':     'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[SWPC] HTTP', res.status); return alerts; }

    const json: Array<{ product_id: string; issue_datetime: string; message: string }> = await res.json();

    const seen = new Set<SwpcCategory>();

    for (const item of json) {
      const { product_id, issue_datetime, message } = item;

      for (const rule of SWPC_RULES) {
        if (seen.has(rule.category)) continue;
        if (!rule.match(product_id, message)) continue;

        const validTo = swpcValidTo(message);
        if (validTo && new Date(validTo) < new Date()) continue;

        const severity  = rule.severity(message);
        const validFrom = swpcValidFrom(message);

        const descLines = message
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('Space Weather') && !l.startsWith('NOAA Space'));
        const description = descLines.slice(0, 6).join(' — ').slice(0, 500);

        alerts.push({
          id:          `SWPC-${rule.category}-${issue_datetime}`,
          source:      'SWPC',
          region:      'GLOBAL',
          severity,
          phenomenon:  rule.phenomenon,
          eventType:   `SWPC_${rule.category}`,
          country:     'Global',
          airports:    [],
          validFrom,
          validTo,
          headline:    rule.headline(message),
          description,
          link:        'https://www.swpc.noaa.gov/communities/aviation-community-dashboard',
        });

        seen.add(rule.category);
        break;
      }

      if (seen.size === SWPC_RULES.length) break;
    }

    console.log(`[SWPC] ${alerts.length} alerte(s) space weather active(s)`);
  } catch (e) {
    console.error('[SWPC]', e);
  }
  return alerts;
}

// ─── MeteoAlarm ───────────────────────────────────────────────────────────────────────────────────
const AWT_LABEL: Record<number, string> = {
  1: 'Vent violent', 2: 'Neige / Verglas', 3: 'Orage', 4: 'Brouillard',
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
        return m ? stripCdata(m[1]).trim() : '';
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
