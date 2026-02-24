// src/lib/afFlights.ts
import { AF_IATA_TO_ICAO } from './tafParser';

export interface AfFlightArrival {
  flightId: string;
  marketingCarrier: string;
  flightNumber: string;
  iata: string;
  icao: string;
  registration?: string;
  aircraftType?: string;
  scheduledArrival: string;
  estimatedArrival?: string;
  timeToArrivalMinutes?: number;
}

const ICAO_TO_IATA: Record<string, string> = Object.fromEntries(
  Object.entries(AF_IATA_TO_ICAO).map(([iata, icao]) => [icao, iata])
);

export const AF_AIRPORT_ICAOS: string[] = Object.values(AF_IATA_TO_ICAO);

const FLIGHT_CACHE_TTL = 4 * 60 * 60 * 1000; // 4h
let flightCache: { ts: number; data: AfFlightArrival[] } | null = null;

// ✅ Lock promise — empêche les requêtes concurrentes
let fetchInProgress: Promise<AfFlightArrival[]> | null = null;

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
    const estimated = times.estimatedArrival ?? times.estimated?.value ?? times.actual;
    if (!scheduled) return null;

    return {
      flightId: `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}`,
      marketingCarrier: carrier,
      flightNumber: fn,
      iata,
      icao,
      registration:  leg.aircraft?.registration ?? undefined,
      aircraftType:  leg.aircraft?.typeCode ?? undefined,
      scheduledArrival: scheduled,
      estimatedArrival: estimated,
      timeToArrivalMinutes: minutesToArrival(estimated ?? scheduled),
    };
  } catch (e) {
    console.error('[AF mapLegToArrival]', e);
    return null;
  }
}

async function doFetchArrivals(): Promise<AfFlightArrival[]> {
  const API_KEY = import.meta.env.AF_API_KEY;
  if (!API_KEY) {
    console.warn('[AF Flights] AF_API_KEY manquante');
    return [];
  }

  const now   = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 23, 59, 59));

  const url = new URL('https://api.airfranceklm.com/opendata/flightstatus');
  url.searchParams.set('startRange', start.toISOString());
  url.searchParams.set('endRange',   end.toISOString());
  url.searchParams.set('timeType',           'U');
  url.searchParams.set('movementType',       'A');
  url.searchParams.set('carrierCode',        'AF');
  url.searchParams.set('operatingAirlineCode','AF');
  url.searchParams.set('pageSize',           '100');

  console.log('[AF Flights] → requête API AF', start.toISOString(), '→', end.toISOString());

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'API-Key': API_KEY,
      'Accept':  'application/hal+json',
      'User-Agent': 'SkyWatch/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error('[AF Flights] HTTP', res.status, await res.text());
    return [];
  }

  const json = await res.json();
  const ops  = Array.isArray(json.operationalFlights) ? json.operationalFlights : [];

  const arrivals: AfFlightArrival[] = [];
  for (const op of ops) {
    for (const leg of (op.flightLegs ?? [])) {
      const mapped = mapLegToArrival(op, leg);
      if (mapped) arrivals.push(mapped);
    }
  }

  // Dé-doublonnage
  const dedup = new Map<string, AfFlightArrival>();
  for (const f of arrivals) {
    const key = `${f.flightId}-${f.icao}`;
    if (!dedup.has(key)) dedup.set(key, f);
  }

  const result = Array.from(dedup.values());
  console.log(`[AF Flights] ${result.length} arrivées AF LC chargées`);
  return result;
}

/**
 * ✅ Une seule requête à la fois grâce au lock.
 * Tous les appelants concurrent attendent la même promesse.
 */
export async function getCachedAfArrivals(): Promise<AfFlightArrival[]> {
  // Cache valide → retour immédiat, 0 requête
  if (flightCache && Date.now() - flightCache.ts < FLIGHT_CACHE_TTL) {
    return flightCache.data;
  }

  // Une requête est déjà en cours → on attend son résultat
  if (fetchInProgress) {
    console.log('[AF Flights] requête en cours — attente du résultat existant');
    return fetchInProgress;
  }

  // On lance UNE SEULE requête et on met le lock
  fetchInProgress = doFetchArrivals().then(data => {
    flightCache = { ts: Date.now(), data };
    fetchInProgress = null;
    return data;
  }).catch(e => {
    fetchInProgress = null;
    console.error('[AF Flights] fetch échoué:', e);
    return [];
  });

  return fetchInProgress;
}

/**
 * Filtre les vols par aéroport ICAO à partir du cache.
 * N'appelle getCachedAfArrivals qu'une seule fois grâce au lock ci-dessus.
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
