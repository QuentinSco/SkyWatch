// src/lib/afFlights.ts
import { Redis } from '@upstash/redis';
import { AF_IATA_TO_ICAO } from './tafParser';

const kv = new Redis({
  url:   import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export interface AfFlightArrival {
  flightId: string;
  marketingCarrier: string;
  flightNumber: string;
  iata: string;
  icao: string;
  registration?: string;
  aircraftType?: string;
  haul?: string;              // raw haul value from AF API — kept for debugging
  isLongHaul: boolean;        // true = LC (widebody), false = MC (narrowbody)
  scheduledArrival: string;
  estimatedTouchDownTime?: string;
  timeToArrivalMinutes?: number;
}

export interface AfFlightsCache {
  flights: AfFlightArrival[];
  fetchedAt: number;  // Unix timestamp (ms) du dernier fetch API
}

const KV_KEY          = 'af_flights_cache';
const KV_LOCK_KEY     = 'af_flights_lock';
const KV_TTL_SEC      = 2 * 60 * 60;        // 2h TTL — 12 refresh/day max = ~24-48 API calls (quota 100/day)
const KV_EMPTY_TTL    = 5 * 60;             // 5min TTL cache vide (évite re-fetch inutiles)
const LOCK_TTL        = 60;                 // 60s max pour un fetch

/**
 * Air France long-haul aircraft types (widebody intercontinental).
 *   332 — Airbus A330-200
 *   77W — Boeing 777-300ER
 *   772 — Boeing 777-200ER
 *   789 — Boeing 787-9
 *   359 — Airbus A350-900
 */
const LC_AIRCRAFT_TYPES = new Set(['332', '77W', '772', '789', '359']);

/**
 * Air France medium-haul aircraft types (narrowbody).
 *   319 — Airbus A319
 *   320 — Airbus A320
 *   321 — Airbus A321
 *   223 — Airbus A220-300
 *   E90 — Embraer E190
 */
const MC_AIRCRAFT_TYPES = new Set(['319', '320', '321', '223', 'E90']);

/** Returns true if the aircraft type is a long-haul wide-body. */
export function isLongHaulAircraft(typeCode: string | undefined | null): boolean {
  if (!typeCode) return false;
  return LC_AIRCRAFT_TYPES.has(typeCode.trim().toUpperCase());
}

/** Returns true if the aircraft type is a medium-haul narrow-body. */
export function isMediumHaulAircraft(typeCode: string | undefined | null): boolean {
  if (!typeCode) return false;
  return MC_AIRCRAFT_TYPES.has(typeCode.trim().toUpperCase());
}

/** Returns true if the aircraft type is either LC or MC (any AF revenue type). */
export function isOperationalAircraft(typeCode: string | undefined | null): boolean {
  return isLongHaulAircraft(typeCode) || isMediumHaulAircraft(typeCode);
}

function minutesToArrival(etaIso: string | undefined): number | undefined {
  if (!etaIso) return undefined;
  return Math.round((new Date(etaIso).getTime() - Date.now()) / 60000);
}

function mapLegToArrival(operationalFlight: any, leg: any): AfFlightArrival | null {
  try {
    const carrier = operationalFlight.airline?.code ?? 'AF';
    const fn      = String(operationalFlight.flightNumber ?? '').padStart(3, '0');
    const arrCode = leg.arrivalInformation?.airport?.code;
    if (!arrCode) return null;

    const iata = arrCode.toUpperCase();
    const icao = AF_IATA_TO_ICAO[iata];
    if (!icao) return null;

    const times     = leg.arrivalInformation?.times ?? {};
    const scheduled = times.scheduled ?? times.latestPublished ?? times.estimatedArrival;
    const estimated = times.estimatedTouchDownTime ?? times.estimated?.value ?? times.actual;
    if (!scheduled) return null;

    const typeCode = leg.aircraft?.typeCode ?? undefined;

    return {
      flightId:               `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}`,
      marketingCarrier:       carrier,
      flightNumber:           fn,
      iata,
      icao,
      registration:           leg.aircraft?.registration ?? undefined,
      aircraftType:           typeCode,
      haul:                   operationalFlight.haul ?? undefined,
      isLongHaul:             isLongHaulAircraft(typeCode),
      scheduledArrival:       scheduled,
      estimatedTouchDownTime: estimated,
      timeToArrivalMinutes:   minutesToArrival(estimated ?? scheduled),
    };
  } catch (e) {
    console.error('[AF mapLegToArrival]', e);
    return null;
  }
}

async function callAfApi(): Promise<AfFlightArrival[]> {
  const API_KEY = import.meta.env.AF_API_KEY;
  if (!API_KEY) {
    console.warn('[AF Flights] AF_API_KEY manquante');
    return [];
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59));

  const headers: Record<string, string> = {
    'API-Key':    API_KEY,
    'Accept':     'application/hal+json',
    'User-Agent': 'SkyWatch/1.0',
  };

  const url = new URL('https://api.airfranceklm.com/opendata/flightstatus');
  url.searchParams.set('startRange',           start.toISOString());
  url.searchParams.set('endRange',             end.toISOString());
  url.searchParams.set('timeType',             'U');
  url.searchParams.set('movementType',         'A');
  url.searchParams.set('carrierCode',          'AF');
  url.searchParams.set('operatingAirlineCode', 'AF');
  url.searchParams.set('pageSize',             '100');
  url.searchParams.set('pageNumber',           '0');

  console.log('[AF Flights] → requête API AF', start.toISOString(), '→', end.toISOString());

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[AF Flights] HTTP', res.status, body);
    if (res.status === 429) {
      throw new Error(`Quota API Air France dépassé (429) — réessaie demain ou augmente le plan.`);
    }
    return [];
  }

  const json       = await res.json();
  const ops: any[] = Array.isArray(json.operationalFlights) ? json.operationalFlights : [];
  const totalPages = json.page?.totalPages ?? 1;

  console.log(`[AF Flights] page 0/${totalPages} — ${ops.length} vols (avant filtre)`);

  // ── Pagination avec délai 1.1s (respect QPS 1 req/s) ─────────────────────
  for (let p = 1; p < totalPages; p++) {
    await new Promise(r => setTimeout(r, 1100));
    const u = new URL(url.toString());
    u.searchParams.set('pageNumber', String(p));
    const r = await fetch(u.toString(), { method: 'GET', headers, signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const j     = await r.json();
      const extra = j.operationalFlights ?? [];
      ops.push(...extra);
      console.log(`[AF Flights] page ${p}/${totalPages} — +${extra.length} vols`);
    } else {
      console.warn(`[AF Flights] page ${p} HTTP`, r.status);
      if (r.status === 429) {
        throw new Error(`Quota API Air France dépassé (429) à la page ${p}.`);
      }
    }
  }

  // ── Mapping — filtre airline AF + aircraft LC ou MC ───────────────────────
  const arrivals: AfFlightArrival[] = [];
  let skippedAirline  = 0;
  let skippedAircraft = 0;

  for (const op of ops) {
    // ✅ Filtre 1 : vols opérés par Air France uniquement
    const airlineCode = op.airline?.code ?? '';
    if (airlineCode !== 'AF') {
      skippedAirline++;
      continue;
    }

    for (const leg of (op.flightLegs ?? [])) {
      // ✅ Filtre 2 : type avion LC ou MC uniquement (exclut BUS, turboprops, etc.)
      const aircraftType = leg.aircraft?.typeCode ?? '';
      if (!isOperationalAircraft(aircraftType)) {
        skippedAircraft++;
        continue;
      }

      const mapped = mapLegToArrival(op, leg);
      if (mapped) arrivals.push(mapped);
    }
  }

  const lcCount = arrivals.filter(f => f.isLongHaul).length;
  const mcCount = arrivals.filter(f => !f.isLongHaul).length;
  console.log(`[AF Flights] ${arrivals.length} vols retenus (LC: ${lcCount}, MC: ${mcCount}) — ${skippedAirline} partenaires filtrés — ${skippedAircraft} autres types filtrés`);

  // ── Dé-doublonnage ────────────────────────────────────────────────────────
  const dedup = new Map<string, AfFlightArrival>();
  for (const f of arrivals) {
    dedup.set(`${f.flightId}-${f.icao}`, f);
  }

  return Array.from(dedup.values());
}

/**
 * ✅ Cache Redis partagé entre toutes les instances Vercel.
 * ✅ Distributed lock — une seule instance fait le fetch à la fois.
 * ✅ Les autres instances attendent que le cache soit rempli.
 * ✅ Stocke [] avec TTL court si aucun vol futur, bloquant les re-fetch.
 * ✅ Paramètre force pour bypass manuel du cache (via bouton UI).
 *
 * @param force      - bypass le cache Redis et force un fetch frais
 * @param lcOnly     - si true, retourne uniquement les vols LC (widebody)
 *                     usage : briefing.ts, taf-vol-risks.ts (comportement historique)
 *                     usage crosswind : false (LC + MC)
 */
export async function getCachedAfArrivals(force = false, lcOnly = true): Promise<AfFlightArrival[]> {

  const now = Date.now();

  // ── 1. Cache KV — hit → retour immédiat, 0 requête AF ────────────────────
  if (!force) {
    try {
      const cached = await kv.get<AfFlightsCache>(KV_KEY);
      if (cached && Array.isArray(cached.flights)) {
        const futureFlights = cached.flights.filter(f => {
          const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
          return eta > now - 30 * 60 * 1000; // tolérance 30min passé
        });
        console.log(`[AF Flights] cache hit — ${futureFlights.length} vols futurs (lcOnly=${lcOnly})`);
        return lcOnly ? futureFlights.filter(f => f.isLongHaul) : futureFlights;
      }
    } catch (e) {
      console.warn('[AF Flights] cache read error:', e);
    }
  }

  // ── 2. Distributed lock ───────────────────────────────────────────────────
  const lockAcquired = await kv.set(KV_LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });

  if (!lockAcquired) {
    // Une autre instance fait le fetch — attendre le cache
    console.log('[AF Flights] lock busy — waiting for cache...');
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const cached = await kv.get<AfFlightsCache>(KV_KEY);
        if (cached && Array.isArray(cached.flights)) {
          const futureFlights = cached.flights.filter(f => {
            const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
            return eta > now - 30 * 60 * 1000;
          });
          return lcOnly ? futureFlights.filter(f => f.isLongHaul) : futureFlights;
        }
      } catch { /* continue */ }
    }
    console.warn('[AF Flights] lock timeout — returning []');
    return [];
  }

  // ── 3. Fetch API AF ───────────────────────────────────────────────────────
  try {
    const flights = await callAfApi();
    const ttl = flights.length === 0 ? KV_EMPTY_TTL : KV_TTL_SEC;
    await kv.set(KV_KEY, { flights, fetchedAt: Date.now() } satisfies AfFlightsCache, { ex: ttl });
    console.log(`[AF Flights] cache updated — ${flights.length} vols, TTL ${ttl}s`);
    return lcOnly ? flights.filter(f => f.isLongHaul) : flights;
  } finally {
    await kv.del(KV_LOCK_KEY);
  }
}

export async function getCacheFetchedAt(): Promise<number | null> {
  try {
    const cached = await kv.get<AfFlightsCache>(KV_KEY);
    return cached?.fetchedAt ?? null;
  } catch {
    return null;
  }
}

/**
 * @deprecated Alias de getCachedAfArrivals — conservé pour compatibilité avec chainages.ts.
 * Retourne uniquement les vols LC (lcOnly = true par défaut).
 */
export async function getCachedAfFlights(force = false): Promise<AfFlightArrival[]> {
  return getCachedAfArrivals(force, /* lcOnly = */ true);
}
