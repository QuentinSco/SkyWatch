// src/lib/afFlights.ts
import { Redis } from '@upstash/redis';
import { AF_IATA_TO_ICAO } from './tafParser';

const kv = new Redis({
  url:   import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

/** Un leg vu du côté arrivée (indexé sur iata/icao = aéroport d'arrivée) */
export interface AfFlightArrival {
  flightId:               string;
  marketingCarrier:       string;
  flightNumber:           string;
  // Arrivée
  iata:                   string;
  icao:                   string;
  scheduledArrival:       string;
  estimatedTouchDownTime?: string;
  timeToArrivalMinutes?:  number;
  // Avion
  registration?:          string;
  aircraftType?:          string;
  haul?:                  string;
}

/** Un leg vu du côté départ (indexé sur departureIata/departureIcao) */
export interface AfFlightDeparture {
  flightId:                string;
  marketingCarrier:        string;
  flightNumber:            string;
  // Départ
  departureIata:           string;
  departureIcao:           string;
  scheduledDeparture:      string;
  estimatedDepartureTime?: string;
  // Arrivée (destination)
  arrivalIata?:            string;
  // Avion
  registration?:           string;
  aircraftType?:           string;
}

export interface AfFlightsCache {
  arrivals:   AfFlightArrival[];
  departures: AfFlightDeparture[];
  fetchedAt:  number;
}

const KV_KEY       = 'af_flights_cache_v2';  // nouvelle clé pour éviter conflit avec ancien format
const KV_LOCK_KEY  = 'af_flights_lock';
const KV_TTL_SEC   = 2 * 60 * 60;
const KV_EMPTY_TTL = 5 * 60;
const LOCK_TTL     = 60;

const LC_AIRCRAFT_TYPES = new Set(['332', '77W', '772', '789', '359']);

function isLongHaulAircraft(typeCode: string | undefined | null): boolean {
  if (!typeCode) return false;
  return LC_AIRCRAFT_TYPES.has(typeCode.trim().toUpperCase());
}

function minutesToArrival(etaIso: string | undefined): number | undefined {
  if (!etaIso) return undefined;
  return Math.round((new Date(etaIso).getTime() - Date.now()) / 60000);
}

/** Construit un AfFlightArrival depuis un leg (côté arrivée) */
function mapLegToArrival(op: any, leg: any): AfFlightArrival | null {
  try {
    const carrier = op.airline?.code ?? 'AF';
    const fn      = String(op.flightNumber ?? '').padStart(3, '0');

    const arrCode = leg.arrivalInformation?.airport?.code;
    if (!arrCode) return null;
    const iata = arrCode.toUpperCase();
    const icao = AF_IATA_TO_ICAO[iata];
    if (!icao) return null;

    const times     = leg.arrivalInformation?.times ?? {};
    const scheduled = times.scheduled ?? times.latestPublished ?? times.estimatedArrival;
    const estimated = times.estimatedTouchDownTime ?? times.estimated?.value ?? times.actual;
    if (!scheduled) return null;

    return {
      flightId:               `${carrier}${fn}-${op.flightScheduleDate ?? ''}`,
      marketingCarrier:       carrier,
      flightNumber:           fn,
      iata, icao,
      scheduledArrival:       scheduled,
      estimatedTouchDownTime: estimated,
      timeToArrivalMinutes:   minutesToArrival(estimated ?? scheduled),
      registration:           leg.aircraft?.registration ?? undefined,
      aircraftType:           leg.aircraft?.typeCode ?? undefined,
      haul:                   op.haul ?? undefined,
    };
  } catch (e) {
    console.error('[AF mapLegToArrival]', e);
    return null;
  }
}

/** Construit un AfFlightDeparture depuis un leg (côté départ) */
function mapLegToDeparture(op: any, leg: any): AfFlightDeparture | null {
  try {
    const carrier = op.airline?.code ?? 'AF';
    const fn      = String(op.flightNumber ?? '').padStart(3, '0');

    const depCode = leg.departureInformation?.airport?.code;
    if (!depCode) return null;
    const departureIata = depCode.toUpperCase();
    const departureIcao = AF_IATA_TO_ICAO[departureIata];
    if (!departureIcao) return null;

    const times              = leg.departureInformation?.times ?? {};
    const scheduledDeparture = times.scheduled ?? times.latestPublished ?? times.estimatedDeparture;
    const estimatedDeparture = times.estimatedOffBlockTime ?? times.estimated?.value ?? times.actual;
    if (!scheduledDeparture) return null;

    const arrCode    = leg.arrivalInformation?.airport?.code;
    const arrivalIata = arrCode ? arrCode.toUpperCase() : undefined;

    return {
      flightId:               `${carrier}${fn}-${op.flightScheduleDate ?? ''}`,
      marketingCarrier:       carrier,
      flightNumber:           fn,
      departureIata, departureIcao,
      scheduledDeparture,
      estimatedDepartureTime: estimatedDeparture,
      arrivalIata,
      registration:           leg.aircraft?.registration ?? undefined,
      aircraftType:           leg.aircraft?.typeCode ?? undefined,
    };
  } catch (e) {
    console.error('[AF mapLegToDeparture]', e);
    return null;
  }
}

async function callAfApi(): Promise<{ arrivals: AfFlightArrival[]; departures: AfFlightDeparture[] }> {
  const API_KEY = import.meta.env.AF_API_KEY;
  if (!API_KEY) { console.warn('[AF Flights] AF_API_KEY manquante'); return { arrivals: [], departures: [] }; }

  const now   = new Date();
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
  url.searchParams.set('carrierCode',          'AF');
  url.searchParams.set('operatingAirlineCode', 'AF');
  url.searchParams.set('pageSize',             '100');
  url.searchParams.set('pageNumber',           '0');

  console.log('[AF Flights] → requête API AF', start.toISOString(), '→', end.toISOString());

  const res = await fetch(url.toString(), { method: 'GET', headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text();
    console.error('[AF Flights] HTTP', res.status, body);
    if (res.status === 429) throw new Error(`Quota API Air France dépassé (429)`);
    return { arrivals: [], departures: [] };
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
      const j = await r.json();
      ops.push(...(j.operationalFlights ?? []));
    } else {
      console.warn(`[AF Flights] page ${p} HTTP`, r.status);
      if (r.status === 429) throw new Error(`Quota AF dépassé (429) page ${p}`);
    }
  }

  const arrivals:   AfFlightArrival[]   = [];
  const departures: AfFlightDeparture[] = [];
  const dedupArr = new Map<string, AfFlightArrival>();
  const dedupDep = new Map<string, AfFlightDeparture>();

  for (const op of ops) {
    if ((op.airline?.code ?? '') !== 'AF') continue;
    for (const leg of (op.flightLegs ?? [])) {
      if (!isLongHaulAircraft(leg.aircraft?.typeCode)) continue;

      const arr = mapLegToArrival(op, leg);
      if (arr) dedupArr.set(`${arr.flightId}-${arr.icao}`, arr);

      const dep = mapLegToDeparture(op, leg);
      if (dep) dedupDep.set(`${dep.flightId}-${dep.departureIcao}`, dep);
    }
  }

  console.log(`[AF Flights] ${dedupArr.size} arrivées LC + ${dedupDep.size} départs LC`);
  return { arrivals: Array.from(dedupArr.values()), departures: Array.from(dedupDep.values()) };
}

export async function getCachedAfFlights(force = false): Promise<AfFlightsCache> {
  const now = Date.now();

  if (!force) {
    try {
      const cached = await kv.get<AfFlightsCache>(KV_KEY);
      if (cached && Array.isArray(cached.arrivals)) {
        const age = Math.round((now - cached.fetchedAt) / 60000);
        console.log(`[AF Flights] Cache KV HIT — ${cached.arrivals.length} ARR / ${cached.departures.length} DEP (age: ${age}min)`);
        return cached;
      }
    } catch (e) { console.warn('[AF Flights] KV read error:', e); }
  }

  const lockAcquired = await kv.set(KV_LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });
  if (!lockAcquired) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const cached = await kv.get<AfFlightsCache>(KV_KEY);
        if (cached && Array.isArray(cached.arrivals)) return cached;
      } catch { /* continue */ }
    }
    return { arrivals: [], departures: [], fetchedAt: now };
  }

  try {
    const { arrivals, departures } = await callAfApi();
    const fetchedAt = Date.now();
    const cache: AfFlightsCache = { arrivals, departures, fetchedAt };
    const ttl = arrivals.length > 0 ? KV_TTL_SEC : KV_EMPTY_TTL;
    await kv.set(KV_KEY, cache, { ex: ttl });
    console.log(`[AF Flights] Cache KV écrit (TTL ${ttl}s)`);
    return cache;
  } finally {
    await kv.del(KV_LOCK_KEY);
  }
}

// Compatibilité ascendante pour les autres pages qui appellent getCachedAfArrivals
export async function getCachedAfArrivals(force = false): Promise<AfFlightArrival[]> {
  const cache = await getCachedAfFlights(force);
  return cache.arrivals;
}

export async function getCacheFetchedAt(): Promise<number | null> {
  try {
    const cached = await kv.get<AfFlightsCache>(KV_KEY);
    return cached?.fetchedAt ?? null;
  } catch { return null; }
}

export async function getArrivalsForAirport(icao: string, force = false): Promise<AfFlightArrival[]> {
  const { arrivals } = await getCachedAfFlights(force);
  return arrivals
    .filter(f => f.icao === icao)
    .sort((a, b) =>
      new Date(a.estimatedTouchDownTime ?? a.scheduledArrival).getTime() -
      new Date(b.estimatedTouchDownTime ?? b.scheduledArrival).getTime()
    );
}
