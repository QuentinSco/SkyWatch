// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import { fetchTafRisks, type TafRisk, type TafThreat } from '../../lib/tafParser';
import { getArrivalsForAirport, type AfFlightArrival } from '../../lib/afFlights';

export interface TafFlightHit {
  taf: TafRisk;
  threat: TafThreat;
  flight: AfFlightArrival;
  minutesBeforeThreatStart: number;
}

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2h
let cache: { ts: number; data: TafFlightHit[] } | null = null;

// Seuil : on ignore les vols arrivant plus de X minutes avant la menace
const MAX_LEAD_MIN_BEFORE_THREAT = 120; // 2h

function overlapsThreatWindow(etaMs: number, threat: TafThreat): { ok: boolean; minutesBefore: number } {
  const startMs = threat.periodStart * 1000;
  const endMs   = threat.periodEnd   * 1000;
  const beforeMinutes = Math.round((startMs - etaMs) / 60000);

  if (beforeMinutes > MAX_LEAD_MIN_BEFORE_THREAT) {
    return { ok: false, minutesBefore: beforeMinutes };
  }

  if (etaMs >= startMs && etaMs <= endMs) {
    return { ok: true, minutesBefore: beforeMinutes };
  }

  // Si la menace commence après l'ETA (mais dans les 2h), on peut considérer qu'on a “juste” de la marge
  // mais tu as dit : "Si le vol arrive 2h avant les orages on ne le ressort pas"
  // => donc on ne considère que le cas "ETA dans [start, end]"
  return { ok: false, minutesBefore: beforeMinutes };
}

export const prerender = false;

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    const tafRisks = await fetchTafRisks();

    const hits: TafFlightHit[] = [];

    // On regroupe par ICAO pour limiter les appels vols
    const byIcao = new Map<string, TafRisk[]>();
    for (const taf of tafRisks) {
      const icao = taf.icao;
      if (!icao) continue;
      if (!byIcao.has(icao)) byIcao.set(icao, []);
      byIcao.get(icao)!.push(taf);
    }

    for (const [icao, tafsForAirport] of byIcao.entries()) {
      const flights = await getArrivalsForAirport(icao);

      if (!flights.length) continue;

      for (const taf of tafsForAirport) {
        for (const threat of taf.threats) {
          for (const flight of flights) {
            const etaIso = flight.estimatedArrival ?? flight.scheduledArrival;
            if (!etaIso) continue;
            const etaMs = new Date(etaIso).getTime();
            const { ok, minutesBefore } = overlapsThreatWindow(etaMs, threat);
            if (!ok) continue;

            hits.push({
              taf,
              threat,
              flight,
              minutesBeforeThreatStart: minutesBefore,
            });
          }
        }
      }
    }

    // Tri : menace > vol le plus proche temporellement
    hits.sort((a, b) => {
      const sev = { red: 0, orange: 1, yellow: 2 };
      const sa = sev[a.threat.severity];
      const sb = sev[b.threat.severity];
      if (sa !== sb) return sa - sb;
      const ta = new Date(a.flight.estimatedArrival ?? a.flight.scheduledArrival).getTime();
      const tb = new Date(b.flight.estimatedArrival ?? b.flight.scheduledArrival).getTime();
      return ta - tb;
    });

    cache = { ts: Date.now(), data: hits };

    return new Response(JSON.stringify(hits), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (e) {
    console.error('[API /taf-vol-risks]', e);
    return new Response(JSON.stringify({ error: 'taf-vol-risks failed', hits: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
