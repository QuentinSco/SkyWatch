// ─── TAF Parser ─────────────────────────────────────────────────────────────────────────────────
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

// ─── Réseau AF LC — IATA → ICAO ─────────────────────────────────────────────────────────────
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
  JRO: 'HTKJ', // Kilimandjarô
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
  GOBD: 'Dakar',              KDTW: 'Détroit',
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
  HTKJ: 'Kilimandjarô',       RJBB: 'Osaka Kansai',
  KLAS: 'Las Vegas',          KLAX: 'Los Angeles',
  FOOL: 'Libreville',         LFBT: 'Lourdes-Tarbes',
  DXXX: 'Lomé',               SPIM: 'Lima',
  FNBJ: 'Luanda',
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

/**
 * Converts a visibility value from the AWC JSON API to metres.
 *
 * AWC returns visib in two formats depending on the country :
 *   • US TAFs  : statute miles as a decimal number or the string '6+' / 'P6SM'
 *     e.g.  1.5  → ~2414m   |  0.25 → ~402m   |  '6+' → 9999m
 *   • ICAO TAFs (non-US) : metres as a whole integer string
 *     e.g.  '8000' → 8000m  |  '0200' → 200m   |  '9999' → 9999m
 *
 * Heuristic : if the numeric value is ≥ 800 AND there is no fractional part,
 * treat it as metres directly.  Otherwise convert from SM.
 *
 * Edge-cases handled :
 *   • '6+' / 'P6SM' (US) → 9999
 *   • '9999' (ICAO max) → 9999
 *   • null / undefined / '' → null  (caller must check)
 */
function visMtoMeters(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (s === '6+' || s.toUpperCase() === 'P6SM' || s === '9999') return 9999;

  const n = parseFloat(s);
  if (isNaN(n)) return null;

  // — ICAO format (metres) : entier ≥ 800
  // Les valeurs ICAO courantes : 0100 0200 0400 0500 0600 0800 1000 1500 2000
  //   3000 4000 5000 6000 7000 8000 9000 9999
  // Une valeur SM avec partie décimale ou < 10 ne peut PAS être ≥ 800 sans être en mètres.
  if (Number.isInteger(n) && n >= 800) return n;   // déjà en mètres

  // — US format (statute miles → mètres)
  const SM_TO_M = 1609.344;
  return Math.round((n * SM_TO_M) / 50) * 50;
}

function getAirportName(icao: string): string {
  return AIRPORT_NAMES[icao] ?? icao;
}

function getIata(icao: string): string {
  return ICAO_TO_IATA[icao] ?? icao;
}

/**
 * Indique si le groupe de changement FOURNIT EXPLICITEMENT une visibilité.
 * L'API AWC hérite parfois visib du groupe parent même quand le groupe
 * de changement (BECMG/TEMPO) ne la mentionne pas. On vérifie donc que
 * la valeur est bien présente dans le snippet brut du groupe.
 */
function groupHasExplicitVisib(fcst: any): boolean {
  const raw: string = (fcst.rawFcst ?? fcst.fcstStr ?? '').toString();
  if (!raw) return true; // pas de brut disponible → on fait confiance à l'API
  // Le groupe brut doit contenir un token de visibilité :
  // ICAO : 4 chiffres (0200, 8000, 9999) ou P6SM / 6+
  // US   : fraction (1/4SM, 1/2SM), entier+SM (1SM, 2SM), ou P6SM
  return /\b(\d{4}|P6SM|\d+\/\d+SM|\d+SM)\b/.test(raw);
}

