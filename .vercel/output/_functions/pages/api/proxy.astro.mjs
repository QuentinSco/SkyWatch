export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request }) => {
  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get("url");
  if (!targetUrl) {
    return new Response("Missing url param", { status: 400 });
  }
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SkyWatch/1.0)",
        "Accept": "application/xml, application/rss+xml, text/xml, */*"
      }
    });
    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: res.status });
    }
    const text = await res.text();
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("[Proxy]", err);
    return new Response(`Proxy error: ${String(err)}`, { status: 502 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
