import type { APIRoute } from 'astro';
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const res = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: { 'User-Agent': 'SkyWatch/0.1 dispatch-tool' },
    });
    const xml = await res.text();
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response('fetch failed', { status: 502 });
  }
};
