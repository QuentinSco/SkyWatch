import type { APIRoute } from 'astro';
import { fetchGDACS, fetchNOAA, fetchMeteoAlarm } from '../../lib/alertsServer';

export const prerender = false;

const CACHE_TTL = 5 * 60 * 1000;
let cache: { ts: number; data: unknown } | null = null;

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const [gdacs, noaa, meteoalarm] = await Promise.all([
    fetchGDACS(),
    fetchNOAA(),
    fetchMeteoAlarm(),
  ]);

  const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
  const all = [...gdacs, ...noaa, ...meteoalarm]
    .sort((a: any, b: any) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  cache = { ts: Date.now(), data: all };

  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
