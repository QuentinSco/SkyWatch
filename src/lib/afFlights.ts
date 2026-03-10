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
  movementType?: 'A' | 'D';   // A = arrivée, D = départ (optionnel pour rétrocompat)
  iata: string;
  icao: string;
  registration?: string;
  aircraftType?: string;
  haul?: string;
  isLongHaul: boolean;
  scheduledArrival: string;          // pour les arrivées : STA ; pour les départs : STD
  estimatedTouchDownTime?: string;   // ETA (arrivées) ou EOBT (départs)
  timeToArrivalMinutes?: number;
  // ── Champs départ (optionnels) ──
  departureIata?: string;
  scheduledDeparture?: string;
  estimatedOffBlockTime?: string;
}

export interface AfFlightsCache {
  flights: AfFlightArrival[];
  fetchedAt: number;
  quotaExceeded?: boolean;  // true si le dernier fetch a échoué avec un 429
}

const KV_KEY          = 'af_flights_cache';
const KV_LOCK_KEY     = 'af_flights_lock';
const KV_TTL_SEC      = 2 * 60 * 60;
const KV_EMPTY_TTL    = 5 * 60;
const LOCK_TTL        = 60;

const LC_AIRCRAFT_TYPES = new Set(['332', '77W', '772', '789', '359']);
const MC_AIRCRAFT_TYPES = new Set(['319', '320', '321', '223', 'E90']);

export function isLongHaulAircraft(typeCode: string | undefined | null): boolean {
  if (!typeCode) return false;
  return LC_AIRCRAFT_TYPES.has(typeCode.trim().toUpperCase());
}

export function isMediumHaulAircraft(typeCode: string | undefined | null): boolean {
  if (!typeCode) return false;
  return MC_AIRCRAFT_TYPES.has(typeCode.trim().toUpperCase());
}

export function isOperationalAircraft(typeCode: string | undefined | null): boolean {
  return isLongHaulAircraft(typeCode) || isMediumHaulAircraft(typeCode);
}

function minutesToArrival(etaIso: string | undefined): number | undefined {
  if (!etaIso) return undefined;
  return Math.round((new Date(etaIso).getTime() - Date.now()) / 60000);
}

/**
 * Mappe un leg en AfFlightArrival.
 * movementType détermine si on lit departureInformation (D) ou arrivalInformation (A).
 */
