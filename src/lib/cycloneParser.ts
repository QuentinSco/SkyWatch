// ─── Cyclone Parser — NHC (Atlantique/Pac. Est) + RSMC La Réunion + RSMC Nadi ─────────────────
//
// Sources RSS gratuites, pas de clé API :
//   NHC Atlantique  : https://www.nhc.noaa.gov/index-at.xml
//   NHC Pac. Est    : https://www.nhc.noaa.gov/index-ep.xml
//   RSMC La Réunion : https://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/anglais/activitedevstop/rsmc/rsmc_rss.xml
//   RSMC Nadi (Fiji): https://www.met.gov.fj/rsmc-nadi-cyclone-rss.xml  (fallback GDACS si mort)
//   JTWC (suppl.)   : https://www.metoc.navy.mil/jtwc/rss/jtwc.rss
//
// Format de sortie : CycloneBulletin[]

import { redis } from './redis';

export type CycloneCategory =
  | 'TD'   // Tropical Depression
  | 'TS'   // Tropical Storm
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5'  // Hurricane / Typhoon
  | 'TC'   // Tropical Cyclone (générique RSMC)
  | 'STD'  // Subtropical Depression
  | 'STS'  // Subtropical Storm
  | 'INVEST'; // Zone à surveiller

export type CycloneSeverity = 'red' | 'orange' | 'yellow';

export interface CyclonePosition {
  lat: number;
  lon: number;
}

export interface CycloneForecastPoint {
  validAt: string;   // ISO
  lat: number;
  lon: number;
  windKt: number | null;
}

export interface CycloneBulletin {
  id: string;              // identifiant unique (nom + basin)
  name: string;            // ex. "FREDDY"
  basin: string;           // "Atlantique", "Pacifique Est", "Océan Indien", "Pacifique Sud"
  source: string;          // "NHC" | "RSMC-Réunion" | "RSMC-Nadi" | "JTWC"
  category: CycloneCategory;
  severity: CycloneSeverity;
  windKt: number;          // vent soutenu maximal en nœuds
  position: CyclonePosition;
  movingToward: string;    // ex. "NNE at 15 mph"
  headline: string;        // titre court du bulletin
  link: string;            // lien vers le bulletin officiel
  publishedAt: string;     // ISO
  affectedAirports: string[];  // ICAO des aéroports AF dans le cone à 72h
  forecastTrack: CycloneForecastPoint[];
}

