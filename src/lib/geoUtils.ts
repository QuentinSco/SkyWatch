// ─── Shared geo utilities (used by alertsServer + launchParser) ───────────────

export interface Alert {
  id: string;
  source: string;
  region: string;
  severity: 'red' | 'orange' | 'yellow';
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

export const AF_AIRPORTS = [
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
  { icao: 'NTAA', lat: -17.5534, lon:-149.6069, iso3: 'PYF', name: 'Papeete Tahiti' },
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
  { icao: 'RJTT', lat: 35.5494,  lon: 139.7798, iso3: 'JPN', name: 'Tokyo Haneda' },
  { icao: 'RJBB', lat: 34.4272,  lon: 135.2440, iso3: 'JPN', name: 'Osaka Kansai' },
  { icao: 'RKSI', lat: 37.4692,  lon: 126.4505, iso3: 'KOR', name: 'Séoul Incheon' },
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

export function getAirportsNearCoords(lat: number, lon: number, radiusKm = 400): string[] {
  return AF_AIRPORTS
    .filter(a => haversineKm(lat, lon, a.lat, a.lon) <= radiusKm)
    .map(a => a.icao);
}

export function regionFromCoords(lat: number, lon: number): string {
  if (lon > 60) return 'ASIE';
  if (lon > 20 && lat < 40) return 'AFR';
  if (lon > -20 && lat < 40) return 'AFR';
  if (lon < -30 && lat > 20) return 'AMN';
  if (lon < -30 && lat <= 20) return 'AMS';
  return 'EUR';
}
