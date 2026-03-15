import emmaCentroidsData from './emmaCentroids.json';
import { AIRPORTS, LC_AIRPORTS } from './airports';

type Severity = 'red' | 'orange' | 'yellow';

interface Alert {
  id: string;
  source: string;
  region: string;
  severity: Severity;
  phenomenon: string;
  country: string;
  airports: string[];
  validFrom: string;
  validTo: string | null;
  headline: string;
  description?: string;
  link?: string;
  lat?: number;
  lon?: number;
  magnitude?: number;
  basin?: string;
  eventType?: string;
  volcanoName?: string;
  tcBulletinLabel?: string;
  tcBulletinUrl?: string;
}

// ─── Volcans Hawaii → NTAA (Papeete) ─────────────────────────────────────────────────────────
// Les volcans de Hawaii (Big Island, ~19°N 155°W) sont à ~4 200 km de Tahiti.
// Aucun rayon de proximité ne peut relier les deux ; on force le mapping explicitement.
// Liste non exhaustive — couvre les volcans actifs gérés par le VAAC Washington.
const HAWAII_VOLCANO_NAMES = new Set([
  'KILAUEA', 'MAUNA LOA', 'MAUNA KEA', 'HUALALAI', 'LOIHI',
  'KILAUEA VOLCANO', 'MAUNA LOA VOLCANO',
]);

/** Retourne true si le nom de volcan correspond à Hawaii. */
function isHawaiiVolcano(name: string | null | undefined): boolean {
  if (!name) return false;
  return HAWAII_VOLCANO_NAMES.has(name.toUpperCase().trim());
}

/**
 * Retourne les aéroports LC proches des coordonnées, en ajoutant NTAA
 * si les coordonnées correspondent à la zone Hawaii (volcanisme actif).
 * Hawaii : lat ∈ [18, 23], lon ∈ [-161, -154]
 *
 * NB : on filtre sur LC_AIRPORTS pour que les alertes météo (page d'accueil)
 * et la trame briefing CCO ne concernent que les escales long-courrier AF.
 */
