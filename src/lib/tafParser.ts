// src/lib/tafParser.ts
// Source : AviationWeather.gov API (100% gratuit, NOAA)
import { redis } from './redis';

export type ThreatSeverity = 'red' | 'orange' | 'yellow';

export interface TafThreat {
  type: string;
  label: string;
  value?: string;
  severity: ThreatSeverity;
  periodStart: number;
  periodEnd: number;
  changeIndicator: string;
  snippet: string;
}

export interface TafRisk {
  icao: string;
  iata: string;
  name: string;
  rawTaf: string;
  worstSeverity: ThreatSeverity;
  threats: TafThreat[];
}

// ─── Réseau AF Long-Courrier uniquement ────────────────────────────────────
const AF_LC_IATA = new Set([
  'ABJ', 'ABV', 'ATL', 'BEY', 'BKK', 'BLR', 'BOG', 'BOM', 'BOS', 'BZV',
  'CAI', 'CAY', 'CDG', 'CKY', 'COO', 'CPT', 'CUN', 'DEL', 'DEN', 'DFW',
  'DLA', 'DSS', 'DTW', 'DUB', 'DXB', 'EWR', 'EZE', 'FDF', 'FIH', 'FOR',
  'GDL', 'GIG', 'GRU', 'HAV', 'HKG', 'HKT', 'HND', 'IAD', 'IAH', 'ICN',
  'JFK', 'JIB', 'JNB', 'JRO', 'KIX', 'KUL', 'LAS', 'LAX', 'LBV', 'LFW',
  'LIM', 'LOS', 'MCO', 'MEX', 'MIA', 'MNL', 'MRU', 'MSP', 'NAS', 'NBJ',
  'NBO', 'NCE', 'NDJ', 'NKC', 'NLU', 'NSI', 'ORD', 'ORY', 'PEK', 'PHX',
  'PIK', 'PNR', 'PPT', 'PTP', 'PTY', 'PUJ', 'PVG', 'RDU', 'RUH', 'RUN',
  'SAN', 'SCL', 'SEA', 'SFO', 'SGN', 'SIN', 'SJO', 'SSA', 'SSG', 'SXM',
  'TLV', 'TNR', 'YOW', 'YUL', 'YVR', 'YYZ', 'ZNZ'
]);