function mapLeg(operationalFlight: any, leg: any, movementType: 'A' | 'D'): AfFlightArrival | null {
  try {
    const carrier = operationalFlight.airline?.code ?? 'AF';
    const fn      = String(operationalFlight.flightNumber ?? '').padStart(3, '0');
    const typeCode = leg.aircraft?.typeCode ?? undefined;

    if (movementType === 'A') {
      // ── Arrivée : aéroport cible = arrivalInformation ──
      const arrCode = leg.arrivalInformation?.airport?.code;
      if (!arrCode) return null;
      const iata = arrCode.toUpperCase();
      const icao = AF_IATA_TO_ICAO[iata];
      if (!icao) return null;

      const times     = leg.arrivalInformation?.times ?? {};
      const scheduled = times.scheduled ?? times.latestPublished ?? times.estimatedArrival;
      const estimated = times.estimatedTouchDownTime ?? times.estimated?.value ?? times.actual;
      if (!scheduled) return null;

      const depInfo  = leg.departureInformation ?? {};
      const depTimes = depInfo.times ?? {};
      const depCode  = depInfo.airport?.code ?? depInfo.airport?.iataCode;
      const stdRaw   = depTimes.scheduled ?? depTimes.latestPublished;
      const eobtRaw  = depTimes.estimatedOffBlockTime ?? depTimes.estimated?.value;

      return {
        flightId:               `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}-A-${icao}`,
        marketingCarrier:       carrier,
        flightNumber:           fn,
        movementType:           'A',
        iata,
        icao,
        registration:           leg.aircraft?.registration ?? undefined,
        aircraftType:           typeCode,
        haul:                   operationalFlight.haul ?? undefined,
        isLongHaul:             isLongHaulAircraft(typeCode),
        scheduledArrival:       scheduled,
        estimatedTouchDownTime: estimated,
        timeToArrivalMinutes:   minutesToArrival(estimated ?? scheduled),
        ...(depCode  ? { departureIata: depCode.toUpperCase() } : {}),
        ...(stdRaw   ? { scheduledDeparture: stdRaw }           : {}),
        ...(eobtRaw  ? { estimatedOffBlockTime: eobtRaw }       : {}),
      };
    } else {
      // ── Départ : aéroport cible = departureInformation ──
      const depInfo  = leg.departureInformation ?? {};
      const depCode  = depInfo.airport?.code ?? depInfo.airport?.iataCode;
      if (!depCode) return null;
      const iata = depCode.toUpperCase();
      const icao = AF_IATA_TO_ICAO[iata];
      if (!icao) return null;

      const depTimes = depInfo.times ?? {};
      const scheduled = depTimes.scheduled ?? depTimes.latestPublished;
      const eobt      = depTimes.estimatedOffBlockTime ?? depTimes.estimated?.value;
      if (!scheduled) return null;

      return {
        flightId:               `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}-D-${icao}`,
        marketingCarrier:       carrier,
        flightNumber:           fn,
        movementType:           'D',
        iata,
        icao,
        registration:           leg.aircraft?.registration ?? undefined,
        aircraftType:           typeCode,
        haul:                   operationalFlight.haul ?? undefined,
        isLongHaul:             isLongHaulAircraft(typeCode),
        scheduledArrival:       scheduled,   // STD stockée dans scheduledArrival par convention
        estimatedTouchDownTime: eobt,        // EOBT stocké dans estimatedTouchDownTime par convention
        timeToArrivalMinutes:   minutesToArrival(eobt ?? scheduled),
      };
    }
  } catch (e) {
    console.error('[AF mapLeg]', e);
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

  // Pas de movementType → l'API retourne arrivées ET départs en un seul appel
  const url = new URL('https://api.airfranceklm.com/opendata/flightstatus');
  url.searchParams.set('startRange',           start.toISOString());
  url.searchParams.set('endRange',             end.toISOString());
  url.searchParams.set('timeType',             'U');
  url.searchParams.set('carrierCode',          'AF');
  url.searchParams.set('operatingAirlineCode', 'AF');
  url.searchParams.set('pageSize',             '100');
  url.searchParams.set('pageNumber',           '0');

  console.log('[AF Flights] → requête API AF (A+D)', start.toISOString(), '→', end.toISOString());

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

  console.log(`[AF Flights] page 0/${totalPages} — ${ops.length} vols bruts`);

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

  const flights: AfFlightArrival[] = [];
  let skippedAirline  = 0;
  let skippedAircraft = 0;

  for (const op of ops) {
    const airlineCode = op.airline?.code ?? '';
    if (airlineCode !== 'AF') { skippedAirline++; continue; }

    for (const leg of (op.flightLegs ?? [])) {
      const aircraftType = leg.aircraft?.typeCode ?? '';
      if (!isOperationalAircraft(aircraftType)) { skippedAircraft++; continue; }

      // Mapper les deux mouvements pour ce leg
      const arr = mapLeg(op, leg, 'A');
      if (arr) flights.push(arr);

      const dep = mapLeg(op, leg, 'D');
      if (dep) flights.push(dep);
    }
  }

  const arrCount = flights.filter(f => f.movementType === 'A').length;
  const depCount = flights.filter(f => f.movementType === 'D').length;
  console.log(`[AF Flights] ${flights.length} mouvements retenus (ARR: ${arrCount}, DEP: ${depCount}) — ${skippedAirline} partenaires — ${skippedAircraft} autres types filtrés`);

  const dedup = new Map<string, AfFlightArrival>();
  for (const f of flights) {
    dedup.set(f.flightId, f);
  }

  return Array.from(dedup.values());
}

/**
 * Tente de récupérer le cache existant (même périmé) et le ré-étend pour éviter
 * de retenter inutilement pendant KV_TTL_SEC secondes.
 * Marque quotaExceeded=true dans le cache pour que l'UI puisse afficher un avertissement.
 */
async function fallbackToStaleCache(lcOnly: boolean): Promise<AfFlightArrival[]> {
  try {
    const stale = await kv.get<AfFlightsCache>(KV_KEY);
    if (stale && Array.isArray(stale.flights)) {
      // Ré-étendre le TTL pour ne pas retenter avant 2h
      await kv.set(KV_KEY, { ...stale, quotaExceeded: true } satisfies AfFlightsCache, { ex: KV_TTL_SEC });
      console.warn(`[AF Flights] quota dépassé — fallback cache périmé (${stale.flights.length} vols, fetchedAt=${new Date(stale.fetchedAt).toISOString()})`);
      const arrivals = stale.flights.filter(f => !f.movementType || f.movementType === 'A');
      return lcOnly ? arrivals.filter(f => f.isLongHaul) : arrivals;
    }
  } catch (e) {
    console.warn('[AF Flights] fallback stale cache error:', e);
  }
  return [];
}

export async function getCachedAfArrivals(force = false, lcOnly = true): Promise<AfFlightArrival[]> {
  const now = Date.now();

  if (!force) {
    try {
      const cached = await kv.get<AfFlightsCache>(KV_KEY);
      if (cached && Array.isArray(cached.flights)) {
        const futureFlights = cached.flights.filter(f => {
          const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
          return eta > now - 30 * 60 * 1000;
        });
        // Rétrocompatibilité : si movementType absent, traiter comme arrivée
        const arrivals = futureFlights.filter(f => !f.movementType || f.movementType === 'A');
        console.log(`[AF Flights] cache hit — ${arrivals.length} arrivées (lcOnly=${lcOnly})`);
        return lcOnly ? arrivals.filter(f => f.isLongHaul) : arrivals;
      }
    } catch (e) {
      console.warn('[AF Flights] cache read error:', e);
    }
  }

  const lockAcquired = await kv.set(KV_LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });

  if (!lockAcquired) {
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
          const arrivals = futureFlights.filter(f => !f.movementType || f.movementType === 'A');
          return lcOnly ? arrivals.filter(f => f.isLongHaul) : arrivals;
        }
      } catch { /* continue */ }
    }
    console.warn('[AF Flights] lock timeout — returning []');
    return [];
  }

  try {
    const flights = await callAfApi();
    const ttl = flights.length === 0 ? KV_EMPTY_TTL : KV_TTL_SEC;
    await kv.set(KV_KEY, { flights, fetchedAt: Date.now(), quotaExceeded: false } satisfies AfFlightsCache, { ex: ttl });
    console.log(`[AF Flights] cache updated — ${flights.length} mouvements, TTL ${ttl}s`);
    const arrivals = flights.filter(f => f.movementType === 'A');
    return lcOnly ? arrivals.filter(f => f.isLongHaul) : arrivals;
  } catch (err: any) {
    // 429 ou erreur réseau → fallback sur le cache périmé
    console.warn('[AF Flights] callAfApi error:', err?.message);
    return fallbackToStaleCache(lcOnly);
  } finally {
    await kv.del(KV_LOCK_KEY);
  }
}

