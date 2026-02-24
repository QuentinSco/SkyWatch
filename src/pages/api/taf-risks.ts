import type { APIRoute } from 'astro';
import { fetchTafRisks } from '../../lib/tafParser.ts';

export const prerender = false;

const CACHE_TTL = 30 * 60 * 1000; // 30 min — TAF valide ~6h, mise à jour toutes les 30min suffisante
let cache: { ts: number; data: unknown } | null = null;

export const GET: APIRoute = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'X-Cache-Age': String(Math.round((Date.now() - cache.ts) / 1000)) + 's',
      },
    });
  }

  try {
    const risks = await fetchTafRisks();
    cache = { ts: Date.now(), data: risks };
    return new Response(JSON.stringify(risks), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (e) {
    console.error('[API /taf-risks]', e);
    return new Response(JSON.stringify({ error: 'TAF fetch failed', risks: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
