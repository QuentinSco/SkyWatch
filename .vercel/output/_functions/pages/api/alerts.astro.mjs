export { renderers } from '../../renderers.mjs';

const COUNTRY_REGION = {
  USA:'AMN', CAN:'AMN', MEX:'AMN',
  BRA:'AMS', ARG:'AMS', PER:'AMS', VEN:'AMS', COL:'AMS', CHL:'AMS', BOL:'AMS', ECU:'AMS', URY:'AMS', PRY:'AMS',
  GLP:'AMO', MTQ:'AMO', GUF:'AMO', HTI:'AMO', CUB:'AMO', DOM:'AMO', JAM:'AMO',
  FRA:'EUR', DEU:'EUR', ESP:'EUR', ITA:'EUR', GBR:'EUR', PRT:'EUR', NLD:'EUR', BEL:'EUR',
  CHE:'EUR', AUT:'EUR', POL:'EUR', ROU:'EUR', HRV:'EUR', MNE:'EUR', MKD:'EUR', UKR:'EUR', RUS:'EUR',
  CHN:'ASIE', JPN:'ASIE', IND:'ASIE', IDN:'ASIE', THA:'ASIE', VNM:'ASIE', KOR:'ASIE', PHL:'ASIE',
  AUS:'ASIE', NZL:'ASIE', MDG:'ASIE', REU:'ASIE', MUS:'ASIE', MYT:'ASIE',
  KEN:'ASIE', SEN:'ASIE', CMR:'ASIE', NGA:'ASIE', CIV:'ASIE', ETH:'ASIE', ZAF:'ASIE', MOZ:'ASIE',
  AFG:'ASIE', KAZ:'ASIE', UZB:'ASIE', TKM:'ASIE',
};

const AF_AIRPORTS = {
  USA:['KJFK','KLAX','KORD','KIAD','KMIA','KBOS','KSFO'],
  CAN:['CYYZ','CYVR','CYMX'], MEX:['MMMX'],
  BRA:['SBGR','SBRJ','SBBE'], ARG:['SAEZ'], VEN:['SVMI'], PER:['SPJC'],
  GLP:['TFFR'], MTQ:['TFFF'], GUF:['SOCA'], HTI:['MTPP'],
  FRA:['LFPG','LFPO','LFLL','LFLY','LFMN','LFRS'],
  DEU:['EDDF','EDDM','EDDB'], ESP:['LEMD','LEBL'], ITA:['LIRF','LIML'],
  GBR:['EGLL','EGKK'], PRT:['LPPT'],
  CHN:['ZBAA','ZSPD','ZGGG'], JPN:['RJTT','RJAA'], IND:['VIDP','VABB'],
  IDN:['WIII','WADD'], AUS:['YSSY','YMML'], NZL:['NZAA'],
  KEN:['HKJK'], SEN:['GOBD'], CMR:['FKYS'], MOZ:['FQMA'],
  REU:['FMEE'], MUS:['FIMP'], MDG:['FMMI'],
};

function getRegion(iso3) { return COUNTRY_REGION[iso3] ?? 'ASIE'; }
function getAirports(iso3) { return AF_AIRPORTS[iso3] ?? []; }

function levelToSeverity(level) {
  if (level >= 3) return 'red';
  if (level === 2) return 'orange';
  return 'yellow';
}

function noaaSeverity(event) {
  const e = event.toLowerCase();
  if (e.includes('warning')) return 'red';
  if (e.includes('watch'))   return 'orange';
  return 'yellow';
}

function parseSubject(subject) {
  const m = subject.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { type: m[1], level: parseInt(m[2], 10) };
}

function regionFromCoords(lat, lon) {
  if (lat < 0  && lon > 40  && lon < 100)               return 'ASIE';
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'AMO';
  if (lat > 20 && lon > -170 && lon < -50)               return 'AMN';
  if (lat < 20 && lat > -60 && lon > -85  && lon < -30) return 'AMS';
  if (lat > 35 && lat < 72  && lon > -15  && lon < 45)  return 'EUR';
  return 'ASIE';
}

function airportsFromCoords(lat, lon) {
  if (lat < 0 && lon > 40  && lon < 100)                return ['FMEE','FIMP','FMMI','FMCH'];
  if (lat > 0 && lat < 35  && lon > -100 && lon < -50)  return ['TFFR','TFFF','SOCA','KMIA'];
  if (lon > 100 && lon < 180 && lat > 0  && lat < 40)   return ['RJTT','WIII','RPLL','VHHH'];
  if (lat < 0 && lon > 150)                              return ['YSSY','NZAA'];
  return [];
}

function basinFromCoords(lat, lon) {
  if (lat < 0  && lon > 40  && lon < 100)               return 'Océan Indien SW';
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'Caraïbes';
  if (lon > 100 && lon < 180 && lat > 0  && lat < 40)   return 'Pacifique Ouest';
  if (lat < 0  && lon > 150)                             return 'Pacifique Sud';
  return 'Océan tropical';
}