export const AF_IATA_TO_ICAO: Record<string, string> = {
  // ── Afrique ────────────────────────────────────────────────────────────────
  ABJ: 'DIAP', ABV: 'DNAA', BZV: 'FCBB', CKY: 'GUCY', CMN: 'GMMN',
  COO: 'DBBB', CPT: 'FACT', DLA: 'FKKD', DSS: 'GOBD', FIH: 'FZAA',
  JIB: 'HDAM', JNB: 'FAOR', JRO: 'HTKJ', LBV: 'FOOL', LFW: 'DXXX',
  LOS: 'DNMM', MRU: 'FIMP', NBJ: 'FNBJ', NBO: 'HKJK', NDJ: 'FTTJ',
  NKC: 'GQNN', NSI: 'FKYS', PNR: 'FCPP', RAK: 'GMMX', RBA: 'GMME',
  RUN: 'FMEE', SSG: 'FGBT', TNG: 'GMTN', TNR: 'FMMI', TUN: 'DTTA',
  ZNZ: 'HTZA',
  // ── Amériques ──────────────────────────────────────────────────────────────
  ATL: 'KATL', BEL: 'SBBE', BOG: 'SKBO', BOS: 'KBOS', CAY: 'SOCA',
  CUN: 'MMUN', DEN: 'KDEN', DFW: 'KDFW', DTW: 'KDTW', EWR: 'KEWR',
  EZE: 'SAEZ', FDF: 'TFFF', FOR: 'SBFZ', GDL: 'MMGL', GIG: 'SBGL',
  GRU: 'SBGR', HAV: 'MUHA', IAD: 'KIAD', IAH: 'KIAH', JFK: 'KJFK',
  LAS: 'KLAS', LAX: 'KLAX', LIM: 'SPIM', MCO: 'KMCO', MEX: 'MMMX',
  MIA: 'KMIA', MSP: 'KMSP', NAS: 'MYNN', NLU: 'MMSM', ORD: 'KORD',
  PHX: 'KPHX', PPT: 'NTAA', PTP: 'TFFR', PTY: 'MPTO', PUJ: 'MDPC',
  RDU: 'KRDU', SAN: 'KSAN', SCL: 'SCEL', SEA: 'KSEA', SFO: 'KSFO',
  SJO: 'MROC', SSA: 'SBSV', SXM: 'TNCM', YOW: 'CYOW', YUL: 'CYUL',
  YVR: 'CYVR', YYZ: 'CYYZ',
  // ── Asie / Pacifique ───────────────────────────────────────────────────────
  BKK: 'VTBS', BLR: 'VOBL', BOM: 'VABB', DEL: 'VIDP', HKG: 'VHHH',
  HKT: 'VTSP', HND: 'RJTT', ICN: 'RKSI', KIX: 'RJBB', KUL: 'WMKK',
  MNL: 'RPLL', PEK: 'ZBAA', PVG: 'ZSPD', SGN: 'VVTS', SIN: 'WSSS',
  // ── Moyen-Orient ───────────────────────────────────────────────────────────
  AUH: 'OMAA', BEY: 'OLBA', DXB: 'OMDB', EVN: 'UDYZ', IST: 'LTFM',
  RUH: 'OERK', TBS: 'UGTB', TLV: 'LLBG',
  // ── Europe ─────────────────────────────────────────────────────────────────
  AGP: 'LEMG', AJA: 'LFKJ', ALG: 'DAAG', AMS: 'EHAM', ARN: 'ESSA',
  ATH: 'LGAV', BCN: 'LEBL', BER: 'EDDB', BES: 'LFRB', BGO: 'ENBR',
  BHX: 'EGBB', BIA: 'LFKB', BIO: 'LEBB', BIQ: 'LFBZ', BLL: 'EKBI',
  BLQ: 'LIPE', BOD: 'LFBD', BRI: 'LIBD', BSL: 'LFSB', BUD: 'LHBP',
  CAI: 'HECA', CDG: 'LFPG', CFE: 'LFLC', CFR: 'LFRK', CLY: 'LFKC',
  CPH: 'EKCH', CTA: 'LICC', DBV: 'LDDU', DNR: 'LFRD', DUB: 'EIDW',
  DUS: 'EDDL', EDI: 'EGPH', FCO: 'LIRF', FLR: 'LIRQ', FRA: 'EDDF',
  FSC: 'LFKS', GOT: 'ESGG', GVA: 'LSGG', HAJ: 'EDDV', HAM: 'EDDH',
  HEL: 'EFHK', HER: 'LGIR', IBZ: 'LEIB', JMK: 'LGMK', KRK: 'EPKK',
  KTT: 'EFKT', LGW: 'EGKK', LHR: 'EGLL', LIL: 'LFQQ', LIN: 'LIML',
  LIS: 'LPPT', LJU: 'LJLJ', LYS: 'LFLL', MAD: 'LEMD', MAN: 'EGCC',
  MLA: 'LMML', MPL: 'LFMT', MRS: 'LFML', MUC: 'EDDM', MXP: 'LIMC',
  NAP: 'LIRN', NCE: 'LFMN', NCL: 'EGNT', NTE: 'LFRS', NUE: 'EDDN',
  OLB: 'LIEO', OPO: 'LPPR', ORK: 'EICK', ORN: 'DAOO', ORY: 'LFPO',
  OSL: 'ENGM', OTP: 'LROP', PIK: 'EGPK', PMI: 'LEPA', PMO: 'LICJ',
  PRG: 'LKPR', PUF: 'LFBP', RNS: 'LFRN', RVN: 'EFRO', STR: 'EDDS',
  SVQ: 'LEZL', TLS: 'LFBO', TOS: 'ENTC', TRN: 'LIMF', VCE: 'LIPZ',
  VIE: 'LOWW', VLC: 'LEVC', VRN: 'LIPX', WAW: 'EPWA', ZAG: 'LDZA',
  ZRH: 'LSZH',
  // ── Autres ─────────────────────────────────────────────────────────────────
  LDE: 'LFBT',
};

