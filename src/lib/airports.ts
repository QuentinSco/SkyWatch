/**
 * Source unique de vérité pour les aéroports AF desservis.
 *
 * lc   = true  → escale Long-Courrier AF
 *               Utilisé pour : alertes météo page d'accueil, trame briefing CCO
 * lc   = false → escale Court/Moyen-Courrier (outil vent de travers uniquement)
 *
 * iata  → code IATA (requis pour l'outil vent de travers)
 * qfu   → QFU des pistes en service (nord magnétique, dizaine sans le zéro final)
 * decl  → déclinaison magnétique en degrés (est = +, ouest = −)
 *         Source : NOAA World Magnetic Model 2025 — arrondi à l'entier le plus proche
 *         Formule : vent_magnétique = vent_vrai (TAF) − déclinaison
 */
export interface AirportEntry {
  icao:  string;
  iata:  string;
  lat:   number;
  lon:   number;
  iso3:  string;
  name:  string;
  lc:    boolean;
  qfu:   number[];   // QFU des pistes (magnétique, valeur 1-36)
  decl:  number;     // Déclinaison magnétique (° est = +, ouest = −)
}

export const AIRPORTS: AirportEntry[] = [
  // ── France – LC ──────────────────────────────────────────────────────────
  { icao: 'LFPG', iata: 'CDG', lat:  49.0128, lon:   2.5500, iso3: 'FRA', name: 'Paris CDG',           lc: true,  qfu: [8, 26, 9, 27],          decl:  0 },
  { icao: 'LFPO', iata: 'ORY', lat:  48.7233, lon:   2.3794, iso3: 'FRA', name: 'Paris Orly',          lc: true,  qfu: [2, 20, 6, 24, 7, 25],   decl:  0 },
  // ── France – MC (outil crosswind uniquement) ──────────────────────────────
  { icao: 'LFLL', iata: 'LYS', lat:  45.7256, lon:   5.0811, iso3: 'FRA', name: 'Lyon Saint-Exupéry',  lc: false, qfu: [17, 35],                 decl: +1 },
  { icao: 'LFMN', iata: 'NCE', lat:  43.6584, lon:   7.2159, iso3: 'FRA', name: 'Nice',                lc: false, qfu: [4, 22],                  decl: +2 },
  { icao: 'LFBO', iata: 'TLS', lat:  43.6293, lon:   1.3678, iso3: 'FRA', name: 'Toulouse',            lc: false, qfu: [14, 32],                 decl:  0 },
  { icao: 'LFRS', iata: 'NTE', lat:  47.1532, lon:  -1.6108, iso3: 'FRA', name: 'Nantes',              lc: false, qfu: [3, 21],                  decl: -1 },
  { icao: 'LFRB', iata: 'BES', lat:  48.4479, lon:  -4.4185, iso3: 'FRA', name: 'Brest',               lc: false, qfu: [7, 25],                  decl: -2 },
  { icao: 'LFRN', iata: 'RNS', lat:  48.0695, lon:  -1.7348, iso3: 'FRA', name: 'Rennes',              lc: false, qfu: [10, 28],                 decl: -2 },
  { icao: 'LFML', iata: 'MRS', lat:  43.4393, lon:   5.2214, iso3: 'FRA', name: 'Marseille',           lc: false, qfu: [13, 31],                 decl: +1 },
  { icao: 'LFBD', iata: 'BOD', lat:  44.8283, lon:  -0.7156, iso3: 'FRA', name: 'Bordeaux',            lc: false, qfu: [5, 23, 11, 29],          decl: -1 },
  { icao: 'LFST', iata: 'SXB', lat:  48.5383, lon:   7.6283, iso3: 'FRA', name: 'Strasbourg',          lc: false, qfu: [5, 23],                  decl: +2 },
  // ── France – autres MC ──────────────────────────────────────────────────
  { icao: 'LFBP', iata: 'PUF', lat:  43.3800, lon:  -0.4186, iso3: 'FRA', name: 'Pau',                 lc: false, qfu: [13, 31],                 decl:  0 },
  { icao: 'LFBT', iata: 'LDE', lat:  43.1868, lon:  -0.0064, iso3: 'FRA', name: 'Lourdes-Tarbes',      lc: false, qfu: [2, 20],                  decl:  0 },
  { icao: 'LFBZ', iata: 'BIQ', lat:  43.4683, lon:  -1.5231, iso3: 'FRA', name: 'Biarritz',            lc: false, qfu: [9, 27],                  decl: -1 },
  { icao: 'LFKB', iata: 'BIA', lat:  42.5527, lon:   9.4837, iso3: 'FRA', name: 'Bastia',              lc: false, qfu: [16, 34],                 decl: +2 },
  { icao: 'LFKC', iata: 'CLY', lat:  42.5244, lon:   8.7932, iso3: 'FRA', name: 'Calvi',               lc: false, qfu: [18, 36],                 decl: +2 },
  { icao: 'LFKJ', iata: 'AJA', lat:  41.9236, lon:   8.8029, iso3: 'FRA', name: 'Ajaccio',             lc: false, qfu: [2, 20],                  decl: +2 },
  { icao: 'LFKS', iata: 'FSC', lat:  41.5006, lon:   9.0978, iso3: 'FRA', name: 'Figari',              lc: false, qfu: [18, 36],                 decl: +2 },
  { icao: 'LFLC', iata: 'CFE', lat:  45.7867, lon:   3.1692, iso3: 'FRA', name: 'Clermont-Ferrand',    lc: false, qfu: [8, 26],                  decl: +1 },
  { icao: 'LFMT', iata: 'MPL', lat:  43.5762, lon:   3.9630, iso3: 'FRA', name: 'Montpellier',         lc: false, qfu: [12, 30],                 decl: +1 },
  { icao: 'LFQQ', iata: 'LIL', lat:  50.5625, lon:   3.0869, iso3: 'FRA', name: 'Lille',               lc: false, qfu: [1, 19, 8, 26],           decl: +1 },
  { icao: 'LFRD', iata: 'DNR', lat:  48.5876, lon:  -2.0800, iso3: 'FRA', name: 'Dinard',              lc: false, qfu: [17, 35],                 decl: -2 },
  { icao: 'LFRK', iata: 'CFR', lat:  49.1733, lon:  -0.4500, iso3: 'FRA', name: 'Caen',                lc: false, qfu: [13, 31],                 decl: -1 },
  { icao: 'LFSB', iata: 'BSL', lat:  47.5896, lon:   7.5299, iso3: 'CHE', name: 'Bale-Mulhouse',       lc: false, qfu: [7, 25, 15, 33],          decl: +2 },
  // ── Europe – LC ──────────────────────────────────────────────────────────
  { icao: 'EDDF', iata: 'FRA', lat:  50.0379, lon:   8.5622, iso3: 'DEU', name: 'Francfort',           lc: true,  qfu: [7, 25, 18, 36],          decl: +3 },
  { icao: 'EDDM', iata: 'MUC', lat:  48.3537, lon:  11.7750, iso3: 'DEU', name: 'Munich',              lc: true,  qfu: [8, 26],                  decl: +3 },
  { icao: 'EDDB', iata: 'BER', lat:  52.3667, lon:  13.5033, iso3: 'DEU', name: 'Berlin',              lc: true,  qfu: [6, 24],                  decl: +4 },
  { icao: 'EDDH', iata: 'HAM', lat:  53.6304, lon:   9.9882, iso3: 'DEU', name: 'Hambourg',            lc: true,  qfu: [5, 23, 15, 33],          decl: +3 },
  { icao: 'EHAM', iata: 'AMS', lat:  52.3086, lon:   4.7639, iso3: 'NLD', name: 'Amsterdam',           lc: true,  qfu: [4, 22, 6, 24, 9, 27, 18, 36], decl: +2 },
  { icao: 'EBBR', iata: 'BRU', lat:  50.9014, lon:   4.4844, iso3: 'BEL', name: 'Bruxelles',           lc: true,  qfu: [2, 20, 7, 25],           decl: +2 },
  { icao: 'EGLL', iata: 'LHR', lat:  51.4775, lon:  -0.4614, iso3: 'GBR', name: 'Londres Heathrow',    lc: true,  qfu: [9, 27],                  decl: -1 },
  { icao: 'EGPF', iata: 'GLA', lat:  55.8719, lon:  -4.4331, iso3: 'GBR', name: 'Glasgow',             lc: true,  qfu: [5, 23, 9, 27],           decl: -2 },
  { icao: 'LEMD', iata: 'MAD', lat:  40.4936, lon:  -3.5668, iso3: 'ESP', name: 'Madrid',              lc: true,  qfu: [14, 32, 18, 36],         decl: -1 },
  { icao: 'LEBL', iata: 'BCN', lat:  41.2971, lon:   2.0785, iso3: 'ESP', name: 'Barcelone',           lc: true,  qfu: [2, 20, 6, 24],           decl: +1 },
  { icao: 'LEAL', iata: 'ALC', lat:  38.2822, lon:  -0.5582, iso3: 'ESP', name: 'Alicante',            lc: true,  qfu: [10, 28],                 decl:  0 },
  { icao: 'LEPA', iata: 'PMI', lat:  39.5517, lon:   2.7388, iso3: 'ESP', name: 'Palma',               lc: true,  qfu: [6, 24],                  decl: +1 },
  { icao: 'LIRF', iata: 'FCO', lat:  41.8003, lon:  12.2389, iso3: 'ITA', name: 'Rome Fiumicino',      lc: true,  qfu: [7, 25, 16, 34],          decl: +3 },
  { icao: 'LIMC', iata: 'MXP', lat:  45.6306, lon:   8.7281, iso3: 'ITA', name: 'Milan Malpensa',      lc: true,  qfu: [17, 35],                 decl: +3 },
  { icao: 'LIPZ', iata: 'VCE', lat:  45.5053, lon:  12.3519, iso3: 'ITA', name: 'Venise',              lc: true,  qfu: [4, 22],                  decl: +4 },
  { icao: 'LSZH', iata: 'ZRH', lat:  47.4647, lon:   8.5492, iso3: 'CHE', name: 'Zurich',              lc: true,  qfu: [10, 28, 14, 32, 16, 34], decl: +2 },
  { icao: 'LSGG', iata: 'GVA', lat:  46.2380, lon:   6.1089, iso3: 'CHE', name: 'Genève',              lc: true,  qfu: [4, 22],                  decl: +2 },
  { icao: 'LPPT', iata: 'LIS', lat:  38.7813, lon:  -9.1359, iso3: 'PRT', name: 'Lisbonne',            lc: true,  qfu: [2, 20],                  decl: -3 },
  { icao: 'LPFR', iata: 'FAO', lat:  37.0144, lon:  -7.9659, iso3: 'PRT', name: 'Faro',                lc: true,  qfu: [10, 28],                 decl: -3 },
  { icao: 'LGAV', iata: 'ATH', lat:  37.9364, lon:  23.9445, iso3: 'GRC', name: 'Athènes',             lc: true,  qfu: [3, 21],                  decl: +5 },
  { icao: 'ESSA', iata: 'ARN', lat:  59.6519, lon:  17.9186, iso3: 'SWE', name: 'Stockholm',           lc: true,  qfu: [1, 19, 8, 26],           decl: +5 },
  { icao: 'ENGM', iata: 'OSL', lat:  60.1939, lon:  11.1004, iso3: 'NOR', name: 'Oslo',                lc: true,  qfu: [1, 19],                  decl: +3 },
  { icao: 'EKCH', iata: 'CPH', lat:  55.6181, lon:  12.6561, iso3: 'DNK', name: 'Copenhague',          lc: true,  qfu: [4, 22, 12, 30],          decl: +3 },
  { icao: 'EFHK', iata: 'HEL', lat:  60.3172, lon:  24.9633, iso3: 'FIN', name: 'Helsinki',            lc: true,  qfu: [4, 22, 15, 33],          decl: +7 },
  { icao: 'LOWW', iata: 'VIE', lat:  48.1103, lon:  16.5697, iso3: 'AUT', name: 'Vienne',              lc: true,  qfu: [11, 29, 16, 34],         decl: +4 },
  { icao: 'EPWA', iata: 'WAW', lat:  52.1657, lon:  20.9671, iso3: 'POL', name: 'Varsovie',            lc: true,  qfu: [11, 29, 15, 33],         decl: +5 },
  { icao: 'LKPR', iata: 'PRG', lat:  50.1008, lon:  14.2600, iso3: 'CZE', name: 'Prague',              lc: true,  qfu: [6, 24, 12, 30],          decl: +4 },
  { icao: 'LHBP', iata: 'BUD', lat:  47.4369, lon:  19.2556, iso3: 'HUN', name: 'Budapest',            lc: true,  qfu: [13, 31],                 decl: +5 },
  { icao: 'LROP', iata: 'OTP', lat:  44.5722, lon:  26.1022, iso3: 'ROU', name: 'Bucarest',            lc: true,  qfu: [8, 26],                  decl: +6 },
  // ── Europe – autres MC ──────────────────────────────────────────────────
  { icao: 'EDDN', iata: 'NUE', lat:  49.4987, lon:  11.0669, iso3: 'DEU', name: 'Nuremberg',           lc: false, qfu: [10, 28],                 decl: +3 },
  { icao: 'EDDS', iata: 'STR', lat:  48.6899, lon:   9.2220, iso3: 'DEU', name: 'Stuttgart',           lc: false, qfu: [7, 25],                  decl: +3 },
  { icao: 'EDDL', iata: 'DUS', lat:  51.2895, lon:   6.7668, iso3: 'DEU', name: 'Dusseldorf',          lc: false, qfu: [5, 23],                  decl: +2 },
  { icao: 'EDDV', iata: 'HAJ', lat:  52.4611, lon:   9.6850, iso3: 'DEU', name: 'Hanovre',             lc: false, qfu: [9, 27],                  decl: +3 },
  { icao: 'EFKT', iata: 'KTT', lat:  67.7010, lon:  24.8468, iso3: 'FIN', name: 'Kittila',             lc: false, qfu: [16, 34],                 decl: +9 },
  { icao: 'EFRO', iata: 'RVN', lat:  66.5648, lon:  25.8304, iso3: 'FIN', name: 'Rovaniemi',           lc: false, qfu: [3, 21],                  decl: +9 },
  { icao: 'EGBB', iata: 'BHX', lat:  52.4539, lon:  -1.7480, iso3: 'GBR', name: 'Birmingham',         lc: false, qfu: [15, 33],                 decl: -1 },
  { icao: 'EGCC', iata: 'MAN', lat:  53.3537, lon:  -2.2750, iso3: 'GBR', name: 'Manchester',          lc: false, qfu: [5, 23],                  decl: -1 },
  { icao: 'EGKK', iata: 'LGW', lat:  51.1537, lon:  -0.1821, iso3: 'GBR', name: 'Londres Gatwick',    lc: false, qfu: [8, 26],                  decl: -1 },
  { icao: 'EGNT', iata: 'NCL', lat:  55.0375, lon:  -1.6917, iso3: 'GBR', name: 'Newcastle',           lc: false, qfu: [7, 25],                  decl: -1 },
  { icao: 'EGPH', iata: 'EDI', lat:  55.9500, lon:  -3.3725, iso3: 'GBR', name: 'Edimbourg',           lc: false, qfu: [6, 24],                  decl: -2 },
  { icao: 'EGPK', iata: 'PIK', lat:  55.5094, lon:  -4.5869, iso3: 'GBR', name: 'Glasgow Prestwick',  lc: false, qfu: [2, 20, 12, 30],          decl: -2 },
  { icao: 'EICK', iata: 'ORK', lat:  51.8413, lon:  -8.4911, iso3: 'IRL', name: 'Cork',                lc: false, qfu: [16, 34],                 decl: -3 },
  { icao: 'EIDW', iata: 'DUB', lat:  53.4213, lon:  -6.2700, iso3: 'IRL', name: 'Dublin',              lc: false, qfu: [10, 28, 16, 34],         decl: -3 },
  { icao: 'EKBI', iata: 'BLL', lat:  55.7403, lon:   9.1519, iso3: 'DNK', name: 'Billund',             lc: false, qfu: [9, 27],                  decl: +2 },
  { icao: 'ENBR', iata: 'BGO', lat:  60.2934, lon:   5.2181, iso3: 'NOR', name: 'Bergen',              lc: false, qfu: [17, 35],                 decl: +2 },
  { icao: 'ENTC', iata: 'TOS', lat:  69.6833, lon:  18.9189, iso3: 'NOR', name: 'Tromso',              lc: false, qfu: [18, 36],                 decl: +7 },
  { icao: 'EPKK', iata: 'KRK', lat:  50.0778, lon:  19.7848, iso3: 'POL', name: 'Cracovie',            lc: false, qfu: [7, 25],                  decl: +5 },
  { icao: 'ESGG', iata: 'GOT', lat:  57.6628, lon:  12.2798, iso3: 'SWE', name: 'Goteborg',            lc: false, qfu: [3, 21],                  decl: +3 },
  { icao: 'LDDU', iata: 'DBV', lat:  42.5614, lon:  18.2681, iso3: 'HRV', name: 'Dubrovnik',           lc: false, qfu: [11, 29],                 decl: +4 },
  { icao: 'LDZA', iata: 'ZAG', lat:  45.7429, lon:  16.0688, iso3: 'HRV', name: 'Zagreb',              lc: false, qfu: [4, 22],                  decl: +4 },
  { icao: 'LEBB', iata: 'BIO', lat:  43.3011, lon:  -2.9106, iso3: 'ESP', name: 'Bilbao',              lc: false, qfu: [10, 28, 12, 30],         decl: -1 },
  { icao: 'LEIB', iata: 'IBZ', lat:  38.8729, lon:   1.3731, iso3: 'ESP', name: 'Ibiza',               lc: false, qfu: [6, 24],                  decl: +1 },
  { icao: 'LEMG', iata: 'AGP', lat:  36.6749, lon:  -4.4991, iso3: 'ESP', name: 'Malaga',              lc: false, qfu: [12, 30, 13, 31],         decl: -1 },
  { icao: 'LEVC', iata: 'VLC', lat:  39.4893, lon:  -0.4816, iso3: 'ESP', name: 'Valence',             lc: false, qfu: [12, 30],                 decl: +1 },
  { icao: 'LEZL', iata: 'SVQ', lat:  37.4180, lon:  -5.8931, iso3: 'ESP', name: 'Seville',             lc: false, qfu: [9, 27],                  decl: -2 },
  { icao: 'LGIR', iata: 'HER', lat:  35.3397, lon:  25.1803, iso3: 'GRC', name: 'Heraklion',           lc: false, qfu: [9, 27],                  decl: +5 },
  { icao: 'LGMK', iata: 'JMK', lat:  37.4351, lon:  25.3481, iso3: 'GRC', name: 'Mykonos',             lc: false, qfu: [16, 34],                 decl: +5 },
  { icao: 'LIBD', iata: 'BRI', lat:  41.1389, lon:  16.7606, iso3: 'ITA', name: 'Bari',                lc: false, qfu: [7, 25],                  decl: +4 },
  { icao: 'LICC', iata: 'CTA', lat:  37.4668, lon:  15.0664, iso3: 'ITA', name: 'Catane',              lc: false, qfu: [8, 26],                  decl: +3 },
  { icao: 'LICJ', iata: 'PMO', lat:  38.1757, lon:  13.0910, iso3: 'ITA', name: 'Palerme',             lc: false, qfu: [2, 20, 7, 25],           decl: +3 },
  { icao: 'LIEO', iata: 'OLB', lat:  40.8987, lon:   9.5176, iso3: 'ITA', name: 'Olbia',               lc: false, qfu: [5, 23],                  decl: +3 },
  { icao: 'LIMF', iata: 'TRN', lat:  45.2008, lon:   7.6497, iso3: 'ITA', name: 'Turin',               lc: false, qfu: [18, 36],                 decl: +2 },
  { icao: 'LIML', iata: 'LIN', lat:  45.4508, lon:   9.2767, iso3: 'ITA', name: 'Milan Linate',        lc: false, qfu: [17, 35],                 decl: +3 },
  { icao: 'LIPE', iata: 'BLQ', lat:  44.5354, lon:  11.2887, iso3: 'ITA', name: 'Bologne',             lc: false, qfu: [12, 30],                 decl: +3 },
  { icao: 'LIPX', iata: 'VRN', lat:  45.3957, lon:  10.8885, iso3: 'ITA', name: 'Verone',              lc: false, qfu: [4, 22],                  decl: +3 },
  { icao: 'LIRN', iata: 'NAP', lat:  40.8860, lon:  14.2908, iso3: 'ITA', name: 'Naples',              lc: false, qfu: [6, 24],                  decl: +3 },
  { icao: 'LIRQ', iata: 'FLR', lat:  43.8100, lon:  11.2051, iso3: 'ITA', name: 'Florence',            lc: false, qfu: [5, 23],                  decl: +3 },
  { icao: 'LJLJ', iata: 'LJU', lat:  46.2237, lon:  14.4576, iso3: 'SVN', name: 'Ljubljana',           lc: false, qfu: [12, 30],                 decl: +4 },
  { icao: 'LLBG', iata: 'TLV', lat:  32.0114, lon:  34.8867, iso3: 'ISR', name: 'Tel Aviv',            lc: false, qfu: [3, 21, 8, 26, 12, 30],  decl: +4 },
  { icao: 'LMML', iata: 'MLA', lat:  35.8574, lon:  14.4775, iso3: 'MLT', name: 'Malte',               lc: false, qfu: [5, 23, 13, 31],          decl: +3 },
  { icao: 'LPPR', iata: 'OPO', lat:  41.2481, lon:  -8.6814, iso3: 'PRT', name: 'Porto',               lc: false, qfu: [17, 35],                 decl: -3 },
  { icao: 'LTFM', iata: 'IST', lat:  41.2753, lon:  28.7519, iso3: 'TUR', name: 'Istanbul',            lc: false, qfu: [16, 34, 17, 35, 18, 36], decl: +5 },
  // ── Amérique du Nord – LC ─────────────────────────────────────────────────
  { icao: 'KJFK', iata: 'JFK', lat:  40.6413, lon: -73.7781, iso3: 'USA', name: 'New York JFK',        lc: true,  qfu: [4, 22, 13, 31],          decl: -13 },
  { icao: 'KEWR', iata: 'EWR', lat:  40.6895, lon: -74.1745, iso3: 'USA', name: 'New York Newark',     lc: true,  qfu: [4, 22, 11, 29],          decl: -13 },
  { icao: 'KBOS', iata: 'BOS', lat:  42.3656, lon: -71.0096, iso3: 'USA', name: 'Boston',              lc: true,  qfu: [4, 22, 9, 27, 15, 33],  decl: -14 },
  { icao: 'KORD', iata: 'ORD', lat:  41.9742, lon: -87.9073, iso3: 'USA', name: 'Chicago',             lc: true,  qfu: [4, 22, 9, 27, 10, 28],  decl:  -3 },
  { icao: 'KLAX', iata: 'LAX', lat:  33.9425, lon:-118.4081, iso3: 'USA', name: 'Los Angeles',         lc: true,  qfu: [6, 24, 7, 25],           decl: +12 },
  { icao: 'KSFO', iata: 'SFO', lat:  37.6213, lon:-122.3790, iso3: 'USA', name: 'San Francisco',       lc: true,  qfu: [1, 19, 10, 28],          decl: +13 },
  { icao: 'KMIA', iata: 'MIA', lat:  25.7959, lon: -80.2870, iso3: 'USA', name: 'Miami',               lc: true,  qfu: [8, 26, 9, 27, 12, 30],  decl:  -5 },
  { icao: 'KIAD', iata: 'IAD', lat:  38.9531, lon: -77.4565, iso3: 'USA', name: 'Washington Dulles',   lc: true,  qfu: [1, 19, 12, 30],          decl: -11 },
  { icao: 'KATL', iata: 'ATL', lat:  33.6367, lon: -84.4281, iso3: 'USA', name: 'Atlanta',             lc: true,  qfu: [8, 26, 9, 27, 10, 28],  decl:  -5 },
  { icao: 'KSEA', iata: 'SEA', lat:  47.4502, lon:-122.3088, iso3: 'USA', name: 'Seattle',             lc: true,  qfu: [16, 34],                 decl: +16 },
  { icao: 'KPDX', iata: 'PDX', lat:  45.5898, lon:-122.5951, iso3: 'USA', name: 'Portland',            lc: true,  qfu: [10, 28, 21, 3],          decl: +16 },
  { icao: 'KBWI', iata: 'BWI', lat:  39.1754, lon: -76.6683, iso3: 'USA', name: 'Baltimore',           lc: true,  qfu: [10, 28, 15, 33],         decl: -11 },
  { icao: 'KDEN', iata: 'DEN', lat:  39.8561, lon:-104.6737, iso3: 'USA', name: 'Denver',              lc: true,  qfu: [7, 25, 8, 26, 16, 34, 17, 35], decl: +8 },
  { icao: 'KIAH', iata: 'IAH', lat:  29.9902, lon: -95.3368, iso3: 'USA', name: 'Houston',             lc: true,  qfu: [8, 26, 9, 27, 15, 33],  decl:  +2 },
  { icao: 'KMSP', iata: 'MSP', lat:  44.8848, lon: -93.2223, iso3: 'USA', name: 'Minneapolis',         lc: true,  qfu: [4, 22, 12, 30, 17, 35], decl:  -3 },
  { icao: 'PHOG', iata: 'OGG', lat:  20.8986, lon:-156.4305, iso3: 'USA', name: 'Maui (Kahului)',      lc: true,  qfu: [2, 20],                  decl: +10 },
  { icao: 'PHNL', iata: 'HNL', lat:  21.3187, lon:-157.9224, iso3: 'USA', name: 'Honolulu',            lc: true,  qfu: [4, 22, 8, 26],           decl: +10 },
  // ── Amérique du Nord – autres MC ────────────────────────────────────────
  { icao: 'CYOW', iata: 'YOW', lat:  45.3225, lon: -75.6692, iso3: 'CAN', name: 'Ottawa',              lc: false, qfu: [7, 25, 14, 32],          decl: -13 },
  { icao: 'CYUL', iata: 'YUL', lat:  45.4706, lon: -73.7408, iso3: 'CAN', name: 'Montreal',            lc: false, qfu: [6, 24],                  decl: -14 },
  { icao: 'CYVR', iata: 'YVR', lat:  49.1939, lon:-123.1844, iso3: 'CAN', name: 'Vancouver',           lc: false, qfu: [8, 26, 13, 31],          decl: +18 },
  { icao: 'CYYZ', iata: 'YYZ', lat:  43.6772, lon: -79.6306, iso3: 'CAN', name: 'Toronto',             lc: false, qfu: [5, 23, 6, 24, 15, 33],  decl: -10 },
  { icao: 'KDFW', iata: 'DFW', lat:  32.8998, lon: -97.0403, iso3: 'USA', name: 'Dallas/FW',           lc: false, qfu: [13, 31, 17, 35, 18, 36], decl: +3 },
  { icao: 'KDTW', iata: 'DTW', lat:  42.2124, lon: -83.3534, iso3: 'USA', name: 'Detroit',             lc: false, qfu: [3, 21, 4, 22, 9, 27],   decl:  -7 },
  { icao: 'KLAS', iata: 'LAS', lat:  36.0840, lon:-115.1537, iso3: 'USA', name: 'Las Vegas',           lc: false, qfu: [1, 19, 8, 26],           decl: +11 },
  { icao: 'KMCO', iata: 'MCO', lat:  28.4294, lon: -81.3089, iso3: 'USA', name: 'Orlando',             lc: false, qfu: [17, 35, 18, 36],         decl:  -6 },
  { icao: 'KPHX', iata: 'PHX', lat:  33.4373, lon:-112.0078, iso3: 'USA', name: 'Phoenix',             lc: false, qfu: [7, 25, 8, 26],           decl:  +9 },
  { icao: 'KRDU', iata: 'RDU', lat:  35.8776, lon: -78.7875, iso3: 'USA', name: 'Raleigh-Durham',      lc: false, qfu: [5, 23],                  decl:  -9 },
  { icao: 'KSAN', iata: 'SAN', lat:  32.7338, lon:-117.1933, iso3: 'USA', name: 'San Diego',           lc: false, qfu: [9, 27],                  decl: +11 },
  // ── Amérique du Sud / Centrale – LC ──────────────────────────────────────
  { icao: 'SBGR', iata: 'GRU', lat: -23.4356, lon: -46.4731, iso3: 'BRA', name: 'São Paulo',           lc: true,  qfu: [10, 28],                 decl: -22 },
  { icao: 'SCEL', iata: 'SCL', lat: -33.3930, lon: -70.7858, iso3: 'CHL', name: 'Santiago',            lc: true,  qfu: [17, 35],                 decl:  -7 },
  { icao: 'MMMX', iata: 'MEX', lat:  19.4363, lon: -99.0721, iso3: 'MEX', name: 'Mexico',              lc: true,  qfu: [5, 23],                  decl:  +7 },
  // ── Amérique du Sud / Centrale – autres MC ────────────────────────────────
  { icao: 'SAEZ', iata: 'EZE', lat: -34.8222, lon: -58.5358, iso3: 'ARG', name: 'Buenos Aires',        lc: false, qfu: [11, 29, 17, 35],         decl: -10 },
  { icao: 'SBFZ', iata: 'FOR', lat:  -3.7763, lon: -38.5326, iso3: 'BRA', name: 'Fortaleza',           lc: false, qfu: [13, 31],                 decl: -21 },
  { icao: 'SBGL', iata: 'GIG', lat: -22.8099, lon: -43.2505, iso3: 'BRA', name: 'Rio de Janeiro',      lc: false, qfu: [10, 28, 15, 33],         decl: -23 },
  { icao: 'SBSV', iata: 'SSA', lat: -12.9086, lon: -38.3225, iso3: 'BRA', name: 'Salvador de Bahia',   lc: false, qfu: [10, 28],                 decl: -23 },
  { icao: 'SKBO', iata: 'BOG', lat:   4.7016, lon: -74.1469, iso3: 'COL', name: 'Bogota',              lc: false, qfu: [14, 32],                 decl:  -5 },
  { icao: 'SPIM', iata: 'LIM', lat: -12.0219, lon: -77.1143, iso3: 'PER', name: 'Lima',                lc: false, qfu: [16, 34],                 decl:  -2 },
  { icao: 'MMSM', iata: 'NLU', lat:  19.7561, lon: -99.0153, iso3: 'MEX', name: 'Mexico NLU',          lc: false, qfu: [4, 22],                  decl:  +7 },
  { icao: 'MMUN', iata: 'CUN', lat:  21.0365, lon: -86.8771, iso3: 'MEX', name: 'Cancun',              lc: false, qfu: [12, 30],                 decl:  -4 },
  { icao: 'MMGL', iata: 'GDL', lat:  20.5218, lon:-103.3111, iso3: 'MEX', name: 'Guadalajara',         lc: false, qfu: [11, 29],                 decl:  +7 },
  { icao: 'MPTO', iata: 'PTY', lat:   9.0713, lon: -79.3835, iso3: 'PAN', name: 'Panama City',         lc: false, qfu: [3, 21],                  decl:  -3 },
  { icao: 'MROC', iata: 'SJO', lat:   9.9939, lon: -84.2089, iso3: 'CRI', name: 'San Jose CR',         lc: false, qfu: [7, 25],                  decl:  -2 },
  { icao: 'MUHA', iata: 'HAV', lat:  22.9892, lon: -82.4091, iso3: 'CUB', name: 'La Havane',           lc: false, qfu: [6, 24],                  decl:  -5 },
  { icao: 'MYNN', iata: 'NAS', lat:  25.0390, lon: -77.4662, iso3: 'BHS', name: 'Nassau',              lc: false, qfu: [10, 28, 14, 32],         decl:  -5 },
  { icao: 'SBBE', iata: 'BEL', lat:  -1.3792, lon: -48.4762, iso3: 'BRA', name: 'Belem',               lc: false, qfu: [6, 24],                  decl: -21 },
  // ── Caraïbes / DOM – LC ───────────────────────────────────────────────────
  { icao: 'TFFR', iata: 'PTP', lat:  16.2653, lon: -61.5272, iso3: 'GLP', name: 'Pointe-à-Pitre',      lc: true,  qfu: [12, 30],                 decl: -13 },
  { icao: 'TFFF', iata: 'FDF', lat:  14.5910, lon: -61.0032, iso3: 'MTQ', name: 'Fort-de-France',      lc: true,  qfu: [10, 28],                 decl: -13 },
  { icao: 'SOCA', iata: 'CAY', lat:   4.8221, lon: -52.3676, iso3: 'GUF', name: 'Cayenne',             lc: true,  qfu: [8, 26],                  decl: -16 },
  // ── Caraïbes – autres MC ──────────────────────────────────────────────────
  { icao: 'MDPC', iata: 'PUJ', lat:  18.5674, lon: -68.3634, iso3: 'DOM', name: 'Punta Cana',          lc: false, qfu: [8, 26, 9, 27],           decl:  -6 },
  { icao: 'TNCM', iata: 'SXM', lat:  18.0410, lon: -63.1089, iso3: 'SXM', name: 'Sint Maarten',        lc: false, qfu: [10, 28],                 decl: -13 },
  // ── Pacifique / DOM – LC ──────────────────────────────────────────────────
  { icao: 'NTAA', iata: 'PPT', lat: -17.5534, lon:-149.6066, iso3: 'PYF', name: 'Papeete Tahiti',      lc: true,  qfu: [4, 22],                  decl: +10 },
  // ── Océan Indien / Afrique australe – LC ─────────────────────────────────
  { icao: 'FMEE', iata: 'RUN', lat: -20.8871, lon:  55.5116, iso3: 'REU', name: 'La Réunion',          lc: true,  qfu: [12, 30, 14, 32],         decl: -18 },
  { icao: 'FMCH', iata: 'HAH', lat: -11.5337, lon:  43.2719, iso3: 'COM', name: 'Moroni',              lc: true,  qfu: [6, 24],                  decl:  -9 },
  { icao: 'FMMI', iata: 'TNR', lat: -18.7969, lon:  47.4788, iso3: 'MDG', name: 'Antananarivo',        lc: true,  qfu: [11, 29],                 decl: -17 },
  { icao: 'FIMP', iata: 'MRU', lat: -20.4302, lon:  57.6836, iso3: 'MUS', name: 'Mauritius',           lc: true,  qfu: [14, 32],                 decl: -18 },
  // ── Afrique australe – autres MC ──────────────────────────────────────────
  { icao: 'FACT', iata: 'CPT', lat: -33.9648, lon:  18.6017, iso3: 'ZAF', name: 'Le Cap',              lc: false, qfu: [1, 19, 16, 34],          decl: -26 },
  { icao: 'FAOR', iata: 'JNB', lat: -26.1392, lon:  28.2460, iso3: 'ZAF', name: 'Johannesburg',        lc: false, qfu: [3, 21],                  decl: -23 },
  // ── Afrique du Nord – LC ─────────────────────────────────────────────────
  { icao: 'DAAG', iata: 'ALG', lat:  36.6910, lon:   3.2154, iso3: 'DZA', name: 'Alger',               lc: true,  qfu: [5, 23, 9, 27],           decl:  +1 },
  { icao: 'DTTA', iata: 'TUN', lat:  36.8510, lon:  10.2272, iso3: 'TUN', name: 'Tunis',               lc: true,  qfu: [1, 19, 11, 29],          decl:  +2 },
  { icao: 'GMMN', iata: 'CMN', lat:  33.3675, lon:  -7.5898, iso3: 'MAR', name: 'Casablanca',          lc: true,  qfu: [17, 35],                 decl:  -3 },
  // ── Afrique du Nord – autres MC ───────────────────────────────────────────
  { icao: 'DAOO', iata: 'ORN', lat:  35.6239, lon:  -0.6212, iso3: 'DZA', name: 'Oran',                lc: false, qfu: [7, 25],                  decl:  +1 },
  { icao: 'GMME', iata: 'RBA', lat:  34.0514, lon:  -6.7516, iso3: 'MAR', name: 'Rabat',               lc: false, qfu: [3, 21],                  decl:  -3 },
  { icao: 'GMMX', iata: 'RAK', lat:  31.6069, lon:  -8.0363, iso3: 'MAR', name: 'Marrakech',           lc: false, qfu: [10, 28],                 decl:  -3 },
  { icao: 'GMTN', iata: 'TNG', lat:  35.7269, lon:  -5.9168, iso3: 'MAR', name: 'Tanger',              lc: false, qfu: [10, 28],                 decl:  -3 },
  { icao: 'HECA', iata: 'CAI', lat:  30.1219, lon:  31.4056, iso3: 'EGY', name: 'Le Caire',            lc: false, qfu: [5, 23],                  decl:  +4 },
  // ── Afrique sub-saharienne / Ouest – LC ──────────────────────────────────
  { icao: 'GOBD', iata: 'DSS', lat:  14.6704, lon: -17.0726, iso3: 'SEN', name: 'Dakar',               lc: true,  qfu: [1, 19],                  decl: -10 },
  { icao: 'DIAP', iata: 'ABJ', lat:   5.2614, lon:  -3.9263, iso3: 'CIV', name: 'Abidjan',             lc: true,  qfu: [3, 21],                  decl:  -6 },
  { icao: 'DNMM', iata: 'LOS', lat:   6.5774, lon:   3.3215, iso3: 'NGA', name: 'Lagos',               lc: true,  qfu: [18, 36],                 decl:  -1 },
  { icao: 'FOOL', iata: 'LBV', lat:   0.4586, lon:   9.4123, iso3: 'GAB', name: 'Libreville',          lc: true,  qfu: [16, 34],                 decl:  +4 },
  { icao: 'FCBB', iata: 'BZV', lat:  -4.2517, lon:  15.2531, iso3: 'COG', name: 'Brazzaville',         lc: true,  qfu: [5, 23],                  decl:  +8 },
  // ── Afrique sub-saharienne – autres MC ───────────────────────────────────
  { icao: 'DBBB', iata: 'COO', lat:   6.3572, lon:   2.3847, iso3: 'BEN', name: 'Cotonou',             lc: false, qfu: [6, 24],                  decl:  -1 },
  { icao: 'DNAA', iata: 'ABV', lat:   9.0068, lon:   7.2631, iso3: 'NGA', name: 'Abuja',               lc: false, qfu: [4, 22],                  decl:  -1 },
  { icao: 'DXXX', iata: 'LFW', lat:   6.1656, lon:   1.2545, iso3: 'TGO', name: 'Lome',                lc: false, qfu: [4, 22],                  decl:  -2 },
  { icao: 'FCPP', iata: 'PNR', lat:  -4.8160, lon:  11.8866, iso3: 'COG', name: 'Pointe-Noire',        lc: false, qfu: [17, 35],                 decl:  +7 },
  { icao: 'FGBT', iata: 'SSG', lat:   3.7527, lon:   8.7088, iso3: 'GNQ', name: 'Malabo',              lc: false, qfu: [3, 21],                  decl:  +1 },
  { icao: 'FKKD', iata: 'DLA', lat:   4.0061, lon:   9.7195, iso3: 'CMR', name: 'Douala',              lc: false, qfu: [12, 30],                 decl:  +1 },
  { icao: 'FKYS', iata: 'NSI', lat:   3.7226, lon:  11.5533, iso3: 'CMR', name: 'Yaounde',             lc: false, qfu: [1, 19],                  decl:  +1 },
  { icao: 'FNBJ', iata: 'LAD', lat:  -8.8584, lon:  13.2312, iso3: 'AGO', name: 'Luanda',              lc: false, qfu: [6, 24],                  decl:  +6 },
  { icao: 'FTTJ', iata: 'NDJ', lat:  12.1337, lon:  15.0340, iso3: 'TCD', name: 'NDjamena',            lc: false, qfu: [5, 23],                  decl:  +2 },
  { icao: 'FZAA', iata: 'FIH', lat:  -4.3858, lon:  15.4446, iso3: 'COD', name: 'Kinshasa',            lc: false, qfu: [6, 24],                  decl:  +9 },
  { icao: 'GUCY', iata: 'CKY', lat:   9.5769, lon: -13.6120, iso3: 'GIN', name: 'Conakry',             lc: false, qfu: [6, 24],                  decl:  -9 },
  { icao: 'GQNN', iata: 'NKC', lat:  18.0980, lon: -15.9480, iso3: 'MRT', name: 'Nouakchott',          lc: false, qfu: [1, 19],                  decl: -10 },
  // ── Afrique de l'Est – LC ─────────────────────────────────────────────────
  { icao: 'HTDA', iata: 'DAR', lat:  -6.8781, lon:  39.2026, iso3: 'TZA', name: 'Dar es Salaam',       lc: true,  qfu: [5, 23],                  decl:  -3 },
  { icao: 'HAAB', iata: 'ADD', lat:   8.9779, lon:  38.7993, iso3: 'ETH', name: 'Addis Abeba',         lc: true,  qfu: [7, 25],                  decl:  +2 },
  // ── Afrique de l'Est – autres MC ──────────────────────────────────────────
  { icao: 'HDAM', iata: 'JIB', lat:  11.5473, lon:  43.1595, iso3: 'DJI', name: 'Djibouti',            lc: false, qfu: [9, 27],                  decl:  +2 },
  { icao: 'HKJK', iata: 'NBO', lat:  -1.3192, lon:  36.9275, iso3: 'KEN', name: 'Nairobi',             lc: false, qfu: [6, 24],                  decl:  -1 },
  { icao: 'HTKJ', iata: 'JRO', lat:  -3.4295, lon:  37.0745, iso3: 'TZA', name: 'Kilimandjaro',        lc: false, qfu: [9, 27],                  decl:  -2 },
  { icao: 'HTZA', iata: 'ZNZ', lat:  -6.2220, lon:  39.2249, iso3: 'TZA', name: 'Zanzibar',            lc: false, qfu: [18, 36],                 decl:  -3 },
  // ── Moyen-Orient – LC ────────────────────────────────────────────────────
  { icao: 'OMDB', iata: 'DXB', lat:  25.2528, lon:  55.3644, iso3: 'ARE', name: 'Dubaï',               lc: true,  qfu: [12, 30],                 decl:  +2 },
  { icao: 'OERK', iata: 'RUH', lat:  24.9576, lon:  46.6988, iso3: 'SAU', name: 'Riyad',               lc: true,  qfu: [15, 33],                 decl:  +3 },
  // ── Moyen-Orient – autres MC ──────────────────────────────────────────────
  { icao: 'OMAA', iata: 'AUH', lat:  24.4330, lon:  54.6511, iso3: 'ARE', name: 'Abu Dhabi',           lc: false, qfu: [13, 31],                 decl:  +2 },
  { icao: 'OLBA', iata: 'BEY', lat:  33.8208, lon:  35.4883, iso3: 'LBN', name: 'Beyrouth',            lc: false, qfu: [3, 21, 16, 34, 17, 35], decl:  +5 },
  { icao: 'UDYZ', iata: 'EVN', lat:  40.1473, lon:  44.3959, iso3: 'ARM', name: 'Erevan',              lc: false, qfu: [8, 26],                  decl:  +5 },
  { icao: 'UGTB', iata: 'TBS', lat:  41.6692, lon:  44.9547, iso3: 'GEO', name: 'Tbilissi',            lc: false, qfu: [13, 31],                 decl:  +5 },
  // ── Asie – LC ─────────────────────────────────────────────────────────────
  { icao: 'VHHH', iata: 'HKG', lat:  22.3080, lon: 113.9185, iso3: 'HKG', name: 'Hong Kong',           lc: true,  qfu: [7, 25],                  decl:  -3 },
  { icao: 'RJTT', iata: 'HND', lat:  35.5494, lon: 139.7798, iso3: 'JPN', name: 'Tokyo',               lc: true,  qfu: [4, 22, 5, 23, 16, 34],  decl:  -8 },
  { icao: 'RJBB', iata: 'KIX', lat:  34.4347, lon: 135.2440, iso3: 'JPN', name: 'Osaka Kansai',        lc: true,  qfu: [6, 24],                  decl:  -7 },
  { icao: 'RKSI', iata: 'ICN', lat:  37.4691, lon: 126.4510, iso3: 'KOR', name: 'Séoul Incheon',       lc: true,  qfu: [15, 33, 16, 34],         decl:  -8 },
  { icao: 'RPLL', iata: 'MNL', lat:  14.5086, lon: 121.0197, iso3: 'PHL', name: 'Manila',              lc: true,  qfu: [6, 24, 13, 31],          decl:  +1 },
  { icao: 'WSSS', iata: 'SIN', lat:   1.3644, lon: 103.9915, iso3: 'SGP', name: 'Singapour',           lc: true,  qfu: [2, 20],                  decl:  +1 },
  { icao: 'ZBAA', iata: 'PEK', lat:  40.0801, lon: 116.5846, iso3: 'CHN', name: 'Pékin',               lc: true,  qfu: [1, 19, 18, 36],          decl:  -6 },
  { icao: 'ZSPD', iata: 'PVG', lat:  31.1434, lon: 121.8052, iso3: 'CHN', name: 'Shanghai',            lc: true,  qfu: [15, 33, 16, 34, 17, 35], decl: -5 },
  { icao: 'VABB', iata: 'BOM', lat:  19.0896, lon:  72.8656, iso3: 'IND', name: 'Mumbai',              lc: true,  qfu: [9, 27, 14, 32],          decl:  +1 },
  { icao: 'VIDP', iata: 'DEL', lat:  28.5562, lon:  77.1000, iso3: 'IND', name: 'Delhi',               lc: true,  qfu: [9, 27, 10, 28, 11, 29], decl:   0 },
  // ── Asie – autres MC ──────────────────────────────────────────────────────
  { icao: 'VOBL', iata: 'BLR', lat:  13.1979, lon:  77.7063, iso3: 'IND', name: 'Bengaluru',           lc: false, qfu: [9, 27],                  decl:  -1 },
  { icao: 'VTBS', iata: 'BKK', lat:  13.6811, lon: 100.7475, iso3: 'THA', name: 'Bangkok',             lc: false, qfu: [1, 19, 2, 20],           decl:   0 },
  { icao: 'VTSP', iata: 'HKT', lat:   8.1132, lon:  98.3169, iso3: 'THA', name: 'Phuket',              lc: false, qfu: [9, 27],                  decl:   0 },
  { icao: 'VVTS', iata: 'SGN', lat:  10.8188, lon: 106.6520, iso3: 'VNM', name: 'Ho Chi Minh',         lc: false, qfu: [7, 25],                  decl:  -1 },
  { icao: 'WMKK', iata: 'KUL', lat:   2.7456, lon: 101.7099, iso3: 'MYS', name: 'Kuala Lumpur',        lc: false, qfu: [14, 32, 15, 33],         decl:  +1 },
];

/** Escales LC uniquement — utilisé pour les alertes météo et le briefing CCO */
export const LC_AIRPORTS = AIRPORTS.filter(a => a.lc);

/**
 * Mapping IATA → ICAO dérivé automatiquement depuis AIRPORTS.
 * Utilisé dans crosswind.astro pour résoudre les codes de vol AF.
 */
export const IATA_TO_ICAO: Record<string, string> = Object.fromEntries(
  AIRPORTS.map(a => [a.iata, a.icao])
);
