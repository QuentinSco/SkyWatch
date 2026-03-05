// src/pages/api/crosswind.json.ts
//
// Agrège TAF bruts (fcsts avec vent par période) + vols AF pour la page crosswind.
// Retourne :
//   tafs    : { [icao]: { icao, iata, rawTaf, fcsts, threats, worstSeverity } }
//   flights : AfFlightArrival[]  (tous les vols, pas filtrés par menace)
//
import type { APIRoute } from 'astro';
import { fetchTafRisks } from '../../lib/tafParser';
import { getCachedAfArrivals } from '../../lib/afFlights';
import { Redis } from '@upstash/redis';

export const prerender = false;

const CACHE_KEY = 'crosswind_cache_v1';
const CACHE_TTL = 20 * 60; // 20 min

let kv: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    kv = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (_) {}

// ICAO ciblés pour la page crosswind (pistes connues)
const TARGET_ICAOS = [
  'LFPG','LFPO','EGLL','EHAM','EDDF','LEMD','LIRF','LFMN',
  'KJFK','KLAX','KORD','OMDB','VHHH','RJTT','WSSS','YSSY',
  'FACT','FAOR','HECA','CYYZ','SBGR','SCEL',
];

const IATA_MAP: Record<string, string> = {
  LFPG:'CDG', LFPO:'ORY', EGLL:'LHR', EHAM:'AMS', EDDF:'FRA',
  LEMD:'MAD', LIRF:'FCO', LFMN:'NCE', KJFK:'JFK', KLAX:'LAX',
  KORD:'ORD', OMDB:'DXB', VHHH:'HKG', RJTT:'HND', WSSS:'SIN',
  YSSY:'SYD', FACT:'CPT', FAOR:'JNB', HECA:'CAI', CYYZ:'YYZ',
  SBGR:'GRU', SCEL:'SCL',
};

export const GET: APIRoute = async ({ request }) => {
  const url   = new URL(request.url);
  const force = url.searchParams.get('force') === '1';

  try {
    // 1. Cache Redis
    if (!force && kv) {
      try {
        const cached = await kv.get<object>(CACHE_KEY);
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
          });
        }
      } catch (_) {}
    }

    // 2. Fetch parallèle : TAF risks (menaces parsées) + vols AF
    const [tafRisks, allFlights] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(force),
    ]);

    // 3. Re-fetch TAF bruts pour avoir les fcsts (vent par période)
    //    fetchTafRisks() ne retourne pas les fcsts bruts, seulement les threats.
    const CHUNK_SIZE = 20;
    const chunks: string[][] = [];
    for (let i = 0; i < TARGET_ICAOS.length; i += CHUNK_SIZE) {
      chunks.push(TARGET_ICAOS.slice(i, i + CHUNK_SIZE));
    }
    const rawResults = await Promise.allSettled(
      chunks.map(chunk =>
        fetch(
          `https://aviationweather.gov/api/data/taf?ids=${chunk.join(',')}&format=json&metar=false`,
          { headers: { 'User-Agent': 'SkyWatch/1.0' }, signal: AbortSignal.timeout(15000) }
        ).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      )
    );
    const allRaw: any[] = [];
    for (const r of rawResults) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) allRaw.push(...r.value);
    }
    // Déduplique : garde le TAF le plus récent par ICAO
    const latestRaw = new Map<string, any>();
    for (const t of allRaw) {
      const icao: string = t.icaoId ?? t.stationId ?? '';
      if (!icao) continue;
      const ex = latestRaw.get(icao);
      if (!ex || (t.issueTime ?? 0) > (ex.issueTime ?? 0)) latestRaw.set(icao, t);
    }

    // 4. Construit tafs map
    const riskByIcao: Record<string, any> = {};
    for (const r of tafRisks) riskByIcao[r.icao] = r;

    const tafs: Record<string, any> = {};
    for (const icao of TARGET_ICAOS) {
      const raw  = latestRaw.get(icao);
      const risk = riskByIcao[icao];
      tafs[icao] = {
        icao,
        iata:          IATA_MAP[icao] ?? icao,
        rawTaf:        raw?.rawTAF ?? risk?.rawTaf ?? '',
        worstSeverity: risk?.worstSeverity ?? 'none',
        threats:       risk?.threats ?? [],
        // fcsts bruts : on garde uniquement les champs utiles pour le crosswind
        fcsts: (raw?.fcsts ?? []).map((f: any) => ({
          timeFrom:        f.timeFrom        ?? null,
          timeTo:          f.timeTo          ?? null,
          changeIndicator: f.changeIndicator ?? null,
          wdir:            f.wdir            ?? null,
          wspd:            f.wspd            ?? null,
          wgst:            f.wgst            ?? null,
        })),
      };
    }

    // 5. Vols : tous les vols (pas filtrés), la page fait le tri par ICAO
    const flights = allFlights.map((f: any) => ({
      flightId:               f.flightId               ?? `AF${f.flightNumber}`,
      flightNumber:           f.flightNumber            ?? null,
      icao:                   f.icao                   ?? null,
      iata:                   IATA_MAP[f.icao]         ?? f.icao,
      scheduledArrival:       f.scheduledArrival        ?? null,
      estimatedTouchDownTime: f.estimatedTouchDownTime  ?? null,
      aircraftType:           f.aircraftType            ?? f.aircraft?.typeCode ?? null,
    }));

    const payload = { tafs, flights, generatedAt: Date.now() };

    // 6. Cache
    if (kv) {
      try { await kv.set(CACHE_KEY, payload, { ex: CACHE_TTL }); } catch (_) {}
    }

    return new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });

  } catch (err) {
    console.error('[API /crosswind.json]', err);
    return new Response(JSON.stringify({ error: String(err), tafs: {}, flights: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