const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

export const AF_AIRPORT_ICAOS: string[] = [...new Set(Object.values(AF_IATA_TO_ICAO))];

const AIRPORT_NAMES: Record<string, string> = {
  DIAP: 'Abidjan',            DNAA: 'Abuja',
  FCBB: 'Brazzaville',        GUCY: 'Conakry',
  GMMN: 'Casablanca',         DBBB: 'Cotonou',
  FACT: 'Le Cap',             FKKD: 'Douala',
  GOBD: 'Dakar',              FZAA: 'Kinshasa',
  HDAM: 'Djibouti',           FAOR: 'Johannesburg',
  HTKJ: 'Kilimandjaro',       FOOL: 'Libreville',
  DXXX: 'Lomé',               DNMM: 'Lagos',
  FIMP: 'Maurice',            FNBJ: 'Luanda',
  HKJK: 'Nairobi',            FTTJ: "N'Djamena",
  GQNN: 'Nouakchott',         FKYS: 'Yaoundé',
  FCPP: 'Pointe-Noire',       GMMX: 'Marrakech',
  GMME: 'Rabat',              FMEE: 'La Réunion',
  FGBT: 'Malabo',             GMTN: 'Tanger',
  FMMI: 'Antananarivo',       DTTA: 'Tunis',
  HTZA: 'Zanzibar',           DAOO: 'Oran',
  KATL: 'Atlanta',            SBBE: 'Belém',
  SKBO: 'Bogotá',             KBOS: 'Boston',
  SOCA: 'Cayenne',            MMUN: 'Cancún',
  KDEN: 'Denver',             KDFW: 'Dallas/Fort Worth',
  KDTW: 'Détroit',            KEWR: 'Newark',
  SAEZ: 'Buenos Aires',       TFFF: 'Fort-de-France',
  SBFZ: 'Fortaleza',          MMGL: 'Guadalajara',
  SBGL: 'Rio de Janeiro',     SBGR: 'São Paulo',
  MUHA: 'La Havane',          KIAD: 'Washington Dulles',
  KIAH: 'Houston',            KJFK: 'New York JFK',
  KLAS: 'Las Vegas',          KLAX: 'Los Angeles',
  SPIM: 'Lima',               KMCO: 'Orlando',
  MMMX: 'Mexico City (MEX)',  KMIA: 'Miami',
  KMSP: 'Minneapolis',        MYNN: 'Nassau',
  MMSM: 'Mexico City (NLU)',  KORD: "Chicago O'Hare",
  KPHX: 'Phoenix',            NTAA: 'Papeete',
  TFFR: 'Pointe-à-Pitre',     MPTO: 'Panama City',
  MDPC: 'Punta Cana',         KRDU: 'Raleigh-Durham',
  KSAN: 'San Diego',          SCEL: 'Santiago',
  KSEA: 'Seattle',            KSFO: 'San Francisco',
  MROC: 'San José CR',        SBSV: 'Salvador de Bahia',
  TNCM: 'Sint Maarten',       CYOW: 'Ottawa',
  CYUL: 'Montréal',           CYVR: 'Vancouver',
  CYYZ: 'Toronto',            OERK: 'Riyad',
  VTBS: 'Bangkok',            VOBL: 'Bengaluru',
  VABB: 'Mumbai',             VIDP: 'Delhi',
  VHHH: 'Hong Kong',          VTSP: 'Phuket',
  RJTT: 'Tokyo Haneda',       RKSI: 'Séoul Incheon',
  RJBB: 'Osaka Kansai',       WMKK: 'Kuala Lumpur',
  RPLL: 'Manille',            ZBAA: 'Pékin Capital',
  ZSPD: 'Shanghai Pudong',    VVTS: 'Ho Chi Minh City',
  WSSS: 'Singapour',
  OMAA: 'Abu Dhabi',          OLBA: 'Beyrouth',
  OMDB: 'Dubaï',              UDYZ: 'Erevan',
  LTFM: 'Istanbul',           UGTB: 'Tbilissi',
  LLBG: 'Tel Aviv',
  LEMG: 'Malaga',             LFKJ: 'Ajaccio',
  DAAG: 'Alger',              EHAM: 'Amsterdam',
  ESSA: 'Stockholm',          LGAV: 'Athènes',
  LEBL: 'Barcelone',          EDDB: 'Berlin',
  LFRB: 'Brest',              ENBR: 'Bergen',
  EGBB: 'Birmingham',         LFKB: 'Bastia',
  LEBB: 'Bilbao',             LFBZ: 'Biarritz',
  EKBI: 'Billund',            LIPE: 'Bologne',
  LFBD: 'Bordeaux',           LIBD: 'Bari',
  LFSB: 'Bâle-Mulhouse',      LHBP: 'Budapest',
  HECA: 'Le Caire',           LFPG: 'Paris CDG',
  LFLC: 'Clermont-Ferrand',   LFRK: 'Caen',
  LFKC: 'Calvi',              EKCH: 'Copenhague',
  LICC: 'Catane',             LFRD: 'Dinard',
  EIDW: 'Dublin',             EDDL: 'Düsseldorf',
  EGPH: 'Édimbourg',          LIRF: 'Rome FCO',
  LIRQ: 'Florence',           EDDF: 'Francfort',
  LFKS: 'Figari',             ESGG: 'Göteborg',
  LSGG: 'Genève',             EDDV: 'Hanovre',
  EDDH: 'Hambourg',           EFHK: 'Helsinki',
  LGIR: 'Héraklion',          LEIB: 'Ibiza',
  LGMK: 'Mykonos',            EPKK: 'Cracovie',
  EFKT: 'Kittilä',            EGKK: 'Londres Gatwick',
  EGLL: 'Londres Heathrow',   LFQQ: 'Lille',
  LIML: 'Milan Linate',       LPPT: 'Lisbonne',
  LJLJ: 'Ljubljana',          LFLL: 'Lyon',
  LEMD: 'Madrid',             EGCC: 'Manchester',
  LMML: 'Malte',              LFMT: 'Montpellier',
  LFML: 'Marseille',          EDDM: 'Munich',
  LIMC: 'Milan Malpensa',     LIRN: 'Naples',
  LFMN: 'Nice',               EGNT: 'Newcastle',
  LFRS: 'Nantes',             EDDN: 'Nuremberg',
  LIEO: 'Olbia',              LPPR: 'Porto',
  EICK: 'Cork',               ENGM: 'Oslo',
  LROP: 'Bucarest',           LEPA: 'Palma',
  LICJ: 'Palerme',            LKPR: 'Prague',
  LFBP: 'Pau',                LFRN: 'Rennes',
  EFRO: 'Rovaniemi',          EGPK: 'Glasgow Prestwick',
  EDDS: 'Stuttgart',          LEZL: 'Séville',
  LFBO: 'Toulouse',           ENTC: 'Tromsø',
  LIMF: 'Turin',              LIPZ: 'Venise',
  LOWW: 'Vienne',             LEVC: 'Valence',
  LIPX: 'Vérone',             EPWA: 'Varsovie',
  LDZA: 'Zagreb',             LSZH: 'Zurich',
  LDDU: 'Dubrovnik',          LFPO: 'Paris Orly',
  LFBT: 'Lourdes-Tarbes',
};

