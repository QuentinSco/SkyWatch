import { e as createComponent, r as renderTemplate, k as renderHead, l as renderScript } from '../chunks/astro/server_CqcERbWj.mjs';
import 'piccolore';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="fr"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>SkyWatch \u2013 Alertes m\xE9t\xE9o dispatch</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">', "", `</head> <body class="text-gray-900 min-h-screen p-6 max-w-7xl mx-auto"> <header class="mb-8"> <div class="flex items-center justify-between flex-wrap gap-4"> <div> <h1 class="text-3xl font-bold tracking-tight text-gray-900">\u{1F6F0} SkyWatch</h1> <p class="text-gray-500 text-sm mt-1">Agr\xE9gateur d'alertes m\xE9t\xE9o mondiales \u2014 Outil superviseur dispatch</p> </div> <div class="text-right text-xs text-gray-500"> <div id="last-update">Chargement...</div> <div id="counters" class="mt-2 flex gap-2 justify-end"></div> </div> </div> <div class="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
\u2139\uFE0F <strong>Horizon affich\xE9 :</strong> J \xE0 J+3 \u2014 Ph\xE9nom\xE8nes de grande \xE9chelle uniquement.
      Les \xE9v\xE8nement \xE0 J restent sous responsabilit\xE9 dispatcher individuelle.
<span class="text-blue-400 text-xs ml-2">\u2014 Cliquez sur une ligne pour afficher le d\xE9tail.</span> </div> </header> <div class="mb-8 rounded-xl overflow-hidden border border-gray-200 shadow-sm"> <div class="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
Carte des alertes actives
</div> <div id="alert-map" style="height: 420px; width: 100%;"></div> </div> <main id="main-content"> <div class="text-gray-400 text-sm italic">Chargement des alertes...</div> </main> <footer class="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 flex flex-wrap gap-4 justify-between"> <span>Sources : GDACS (UN/CE) \xB7 NOAA/NWS \xB7 MeteoAlarm (EUMETNET)</span> <span>SkyWatch POC v0.1 \u2014 Open source uniquement</span> </footer> <script type="module" src="/lib/main.js"><\/script> </body> </html>`])), renderScript($$result, "/home/project/src/pages/index.astro?astro&type=script&index=0&lang.ts"), renderHead());
}, "/home/project/src/pages/index.astro", void 0);

const $$file = "/home/project/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
