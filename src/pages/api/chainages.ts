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

export interface ChainageStop {
  registration: string;
  aircraftType: string;
  iata:         string;
  arrFlight:    string;
  depFlight:    string | null;
  arrMs:        number;
  depMs:        number | null;
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

    // Pré-calcul des timestamps de départ
    type DepWithMs = { dep: typeof departures[number]; depMs: number };
    const departuresWithMs: DepWithMs[] = departures
      .map(dep => ({ dep, depMs: ms(dep.estimatedTouchDownTime ?? dep.scheduledArrival) }))
      .filter((d): d is DepWithMs => d.depMs !== null && !!(d.dep.registration && d.dep.icao));

    // ── 1. Arrivées dans la fenêtre (marge 2h pour appareils déjà au sol proches) ──
    const windowArrivals = arrivals.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= wStart - 2 * 60 * 60 * 1000 && t <= wEnd && targetIcaos.has(f.icao);
    });

    const stops: ChainageStop[] = [];

    // Clés reg-icao couvertes par une arrivée (pour la détection orpheline ensuite)
    const coveredKeys = new Set<string>();

    for (const arr of windowArrivals) {
      const reg = (arr.registration ?? 'UNKNOWN').toUpperCase();
      const arrMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival);
      if (arrMs === null) continue;

      coveredKeys.add(`${reg}-${arr.icao}`);

      // Départ le plus tôt APRÈS cette arrivée, sur le même reg+icao
      let bestDep: typeof departures[number] | null = null;
      let bestDepMs: number | null = null;
      for (const { dep, depMs } of departuresWithMs) {
        if (dep.registration!.toUpperCase() !== reg || dep.icao !== arr.icao) continue;
        if (depMs <= arrMs) continue;
        if (bestDepMs === null || depMs < bestDepMs) {
          bestDep   = dep;
          bestDepMs = depMs;
        }
      }

      stops.push({
        registration: reg,
        aircraftType: arr.aircraftType ?? '',
        iata:         arr.iata,
        arrFlight:    `AF${arr.flightNumber}`,
        depFlight:    bestDep ? `AF${bestDep.flightNumber}` : null,
        arrMs,
        depMs: bestDepMs,
      });
    }

    // ── 2. Appareils déjà au sol AVANT la fenêtre (arrivée non captée) ──────
    // On cherche les départs sur les icaos cibles dont la registration n'est
    // pas couverte par une arrivée dans la fenêtre. Pour chaque reg+icao orphelin
    // on ne retient que le premier départ à venir, et on reconstitue l'arrivée
    // passée la plus récente pour afficher le numéro de vol entrant.
    const seenOrphanKeys = new Set<string>();

    for (const { dep, depMs } of departuresWithMs) {
      if (!targetIcaos.has(dep.icao)) continue;
      const reg = dep.registration!.toUpperCase();
      const key = `${reg}-${dep.icao}`;

      if (coveredKeys.has(key)) continue;    // déjà géré via une arrivée
      if (seenOrphanKeys.has(key)) continue; // on ne prend que le premier départ orphelin

      // Arrivée passée la plus récente pour ce reg+icao (hors fenêtre)
      // afin d'afficher le numéro de vol entrant et l'heure réelle d'arrivée.
      let bestArr: typeof arrivals[number] | null = null;
      let bestArrMs: number | null = null;
      for (const arr of arrivals) {
        const aReg = (arr.registration ?? '').toUpperCase();
        if (aReg !== reg || arr.icao !== dep.icao) continue;
        const aMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival);
        if (aMs === null || aMs >= depMs) continue;
        if (bestArrMs === null || aMs > bestArrMs) {
          bestArr   = arr;
          bestArrMs = aMs;
        }
      }

      seenOrphanKeys.add(key);

      stops.push({
        registration: reg,
        aircraftType: dep.aircraftType ?? bestArr?.aircraftType ?? '',
        iata:         dep.iata,
        // Numéro du vol entrant si retrouvé, sinon label neutre
        arrFlight:    bestArr ? `AF${bestArr.flightNumber}` : '(au sol)',
        depFlight:    `AF${dep.flightNumber}`,
        // Heure d'arrivée réelle si connue, sinon début de fenêtre pour que
        // la barre parte du bord gauche du canvas (appareil déjà présent)
        arrMs:        bestArrMs ?? wStart,
        depMs,
      });
    }

    stops.sort((a, b) => a.arrMs - b.arrMs);

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
