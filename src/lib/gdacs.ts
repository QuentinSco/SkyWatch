import type { WeatherAlert, Region } from '../types/alert';
import { getRegion, getAirports } from './normalize';
import { proxied } from './proxy';

const PHENOMENON_MAP: Record<string, string> = {
  TC: 'Cyclone Tropical',
  FL: 'Inondation',
  EQ: 'Séisme',
  WF: 'Feux de forêt',
  VO: 'Volcan',
  DR: 'Sécheresse',
};

function parseSubject(subject: string): { type: string; level: number } | null {
  const m = subject.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { type: m[1], level: parseInt(m[2], 10) };
}

function levelToSeverity(level: number): 'yellow' | 'orange' | 'red' {
  if (level >= 3) return 'red';
  if (level === 2) return 'orange';
  return 'yellow';
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function fetchGDACS(): Promise<WeatherAlert[]> {
  const [rssResult, tcResult] = await Promise.allSettled([
    fetchGDACSRSS(),
    fetchGDACSTropicalCyclones(),
  ]);

  const all: WeatherAlert[] = [
    ...(rssResult.status === 'fulfilled' ? rssResult.value : []),
    ...(tcResult.status  === 'fulfilled' ? tcResult.value  : []),
  ];

  const seen = new Set<string>();
  return all.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

// ─── Feed RSS général ─────────────────────────────────────────────────────────

async function fetchGDACSRSS(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(proxied('https://www.gdacs.org/xml/rss.xml'), {
      headers: { 'User-Agent': 'SkyWatch/0.1 dispatch-tool' },
    });
    const xml = await res.text();
    const items = xml.split('<item>').slice(1);
    const alerts: WeatherAlert[] = [];

    for (const item of items) {
      const cleanItem = item.split('<gdacs:resources>')[0];

      const get = (tag: string) => {
        const patterns = [
          new RegExp(`<gdacs:${tag}[^>]*>([\\s\\S]*?)<\\/gdacs:${tag}>`, 'i'),
          new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
        ];
        for (const p of patterns) {
          const m = cleanItem.match(p);
          if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        }
        return '';
      };

      // Exclure les événements non courants
      const isCurrent = get('iscurrent');
      if (isCurrent === 'false') continue;

      const subject = get('dc:subject') || get('subject') || '';
      const parsed  = parseSubject(subject);
      if (!parsed) continue;

      const { type, level } = parsed;

      if (type === 'WF' && level === 1) continue;
      if (type === 'DR' && level === 1) continue;

      const iso3     = get('iso3')     || '';
      const country  = get('country')  || '';
      const headline = get('title')    || '';
      const pubDate  = get('pubDate')  || '';
      const link     = get('link')     || '';

      const georssPoint = get('georss:point') || '';
      const lat = parseFloat(get('geo:lat') || georssPoint.split(' ')[0] || '0');
      const lon = parseFloat(get('geo:long')|| georssPoint.split(' ')[1] || '0');

      let severity = levelToSeverity(level);

      if (type === 'TC' && level === 1) {
        const windMatch = cleanItem.match(/maximum wind speed of ([\d.]+)\s*km\/h/i);
        const windSpeed = windMatch ? parseFloat(windMatch[1]) : 0;
        if (windSpeed >= 150) severity = 'orange';
      }

      const region = iso3
        ? getRegion(iso3)
        : (lat !== 0 || lon !== 0)
          ? regionFromCoords(lat, lon)
          : inferRegionFromHeadline(headline);

      const airports = iso3
        ? getAirports(iso3)
        : (lat !== 0 || lon !== 0)
          ? airportsFromCoords(lat, lon)
          : inferAirportsFromHeadline(headline);

      const resolvedCountry = country || iso3 || basinFromCoords(lat, lon);

      alerts.push({
        id: `GDACS-RSS-${link.split('eventid=')[1] ?? Math.random()}`,
        source: 'GDACS',
        region,
        severity,
        phenomenon: PHENOMENON_MAP[type] ?? type,
        country: resolvedCountry,
        airports,
        validFrom: get('fromdate') || pubDate,
        validTo:   get('todate')   || pubDate,
        headline,
      });
    }

    return alerts;
  } catch (e) {
    console.error('[GDACS-RSS] fetch error:', e);
    return [];
  }
}

// ─── Feed cyclones tropicaux dédié ────────────────────────────────────────────

async function fetchGDACSTropicalCyclones(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(proxied('https://www.gdacs.org/xml/tc.xml'), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split('<item>').slice(1);
    const alerts: WeatherAlert[] = [];

    for (const item of items) {
      const cleanItem = item.split('<gdacs:resources>')[0];

      const get = (tag: string) => {
        const patterns = [
          new RegExp(`<gdacs:${tag}[^>]*>([\\s\\S]*?)<\\/gdacs:${tag}>`, 'i'),
          new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
        ];
        for (const p of patterns) {
          const m = cleanItem.match(p);
          if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
        }
        return '';
      };

      // Exclure les événements non courants
      const isCurrent = get('iscurrent');
      if (isCurrent === 'false') continue;

      const subject = get('dc:subject') || get('subject') || '';
      const parsed  = parseSubject(subject);
      const level   = parsed?.level ?? 1;

      const iso3     = get('iso3')     || '';
      const country  = get('country')  || '';
      const headline = get('title')    || '';
      const pubDate  = get('pubDate')  || '';
      const eventId  = get('eventid')  || String(Math.random());

      const georssPoint = get('georss:point') || '';
      const lat = parseFloat(get('geo:lat') || georssPoint.split(' ')[0] || '0');
      const lon = parseFloat(get('geo:long')|| georssPoint.split(' ')[1] || '0');

      let severity = levelToSeverity(level);

      if (level === 1) {
        const windMatch = cleanItem.match(/maximum wind speed of ([\d.]+)\s*km\/h/i);
        const windSpeed = windMatch ? parseFloat(windMatch[1]) : 0;
        if (windSpeed >= 150) severity = 'orange';
      }

      const region = iso3
        ? getRegion(iso3)
        : (lat !== 0 || lon !== 0)
          ? regionFromCoords(lat, lon)
          : 'ASIE';

      const airports = iso3
        ? getAirports(iso3)
        : (lat !== 0 || lon !== 0)
          ? airportsFromCoords(lat, lon)
          : [];

      const resolvedCountry = country || iso3 || basinFromCoords(lat, lon);

      alerts.push({
        id: `GDACS-TC-${eventId}-${pubDate}`,
        source: 'GDACS',
        region,
        severity,
        phenomenon: 'Cyclone Tropical',
        country: resolvedCountry,
        airports,
        validFrom: get('fromdate') || pubDate,
        validTo:   get('todate')   || pubDate,
        headline,
      });
    }

    return alerts;
  } catch (e) {
    console.error('[GDACS-TC] fetch error:', e);
    return [];
  }
}

// ─── Helpers géographiques ────────────────────────────────────────────────────

function regionFromCoords(lat: number, lon: number): Region {
  if (lat < 0  && lon > 40  && lon < 100)               return 'ASIE'; // Océan Indien SW
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'AMO';  // Caraïbes
  if (lat > 20 && lon > -170 && lon < -50)               return 'AMN';  // Amérique du Nord
  if (lat < 20 && lat > -60 && lon > -85  && lon < -30) return 'AMS';  // Amérique du Sud
  if (lat > 35 && lat < 72  && lon > -15  && lon < 45)  return 'EUR';  // Europe
  return 'ASIE';
}

function airportsFromCoords(lat: number, lon: number): string[] {
  if (lat < 0 && lon > 40 && lon < 100) {
    return ['FMEE', 'FIMP', 'FMMI', 'FMCH'];
  }
  if (lat > 0 && lat < 35 && lon > -100 && lon < -50) {
    return ['TFFR', 'TFFF', 'SOCA', 'KMIA'];
  }
  if (lon > 100 && lon < 180 && lat > 0 && lat < 40) {
    return ['RJTT', 'WIII', 'RPLL', 'VHHH'];
  }
  if (lat < 0 && lon > 150) {
    return ['YSSY', 'NZAA'];
  }
  return [];
}

function basinFromCoords(lat: number, lon: number): string {
  if (lat < 0  && lon > 40  && lon < 100)               return 'Océan Indien SW';
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'Caraïbes';
  if (lon > 100 && lon < 180 && lat > 0  && lat < 40)   return 'Pacifique Ouest';
  if (lat < 0  && lon > 150)                             return 'Pacifique Sud';
  if (lat > 20 && lon > -170 && lon < -50)               return 'Atlantique Nord';
  return 'Océan tropical';
}

function inferRegionFromHeadline(headline: string): Region {
  const h = headline.toUpperCase();
  if (h.includes('ATLANTIC') || h.includes('CARIBBEAN') || h.includes('GULF')) return 'AMO';
  if (h.includes('EAST PACIFIC')) return 'AMN';
  if (h.includes('WEST PACIFIC') || h.includes('SOUTH CHINA SEA')) return 'ASIE';
  return 'ASIE';
}

function inferAirportsFromHeadline(headline: string): string[] {
  const h = headline.toUpperCase();
  if (h.includes('SWINDIAN') || h.includes('SW INDIAN') || h.includes('INDIAN')) {
    return ['FMEE', 'FIMP', 'FMMI', 'FMCH'];
  }
  if (h.includes('ATLANTIC') || h.includes('CARIBBEAN') || h.includes('GULF')) {
    return ['TFFR', 'TFFF', 'SOCA', 'KMIA'];
  }
  if (h.includes('PACIFIC') || h.includes('TYPHOON')) {
    return ['RJTT', 'WIII', 'RPLL', 'VHHH'];
  }
  return [];
}
