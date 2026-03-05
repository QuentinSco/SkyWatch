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

// ─── Réseau AF complet (LC + MC + régional) — IATA → ICAO ───────────────────
export const AF_IATA_TO_ICAO: Record<string, string> = {
  // ── Afrique ────────────────────────────────────────────────────────────────
  ABJ: 'DIAP', // Abidjan
  ABV: 'DNAA', // Abuja
  BZV: 'FCBB', // Brazzaville
  CKY: 'GUCY', // Conakry
  CMN: 'GMMN', // Casablanca
  COO: 'DBBB', // Cotonou
  CPT: 'FACT', // Le Cap
  DLA: 'FKKD', // Douala
  DSS: 'GOBD', // Dakar Blaise Diagne
  FIH: 'FZAA', // Kinshasa
  JIB: 'HDAM', // Djibouti
  JNB: 'FAOR', // Johannesburg
  JRO: 'HTKJ', // Kilimandjaro
  LBV: 'FOOL', // Libreville
  LFW: 'DXXX', // Lomé
  LOS: 'DNMM', // Lagos
  MRU: 'FIMP', // Maurice
  NBJ: 'FNBJ', // Luanda
  NBO: 'HKJK', // Nairobi
  NDJ: 'FTTJ', // N'Djamena
  NKC: 'GQNN', // Nouakchott
  NSI: 'FKYS', // Yaoundé
  PNR: 'FCPP', // Pointe-Noire
  RAK: 'GMMX', // Marrakech
  RBA: 'GMME', // Rabat
  RUN: 'FMEE', // La Réunion
  SSG: 'FGBT', // Malabo
  TNG: 'GMTN', // Tanger
  TNR: 'FMMI', // Antananarivo
  TUN: 'DTTA', // Tunis
  ZNZ: 'HTZA', // Zanzibar

  // ── Amériques ──────────────────────────────────────────────────────────────
  ATL: 'KATL', // Atlanta
  BEL: 'SBBE', // Belém
  BOG: 'SKBO', // Bogotá
  BOS: 'KBOS', // Boston
  CAY: 'SOCA', // Cayenne
  CUN: 'MMUN', // Cancún
  DEN: 'KDEN', // Denver
  DFW: 'KDFW', // Dallas/Fort Worth
  DTW: 'KDTW', // Detroit
  EWR: 'KEWR', // Newark
  EZE: 'SAEZ', // Buenos Aires Ezeiza
  FDF: 'TFFF', // Fort-de-France
  FOR: 'SBFZ', // Fortaleza
  GDL: 'MMGL', // Guadalajara
  GIG: 'SBGL', // Rio de Janeiro Galeão
  GRU: 'SBGR', // São Paulo Guarulhos
  HAV: 'MUHA', // La Havane
  IAD: 'KIAD', // Washington Dulles
  IAH: 'KIAH', // Houston
  JFK: 'KJFK', // New York JFK
  LAS: 'KLAS', // Las Vegas
  LAX: 'KLAX', // Los Angeles
  LIM: 'SPIM', // Lima
  MCO: 'KMCO', // Orlando
  MEX: 'MMMX', // Mexico City Benito Juárez
  MIA: 'KMIA', // Miami
  MSP: 'KMSP', // Minneapolis
  NAS: 'MYNN', // Nassau
  NLU: 'MMSM', // Mexico City Felipe Ángeles
  ORD: 'KORD', // Chicago O'Hare
  PHX: 'KPHX', // Phoenix
  PNR: 'FCPP', // Pointe-Noire (aussi Afrique)
  PPT: 'NTAA', // Papeete
  PTP: 'TFFR', // Pointe-à-Pitre
  PTY: 'MPTO', // Panama City
  PUJ: 'MDPC', // Punta Cana
  RDU: 'KRDU', // Raleigh-Durham
  RUH: 'OERK', // Riyad
  SAN: 'KSAN', // San Diego
  SCL: 'SCEL', // Santiago
  SEA: 'KSEA', // Seattle
  SFO: 'KSFO', // San Francisco
  SJO: 'MROC', // San José CR
  SSA: 'SBSV', // Salvador de Bahia
  SXM: 'TNCM', // Sint Maarten
  YOW: 'CYOW', // Ottawa
  YUL: 'CYUL', // Montréal
  YVR: 'CYVR', // Vancouver
  YYZ: 'CYYZ', // Toronto

  // ── Asie / Pacifique ───────────────────────────────────────────────────────
  BKK: 'VTBS', // Bangkok Suvarnabhumi
  BLR: 'VOBL', // Bengaluru
  BOM: 'VABB', // Mumbai
  DEL: 'VIDP', // Delhi
  HKG: 'VHHH', // Hong Kong
  HKT: 'VTSP', // Phuket
  HND: 'RJTT', // Tokyo Haneda
  ICN: 'RKSI', // Séoul Incheon
  KIX: 'RJBB', // Osaka Kansai
  KUL: 'WMKK', // Kuala Lumpur
  MNL: 'RPLL', // Manille
  PEK: 'ZBAA', // Pékin Capital
  PPT: 'NTAA', // Papeete (aussi Amériques)
  PVG: 'ZSPD', // Shanghai Pudong
  SGN: 'VVTS', // Ho Chi Minh City
  SIN: 'WSSS', // Singapour

  // ── Moyen-Orient ───────────────────────────────────────────────────────────
  AUH: 'OMAA', // Abu Dhabi
  BEY: 'OLBA', // Beyrouth
  DXB: 'OMDB', // Dubaï
  EVN: 'UDYZ', // Erevan
  IST: 'LTFM', // Istanbul
  TBS: 'UGTB', // Tbilissi
  TLV: 'LLBG', // Tel Aviv

  // ── Europe ─────────────────────────────────────────────────────────────────
  AGP: 'LEMG', // Malaga
  AJA: 'LFKJ', // Ajaccio
  ALG: 'DAAG', // Alger
  AMS: 'EHAM', // Amsterdam
  ARN: 'ESSA', // Stockholm Arlanda
  ATH: 'LGAV', // Athènes
  BCN: 'LEBL', // Barcelone
  BER: 'EDDB', // Berlin Brandenburg
  BES: 'LFRB', // Brest
  BGO: 'ENBR', // Bergen
  BHX: 'EGBB', // Birmingham
  BIA: 'LFKB', // Bastia
  BIO: 'LEBB', // Bilbao
  BIQ: 'LFBZ', // Biarritz
  BLL: 'EKBI', // Billund
  BLQ: 'LIPE', // Bologne
  BOD: 'LFBD', // Bordeaux
  BRI: 'LIBD', // Bari
  BSL: 'LFSB', // Bâle-Mulhouse
  BUD: 'LHBP', // Budapest
  CAI: 'HECA', // Le Caire
  CDG: 'LFPG', // Paris CDG
  CFE: 'LFLC', // Clermont-Ferrand
  CFR: 'LFRK', // Caen
  CLY: 'LFKC', // Calvi
  CPH: 'EKCH', // Copenhague
  CTA: 'LICC', // Catane
  DBV: 'LDDU', // Dubrovnik
  DNR: 'LFRD', // Dinard
  DUB: 'EIDW', // Dublin
  DUS: 'EDDL', // Düsseldorf
  EDI: 'EGPH', // Édimbourg
  FCO: 'LIRF', // Rome Fiumicino
  FLR: 'LIRQ', // Florence
  FRA: 'EDDF', // Francfort
  FSC: 'LFKS', // Figari
  GOT: 'ESGG', // Göteborg
  GVA: 'LSGG', // Genève
  HAJ: 'EDDV', // Hanovre
  HAM: 'EDDH', // Hambourg
  HEL: 'EFHK', // Helsinki
  HER: 'LGIR', // Héraklion
  IBZ: 'LEIB', // Ibiza
  JMK: 'LGMK', // Mykonos
  KRK: 'EPKK', // Cracovie
  KTT: 'EFKT', // Kittilä
  LGW: 'EGKK', // Londres Gatwick
  LHR: 'EGLL', // Londres Heathrow
  LIL: 'LFQQ', // Lille
  LIN: 'LIML', // Milan Linate
  LIS: 'LPPT', // Lisbonne
  LJU: 'LJLJ', // Ljubljana
  LYS: 'LFLL', // Lyon
  MAD: 'LEMD', // Madrid
  MAN: 'EGCC', // Manchester
  MLA: 'LMML', // Malte
  MPL: 'LFMT', // Montpellier
  MRS: 'LFML', // Marseille
  MUC: 'EDDM', // Munich
  MXP: 'LIMC', // Milan Malpensa
  NAP: 'LIRN', // Naples
  NCE: 'LFMN', // Nice
  NCL: 'EGNT', // Newcastle
  NTE: 'LFRS', // Nantes
  NUE: 'EDDN', // Nuremberg
  OLB: 'LIEO', // Olbia
  OPO: 'LPPR', // Porto
  ORD: 'KORD', // Chicago (aussi Amériques)
  ORK: 'EICK', // Cork
  ORN: 'DAOO', // Oran
  ORY: 'LFPO', // Paris Orly
  OSL: 'ENGM', // Oslo
  OTP: 'LROP', // Bucarest
  PIK: 'EGPK', // Glasgow Prestwick
  PMI: 'LEPA', // Palma de Majorque
  PMO: 'LICJ', // Palerme
  PRG: 'LKPR', // Prague
  PUF: 'LFBP', // Pau
  RNS: 'LFRN', // Rennes
  RVN: 'EFRO', // Rovaniemi
  STR: 'EDDS', // Stuttgart
  SVQ: 'LEZL', // Séville
  TLS: 'LFBO', // Toulouse
  TOS: 'ENTC', // Tromsø
  TRN: 'LIMF', // Turin
  VCE: 'LIPZ', // Venise
  VIE: 'LOWW', // Vienne
  VLC: 'LEVC', // Valence
  VRN: 'LIPX', // Vérone
  WAW: 'EPWA', // Varsovie
  ZAG: 'LDZA', // Zagreb
  ZRH: 'LSZH', // Zurich

  // ── Afrique du Nord (déjà listés ci-dessus mais rappel) ────────────────────
  // ALG, CMN, ORN, RAK, RBA, TNG, TUN → déjà présents

  // ── Autres ─────────────────────────────────────────────────────────────────
  LDE: 'LFBT', // Lourdes-Tarbes
};

