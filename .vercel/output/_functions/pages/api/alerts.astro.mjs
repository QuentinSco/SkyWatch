export { renderers } from '../../renderers.mjs';

const NWS_ZONE_AIRPORTS = {
  NYZ063: ["KJFK", "KEWR"],
  NYZ064: ["KJFK"],
  NYZ065: ["KJFK"],
  NYZ066: ["KJFK"],
  NYZ067: ["KJFK"],
  NYZ068: ["KJFK"],
  NYZ069: ["KJFK"],
  NYZ070: ["KJFK"],
  NYZ071: ["KJFK"],
  NYZ072: ["KJFK"],
  NYZ073: ["KJFK"],
  NYZ074: ["KJFK"],
  NYZ075: ["KJFK"],
  NYZ078: ["KJFK"],
  NYZ079: ["KJFK"],
  NYZ080: ["KJFK"],
  NYZ081: ["KJFK"],
  NJZ001: ["KEWR"],
  NJZ002: ["KEWR"],
  NJZ004: ["KEWR"],
  NJZ006: ["KEWR"],
  NJZ103: ["KEWR"],
  NJZ104: ["KEWR"],
  NJZ106: ["KEWR"],
  NJZ107: ["KEWR"],
  NJZ108: ["KEWR"],
  CTZ001: ["KEWR"],
  CTZ002: ["KEWR"],
  CTZ005: ["KEWR"],
  CTZ006: ["KEWR"],
  CTZ007: ["KEWR"],
  CTZ008: ["KEWR"],
  CTZ009: ["KEWR"],
  CTZ010: ["KEWR"],
  CTZ011: ["KEWR"],
  CTZ012: ["KEWR"],
  CTZ013: ["KEWR"],
  MAZ001: ["KBOS"],
  MAZ002: ["KBOS"],
  MAZ003: ["KBOS"],
  MAZ004: ["KBOS"],
  MAZ005: ["KBOS"],
  MAZ006: ["KBOS"],
  MAZ007: ["KBOS"],
  MAZ013: ["KBOS"],
  MAZ014: ["KBOS"],
  ILZ006: ["KORD"],
  ILZ012: ["KORD"],
  ILZ013: ["KORD"],
  ILZ014: ["KORD"],
  ILZ103: ["KORD"],
  ILZ104: ["KORD"],
  CAZ006: ["KLAX"],
  CAZ041: ["KLAX"],
  CAZ042: ["KLAX"],
  CAZ043: ["KLAX"],
  CAZ044: ["KLAX"],
  CAZ045: ["KLAX"],
  FLZ063: ["KMIA"],
  FLZ066: ["KMIA"],
  FLZ068: ["KMIA"],
  FLZ069: ["KMIA"],
  FLZ072: ["KMIA"],
  FLZ073: ["KMIA"],
  WAZ001: ["KSEA"],
  WAZ503: ["KSEA"],
  WAZ504: ["KSEA"],
  WAZ505: ["KSEA"],
  WAZ506: ["KSEA"],
  WAZ507: ["KSEA"],
  WAZ508: ["KSEA"],
  WAZ509: ["KSEA"],
  WAZ555: ["KSEA"],
  COZ001: ["KDEN"],
  COZ002: ["KDEN"],
  COZ003: ["KDEN"],
  COZ039: ["KDEN"],
  COZ040: ["KDEN"],
  COZ041: ["KDEN"],
  MNZ060: ["KMSP"],
  MNZ061: ["KMSP"],
  MNZ062: ["KMSP"],
  MNZ063: ["KMSP"],
  MNZ068: ["KMSP"],
  MNZ069: ["KMSP"],
  TXZ103: ["KIAH"],
  TXZ163: ["KIAH"],
  TXZ164: ["KIAH"],
  TXZ176: ["KIAH"],
  TXZ177: ["KIAH"],
  TXZ178: ["KIAH"],
  ORZ006: ["KPDX"],
  ORZ007: ["KPDX"],
  ORZ008: ["KPDX"]
};
const RELEVANT_EVENTS = /* @__PURE__ */ new Set([
  "Blizzard Warning",
  "Winter Storm Warning",
  "Winter Storm Watch",
  "Ice Storm Warning",
  "Heavy Snow Warning",
  "High Wind Warning",
  "High Wind Watch",
  "Hurricane Warning",
  "Hurricane Watch",
  "Tropical Storm Warning",
  "Tropical Storm Watch",
  "Tornado Warning",
  "Tornado Watch",
  "Dense Fog Advisory",
  "Freezing Fog Advisory",
  "Extreme Cold Warning",
  "Wind Chill Warning",
  "Dust Storm Warning",
  "Flood Warning",
  "Coastal Flood Warning"
]);
function noaaSeverity(event) {
  const e = event.toLowerCase();
  if (e.includes("warning") || e.includes("blizzard")) return "red";
  if (e.includes("watch")) return "orange";
  return "yellow";
}
async function fetchNOAA() {
  const alerts = [];
  try {
    const res = await fetch(
      "https://api.weather.gov/alerts/active?status=actual&message_type=alert,update",
      { headers: { "User-Agent": "SkyWatch/0.1", "Accept": "application/geo+json" } }
    );
    const json = await res.json();
    const raw = [];
    for (const f of json.features ?? []) {
      const p = f.properties;
      if (!RELEVANT_EVENTS.has(p.event)) continue;
      const zones = p.geocode?.UGC ?? [];
      const airportSet = /* @__PURE__ */ new Set();
      for (const zone of zones) {
        const found = NWS_ZONE_AIRPORTS[zone];
        if (found) found.forEach((a) => airportSet.add(a));
      }
      const airports = [...airportSet];
      if (airports.length === 0) continue;
      raw.push({
        id: `NOAA-${p.id}`,
        source: "NOAA",
        region: "AMN",
        severity: noaaSeverity(p.event),
        phenomenon: p.event,
        country: "United States",
        airports,
        validFrom: p.onset || p.effective || "",
        validTo: p.expires || "",
        headline: p.headline || p.event,
        description: p.description?.slice(0, 500) || p.headline || "",
        link: p["@id"] || "https://www.weather.gov/alerts"
      });
    }
    const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };
    const seen = /* @__PURE__ */ new Map();
    for (const a of raw) {
      const key = a.phenomenon;
      if (!seen.has(key)) {
        seen.set(key, { ...a });
      } else {
        const ex = seen.get(key);
        const severity = SEVERITY_ORDER[a.severity] < SEVERITY_ORDER[ex.severity] ? a.severity : ex.severity;
        const airports = [.../* @__PURE__ */ new Set([...ex.airports, ...a.airports])];
        seen.set(key, { ...ex, severity, airports });
      }
    }
    alerts.push(...seen.values());
  } catch (e) {
    console.error("[NOAA]", e);
  }
  return alerts;
}
async function fetchGDACS() {
  const alerts = [];
  try {
    const res = await fetch("https://www.gdacs.org/xml/rss.xml", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyWatch/1.0)" }
    });
    if (!res.ok) {
      console.error("[GDACS] HTTP", res.status);
      return alerts;
    }
    const xml = await res.text();
    for (const item of xml.split("<item>").slice(1)) {
      const getTag = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
      };
      const alertLevel = getTag("gdacs:alertlevel").toLowerCase();
      if (!alertLevel || alertLevel === "green") continue;
      const eventType = getTag("gdacs:eventtype").toUpperCase();
      const country = getTag("gdacs:country") || getTag("dc:subject") || "";
      const title = getTag("title");
      const link = getTag("link");
      const pubDate = getTag("pubDate");
      let severity = "yellow";
      if (alertLevel === "red") severity = "red";
      else if (alertLevel === "orange") severity = "orange";
      const typeLabels = {
        TC: "Cyclone tropical",
        EQ: "Tremblement de terre",
        FL: "Inondation",
        VO: "Volcan",
        WF: "Incendie",
        TS: "Tsunami"
      };
      alerts.push({
        id: `GDACS-${getTag("gdacs:eventid") || Math.random()}`,
        source: "GDACS",
        region: "ASIE",
        severity,
        phenomenon: typeLabels[eventType] || eventType,
        country,
        airports: [],
        validFrom: pubDate,
        validTo: null,
        headline: title,
        description: getTag("description").slice(0, 500),
        link
      });
    }
  } catch (e) {
    console.error("[GDACS]", e);
  }
  return alerts;
}
async function fetchMeteoAlarm() {
  return [];
}

const prerender = false;
const CACHE_TTL = 5 * 60 * 1e3;
let cache = null;
const GET = async () => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
    });
  }
  const [gdacs, noaa, meteoalarm] = await Promise.all([
    fetchGDACS(),
    fetchNOAA(),
    fetchMeteoAlarm()
  ]);
  const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };
  const all = [...gdacs, ...noaa, ...meteoalarm].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  cache = { ts: Date.now(), data: all };
  return new Response(JSON.stringify(all), {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
