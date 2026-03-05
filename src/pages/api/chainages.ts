// src/pages/api/chainages.ts
// ─── API Chaînages par immatriculation ─────────────────────────────────────
import type { APIRoute } from 'astro';
import { getCachedAfArrivals } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO }    from '../../lib/tafParser';

export const prerender = false;

const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

function fmtDateTime(iso: string | undefined): { date: string; time: string; ms: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    date: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    time: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}z`,
    ms:   d.getTime(),
  };
}

export interface ChainageLeg {
  direction: 'ARR' | 'DEP';
  flight:    string;
  iata:      string;
  date:      string;        // DD/MM
  time:      string | null; // HH:MMz ou null si inconnu
  etaMs:     number | null; // timestamp ms pour calcul statut (ARR uniquement)
}

export interface ChainageEntry {
  registration: string;
  aircraftType: string;
  legs: ChainageLeg[];
}

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('airports') ?? '';
  const inputCodes = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (inputCodes.length === 0) {
    return new Response(JSON.stringify({ error: 'Paramètre airports manquant' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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

    // Fenêtre glissante 24h (inclut les vols déjà arrivés dans les 2 dernières heures
    // pour voir les chaînages à venir depuis un avion déjà posé)
    const windowFlights = allFlights.filter(f => {
      const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
      return eta >= now - 2 * 60 * 60 * 1000 && eta <= end;
    });

    // Groupe par immatriculation
    const byReg = new Map<string, typeof windowFlights[0][]>();
    for (const f of windowFlights) {
      const reg = (f.registration ?? 'UNKNOWN').toUpperCase();
      if (!byReg.has(reg)) byReg.set(reg, []);
      byReg.get(reg)!.push(f);
    }

    const result: ChainageEntry[] = [];

    for (const [reg, legs] of byReg) {
      // L'avion doit toucher au moins un des aéroports demandés
      const relevant = legs.some(f => targetIcaos.has(f.icao));
      if (!relevant) continue;

      // Tri chronologique
      legs.sort((a, b) =>
        new Date(a.estimatedTouchDownTime ?? a.scheduledArrival).getTime() -
        new Date(b.estimatedTouchDownTime ?? b.scheduledArrival).getTime()
      );

      const entryLegs: ChainageLeg[] = [];

      for (let i = 0; i < legs.length; i++) {
        const leg  = legs[i];
        const arr  = fmtDateTime(leg.estimatedTouchDownTime ?? leg.scheduledArrival);
        if (!arr) continue;

        // ↓ ARR
        entryLegs.push({
          direction: 'ARR',
          flight:    `AF${leg.flightNumber}`,
          iata:      leg.iata,
          date:      arr.date,
          time:      arr.time,
          etaMs:     arr.ms,
        });

        // ↑ DEP — le numéro de vol sortant est le numéro du prochain leg
        // L’heure de départ n’est pas dans le cache arrivals → null
        if (i + 1 < legs.length) {
          const next = legs[i + 1];
          entryLegs.push({
            direction: 'DEP',
            flight:    `AF${next.flightNumber}`,
            iata:      leg.iata,
            date:      arr.date,
            time:      null,
            etaMs:     null,
          });
        } else {
          // Dernier leg connu : DEP inconnu
          entryLegs.push({
            direction: 'DEP',
            flight:    '',
            iata:      leg.iata,
            date:      arr.date,
            time:      null,
            etaMs:     null,
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

    result.sort((a, b) => a.registration.localeCompare(b.registration));

    return new Response(
      JSON.stringify({ chainages: result, generatedAt: new Date().toISOString(), serverNow: now }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
