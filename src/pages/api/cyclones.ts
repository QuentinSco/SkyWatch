// ─── API /api/cyclones ─────────────────────────────────────────────────────────────────────
import type { APIRoute } from 'astro';
import { fetchCycloneBulletins } from '../../lib/cycloneParser';

export const GET: APIRoute = async () => {
  try {
    const bulletins = await fetchCycloneBulletins();
    return new Response(JSON.stringify(bulletins), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800',  // 30 min browser cache
      },
    });
  } catch (err) {
    console.error('[API /api/cyclones]', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur cyclones' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
