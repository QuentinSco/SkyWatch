export { renderers } from '../../renderers.mjs';

const AF_AIRPORTS = [
  { icao: "LFPG", lat: 49.0128, lon: 2.55, iso3: "FRA", name: "Paris CDG" },
  { icao: "LFPO", lat: 48.7233, lon: 2.3794, iso3: "FRA", name: "Paris Orly" },
  { icao: "LFLL", lat: 45.7256, lon: 5.0811, iso3: "FRA", name: "Lyon Saint-Exupéry" },
  { icao: "LFMN", lat: 43.6584, lon: 7.2159, iso3: "FRA", name: "Nice" },
  { icao: "LFBO", lat: 43.6293, lon: 1.3678, iso3: "FRA", name: "Toulouse" },
  { icao: "LFRS", lat: 47.1532, lon: -1.6108, iso3: "FRA", name: "Nantes" },
  { icao: "LFRB", lat: 48.4479, lon: -4.4185, iso3: "FRA", name: "Brest" },
  { icao: "LFRN", lat: 48.0695, lon: -1.7348, iso3: "FRA", name: "Rennes" },
  { icao: "LFML", lat: 43.4393, lon: 5.2214, iso3: "FRA", name: "Marseille" },
  { icao: "LFBD", lat: 44.8283, lon: -0.7156, iso3: "FRA", name: "Bordeaux" },
  { icao: "LFST", lat: 48.5383, lon: 7.6283, iso3: "FRA", name: "Strasbourg" },
  { icao: "EDDF", lat: 50.0379, lon: 8.5622, iso3: "DEU", name: "Francfort" },
  { icao: "EDDM", lat: 48.3537, lon: 11.775, iso3: "DEU", name: "Munich" },
  { icao: "EDDB", lat: 52.3667, lon: 13.5033, iso3: "DEU", name: "Berlin" },
  { icao: "EDDH", lat: 53.6304, lon: 9.9882, iso3: "DEU", name: "Hambourg" },
  { icao: "EHAM", lat: 52.3086, lon: 4.7639, iso3: "NLD", name: "Amsterdam" },
  { icao: "EBBR", lat: 50.9014, lon: 4.4844, iso3: "BEL", name: "Bruxelles" },
  { icao: "EGLL", lat: 51.4775, lon: -0.4614, iso3: "GBR", name: "Londres Heathrow" },
  { icao: "EGPF", lat: 55.8719, lon: -4.4331, iso3: "GBR", name: "Glasgow" },
  { icao: "LEMD", lat: 40.4936, lon: -3.5668, iso3: "ESP", name: "Madrid" },
  { icao: "LEBL", lat: 41.2971, lon: 2.0785, iso3: "ESP", name: "Barcelone" },
  { icao: "LEAL", lat: 38.2822, lon: -0.5582, iso3: "ESP", name: "Alicante" },
  { icao: "LEPA", lat: 39.5517, lon: 2.7388, iso3: "ESP", name: "Palma" },
  { icao: "LIRF", lat: 41.8003, lon: 12.2389, iso3: "ITA", name: "Rome Fiumicino" },
  { icao: "LIMC", lat: 45.6306, lon: 8.7281, iso3: "ITA", name: "Milan Malpensa" },
  { icao: "LIPZ", lat: 45.5053, lon: 12.3519, iso3: "ITA", name: "Venise" },
  { icao: "LSZH", lat: 47.4647, lon: 8.5492, iso3: "CHE", name: "Zurich" },
  { icao: "LSGG", lat: 46.238, lon: 6.1089, iso3: "CHE", name: "Genève" },
  { icao: "LPPT", lat: 38.7813, lon: -9.1359, iso3: "PRT", name: "Lisbonne" },
  { icao: "LPFR", lat: 37.0144, lon: -7.9659, iso3: "PRT", name: "Faro" },
  { icao: "LGAV", lat: 37.9364, lon: 23.9445, iso3: "GRC", name: "Athènes" },
  { icao: "ESSA", lat: 59.6519, lon: 17.9186, iso3: "SWE", name: "Stockholm" },
  { icao: "ENGM", lat: 60.1939, lon: 11.1004, iso3: "NOR", name: "Oslo" },
  { icao: "EKCH", lat: 55.6181, lon: 12.6561, iso3: "DNK", name: "Copenhague" },
  { icao: "EFHK", lat: 60.3172, lon: 24.9633, iso3: "FIN", name: "Helsinki" },
  { icao: "LOWW", lat: 48.1103, lon: 16.5697, iso3: "AUT", name: "Vienne" },
  { icao: "EPWA", lat: 52.1657, lon: 20.9671, iso3: "POL", name: "Varsovie" },
  { icao: "LKPR", lat: 50.1008, lon: 14.26, iso3: "CZE", name: "Prague" },
  { icao: "LHBP", lat: 47.4369, lon: 19.2556, iso3: "HUN", name: "Budapest" },
  { icao: "LROP", lat: 44.5722, lon: 26.1022, iso3: "ROU", name: "Bucarest" },
  { icao: "KJFK", lat: 40.6413, lon: -73.7781, iso3: "USA", name: "New York JFK" },
  { icao: "KEWR", lat: 40.6895, lon: -74.1745, iso3: "USA", name: "New York Newark" },
  { icao: "KBOS", lat: 42.3656, lon: -71.0096, iso3: "USA", name: "Boston" },
  { icao: "KORD", lat: 41.9742, lon: -87.9073, iso3: "USA", name: "Chicago" },
  { icao: "KLAX", lat: 33.9425, lon: -118.4081, iso3: "USA", name: "Los Angeles" },
  { icao: "KMIA", lat: 25.7959, lon: -80.287, iso3: "USA", name: "Miami" },
  { icao: "KIAD", lat: 38.9531, lon: -77.4565, iso3: "USA", name: "Washington Dulles" },
  { icao: "KATL", lat: 33.6367, lon: -84.4281, iso3: "USA", name: "Atlanta" },
  { icao: "KSEA", lat: 47.4502, lon: -122.3088, iso3: "USA", name: "Seattle" },
  { icao: "KPDX", lat: 45.5898, lon: -122.5951, iso3: "USA", name: "Portland" },
  { icao: "KBWI", lat: 39.1754, lon: -76.6683, iso3: "USA", name: "Baltimore" },
  { icao: "KDEN", lat: 39.8561, lon: -104.6737, iso3: "USA", name: "Denver" },
  { icao: "SBGR", lat: -23.4356, lon: -46.4731, iso3: "BRA", name: "São Paulo" },
  { icao: "SCEL", lat: -33.393, lon: -70.7858, iso3: "CHL", name: "Santiago" },
  { icao: "MMMX", lat: 19.4363, lon: -99.0721, iso3: "MEX", name: "Mexico" },
  { icao: "TFFR", lat: 16.2653, lon: -61.5272, iso3: "GLP", name: "Pointe-à-Pitre" },
  { icao: "TFFF", lat: 14.591, lon: -61.0032, iso3: "MTQ", name: "Fort-de-France" },
  { icao: "SOCA", lat: 4.8221, lon: -52.3676, iso3: "GUF", name: "Cayenne" },
  { icao: "FMEE", lat: -20.8871, lon: 55.5116, iso3: "REU", name: "La Réunion" },
  { icao: "FMCH", lat: -11.5337, lon: 43.2719, iso3: "COM", name: "Moroni" },
  { icao: "FMMI", lat: -18.7969, lon: 47.4788, iso3: "MDG", name: "Antananarivo" },
  { icao: "FIMP", lat: -20.4302, lon: 57.6836, iso3: "MUS", name: "Mauritius" },
  { icao: "DAAG", lat: 36.691, lon: 3.2154, iso3: "DZA", name: "Alger" },
  { icao: "DTTA", lat: 36.851, lon: 10.2272, iso3: "TUN", name: "Tunis" },
  { icao: "GMMN", lat: 33.3675, lon: -7.5898, iso3: "MAR", name: "Casablanca" },
  { icao: "GOBD", lat: 14.6704, lon: -17.0726, iso3: "SEN", name: "Dakar" },
  { icao: "DIAP", lat: 5.2614, lon: -3.9263, iso3: "CIV", name: "Abidjan" },
  { icao: "DNMM", lat: 6.5774, lon: 3.3215, iso3: "NGA", name: "Lagos" },
  { icao: "FOOL", lat: 0.4586, lon: 9.4123, iso3: "GAB", name: "Libreville" },
  { icao: "FCBB", lat: -4.2517, lon: 15.2531, iso3: "COG", name: "Brazzaville" },
  { icao: "HTDA", lat: -6.8781, lon: 39.2026, iso3: "TZA", name: "Dar es Salaam" },
  { icao: "HAAB", lat: 8.9779, lon: 38.7993, iso3: "ETH", name: "Addis Abeba" },
  { icao: "OMDB", lat: 25.2528, lon: 55.3644, iso3: "ARE", name: "Dubaï" },
  { icao: "OERK", lat: 24.9576, lon: 46.6988, iso3: "SAU", name: "Riyad" },
  { icao: "VHHH", lat: 22.308, lon: 113.9185, iso3: "HKG", name: "Hong Kong" },
  { icao: "RJTT", lat: 35.5494, lon: 139.7798, iso3: "JPN", name: "Tokyo" },
  { icao: "WSSS", lat: 1.3644, lon: 103.9915, iso3: "SGP", name: "Singapour" },
  { icao: "ZBAA", lat: 40.0801, lon: 116.5846, iso3: "CHN", name: "Pékin" },
  { icao: "ZSPD", lat: 31.1434, lon: 121.8052, iso3: "CHN", name: "Shanghai" },
  { icao: "VABB", lat: 19.0896, lon: 72.8656, iso3: "IND", name: "Mumbai" },
  { icao: "VIDP", lat: 28.5562, lon: 77.1, iso3: "IND", name: "Delhi" }
];
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
function getAirportsNearCoords(lat, lon, radiusKm = 400) {
  return AF_AIRPORTS.filter((a) => haversineKm(lat, lon, a.lat, a.lon) <= radiusKm).map((a) => a.icao);
}
function getAirportsByCountry(iso3) {
  return AF_AIRPORTS.filter((a) => a.iso3 === iso3).map((a) => a.icao);
}
function regionFromCoords(lat, lon) {
  if (lon > 60) return "ASIE";
  if (lon > 20 && lat < 40) return "AFR";
  if (lon > -20 && lat < 40) return "AFR";
  if (lon < -30 && lat > 20) return "AMN";
  if (lon < -30 && lat <= 20) return "AMS";
  return "EUR";
}
function basinFromCoords(lat, lon) {
  if (lon > 30 && lat < 30) return "Océan Indien";
  if (lon > 100) return "Pacifique SW";
  if (lon < -40) return "Atlantique";
  return "Océan Indien";
}
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
  MAZ015: ["KBOS"],
  MAZ016: ["KBOS"],
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
  CAZ087: ["KLAX"],
  FLZ063: ["KMIA"],
  FLZ066: ["KMIA"],
  FLZ068: ["KMIA"],
  FLZ069: ["KMIA"],
  FLZ072: ["KMIA"],
  FLZ073: ["KMIA"],
  FLZ074: ["KMIA"],
  FLZ075: ["KMIA"],
  WAZ001: ["KSEA"],
  WAZ503: ["KSEA"],
  WAZ504: ["KSEA"],
  WAZ505: ["KSEA"],
  WAZ506: ["KSEA"],
  WAZ507: ["KSEA"],
  WAZ508: ["KSEA"],
  WAZ509: ["KSEA"],
  WAZ555: ["KSEA"],
  WAZ556: ["KSEA"],
  WAZ558: ["KSEA"],
  WAZ559: ["KSEA"],
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
  MNZ070: ["KMSP"],
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
const GDACS_TYPE_LABELS = {
  EQ: "Tremblement de terre",
  TC: "Cyclone tropical",
  FL: "Inondation",
  VO: "Éruption volcanique",
  WF: "Incendie",
  TS: "Tsunami"
};
const GDACS_IMPACT_RADIUS = {
  EQ: 500,
  TC: 800,
  FL: 300,
  VO: 400,
  WF: 300,
  TS: 1e3
};
const GDACS_RELEVANT_TYPES = /* @__PURE__ */ new Set(["EQ", "TC", "FL", "VO", "TS"]);
function gdacsGetTag(item, tag) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
}
function gdacsParseLevel(item) {
  const raw = gdacsGetTag(item, "gdacs:alertlevel").toLowerCase();
  if (raw === "red") return 3;
  if (raw === "orange") return 2;
  return 1;
}
function gdacsParseCoords(item) {
  const geoLat = gdacsGetTag(item, "geo:lat");
  const geoLon = gdacsGetTag(item, "geo:long");
  if (geoLat && geoLon) return { lat: parseFloat(geoLat), lon: parseFloat(geoLon) };
  const point = gdacsGetTag(item, "georss:point");
  if (point) {
    const parts = point.trim().split(/\s+/);
    if (parts.length === 2) return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
  }
  return null;
}
function gdacsParseEventType(item) {
  const et = gdacsGetTag(item, "gdacs:eventtype").toUpperCase();
  if (GDACS_RELEVANT_TYPES.has(et)) return et;
  const title = gdacsGetTag(item, "title").toLowerCase();
  if (title.includes("earthquake")) return "EQ";
  if (title.includes("tropical") || title.includes("cyclone") || title.includes("typhoon") || title.includes("hurricane")) return "TC";
  if (title.includes("flood")) return "FL";
  if (title.includes("volcano")) return "VO";
  if (title.includes("tsunami")) return "TS";
  return null;
}
async function fetchGDACS() {
  const alerts = [];
  try {
    const res = await fetch("https://www.gdacs.org/xml/rss.xml", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SkyWatch/1.0)",
        "Accept": "application/xml, text/xml, */*"
      },
      signal: AbortSignal.timeout(1e4)
    });
    if (!res.ok) {
      console.error("[GDACS] HTTP", res.status);
      return alerts;
    }
    const xml = await res.text();
    for (const item of xml.split("<item>").slice(1)) {
      const eventType = gdacsParseEventType(item);
      if (!eventType) continue;
      const level = gdacsParseLevel(item);
      const severityRaw = gdacsGetTag(item, "gdacs:severity");
      const windMatch = severityRaw.match(/(\d+(?:\.\d+)?)\s*km\/h/i);
      const windKmh = windMatch ? parseFloat(windMatch[1]) : null;
      const isTcByWind = eventType === "TC" && windKmh !== null && windKmh >= 120;
      if (level < 2 && !isTcByWind) continue;
      const coords = gdacsParseCoords(item);
      if (!coords) continue;
      const { lat, lon } = coords;
      const title = gdacsGetTag(item, "title");
      const description = gdacsGetTag(item, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const pubDate = gdacsGetTag(item, "pubDate");
      const link = gdacsGetTag(item, "link") || "https://www.gdacs.org";
      const country = gdacsGetTag(item, "gdacs:country") || gdacsGetTag(item, "gdacs:eventname") || "";
      const magRaw = gdacsGetTag(item, "gdacs:magnitude");
      const magnitude = magRaw ? parseFloat(magRaw) : windKmh ?? void 0;
      const eventId = gdacsGetTag(item, "gdacs:eventid") || `${eventType}-${lat}-${lon}`;
      const radius = GDACS_IMPACT_RADIUS[eventType] ?? 400;
      const airports = getAirportsNearCoords(lat, lon, radius);
      const region = regionFromCoords(lat, lon);
      const basin = eventType === "TC" ? basinFromCoords(lat, lon) : void 0;
      let severity;
      if (level >= 3) severity = "red";
      else if (level === 2) severity = "orange";
      else if (windKmh !== null && windKmh >= 180) severity = "red";
      else severity = "orange";
      const label = GDACS_TYPE_LABELS[eventType] ?? "Événement";
      const magStr = windKmh ? ` ${windKmh} km/h` : magnitude ? ` M${magnitude}` : "";
      alerts.push({
        id: `gdacs-${eventId}`,
        source: "GDACS",
        region,
        severity,
        phenomenon: label,
        eventType,
        country,
        airports,
        lat,
        lon,
        validFrom: pubDate,
        validTo: null,
        headline: `${label}${magStr} — ${country || "Région inconnue"}`,
        description,
        link,
        ...basin ? { basin } : {},
        ...magnitude ? { magnitude } : {}
      });
    }
    alerts.sort((a, b) => {
      const sev = { red: 3, orange: 2, yellow: 1 };
      if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity];
      return (b.magnitude ?? 0) - (a.magnitude ?? 0);
    });
  } catch (e) {
    if (e?.name !== "AbortError") console.error("[GDACS]", e);
  }
  return alerts;
}
const COUNTRY_NAME_ISO3 = {
  France: "FRA",
  Germany: "DEU",
  Spain: "ESP",
  Italy: "ITA",
  "United Kingdom": "GBR",
  Portugal: "PRT",
  Netherlands: "NLD",
  Belgium: "BEL",
  Switzerland: "CHE",
  Austria: "AUT",
  Poland: "POL",
  Romania: "ROU",
  Croatia: "HRV",
  Greece: "GRC",
  Sweden: "SWE",
  Norway: "NOR",
  Denmark: "DNK",
  Finland: "FIN",
  "Czech Republic": "CZE",
  Slovakia: "SVK",
  Hungary: "HUN",
  Bulgaria: "BGR",
  Slovenia: "SVN",
  Serbia: "SRB",
  Ireland: "IRL",
  Luxembourg: "LUX"
};
const AWT_LABEL = {
  1: "Vent violent",
  2: "Neige / Verglas",
  3: "Orages",
  4: "Brouillard",
  5: "Chaleur extrême",
  6: "Froid extrême",
  7: "Événement côtier",
  10: "Pluie intense",
  11: "Inondation",
  12: "Inondation / Pluie"
};
const EXCLUDED_AWT = /* @__PURE__ */ new Set([8, 9, 13]);
const EXCLUDED_COUNTRIES = /* @__PURE__ */ new Set([
  "Ukraine",
  "Belarus",
  "Moldova",
  "Kosovo",
  "Albania",
  "North Macedonia",
  "Bosnia and Herzegovina",
  "Montenegro",
  "San Marino",
  "Liechtenstein",
  "Armenia",
  "Azerbaijan",
  "Georgia"
]);
const MIN_LEVEL = {
  1: 3,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
  10: 2,
  11: 2,
  12: 2
};
const COUNTRY_CENTROIDS = {
  FRA: { lat: 46.2276, lon: 2.2137 },
  DEU: { lat: 51.1657, lon: 10.4515 },
  ESP: { lat: 40.4637, lon: -3.7492 },
  ITA: { lat: 41.8719, lon: 12.5674 },
  GBR: { lat: 55.3781, lon: -3.436 },
  PRT: { lat: 39.3999, lon: -8.2245 },
  NLD: { lat: 52.1326, lon: 5.2913 },
  BEL: { lat: 50.5039, lon: 4.4699 },
  CHE: { lat: 46.8182, lon: 8.2275 },
  AUT: { lat: 47.5162, lon: 14.5501 },
  POL: { lat: 51.9194, lon: 19.1451 },
  ROU: { lat: 45.9432, lon: 24.9668 },
  HRV: { lat: 45.1, lon: 15.2 },
  GRC: { lat: 39.0742, lon: 21.8243 },
  SWE: { lat: 60.1282, lon: 18.6435 },
  NOR: { lat: 60.472, lon: 8.4689 },
  DNK: { lat: 56.2639, lon: 9.5018 },
  FIN: { lat: 61.9241, lon: 25.7482 },
  CZE: { lat: 49.8175, lon: 15.473 },
  SVK: { lat: 48.669, lon: 19.699 },
  HUN: { lat: 47.1625, lon: 19.5033 },
  BGR: { lat: 42.7339, lon: 25.4858 },
  SVN: { lat: 46.1512, lon: 14.9955 },
  SRB: { lat: 44.0165, lon: 21.0059 },
  IRL: { lat: 53.1424, lon: -7.6921 },
  LUX: { lat: 49.8153, lon: 6.1296 }
};
async function fetchMeteoAlarm() {
  const alerts = [];
  try {
    const FEED_URL = "https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-rss-europe";
    const res = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SkyWatch/1.0)",
        "Accept": "application/xml, text/xml, */*"
      },
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) {
      console.error("[MeteoAlarm] HTTP", res.status);
      return alerts;
    }
    const xml = await res.text();
    for (const item of xml.split("<item>").slice(1)) {
      const getTag = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
      };
      const title = getTag("title");
      const country = title.replace(/^MeteoAlarm\s+/i, "").trim();
      if (!country || EXCLUDED_COUNTRIES.has(country)) continue;
      const description = getTag("description");
      const pubDate = getTag("pubDate");
      const link = getTag("link") || "https://www.meteoalarm.org";
      const eventRegex = /data-awareness-level="(\d+)"[^>]*data-awareness-type="(\d+)"/g;
      let match;
      const events = [];
      while ((match = eventRegex.exec(description)) !== null) {
        events.push({ level: parseInt(match[1], 10), awt: parseInt(match[2], 10) });
      }
      if (events.length === 0) continue;
      const significant = events.filter(
        (e) => !EXCLUDED_AWT.has(e.awt) && e.level >= (MIN_LEVEL[e.awt] ?? 2)
      );
      if (significant.length === 0) continue;
      const byType = /* @__PURE__ */ new Map();
      for (const e of significant) {
        if (!byType.has(e.awt) || e.level > byType.get(e.awt)) {
          byType.set(e.awt, e.level);
        }
      }
      const iso3 = COUNTRY_NAME_ISO3[country] ?? "";
      const centroid = iso3 ? COUNTRY_CENTROIDS[iso3] : null;
      const lat = centroid?.lat;
      const lon = centroid?.lon;
      const airports = centroid ? getAirportsNearCoords(centroid.lat, centroid.lon, 600) : iso3 ? getAirportsByCountry(iso3) : [];
      for (const [awt, level] of byType.entries()) {
        const severity = level >= 4 ? "red" : level === 3 ? "orange" : "yellow";
        const phenomenon = AWT_LABEL[awt] ?? `Phénomène type ${awt}`;
        const levelLabel = level >= 4 ? "ROUGE" : level === 3 ? "ORANGE" : "JAUNE";
        alerts.push({
          id: `MA-${country}-${awt}-${pubDate}`,
          source: "MeteoAlarm",
          region: "EUR",
          severity,
          phenomenon,
          country,
          airports,
          ...lat !== void 0 ? { lat } : {},
          ...lon !== void 0 ? { lon } : {},
          validFrom: pubDate,
          validTo: pubDate,
          headline: `Alerte ${levelLabel} ${phenomenon} — ${country}`,
          description: `Niveau ${levelLabel} — ${phenomenon} en ${country}`,
          link
        });
      }
    }
  } catch (e) {
    if (e?.name !== "AbortError") console.error("[MeteoAlarm]", e);
  }
  return alerts;
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
