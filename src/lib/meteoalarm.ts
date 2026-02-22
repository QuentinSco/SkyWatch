import type { WeatherAlert } from '../types/alert';
import { getAirports } from './normalize';

// Mapping pays MeteoAlarm → ISO3
const MA_TO_ISO3: Record<string, string> = {
  FR: 'FRA', DE: 'DEU', ES: 'ESP', IT: 'ITA',
  GB: 'GBR', PT: 'PRT', NL: 'NLD', BE: 'BEL',
  CH: 'CHE', AT: 'AUT', PL: 'POL', RO: 'ROU',
  HR: 'HRV', GR: 'GRC', SE: 'SWE', NO: 'NOR',
  DK: 'DNK', FI: 'FIN', CZ: 'CZE', SK: 'SVK',
  HU: 'HUN', BG: 'BGR', SI: 'SVN', RS: 'SRB',
  IE: 'IRL', LU: 'LUX',
};

// Phénomènes météo à surveiller pour l'aviation
const RELEVANT_PHENOMENA = new Set([
  'wind', 'snow/ice', 'thunderstorm', 'fog', 'rain', 'flooding',
  'avalanches', 'coastal event', 'extreme high temperature',
  'extreme low temperature', 'forest fire',
]);

function maToSeverity(level: string): 'yellow' | 'orange' | 'red' | null {
  if (level === '3') return 'red';
  if (level === '2') return 'orange';
  if (level === '1') return 'yellow';
  return null;
}

export async function fetchMeteoAlarm(countries: string[] = Object.keys(MA_TO_ISO3)): Promise<WeatherAlert[]> {
  const alerts: WeatherAlert[] = [];

  await Promise.allSettled(
    countries.map(async (cc) => {
      try {
        const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${cc.toLowerCase()}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const xml = await res.text();

        // Parser les entries Atom
        const entries = xml.split('<entry>').slice(1);
        for (const entry of entries) {
          const get = (tag: string) => {
            const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i'));
            return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
          };

          const title = get('title');
          const updated = get('updated');
          const summary = get('summary');

          // Chercher le niveau dans le titre ou le summary
          // MeteoAlarm format : "Orange Warning for wind"
          const levelMatch = title.match(/\b(Yellow|Orange|Red)\b/i);
          if (!levelMatch) continue;

          const levelStr = levelMatch[1].toLowerCase();
          let severity: 'yellow' | 'orange' | 'red' = 'yellow';
          if (levelStr === 'red') severity = 'red';
          else if (levelStr === 'orange') severity = 'orange';

          const iso3 = MA_TO_ISO3[cc] ?? cc;

          alerts.push({
            id: `MA-${cc}-${updated}`,
            source: 'MeteoAlarm',
            region: 'EUR',
            severity,
            phenomenon: title.replace(/^(Yellow|Orange|Red) Warning for /i, '') || 'Phénomène météo',
            country: cc,
            airports: getAirports(iso3),
            validFrom: updated,
            validTo: updated,
            headline: title,
          });
        }
      } catch {
        // timeout ou pays sans feed → skip silencieux
      }
    })
  );

  return alerts;
}
