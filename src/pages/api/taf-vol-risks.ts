// src/pages/api/taf-vol-risks.ts
import type { APIRoute } from 'astro';
import type { TafRisk, TafThreat } from '../../lib/tafParser';
import type { AfFlightArrival } from '../../lib/afFlights';
import { fetchTafRisks, parseTafToRisks, AF_AIRPORT_ICAOS } from '../../lib/tafParser';
import { getCachedAfArrivals, getCacheFetchedAt } from '../../lib/afFlights';
import { redis } from '../../lib/redis';
import { KV_BACKUP_KEY, KV_BACKUP_MODE_KEY } from './backup-upload';
import type { CsvBackupCache } from '../../lib/csvBackupParser';

// Mode debug — actif uniquement en développement local
const DEBUG = import.meta.env.DEV === true;

function dbg(...args: unknown[]) {
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
  fcsts: unknown[];  // périodes brutes pour la frise temporelle
}

export interface TafVolRisksResponse {
  hits:         TafFlightHit[];
  baseHits:     TafFlightHit[];
  baseTafs:     BaseTaf[];
  cacheFetchedAt?: number | null;
  backupMode?:  boolean;   // true si les vols viennent du CSV backup
  backupInfo?:  { uploadedAt: number; filename: string; flightCount: number } | null;
}

// Cache Redis partagé — utilise l'instance sécurisée de redis.ts
const kv = redis;
const TAF_VOL_CACHE_VERSION = 'v3';
const TAF_VOL_CACHE_KEY     = `taf_vol_risks_cache_${TAF_VOL_CACHE_VERSION}`;
const TAF_VOL_CACHE_TTL_SEC = 20 * 60; // 20 min

// Bases home — exclues de la section "Vols LC impactés", affichées dans leur propre section
const HOME_BASES = new Set(['LFPG', 'LFPO']); // CDG, ORY

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

// ── Lecture des vols backup depuis le KV ────────────────────────────────────────────
async function getBackupFlights(): Promise<{ flights: AfFlightArrival[]; info: { uploadedAt: number; filename: string; flightCount: number } | null }> {
  if (!kv) return { flights: [], info: null };
  try {
    const cache = await kv.get<CsvBackupCache>(KV_BACKUP_KEY);
    if (!cache || !Array.isArray(cache.flights)) return { flights: [], info: null };
    // Filtre LC uniquement en mode backup (le CSV contient LC+MC+CC)
    const lcFlights = cache.flights.filter((f: AfFlightArrival) => f.isLongHaul !== false);
    return {
      flights: lcFlights,
      info: {
        uploadedAt:  cache.uploadedAt,
        filename:    cache.filename,
        flightCount: lcFlights.length,
      },
    };
  } catch (e) {
    console.warn('[taf-vol-risks] lecture backup KV:', e);
    return { flights: [], info: null };
  }
}

