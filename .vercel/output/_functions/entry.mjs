import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_a6MG-4SI.mjs';
import { manifest } from './manifest_AmQOXq2V.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/alerts.astro.mjs');
const _page2 = () => import('./pages/api/gdacs.astro.mjs');
const _page3 = () => import('./pages/api/proxy.astro.mjs');
const _page4 = () => import('./pages/api-alerts.json.astro.mjs');
const _page5 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/alerts.ts", _page1],
    ["src/pages/api/gdacs.ts", _page2],
    ["src/pages/api/proxy.ts", _page3],
    ["src/pages/api-alerts.json.js", _page4],
    ["src/pages/index.astro", _page5]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "5407c586-9cc1-40b6-9ec9-d204785db6ff",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
