// src/pages/api/chainages.ts
// ─── API Chaînages par immatriculation ─────────────────────────────────────
import type { APIRoute } from 'astro';
import { getCachedAfArrivals } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO }    from '../../lib/tafParser';

export const prerender = false;

// Inverse IATA→ICAO map for lookup
const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

function fmtDDMMZ(iso: string | undefined): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    date: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`,
    time: `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}z`,
  };
}

export interface ChainageEntry {
  registration: string;
  aircraftType: string;
  legs: {
    direction: 'ARR' | 'DEP';
    flight: string;
    iata: string;
    date: string;
    time: string;
  }[];
}

export const GET: APIRoute = async ({ url }) => {
  // airports param: comma-separated IATA or ICAO codes
  const raw = url.searchParams.get('airports') ?? '';
  const inputCodes = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (inputCodes.length === 0) {
    return new Response(JSON.stringify({ error: 'Paramètre airports manquant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Normalise to ICAO
  const targetIcaos = new Set<string>();
  const targetIatas = new Set<string>();
  for (const code of inputCodes) {
    if (code.length === 4) {
      // ICAO provided directly
      targetIcaos.add(code);
      const iata = ICAO_TO_IATA[code];
      if (iata) targetIatas.add(iata);
    } else {
      // IATA → resolve to ICAO
      const icao = AF_IATA_TO_ICAO[code];
      if (icao) {
        targetIcaos.add(icao);
        targetIatas.add(code);
      }
    }
  }

  const now   = Date.now();
  const end   = now + 24 * 60 * 60 * 1000;

  try {
    // getCachedAfArrivals returns ARR + DEP since movementType filter is removed
    const allFlights = await getCachedAfArrivals(false);

    // Keep only flights touching one of the requested airports in the 24h window
    // A flight touches an airport as ARR (icao matches arrivalAirport) or DEP (we
    // use departureAirport field if available, otherwise we infer from flightId).
    // Since afFlights only stores arrival legs, we build chainage from registration:
    // for each registration, sort all its legs by ETA, then pair consecutive ARR.
    // The implicit DEP of a leg is at the same airport shortly after ARR.

    // Filter to 24h window
    const windowFlights = allFlights.filter(f => {
      const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
      return eta >= now && eta <= end;
    });

    // Group by registration
    const byReg = new Map<string, typeof windowFlights[0][]>();
    for (const f of windowFlights) {
      const reg = (f.registration ?? 'UNKNOWN').toUpperCase();
      if (!byReg.has(reg)) byReg.set(reg, []);
      byReg.get(reg)!.push(f);
    }

    const result: ChainageEntry[] = [];

    for (const [reg, legs] of byReg) {
      // At least one leg must land at a requested airport
      const relevant = legs.some(f => targetIcaos.has(f.icao));
      if (!relevant) continue;

      // Sort by ETA
      legs.sort((a, b) =>
        new Date(a.estimatedTouchDownTime ?? a.scheduledArrival).getTime() -
        new Date(b.estimatedTouchDownTime ?? b.scheduledArrival).getTime()
      );

      const entryLegs: ChainageEntry['legs'] = [];

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        const iata = leg.iata;
        const arrTime = fmtDDMMZ(leg.estimatedTouchDownTime ?? leg.scheduledArrival);
        if (!arrTime) continue;

        // ARR
        entryLegs.push({
          direction: 'ARR',
          flight:    `AF${leg.flightNumber}`,
          iata,
          date:      arrTime.date,
          time:      arrTime.time,
        });

        // DEP = scheduledDeparture from the next leg's origin, approximated:
        // if the next leg exists, its departure airport is the current ARR airport
        // and we don't have the departure time from AF arrivals API.
        // We emit a DEP stub only when we can identify the outbound flight number:
        // look for a leg whose origin matches current iata (not available in cache).
        // → DEP is reconstructed as the NEXT leg's arrival flight number only when
        // the next leg's icao ≠ current icao (i.e., aircraft moved on).
        if (i + 1 < legs.length) {
          const next = legs[i + 1];
          // Infer: DEP flight is the flight number of the next ARR leg
          // Departure time = next leg's scheduled departure (not stored) so we omit.
          // We signal the outbound flight with a "?" time if we can't determine it.
          // For now we store DEP without time — UI will show "--" for unknowns.
          entryLegs.push({
            direction: 'DEP',
            flight:    `AF${next.flightNumber}`,
            iata,
            date:      arrTime.date,   // estimated: same day as ARR
            time:      '----',
          });
        }
      }

      if (entryLegs.length > 0) {
        result.push({
          registration: reg,
          aircraftType: legs[0].aircraftType ?? '',
          legs: entryLegs,
        });
      }
    }

    // Sort by registration
    result.sort((a, b) => a.registration.localeCompare(b.registration));

    return new Response(JSON.stringify({ chainages: result, generatedAt: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
