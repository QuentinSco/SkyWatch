// ─── TAF Parser ───────────────────────────────────────────────────────────────
// Source : AviationWeather.gov API (100% gratuit, NOAA)

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

// ─── Réseau AF LC — IATA → ICAO ───────────────────────────────────────────────
// NBJ : code IATA non résolu — exclu jusqu'à vérification
// NLU (Felipe Ángeles) : ICAO MMSM — TAF parfois absent sur AWC
// PIK (Glasgow Prestwick) : EGPK — vérifier si AF ou charter
export const AF_IATA_TO_ICAO: Record<string, string> = {
  ABJ: 'DIAP', // Abidjan
  ABV: 'DNAA', // Abuja
  ATL: 'KATL', // Atlanta
  AUH: 'OMAA', // Abu Dhabi
  BEY: 'OLBA', // Beyrouth
  BKK: 'VTBS', // Bangkok Suvarnabhumi
  BLR: 'VOBL', // Bengaluru
  BOG: 'SKBO', // Bogotá
  BOM: 'VABB', // Mumbai
  BOS: 'KBOS', // Boston
  BZV: 'FCBB', // Brazzaville
  CAI: 'HECA', // Le Caire
  CAY: 'SOCA', // Cayenne
  CDG: 'LFPG', // Paris CDG
  CKY: 'GUCY', // Conakry
  COO: 'DBBB', // Cotonou
  CPT: 'FACT', // Le Cap
  CUN: 'MMUN', // Cancún
  DEL: 'VIDP', // Delhi
  DEN: 'KDEN', // Denver
  DFW: 'KDFW', // Dallas/Fort Worth
  DLA: 'FKKD', // Douala
  DSS: 'GOBD', // Dakar Blaise Diagne
  DTW: 'KDTW', // Detroit
  DUB: 'EIDW', // Dublin
  DXB: 'OMDB', // Dubaï
  EWR: 'KEWR', // Newark
  EZE: 'SAEZ', // Buenos Aires Ezeiza
  FDF: 'TFFF', // Fort-de-France
  FIH: 'FZAA', // Kinshasa
  FOR: 'SBFZ', // Fortaleza
  GDL: 'MMGL', // Guadalajara
  GIG: 'SBGL', // Rio de Janeiro Galeão
  GRU: 'SBGR', // São Paulo Guarulhos
  HAV: 'MUHA', // La Havane
  HKG: 'VHHH', // Hong Kong
  HKT: 'VTSP', // Phuket
  HND: 'RJTT', // Tokyo Haneda
  IAD: 'KIAD', // Washington Dulles
  IAH: 'KIAH', // Houston
  ICN: 'RKSI', // Séoul Incheon
  JFK: 'KJFK', // New York JFK
  JIB: 'HDAM', // Djibouti
  JNB: 'FAOR', // Johannesburg
  JRO: 'HTKJ', // Kilimandjaro
  KIX: 'RJBB', // Osaka Kansai
  LAS: 'KLAS', // Las Vegas
  LAX: 'KLAX', // Los Angeles
  LBV: 'FOOL', // Libreville
  LDE: 'LFBT', // Lourdes-Tarbes
  LFW: 'DXXX', // Lomé
  LIM: 'SPIM', // Lima
  LOS: 'DNMM', // Lagos
  MCO: 'KMCO', // Orlando
  MEX: 'MMMX', // Mexico City Benito Juárez
  MIA: 'KMIA', // Miami
  MNL: 'RPLL', // Manille
  MRU: 'FIMP', // Maurice
  MSP: 'KMSP', // Minneapolis
  NAS: 'MYNN', // Nassau
  NBJ: 'FNBJ', // Luanda
  NBO: 'HKJK', // Nairobi
  NCE: 'LFMN', // Nice
  NDJ: 'FTTJ', // N'Djamena
  NKC: 'GQNN', // Nouakchott
  NLU: 'MMSM', // Mexico City Felipe Ángeles
  NSI: 'FKYS', // Yaoundé Nsimalen
  ORD: 'KORD', // Chicago O'Hare
  ORY: 'LFPO', // Paris Orly
  PEK: 'ZBAA', // Pékin Capital
  PHX: 'KPHX', // Phoenix
  PIK: 'EGPK', // Glasgow Prestwick
  PNR: 'FCPP', // Pointe-Noire
  PPT: 'NTAA', // Papeete
  PTP: 'TFFR', // Pointe-à-Pitre
  PTY: 'MPTO', // Panama City
  PUJ: 'MDPC', // Punta Cana
  PVG: 'ZSPD', // Shanghai Pudong
  RDU: 'KRDU', // Raleigh-Durham
  RUH: 'OERK', // Riyad
  RUN: 'FMEE', // La Réunion
  SAN: 'KSAN', // San Diego
  SCL: 'SCEL', // Santiago
  SEA: 'KSEA', // Seattle
  SFO: 'KSFO', // San Francisco
  SGN: 'VVTS', // Ho Chi Minh City
  SIN: 'WSSS', // Singapour
  SJO: 'MROC', // San José Costa Rica
  SSA: 'SBSV', // Salvador de Bahia
  SSG: 'FGBT', // Malabo
  SXM: 'TNCM', // Sint Maarten
  TLV: 'LLBG', // Tel Aviv
  TNR: 'FMMI', // Antananarivo
  YOW: 'CYOW', // Ottawa
  YUL: 'CYUL', // Montréal
  YVR: 'CYVR', // Vancouver
  YYZ: 'CYYZ', // Toronto
  ZNZ: 'HTZA', // Zanzibar
};

