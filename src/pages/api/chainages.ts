// src/pages/api/chainages.ts
// ─── API Chaînages — vue escale par aéroport ─────────────────────────────────
import type { APIRoute } from 'astro';
import { getCachedAfArrivals } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO }    from '../../lib/tafParser';

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
  depMs:        number | null;   // maintenant rempli si disponible dans l'API
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
    if (code.length === 4) {
      targetIcaos.add(code);
    } else {
      const icao = AF_IATA_TO_ICAO[code];
      if (icao) targetIcaos.add(icao);
    }
  }

  const now = Date.now();
  const end = now + 24 * 60 * 60 * 1000;

  try {
    const allFlights = await getCachedAfArrivals(false);

    // Fenêtre : 2h passées → +24h
    const windowFlights = allFlights.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= now - 2 * 60 * 60 * 1000 && t <= end;
    });

    // Groupe par immatriculation, tri chronologique
    const byReg = new Map<string, typeof windowFlights[number][]>();
    for (const f of windowFlights) {
      const reg = (f.registration ?? 'UNKNOWN').toUpperCase();
      if (!byReg.has(reg)) byReg.set(reg, []);
      byReg.get(reg)!.push(f);
    }

    const stops: ChainageStop[] = [];

    for (const [reg, legs] of byReg) {
      if (!legs.some(f => targetIcaos.has(f.icao))) continue;

      legs.sort((a, b) => {
        const ta = ms(a.estimatedTouchDownTime ?? a.scheduledArrival) ?? 0;
        const tb = ms(b.estimatedTouchDownTime ?? b.scheduledArrival) ?? 0;
        return ta - tb;
      });

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (!targetIcaos.has(leg.icao)) continue;

        const arrMs = ms(leg.estimatedTouchDownTime ?? leg.scheduledArrival);
        if (arrMs === null) continue;

        // Vol sortant : chercher dans la liste le prochain leg dont
        // departureIata correspond à l'aéroport d'arrivée de ce leg
        let depFlight: string | null = null;
        let depMs: number | null     = null;

        for (let j = i + 1; j < legs.length; j++) {
          const next = legs[j];
          // Vérifier que l'avion part bien de cet aéroport
          if (next.departureIata === leg.iata || next.departureIcao === leg.icao) {
            depFlight = `AF${next.flightNumber}`;
            // Heure de départ du leg suivant = scheduledDeparture ou estimatedDepartureTime
            depMs = ms(next.estimatedDepartureTime ?? next.scheduledDeparture);
            break;
          }
          // Fallback : si pas de match exact, prendre le premier leg suivant
          if (j === i + 1) {
            depFlight = `AF${next.flightNumber}`;
            depMs = ms(next.estimatedDepartureTime ?? next.scheduledDeparture);
          }
        }

        stops.push({
          registration: reg,
          aircraftType: leg.aircraftType ?? '',
          iata:         leg.iata,
          arrFlight:    `AF${leg.flightNumber}`,
          depFlight,
          arrMs,
          depMs,
        });
      }
    }

    stops.sort((a, b) => a.arrMs - b.arrMs);

    return new Response(
      JSON.stringify({ stops, generatedAt: new Date().toISOString(), windowStart: now, windowEnd: end }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
