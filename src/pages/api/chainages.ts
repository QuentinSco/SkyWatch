// src/pages/api/chainages.ts
import type { APIRoute } from 'astro';
import { getCachedAfArrivals, getCachedAfDepartures } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO } from '../../lib/tafParser';

export const prerender = false;

const MAX_AIRPORTS = 10;

function ms(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}

// Une escale = un segment "au sol" sur l'aéroport
export interface ChainageSegment {
  arrFlight: string;
  depFlight: string | null;
  arrMs:     number;
  depMs:     number | null;
}

// Un appareil peut avoir plusieurs escales sur le même aéroport dans la fenêtre
export interface ChainageStop {
  registration: string;
  aircraftType: string;
  iata:         string;
  segments:     ChainageSegment[];
}

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('airports') ?? '';
  const inputCodes = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (inputCodes.length === 0) {
    return new Response(JSON.stringify({ error: 'Paramètre airports manquant' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (inputCodes.length > MAX_AIRPORTS) {
    return new Response(JSON.stringify({ error: `Trop d'aéroports (max ${MAX_AIRPORTS})` }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetIcaos = new Set<string>();
  const unknownCodes: string[] = [];

  for (const code of inputCodes) {
    if (code.length === 4) {
      targetIcaos.add(code);
    } else {
      const icao = AF_IATA_TO_ICAO[code];
      if (icao) targetIcaos.add(icao);
      else unknownCodes.push(code);
    }
  }

  // ── Plage horaire ─────────────────────────────────────────────────────────
  const now = Date.now();
  let wStart: number;
  let wEnd: number;

  const startParam = url.searchParams.get('start');
  const endParam   = url.searchParams.get('end');

  if (startParam && endParam) {
    const customStart = ms(startParam);
    const customEnd   = ms(endParam);
    if (customStart === null || customEnd === null || customEnd <= customStart) {
      return new Response(JSON.stringify({ error: 'Paramètres start/end invalides' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    wStart = customStart;
    wEnd   = customEnd;
  } else {
    wStart = now;
    wEnd   = now + 24 * 60 * 60 * 1000;
  }

  const force = url.searchParams.get('force') === '1';

  try {
    const arrivals   = await getCachedAfArrivals(force, true);
    const departures = await getCachedAfDepartures(force, true);

    type DepWithMs = { dep: typeof departures[number]; depMs: number };
    const departuresWithMs: DepWithMs[] = departures
      .map(dep => ({ dep, depMs: ms(dep.estimatedTouchDownTime ?? dep.scheduledArrival) }))
      .filter((d): d is DepWithMs => d.depMs !== null && !!(d.dep.registration && d.dep.icao));

    // ── 1. Arrivées dans la fenêtre (marge 2h) ────────────────────────────
    const windowArrivals = arrivals.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= wStart - 2 * 60 * 60 * 1000 && t <= wEnd && targetIcaos.has(f.icao);
    });

    // Segments bruts avant regroupement : clé = reg-icao
    type RawSegment = ChainageSegment & { reg: string; icao: string; aircraftType: string; iata: string };
    const rawSegments: RawSegment[] = [];

    // Première arrivée dans la fenêtre par reg+icao (pour la détection orpheline)
    const firstWindowArrivalMs = new Map<string, number>();
    for (const arr of windowArrivals) {
      const reg = (arr.registration ?? 'UNKNOWN').toUpperCase();
      const arrMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival);
      if (arrMs === null) continue;
      const key = `${reg}-${arr.icao}`;
      const existing = firstWindowArrivalMs.get(key);
      if (existing === undefined || arrMs < existing) firstWindowArrivalMs.set(key, arrMs);
    }

    // Phase 1 : segments depuis les arrivées dans la fenêtre
    for (const arr of windowArrivals) {
      const reg = (arr.registration ?? 'UNKNOWN').toUpperCase();
      const arrMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival);
      if (arrMs === null) continue;

      let bestDep: typeof departures[number] | null = null;
      let bestDepMs: number | null = null;
      for (const { dep, depMs } of departuresWithMs) {
        if (dep.registration!.toUpperCase() !== reg || dep.icao !== arr.icao) continue;
        if (depMs <= arrMs) continue;
        if (bestDepMs === null || depMs < bestDepMs) { bestDep = dep; bestDepMs = depMs; }
      }

      rawSegments.push({
        reg,
        icao:        arr.icao,
        iata:        arr.iata,
        aircraftType: arr.aircraftType ?? '',
        arrFlight:   `AF${arr.flightNumber}`,
        depFlight:   bestDep ? `AF${bestDep.flightNumber}` : null,
        arrMs,
        depMs:       bestDepMs,
      });
    }

    // Phase 2 : appareils déjà au sol avant la fenêtre (arrivée non captée)
    const seenOrphanKeys = new Set<string>();
    for (const { dep, depMs } of departuresWithMs) {
      if (!targetIcaos.has(dep.icao)) continue;
      const reg = dep.registration!.toUpperCase();
      const key = `${reg}-${dep.icao}`;

      const firstKnownArrMs = firstWindowArrivalMs.get(key);
      // On ne traite que les départs antérieurs à la première arrivée connue dans la fenêtre
      if (firstKnownArrMs !== undefined && depMs >= firstKnownArrMs) continue;
      if (seenOrphanKeys.has(key)) continue;

      let bestArr: typeof arrivals[number] | null = null;
      let bestArrMs: number | null = null;
      for (const arr of arrivals) {
        const aReg = (arr.registration ?? '').toUpperCase();
        if (aReg !== reg || arr.icao !== dep.icao) continue;
        const aMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival);
        if (aMs === null || aMs >= depMs) continue;
        if (bestArrMs === null || aMs > bestArrMs) { bestArr = arr; bestArrMs = aMs; }
      }

      seenOrphanKeys.add(key);
      rawSegments.push({
        reg,
        icao:        dep.icao,
        iata:        dep.iata,
        aircraftType: dep.aircraftType ?? bestArr?.aircraftType ?? '',
        arrFlight:   bestArr ? `AF${bestArr.flightNumber}` : '(au sol)',
        depFlight:   `AF${dep.flightNumber}`,
        arrMs:       bestArrMs ?? wStart,
        depMs,
      });
    }

    // ── Regroupement : une ligne par reg+icao, plusieurs segments ────────────
    const stopMap = new Map<string, ChainageStop>();
    for (const s of rawSegments) {
      const key = `${s.reg}-${s.icao}`;
      if (!stopMap.has(key)) {
        stopMap.set(key, {
          registration: s.reg,
          aircraftType: s.aircraftType,
          iata:         s.iata,
          segments:     [],
        });
      }
      stopMap.get(key)!.segments.push({
        arrFlight: s.arrFlight,
        depFlight: s.depFlight,
        arrMs:     s.arrMs,
        depMs:     s.depMs,
      });
    }

    // Trier les segments de chaque appareil par arrMs, puis les stops par premier segment
    const stops: ChainageStop[] = Array.from(stopMap.values()).map(stop => ({
      ...stop,
      segments: stop.segments.sort((a, b) => a.arrMs - b.arrMs),
    }));
    stops.sort((a, b) => a.segments[0].arrMs - b.segments[0].arrMs);

    return new Response(
      JSON.stringify({
        stops,
        generatedAt: new Date().toISOString(),
        windowStart: wStart,
        windowEnd: wEnd,
        unknownCodes: unknownCodes.length > 0 ? unknownCodes : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
