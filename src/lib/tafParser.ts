// ─── TAF Parser ───────────────────────────────────────────────────────────────
// Source : AviationWeather.gov API (100% gratuit, NOAA)
// Détecte TS, SN, vent > 30kt, FZRA, GR, CB/TCU, basse vis

export type ThreatSeverity = 'red' | 'orange' | 'yellow';

export interface TafThreat {
  type: string;
  label: string;
  value?: string;
  severity: ThreatSeverity;
  periodStart: number; // Unix timestamp (secondes)
  periodEnd: number;
  snippet: string;     // Extrait du groupe TAF concerné
}

export interface TafRisk {
  icao: string;
  name: string;
  rawTaf: string;
  worstSeverity: ThreatSeverity;
  threats: TafThreat[];
}

// Liste ICAO des aéroports AF — synchronisée avec AF_AIRPORTS dans alertsServer.ts
export const AF_AIRPORT_ICAOS: string[] = [
  'LFPG', 'LFPO', 'LFLL', 'LFMN', 'LFBO', 'LFRS', 'LFRB', 'LFRN', 'LFML', 'LFBD', 'LFST',
  'EDDF', 'EDDM', 'EDDB', 'EDDH',
  'EHAM', 'EBBR', 'EGLL', 'EGPF',
  'LEMD', 'LEBL', 'LEAL', 'LEPA',
  'LIRF', 'LIMC', 'LIPZ',
  'LSZH', 'LSGG',
  'LPPT', 'LPFR',
  'LGAV',
  'ESSA', 'ENGM', 'EKCH', 'EFHK',
  'LOWW', 'EPWA', 'LKPR', 'LHBP', 'LROP',
  'KJFK', 'KEWR', 'KBOS', 'KORD', 'KLAX', 'KMIA', 'KIAD', 'KATL', 'KSEA', 'KPDX', 'KBWI', 'KDEN',
  'SBGR', 'SCEL', 'MMMX',
  'TFFR', 'TFFF', 'SOCA',
  'FMEE', 'FMCH', 'FMMI', 'FIMP',
  'DAAG', 'DTTA', 'GMMN', 'GOBD', 'DIAP', 'DNMM', 'FOOL', 'FCBB', 'HTDA', 'HAAB',
  'OMDB', 'OERK',
  'VHHH', 'RJTT', 'WSSS', 'ZBAA', 'ZSPD', 'VABB', 'VIDP',
];

const AIRPORT_NAMES: Record<string, string> = {
  LFPG: 'Paris CDG',      LFPO: 'Paris Orly',     LFLL: 'Lyon',
  LFMN: 'Nice',           LFBO: 'Toulouse',        LFRS: 'Nantes',
  LFRB: 'Brest',          LFRN: 'Rennes',          LFML: 'Marseille',
  LFBD: 'Bordeaux',       LFST: 'Strasbourg',
  EDDF: 'Francfort',      EDDM: 'Munich',          EDDB: 'Berlin',
  EDDH: 'Hambourg',       EHAM: 'Amsterdam',       EBBR: 'Bruxelles',
  EGLL: 'Londres LHR',    EGPF: 'Glasgow',
  LEMD: 'Madrid',         LEBL: 'Barcelone',       LEAL: 'Alicante',
  LEPA: 'Palma',          LIRF: 'Rome FCO',        LIMC: 'Milan MXP',
  LIPZ: 'Venise',         LSZH: 'Zurich',          LSGG: 'Genève',
  LPPT: 'Lisbonne',       LPFR: 'Faro',            LGAV: 'Athènes',
  ESSA: 'Stockholm',      ENGM: 'Oslo',            EKCH: 'Copenhague',
  EFHK: 'Helsinki',       LOWW: 'Vienne',          EPWA: 'Varsovie',
  LKPR: 'Prague',         LHBP: 'Budapest',        LROP: 'Bucarest',
  KJFK: 'New York JFK',   KEWR: 'Newark',          KBOS: 'Boston',
  KORD: 'Chicago',        KLAX: 'Los Angeles',     KMIA: 'Miami',
  KIAD: 'Washington',     KATL: 'Atlanta',         KSEA: 'Seattle',
  KPDX: 'Portland',       KBWI: 'Baltimore',       KDEN: 'Denver',
  SBGR: 'São Paulo',      SCEL: 'Santiago',        MMMX: 'Mexico City',
  TFFR: 'Pointe-à-Pitre', TFFF: 'Fort-de-France',  SOCA: 'Cayenne',
  FMEE: 'La Réunion',     FMCH: 'Moroni',          FMMI: 'Antananarivo',
  FIMP: 'Maurice',        DAAG: 'Alger',           DTTA: 'Tunis',
  GMMN: 'Casablanca',     GOBD: 'Dakar',           DIAP: 'Abidjan',
  DNMM: 'Lagos',          FOOL: 'Libreville',      FCBB: 'Brazzaville',
  HTDA: 'Dar es Salaam',  HAAB: 'Addis Abeba',
  OMDB: 'Dubaï',          OERK: 'Riyad',
  VHHH: 'Hong Kong',      RJTT: 'Tokyo',           WSSS: 'Singapour',
  ZBAA: 'Pékin',          ZSPD: 'Shanghai',        VABB: 'Mumbai',
  VIDP: 'Delhi',
};

const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

function getAirportName(icao: string): string {
  return AIRPORT_NAMES[icao] ?? icao;
}