function getText(xml, tag) {
  const patterns = [
    new RegExp(`<gdacs:${tag}[^>]*>([\\s\\S]*?)<\\/gdacs:${tag}>`, 'i'),
    new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)<\\/dc:${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return '';
}

const PHENOMENON_MAP = {
  TC:'Cyclone Tropical', FL:'Inondation', EQ:'Séisme',
  WF:'Feux de forêt', VO:'Volcan', DR:'Sécheresse',
};

async function fetchGDACS() {
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

const RELEVANT_EVENTS = new Set([
  'Blizzard Warning','Winter Storm Warning','Winter Storm Watch',
  'Ice Storm Warning','Heavy Snow Warning','High Wind Warning','High Wind Watch',
  'Hurricane Warning','Hurricane Watch','Tropical Storm Warning','Tropical Storm Watch',
  'Tornado Warning','Tornado Watch','Dense Fog Advisory','Freezing Fog Advisory',
  'Extreme Cold Warning','Wind Chill Warning','Dust Storm Warning',
  'Flood Warning','Coastal Flood Warning',
]);

const STATE_AIRPORTS = [
  ['New York','KJFK'],['New Jersey','KEWR'],['Massachusetts','KBOS'],
  ['Illinois','KORD'],['California','KLAX'],['Florida','KMIA'],
  ['Texas','KIAH'],['Virginia','KIAD'],['Georgia','KATL'],
  ['Washington','KSEA'],['Colorado','KDEN'],['Minnesota','KMSP'],
  ['Nevada','KLAS'],['Arizona','KPHX'],['Michigan','KDTW'],
  ['Pennsylvania','KPHL'],['North Carolina','KCLT'],['Oregon','KPDX'],
  ['Utah','KSLC'],['Louisiana','KMSY'],['Maryland','KBWI'],
  ['Ohio','KCMH'],['Alaska','PANC'],['Hawaii','PHNL'],
];

async function fetchNOAA() {
  const alerts = [];
  try {
    const res = await fetch(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update',
      { headers: { 'User-Agent':'SkyWatch/0.1', 'Accept':'application/geo+json' } }
    );
    const json = await res.json();
    const raw = [];

    for (const f of (json.features ?? [])) {
      const p = f.properties;
      if (!RELEVANT_EVENTS.has(p.event)) continue;
      raw.push({
        id:        `NOAA-${p.id}`,
        source:    'NOAA',
        region:    'AMN',
        severity:  noaaSeverity(p.event),
        phenomenon: p.event,
        country:   'United States',
        airports:  STATE_AIRPORTS.filter(([s]) => (p.areaDesc||'').includes(s)).map(([,i]) => i),
        validFrom: p.onset || p.effective || '',
        validTo:   p.expires || '',
        headline:  p.headline || p.event,
      });
    }

    // Déduplication par phénomène + aéroports
    const seen = new Map();
    for (const a of raw) {
      const key = `${a.phenomenon}-${[...a.airports].sort().join(',')}`;
      if (!seen.has(key)) { seen.set(key, a); }
      else {
        const ex = seen.get(key);
        seen.set(key, { ...ex, airports: [...new Set([...ex.airports, ...a.airports])] });
      }
    }
    alerts.push(...seen.values());
  } catch(e) { console.error('[NOAA]', e); }
  return alerts;
}

const MA_ISO3 = {
  FR:'FRA',DE:'DEU',ES:'ESP',IT:'ITA',GB:'GBR',PT:'PRT',NL:'NLD',BE:'BEL',
  CH:'CHE',AT:'AUT',PL:'POL',RO:'ROU',HR:'HRV',GR:'GRC',SE:'SWE',NO:'NOR',
  DK:'DNK',FI:'FIN',CZ:'CZE',SK:'SVK',HU:'HUN',BG:'BGR',SI:'SVN',RS:'SRB',
  IE:'IRL',LU:'LUX',
};

async function fetchMeteoAlarm() {
  const alerts = [];
  await Promise.allSettled(Object.keys(MA_ISO3).map(async (cc) => {
    try {
      const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${cc.toLowerCase()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const xml = await res.text();

      for (const entry of xml.split('<entry>').slice(1)) {
        const get = (tag) => {
          const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim() : '';
        };
        const title = get('title');
        const lm = title.match(/\b(Yellow|Orange|Red)\b/i);
        if (!lm) continue;
        const sl = lm[1].toLowerCase();
        const iso3 = MA_ISO3[cc];
        alerts.push({
          id:        `MA-${cc}-${get('updated')}`,
          source:    'MeteoAlarm',
          region:    'EUR',
          severity:  sl==='red'?'red':sl==='orange'?'orange':'yellow',
          phenomenon: title.replace(/^(Yellow|Orange|Red)\s+Warning\s+for\s+/i,'') || 'Phénomène météo',
          country:   cc,
          airports:  getAirports(iso3),
          validFrom: get('updated'),
          validTo:   get('updated'),
          headline:  title,
        });
      }
    } catch {}
  }));
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