// Index inverse ICAO → IATA
const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

export const AF_AIRPORT_ICAOS: string[] = Object.values(AF_IATA_TO_ICAO);

const AIRPORT_NAMES: Record<string, string> = {
  DIAP: 'Abidjan',            DNAA: 'Abuja',
  KATL: 'Atlanta',            OMAA: 'Abu Dhabi',
  OLBA: 'Beyrouth',           VTBS: 'Bangkok',
  VOBL: 'Bengaluru',          SKBO: 'Bogotá',
  VABB: 'Mumbai',             KBOS: 'Boston',
  FCBB: 'Brazzaville',        HECA: 'Le Caire',
  SOCA: 'Cayenne',            LFPG: 'Paris CDG',
  GUCY: 'Conakry',            DBBB: 'Cotonou',
  FACT: 'Le Cap',             MMUN: 'Cancún',
  VIDP: 'Delhi',              KDEN: 'Denver',
  KDFW: 'Dallas/Fort Worth',  FKKD: 'Douala',
  GOBD: 'Dakar',              KDTW: 'Detroit',
  EIDW: 'Dublin',             OMDB: 'Dubaï',
  KEWR: 'Newark',             SAEZ: 'Buenos Aires',
  TFFF: 'Fort-de-France',     FZAA: 'Kinshasa',
  SBFZ: 'Fortaleza',          MMGL: 'Guadalajara',
  SBGL: 'Rio de Janeiro',     SBGR: 'São Paulo',
  MUHA: 'La Havane',          VHHH: 'Hong Kong',
  VTSP: 'Phuket',             RJTT: 'Tokyo Haneda',
  KIAD: 'Washington Dulles',  KIAH: 'Houston',
  RKSI: 'Séoul Incheon',      KJFK: 'New York JFK',
  HDAM: 'Djibouti',           FAOR: 'Johannesburg',
  HTKJ: 'Kilimandjaro',       RJBB: 'Osaka Kansai',
  KLAS: 'Las Vegas',          KLAX: 'Los Angeles',
  FOOL: 'Libreville',         LFBT: 'Lourdes-Tarbes',
  DXXX: 'Lomé',               SPIM: 'Lima',
  FNBJ: 'Lunada',
  DNMM: 'Lagos',              KMCO: 'Orlando',
  MMMX: 'Mexico City (MEX)',  KMIA: 'Miami',
  RPLL: 'Manille',            FIMP: 'Maurice',
  KMSP: 'Minneapolis',        MYNN: 'Nassau',
  HKJK: 'Nairobi',            LFMN: 'Nice',
  FTTJ: "N'Djamena",          GQNN: 'Nouakchott',
  MMSM: 'Mexico City (NLU)',  FKYS: 'Yaoundé',
  KORD: 'Chicago O\'Hare',    LFPO: 'Paris Orly',
  ZBAA: 'Pékin Capital',      KPHX: 'Phoenix',
  EGPK: 'Glasgow Prestwick',  FCPP: 'Pointe-Noire',
  NTAA: 'Papeete',            TFFR: 'Pointe-à-Pitre',
  MPTO: 'Panama City',        MDPC: 'Punta Cana',
  ZSPD: 'Shanghai Pudong',    KRDU: 'Raleigh-Durham',
  OERK: 'Riyad',              FMEE: 'La Réunion',
  KSAN: 'San Diego',          SCEL: 'Santiago',
  KSEA: 'Seattle',            KSFO: 'San Francisco',
  VVTS: 'Ho Chi Minh City',   WSSS: 'Singapour',
  MROC: 'San José CR',        SBSV: 'Salvador de Bahia',
  FGBT: 'Malabo',             TNCM: 'Sint Maarten',
  LLBG: 'Tel Aviv',           FMMI: 'Antananarivo',
  CYOW: 'Ottawa',             CYUL: 'Montréal',
  CYVR: 'Vancouver',          CYYZ: 'Toronto',
  HTZA: 'Zanzibar',
};

const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

const SM_TO_M = 1609.344;
function smToMeters(sm: number | string): number {
  if (sm === '6+' || sm === 'P6SM') return 9999;
  const raw = parseFloat(String(sm)) * SM_TO_M;
  return Math.round(raw / 50) * 50;
}

function getAirportName(icao: string): string {
  return AIRPORT_NAMES[icao] ?? icao;
}