// ── Détecte si le mode backup doit être utilisé ──────────────────────────────────
async function shouldUseBackup(): Promise<boolean> {
  if (!kv) return false;
  try {
    const flag = await kv.get<boolean>(KV_BACKUP_MODE_KEY);
    return flag === true;
  } catch {
    return false;
  }
}

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const force = url.searchParams.get('force') === '1';

  if (force) dbg('Force refresh demandé — bypass cache TAF+VOL');

  // ── Cache KV — hit → retour immédiat (seulement si pas mode backup) ─────────────
  if (!force && kv) {
    try {
      const backupActive = await shouldUseBackup();
      if (!backupActive) {
        const cached = await kv.get<TafVolRisksResponse>(TAF_VOL_CACHE_KEY);
        if (cached) {
          dbg('Cache KV HIT — retour immédiat');
          return new Response(JSON.stringify(cached), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
          });
        }
      }
    } catch (e) {
      console.warn('[taf-vol-risks] KV read error:', e);
    }
  }

  try {
    // ── Vols : API AF ou backup CSV ───────────────────────────────────────────────
    const usingBackup = await shouldUseBackup();
    let allFlights: AfFlightArrival[] = [];
    let backupInfo: TafVolRisksResponse['backupInfo'] = null;

    if (usingBackup) {
      dbg('Mode backup actif — lecture vols depuis CSV KV (LC uniquement)');
      const { flights, info } = await getBackupFlights();
      allFlights = flights;
      backupInfo = info;
      console.log(`[taf-vol-risks] backup: ${allFlights.length} vols LC chargés`);
    } else {
      allFlights = await getCachedAfArrivals(force);
      dbg(`Vols chargés API AF : ${allFlights.length}`);
    }

    // ── TAF réseau AF + TAF bases CDG/ORY (fetch dédié, indépendant du cache) ────
    const [tafRisks, rawBaseTafsResult] = await Promise.all([
      fetchTafRisks(force, false),
      fetch(
        `https://aviationweather.gov/api/data/taf?ids=LFPG,LFPO&format=json&metar=false`,
        {
          headers: { 'User-Agent': 'SkyWatch/1.0 dispatch-tool' },
          signal: AbortSignal.timeout(12000),
        }
      ).then(r => r.ok ? r.json() : Promise.resolve([])).catch(() => []),
    ]);

    const cacheFetchedAt = usingBackup ? null : await getCacheFetchedAt();

    // Parser les threats CDG/ORY directement depuis le TAF brut dédié
    // → indépendant du cache fetchTafRisks qui peut ne pas contenir LFPG/LFPO
    //   si ceux-ci n'avaient aucune menace lors du dernier remplissage du cache.
    const rawBaseTafs: any[] = Array.isArray(rawBaseTafsResult) ? rawBaseTafsResult : [];
    const baseParsedRisks = parseTafToRisks(rawBaseTafs); // inclut yellow

    const IATA_MAP: Record<string, string> = { LFPG: 'CDG', LFPO: 'ORY' };
    const NAME_MAP: Record<string, string> = { LFPG: 'Paris CDG', LFPO: 'Paris Orly' };

    dbg(`TAF risques réseau : ${tafRisks.length} aéroports`);
    dbg(`TAF bases parsés : ${baseParsedRisks.length} aéroports`);
    dbg(`Vols chargés total : ${allFlights.length}`);

    const now = Date.now();
    const cleanedFlights = allFlights.filter(f => {
      if (f.aircraftType === 'BUS') return false;
      // Exclure les vols au départ (movementType D) : pas d'ETA d'arrivée pertinent
      if (f.movementType === 'D') return false;
      // Exclure les arrivées à CDG ou ORY (affichées dans la section base)
      if (f.iata === 'CDG' || f.iata === 'ORY') return false;
      const etaIso = f.estimatedTouchDownTime ?? f.scheduledArrival;
      if (etaIso) {
        const etaMs = new Date(etaIso).getTime();
        if (etaMs < now - 30 * 60 * 1000) return false;
      }
      return true;
    });

    const hits: TafFlightHit[] = [];

    for (const taf of tafRisks) {
      if (!taf.icao) continue;
      const flights = cleanedFlights.filter(f => f.icao === taf.icao);
      if (!flights.length) continue;

      for (const threat of taf.threats) {
        if (threat.severity === 'yellow') continue;

        for (const flight of flights) {
          const etaIso = flight.estimatedTouchDownTime ?? flight.scheduledArrival;
          if (!etaIso) continue;

          const etaMs = new Date(etaIso).getTime();
          const { ok, minutesBefore } = overlapsThreatWindow(etaMs, threat);
          if (!ok) continue;

          hits.push({ taf, threat, flight, minutesBeforeThreatStart: minutesBefore });
        }
      }
    }

    const filteredHits = hits.filter(h => !HOME_BASES.has(h.taf.icao));
    const baseHits     = hits.filter(h =>  HOME_BASES.has(h.taf.icao));

    // ── Construction baseTafs — threats depuis le parser dédié (toujours à jour) ──
    const baseTafs: BaseTaf[] = ['LFPG', 'LFPO'].map(icao => {
      const parsedEntry = baseParsedRisks.find(r => r.icao === icao);
      const rawEntry    = rawBaseTafs.find((t: any) => (t.icaoId ?? t.stationId) === icao);
      return {
        icao,
        iata: IATA_MAP[icao],
        name: NAME_MAP[icao],
        rawTaf:        parsedEntry?.rawTaf ?? (rawEntry?.rawTAF as string) ?? '',
        worstSeverity: parsedEntry?.worstSeverity ?? 'none',
        threats:       parsedEntry?.threats ?? [],
        fcsts:         (rawEntry?.fcsts as unknown[]) ?? [],
      };
    });

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
      hits:          filteredHits,
      baseHits,
      baseTafs,
      cacheFetchedAt,
      backupMode:    usingBackup,
      backupInfo:    usingBackup ? backupInfo : null,
    };

    // Ne pas stocker en cache KV quand backup actif (données statiques CSV)
    if (!usingBackup && kv) {
      try {
        await kv.set(TAF_VOL_CACHE_KEY, response, { ex: TAF_VOL_CACHE_TTL_SEC });
        dbg(`Cache KV MISS → stocké (TTL ${TAF_VOL_CACHE_TTL_SEC}s)`);
      } catch (e) {
        console.warn('[taf-vol-risks] KV write error:', e);
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': usingBackup ? 'BACKUP' : 'MISS' },
    });

  } catch (e) {
    console.error('[API /taf-vol-risks]', e);
    return new Response(JSON.stringify({ error: String(e), hits: [], baseHits: [], baseTafs: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