// ─── Aéroports AF avec leur position (lat, lon) ─────────────────────────────────────────────
const AF_AIRPORTS: Record<string, { iata: string; name: string; lat: number; lon: number }> = {
  DIAP: { iata: 'ABJ', name: 'Abidjan',           lat:  5.26, lon:  -3.93 },
  DNAA: { iata: 'ABV', name: 'Abuja',              lat:  9.00, lon:   7.26 },
  KATL: { iata: 'ATL', name: 'Atlanta',            lat: 33.64, lon: -84.43 },
  OMAA: { iata: 'AUH', name: 'Abu Dhabi',          lat: 24.43, lon:  54.65 },
  OLBA: { iata: 'BEY', name: 'Beyrouth',           lat: 33.82, lon:  35.49 },
  VTBS: { iata: 'BKK', name: 'Bangkok',            lat: 13.68, lon: 100.75 },
  SKBO: { iata: 'BOG', name: 'Bogotá',             lat:  4.70, lon: -74.15 },
  VABB: { iata: 'BOM', name: 'Mumbai',             lat: 19.09, lon:  72.87 },
  KBOS: { iata: 'BOS', name: 'Boston',             lat: 42.36, lon: -71.01 },
  FCBB: { iata: 'BZV', name: 'Brazzaville',        lat: -4.25, lon:  15.25 },
  HECA: { iata: 'CAI', name: 'Le Caire',           lat: 30.12, lon:  31.41 },
  SOCA: { iata: 'CAY', name: 'Cayenne',            lat:  4.82, lon: -52.37 },
  LFPG: { iata: 'CDG', name: 'Paris CDG',          lat: 49.01, lon:   2.55 },
  GUCY: { iata: 'CKY', name: 'Conakry',            lat:  9.58, lon: -13.61 },
  DBBB: { iata: 'COO', name: 'Cotonou',            lat:  6.36, lon:   2.38 },
  FACT: { iata: 'CPT', name: 'Le Cap',             lat: -33.96, lon: 18.60 },
  MMUN: { iata: 'CUN', name: 'Cancún',            lat: 21.04, lon: -86.88 },
  VIDP: { iata: 'DEL', name: 'Delhi',              lat: 28.57, lon:  77.10 },
  KDEN: { iata: 'DEN', name: 'Denver',             lat: 39.86, lon:-104.67 },
  KDFW: { iata: 'DFW', name: 'Dallas',             lat: 32.90, lon: -97.04 },
  FKKD: { iata: 'DLA', name: 'Douala',             lat:  4.01, lon:   9.72 },
  GOBD: { iata: 'DSS', name: 'Dakar',              lat: 14.67, lon: -17.07 },
  KDTW: { iata: 'DTW', name: 'Détroit',            lat: 42.21, lon: -83.35 },
  EIDW: { iata: 'DUB', name: 'Dublin',             lat: 53.43, lon:  -6.24 },
  OMDB: { iata: 'DXB', name: 'Dubaï',             lat: 25.25, lon:  55.36 },
  KEWR: { iata: 'EWR', name: 'Newark',             lat: 40.69, lon: -74.17 },
  SAEZ: { iata: 'EZE', name: 'Buenos Aires',       lat: -34.82, lon: -58.54 },
  TFFF: { iata: 'FDF', name: 'Fort-de-France',     lat: 14.59, lon: -61.00 },
  FZAA: { iata: 'FIH', name: 'Kinshasa',           lat: -4.39, lon:  15.44 },
  SBFZ: { iata: 'FOR', name: 'Fortaleza',          lat: -3.78, lon: -38.53 },
  MMGL: { iata: 'GDL', name: 'Guadalajara',        lat: 20.52, lon:-103.31 },
  SBGL: { iata: 'GIG', name: 'Rio de Janeiro',     lat: -22.81, lon: -43.25 },
  SBGR: { iata: 'GRU', name: 'São Paulo',         lat: -23.43, lon: -46.47 },
  MUHA: { iata: 'HAV', name: 'La Havane',          lat: 22.99, lon: -82.41 },
  VHHH: { iata: 'HKG', name: 'Hong Kong',          lat: 22.31, lon: 113.92 },
  VTSP: { iata: 'HKT', name: 'Phuket',             lat:  8.11, lon:  98.30 },
  RJTT: { iata: 'HND', name: 'Tokyo Haneda',       lat: 35.55, lon: 139.78 },
  KIAD: { iata: 'IAD', name: 'Washington',         lat: 38.94, lon: -77.46 },
  KIAH: { iata: 'IAH', name: 'Houston',            lat: 29.98, lon: -95.34 },
  RKSI: { iata: 'ICN', name: 'Séoul Incheon',     lat: 37.46, lon: 126.44 },
  KJFK: { iata: 'JFK', name: 'New York JFK',       lat: 40.64, lon: -73.78 },
  HDAM: { iata: 'JIB', name: 'Djibouti',           lat: 11.55, lon:  43.16 },
  FAOR: { iata: 'JNB', name: 'Johannesburg',       lat: -26.13, lon: 28.24 },
  HTKJ: { iata: 'JRO', name: 'Kilimandjaro',       lat: -3.43, lon:  37.07 },
  RJBB: { iata: 'KIX', name: 'Osaka',              lat: 34.43, lon: 135.24 },
  KLAS: { iata: 'LAS', name: 'Las Vegas',          lat: 36.08, lon:-115.15 },
  KLAX: { iata: 'LAX', name: 'Los Angeles',        lat: 33.94, lon:-118.41 },
  FOOL: { iata: 'LBV', name: 'Libreville',         lat:  0.46, lon:   9.41 },
  LFBT: { iata: 'LDE', name: 'Lourdes-Tarbes',     lat: 43.18, lon:  -0.01 },
  DXXX: { iata: 'LFW', name: 'Lomé',              lat:  6.17, lon:   1.25 },
  SPIM: { iata: 'LIM', name: 'Lima',               lat: -12.02, lon: -77.11 },
  DNMM: { iata: 'LOS', name: 'Lagos',              lat:  6.58, lon:   3.32 },
  FNBJ: { iata: 'NBJ', name: 'Luanda',             lat: -8.86, lon:  13.23 },
  KMCO: { iata: 'MCO', name: 'Orlando',            lat: 28.43, lon: -81.31 },
  MMMX: { iata: 'MEX', name: 'Mexico City',        lat: 19.44, lon: -99.07 },
  KMIA: { iata: 'MIA', name: 'Miami',              lat: 25.80, lon: -80.29 },
  RPLL: { iata: 'MNL', name: 'Manille',            lat: 14.51, lon: 121.02 },
  FIMP: { iata: 'MRU', name: 'Maurice',            lat: -20.43, lon: 57.68 },
  KMSP: { iata: 'MSP', name: 'Minneapolis',        lat: 44.88, lon: -93.22 },
  MYNN: { iata: 'NAS', name: 'Nassau',             lat: 25.04, lon: -77.47 },
  HKJK: { iata: 'NBO', name: 'Nairobi',            lat: -1.32, lon:  36.93 },
  LFMN: { iata: 'NCE', name: 'Nice',               lat: 43.66, lon:   7.22 },
  FTTJ: { iata: 'NDJ', name: "N'Djamena",          lat: 12.13, lon:  15.03 },
  GQNN: { iata: 'NKC', name: 'Nouakchott',         lat: 18.10, lon: -15.95 },
  MMSM: { iata: 'NLU', name: 'Mexico City NLU',    lat: 19.75, lon: -99.02 },
  FKYS: { iata: 'NSI', name: 'Yaoundé',            lat:  3.72, lon:  11.55 },
  KORD: { iata: 'ORD', name: 'Chicago',            lat: 41.98, lon: -87.91 },
  LFPO: { iata: 'ORY', name: 'Paris Orly',         lat: 48.72, lon:   2.38 },
  ZBAA: { iata: 'PEK', name: 'Pékin',             lat: 40.08, lon: 116.58 },
  KPHX: { iata: 'PHX', name: 'Phoenix',            lat: 33.44, lon:-112.01 },
  EGPK: { iata: 'PIK', name: 'Glasgow Prestwick',  lat: 55.51, lon:  -4.59 },
  FCPP: { iata: 'PNR', name: 'Pointe-Noire',       lat: -4.82, lon:  11.89 },
  NTAA: { iata: 'PPT', name: 'Papeete',            lat: -17.55, lon:-149.61 },
  TFFR: { iata: 'PTP', name: 'Pointe-à-Pitre',    lat: 16.27, lon: -61.53 },
  MPTO: { iata: 'PTY', name: 'Panama City',        lat:  9.07, lon: -79.38 },
  MDPC: { iata: 'PUJ', name: 'Punta Cana',         lat: 18.57, lon: -68.37 },
  ZSPD: { iata: 'PVG', name: 'Shanghai',           lat: 31.14, lon: 121.80 },
  KRDU: { iata: 'RDU', name: 'Raleigh-Durham',     lat: 35.88, lon: -78.79 },
  OERK: { iata: 'RUH', name: 'Riyad',              lat: 24.96, lon:  46.70 },
  FMEE: { iata: 'RUN', name: 'La Réunion',         lat: -20.89, lon: 55.51 },
  KSAN: { iata: 'SAN', name: 'San Diego',          lat: 32.73, lon:-117.19 },
  SCEL: { iata: 'SCL', name: 'Santiago',           lat: -33.39, lon: -70.79 },
  KSEA: { iata: 'SEA', name: 'Seattle',            lat: 47.45, lon:-122.31 },
  KSFO: { iata: 'SFO', name: 'San Francisco',      lat: 37.62, lon:-122.38 },
  VVTS: { iata: 'SGN', name: 'Ho Chi Minh City',   lat: 10.82, lon: 106.65 },
  WSSS: { iata: 'SIN', name: 'Singapour',          lat:  1.36, lon: 103.99 },
  MROC: { iata: 'SJO', name: 'San José CR',        lat:  9.99, lon: -84.21 },
  SBSV: { iata: 'SSA', name: 'Salvador de Bahia',  lat: -12.91, lon: -38.32 },
  FGBT: { iata: 'SSG', name: 'Malabo',             lat:  3.75, lon:   8.71 },
  TNCM: { iata: 'SXM', name: 'Sint Maarten',       lat: 18.04, lon: -63.11 },
  LLBG: { iata: 'TLV', name: 'Tel Aviv',           lat: 32.01, lon:  34.89 },
  FMMI: { iata: 'TNR', name: 'Antananarivo',       lat: -18.80, lon: 47.48 },
  CYOW: { iata: 'YOW', name: 'Ottawa',             lat: 45.32, lon: -75.67 },
  CYUL: { iata: 'YUL', name: 'Montréal',           lat: 45.47, lon: -73.74 },
  CYVR: { iata: 'YVR', name: 'Vancouver',          lat: 49.19, lon:-123.18 },
  CYYZ: { iata: 'YYZ', name: 'Toronto',            lat: 43.68, lon: -79.63 },
  HTZA: { iata: 'ZNZ', name: 'Zanzibar',           lat: -6.22, lon:  39.22 },
};

