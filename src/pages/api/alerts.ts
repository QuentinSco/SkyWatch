import type { APIRoute } from 'astro';
import { fetchGDACS, fetchNOAA, fetchEMMA, fetchMeteoFrance, fetchVAAC } from '../../lib/alertsServer';
import { fetchRocketLaunches } from '../../lib/launchParser';
import { fetchSWPC } from '../../lib/swpcParser';
import { redis } from '../../lib/redis';

export const prerender = false;

const CACHE_KEY = 'alerts_cache_v1';
const CACHE_TTL_SEC = 5 * 60; // 5 min
const TWO_HOURS  = 2 * 60 * 60 * 1000;
const SIX_HOURS  = 6 * 60 * 60 * 1000;

export const GET: APIRoute = async () => {
  // Lecture cache Redis (si disponible)
  if (redis) {
    try {
      const cached = await redis.get<unknown[]>(CACHE_KEY);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }
    } catch (e) {
      console.warn('[alerts] KV read error:', e);
    }
  }

  const [gdacs, noaa, emma, mf, vaac, swpc, launches] = await Promise.all([
    fetchGDACS(),
    fetchNOAA(),
    fetchEMMA(),
    fetchMeteoFrance(),
    fetchVAAC(),
    fetchSWPC(),
    fetchRocketLaunches(),
  ]);

  const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
  const all = [...gdacs, ...noaa, ...emma, ...mf, ...vaac, ...swpc, ...launches]
    .sort((a: any, b: any) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .filter((a: any) => {
      // Les alertes SWPC sans validTo sont conservées 6h
      if (a.source === 'SWPC' && !a.validTo) {
        if (!a.validFrom) return false;
        return Date.now() - new Date(a.validFrom).getTime() < SIX_HOURS;
      }
      if (!a.validTo) return true;
      return Date.now() - new Date(a.validTo).getTime() < TWO_HOURS;
    });

  // Écriture cache Redis (si disponible)
  if (redis) {
    try {
      await redis.set(CACHE_KEY, all, { ex: CACHE_TTL_SEC });
    } catch (e) {
      console.warn('[alerts] KV write error:', e);
    }
  }

  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