const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

function cappedSeverity(baseSeverity: ThreatSeverity, ci: string): ThreatSeverity {
  if (ci.startsWith('PROB30')) return 'yellow';
  if (ci.startsWith('PROB40')) return baseSeverity === 'red' ? 'orange' : baseSeverity;
  return baseSeverity;
}

function visMtoMeters(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (s === '6+' || s.toUpperCase() === 'P6SM' || s === '9999') return 9999;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  if (Number.isInteger(n) && n >= 800) return n;
  const SM_TO_M = 1609.344;
  return Math.round((n * SM_TO_M) / 50) * 50;
}

function getAirportName(icao: string): string { return AIRPORT_NAMES[icao] ?? icao; }
function getIata(icao: string): string { return ICAO_TO_IATA[icao] ?? icao; }

function groupHasExplicitVisib(fcst: any): boolean {
  const raw: string = (fcst.rawFcst ?? fcst.fcstStr ?? '').toString();
  if (!raw) return true;
  return /\b(\d{4}|P6SM|\d+\/\d+SM|\d+SM)\b/.test(raw);
}

function cloudBaseToTafCode(baseFt: number | null | undefined): string {
  if (baseFt == null) return '';
  return String(Math.round(baseFt / 100)).padStart(3, '0');
}

function buildSnippet(fcst: any): string {
  const wdir    = fcst.wdir != null ? String(fcst.wdir).padStart(3, '0') : 'VRB';
  const wspd    = fcst.wspd != null ? String(fcst.wspd).padStart(2, '0') : null;
  const wgst    = fcst.wgst != null ? `G${String(fcst.wgst).padStart(2, '0')}` : '';
  const windStr = wspd ? `${wdir}${wspd}${wgst}KT` : '';
  const wxStr   = fcst.wxString ?? '';
  const visRaw  = fcst.visib;
  const visM    = visMtoMeters(visRaw);
  const visStr  = (visM !== null && visM !== 9999) ? `VIS ${visM}m` : '';
  const cbStr   = fcst.clouds
    ?.filter((c: any) => c.type === 'CB' || c.type === 'TCU')
    .map((c: any) => `${c.cover}${cloudBaseToTafCode(c.base)}${c.type}`)
    .join(' ') ?? '';
  return [windStr, wxStr, visStr, cbStr].filter(Boolean).join(' ').trim();
}

