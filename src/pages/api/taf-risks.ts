import type { APIRoute } from 'astro';
import { fetchTafRisks } from '../../lib/tafParser.ts';

export const prerender = false;

// ✅ Cache in-memory supprimé — le cache Redis est désormais géré dans fetchTafRisks() (tafParser.ts)
// Toutes les instances Vercel partagent le même cache Upstash KV (TTL 30 min)

export const GET: APIRoute = async () => {
  try {
    const risks = await fetchTafRisks();
    return new Response(JSON.stringify(risks), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[API /taf-risks]', e);
    return new Response(JSON.stringify({ error: 'TAF fetch failed', risks: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