// Index inverse ICAO → IATA
const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

export const AF_AIRPORT_ICAOS: string[] = [...new Set(Object.values(AF_IATA_TO_ICAO))];

const AIRPORT_NAMES: Record<string, string> = {
  // ── Afrique ────────────────────────────────────────────────────────────────
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

  // ── Amériques ──────────────────────────────────────────────────────────────
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

  // ── Asie / Pacifique ───────────────────────────────────────────────────────
  VTBS: 'Bangkok',            VOBL: 'Bengaluru',
  VABB: 'Mumbai',             VIDP: 'Delhi',
  VHHH: 'Hong Kong',          VTSP: 'Phuket',
  RJTT: 'Tokyo Haneda',       RKSI: 'Séoul Incheon',
  RJBB: 'Osaka Kansai',       WMKK: 'Kuala Lumpur',
  RPLL: 'Manille',            ZBAA: 'Pékin Capital',
  ZSPD: 'Shanghai Pudong',    VVTS: 'Ho Chi Minh City',
  WSSS: 'Singapour',

  // ── Moyen-Orient ───────────────────────────────────────────────────────────
  OMAA: 'Abu Dhabi',          OLBA: 'Beyrouth',
  OMDB: 'Dubaï',              UDYZ: 'Erevan',
  LTFM: 'Istanbul',           UGTB: 'Tbilissi',
  LLBG: 'Tel Aviv',

  // ── Europe ─────────────────────────────────────────────────────────────────
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

function getAirportName(icao: string): string {
  return AIRPORT_NAMES[icao] ?? icao;
}

function getIata(icao: string): string {
  return ICAO_TO_IATA[icao] ?? icao;
}

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

function formatChangeIndicator(ci: string | null | undefined): string {
  if (!ci || ci === 'FM') return 'INITIAL/FM';
  return ci;
}

function parseThreatsFromForecast(fcst: any): TafThreat[] {
  const threats: TafThreat[] = [];
  const { timeFrom, timeTo, wspd, wgst, wxString, clouds, visib, changeIndicator } = fcst;
  const snippet = buildSnippet(fcst);
  const ci = formatChangeIndicator(changeIndicator);

  if (wxString && /\bTSRA*/.test(wxString)) {
    threats.push({ type: 'THUNDERSTORM', label: 'Orage', value: wxString,
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bFC\b/.test(wxString)) {
    threats.push({ type: 'FUNNEL_CLOUD', label: 'Trombe / Tornade', value: 'FC',
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bSN\b|\bBLSN\b|\bSNGR\b/.test(wxString)) {
    const heavy = /\+SN|\+RASN|BLSN/.test(wxString);
    threats.push({ type: 'SNOW', label: heavy ? 'Neige forte / Tempête' : 'Neige', value: wxString,
      severity: heavy ? 'red' : 'orange', periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bFZRA\b|\bFZDZ\b|\bFZFG\b/.test(wxString)) {
    threats.push({ type: 'FREEZING', label: 'Précip. verglaçantes', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wxString && /\bGR\b|\bGS\b/.test(wxString)) {
    threats.push({ type: 'HAIL', label: 'Grêle', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
  }
  if (wspd != null || wgst != null) {
    const maxWind = Math.max(wspd ?? 0, wgst ?? 0);
    if (maxWind >= 30) {
      const windStr = buildSnippet(fcst).split(' ')[0];
      threats.push({ type: 'WIND',
        label: wgst != null && wgst >= 30 ? `Rafales ${wgst}kt` : `Vent ${wspd}kt`,
        value: windStr, severity: maxWind >= 40 ? 'red' : 'orange',
        periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  if (visib != null && visib !== '6+') {
    const visM = visMtoMeters(visib);
    if (visM !== null && visM < 3500 && groupHasExplicitVisib(fcst)) {
      const severity: ThreatSeverity = visM < 400 ? 'red' : visM < 1000 ? 'orange' : 'yellow';
      threats.push({ type: 'LOW_VIS', label: `Visibilité ${visM}m`, value: `${visM}m`,
        severity, periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  if (Array.isArray(clouds)) {
    for (const cloud of clouds) {
      if (cloud.type === 'CB' || cloud.type === 'TCU') {
        const isCB = cloud.type === 'CB';
        const severity: ThreatSeverity = isCB ? 'orange'
          : (cloud.base != null && cloud.base < 1000) ? 'orange' : 'yellow';
        threats.push({ type: 'CB_TCU',
          label: cloud.base != null ? `${cloud.type} base ${cloud.base}ft` : `${cloud.type}`,
          value: `${cloud.cover}${cloudBaseToTafCode(cloud.base)}${cloud.type}`,
          severity, periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
      }
    }
    const ceilingLayers = clouds
      .filter((c: any) => (c.cover === 'BKN' || c.cover === 'OVC')
        && c.type !== 'CB' && c.type !== 'TCU'
        && c.base != null && c.base <= 1000)
      .sort((a: any, b: any) => a.base - b.base);
    if (ceilingLayers.length > 0) {
      const lowest = ceilingLayers[0];
      const severity: ThreatSeverity = lowest.base < 100 ? 'red' : lowest.base < 500 ? 'orange' : 'yellow';
      threats.push({ type: 'LOW_CEILING', label: `Plafond ${lowest.base}ft`,
        value: `${lowest.cover}${cloudBaseToTafCode(lowest.base)}`,
        severity, periodStart: timeFrom, periodEnd: timeTo, changeIndicator: ci, snippet });
    }
  }
  return threats;
}

export function parseTafToRisks(tafData: any[]): TafRisk[] {
  const risks: TafRisk[] = [];
  for (const taf of tafData) {
    const icao: string = taf.icaoId ?? taf.stationId ?? '';
    if (!icao) continue;
    const fcsts: any[] = taf.fcsts ?? [];
    const allThreats: TafThreat[] = [];
    for (const fcst of fcsts) {
      allThreats.push(...parseThreatsFromForecast(fcst));
    }
    if (allThreats.length === 0) continue;
    const worstSeverity = allThreats.reduce<ThreatSeverity>((worst, t) =>
      SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[worst] ? t.severity : worst, 'yellow');
    risks.push({
      icao, iata: getIata(icao), name: getAirportName(icao),
      rawTaf: taf.rawTAF ?? '',
      worstSeverity,
      threats: allThreats.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    });
  }
  return risks.sort((a, b) => SEVERITY_ORDER[a.worstSeverity] - SEVERITY_ORDER[b.worstSeverity]);
}

// ─── Cache Redis ─────────────────────────────────────────────────────────────
const KV_KEY_TAF     = 'taf_risks_cache';
const KV_TTL_TAF_SEC = 30 * 60;

export async function fetchTafRisks(force = false): Promise<TafRisk[]> {
  if (!force && redis) {
    try {
      const cached = await redis.get<TafRisk[]>(KV_KEY_TAF);
      if (cached && cached.length > 0) {
        console.log(`[TAF] Cache KV HIT — ${cached.length} aéroports avec risques`);
        return cached;
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

  const risks = parseTafToRisks(deduped);

  if (redis && risks.length > 0) {
    try {
      await redis.set(KV_KEY_TAF, risks, { ex: KV_TTL_TAF_SEC });
      console.log(`[TAF] ${risks.length} risques stockés en KV (TTL ${KV_TTL_TAF_SEC}s)`);
    } catch (e) {
      console.warn('[TAF] KV write error:', e);
    }
  }

  return risks;
}