// ─── Reconstruction du changeIndicator + segment rawTAF ────────────────────────────
//
// Pour chaque groupe (TEMPO/BECMG/PROB/FM) on stocke :
//   - ci      : le change indicator
//   - segment : le texte brut du groupe (jusqu'au prochain groupe ou fin)
//
// Cela permet de détecter si un phénomène est "explicit" dans le groupe
// ou hérité par erreur de propagation de l'API depuis le groupe de base.
interface CiEntry { ci: string; segment: string; }

function buildCiMapFromRaw(
  rawTaf: string,
  issueTime: string | number | null | undefined,
): Map<number, CiEntry> {
  const ciMap = new Map<number, CiEntry>();
  if (!rawTaf) return ciMap;

  const issueDate: Date = typeof issueTime === 'string'
    ? new Date(issueTime)
    : new Date((issueTime ?? Date.now() / 1000) * 1000);
  if (isNaN(issueDate.getTime())) return ciMap;

  const issueDay   = issueDate.getUTCDate();
  const issueMonth = issueDate.getUTCMonth();
  const issueYear  = issueDate.getUTCFullYear();

  function toUnix(day: number, hour: number): number {
    const d = new Date(Date.UTC(issueYear, issueMonth, day, hour, 0, 0));
    if (day < issueDay) d.setUTCMonth(d.getUTCMonth() + 1);
    return Math.floor(d.getTime() / 1000);
  }

  // Trouver les positions de chaque groupe dans le rawTAF
  const HEADER_RE = /\b(PROB\d{2}\s+TEMPO|PROB\d{2}|TEMPO|BECMG)\s+(\d{2})(\d{2})\/(\d{2})(\d{2})|\bFM(\d{2})(\d{2})(\d{2})/g;
  const entries: Array<{ start: number; ci: string; pos: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = HEADER_RE.exec(rawTaf)) !== null) {
    if (m[1]) {
      const ci    = m[1].replace(/\s+/g, ' ').toUpperCase();
      const start = toUnix(parseInt(m[2], 10), parseInt(m[3], 10));
      entries.push({ start, ci, pos: m.index });
    } else if (m[6]) {
      const start = toUnix(parseInt(m[6], 10), parseInt(m[7], 10));
      entries.push({ start, ci: 'FM', pos: m.index });
    }
  }

  // Construire chaque segment = texte depuis ce groupe jusqu'au suivant
  for (let i = 0; i < entries.length; i++) {
    const { start, ci, pos } = entries[i];
    const end = i + 1 < entries.length ? entries[i + 1].pos : rawTaf.length;
    const segment = rawTaf.slice(pos, end);
    ciMap.set(start, { ci, segment });
  }

  return ciMap;
}

