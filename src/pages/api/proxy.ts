import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const reqUrl   = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  console.log('[proxy] targetUrl:', targetUrl);

  if (!targetUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  try {
    const res  = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
        'Accept':     'application/xml, application/rss+xml, text/xml, */*',
      },
    });
    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type':  'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(`Proxy error: ${String(err)}`, { status: 502 });
  }
};