function buildSnippet(fcst: any): string {
  const wdir  = fcst.wdir != null ? String(fcst.wdir).padStart(3, '0') : 'VRB';
  const wspd  = fcst.wspd != null ? String(fcst.wspd).padStart(2, '0') : null;
  const wgst  = fcst.wgst != null ? `G${String(fcst.wgst).padStart(2, '0')}` : '';
  const windStr = wspd ? `${wdir}${wspd}${wgst}KT` : '';
  const wxStr   = fcst.wxString ?? '';
  const visRaw  = fcst.visib;
  const visM    = visMtoMeters(visRaw);
  const visStr  = (visM !== null && visM !== 9999) ? `VIS ${visM}m` : '';
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

  // ── Orage
  if (wxString && /\bTSRA*/.test(wxString)) {
    threats.push({
      type: 'THUNDERSTORM', label: 'Orage', value: wxString,
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  // ── Trombe
  if (wxString && /\bFC\b/.test(wxString)) {
    threats.push({
      type: 'FUNNEL_CLOUD', label: 'Trombe / Tornade', value: 'FC',
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  // ── Neige
  if (wxString && /\bSN\b|\bBLSN\b|\bSNGR\b/.test(wxString)) {
    const heavy = /\+SN|\+RASN|BLSN/.test(wxString);
    threats.push({
      type: 'SNOW', label: heavy ? 'Neige forte / Tempête' : 'Neige', value: wxString,
      severity: heavy ? 'red' : 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  // ── Précip. verlaçantes
  if (wxString && /\bFZRA\b|\bFZDZ\b|\bFZFG\b/.test(wxString)) {
    threats.push({
      type: 'FREEZING', label: 'Précip. verglaçantes', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  // ── Grêle
  if (wxString && /\bGR\b|\bGS\b/.test(wxString)) {
    threats.push({
      type: 'HAIL', label: 'Grêle', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo,
      changeIndicator: ci, snippet,
    });
  }

  // ── Vent fort
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

  // ── Visibilité réduite — YELLOW 1000-3500m / ORANGE 400-1000m / RED < 400m
  //
  // Garde-fous :
  //   1. visMtoMeters() distingue mètres ICAO (valeur entière ≥ 800) et SM (US)
  //   2. groupHasExplicitVisib() évite de déclencher une alerte sur une visib
  //      héritée d'un groupe parent quand le groupe courant ne la mentionne pas
  if (visib != null && visib !== '6+') {
    const visM = visMtoMeters(visib);
    if (visM !== null && visM < 3500 && groupHasExplicitVisib(fcst)) {
      const severity: ThreatSeverity = 
        visM < 400 ? 'red' : 
        visM < 1000 ? 'orange' : 
        'yellow';
      threats.push({
        type: 'LOW_VIS',
        label: `Visibilité ${visM}m`,
        value: `${visM}m`,
        severity,
        periodStart: timeFrom, periodEnd: timeTo,
        changeIndicator: ci, snippet,
      });
    }
  }

  // ── CB / TCU — stratégie affinée
  //   • CB : toujours ORANGE quelle que soit l'altitude
  //   • TCU : ORANGE si base < 1000ft, YELLOW sinon
  if (Array.isArray(clouds)) {
    for (const cloud of clouds) {
      if (cloud.type === 'CB' || cloud.type === 'TCU') {
        const isCB = cloud.type === 'CB';
        const severity: ThreatSeverity = 
          isCB ? 'orange' : 
          (cloud.base != null && cloud.base < 1000) ? 'orange' : 
          'yellow';
        
        threats.push({
          type: 'CB_TCU',
          label: cloud.base != null 
            ? `${cloud.type} base ${cloud.base}ft`
            : `${cloud.type}`,
          value: `${cloud.cover}${cloud.base ?? ''}${cloud.type}`,
          severity,
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

// ─── Cache Redis ─────────────────────────────────────────────────────────────────────────────────
const KV_KEY_TAF     = 'taf_risks_cache';
const KV_TTL_TAF_SEC = 30 * 60; // 30 min — TAF valide ~6h, refresh 30 min suffisant

export async function fetchTafRisks(): Promise<TafRisk[]> {
  // ── 1. Cache Redis — hit → retour immédiat ────────────────────────────────────────
  if (redis) {
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

  // ── 2. Fetch AWC en chunks de 20 ─────────────────────────────────────────────────
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

  const risks = parseTafToRisks(allTafs);

  // ── 3. Stockage Redis ──────────────────────────────────────────────────────────────
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
