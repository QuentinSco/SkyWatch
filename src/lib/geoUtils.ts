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
  { icao: 'DIAP', lat:  5.2614,  lon:  -3.9263, iso3: 'CIV', name: 'Abidjan' },            // ABJ
  { icao: 'DNAA', lat:  9.0068,  lon:   7.2632, iso3: 'NGA', name: 'Abuja' },               // ABV
  { icao: 'KATL', lat: 33.6367,  lon: -84.4281, iso3: 'USA', name: 'Atlanta' },             // ATL
  { icao: 'OMAA', lat: 24.4330,  lon:  54.6511, iso3: 'ARE', name: 'Abu Dhabi' },           // AUH
  { icao: 'OLBA', lat: 33.8209,  lon:  35.4884, iso3: 'LBN', name: 'Beyrouth' },            // BEY
  { icao: 'VTBS', lat: 13.6811,  lon: 100.7470, iso3: 'THA', name: 'Bangkok Suvarnabhumi' },// BKK
  { icao: 'VOBL', lat: 13.1979,  lon:  77.7063, iso3: 'IND', name: 'Bangalore' },           // BLR
  { icao: 'SKBO', lat:  4.7016,  lon: -74.1469, iso3: 'COL', name: 'Bogotá' },              // BOG
  { icao: 'VABB', lat: 19.0896,  lon:  72.8656, iso3: 'IND', name: 'Mumbai' },              // BOM
  { icao: 'KBOS', lat: 42.3656,  lon: -71.0096, iso3: 'USA', name: 'Boston' },              // BOS
  { icao: 'FCBB', lat: -4.2517,  lon:  15.2531, iso3: 'COG', name: 'Brazzaville' },         // BZV
  { icao: 'HECA', lat: 30.1219,  lon:  31.4056, iso3: 'EGY', name: 'Le Caire' },            // CAI
  { icao: 'SOCA', lat:  4.8221,  lon: -52.3676, iso3: 'GUF', name: 'Cayenne' },             // CAY
  { icao: 'LFPG', lat: 49.0128,  lon:   2.5500, iso3: 'FRA', name: 'Paris CDG' },           // CDG
  { icao: 'GUCY', lat:  9.5769,  lon: -13.6120, iso3: 'GIN', name: 'Conakry' },             // CKY
  { icao: 'DBBB', lat:  6.3572,  lon:   2.3845, iso3: 'BEN', name: 'Cotonou' },             // COO
  { icao: 'FACT', lat:-33.9649,  lon:  18.6017, iso3: 'ZAF', name: 'Le Cap' },              // CPT
  { icao: 'MMUN', lat: 21.0365,  lon: -86.8771, iso3: 'MEX', name: 'Cancún' },              // CUN
  { icao: 'VIDP', lat: 28.5562,  lon:  77.1000, iso3: 'IND', name: 'Delhi' },               // DEL
  { icao: 'KDEN', lat: 39.8561,  lon:-104.6737, iso3: 'USA', name: 'Denver' },              // DEN
  { icao: 'KDFW', lat: 32.8998,  lon: -97.0403, iso3: 'USA', name: 'Dallas' },              // DFW
  { icao: 'FKKD', lat:  4.0061,  lon:   9.7195, iso3: 'CMR', name: 'Douala' },              // DLA
  { icao: 'GOBD', lat: 14.6704,  lon: -17.0726, iso3: 'SEN', name: 'Dakar' },               // DSS
  { icao: 'KDTW', lat: 42.2124,  lon: -83.3534, iso3: 'USA', name: 'Detroit' },             // DTW
  { icao: 'EIDW', lat: 53.4213,  lon:  -6.2700, iso3: 'IRL', name: 'Dublin' },              // DUB
  { icao: 'OMDB', lat: 25.2528,  lon:  55.3644, iso3: 'ARE', name: 'Dubaï' },               // DXB
  { icao: 'KEWR', lat: 40.6895,  lon: -74.1745, iso3: 'USA', name: 'New York Newark' },     // EWR
  { icao: 'SAEZ', lat:-34.8222,  lon: -58.5358, iso3: 'ARG', name: 'Buenos Aires' },        // EZE
  { icao: 'TFFF', lat: 14.5910,  lon: -61.0032, iso3: 'MTQ', name: 'Fort-de-France' },      // FDF
  { icao: 'FZAA', lat: -4.3857,  lon:  15.4446, iso3: 'COD', name: 'Kinshasa' },            // FIH
  { icao: 'SBFZ', lat: -3.7763,  lon: -38.5326, iso3: 'BRA', name: 'Fortaleza' },           // FOR
  { icao: 'MMGL', lat: 20.5218,  lon:-103.3108, iso3: 'MEX', name: 'Guadalajara' },         // GDL
  { icao: 'SBGL', lat:-22.8099,  lon: -43.2505, iso3: 'BRA', name: 'Rio de Janeiro' },      // GIG
  { icao: 'SBGR', lat:-23.4356,  lon: -46.4731, iso3: 'BRA', name: 'São Paulo' },           // GRU
  { icao: 'MUHA', lat: 22.9892,  lon: -82.4091, iso3: 'CUB', name: 'La Havane' },           // HAV
  { icao: 'VHHH', lat: 22.3080,  lon: 113.9185, iso3: 'HKG', name: 'Hong Kong' },           // HKG
  { icao: 'VTSP', lat:  8.1132,  lon:  98.3169, iso3: 'THA', name: 'Phuket' },              // HKT
  { icao: 'RJTT', lat: 35.5494,  lon: 139.7798, iso3: 'JPN', name: 'Tokyo Haneda' },        // HND
  { icao: 'KIAD', lat: 38.9531,  lon: -77.4565, iso3: 'USA', name: 'Washington Dulles' },   // IAD
  { icao: 'KIAH', lat: 29.9902,  lon: -95.3368, iso3: 'USA', name: 'Houston' },             // IAH
  { icao: 'RKSI', lat: 37.4692,  lon: 126.4505, iso3: 'KOR', name: 'Séoul Incheon' },       // ICN
  { icao: 'KJFK', lat: 40.6413,  lon: -73.7781, iso3: 'USA', name: 'New York JFK' },        // JFK
  { icao: 'HDAM', lat: 11.5473,  lon:  43.1595, iso3: 'DJI', name: 'Djibouti' },            // JIB
  { icao: 'FAOR', lat:-26.1367,  lon:  28.2411, iso3: 'ZAF', name: 'Johannesburg' },        // JNB
  { icao: 'HTKJ', lat: -3.4294,  lon:  37.0694, iso3: 'TZA', name: 'Kilimandjaro' },        // JRO
  { icao: 'RJBB', lat: 34.4272,  lon: 135.2440, iso3: 'JPN', name: 'Osaka Kansai' },        // KIX
  { icao: 'WMKK', lat:  2.7456,  lon: 101.7099, iso3: 'MYS', name: 'Kuala Lumpur' },        // KUL
  { icao: 'KLAS', lat: 36.0840,  lon:-115.1537, iso3: 'USA', name: 'Las Vegas' },           // LAS
  { icao: 'KLAX', lat: 33.9425,  lon:-118.4081, iso3: 'USA', name: 'Los Angeles' },         // LAX
  { icao: 'FOOL', lat:  0.4586,  lon:   9.4123, iso3: 'GAB', name: 'Libreville' },          // LBV
  { icao: 'DXXX', lat:  6.1656,  lon:   1.2545, iso3: 'TGO', name: 'Lomé' },               // LFW
  { icao: 'SPJC', lat:-12.0219,  lon: -77.1143, iso3: 'PER', name: 'Lima' },                // LIM
  { icao: 'DNMM', lat:  6.5774,  lon:   3.3215, iso3: 'NGA', name: 'Lagos' },               // LOS
  { icao: 'KMCO', lat: 28.4294,  lon: -81.3089, iso3: 'USA', name: 'Orlando' },             // MCO
  { icao: 'MMMX', lat: 19.4363,  lon: -99.0721, iso3: 'MEX', name: 'Mexico' },              // MEX
  { icao: 'KMIA', lat: 25.7959,  lon: -80.2870, iso3: 'USA', name: 'Miami' },               // MIA
  { icao: 'RPLL', lat: 14.5086,  lon: 121.0194, iso3: 'PHL', name: 'Manille' },             // MNL
  { icao: 'FIMP', lat:-20.4302,  lon:  57.6836, iso3: 'MUS', name: 'Mauritius' },           // MRU
  { icao: 'KMSP', lat: 44.8848,  lon: -93.2223, iso3: 'USA', name: 'Minneapolis' },         // MSP
  { icao: 'MYNN', lat: 25.0390,  lon: -77.4662, iso3: 'BHS', name: 'Nassau' },              // NAS
  { icao: 'FNBJ', lat: -8.8583,  lon:  13.2312, iso3: 'AGO', name: 'Luanda João Gomes' },   // NBJ
  { icao: 'HKJK', lat: -1.3192,  lon:  36.9275, iso3: 'KEN', name: 'Nairobi' },             // NBO
  { icao: 'LFMN', lat: 43.6584,  lon:   7.2159, iso3: 'FRA', name: 'Nice' },                // NCE
  { icao: 'FTTJ', lat: 12.1337,  lon:  15.0340, iso3: 'TCD', name: "N'Djaména" },           // NDJ
  { icao: 'GQNN', lat: 18.0980,  lon: -15.9480, iso3: 'MRT', name: 'Nouakchott' },          // NKC
  { icao: 'MMSM', lat: 19.7558,  lon: -99.0153, iso3: 'MEX', name: 'Mexico Santa Lucia' },  // NLU
  { icao: 'FKYS', lat:  3.7226,  lon:  11.5533, iso3: 'CMR', name: 'Yaoundé' },             // NSI
  { icao: 'KORD', lat: 41.9742,  lon: -87.9073, iso3: 'USA', name: 'Chicago' },             // ORD
  { icao: 'LFPO', lat: 48.7233,  lon:   2.3794, iso3: 'FRA', name: 'Paris Orly' },          // ORY
  { icao: 'ZBAA', lat: 40.0801,  lon: 116.5846, iso3: 'CHN', name: 'Pékin' },               // PEK
  { icao: 'KPHX', lat: 33.4373,  lon:-112.0078, iso3: 'USA', name: 'Phoenix' },             // PHX
  { icao: 'EGPK', lat: 55.5094,  lon:  -4.5869, iso3: 'GBR', name: 'Glasgow Prestwick' },   // PIK
  { icao: 'FCPP', lat: -4.8160,  lon:  11.8866, iso3: 'COG', name: 'Pointe-Noire' },        // PNR
  { icao: 'NTAA', lat:-17.5534,  lon:-149.6069, iso3: 'PYF', name: 'Papeete Tahiti' },      // PPT
  { icao: 'TFFR', lat: 16.2653,  lon: -61.5272, iso3: 'GLP', name: 'Pointe-à-Pitre' },      // PTP
  { icao: 'MPTO', lat:  9.0714,  lon: -79.3835, iso3: 'PAN', name: 'Panama City' },         // PTY
  { icao: 'MDPC', lat: 18.5674,  lon: -68.3634, iso3: 'DOM', name: 'Punta Cana' },          // PUJ
  { icao: 'ZSPD', lat: 31.1434,  lon: 121.8052, iso3: 'CHN', name: 'Shanghai Pudong' },     // PVG
  { icao: 'KRDU', lat: 35.8776,  lon: -78.7875, iso3: 'USA', name: 'Raleigh-Durham' },      // RDU
  { icao: 'OERK', lat: 24.9576,  lon:  46.6988, iso3: 'SAU', name: 'Riyad' },               // RUH
  { icao: 'FMEE', lat:-20.8871,  lon:  55.5116, iso3: 'REU', name: 'La Réunion' },           // RUN
  { icao: 'KSAN', lat: 32.7336,  lon:-117.1897, iso3: 'USA', name: 'San Diego' },           // SAN
  { icao: 'SCEL', lat:-33.3930,  lon: -70.7858, iso3: 'CHL', name: 'Santiago' },            // SCL
  { icao: 'KSEA', lat: 47.4502,  lon:-122.3088, iso3: 'USA', name: 'Seattle' },             // SEA
  { icao: 'KSFO', lat: 37.6213,  lon:-122.3790, iso3: 'USA', name: 'San Francisco' },       // SFO
  { icao: 'VVTS', lat: 10.8188,  lon: 106.6520, iso3: 'VNM', name: 'Hô Chi Minh-Ville' },   // SGN
  { icao: 'WSSS', lat:  1.3644,  lon: 103.9915, iso3: 'SGP', name: 'Singapour' },           // SIN
  { icao: 'MROC', lat:  9.9939,  lon: -84.2088, iso3: 'CRI', name: 'San José' },             // SJO
  { icao: 'SBSA', lat:-12.9086,  lon: -38.3225, iso3: 'BRA', name: 'Salvador de Bahia' },   // SSA
  { icao: 'FGSL', lat:  3.7527,  lon:   8.7087, iso3: 'GNQ', name: 'Malabo' },              // SSG
  { icao: 'TNCM', lat: 18.0410,  lon: -63.1089, iso3: 'SXM', name: 'Saint-Martin' },        // SXM
  { icao: 'LPLA', lat: 38.7618,  lon: -27.0908, iso3: 'PRT', name: 'Terceira Açores' },     // TER
  { icao: 'LLBG', lat: 32.0114,  lon:  34.8867, iso3: 'ISR', name: 'Tel Aviv' },            // TLV
  { icao: 'FMMI', lat:-18.7969,  lon:  47.4788, iso3: 'MDG', name: 'Antananarivo' },        // TNR
  { icao: 'CYOW', lat: 45.3225,  lon: -75.6692, iso3: 'CAN', name: 'Ottawa' },              // YOW
  { icao: 'CYUL', lat: 45.4706,  lon: -73.7408, iso3: 'CAN', name: 'Montréal' },             // YUL
  { icao: 'CYVR', lat: 49.1939,  lon:-123.1844, iso3: 'CAN', name: 'Vancouver' },           // YVR
  { icao: 'CYYZ', lat: 43.6772,  lon: -79.6306, iso3: 'CAN', name: 'Toronto' },             // YYZ
  { icao: 'HTZA', lat: -6.2220,  lon:  39.2249, iso3: 'TZA', name: 'Zanzibar' },            // ZNZ
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
