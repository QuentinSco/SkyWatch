/**
 * Source unique de vérité pour les aéroports AF desservis.
 *
 * lc = true  → escale Long-Courrier AF
 *              Utilisé pour : alertes météo page d'accueil, trame briefing CCO
 * lc = false → escale Court/Moyen-Courrier (outil vent de travers uniquement)
 */
export interface AirportEntry {
  icao:  string;
  lat:   number;
  lon:   number;
  iso3:  string;
  name:  string;
  lc:    boolean;
}

export const AIRPORTS: AirportEntry[] = [
  // ── France – LC ──────────────────────────────────────────────────────────
  { icao: 'LFPG', lat:  49.0128, lon:   2.5500, iso3: 'FRA', name: 'Paris CDG',           lc: true  },
  { icao: 'LFPO', lat:  48.7233, lon:   2.3794, iso3: 'FRA', name: 'Paris Orly',          lc: true  },
  // ── France – MC (outil crosswind uniquement) ──────────────────────────────
  { icao: 'LFLL', lat:  45.7256, lon:   5.0811, iso3: 'FRA', name: 'Lyon Saint-Exupéry',  lc: false },
  { icao: 'LFMN', lat:  43.6584, lon:   7.2159, iso3: 'FRA', name: 'Nice',                lc: false },
  { icao: 'LFBO', lat:  43.6293, lon:   1.3678, iso3: 'FRA', name: 'Toulouse',            lc: false },
  { icao: 'LFRS', lat:  47.1532, lon:  -1.6108, iso3: 'FRA', name: 'Nantes',              lc: false },
  { icao: 'LFRB', lat:  48.4479, lon:  -4.4185, iso3: 'FRA', name: 'Brest',               lc: false },
  { icao: 'LFRN', lat:  48.0695, lon:  -1.7348, iso3: 'FRA', name: 'Rennes',              lc: false },
  { icao: 'LFML', lat:  43.4393, lon:   5.2214, iso3: 'FRA', name: 'Marseille',           lc: false },
  { icao: 'LFBD', lat:  44.8283, lon:  -0.7156, iso3: 'FRA', name: 'Bordeaux',            lc: false },
  { icao: 'LFST', lat:  48.5383, lon:   7.6283, iso3: 'FRA', name: 'Strasbourg',          lc: false },
  // ── Europe – LC ──────────────────────────────────────────────────────────
  { icao: 'EDDF', lat:  50.0379, lon:   8.5622, iso3: 'DEU', name: 'Francfort',           lc: true  },
  { icao: 'EDDM', lat:  48.3537, lon:  11.7750, iso3: 'DEU', name: 'Munich',              lc: true  },
  { icao: 'EDDB', lat:  52.3667, lon:  13.5033, iso3: 'DEU', name: 'Berlin',              lc: true  },
  { icao: 'EDDH', lat:  53.6304, lon:   9.9882, iso3: 'DEU', name: 'Hambourg',            lc: true  },
  { icao: 'EHAM', lat:  52.3086, lon:   4.7639, iso3: 'NLD', name: 'Amsterdam',           lc: true  },
  { icao: 'EBBR', lat:  50.9014, lon:   4.4844, iso3: 'BEL', name: 'Bruxelles',           lc: true  },
  { icao: 'EGLL', lat:  51.4775, lon:  -0.4614, iso3: 'GBR', name: 'Londres Heathrow',    lc: true  },
  { icao: 'EGPF', lat:  55.8719, lon:  -4.4331, iso3: 'GBR', name: 'Glasgow',             lc: true  },
  { icao: 'LEMD', lat:  40.4936, lon:  -3.5668, iso3: 'ESP', name: 'Madrid',              lc: true  },
  { icao: 'LEBL', lat:  41.2971, lon:   2.0785, iso3: 'ESP', name: 'Barcelone',           lc: true  },
  { icao: 'LEAL', lat:  38.2822, lon:  -0.5582, iso3: 'ESP', name: 'Alicante',            lc: true  },
  { icao: 'LEPA', lat:  39.5517, lon:   2.7388, iso3: 'ESP', name: 'Palma',               lc: true  },
  { icao: 'LIRF', lat:  41.8003, lon:  12.2389, iso3: 'ITA', name: 'Rome Fiumicino',      lc: true  },
  { icao: 'LIMC', lat:  45.6306, lon:   8.7281, iso3: 'ITA', name: 'Milan Malpensa',      lc: true  },
  { icao: 'LIPZ', lat:  45.5053, lon:  12.3519, iso3: 'ITA', name: 'Venise',              lc: true  },
  { icao: 'LSZH', lat:  47.4647, lon:   8.5492, iso3: 'CHE', name: 'Zurich',              lc: true  },
  { icao: 'LSGG', lat:  46.2380, lon:   6.1089, iso3: 'CHE', name: 'Genève',              lc: true  },
  { icao: 'LPPT', lat:  38.7813, lon:  -9.1359, iso3: 'PRT', name: 'Lisbonne',            lc: true  },
  { icao: 'LPFR', lat:  37.0144, lon:  -7.9659, iso3: 'PRT', name: 'Faro',               lc: true  },
  { icao: 'LGAV', lat:  37.9364, lon:  23.9445, iso3: 'GRC', name: 'Athènes',             lc: true  },
  { icao: 'ESSA', lat:  59.6519, lon:  17.9186, iso3: 'SWE', name: 'Stockholm',           lc: true  },
  { icao: 'ENGM', lat:  60.1939, lon:  11.1004, iso3: 'NOR', name: 'Oslo',                lc: true  },
  { icao: 'EKCH', lat:  55.6181, lon:  12.6561, iso3: 'DNK', name: 'Copenhague',          lc: true  },
  { icao: 'EFHK', lat:  60.3172, lon:  24.9633, iso3: 'FIN', name: 'Helsinki',            lc: true  },
  { icao: 'LOWW', lat:  48.1103, lon:  16.5697, iso3: 'AUT', name: 'Vienne',              lc: true  },
  { icao: 'EPWA', lat:  52.1657, lon:  20.9671, iso3: 'POL', name: 'Varsovie',            lc: true  },
  { icao: 'LKPR', lat:  50.1008, lon:  14.2600, iso3: 'CZE', name: 'Prague',              lc: true  },
  { icao: 'LHBP', lat:  47.4369, lon:  19.2556, iso3: 'HUN', name: 'Budapest',            lc: true  },
  { icao: 'LROP', lat:  44.5722, lon:  26.1022, iso3: 'ROU', name: 'Bucarest',            lc: true  },
  // ── Amérique du Nord – LC ─────────────────────────────────────────────────
  { icao: 'KJFK', lat:  40.6413, lon: -73.7781, iso3: 'USA', name: 'New York JFK',        lc: true  },
  { icao: 'KEWR', lat:  40.6895, lon: -74.1745, iso3: 'USA', name: 'New York Newark',     lc: true  },
  { icao: 'KBOS', lat:  42.3656, lon: -71.0096, iso3: 'USA', name: 'Boston',              lc: true  },
  { icao: 'KORD', lat:  41.9742, lon: -87.9073, iso3: 'USA', name: 'Chicago',             lc: true  },
  { icao: 'KLAX', lat:  33.9425, lon:-118.4081, iso3: 'USA', name: 'Los Angeles',         lc: true  },
  { icao: 'KSFO', lat:  37.6213, lon:-122.3790, iso3: 'USA', name: 'San Francisco',       lc: true  },
  { icao: 'KMIA', lat:  25.7959, lon: -80.2870, iso3: 'USA', name: 'Miami',               lc: true  },
  { icao: 'KIAD', lat:  38.9531, lon: -77.4565, iso3: 'USA', name: 'Washington Dulles',   lc: true  },
  { icao: 'KATL', lat:  33.6367, lon: -84.4281, iso3: 'USA', name: 'Atlanta',             lc: true  },
  { icao: 'KSEA', lat:  47.4502, lon:-122.3088, iso3: 'USA', name: 'Seattle',             lc: true  },
  { icao: 'KPDX', lat:  45.5898, lon:-122.5951, iso3: 'USA', name: 'Portland',            lc: true  },
  { icao: 'KBWI', lat:  39.1754, lon: -76.6683, iso3: 'USA', name: 'Baltimore',           lc: true  },
  { icao: 'KDEN', lat:  39.8561, lon:-104.6737, iso3: 'USA', name: 'Denver',              lc: true  },
  { icao: 'KIAH', lat:  29.9902, lon: -95.3368, iso3: 'USA', name: 'Houston',             lc: true  },
  { icao: 'KMSP', lat:  44.8848, lon: -93.2223, iso3: 'USA', name: 'Minneapolis',         lc: true  },
  { icao: 'PHOG', lat:  20.8986, lon:-156.4305, iso3: 'USA', name: 'Maui (Kahului)',      lc: true  },
  { icao: 'PHNL', lat:  21.3187, lon:-157.9224, iso3: 'USA', name: 'Honolulu',            lc: true  },
  // ── Amérique du Sud / Centrale – LC ──────────────────────────────────────
  { icao: 'SBGR', lat: -23.4356, lon: -46.4731, iso3: 'BRA', name: 'São Paulo',           lc: true  },
  { icao: 'SCEL', lat: -33.3930, lon: -70.7858, iso3: 'CHL', name: 'Santiago',            lc: true  },
  { icao: 'MMMX', lat:  19.4363, lon: -99.0721, iso3: 'MEX', name: 'Mexico',              lc: true  },
  // ── Caraïbes / DOM – LC ───────────────────────────────────────────────────
  { icao: 'TFFR', lat:  16.2653, lon: -61.5272, iso3: 'GLP', name: 'Pointe-à-Pitre',     lc: true  },
  { icao: 'TFFF', lat:  14.5910, lon: -61.0032, iso3: 'MTQ', name: 'Fort-de-France',      lc: true  },
  { icao: 'SOCA', lat:   4.8221, lon: -52.3676, iso3: 'GUF', name: 'Cayenne',             lc: true  },
  // ── Pacifique / DOM – LC ──────────────────────────────────────────────────
  { icao: 'NTAA', lat: -17.5534, lon:-149.6066, iso3: 'PYF', name: 'Papeete Tahiti',      lc: true  },
  // ── Océan Indien / Afrique australe – LC ─────────────────────────────────
  { icao: 'FMEE', lat: -20.8871, lon:  55.5116, iso3: 'REU', name: 'La Réunion',          lc: true  },
  { icao: 'FMCH', lat: -11.5337, lon:  43.2719, iso3: 'COM', name: 'Moroni',              lc: true  },
  { icao: 'FMMI', lat: -18.7969, lon:  47.4788, iso3: 'MDG', name: 'Antananarivo',        lc: true  },
  { icao: 'FIMP', lat: -20.4302, lon:  57.6836, iso3: 'MUS', name: 'Mauritius',           lc: true  },
  // ── Afrique du Nord – LC ─────────────────────────────────────────────────
  { icao: 'DAAG', lat:  36.6910, lon:   3.2154, iso3: 'DZA', name: 'Alger',              lc: true  },
  { icao: 'DTTA', lat:  36.8510, lon:  10.2272, iso3: 'TUN', name: 'Tunis',               lc: true  },
  { icao: 'GMMN', lat:  33.3675, lon:  -7.5898, iso3: 'MAR', name: 'Casablanca',          lc: true  },
  // ── Afrique sub-saharienne / Ouest – LC ──────────────────────────────────
  { icao: 'GOBD', lat:  14.6704, lon: -17.0726, iso3: 'SEN', name: 'Dakar',               lc: true  },
  { icao: 'DIAP', lat:   5.2614, lon:  -3.9263, iso3: 'CIV', name: 'Abidjan',             lc: true  },
  { icao: 'DNMM', lat:   6.5774, lon:   3.3215, iso3: 'NGA', name: 'Lagos',               lc: true  },
  { icao: 'FOOL', lat:   0.4586, lon:   9.4123, iso3: 'GAB', name: 'Libreville',          lc: true  },
  { icao: 'FCBB', lat:  -4.2517, lon:  15.2531, iso3: 'COG', name: 'Brazzaville',         lc: true  },
  // ── Afrique de l'Est – LC ─────────────────────────────────────────────────
  { icao: 'HTDA', lat:  -6.8781, lon:  39.2026, iso3: 'TZA', name: 'Dar es Salaam',       lc: true  },
  { icao: 'HAAB', lat:   8.9779, lon:  38.7993, iso3: 'ETH', name: 'Addis Abeba',         lc: true  },
  // ── Moyen-Orient – LC ────────────────────────────────────────────────────
  { icao: 'OMDB', lat:  25.2528, lon:  55.3644, iso3: 'ARE', name: 'Dubaï',               lc: true  },
  { icao: 'OERK', lat:  24.9576, lon:  46.6988, iso3: 'SAU', name: 'Riyad',               lc: true  },
  // ── Asie – LC ─────────────────────────────────────────────────────────────
  { icao: 'VHHH', lat:  22.3080, lon: 113.9185, iso3: 'HKG', name: 'Hong Kong',           lc: true  },
  { icao: 'RJTT', lat:  35.5494, lon: 139.7798, iso3: 'JPN', name: 'Tokyo',               lc: true  },
  { icao: 'RJBB', lat:  34.4347, lon: 135.2440, iso3: 'JPN', name: 'Osaka Kansai',        lc: true  },
  { icao: 'RKSI', lat:  37.4691, lon: 126.4510, iso3: 'KOR', name: 'Séoul Incheon',       lc: true  },
  { icao: 'RPLL', lat:  14.5086, lon: 121.0197, iso3: 'PHL', name: 'Manila',              lc: true  },
  { icao: 'WSSS', lat:   1.3644, lon: 103.9915, iso3: 'SGP', name: 'Singapour',           lc: true  },
  { icao: 'ZBAA', lat:  40.0801, lon: 116.5846, iso3: 'CHN', name: 'Pékin',               lc: true  },
  { icao: 'ZSPD', lat:  31.1434, lon: 121.8052, iso3: 'CHN', name: 'Shanghai',            lc: true  },
  { icao: 'VABB', lat:  19.0896, lon:  72.8656, iso3: 'IND', name: 'Mumbai',              lc: true  },
  { icao: 'VIDP', lat:  28.5562, lon:  77.1000, iso3: 'IND', name: 'Delhi',               lc: true  },
];

/** Escales LC uniquement — utilisé pour les alertes météo et le briefing CCO */
export const LC_AIRPORTS = AIRPORTS.filter(a => a.lc);
