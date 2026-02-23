export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async () => {
  try {
    const res = await fetch("https://www.gdacs.org/xml/rss.xml", {
      headers: { "User-Agent": "SkyWatch/0.1 dispatch-tool" }
    });
    const xml = await res.text();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response("fetch failed", { status: 502 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
