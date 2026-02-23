export { renderers } from '../renderers.mjs';

async function GET() {
    // Mock GDACS pour tester
    return new Response(JSON.stringify([
      { id: '1', title: '🟢 Cyclone Tropical Océan Indien', country: 'Madagascar', severity: '🟢' },
      { id: '2', title: '🟡 Blizzard Watch NYC', country: 'USA', severity: '🟡' }
    ]), { headers: { 'Content-Type': 'application/json' } });
  }

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