function resolveCiEntry(
  fcst: any,
  ciMap: Map<number, CiEntry>,
): CiEntry | null {
  const raw = fcst.changeIndicator;
  // L'API peut parfois renvoyer le bon CI — on le normalise si exploitable,
  // mais on n'a pas le segment rawTAF dans ce cas (on renvoie null pour que
  // le caller traite différemment).
  if (raw && raw !== 'FM') {
    const norm = raw.trim().replace(/\s+/g, ' ').toUpperCase();
    if (norm === 'PROB40TEMPO') return { ci: 'PROB40 TEMPO', segment: '' };
    if (norm === 'PROB30TEMPO') return { ci: 'PROB30 TEMPO', segment: '' };
    if (norm !== 'INITIAL' && norm !== '') return { ci: norm, segment: '' };
  }

  const timeFrom: number = fcst.timeFrom ?? 0;
  for (const [start, entry] of ciMap) {
    if (Math.abs(start - timeFrom) <= 5 * 60) return entry;
  }

  return null; // groupe de base
}

// ─── Détection d'héritage parasite (API propagation bug) ───────────────────────────
//
// Un BECMG ou FM annule et remplace le groupe précédent sur tous les
// paramètres qu'il liste explicitement. Les paramètres non listés sont
// implicitement annulés (NSW, pas de wxString, etc.).
//
// L'API propage à tort le wxString du groupe de base dans les fcsts
// post-BECMG/FM. On détecte ce cas en vérifiant que :
//   1. Le CI est BECMG ou FM
//   2. Le segment rawTAF de ce groupe ne contient PAS le phénomène
//
// Pour TEMPO/PROB : l'API est censée lister explicitement les phénomènes,
// pas besoin de filtrage.
function isInheritedInBecmgOrFm(ci: string, segment: string, phenomenon: string): boolean {
  if (!ci.startsWith('BECMG') && ci !== 'FM') return false;
  if (!segment) return false; // pas de segment = on fait confiance au fcst
  // Le phénomène est-il explicitement dans le segment ?
  return !segment.includes(phenomenon);
}

