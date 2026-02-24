// src/lib/afFlights.ts
// Gestion des vols AF LC via API FlightStatus AFKL

import { AF_IATA_TO_ICAO } from './tafParser';

// Types simplifiés pour ce qu'on affiche
export interface AfFlightArrival {
  flightId: string;           // ex: "AF022-2026-02-24"
  marketingCarrier: string;   // ex: "AF"
  flightNumber: string;       // ex: "022"
  iata: string;               // ex: "JFK"
  icao: string;               // ex: "KJFK"
  registration?: string;      // ex: "F-GZND"
  aircraftType?: string;      // ex: "77W"
  scheduledArrival: string;   // ISO UTC
  estimatedArrival?: string;  // ISO UTC
  timeToArrivalMinutes?: number;
}

// Cache mémoire grossier (POC)
const FLIGHT_CACHE_TTL = 4 * 60 * 60 * 1000; // 4h
let flightCache: { ts: number; data: AfFlightArrival[] } | null = null;

function minutesToArrival(etaIso: string | undefined): number | undefined {
  if (!etaIso) return undefined;
  const eta = new Date(etaIso).getTime();
  const now = Date.now();
  return Math.round((eta - now) / 60000);
}

/**
 * Normalise un objet "flightLeg" en AfFlightArrival
 */
function mapLegToArrival(operationalFlight: any, leg: any): AfFlightArrival | null {
  try {
    const carrier = operationalFlight.airline?.code ?? 'AF';
    const fn      = String(operationalFlight.flightNumber ?? '').padStart(3, '0');
    const arrivalAirportCode = leg.arrivalInformation?.airport?.code; // IATA
    if (!arrivalAirportCode) return null;

    const iata = arrivalAirportCode.toUpperCase();
    const icao = AF_IATA_TO_ICAO[iata];
    if (!icao) return null; // on ne garde que les escales LC connues

    const registration  = leg.aircraft?.registration ?? undefined;
    const aircraftType  = leg.aircraft?.typeCode ?? undefined;

    const times = leg.arrivalInformation?.times ?? {};
    const scheduled = times.scheduled ?? times.latestPublished ?? times.estimatedArrival;
    const estimated = times.estimatedArrival ?? times.estimated ?? times.actual;

    if (!scheduled) return null;

    const etaForDelta = estimated ?? scheduled;
    const tta = minutesToArrival(etaForDelta);

    return {
      flightId: `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}`,
      marketingCarrier: carrier,
      flightNumber: fn,
      iata,
      icao,
      registration,
      aircraftType,
      scheduledArrival: scheduled,
      estimatedArrival: estimated,
      timeToArrivalMinutes: tta,
    };
  } catch (e) {
    console.error('[AF mapLegToArrival]', e);
    return null;
  }
}

/**
 * Récupère tous les vols AF LC (arrivées) sur une plage de temps donnée.
 * On filtre ensuite par escales AF LC via AF_IATA_TO_ICAO.
 */
export async function fetchAfArrivalsInRange(startIso: string, endIso: string): Promise<AfFlightArrival[]> {
  const API_KEY = import.meta.env.AF_API_KEY;
  if (!API_KEY) {
    console.warn('[AF Flights] AF_API_KEY manquante');
    return [];
  }

  const url = new URL('https://api.airfranceklm.com/opendata/flightstatus');
  url.searchParams.set('startRange', startIso);
  url.searchParams.set('endRange', endIso);
  url.searchParams.set('timeType', 'U'); // UTC
  url.searchParams.set('movementType', 'A'); // Arrivals
  url.searchParams.set('carrierCode', 'AF');
  url.searchParams.set('operatingAirlineCode', 'AF');
  url.searchParams.set('pageSize', '100'); // maxi pour limiter les requêtes

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'API-Key': API_KEY,
      'Accept': 'application/hal+json',
      'User-Agent': 'SkyWatch/1.0 dispatch-tool',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error('[AF Flights] HTTP', res.status);
    return [];
  }

  const json = await res.json();
  const ops = Array.isArray(json.operationalFlights) ? json.operationalFlights : [];

  const arrivals: AfFlightArrival[] = [];

  for (const op of ops) {
    const legs = Array.isArray(op.flightLegs) ? op.flightLegs : [];
    for (const leg of legs) {
      const mapped = mapLegToArrival(op, leg);
      if (mapped) arrivals.push(mapped);
    }
  }

  // Dé-doublonnage par flightId + icao
  const dedup = new Map<string, AfFlightArrival>();
  for (const f of arrivals) {
    const key = `${f.flightId}-${f.icao}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }

  return Array.from(dedup.values());
}

/**
 * API high-level pour le POC : récupère une fois par plage large
 * (J-3 → J+3) et met tout en cache. Ensuite on filtre en mémoire.
 */
export async function getCachedAfArrivals(): Promise<AfFlightArrival[]> {
  const now = new Date();
  if (flightCache && Date.now() - flightCache.ts < FLIGHT_CACHE_TTL) {
    return flightCache.data;
  }

  // Plage large : J-1 00:00Z → J+2 23:59Z
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 23, 59, 59));

  const arrivals = await fetchAfArrivalsInRange(start.toISOString(), end.toISOString());
  flightCache = { ts: Date.now(), data: arrivals };
  console.log(`[AF Flights] ${arrivals.length} arrivées AF LC en cache`);
  return arrivals;
}

/**
 * Filtre les vols par aéroport ICAO (ex: "KJFK") à partir du cache.
 */
export async function getArrivalsForAirport(icao: string): Promise<AfFlightArrival[]> {
  const all = await getCachedAfArrivals();
  return all
    .filter(f => f.icao === icao)
    .sort((a, b) =>
      new Date(a.estimatedArrival ?? a.scheduledArrival).getTime() -
      new Date(b.estimatedArrival ?? b.scheduledArrival).getTime()
    );
}
