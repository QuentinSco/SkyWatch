// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import type { TafRisk, TafThreat } from '../../lib/tafParser';
import type { AfFlightArrival } from '../../lib/afFlights';
import { fetchTafRisks, AF_AIRPORT_ICAOS } from '../../lib/tafParser';
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

// TAF complet d'un aéroport base (CDG/ORY), même sans menace
export interface BaseTaf {
  icao: string;
  iata: string;
  name: string;
  rawTaf: string;
  worstSeverity: TafRisk['worstSeverity'] | 'none';
  threats: TafThreat[];
  fcsts: any[];  // périodes brutes pour la frise temporelle
}

export interface TafVolRisksResponse {
  hits:     TafFlightHit[];
  baseHits: TafFlightHit[];
  baseTafs: BaseTaf[];   // ← toujours présent, même si vide de menaces
}

const CACHE_TTL = 20 * 60 * 1000;
let cache: { ts: number; data: TafVolRisksResponse } | null = null;

// Bases home — exclues de la section "Vols LC impactés", affichées dans leur propre section
const HOME_BASES = new Set(['LFPG', 'LFPO']); // CDG, ORY

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
    // Fetch TAF bruts (tous aéroports AF) + vols en parallèle
    // On a besoin des TAF bruts pour CDG/ORY même si parseTafToRisks ne les retourne pas
    // (car pas de menace). On les fetch directement via l'AWC API.
    const [tafRisks, allFlights, rawBaseTafsResult] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(),
      fetch(
        `https://aviationweather.gov/api/data/taf?ids=LFPG,LFPO&format=json&metar=false`,
        {
          headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' },
          signal: AbortSignal.timeout(12000),
        }
      ).then(r => r.ok ? r.json() : Promise.resolve([])).catch(() => []),
    ]);

    // ── Diagnostics généraux ────────────────────────────────────────────────────
    dbg(`TAF risques : ${tafRisks.length} aéroports`);
    dbg(`TAF ICAO concernés : ${tafRisks.map(t => t.icao).join(', ')}`);
    dbg(`Vols chargés total : ${allFlights.length}`);
    dbg(`Vols ICAO uniques  : ${[...new Set(allFlights.map(f => f.icao))].join(', ')}`);

    // ── Exemple vol brut ────────────────────────────────────────────────────
    if (allFlights.length > 0) {
      dbg('Sample vol[0] :', JSON.stringify(allFlights[0], null, 2));
    } else {
      dbg('⚠️ allFlights est VIDE — vérifier AF_API_KEY et pageSize');
    }

    // ── Exemple menace brute ────────────────────────────────────────────────────
    if (tafRisks.length > 0 && tafRisks[0].threats.length > 0) {
      const t = tafRisks[0].threats[0];
      dbg(`Sample threat[0] : type=${t.type} severity=${t.severity}`);
      dbg(`  periodStart raw  : ${t.periodStart}`);
      dbg(`  periodStart ISO  : ${new Date(t.periodStart * 1000).toISOString()}`);
      dbg(`  periodEnd   ISO  : ${new Date(t.periodEnd   * 1000).toISOString()}`);
    } else {
      dbg('⚠️ Aucun TAF avec menace détectée');
    }

    // ── Filtrage vols invalides ────────────────────────────────────────────────────
    const now = Date.now();
    const cleanedFlights = allFlights.filter(f => {
      if (f.aircraftType === 'BUS') return false;
      if (!f.registration?.trim()) return false;
      const etaIso = f.estimatedArrival ?? f.scheduledArrival;
      if (etaIso && new Date(etaIso).getTime() < now) return false;
      return true;
    });

    // ── Matching ────────────────────────────────────────────────────────────────────
    const hits: TafFlightHit[] = [];
    let totalFlightsChecked = 0;
    let rejectedNoIcaoMatch = 0;
    let rejectedTimeWindow  = 0;

    for (const taf of tafRisks) {
      if (!taf.icao) continue;

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

    // ── Résumé matching ────────────────────────────────────────────────────────────────────
    dbg(`Matching terminé :`);
    dbg(`  Vols bruts         : ${allFlights.length}`);
    dbg(`  Vols après filtre  : ${cleanedFlights.length}`);
    dbg(`  Vols vérifiés      : ${totalFlightsChecked}`);
    dbg(`  Rejetés (no ICAO)  : ${rejectedNoIcaoMatch}`);
    dbg(`  Rejetés (fenêtre)  : ${rejectedTimeWindow}`);
    dbg(`  Hits               : ${hits.length}`);

    // ── Séparation vols LC (hors base) vs base CDG/ORY ──────────────────────────────────────
    const filteredHits = hits.filter(h => !HOME_BASES.has(h.taf.icao));
    const baseHits     = hits.filter(h =>  HOME_BASES.has(h.taf.icao));

    dbg(`  Vols LC (hors CDG/ORY) : ${filteredHits.length}`);
    dbg(`  Vols base CDG/ORY      : ${baseHits.length}`);

    // ── Construction baseTafs (CDG + ORY toujours présents) ─────────────────────────────────
    const IATA_MAP: Record<string, string> = { LFPG: 'CDG', LFPO: 'ORY' };
    const NAME_MAP: Record<string, string> = { LFPG: 'Paris CDG', LFPO: 'Paris Orly' };

    const rawBaseTafs: any[] = Array.isArray(rawBaseTafsResult) ? rawBaseTafsResult : [];
    dbg(`  TAF bruts CDG/ORY : ${rawBaseTafs.length}`);

    const baseTafs: BaseTaf[] = ['LFPG', 'LFPO'].map(icao => {
      // Cherche dans les risques parsés (si menace détectée)
      const riskEntry = tafRisks.find(r => r.icao === icao);
      // Cherche le TAF brut AWC
      const rawEntry  = rawBaseTafs.find((t: any) => (t.icaoId ?? t.stationId) === icao);

      return {
        icao,
        iata: IATA_MAP[icao],
        name: NAME_MAP[icao],
        rawTaf:        riskEntry?.rawTaf ?? rawEntry?.rawTAF ?? '',
        worstSeverity: riskEntry?.worstSeverity ?? 'none',
        threats:       riskEntry?.threats ?? [],
        fcsts:         rawEntry?.fcsts ?? [],
      };
    });

    // ── Tri ────────────────────────────────────────────────────────────────────────
    const sortHits = (arr: TafFlightHit[]) => arr.sort((a, b) => {
      const sev: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
      if (sev[a.threat.severity] !== sev[b.threat.severity])
        return sev[a.threat.severity] - sev[b.threat.severity];
      return new Date(a.flight.estimatedArrival ?? a.flight.scheduledArrival).getTime() -
             new Date(b.flight.estimatedArrival ?? b.flight.scheduledArrival).getTime();
    });

    sortHits(filteredHits);
    sortHits(baseHits);

    const response: TafVolRisksResponse = { hits: filteredHits, baseHits, baseTafs };
    cache = { ts: Date.now(), data: response };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });

  } catch (e) {
    console.error('[API /taf-vol-risks]', e);
    return new Response(JSON.stringify({ error: String(e), hits: [], baseHits: [], baseTafs: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
