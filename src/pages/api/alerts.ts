import type { APIRoute } from 'astro';
import { fetchGDACS } from '../../../public/lib/gdacs';
import { fetchNOAA } from '../../../public/lib/noaa';
import { fetchMeteoAlarm } from '../../../public/lib/meteoalarm';

export const prerender = false;

const CACHE_TTL = 5 * 60 * 1000; // 5 min
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

  const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };
  const all = [...gdacs, ...noaa, ...meteoalarm]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  cache = { ts: Date.now(), data: all };

  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