function getAirportsNearCoordsWithOverride(lat: number, lon: number, radiusKm: number, volcanoName?: string | null): string[] {
  const base = getAirportsNearCoords(lat, lon, radiusKm);
  const isHawaii = (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154) || isHawaiiVolcano(volcanoName);
  if (isHawaii && !base.includes('NTAA')) {
    return [...base, 'NTAA'];
  }
  return base;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Recherche uniquement parmi les escales LC */
function getAirportsNearCoords(lat: number, lon: number, radiusKm = 400): string[] {
  return LC_AIRPORTS
    .filter(a => haversineKm(lat, lon, a.lat, a.lon) <= radiusKm)
    .map(a => a.icao);
}

function getAirportsByCountry(iso3: string): string[] {
  return LC_AIRPORTS.filter(a => a.iso3 === iso3).map(a => a.icao);
}

function regionFromCoords(lat: number, lon: number): string {
  if (lon > 60) return 'ASIE';
  if (lon > 20 && lat < 40) return 'AFR';
  if (lon > -20 && lat < 40) return 'AFR';
  if (lon < -30 && lat > 20) return 'AMN';
  if (lon < -30 && lat <= 20) return 'AMS';
  return 'EUR';
}

function basinFromCoords(lat: number, lon: number): string {
  if (lon > 30 && lat < 30) return 'Océan Indien';
  if (lon > 100) return 'Pacifique SW';
  if (lon < -40) return 'Atlantique';
  return 'Océan Indien';
}

function tcBulletinLink(lat: number, lon: number): { label: string; url: string } {
  if (lon >= 20 && lon < 90 && lat < 30) {
    return {
      label: 'Bulletin RSMC La Réunion',
      url:   'https://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/anglais/activitedevstop/rsmc/',
    };
  }
  if (lon >= 90) {
    return {
      label: 'Bulletin JTWC',
      url:   'https://www.metoc.navy.mil/jtwc/jtwc.html',
    };
  }
  if (lon <= -100) {
    return {
      label: 'Bulletin NHC — Pac. Est',
      url:   'https://www.nhc.noaa.gov/?epac',
    };
  }
  return {
    label: 'Bulletin NHC — Atlantique',
    url:   'https://www.nhc.noaa.gov/?atlc',
  };
}

/** Supprime les wrappers CDATA d'une chaîne XML : <!\[CDATA\[...\]\]> → contenu brut */
function stripCdata(s: string): string {
  let result = s;
  let start = result.indexOf('<![CDATA[');
  while (start !== -1) {
    const end = result.indexOf(']]>', start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(start + 9, end) + result.slice(end + 3);
    start = result.indexOf('<![CDATA[', start);
  }
  return result;
}

// ─── NOAA ────────────────────────────────────────────────────────────────────────────────────

const NWS_ZONE_AIRPORTS: Record<string, string[]> = {
  NYZ063: ['KJFK', 'KEWR'], NYZ064: ['KJFK'], NYZ065: ['KJFK'],
  NYZ066: ['KJFK'], NYZ067: ['KJFK'], NYZ068: ['KJFK'],
  NYZ069: ['KJFK'], NYZ070: ['KJFK'], NYZ071: ['KJFK'],
  NYZ072: ['KJFK'], NYZ073: ['KJFK'], NYZ074: ['KJFK'],
  NYZ075: ['KJFK'], NYZ078: ['KJFK'], NYZ079: ['KJFK'],
  NYZ080: ['KJFK'], NYZ081: ['KJFK'],
  NJZ001: ['KEWR'], NJZ002: ['KEWR'], NJZ004: ['KEWR'],
  NJZ006: ['KEWR'], NJZ103: ['KEWR'], NJZ104: ['KEWR'],
  NJZ106: ['KEWR'], NJZ107: ['KEWR'], NJZ108: ['KEWR'],
  CTZ001: ['KEWR'], CTZ002: ['KEWR'], CTZ005: ['KEWR'],
  CTZ006: ['KEWR'], CTZ007: ['KEWR'], CTZ008: ['KEWR'],
  CTZ009: ['KEWR'], CTZ010: ['KEWR'], CTZ011: ['KEWR'],
  CTZ012: ['KEWR'], CTZ013: ['KEWR'],
  MAZ001: ['KBOS'], MAZ002: ['KBOS'], MAZ003: ['KBOS'],
  MAZ004: ['KBOS'], MAZ005: ['KBOS'], MAZ006: ['KBOS'],
  MAZ007: ['KBOS'], MAZ013: ['KBOS'], MAZ014: ['KBOS'],
  MAZ015: ['KBOS'], MAZ016: ['KBOS'],
  MAZ017: ['KBOS'], MAZ018: ['KBOS'], MAZ019: ['KBOS'],
  MAZ020: ['KBOS'], MAZ021: ['KBOS'], MAZ022: ['KBOS'],
  MAZ023: ['KBOS'], MAZ024: ['KBOS'],
  RIZ001: ['KBOS'], RIZ002: ['KBOS'], RIZ003: ['KBOS'],
  RIZ004: ['KBOS'], RIZ005: ['KBOS'], RIZ006: ['KBOS'],
  RIZ007: ['KBOS'], RIZ008: ['KBOS'],
  ILZ006: ['KORD'], ILZ012: ['KORD'], ILZ013: ['KORD'],
  ILZ014: ['KORD'], ILZ103: ['KORD'], ILZ104: ['KORD'],
  CAZ006: ['KSFO'], CAZ007: ['KSFO'], CAZ008: ['KSFO'],
  CAZ509: ['KSFO'], CAZ510: ['KSFO'], CAZ511: ['KSFO'],
  CAZ512: ['KSFO'], CAZ513: ['KSFO'], CAZ514: ['KSFO'],
  CAZ515: ['KSFO'], CAZ516: ['KSFO'], CAZ517: ['KSFO'],
  CAZ518: ['KSFO'], CAZ519: ['KSFO'], CAZ520: ['KSFO'],
  CAZ041: ['KLAX'], CAZ042: ['KLAX'], CAZ043: ['KLAX'],
  CAZ044: ['KLAX'], CAZ045: ['KLAX'], CAZ087: ['KLAX'],
  FLZ063: ['KMIA'], FLZ066: ['KMIA'], FLZ068: ['KMIA'],
  FLZ069: ['KMIA'], FLZ072: ['KMIA'], FLZ073: ['KMIA'],
  FLZ074: ['KMIA'], FLZ075: ['KMIA'],
  WAZ001: ['KSEA'], WAZ503: ['KSEA'], WAZ504: ['KSEA'],
  WAZ505: ['KSEA'], WAZ506: ['KSEA'], WAZ507: ['KSEA'],
  WAZ508: ['KSEA'], WAZ509: ['KSEA'], WAZ555: ['KSEA'],
  WAZ556: ['KSEA'], WAZ558: ['KSEA'], WAZ559: ['KSEA'],
  COZ001: ['KDEN'], COZ002: ['KDEN'], COZ003: ['KDEN'],
  COZ039: ['KDEN'], COZ040: ['KDEN'], COZ041: ['KDEN'],
  MNZ060: ['KMSP'], MNZ061: ['KMSP'], MNZ062: ['KMSP'],
  MNZ063: ['KMSP'], MNZ068: ['KMSP'], MNZ069: ['KMSP'],
  MNZ070: ['KMSP'],
  TXZ103: ['KIAH'], TXZ163: ['KIAH'], TXZ164: ['KIAH'],
  TXZ176: ['KIAH'], TXZ177: ['KIAH'], TXZ178: ['KIAH'],
  ORZ006: ['KPDX'], ORZ007: ['KPDX'], ORZ008: ['KPDX'],
};

const NOAA_PHENOMENON_FR: Record<string, string> = {
  'Blizzard Warning':           'Blizzard',
  'Winter Storm Warning':       'Neige / Verglas',
  'Winter Storm Watch':         'Neige / Verglas',
  'Ice Storm Warning':          'Gel / Verglas',
  'Heavy Snow Warning':         'Neige',
  'High Wind Warning':          'Vent violent',
  'High Wind Watch':            'Vent violent',
  'Hurricane Warning':          'Hurricane',
  'Hurricane Watch':            'Hurricane',
  'Tropical Storm Warning':     'Cyclone tropical',
  'Tropical Storm Watch':       'Cyclone tropical',
  'Tornado Warning':            'Tornade',
  'Tornado Watch':              'Tornade',
  'Dense Fog Advisory':         'Brouillard',
  'Freezing Fog Advisory':      'Brouillard',
  'Extreme Cold Warning':       'Froid extrême',
  'Wind Chill Warning':         'Froid extrême',
  'Dust Storm Warning':         'Poussière / Sable',
  'Flood Warning':              'Inondation',
  'Coastal Flood Warning':      'Inondation / Pluie',
};

const RELEVANT_EVENTS = new Set(Object.keys(NOAA_PHENOMENON_FR));

function noaaSeverity(event: string): Severity {
  const e = event.toLowerCase();
  if (e.includes('warning') || e.includes('blizzard')) return 'red';
  if (e.includes('watch')) return 'orange';
  return 'yellow';
}

const NOAA_URL = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update';
const NOAA_TIMEOUT_MS = 20_000;  // 20 s — Vercel autorise ~25 s sur les fonctions standard
const NOAA_MAX_ATTEMPTS = 2;
 
async function fetchNOAAOnce(): Promise<Response> {
  return fetch(NOAA_URL, {
    headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/geo+json' },
    signal: AbortSignal.timeout(NOAA_TIMEOUT_MS),
  });
}
 
export async function fetchNOAA(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  let lastError: unknown;
 
  for (let attempt = 1; attempt <= NOAA_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchNOAAOnce();
 
      if (!res.ok) {
        console.error(`[NOAA] HTTP ${res.status}`);
        return alerts;
      }
 
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('json') && !ct.includes('geo+json')) {
        console.error('[NOAA] Unexpected content-type:', ct);
        return alerts;
      }
 
      const json = await res.json();
      const raw: Alert[] = [];
 
      for (const f of (json.features ?? [])) {
        const p = f.properties;
        if (!RELEVANT_EVENTS.has(p.event)) continue;
 
        const zones = p.geocode?.UGC ?? [];
        const airportSet = new Set<string>();
        for (const zone of zones) {
          const found = NWS_ZONE_AIRPORTS[zone];
          if (found) found.forEach((a: string) => airportSet.add(a));
        }
        const airports = [...airportSet];
        if (airports.length === 0) continue;
 
        const airportCoords = airports
          .map(icao => AF_AIRPORTS.find(a => a.icao === icao))
          .filter((a): a is typeof AF_AIRPORTS[0] => a != null);
        const lat = airportCoords.length
          ? airportCoords.reduce((s, a) => s + a.lat, 0) / airportCoords.length
          : undefined;
        const lon = airportCoords.length
          ? airportCoords.reduce((s, a) => s + a.lon, 0) / airportCoords.length
          : undefined;
 
        const phenomenon = NOAA_PHENOMENON_FR[p.event] ?? p.event;
 
        raw.push({
          id:          `NOAA-${p.id}`,
          source:      'NOAA',
          region:      'AMN',
          severity:    noaaSeverity(p.event),
          phenomenon,
          country:     'United States',
          airports,
          ...(lat !== undefined ? { lat } : {}),
          ...(lon !== undefined ? { lon } : {}),
          validFrom:   p.onset || p.effective || '',
          validTo:     p.expires || '',
          headline:    p.headline || p.event,
          description: p.description?.slice(0, 500) || p.headline || '',
          link:        p['@id'] || 'https://www.weather.gov/alerts',
        });
      }
 
      const SEVERITY_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
      const seen = new Map<string, Alert>();
      for (const a of raw) {
        const key = a.phenomenon;
        if (!seen.has(key)) {
          seen.set(key, { ...a });
        } else {
          const ex = seen.get(key)!;
          const severity = SEVERITY_ORDER[a.severity] < SEVERITY_ORDER[ex.severity]
            ? a.severity : ex.severity;
          const airports = [...new Set([...ex.airports, ...a.airports])];
          const mergedCoords = airports
            .map(icao => AF_AIRPORTS.find(ap => ap.icao === icao))
            .filter((ap): ap is typeof AF_AIRPORTS[0] => ap != null);
          const lat = mergedCoords.length
            ? mergedCoords.reduce((s, ap) => s + ap.lat, 0) / mergedCoords.length
            : ex.lat;
          const lon = mergedCoords.length
            ? mergedCoords.reduce((s, ap) => s + ap.lon, 0) / mergedCoords.length
            : ex.lon;
          seen.set(key, {
            ...ex,
            severity,
            airports,
            ...(lat !== undefined ? { lat } : {}),
            ...(lon !== undefined ? { lon } : {}),
          });
        }
      }
 
      alerts.push(...seen.values());
      return alerts; // succès — on sort immédiatement
 
    } catch (e) {
      lastError = e;
      const isTimeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
      if (isTimeout && attempt < NOAA_MAX_ATTEMPTS) {
        console.warn(`[NOAA] Timeout (tentative ${attempt}/${NOAA_MAX_ATTEMPTS}) — retry…`);
        continue;
      }
      // Erreur non-timeout ou dernière tentative
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[NOAA] Échec après ${attempt} tentative(s) :`, msg);
      return alerts;
    }
  }
 
  return alerts;
}

// ─── GDACS ────────────────────────────────────────────────────────────────────────────────────
const GDACS_TYPE_LABELS: Record<string, string> = {
  EQ: 'Tremblement de terre',
  TC: 'Cyclone tropical',
  FL: 'Inondation',
  VO: 'Éruption volcanique',
  WF: 'Incendie',
  TS: 'Tsunami',
};

const GDACS_IMPACT_RADIUS: Record<string, number> = {
  EQ: 500, TC: 800, FL: 300, VO: 400, WF: 300, TS: 1000,
};

const GDACS_RELEVANT_TYPES = new Set(['EQ', 'TC', 'FL', 'VO', 'TS']);

function gdacsGetTag(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
}

function gdacsParseLevel(item: string): number {
  const raw = gdacsGetTag(item, 'gdacs:alertlevel').toLowerCase();
  if (raw === 'red') return 3;
  if (raw === 'orange') return 2;
  return 1;
}

function gdacsParseCoords(item: string): { lat: number; lon: number } | null {
  const geoLat = gdacsGetTag(item, 'geo:lat');
  const geoLon = gdacsGetTag(item, 'geo:long');
  if (geoLat && geoLon) return { lat: parseFloat(geoLat), lon: parseFloat(geoLon) };

  const point = gdacsGetTag(item, 'georss:point');
  if (point) {
    const parts = point.trim().split(/\s+/);
    if (parts.length === 2) return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
  }
  return null;
}

function gdacsParseEventType(item: string): string | null {
  const et = gdacsGetTag(item, 'gdacs:eventtype').toUpperCase();
  if (GDACS_RELEVANT_TYPES.has(et)) return et;

  const title = gdacsGetTag(item, 'title').toLowerCase();
  if (title.includes('earthquake')) return 'EQ';
  if (title.includes('tropical') || title.includes('cyclone') ||
    title.includes('typhoon') || title.includes('hurricane')) return 'TC';
  if (title.includes('flood')) return 'FL';
  if (title.includes('volcano')) return 'VO';
  if (title.includes('tsunami')) return 'TS';
  return null;
}

export async function fetchGDACS(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://www.gdacs.org/xml/rss.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error('[GDACS] HTTP', res.status);
      return alerts;
    }

    const xml = await res.text();
    const now = Date.now();
    const maxAgeDays = 7;

    for (const item of xml.split('<item>').slice(1)) {
      const eventType = gdacsParseEventType(item);
      if (!eventType) continue;

      const level = gdacsParseLevel(item);

      const severityRaw = gdacsGetTag(item, 'gdacs:severity');
      const windMatch = severityRaw.match(/(\d+(?:\.\d+)?)\s*km\/h/i);
      const windKmh = windMatch ? parseFloat(windMatch[1]) : null;

      const isTcByWind = eventType === 'TC' && windKmh !== null && windKmh >= 120;
      if (level < 2 && !isTcByWind) continue;

      const coords = gdacsParseCoords(item);
      if (!coords) continue;

      const { lat, lon } = coords;
      const title = gdacsGetTag(item, 'title');
      const description = gdacsGetTag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const pubDate = gdacsGetTag(item, 'pubDate');

      if (pubDate) {
        try {
          const pubTime = new Date(pubDate).getTime();
          if (!isNaN(pubTime) && now - pubTime > maxAgeDays * 86400000) {
            continue;
          }
        } catch {
          // Si la date ne peut pas être parsée, on conserve l'alerte
        }
      }

      const link = gdacsGetTag(item, 'link') || 'https://www.gdacs.org';
      const gdacsCountry = gdacsGetTag(item, 'gdacs:country');
      const eventName = gdacsGetTag(item, 'gdacs:eventname') || '';
      const magRaw = gdacsGetTag(item, 'gdacs:magnitude');
      const magnitude = magRaw ? parseFloat(magRaw) : windKmh ?? undefined;
      const eventId = gdacsGetTag(item, 'gdacs:eventid') || `${eventType}-${lat}-${lon}`;

      const radius = GDACS_IMPACT_RADIUS[eventType] ?? 400;
      // Pour les volcans GDACS, on utilise le override Hawaii → NTAA
      // getAirportsNearCoords et getAirportsNearCoordsWithOverride travaillent
      // déjà sur LC_AIRPORTS uniquement
      const airports = eventType === 'VO'
        ? getAirportsNearCoordsWithOverride(lat, lon, radius, eventName)
        : getAirportsNearCoords(lat, lon, radius);
      const region = regionFromCoords(lat, lon);
      const basin = eventType === 'TC' ? basinFromCoords(lat, lon) : undefined;

      const country = gdacsCountry || (eventType === 'TC' ? (basin ?? '') : eventName);

      let severity: Severity;
      if (level >= 3) severity = 'red';
      else if (level === 2) severity = 'orange';
      else if (windKmh !== null && windKmh >= 180) severity = 'red';
      else severity = 'orange';

      const label = GDACS_TYPE_LABELS[eventType] ?? 'Événement';
      const magStr = windKmh ? ` ${windKmh} km/h` : magnitude ? ` M${magnitude}` : '';
      const tcName = eventType === 'TC' && eventName ? ` (${eventName})` : '';

      const tcBulletin = eventType === 'TC' ? tcBulletinLink(lat, lon) : undefined;

      alerts.push({
        id: `gdacs-${eventId}`,
        source: 'GDACS',
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
        headline: `${label}${magStr}${tcName} — ${country || 'Région inconnue'}`,
        description,
        link,
        ...(basin ? { basin } : {}),
        ...(magnitude ? { magnitude } : {}),
        ...(tcBulletin ? { tcBulletinLabel: tcBulletin.label, tcBulletinUrl: tcBulletin.url } : {}),
      });
    }

    alerts.sort((a, b) => {
      const sev: Record<string, number> = { red: 3, orange: 2, yellow: 1 };
      if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity];
      return (b.magnitude ?? 0) - (a.magnitude ?? 0);
    });
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.error('[GDACS]', e);
  }
  return alerts;
}
// ─── VAAC — tous les 9 centres mondiaux ──────────────────────────────────────────────────────

function hasAshCloudExtent(text: string): boolean {
  const extentPatterns = [
    /([NS])\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*\s+[NS]\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*/i,
    /extent.*?[0-9.-]+\s*[NS]\s+to\s+[0-9.-]+\s*[NS]/i,
    /[NS]\d{2,3}\s*[EW]\d{2,3}\s*[-–]\s*[NS]\d{2,3}\s*[EW]\d{2,3}/i,
    /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/i,
    /within\s+[0-9.-]+\s*km\s+of/i,
    /bounded\s+by/i,
    /box\s+from/i,
    /ashCloudExtent/i,
    /(-?\d+\.?\d+\s+-?\d+\.?\d+\s+){2,}/,
  ];
  return extentPatterns.some(p => p.test(text));
}

function vaacGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

type VaacEntry = {
  name: string;
  url: string;
  format: 'atom' | 'rss' | 'cap';
};

const VAAC_FEEDS: VaacEntry[] = [
  { name: 'VAAC Toulouse',    url: 'https://vaac.meteo.fr/var/vaac/dyn/last-sigmets_en.xml',     format: 'cap'  },
  { name: 'VAAC London',      url: 'https://www.metoffice.gov.uk/aviation/vaac/vaacuk_atom.xml',  format: 'atom' },
  { name: 'VAAC Washington',  url: 'https://www.wovo.org/rss/vaac_washington.xml',               format: 'rss'  },
  { name: 'VAAC Anchorage',   url: 'https://aawu.arh.noaa.gov/rss/vaa.xml',                      format: 'rss'  },
  { name: 'VAAC Montreal',    url: 'https://www.wovo.org/rss/vaac_montreal.xml',                  format: 'rss'  },
  { name: 'VAAC Tokyo',       url: 'https://www.wovo.org/rss/vaac_tokyo.xml',                     format: 'rss'  },
  { name: 'VAAC Darwin',      url: 'https://www.bom.gov.au/aviation/volcanic-ash/vaac-darwin.xml', format: 'atom' },
  { name: 'VAAC Buenos Aires',url: 'https://www.smn.gob.ar/vaac/VAACSUD.xml',                    format: 'rss'  },
  { name: 'VAAC Pretoria',    url: 'https://www.weathersa.co.za/vaac/pretoria_vaac_feed.xml',    format: 'rss'  },
];

const VAAC_VOLCANO_OVERRIDES: Record<string, string[]> = {
  'KILAUEA':    ['PHNL', 'PHOG', 'NTAA'],
  'MAUNA LOA':  ['PHNL', 'PHOG', 'NTAA'],
  'ETNA':       ['LICC', 'LICJ', 'LIRF'],
  'STROMBOLI':  ['LICC', 'LICJ'],
  'VESUVIUS':   ['LIRN', 'LIRF'],
  'SANTORINI':  ['LGAV'],
  'MERAPI':     ['WSSS'],
  'PITON':      ['FMEE'],
};

function vaacExtractCoords(text: string): { lat: number; lon: number } | null {
  // Essaie d'extraire une paire lat/lon depuis une chaîne SIGMET/VAAC
  const patterns = [
    /([NS])(\d{2,3}(?:\.\d+)?)\s+([EW])(\d{2,3}(?:\.\d+)?)/gi,
    /([-]?\d{1,3}\.?\d*)\s+([-]?\d{1,3}\.?\d*)(?:\s+[-]?\d|$)/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) {
      if (m[1] && /[NS]/i.test(m[1])) {
        const lat = (m[1].toUpperCase() === 'S' ? -1 : 1) * parseFloat(m[2]);
        const lon = (m[3].toUpperCase() === 'W' ? -1 : 1) * parseFloat(m[4]);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
      } else {
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          return { lat, lon };
        }
      }
    }
  }
  return null;
}

function vaacExtractVolcano(text: string): string | null {
  const m = text.match(/(?:volcano|volcan|MT\.?|MOUNT)\s+([A-Z][A-Z ]{2,20})/i);
  return m ? m[1].trim().toUpperCase() : null;
}

export async function fetchVAAC(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    VAAC_FEEDS.map(async feed => {
      try {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'SkyWatch/1.0', 'Accept': 'application/xml, text/xml, */*' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const xml = await res.text();

        const items = xml.includes('<entry') ? xml.split('<entry').slice(1) : xml.split('<item>').slice(1);
        for (const item of items) {
          const title = vaacGetTag(item, 'title') || vaacGetTag(item, 'cap:headline') || '';
          const summary = vaacGetTag(item, 'summary') || vaacGetTag(item, 'description') || vaacGetTag(item, 'cap:description') || '';
          const fullText = `${title} ${summary}`;

          if (!hasAshCloudExtent(fullText)) continue;

          const pubDate = vaacGetTag(item, 'published') || vaacGetTag(item, 'pubDate') || vaacGetTag(item, 'cap:effective') || '';
          const link = vaacGetTag(item, 'id') || vaacGetTag(item, 'link') || feed.url;

          const volcanoName = vaacExtractVolcano(fullText);
          let airports: string[] = [];

          if (volcanoName && VAAC_VOLCANO_OVERRIDES[volcanoName]) {
            airports = VAAC_VOLCANO_OVERRIDES[volcanoName];
          } else {
            const coords = vaacExtractCoords(summary || title);
            if (coords) {
              airports = getAirportsNearCoordsWithOverride(coords.lat, coords.lon, 800, volcanoName);
            }
          }

          if (airports.length === 0) continue;

          const key = `VAAC|${volcanoName ?? title.slice(0, 40)}|${airports.sort().join(',')}`;
          if (seen.has(key)) continue;
          seen.add(key);

          alerts.push({
            id: `vaac-${key}`,
            source: 'VAAC',
            region: 'EUR',
            severity: 'orange',
            phenomenon: 'Cendres volcaniques',
            country: volcanoName ?? '',
            airports,
            validFrom: pubDate,
            validTo: null,
            headline: title || `Cendres volcaniques — ${feed.name}`,
            description: summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
            link,
            eventType: 'VO',
            ...(volcanoName ? { volcanoName } : {}),
          });
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error(`[VAAC] ${feed.name}:`, e?.message ?? e);
      }
    })
  );

  return alerts;
}

// ─── EMMA (Europe) ───────────────────────────────────────────────────────────────────────────

type EmmaCentroid = {
  lat: number;
  lon: number;
  countryCode: string;
};

const emmaCentroids: Record<string, EmmaCentroid> = emmaCentroidsData as Record<string, EmmaCentroid>;

const EMMA_PHENOMENON_MAP: Record<string, string> = {
  'WIND':         'Vent violent',
  'SNOW_ICE':     'Neige / Verglas',
  'THUNDERSTORM': 'Orage',
  'FOG':          'Brouillard',
  'HIGH_TEMP':    'Chaleur extrême',
  'LOW_TEMP':     'Froid extrême',
  'COASTALEVENT': 'Événement côtier',
  'FOREST_FIRE':  'Incendie',
  'AVALANCHE':    'Avalanche',
  'RAIN':         'Pluie',
  'FLOODING':     'Inondation',
};

const EMMA_SEVERITY_MAP: Record<string, Severity> = {
  'Moderate': 'yellow',
  'Severe':   'orange',
  'Extreme':  'red',
};

const EMMA_RELEVANT_PHENOMENONS = new Set(Object.keys(EMMA_PHENOMENON_MAP));
const EMMA_RELEVANT_SEVERITIES  = new Set(['Moderate', 'Severe', 'Extreme']);

export async function fetchEMMA(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-france', {
      headers: { 'User-Agent': 'SkyWatch/1.0', 'Accept': 'application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[EMMA] HTTP', res.status); return alerts; }
    const xml = await res.text();

    for (const entry of xml.split('<entry>').slice(1)) {
      const severity = vaacGetTag(entry, 'cap:severity');
      if (!EMMA_RELEVANT_SEVERITIES.has(severity)) continue;

      const phenomenon = vaacGetTag(entry, 'cap:event')?.toUpperCase().replace(/ /g, '_') ?? '';
      if (!EMMA_RELEVANT_PHENOMENONS.has(phenomenon)) continue;

      const regionCode = vaacGetTag(entry, 'cap:geocode')?.match(/<value>([^<]+)<\/value>/)?.[1] ?? '';
      const centroid = emmaCentroids[regionCode];
      if (!centroid) continue;

      // Recherche parmi les escales LC uniquement
      const airports = LC_AIRPORTS
        .filter(a => haversineKm(centroid.lat, centroid.lon, a.lat, a.lon) <= 300)
        .map(a => a.icao);
      if (airports.length === 0) continue;

      const onset    = vaacGetTag(entry, 'cap:onset')    || vaacGetTag(entry, 'updated') || '';
      const expires  = vaacGetTag(entry, 'cap:expires')  || '';
      const headline = vaacGetTag(entry, 'title')        || vaacGetTag(entry, 'cap:headline') || '';
      const desc     = vaacGetTag(entry, 'cap:description') || vaacGetTag(entry, 'summary') || '';
      const link     = vaacGetTag(entry, 'id')           || 'https://www.meteoalarm.org';
      const country  = centroid.countryCode ?? 'EUR';

      alerts.push({
        id: `emma-${regionCode}-${phenomenon}-${onset}`,
        source: 'EMMA',
        region: 'EUR',
        severity: EMMA_SEVERITY_MAP[severity] ?? 'yellow',
        phenomenon: EMMA_PHENOMENON_MAP[phenomenon] ?? phenomenon,
        country,
        airports,
        lat: centroid.lat,
        lon: centroid.lon,
        validFrom: onset,
        validTo: expires || null,
        headline,
        description: desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
        link,
      });
    }
  } catch (e) {
    console.error('[EMMA]', e);
  }
  return alerts;
}

// ─── Météo-France (vigilances) ───────────────────────────────────────────────────────────────

const MF_PHENOMENON_MAP: Record<number, string> = {
  1: 'Vent violent', 2: 'Pluie / Inondation', 3: 'Orage', 4: 'Inondation',
  5: 'Neige / Verglas', 6: 'Canicule', 7: 'Grand froid', 8: 'Avalanche', 9: 'Vagues / Submersion',
};

const MF_COLOR_SEVERITY: Record<string, Severity> = {
  green: 'yellow', yellow: 'yellow', orange: 'orange', red: 'red',
};

export async function fetchMeteoFrance(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/weatherwatchwarnings/records?limit=100&where=color_id>=2', {
      headers: { 'User-Agent': 'SkyWatch/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[MF] HTTP', res.status); return alerts; }
    const json = await res.json();

    for (const r of (json.results ?? [])) {
      const colorId = r.color_id ?? 1;
      if (colorId < 2) continue;
      const colorName = ['green','yellow','orange','red'][colorId - 1] ?? 'yellow';
      const severity = MF_COLOR_SEVERITY[colorName] ?? 'yellow';
      if (severity === 'yellow' && colorId < 3) continue;

      const lat = r.latitude  ?? r.lat ?? r.geo_point_2d?.lat;
      const lon = r.longitude ?? r.lon ?? r.geo_point_2d?.lon;
      if (lat == null || lon == null) continue;

      // Recherche parmi les escales LC uniquement
      const airports = LC_AIRPORTS
        .filter(a => haversineKm(lat, lon, a.lat, a.lon) <= 250)
        .map(a => a.icao);
      if (airports.length === 0) continue;

      const ph = MF_PHENOMENON_MAP[r.phenomenon_id] ?? `Vigilance ${colorName}`;
      const dept = r.department_name ?? r.department_code ?? '';

      alerts.push({
        id: `mf-${r.id ?? `${lat}-${lon}-${r.phenomenon_id}`}`,
        source: 'Météo-France',
        region: 'EUR',
        severity,
        phenomenon: ph,
        country: `France — ${dept}`,
        airports,
        lat,
        lon,
        validFrom: r.begin_time ?? r.validity_start ?? '',
        validTo:   r.end_time   ?? r.validity_end   ?? null,
        headline:  `Vigilance ${colorName} — ${ph} (${dept})`,
        description: r.text ?? '',
        link: 'https://vigilance.meteofrance.fr',
      });
    }
  } catch (e) {
    console.error('[MF]', e);
  }
  return alerts;
}

// ─── TFR (USA) ───────────────────────────────────────────────────────────────────────────────

export async function fetchTFR(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://tfr.faa.gov/tfr2/list.jsp', {
      headers: { 'User-Agent': 'SkyWatch/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[TFR] HTTP', res.status); return alerts; }
    const html = await res.text();

    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (cells.length < 4) continue;
      const latStr = cells.find(c => /^\d{1,2}\.\d+\s*[NS]$/.test(c.trim()));
      const lonStr = cells.find(c => /^\d{1,3}\.\d+\s*[EW]$/.test(c.trim()));
      if (!latStr || !lonStr) continue;

      const lat = parseFloat(latStr) * (latStr.trim().endsWith('S') ? -1 : 1);
      const lon = parseFloat(lonStr) * (lonStr.trim().endsWith('W') ? -1 : 1);

      const airports = getAirportsNearCoords(lat, lon, 200);
      if (airports.length === 0) continue;

      const linkMatch = rowMatch[1].match(/href="([^"]+tfr[^"]+)"/);
      const link = linkMatch ? `https://tfr.faa.gov${linkMatch[1]}` : 'https://tfr.faa.gov';

      alerts.push({
        id: `tfr-${lat}-${lon}`,
        source: 'TFR',
        region: 'AMN',
        severity: 'yellow',
        phenomenon: 'TFR — Restriction espace aérien',
        country: 'USA',
        airports,
        lat, lon,
        validFrom: '',
        validTo: null,
        headline: `TFR USA — ${airports.join(', ')}`,
        link,
      });
    }
  } catch (e) {
    console.error('[TFR]', e);
  }
  return alerts;
}

// ─── Agrégateur ──────────────────────────────────────────────────────────────────────────────

export type { Alert };

export async function fetchAllAlerts(): Promise<Alert[]> {
  const [noaa, gdacs, vaac, emma, mf] = await Promise.allSettled([
    fetchNOAA(),
    fetchGDACS(),
    fetchVAAC(),
    fetchEMMA(),
    fetchMeteoFrance(),
  ]);

  const all: Alert[] = [
    ...(noaa.status  === 'fulfilled' ? noaa.value  : []),
    ...(gdacs.status === 'fulfilled' ? gdacs.value : []),
    ...(vaac.status  === 'fulfilled' ? vaac.value  : []),
    ...(emma.status  === 'fulfilled' ? emma.value  : []),
    ...(mf.status    === 'fulfilled' ? mf.value    : []),
  ];

  // Dédoublonner par id
  const byId = new Map<string, Alert>();
  for (const a of all) byId.set(a.id, a);
  return [...byId.values()];
}
