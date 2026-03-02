// src/lib/tailwindMonitor.ts
// ─── Vent arrière — SXM (TNCM) + SJO (MROC) ──────────────────────────────────
import { redis } from './redis';

export interface RunwayWindComponents {
  runway:      string;
  heading:     number;
  headwindKt:  number;   // + = vent face (1 décimale)
  tailwindKt:  number;   // + = vent arrière — arrondi à l'entier supérieur
  crosswindKt: number;   // 1 décimale
}

export interface TailwindStatus {
  icao:         string;
  iata:         string;
  name:         string;
  metar: {
    raw:        string;
    windDir:    number | null;
    windSpdKt:  number;
    windGstKt:  number | null;
    obsTime:    string;
  } | null;
  worstRunway:    RunwayWindComponents | null;
  tailwindAlert:  boolean;
  thresholdKt:    number;
  forecastAlerts: {
    periodStart: number;
    periodEnd:   number;
    windDir:     number;
    windSpdKt:   number;
    tailwindKt:  number;
    runway:      string;
  }[];
}

const TAILWIND_AIRPORTS = [
  {
    icao: 'TNCM', iata: 'SXM', name: 'Sint Maarten',
    runways: [
      { heading: 100, name: 'RWY 10' },
      { heading: 280, name: 'RWY 28' },
    ],
    thresholdKt: 5,
  },
  {
    icao: 'MROC', iata: 'SJO', name: 'San José CR',
    runways: [
      { heading: 70,  name: 'RWY 07' },
      { heading: 250, name: 'RWY 25' },
    ],
    thresholdKt: 5,
  },
] as const;

function computeRunwayWind(
  windDir: number,
  windSpd: number,
  rwy: { heading: number; name: string },
): RunwayWindComponents {
  const angle       = ((windDir - rwy.heading) + 360) % 360;
  const rad         = angle * Math.PI / 180;
  const headwindRaw = windSpd * Math.cos(rad);
  const headwindKt  = Math.round(headwindRaw * 10) / 10;
  // Arrondi à l'entier supérieur pour être conservateur (sécurité)
  const tailwindKt  = Math.ceil(-headwindRaw);
  const crosswindKt = Math.round(Math.abs(windSpd * Math.sin(rad)) * 10) / 10;
  return { runway: rwy.name, heading: rwy.heading, headwindKt, tailwindKt, crosswindKt };
}

function worstCaseRunway(
  windDir: number | null,
  windSpd: number,
  runways: readonly { heading: number; name: string }[],
): RunwayWindComponents | null {
  if (windDir === null || windSpd === 0) return null;
  return runways
    .map(r => computeRunwayWind(windDir, windSpd, r))
    .sort((a, b) => b.tailwindKt - a.tailwindKt)[0];
}

function parseMetarWind(raw: string) {
  const m = raw.match(/\b(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?KT\b/);
  if (!m) return { windDir: null as number | null, windSpdKt: 0, windGstKt: null as number | null };
  return {
    windDir:   m[1] === 'VRB' ? null : parseInt(m[1]),
    windSpdKt: parseInt(m[2]),
    windGstKt: m[4] ? parseInt(m[4]) : null,
  };
}

const KV_KEY = 'tailwind_status_cache';
const KV_TTL = 15 * 60;

export async function fetchTailwindStatus(): Promise<TailwindStatus[]> {
  if (redis) {
    try {
      const cached = await redis.get<TailwindStatus[]>(KV_KEY);
      if (cached) { console.log('[Tailwind] Cache KV HIT'); return cached; }
    } catch (e) { console.warn('[Tailwind] KV read:', e); }
  }

  const icaos = TAILWIND_AIRPORTS.map(a => a.icao).join(',');

  const [metarRaw, tafRaw] = await Promise.all([
    fetch(
      `https://aviationweather.gov/api/data/metar?ids=${icaos}&format=json&hours=2`,
      { headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' }, signal: AbortSignal.timeout(10000) }
    ).then(r => r.ok ? r.json() as Promise<any[]> : Promise.resolve([])).catch(() => [] as any[]),
    fetch(
      `https://aviationweather.gov/api/data/taf?ids=${icaos}&format=json&metar=false`,
      { headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' }, signal: AbortSignal.timeout(10000) }
    ).then(r => r.ok ? r.json() as Promise<any[]> : Promise.resolve([])).catch(() => [] as any[]),
  ]);

  const metarByIcao: Record<string, any> = {};
  for (const m of metarRaw) {
    const id = m.icaoId ?? m.stationId;
    if (id && !metarByIcao[id]) metarByIcao[id] = m;
  }
  const tafByIcao: Record<string, any> = {};
  for (const t of tafRaw) {
    const id = t.icaoId ?? t.stationId;
    if (id) tafByIcao[id] = t;
  }

  const now   = Date.now();
  const limit = now + 6 * 60 * 60 * 1000;

  const statuses: TailwindStatus[] = TAILWIND_AIRPORTS.map(ap => {
    const raw      = metarByIcao[ap.icao];
    const rawStr   = raw?.rawOb ?? raw?.rawMETAR ?? '';
    const parsed   = parseMetarWind(rawStr);
    const metar: TailwindStatus['metar'] = rawStr ? {
      raw:       rawStr,
      windDir:   parsed.windDir,
      windSpdKt: parsed.windSpdKt,
      windGstKt: parsed.windGstKt,
      obsTime:   raw?.obsTime ? new Date(raw.obsTime).toISOString() : new Date().toISOString(),
    } : null;

    const worst        = worstCaseRunway(parsed.windDir, parsed.windSpdKt, ap.runways);
    const tailwindAlert = worst !== null && worst.tailwindKt >= ap.thresholdKt;

    const fcsts: any[] = tafByIcao[ap.icao]?.fcsts ?? [];
    const forecastAlerts = fcsts
      .filter(f => f.timeFrom * 1000 < limit && f.timeTo * 1000 > now)
      .flatMap(f => {
        const wdir = f.wdir === 'VRB' || f.wdir == null ? null : Number(f.wdir);
        const wspd = f.wspd != null ? Number(f.wspd) : 0;
        const w    = worstCaseRunway(wdir, wspd, ap.runways);
        if (!w || w.tailwindKt < ap.thresholdKt) return [];
        return [{
          periodStart: f.timeFrom as number,
          periodEnd:   f.timeTo   as number,
          windDir:     wdir!,
          windSpdKt:   wspd,
          tailwindKt:  w.tailwindKt,
          runway:      w.runway,
        }];
      });

    return {
      icao: ap.icao, iata: ap.iata, name: ap.name,
      metar, worstRunway: worst, tailwindAlert,
      thresholdKt: ap.thresholdKt, forecastAlerts,
    };
  });

  if (redis) {
    try {
      await redis.set(KV_KEY, statuses, { ex: KV_TTL });
      console.log('[Tailwind] Cache KV MISS → stocké');
    } catch (e) { console.warn('[Tailwind] KV write:', e); }
  }

  return statuses;
}
