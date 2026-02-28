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
  scheduledArrival: string;
  estimatedTouchDownTime?: string;
  timeToArrivalMinutes?: number;
}

const KV_KEY      = 'af_flights_cache';
const KV_LOCK_KEY = 'af_flights_lock';   // ✅ Distributed lock
const KV_TTL_SEC  = 4 * 60 * 60;         // 4h TTL cache
const LOCK_TTL    = 60;                   // 60s max pour un fetch

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

    return {
      flightId:               `${carrier}${fn}-${operationalFlight.flightScheduleDate ?? ''}`,
      marketingCarrier:       carrier,
      flightNumber:           fn,
      iata,
      icao,
      registration:           leg.aircraft?.registration ?? undefined,
      aircraftType:           leg.aircraft?.typeCode ?? undefined,
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
  // ✅ Fenêtre réduite : J+0 00:00 UTC → J+1 23:59 UTC (48h, était J-1→J+2 = 4 jours)
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

  console.log(`[AF Flights] page 0/${totalPages} — ${ops.length} vols`);

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

  // ── Mapping ───────────────────────────────────────────────────────────────
  const arrivals: AfFlightArrival[] = [];
  for (const op of ops) {
    for (const leg of (op.flightLegs ?? [])) {
      const mapped = mapLegToArrival(op, leg);
      if (mapped) arrivals.push(mapped);
    }
  }

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
 * ✅ Le TTL Redis (4h) gère l'expiration — plus d'auto-invalidation
 *    intempestive quand tous les vols sont passés.
 */
export async function getCachedAfArrivals(): Promise<AfFlightArrival[]> {

  const now = Date.now();

  // ── 1. Cache KV — hit → retour immédiat, 0 requête AF ────────────────────
  try {
    const cached = await kv.get<AfFlightArrival[]>(KV_KEY);
    if (cached && cached.length > 0) {
      const futureFlights = cached.filter(f => {
        const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
        return eta >= now;
      });

      // ✅ Fix : on ne supprime plus le cache KV quand tous les vols sont passés.
      // Le TTL Redis (4h) gère l'expiration naturellement, évitant les
      // re-fetch intempestifs qui épuisaient le quota AF.
      console.log(`[AF Flights] Cache KV HIT — ${futureFlights.length}/${cached.length} vols futurs`);
      return futureFlights;
    }
  } catch (e) {
    console.warn('[AF Flights] KV read error:', e);
  }

  // ── 2. Distributed lock — SET NX (only if not exists) ───────────────────
  const lockAcquired = await kv.set(KV_LOCK_KEY, '1', { nx: true, ex: LOCK_TTL });

  if (!lockAcquired) {
    console.log('[AF Flights] Lock non acquis — attente cache...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const cached = await kv.get<AfFlightArrival[]>(KV_KEY);
        if (cached && cached.length > 0) {
          const futureFlights = cached.filter(f => {
            const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
            return eta >= now;
          });
          if (futureFlights.length > 0) {
            console.log(`[AF Flights] Cache KV disponible après attente — ${futureFlights.length} vols futurs`);
            return futureFlights;
          }
        }
      } catch { /* continue */ }
    }
    console.warn('[AF Flights] Timeout attente cache — retour tableau vide');
    return [];
  }

  // ── 3. Lock acquis — on est la seule instance à fetcher ──────────────────
  try {
    const result = await callAfApi();

    const futureFlights = result.filter(f => {
      const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
      return eta >= now;
    });

    if (futureFlights.length > 0) {
      await kv.set(KV_KEY, futureFlights, { ex: KV_TTL_SEC });
      console.log(`[AF Flights] ${futureFlights.length}/${result.length} vols futurs stockés en KV (TTL ${KV_TTL_SEC}s)`);
    } else {
      console.warn(`[AF Flights] Aucun vol futur à stocker (${result.length} vols passés filtrés)`);
    }

    return futureFlights;

  } finally {
    await kv.del(KV_LOCK_KEY);
    console.log('[AF Flights] Lock libéré');
  }
}

export async function getArrivalsForAirport(icao: string): Promise<AfFlightArrival[]> {
  const all = await getCachedAfArrivals();
  return all
    .filter(f => f.icao === icao)
    .sort((a, b) =>
      new Date(a.estimatedTouchDownTime ?? a.scheduledArrival).getTime() -
      new Date(b.estimatedTouchDownTime ?? b.scheduledArrival).getTime()
    );
}
