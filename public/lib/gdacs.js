import {
  getRegion, getAirports, levelToSeverity, parseSubject,
  regionFromCoords, airportsFromCoords, basinFromCoords, getText,
} from './normalize.js';

const PHENOMENON_MAP = {
  TC:'Cyclone Tropical', FL:'Inondation', EQ:'Séisme',
  WF:'Feux de forêt', VO:'Volcan', DR:'Sécheresse',
};

export async function fetchGDACS() {
  const alerts = [];
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://www.gdacs.org/xml/rss.xml')}`);
console.log('[GDACS] status:', res.status);
console.log('[GDACS] content-type:', res.headers.get('content-type'));
const xml = await res.text();
console.log('[GDACS] length:', xml.length);
console.log('[GDACS] first 300 chars:', xml.slice(0, 300));

    for (const item of xml.split('<item>').slice(1)) {
      const clean = item.split('<gdacs:resources>')[0];
      const get = (tag) => getText(clean, tag);

      if (get('iscurrent') === 'false') continue;

      const parsed = parseSubject(get('subject') || '');
      if (!parsed) continue;
      const { type, level } = parsed;

      if (type === 'WF' && level === 1) continue;
      if (type === 'FL' && level === 1) continue;
      if (type === 'DR' && level === 1) continue;
      if (type === 'EQ' && level === 1) {
        const m = clean.match(/Magnitude\s*([\d.]+)/i);
        if (!m || parseFloat(m[1]) < 6.0) continue;
      }

      const iso3     = get('iso3')    || '';
      const country  = get('country') || '';
      const headline = get('title')   || '';
      const pubDate  = get('pubDate') || '';
      const link     = get('link')    || '';
      const georss   = get('georss:point') || '';
      const lat = parseFloat(get('geo:lat') || georss.split(' ')[0] || '0');
      const lon = parseFloat(get('geo:long')|| georss.split(' ')[1] || '0');

      let severity = levelToSeverity(level);
      if (type === 'TC' && level === 1) {
        const wm = clean.match(/maximum wind speed of ([\d.]+)\s*km\/h/i);
        if (wm && parseFloat(wm[1]) >= 150) severity = 'orange';
      }

      alerts.push({
        id:        `GDACS-${link.split('eventid=')[1] ?? Math.random()}`,
        source:    'GDACS',
        region:    iso3 ? getRegion(iso3)   : (lat||lon) ? regionFromCoords(lat,lon)   : 'ASIE',
        severity,
        phenomenon: PHENOMENON_MAP[type] ?? type,
        country:   country || iso3 || basinFromCoords(lat, lon),
        airports:  iso3 ? getAirports(iso3) : (lat||lon) ? airportsFromCoords(lat,lon) : [],
        validFrom: get('fromdate') || pubDate,
        validTo:   get('todate')   || pubDate,
        headline,
      });
    }
  } catch(e) { console.error('[GDACS]', e); }
  return alerts;
}