function buildSnippet(fcst: any): string {
  const wdir = fcst.wdir != null ? String(fcst.wdir).padStart(3, '0') : 'VRB';
  const wspd = fcst.wspd != null ? String(fcst.wspd).padStart(2, '0') : null;
  const wgst = fcst.wgst != null ? `G${String(fcst.wgst).padStart(2, '0')}` : '';
  const windStr = wspd ? `${wdir}${wspd}${wgst}KT` : '';
  const visStr = fcst.visib && fcst.visib !== '6+' ? `VIS ${fcst.visib}SM` : '';
  const wxStr = fcst.wxString ?? '';
  const cbStr = fcst.clouds
    ?.filter((c: any) => c.type === 'CB' || c.type === 'TCU')
    .map((c: any) => `${c.cover}${c.base}${c.type}`)
    .join(' ') ?? '';
  return [windStr, wxStr, visStr, cbStr].filter(Boolean).join(' ').trim();
}

function parseThreatsFromForecast(fcst: any): TafThreat[] {
  const threats: TafThreat[] = [];
  const { timeFrom, timeTo, wspd, wgst, wxString, clouds, visib } = fcst;
  const snippet = buildSnippet(fcst);

  // ── Orage TS/TSRA/TSGR (RED) ─────────────────────────────────────────────
  if (wxString && /\bTS[A-Z]*/.test(wxString)) {
    threats.push({
      type: 'THUNDERSTORM', label: 'Orage', value: wxString,
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo, snippet,
    });
  }

  // ── Trombe / tornade FC (RED) ─────────────────────────────────────────────
  if (wxString && /\bFC\b/.test(wxString)) {
    threats.push({
      type: 'FUNNEL_CLOUD', label: 'Trombe / Tornade', value: 'FC',
      severity: 'red', periodStart: timeFrom, periodEnd: timeTo, snippet,
    });
  }

  // ── Neige (RED si forte, ORANGE sinon) ────────────────────────────────────
  if (wxString && /\bSN\b|\bBLSN\b|\bSNGR\b/.test(wxString)) {
    const heavy = /\+SN|\+RASN|BLSN/.test(wxString);
    threats.push({
      type: 'SNOW', label: heavy ? 'Neige forte / Tempête' : 'Neige', value: wxString,
      severity: heavy ? 'red' : 'orange', periodStart: timeFrom, periodEnd: timeTo, snippet,
    });
  }

  // ── Précip. verglaçantes FZRA / FZDZ / FZFG (ORANGE) ─────────────────────
  if (wxString && /\bFZRA\b|\bFZDZ\b|\bFZFG\b/.test(wxString)) {
    threats.push({
      type: 'FREEZING', label: 'Précip. verglaçantes', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo, snippet,
    });
  }

  // ── Grêle GR / GS (ORANGE) ───────────────────────────────────────────────
  if (wxString && /\bGR\b|\bGS\b/.test(wxString)) {
    threats.push({
      type: 'HAIL', label: 'Grêle', value: wxString,
      severity: 'orange', periodStart: timeFrom, periodEnd: timeTo, snippet,
    });
  }

  // ── Vent > 30kt (ORANGE) ou > 40kt (RED) ─────────────────────────────────
  if (wspd != null || wgst != null) {
    const maxWind = Math.max(wspd ?? 0, wgst ?? 0);
    if (maxWind >= 30) {
      const windStr = buildSnippet(fcst).split(' ')[0];
      threats.push({
        type: 'WIND',
        label: wgst != null && wgst >= 30 ? `Rafales ${wgst}kt` : `Vent ${wspd}kt`,
        value: windStr,
        severity: maxWind >= 40 ? 'red' : 'orange',
        periodStart: timeFrom, periodEnd: timeTo, snippet,
      });
    }
  }

  // ── Basse visibilité < 3SM (ORANGE) ou < 1SM (RED) ───────────────────────
  if (visib != null && visib !== '6+') {
    const visNum = parseFloat(String(visib));
    if (!isNaN(visNum) && visNum < 3) {
      threats.push({
        type: 'LOW_VIS', label: `Visibilité ${visib}SM`, value: String(visib),
        severity: visNum < 1 ? 'red' : 'orange',
        periodStart: timeFrom, periodEnd: timeTo, snippet,
      });
    }
  }

  // ── CB / TCU base < 2000ft (ORANGE) ──────────────────────────────────────
  if (Array.isArray(clouds)) {
    for (const cloud of clouds) {
      if ((cloud.type === 'CB' || cloud.type === 'TCU') && cloud.base != null && cloud.base < 2000) {
        threats.push({
          type: 'CB_TCU', label: `${cloud.type} base ${cloud.base}ft`,
          value: `${cloud.cover}${cloud.base}${cloud.type}`,
          severity: 'orange',
          periodStart: timeFrom, periodEnd: timeTo, snippet,
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
      name: getAirportName(icao),
      rawTaf: taf.rawTAF ?? '',
      worstSeverity,
      threats: allThreats.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    });
  }

  return risks.sort((a, b) => SEVERITY_ORDER[a.worstSeverity] - SEVERITY_ORDER[b.worstSeverity]);
}

export async function fetchTafRisks(): Promise<TafRisk[]> {
  // Découpage en chunks de 20 (limite URL raisonnable)
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

  console.log(`[TAF] ${allTafs.length} TAFs récupérés, parsing en cours...`);
  return parseTafToRisks(allTafs);
}
