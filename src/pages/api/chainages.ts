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
  iata:         string;         // aéroport de l'escale
  arrFlight:    string;         // ex: "AF083"
  depFlight:    string | null;  // null si inconnu
  arrMs:        number;         // timestamp ms arrée
  depMs:        number | null;  // null si heure départ inconnue
}

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('airports') ?? '';
  const inputCodes = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (inputCodes.length === 0) {
    return new Response(JSON.stringify({ error: 'Paramètre airports manquant' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Normalise en ICAO + garde les IATA pour affichage
  const targetIcaos = new Set<string>();
  const icaoToIata:  Record<string, string> = {};
  for (const code of inputCodes) {
    if (code.length === 4) {
      targetIcaos.add(code);
      // retrouver l'IATA depuis la map inverse
      for (const [iata, icao] of Object.entries(AF_IATA_TO_ICAO)) {
        if (icao === code) { icaoToIata[code] = iata; break; }
      }
    } else {
      const icao = AF_IATA_TO_ICAO[code];
      if (icao) { targetIcaos.add(icao); icaoToIata[icao] = code; }
    }
  }

  const now = Date.now();
  const end = now + 24 * 60 * 60 * 1000;

  try {
    const allFlights = await getCachedAfArrivals(false);

    // Fenêtre : 2h passées → +24h (pour capter les avions déjà posés)
    const windowFlights = allFlights.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= now - 2 * 60 * 60 * 1000 && t <= end;
    });

    // Groupe par immatriculation
    const byReg = new Map<string, typeof windowFlights[number][]>();
    for (const f of windowFlights) {
      const reg = (f.registration ?? 'UNKNOWN').toUpperCase();
      if (!byReg.has(reg)) byReg.set(reg, []);
      byReg.get(reg)!.push(f);
    }

    const stops: ChainageStop[] = [];

    for (const [reg, legs] of byReg) {
      // Au moins un leg atterrit sur un aéroport demandé
      if (!legs.some(f => targetIcaos.has(f.icao))) continue;

      // Tri chronologique par ETA
      legs.sort((a, b) => {
        const ta = ms(a.estimatedTouchDownTime ?? a.scheduledArrival) ?? 0;
        const tb = ms(b.estimatedTouchDownTime ?? b.scheduledArrival) ?? 0;
        return ta - tb;
      });

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        // Ne garder que les escales sur les aéroports demandés
        if (!targetIcaos.has(leg.icao)) continue;

        const arrMs = ms(leg.estimatedTouchDownTime ?? leg.scheduledArrival);
        if (arrMs === null) continue;

        // DEP = prochain leg dans la liste (si différent aéroport = l'avion est reparti)
        // On cherche le prochain leg dans la liste globale (pas forcément i+1)
        let depFlight: string | null = null;
        let depMs: number | null = null;
        for (let j = i + 1; j < legs.length; j++) {
          // Le premier leg après l'ARR sur cet aéroport est le vol sortant
          depFlight = `AF${legs[j].flightNumber}`;
          // On n'a pas l'heure de départ dans le cache arrivals — reste null
          break;
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

    // Tri par heure d'arrivée
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
