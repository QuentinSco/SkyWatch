// src/pages/api/chainages.ts
import type { APIRoute } from 'astro';
import { getCachedAfFlights } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO }   from '../../lib/tafParser';

export const prerender = false;

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

  const targetIcaos = new Set<string>();
  for (const code of inputCodes) {
    if (code.length === 4) targetIcaos.add(code);
    else { const icao = AF_IATA_TO_ICAO[code]; if (icao) targetIcaos.add(icao); }
  }

  const now = Date.now();
  const end = now + 24 * 60 * 60 * 1000;

  try {
    const { arrivals, departures } = await getCachedAfFlights(false);

    // Index départs par REG-ICAO
    const depIndex = new Map<string, typeof departures[number]>();
    for (const dep of departures) {
      const reg = (dep.registration ?? '').toUpperCase();
      if (reg && dep.departureIcao) depIndex.set(`${reg}-${dep.departureIcao}`, dep);
    }

    const windowArrivals = arrivals.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= now - 2 * 60 * 60 * 1000 && t <= end && targetIcaos.has(f.icao);
    });

    const stops: ChainageStop[] = [];
    for (const arr of windowArrivals) {
      const reg   = (arr.registration ?? 'UNKNOWN').toUpperCase();
      const arrMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival)!;
      const dep   = depIndex.get(`${reg}-${arr.icao}`);
      stops.push({
        registration: reg,
        aircraftType: arr.aircraftType ?? '',
        iata:         arr.iata,
        arrFlight:    `AF${arr.flightNumber}`,
        depFlight:    dep ? `AF${dep.flightNumber}` : null,
        arrMs,
        depMs: dep ? ms(dep.estimatedDepartureTime ?? dep.scheduledDeparture) : null,
      });
    }

    stops.sort((a, b) => a.arrMs - b.arrMs);

    // ── Fenêtre visuelle : TOUJOURS 24h glissantes à partir de maintenant ───────────
    // Cela garantit que la timeline affiche l'intégralité de l'horizon temporel,
    // même si les données sont partielles ou absentes sur certaines périodes.
    const wStart = now;
    const wEnd   = now + 24 * 60 * 60 * 1000;

    return new Response(
      JSON.stringify({ stops, generatedAt: new Date().toISOString(), windowStart: wStart, windowEnd: wEnd }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
