// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import type { TafRisk, TafThreat } from '../../lib/tafParser';
import type { AfFlightArrival } from '../../lib/afFlights';
import { fetchTafRisks } from '../../lib/tafParser';
import { getCachedAfArrivals } from '../../lib/afFlights';

// ✅ Mode debug — passe à true pour voir les logs détaillés dans Vercel Functions
const DEBUG = true;

function dbg(...args: any[]) {
  if (DEBUG) console.log('[DEBUG taf-vol-risks]', ...args);
}

export interface TafFlightHit {
  taf: TafRisk;
  threat: TafThreat;
  flight: AfFlightArrival;
  minutesBeforeThreatStart: number;
}

const CACHE_TTL = 20 * 60 * 1000;
let cache: { ts: number; data: TafFlightHit[] } | null = null;

const MAX_LEAD_MIN_BEFORE_THREAT = 120;

function overlapsThreatWindow(
  etaMs: number,
  threat: TafThreat,
): { ok: boolean; minutesBefore: number } {
  const threatStartMs = threat.periodStart * 1000;
  const threatEndMs   = threat.periodEnd   * 1000;

  const BUFFER_MS = 60 * 60 * 1000; // 1h

  const windowStart = threatStartMs - BUFFER_MS;
  const windowEnd   = threatEndMs   + 2*BUFFER_MS;

  const ok = etaMs >= windowStart && etaMs <= windowEnd;
  const minutesBefore = Math.round((threatStartMs - etaMs) / 60000);

  return { ok, minutesBefore };
}

export const prerender = false;

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    dbg('Cache HIT — retour immédiat');
    return new Response(JSON.stringify(cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    const [tafRisks, allFlights] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(),
    ]);

    // ── Diagnostics généraux ─────────────────────────────────────────────────
    dbg(`TAF risques : ${tafRisks.length} aéroports`);
    dbg(`TAF ICAO concernés : ${tafRisks.map(t => t.icao).join(', ')}`);
    dbg(`Vols chargés total : ${allFlights.length}`);
    dbg(`Vols ICAO uniques  : ${[...new Set(allFlights.map(f => f.icao))].join(', ')}`);

    // ── Exemple vol brut ─────────────────────────────────────────────────────
    if (allFlights.length > 0) {
      dbg('Sample vol[0] :', JSON.stringify(allFlights[0], null, 2));
    } else {
      dbg('⚠️ allFlights est VIDE — vérifier AF_API_KEY et pageSize');
    }

    // ── Exemple menace brute ─────────────────────────────────────────────────
    if (tafRisks.length > 0 && tafRisks[0].threats.length > 0) {
      const t = tafRisks[0].threats[0];
      dbg(`Sample threat[0] : type=${t.type} severity=${t.severity}`);
      dbg(`  periodStart raw  : ${t.periodStart}`);
      dbg(`  periodStart ISO  : ${new Date(t.periodStart * 1000).toISOString()}`);
      dbg(`  periodEnd   ISO  : ${new Date(t.periodEnd   * 1000).toISOString()}`);
    } else {
      dbg('⚠️ Aucun TAF avec menace détectée');
    }

    // ── Filtrage vols invalides ───────────────────────────────────────────────
const cleanedFlights = allFlights.filter(f => {
  if (f.aircraftType === 'BUS') return false;          // rotations bus
  if (!f.registration?.trim()) return false;           // vol annulé / non assigné
  return true;
});

// ── Matching ─────────────────────────────────────────────────────────────
const hits: TafFlightHit[] = [];
let totalFlightsChecked = 0;
let rejectedNoIcaoMatch = 0;
let rejectedTimeWindow  = 0;

for (const taf of tafRisks) {
  if (!taf.icao) continue;

  // ← cleanedFlights au lieu de allFlights
  const flights = cleanedFlights.filter(f => f.icao === taf.icao);

  dbg(`  ${taf.icao} (${taf.iata}) → ${taf.threats.length} menaces, ${flights.length} vols AF trouvés`);

  if (!flights.length) {
    rejectedNoIcaoMatch += 1;
    continue;
  }

  for (const threat of taf.threats) {
    for (const flight of flights) {
      totalFlightsChecked++;
      const etaIso = flight.estimatedArrival ?? flight.scheduledArrival;
      if (!etaIso) continue;

      const etaMs = new Date(etaIso).getTime();
      const { ok, minutesBefore } = overlapsThreatWindow(etaMs, threat);

      if (!ok) {
        rejectedTimeWindow++;
        dbg(
          `    ✗ AF${flight.flightNumber} ETA=${new Date(etaMs).toISOString()}` +
          ` vs menace [${new Date(threat.periodStart * 1000).toISOString()} →` +
          ` ${new Date(threat.periodEnd * 1000).toISOString()}]` +
          ` | minutesBefore=${minutesBefore}`
        );
        continue;
      }

      dbg(
        `    ✅ MATCH AF${flight.flightNumber} ETA=${new Date(etaMs).toISOString()}` +
        ` | menace ${threat.type} ${threat.severity}` +
        ` | minutesBefore=${minutesBefore}`
      );

      hits.push({ taf, threat, flight, minutesBeforeThreatStart: minutesBefore });
    }
  }
}

// ── Résumé matching ───────────────────────────────────────────────────────
dbg(`Matching terminé :`);
dbg(`  Vols bruts         : ${allFlights.length}`);
dbg(`  Vols après filtre  : ${cleanedFlights.length}`);
dbg(`  Vols vérifiés      : ${totalFlightsChecked}`);
dbg(`  Rejetés (no ICAO)  : ${rejectedNoIcaoMatch}`);
dbg(`  Rejetés (fenêtre)  : ${rejectedTimeWindow}`);
dbg(`  Hits               : ${hits.length}`);

    // ── Tri ──────────────────────────────────────────────────────────────────
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