/**
 * Retourne uniquement les départs (movementType === 'D') depuis le cache.
 */
export async function getCachedAfDepartures(force = false, lcOnly = true): Promise<AfFlightArrival[]> {
  const now = Date.now();

  if (!force) {
    try {
      const cached = await kv.get<AfFlightsCache>(KV_KEY);
      if (cached && Array.isArray(cached.flights)) {
        const futureFlights = cached.flights.filter(f => {
          const t = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
          return t > now - 30 * 60 * 1000;
        });
        const departures = futureFlights.filter(f => f.movementType === 'D');
        console.log(`[AF Flights] cache hit DEP — ${departures.length} départs (lcOnly=${lcOnly})`);
        return lcOnly ? departures.filter(f => f.isLongHaul) : departures;
      }
    } catch (e) {
      console.warn('[AF Flights] cache read error (dep):', e);
    }
  }

  // Pas de cache → déclencher un fetch complet via getCachedAfArrivals
  // (le cache sera rempli avec A+D, on relit ensuite)
  await getCachedAfArrivals(force, false);

  try {
    const cached = await kv.get<AfFlightsCache>(KV_KEY);
    if (cached && Array.isArray(cached.flights)) {
      const departures = cached.flights.filter(f => f.movementType === 'D');
      return lcOnly ? departures.filter(f => f.isLongHaul) : departures;
    }
  } catch { /* ignore */ }
  return [];
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
 * Retourne true si le dernier fetch a échoué avec un quota dépassé (429).
 * Permet à l'UI d'afficher un avertissement approprié.
 */
export async function isQuotaExceeded(): Promise<boolean> {
  try {
    const cached = await kv.get<AfFlightsCache>(KV_KEY);
    return cached?.quotaExceeded === true;
  } catch {
    return false;
  }
}

/**
 * @deprecated Alias de getCachedAfArrivals — conservé pour compatibilité.
 */
export async function getCachedAfFlights(force = false): Promise<AfFlightArrival[]> {
  return getCachedAfArrivals(force, /* lcOnly = */ true);
}