function getIata(icao: string): string {
  return ICAO_TO_IATA[icao] ?? icao;
}

function buildSnippet(fcst: any): string {
  const wdir  = fcst.wdir != null ? String(fcst.wdir).padStart(3, '0') : 'VRB';
  const wspd  = fcst.wspd != null ? String(fcst.wspd).padStart(2, '0') : null;
  const wgst  = fcst.wgst != null ? `G${String(fcst.wgst).padStart(2, '0')}` : '';
  const windStr = wspd ? `${wdir}${wspd}${wgst}KT` : '';
  const wxStr   = fcst.wxString ?? '';
  const visRaw  = fcst.visib;
  const visStr  = visRaw && visRaw !== '6+' ? `VIS ${smToMeters(visRaw)}m` : '';
  const cbStr   = fcst.clouds
    ?.filter((c: any) => c.type === 'CB' || c.type === 'TCU')
    .map((c: any) => `${c.cover}${c.base}${c.type}`)
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
    threats.push({
      type: 'THUNDERSTORM', label: 'Orage', value: wxString,
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  if (wxString && /\bFC\b/.test(wxString)) {
    threats.push({
      type: 'FUNNEL_CLOUD', label: 'Trombe / Tornade', value: 'FC',
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  if (wxString && /\bSN\b|\bBLSN\b|\bSNGR\b/.test(wxString)) {
    const heavy = /\+SN|\+RASN|BLSN/.test(wxString);
    threats.push({
      type: 'SNOW', label: heavy ? 'Neige forte / Tempête' : 'Neige', value: wxString,
      severity: heavy ? 'red' : 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  if (wxString && /\bFZRA\b|\bFZDZ\b|\bFZFG\b/.test(wxString)) {
    threats.push({
      type: 'FREEZING', label: 'Précip. verglaçantes', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  if (wxString && /\bGR\b|\bGS\b/.test(wxString)) {
    threats.push({
      type: 'HAIL', label: 'Grêle', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  if (wspd != null || wgst != null) {
    const maxWind = Math.max(wspd ?? 0, wgst ?? 0);
    if (maxWind >= 30) {
      const windStr = buildSnippet(fcst).split(' ')[0];
      threats.push({
        type: 'WIND',
        label: wgst != null && wgst >= 30 ? `Rafales ${wgst}kt` : `Vent ${wspd}kt`,
        value: windStr,
        severity: maxWind >= 40 ? 'red' : 'orange',
        periodStart: timeFrom, periodEnd: timeTo,
        changeIndicator: ci, snippet,
      });
    }
  }

  // ✅ Visibilité en mètres — ORANGE < 1000m / RED < 400m
  if (visib != null && visib !== '6+') {
    const visM = smToMeters(visib);
    if (visM < 1000) {
      threats.push({
        type: 'LOW_VIS',
        label: `Visibilité ${visM}m`,
        value: `${visM}m`,
        severity: visM < 400 ? 'red' : 'orange',
        periodStart: timeFrom, periodEnd: timeTo,
        changeIndicator: ci, snippet,
      });
    }
  }

  // ✅ CB / TCU base < 200ft uniquement
  if (Array.isArray(clouds)) {
    for (const cloud of clouds) {
      if ((cloud.type === 'CB' || cloud.type === 'TCU') && cloud.base != null && cloud.base < 200) {
        threats.push({
          type: 'CB_TCU',
          label: `${cloud.type} base ${cloud.base}ft`,
          value: `${cloud.cover}${cloud.base}${cloud.type}`,
          severity: 'orange',
          periodStart: timeFrom, periodEnd: timeTo,
          changeIndicator: ci, snippet,
        });
      }
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
      SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[worst] ? t.severity : worst,
      'yellow'
    );

    risks.push({
      icao,
      iata: getIata(icao),
      name: getAirportName(icao),
      rawTaf: taf.rawTAF ?? '',
      worstSeverity,
      threats: allThreats.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    });
  }

  return risks.sort((a, b) => SEVERITY_ORDER[a.worstSeverity] - SEVERITY_ORDER[b.worstSeverity]);
}

export async function fetchTafRisks(): Promise<TafRisk[]> {
  const CHUNK_SIZE = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < AF_AIRPORT_ICAOS.length; i += CHUNK_SIZE) {
    chunks.push(AF_AIRPORT_ICAOS.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.allSettled(
    chunks.map(chunk =>
      fetch(
        `https://aviationweather.gov/api/data/taf?ids=${chunk.join(',')}&format=json&metar=false`,
        {
          headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' },
          signal: AbortSignal.timeout(15000),
        }
      ).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    )
  );

  const allTafs: any[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allTafs.push(...result.value);
    } else if (result.status === 'rejected') {
      console.warn('[TAF] chunk fetch failed:', result.reason);
    }
  }

  console.log(`[TAF] ${allTafs.length} TAFs récupérés sur ${AF_AIRPORT_ICAOS.length} demandés`);
  return parseTafToRisks(allTafs);
}
