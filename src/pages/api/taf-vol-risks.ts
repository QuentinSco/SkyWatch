// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import type { TafRisk, TafThreat } from '../../lib/tafParser';
import type { AfFlightArrival } from '../../lib/afFlights';
import { fetchTafRisks, AF_AIRPORT_ICAOS } from '../../lib/tafParser';
import { getCachedAfArrivals, getCacheFetchedAt } from '../../lib/afFlights';
import { Redis } from '@upstash/redis';

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
  baseTafs: BaseTaf[];
  cacheFetchedAt?: number | null;  // ✅ Timestamp du dernier fetch API AF (pour affichage âge cache)
}

// ✅ Cache Redis partagé — remplace le cache in-memory inopérant sur Vercel (cold-start)
const kv = new Redis({
  url:   import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});
const TAF_VOL_CACHE_KEY     = 'taf_vol_risks_cache';
const TAF_VOL_CACHE_TTL_SEC = 20 * 60; // 20 min

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

export const GET: APIRoute = async ({ url }) => {
  // ✅ Paramètre force pour bypass cache (bouton Actualiser dans UI)
  const force = url.searchParams.get('force') === '1';
  
  if (force) {
    dbg('Force refresh demandé — bypass cache TAF+VOL');
  }

  // ── Cache KV — hit → retour immédiat, 0 calcul ──────────────────────────
  if (!force) {
    try {
      const cached = await kv.get<TafVolRisksResponse>(TAF_VOL_CACHE_KEY);
      if (cached) {
        dbg('Cache KV HIT — retour immédiat');
        return new Response(JSON.stringify(cached), {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }
    } catch (e) {
      console.warn('[taf-vol-risks] KV read error:', e);
    }
  }

  try {
    // Fetch TAF bruts (tous aéroports AF) + vols en parallèle
    const [tafRisks, allFlights, rawBaseTafsResult] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(force),  // ✅ Passe le paramètre force
      fetch(
        `https://aviationweather.gov/api/data/taf?ids=LFPG,LFPO&format=json&metar=false`,
        {
          headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' },
          signal: AbortSignal.timeout(12000),
        }
      ).then(r => r.ok ? r.json() : Promise.resolve([])).catch(() => []),
    ]);

    // ✅ Récupération du timestamp du cache AF pour affichage dans l'UI
    const cacheFetchedAt = await getCacheFetchedAt();

    // ── Diagnostics généraux ────────────────────────────────────────────────────
    dbg(`TAF risques : ${tafRisks.length} aéroports`);
    dbg(`TAF ICAO concernés : ${tafRisks.map(t => t.icao).join(', ')}`);
    dbg(`Vols chargés total : ${allFlights.length}`);
    dbg(`Vols ICAO uniques  : ${[...new Set(allFlights.map(f => f.icao))].join(', ')}`);

    if (allFlights.length > 0) {
      dbg('Sample vol[0] :', JSON.stringify(allFlights[0], null, 2));
    } else {
      dbg('⚠️ allFlights est VIDE — vérifier AF_API_KEY et pageSize');
    }

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
      const etaIso = f.estimatedTouchDownTime ?? f.scheduledArrival;
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
          const etaIso = flight.estimatedTouchDownTime ?? flight.scheduledArrival;
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
      const riskEntry = tafRisks.find(r => r.icao === icao);
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
      return new Date(a.flight.estimatedTouchDownTime ?? a.flight.scheduledArrival).getTime() -
             new Date(b.flight.estimatedTouchDownTime ?? b.flight.scheduledArrival).getTime();
    });

    sortHits(filteredHits);
    sortHits(baseHits);

    const response: TafVolRisksResponse = { 
      hits: filteredHits, 
      baseHits, 
      baseTafs,
      cacheFetchedAt,  // ✅ Timestamp pour calcul âge cache dans UI
    };

    // ✅ Stockage en KV Redis (TTL 20 min) — partagé entre toutes les instances Vercel
    try {
      await kv.set(TAF_VOL_CACHE_KEY, response, { ex: TAF_VOL_CACHE_TTL_SEC });
      dbg(`Cache KV MISS → stocké (TTL ${TAF_VOL_CACHE_TTL_SEC}s)`);
    } catch (e) {
      console.warn('[taf-vol-risks] KV write error:', e);
    }

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