function parseThreatsFromForecast(
  fcst: any,
  ci: string,
  segment: string,
): TafThreat[] {
  const threats: TafThreat[] = [];
  const { timeFrom, timeTo, wspd, wgst, wxString, clouds, visib } = fcst;
  const snippet = buildSnippet(fcst);
  const sev = (base: ThreatSeverity) => cappedSeverity(base, ci);

  // Helper : vérifie que le phénomène n'est pas un héritage parasite API
  const ok = (phenomenon: string) => !isInheritedInBecmgOrFm(ci, segment, phenomenon);

  if (wxString && /\bTSRA*/.test(wxString) && ok('TSRA') && ok('TS')) {
    threats.push({ type: 'THUNDERSTORM', label: 'Orage', value: wxString,
      severity: sev('red'), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bFC\b/.test(wxString) && ok('FC')) {
    threats.push({ type: 'FUNNEL_CLOUD', label: 'Trombe / Tornade', value: 'FC',
      severity: sev('red'), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bSN\b|\bBLSN\b|\bSNGR\b/.test(wxString) && ok('SN') && ok('BLSN') && ok('SNGR')) {
    const heavy = /\+SN|\+RASN|BLSN/.test(wxString);
    threats.push({ type: 'SNOW', label: heavy ? 'Neige forte / Tempête' : 'Neige', value: wxString,
      severity: sev(heavy ? 'red' : 'orange'), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bFZRA\b|\bFZDZ\b|\bFZFG\b/.test(wxString) && ok('FZ')) {
    threats.push({ type: 'FREEZING', label: 'Précip. verglaçantes', value: wxString,
      severity: sev('orange'), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bGR\b|\bGS\b/.test(wxString) && ok('GR') && ok('GS')) {
    threats.push({ type: 'HAIL', label: 'Grêle', value: wxString,
      severity: sev('orange'), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wspd != null || wgst != null) {
    const maxWind = Math.max(wspd ?? 0, wgst ?? 0);
    if (maxWind >= 30) {
      const windStr = buildSnippet(fcst).split(' ')[0];
      threats.push({ type: 'WIND',
        label: wgst != null && wgst >= 30 ? `Rafales ${wgst}kt` : `Vent ${wspd}kt`,
        value: windStr, severity: sev(maxWind >= 40 ? 'red' : 'orange'),
        periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  if (visib != null && visib !== '6+') {
    const visM = visMtoMeters(visib);
    if (visM !== null && visM < 3500 && groupHasExplicitVisib(fcst)) {
      const base: ThreatSeverity = visM < 400 ? 'red' : visM < 1000 ? 'orange' : 'yellow';
      threats.push({ type: 'LOW_VIS', label: `Visibilité ${visM}m`, value: `${visM}m`,
        severity: sev(base), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  if (Array.isArray(clouds)) {
    for (const cloud of clouds) {
      if (cloud.type === 'CB' || cloud.type === 'TCU') {
        // Vérifier que le CB/TCU est explicit dans le segment (pas hérité)
        if (isInheritedInBecmgOrFm(ci, segment, cloud.type)) continue;
        const isCB = cloud.type === 'CB';
        const base: ThreatSeverity = isCB ? 'orange'
          : (cloud.base != null && cloud.base < 1000) ? 'orange' : 'yellow';
        threats.push({ type: 'CB_TCU',
          label: cloud.base != null ? `${cloud.type} base ${cloud.base}ft` : `${cloud.type}`,
          value: `${cloud.cover}${cloudBaseToTafCode(cloud.base)}${cloud.type}`,
          severity: sev(base), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
      }
    }
    const ceilingLayers = clouds
      .filter((c: any) => (c.cover === 'BKN' || c.cover === 'OVC')
        && c.type !== 'CB' && c.type !== 'TCU'
        && c.base != null && c.base <= 1000)
      .sort((a: any, b: any) => a.base - b.base);
    if (ceilingLayers.length > 0) {
      const lowest = ceilingLayers[0];
      const base: ThreatSeverity = lowest.base < 100 ? 'red' : lowest.base < 500 ? 'orange' : 'yellow';
      threats.push({ type: 'LOW_CEILING', label: `Plafond ${lowest.base}ft`,
        value: `${lowest.cover}${cloudBaseToTafCode(lowest.base)}`,
        severity: sev(base), periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  return threats;
}

export function parseTafToRisks(tafData: any[]): TafRisk[] {
  const risks: TafRisk[] = [];
  for (const taf of tafData) {
    const icao: string = taf.icaoId ?? taf.stationId ?? '';
    if (!icao) continue;
    const fcsts: any[]   = taf.fcsts ?? [];
    const rawTaf: string = taf.rawTAF ?? '';
    const issueTime      = taf.issueTime ?? null;
    const ciMap          = buildCiMapFromRaw(rawTaf, issueTime);

    const allThreats: TafThreat[] = [];
    for (const fcst of fcsts) {
      const entry   = resolveCiEntry(fcst, ciMap);
      const ci      = entry?.ci      ?? 'INITIAL/FM';
      const segment = entry?.segment ?? '';
      allThreats.push(...parseThreatsFromForecast(fcst, ci, segment));
    }
    if (allThreats.length === 0) continue;
    const worstSeverity = allThreats.reduce<ThreatSeverity>((worst, t) =>
      SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[worst] ? t.severity : worst, 'yellow');
    risks.push({
      icao, iata: getIata(icao), name: getAirportName(icao),
      rawTaf,
      worstSeverity,
      threats: allThreats.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    });
  }
  return risks.sort((a, b) => SEVERITY_ORDER[a.worstSeverity] - SEVERITY_ORDER[b.worstSeverity]);
}

// ─── Cache Redis ─────────────────────────────────────────────────────────────
const KV_KEY_TAF     = 'taf_risks_cache_v4'; // v4 : filtre héritage BECMG/FM
const KV_TTL_TAF_SEC = 30 * 60;

export async function fetchTafRisks(force = false, lcOnly = true): Promise<TafRisk[]> {
  if (!force && redis) {
    try {
      const cached = await redis.get<TafRisk[]>(KV_KEY_TAF);
      if (cached && cached.length > 0) {
        console.log(`[TAF] Cache KV HIT — ${cached.length} aéroports avec risques`);
        return lcOnly ? cached.filter(r => AF_LC_IATA.has(r.iata)) : cached;
      }
    } catch (e) {
      console.warn('[TAF] KV read error:', e);
    }
  }

  const CHUNK_SIZE = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < AF_AIRPORT_ICAOS.length; i += CHUNK_SIZE) {
    chunks.push(AF_AIRPORT_ICAOS.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.allSettled(
    chunks.map(chunk =>
      fetch(
        `https://aviationweather.gov/api/data/taf?ids=${chunk.join(',')}&format=json&metar=false`,
        { headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' }, signal: AbortSignal.timeout(15000) }
      ).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    )
  );

  const allTafs: any[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) allTafs.push(...result.value);
    else if (result.status === 'rejected') console.warn('[TAF] chunk fetch failed:', result.reason);
  }

  const latestByIcao = new Map<string, any>();
  for (const taf of allTafs) {
    const icao = taf.icaoId ?? taf.stationId;
    if (!icao) continue;
    const existing = latestByIcao.get(icao);
    if (!existing || (taf.issueTime ?? 0) > (existing.issueTime ?? 0)) {
      latestByIcao.set(icao, taf);
    }
  }
  const deduped = [...latestByIcao.values()];
  console.log(`[TAF] ${allTafs.length} TAFs bruts → ${deduped.length} après déduplication`);

  const allRisks = parseTafToRisks(deduped);
  const risks = lcOnly ? allRisks.filter(r => AF_LC_IATA.has(r.iata)) : allRisks;
  console.log(`[TAF] ${allRisks.length} risques total → ${risks.length} ${lcOnly ? 'escales LC' : 'tous aéroports'}`);

  if (redis && allRisks.length > 0) {
    try {
      await redis.set(KV_KEY_TAF, allRisks, { ex: KV_TTL_TAF_SEC });
      console.log(`[TAF] ${allRisks.length} risques stockés en KV (TTL ${KV_TTL_TAF_SEC}s)`);
    } catch (e) {
      console.warn('[TAF] KV write error:', e);
    }
  }

  return risks;
}
