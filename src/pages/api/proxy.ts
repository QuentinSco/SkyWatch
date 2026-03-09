import type { APIRoute } from 'astro';

// Whitelist des domaines autorisés — uniquement les sources météo/aviation officielles
const ALLOWED_DOMAINS = new Set([
  'api.weather.gov',
  'www.gdacs.org',
  'feeds.meteoalarm.org',
  'services.swpc.noaa.gov',
  'www.ospo.noaa.gov',
  'www.weather.gov',
  'weather.gc.ca',
  'www.ssd.noaa.gov',
  'vaac.meteo.fr',
  'ds.data.jma.go.jp',
  'www.bom.gov.au',
  'vaac.metservice.com',
  'notams.aim.faa.gov',
  'aviationweather.gov',
  'www.aviationweather.gov',
]);

function isAllowedUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return ALLOWED_DOMAINS.has(url.hostname);
  } catch {
    return false;
  }
}

// Rate-limit simple en mémoire — 20 requêtes/minute par IP
// Note : se réinitialise au cold-start Vercel (suffisant pour bloquer les abus ponctuels)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  const reqUrl    = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return new Response('URL not allowed', { status: 403 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
        'Accept': 'application/xml, application/rss+xml, text/xml, */*',
      },
    });

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status });
    }

    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[Proxy]', err);
    return new Response('Proxy error', { status: 502 });
  }
};
