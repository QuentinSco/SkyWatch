import { getAirportsNearCoords, regionFromCoords, basinFromCoords } from '/lib/normalize.js';

const PROXY = '/api/proxy?url=';
const FEED_URL = 'https://www.gdacs.org/xml/rss.xml';

const TYPE_LABELS = {
  EQ: 'Tremblement de terre',
  TC: 'Cyclone tropical',
  FL: 'Inondation',
  VO: 'Éruption volcanique',
  WF: 'Incendie',
  TS: 'Tsunami',
};

const IMPACT_RADIUS = {
  EQ: 500,
  TC: 800,
  FL: 300,
  VO: 400,
  WF: 300,
  TS: 1000,
};

const RELEVANT_TYPES = new Set(['EQ', 'TC', 'FL', 'VO', 'WF', 'TS']);

function levelToSeverity(level) {
  if (level >= 3) return 'red';
  if (level === 2) return 'orange';
  return 'yellow';
}

function getTag(item, tag) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function parseGdacsLevel(item) {
  const raw = getTag(item, 'gdacs:alertlevel').toLowerCase();
  if (raw === 'red')    return 3;
  if (raw === 'orange') return 2;
  return 1;
}

function parseCoords(item) {
  // Priorité 1 : geo:lat / geo:long
  const geoLat = getTag(item, 'geo:lat');
  const geoLon = getTag(item, 'geo:long');
  if (geoLat && geoLon) {
    return { lat: parseFloat(geoLat), lon: parseFloat(geoLon) };
  }

  // Priorité 2 : georss:point
  const point = getTag(item, 'georss:point');
  if (point) {
    const parts = point.trim().split(/\s+/);
    if (parts.length === 2) {
      return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
    }
  }

  // Priorité 3 : regex dans description
  const desc = getTag(item, 'description');
  const latM = desc.match(/[Ll]at(?:itude)?[:\s]+(-?\d+\.?\d*)/);
  const lonM = desc.match(/[Ll]on(?:gitude)?[:\s]+(-?\d+\.?\d*)/);
  if (latM && lonM) {
    return { lat: parseFloat(latM[1]), lon: parseFloat(lonM[1]) };
  }

  return null;
}

function parseEventType(item) {
  const et = getTag(item, 'gdacs:eventtype').toUpperCase();
  if (RELEVANT_TYPES.has(et)) return et;

  const title = getTag(item, 'title').toLowerCase();
  if (title.includes('earthquake'))                                              return 'EQ';
  if (title.includes('tropical') || title.includes('cyclone') ||
      title.includes('typhoon')  || title.includes('hurricane'))                return 'TC';
  if (title.includes('flood'))                                                   return 'FL';
  if (title.includes('volcano'))                                                 return 'VO';
  if (title.includes('wildfire') || title.includes('fire'))                     return 'WF';
  if (title.includes('tsunami'))                                                 return 'TS';
  return null;
}

export async function fetchGDACS() {
  const alerts = [];
  try {
    const url = PROXY + encodeURIComponent(FEED_URL);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/xml, text/xml, */*' },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    for (const item of xml.split('<item>').slice(1)) {
      const eventType = parseEventType(item);
      if (!eventType) continue;

      const level = parseGdacsLevel(item);

      const severityRaw = getTag(item, 'gdacs:severity');
      const windMatch = severityRaw.match(/(\d+(?:\.\d+)?)\s*km\/h/i);
      const windKmh = windMatch ? parseFloat(windMatch[1]) : null;

      const isTcByWind = eventType === 'TC' && windKmh !== null && windKmh >= 120;
      if (level < 2 && !isTcByWind) continue;

      let severity;
      if (level >= 3) severity = 'red';
      else if (level === 2) severity = 'orange';
      else if (windKmh !== null && windKmh >= 180) severity = 'red';
      else severity = 'orange';

      const coords = parseCoords(item);
      if (!coords) continue;

      const { lat, lon } = coords;

      const title       = getTag(item, 'title');
      const description = getTag(item, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const pubDate     = getTag(item, 'pubDate');
      const link        = getTag(item, 'link') || 'https://www.gdacs.org';
      const country     = getTag(item, 'gdacs:country') || getTag(item, 'gdacs:eventname') || '';
      const magRaw      = getTag(item, 'gdacs:magnitude');
      const magnitude   = magRaw ? parseFloat(magRaw) : windKmh;
      const eventId     = getTag(item, 'gdacs:eventid') || `${eventType}-${lat}-${lon}`;

      const radius   = IMPACT_RADIUS[eventType] ?? 400;
      const airports = getAirportsNearCoords(lat, lon, radius);
      const region   = regionFromCoords(lat, lon);
      const basin    = eventType === 'TC' ? basinFromCoords(lat, lon) : null;

      const label  = TYPE_LABELS[eventType] ?? 'Événement';
      const magStr = magnitude ? ` ${windKmh ? windKmh + ' km/h' : 'M' + magnitude}` : '';

      alerts.push({
        id:          `gdacs-${eventId}`,
        source:      'GDACS',
        region,
        severity,
        phenomenon:  label,
        eventType,
        country,
        airports,
        lat,
        lon,
        validFrom:   pubDate,
        validTo:     null,
        headline:    `${label}${magStr} — ${country || 'Région inconnue'} ▲`,
        description,
        link,
        ...(basin     ? { basin }     : {}),
        ...(magnitude ? { magnitude } : {}),
      });
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.error('[GDACS]', e);
  }

  alerts.sort((a, b) => {
    const sev = { red: 3, orange: 2, yellow: 1 };
    if (sev[b.severity] !== sev[a.severity]) return sev[b.severity] - sev[a.severity];
    return (b.magnitude ?? 0) - (a.magnitude ?? 0);
  });

  return alerts;
}
