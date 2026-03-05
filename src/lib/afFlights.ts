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
  // Arrée
  iata: string;
  icao: string;
  scheduledArrival: string;
  estimatedTouchDownTime?: string;
  timeToArrivalMinutes?: number;
  // Départ
  departureIata?: string;
  departureIcao?: string;
  scheduledDeparture?: string;
  estimatedDepartureTime?: string;
  // Avion
  registration?: string;
  aircraftType?: string;
  haul?: string;
}

export interface AfFlightsCache {
  flights: AfFlightArrival[];
  fetchedAt: number;
}

const KV_KEY       = 'af_flights_cache';
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

// Map ICAO → IATA (inverse)
const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

function mapLegToArrival(operationalFlight: any, leg: any): AfFlightArrival | null {
  try {
    const carrier = operationalFlight.airline?.code ?? 'AF';
    const fn      = String(operationalFlight.flightNumber ?? '').padStart(3, '0');

    // ── Arrivée ────────────────────────────────────────────────────────────
    const arrCode = leg.arrivalInformation?.airport?.code;
    if (!arrCode) return null;
    const iata = arrCode.toUpperCase();
    const icao = AF_IATA_TO_ICAO[iata];
    if (!icao) return null;

    const arrTimes    = leg.arrivalInformation?.times ?? {};
    const scheduled   = arrTimes.scheduled ?? arrTimes.latestPublished ?? arrTimes.estimatedArrival;
    const estimated   = arrTimes.estimatedTouchDownTime ?? arrTimes.estimated?.value ?? arrTimes.actual;
    if (!scheduled) return null;

    // ── Départ ────────────────────────────────────────────────────────────
    const depCode  = leg.departureInformation?.airport?.code;
    const depIata  = depCode ? depCode.toUpperCase() : undefined;
    const depIcao  = depIata ? AF_IATA_TO_ICAO[depIata] : undefined;

    const depTimes            = leg.departureInformation?.times ?? {};
    const scheduledDeparture  = depTimes.scheduled ?? depTimes.latestPublished ?? depTimes.estimatedDeparture;
    const estimatedDeparture  = depTimes.estimatedOffBlockTime ?? depTimes.estimated?.value ?? depTimes.actual;

    return {
      flightId:               `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}`,
      marketingCarrier:       carrier,
      flightNumber:           fn,
      iata,
      icao,
      scheduledArrival:       scheduled,
      estimatedTouchDownTime: estimated,
      timeToArrivalMinutes:   minutesToArrival(estimated ?? scheduled),
      departureIata:          depIata,
      departureIcao:          depIcao,
      scheduledDeparture:     scheduledDeparture,
      estimatedDepartureTime: estimatedDeparture,
      registration:           leg.aircraft?.registration ?? undefined,
      aircraftType:           leg.aircraft?.typeCode ?? undefined,
      haul:                   operationalFlight.haul ?? undefined,
    };
  } catch (e) {
    console.error('[AF mapLegToArrival]', e);
    return null;
  }
}

async function callAfApi(): Promise<AfFlightArrival[]> {
  const API_KEY = import.meta.env.AF_API_KEY;
  if (!API_KEY) { console.warn('[AF Flights] AF_API_KEY manquante'); return []; }

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
    return [];
  }

  const json       = await res.json();
  const ops: any[] = Array.isArray(json.operationalFlights) ? json.operationalFlights : [];
  const totalPages = json.page?.totalPages ?? 1;
  console.log(`[AF Flights] page 0/${totalPages} — ${ops.length} vols (avant filtre LC)`);

  for (let p = 1; p < totalPages; p++) {
    await new Promise(r => setTimeout(r, 1100));
    const u = new URL(url.toString());
    u.searchParams.set('pageNumber', String(p));
    const r = await fetch(u.toString(), { method: 'GET', headers, signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const j = await r.json();
      ops.push(...(j.operationalFlights ?? []));
      console.log(`[AF Flights] page ${p}/${totalPages} — +${j.operationalFlights?.length ?? 0} vols`);
    } else {
      console.warn(`[AF Flights] page ${p} HTTP`, r.status);
      if (r.status === 429) throw new Error(`Quota API AF dépassé (429) à la page ${p}`);
    }
  }

  const arrivals: AfFlightArrival[] = [];
  let skippedAirline = 0, skippedAircraft = 0;

  for (const op of ops) {
    if ((op.airline?.code ?? '') !== 'AF') { skippedAirline++; continue; }
    for (const leg of (op.flightLegs ?? [])) {
      if (!isLongHaulAircraft(leg.aircraft?.typeCode)) { skippedAircraft++; continue; }
      const mapped = mapLegToArrival(op, leg);
      if (mapped) arrivals.push(mapped);
    }
  }

  console.log(`[AF Flights] ${arrivals.length} legs LC retenus — ${skippedAirline} partenaires filtrés — ${skippedAircraft} non-LC filtrés`);

  const dedup = new Map<string, AfFlightArrival>();
  for (const f of arrivals) dedup.set(`${f.flightId}-${f.icao}`, f);
  return Array.from(dedup.values());
}

export async function getCachedAfArrivals(force = false): Promise<AfFlightArrival[]> {
  const now = Date.now();

  if (!force) {
    try {
      const cached = await kv.get<AfFlightsCache>(KV_KEY);
      if (cached && Array.isArray(cached.flights)) {
        const futureFlights = cached.flights.filter(f => {
          const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
          return eta >= now;
        });
        const age = Math.round((now - cached.fetchedAt) / 60000);
        console.log(`[AF Flights] Cache KV HIT — ${futureFlights.length}/${cached.flights.length} vols futurs (age: ${age}min)`);
        return futureFlights;
      }
    } catch (e) { console.warn('[AF Flights] KV read error:', e); }
  } else {
    console.log('[AF Flights] Force refresh — bypass cache');
  }

  const lockAcquired = await kv.set(KV_LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });

  if (!lockAcquired) {
    console.log('[AF Flights] Lock non acquis — attente cache...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const cached = await kv.get<AfFlightsCache>(KV_KEY);
        if (cached && Array.isArray(cached.flights)) {
          return cached.flights.filter(f =>
            new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime() >= now
          );
        }
      } catch { /* continue */ }
    }
    console.warn('[AF Flights] Timeout attente cache');
    return [];
  }

  try {
    const result = await callAfApi();
    const fetchedAt = Date.now();
    const futureFlights = result.filter(f =>
      new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime() >= now
    );
    const ttl = futureFlights.length > 0 ? KV_TTL_SEC : KV_EMPTY_TTL;
    await kv.set(KV_KEY, { flights: futureFlights, fetchedAt }, { ex: ttl });
    console.log(`[AF Flights] ${futureFlights.length}/${result.length} vols futurs stockés en KV (TTL ${ttl}s)`);
    return futureFlights;
  } finally {
    await kv.del(KV_LOCK_KEY);
  }
}

export async function getCacheFetchedAt(): Promise<number | null> {
  try {
    const cached = await kv.get<AfFlightsCache>(KV_KEY);
    return cached?.fetchedAt ?? null;
  } catch (e) {
    console.warn('[AF Flights] Error reading cache timestamp:', e);
    return null;
  }
}

export async function getArrivalsForAirport(icao: string, force = false): Promise<AfFlightArrival[]> {
  const all = await getCachedAfArrivals(force);
  return all
    .filter(f => f.icao === icao)
    .sort((a, b) =>
      new Date(a.estimatedTouchDownTime ?? a.scheduledArrival).getTime() -
      new Date(b.estimatedTouchDownTime ?? b.scheduledArrival).getTime()
    );
}
