import { getAirports } from './normalize.js';

const MA_ISO3 = {
  FR:'FRA',DE:'DEU',ES:'ESP',IT:'ITA',GB:'GBR',PT:'PRT',NL:'NLD',BE:'BEL',
  CH:'CHE',AT:'AUT',PL:'POL',RO:'ROU',HR:'HRV',GR:'GRC',SE:'SWE',NO:'NOR',
  DK:'DNK',FI:'FIN',CZ:'CZE',SK:'SVK',HU:'HUN',BG:'BGR',SI:'SVN',RS:'SRB',
  IE:'IRL',LU:'LUX',
};

export async function fetchMeteoAlarm() {
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
