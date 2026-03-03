import type { APIRoute } from 'astro';
import { fetchLaunchTfrs } from '../../lib/tfrParser';

export const prerender = false;

const CACHE_TTL = 10 * 60 * 1000;
let cache: { ts: number; data: unknown } | null = null;

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const zones = await fetchLaunchTfrs();
  cache = { ts: Date.now(), data: zones };

  return new Response(JSON.stringify(zones), {
    headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
  });
};