// ─── Sources RSS cycloniques ────────────────────────────────────────────────────────────────────
const SOURCES = [
  {
    id:     'nhc-at',
    label:  'NHC',
    basin:  'Atlantique',
    url:    'https://www.nhc.noaa.gov/index-at.xml',
  },
  {
    id:     'nhc-ep',
    label:  'NHC',
    basin:  'Pacifique Est',
    url:    'https://www.nhc.noaa.gov/index-ep.xml',
  },
  {
    id:     'nhc-cp',
    label:  'NHC',
    basin:  'Pacifique Central',
    url:    'https://www.nhc.noaa.gov/index-cp.xml',
  },
  {
    id:     'rsmc-reunion',
    label:  'RSMC-Réunion',
    basin:  'Océan Indien',
    url:    'https://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/anglais/activitedevstop/rsmc/rsmc_rss.xml',
  },
  {
    id:     'jtwc',
    label:  'JTWC',
    basin:  'Pacifique Ouest / Indien',
    url:    'https://www.metoc.navy.mil/jtwc/rss/jtwc.rss',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

/** Distance orthodromique en km entre deux points (lat/lon en degrés) */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Catégorie Saffir-Simpson à partir du vent soutenu en nœuds.
 * En dessous de 34 kt → TD, 34-63 kt → TS, au-dessus → C1-C5.
 */
function windToCategory(kt: number): CycloneCategory {
  if (kt < 34)  return 'TD';
  if (kt < 64)  return 'TS';
  if (kt < 83)  return 'C1';
  if (kt < 96)  return 'C2';
  if (kt < 113) return 'C3';
  if (kt < 137) return 'C4';
  return 'C5';
}

function categoryToSeverity(cat: CycloneCategory): CycloneSeverity {
  if (cat === 'TD' || cat === 'INVEST') return 'yellow';
  if (cat === 'TS' || cat === 'STS' || cat === 'TC') return 'orange';
  return 'red'; // C1-C5, STD exclut mais rare
}

/** Extrait un nombre flottant d'une chaîne, retourne null si introuvable */
function extractFloat(s: string): number | null {
  const m = s.match(/[-+]?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// ─── Parsing RSS XML ────────────────────────────────────────────────────────────────────────

/** Extrait le texte d'une balise XML (naïve mais suffisante pour RSS) */
function xmlText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

/** Retourne tous les blocs <item>...</item> d'un flux RSS */
function xmlItems(xml: string): string[] {
  const items: string[] = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) items.push(m[1]);
  return items;
}

/**
 * Tente d'extraire lat/lon depuis :
 *   - balise <geo:lat> / <geo:long>
 *   - balise <georss:point>lat lon</georss:point>
 *   - texte libre "... located near XX.XN YY.YW ..."
 */
function extractPosition(item: string): CyclonePosition | null {
  // geo:lat / geo:long
  const lat1 = xmlText(item, 'geo:lat');
  const lon1 = xmlText(item, 'geo:long');
  if (lat1 && lon1) {
    const la = parseFloat(lat1);
    const lo = parseFloat(lon1);
    if (!isNaN(la) && !isNaN(lo)) return { lat: la, lon: lo };
  }
  // georss:point
  const gp = xmlText(item, 'georss:point');
  if (gp) {
    const [a, b] = gp.split(/\s+/);
    if (a && b) return { lat: parseFloat(a), lon: parseFloat(b) };
  }
  // texte libre NHC : "located near 18.5N 72.3W" ou "23.1N 85.2W"
  const desc = xmlText(item, 'description');
  const posRe = /located near\s+([\d.]+)([NS])\s+([\d.]+)([EW])/i;
  const pm = desc.match(posRe) ?? xmlText(item, 'title').match(/([\d.]+)([NS])\s+([\d.]+)([EW])/);
  if (pm) {
    const la = parseFloat(pm[1]) * (pm[2].toUpperCase() === 'S' ? -1 : 1);
    const lo = parseFloat(pm[3]) * (pm[4].toUpperCase() === 'W' ? -1 : 1);
    return { lat: la, lon: lo };
  }
  return null;
}

/**
 * Extrait le vent max en nœuds depuis la description ou le titre.
 * Cherche "Maximum sustained winds XX mph", "XX mph", "XX kt", "XX knots".
 */
function extractWindKt(item: string): number {
  const text = xmlText(item, 'description') + ' ' + xmlText(item, 'title');
  // mph
  const mph = text.match(/maximum sustained winds[^\d]*(\d+)\s*mph/i)
    ?? text.match(/(\d+)\s*mph/i);
  if (mph) return Math.round(parseInt(mph[1]) / 1.151);
  // knots
  const kt = text.match(/maximum sustained winds[^\d]*(\d+)\s*(?:kt|knots)/i)
    ?? text.match(/(\d+)\s*(?:kt|knots)/i);
  if (kt) return parseInt(kt[1]);
  return 0;
}

/** Extrait le nom du système ("TROPICAL STORM FRED", "HURRICANE IDA", etc.) */
function extractName(title: string): string {
  // NHC format : "Tropical Storm Fred Advisory..."
  const m = title.match(
    /(?:tropical\s+(?:storm|depression)|hurricane|typhoon|cyclone|invest)\s+([A-Z0-9-]+)/i
  );
  if (m) return m[1].toUpperCase();
  // RSMC-Réunion : "TROPICAL CYCLONE FREDDY"
  const m2 = title.match(/(?:tropical cyclone|dépression tropicale|zone pertubée)\s+([A-Z0-9-]+)/i);
  if (m2) return m2[1].toUpperCase();
  return title.split(' ').slice(0, 3).join(' ');
}

/**
 * Parse un seul flux RSS et retourne les bulletins actifs.
 * On filtre les items qui semblent être des avis actifs
 * (pas les résumés de saison, pas les "no tropical cyclones" vides).
 */
function parseRssFeed(
  xml: string,
  source: string,
  basin: string,
): CycloneBulletin[] {
  const bulletins: CycloneBulletin[] = [];
  const items = xmlItems(xml);

  for (const item of items) {
    const title = xmlText(item, 'title');
    const desc  = xmlText(item, 'description');
    const link  = xmlText(item, 'link');
    const pubDate = xmlText(item, 'pubDate');

    // Filtre : on veut uniquement les systèmes actifs
    // NHC signal d’absence : "There are no tropical cyclones"
    if (/no tropical cyclone|no active|aucun système|no storm/i.test(title + desc)) continue;
    // On ne garde que les items qui parlent d’un système nombré ou d’un INVEST
    const isActive = /tropical storm|tropical depression|hurricane|typhoon|cyclone|invest|pertub/i
      .test(title + desc);
    if (!isActive) continue;

    const pos  = extractPosition(item);
    const wind = extractWindKt(item);
    const name = extractName(title);
    const cat  = windToCategory(wind);
    const sev  = categoryToSeverity(cat);

    // Moving toward
    const movM = desc.match(/moving(?:\s+toward)?\s+(?:the\s+)?([\w\s]+)\s+at\s+([\d]+\s*(?:mph|km\/h|kt))/i);
    const movingToward = movM ? `${movM[1].trim()} at ${movM[2]}` : '';

    // Aéroports AF dans le cone ~500km
    const affectedAirports: string[] = [];
    if (pos) {
      for (const [icao, ap] of Object.entries(AF_AIRPORTS)) {
        if (haversineKm(pos.lat, pos.lon, ap.lat, ap.lon) <= 500) {
          affectedAirports.push(icao);
        }
      }
    }

    const id = `${source}-${name}-${basin}`.toLowerCase().replace(/\s+/g, '-');

    bulletins.push({
      id,
      name,
      basin,
      source,
      category: cat,
      severity: sev,
      windKt:   wind,
      position: pos ?? { lat: 0, lon: 0 },
      movingToward,
      headline: title.split(/advisory|bulletin|avis/i)[0].trim(),
      link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      affectedAirports,
      forecastTrack: [],
    });
  }

  return bulletins;
}

// ─── Fetch principal ─────────────────────────────────────────────────────────────────────────────
const KV_KEY_CYCLONES  = 'cyclones_cache';
const KV_TTL_CYCLONES  = 60 * 60; // 1h — les bulletins NHC sont publiés toutes les 3-6h

export async function fetchCycloneBulletins(): Promise<CycloneBulletin[]> {
  // Cache Redis
  if (redis) {
    try {
      const cached = await redis.get<CycloneBulletin[]>(KV_KEY_CYCLONES);
      if (cached && cached.length > 0) {
        console.log(`[Cyclones] Cache KV HIT — ${cached.length} bulletins`);
        return cached;
      }
    } catch (e) {
      console.warn('[Cyclones] KV read error:', e);
    }
  }

  const results = await Promise.allSettled(
    SOURCES.map(src =>
      fetch(src.url, {
        headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool', 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout(12000),
      })
        .then(r => r.ok ? r.text() : Promise.reject(`HTTP ${r.status}`))
        .then(xml => parseRssFeed(xml, src.label, src.basin))
        .catch(err => {
          console.warn(`[Cyclones] ${src.id} fetch error:`, err);
          return [] as CycloneBulletin[];
        })
    )
  );

  const all: CycloneBulletin[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  // Dédoublonner par id
  const seen = new Set<string>();
  const unique = all.filter(b => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  // Tri : RED d’abord, puis ORANGE, puis YELLOW
  const order = { red: 0, orange: 1, yellow: 2 };
  unique.sort((a, b) => order[a.severity] - order[b.severity]);

  console.log(`[Cyclones] ${unique.length} bulletins actifs`);

  if (redis && unique.length > 0) {
    try {
      await redis.set(KV_KEY_CYCLONES, unique, { ex: KV_TTL_CYCLONES });
    } catch (e) {
      console.warn('[Cyclones] KV write error:', e);
    }
  }

  return unique;
}
