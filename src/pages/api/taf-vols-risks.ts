// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import type { TafRisk, TafThreat } from '../../lib/tafParser';
import type { AfFlightArrival } from '../../lib/afFlights';
import { fetchTafRisks } from '../../lib/tafParser';
import { getArrivalsForAirport } from '../../lib/afFlights';

export interface TafFlightHit {
  taf: TafRisk;
  threat: TafThreat;
  flight: AfFlightArrival;
  minutesBeforeThreatStart: number;
}

const CACHE_TTL = 2 * 60 * 60 * 1000;
let cache: { ts: number; data: TafFlightHit[] } | null = null;

const MAX_LEAD_MIN_BEFORE_THREAT = 120;

function overlapsThreatWindow(etaMs: number, threat: TafThreat): { ok: boolean; minutesBefore: number } {
  const startMs = threat.periodStart * 1000;
  const endMs   = threat.periodEnd   * 1000;
  const beforeMinutes = Math.round((startMs - etaMs) / 60000);

  if (etaMs >= startMs && etaMs <= endMs) {
    return { ok: true, minutesBefore: beforeMinutes };
  }

  if (beforeMinutes > 0 && beforeMinutes <= MAX_LEAD_MIN_BEFORE_THREAT) {
    return { ok: true, minutesBefore: beforeMinutes };
  }

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

    const byIcao = new Map<string, TafRisk[]>();
    for (const taf of tafRisks) {
      if (!taf.icao) continue;
      if (!byIcao.has(taf.icao)) byIcao.set(taf.icao, []);
      byIcao.get(taf.icao)!.push(taf);
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
            hits.push({ taf, threat, flight, minutesBeforeThreatStart: minutesBefore });
          }
        }
      }
    }

    hits.sort((a, b) => {
      const sev: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
      if (sev[a.threat.severity] !== sev[b.threat.severity])
        return sev[a.threat.severity] - sev[b.threat.severity];
      return new Date(a.flight.estimatedArrival ?? a.flight.scheduledArrival).getTime() -
             new Date(b.flight.estimatedArrival ?? b.flight.scheduledArrival).getTime();
    });

    cache = { ts: Date.now(), data: hits };

    return new Response(JSON.stringify(hits), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });

  } catch (e) {
    console.error('[API /taf-vol-risks]', e);
    return new Response(JSON.stringify({ error: String(e), hits: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
