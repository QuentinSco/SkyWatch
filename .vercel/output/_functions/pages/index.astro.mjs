import { e as createComponent, r as renderTemplate, k as renderHead } from '../chunks/astro/server_BtCDffJY.mjs';
import 'piccolore';
import 'clsx';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="fr"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>SkyWatch \u2013 Alertes m\xE9t\xE9o dispatch</title><link rel="stylesheet" href="/src/styles/global.css">', `</head> <body class="text-gray-900 min-h-screen p-6 max-w-7xl mx-auto"> <header class="mb-8"> <div class="flex items-center justify-between flex-wrap gap-4"> <div> <h1 class="text-3xl font-bold tracking-tight text-gray-900">\u{1F6F0} SkyWatch</h1> <p class="text-gray-500 text-sm mt-1">Agr\xE9gateur d'alertes m\xE9t\xE9o mondiales \u2014 Outil superviseur dispatch</p> </div> <div class="text-right text-xs text-gray-500"> <div id="last-update">Chargement...</div> <div id="counters" class="mt-2 flex gap-2 justify-end"></div> </div> </div> <div class="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
\u2139\uFE0F <strong>Horizon affich\xE9 :</strong> J \xE0 J+3 \u2014 Ph\xE9nom\xE8nes de grande \xE9chelle uniquement.
      Les orages isol\xE9s restent sous responsabilit\xE9 dispatcher \xE0 J.
</div> </header> <div id="error-box" class="hidden bg-red-50 border border-red-300 rounded-xl p-4 mb-6 text-sm text-red-700"></div> <main id="main-content"> <div class="text-gray-400 text-sm italic">Chargement des alertes...</div> </main> <footer class="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 flex flex-wrap gap-4 justify-between"> <span>Sources : GDACS (UN/CE) \xB7 NOAA/NWS \xB7 MeteoAlarm (EUMETNET)</span> <span>SkyWatch POC v0.1 \u2014 Open source uniquement</span> </footer> <script type="module" src="/lib/main.js"><\/script> </body> </html>`])), renderHead());
}, "/home/QuentinSco/SkyWatch/src/pages/index.astro", void 0);

const $$file = "/home/QuentinSco/SkyWatch/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
