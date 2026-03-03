import type { APIRoute } from 'astro';
import { fetchGDACS, fetchNOAA, fetchMeteoAlarm, fetchVAAC, fetchSWPC } from '../../lib/alertsServer';
import { fetchRocketLaunches } from '../../lib/launchParser';

export const prerender = false;

const CACHE_TTL = 5 * 60 * 1000;
const TWO_HOURS = 2 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

let cache: { ts: number; data: unknown; noaaOk: boolean } | null = null;

export const GET: APIRoute = async () => {
  if (cache && cache.noaaOk && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const [gdacs, noaa, meteoalarm, vaac, swpc, launches] = await Promise.all([
    fetchGDACS(),
    fetchNOAA(),
    fetchMeteoAlarm(),
    fetchVAAC(),
    fetchSWPC(),
    fetchRocketLaunches(),
  ]);

  const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
  const all = [...gdacs, ...noaa, ...meteoalarm, ...vaac, ...swpc, ...launches]
    .sort((a: any, b: any) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .filter((a: any) => {
      if (a.source === 'SWPC' && !a.validTo) {
        if (!a.validFrom) return false;
        return Date.now() - new Date(a.validFrom).getTime() < SIX_HOURS;
      }
      if (!a.validTo) return true;
      return Date.now() - new Date(a.validTo).getTime() < TWO_HOURS;
    });

  cache = { ts: Date.now(), data: all, noaaOk: noaa.length > 0 || vaac.length > 0 };

  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
