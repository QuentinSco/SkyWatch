import type { WeatherAlert } from '../types/alert';
import { noaaSeverity } from './normalize';
import { proxied } from './proxy';

const RELEVANT_EVENTS = new Set([
  'Blizzard Warning', 'Winter Storm Warning', 'Winter Storm Watch',
  'Ice Storm Warning', 'Heavy Snow Warning', 'High Wind Warning',
  'High Wind Watch', 'Hurricane Warning', 'Hurricane Watch',
  'Tropical Storm Warning', 'Tropical Storm Watch',
  'Tornado Warning', 'Tornado Watch',
  'Dense Fog Advisory', 'Freezing Fog Advisory',
  'Extreme Cold Warning', 'Wind Chill Warning',
  'Dust Storm Warning', 'Blowing Dust Advisory',
  'Flood Warning', 'Coastal Flood Warning',
]);

export async function fetchNOAA(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(
      proxied('https://api.weather.gov/alerts/active?status=actual&message_type=alert,update'),
      {
        headers: {
          'User-Agent': 'SkyWatch/0.1 (dispatch-tool)',
          'Accept': 'application/geo+json',
        },
      }
    );
    const json = await res.json();
    const features = json.features ?? [];

    const rawAlerts: WeatherAlert[] = [];

    for (const f of features) {
      const props = f.properties;
      const event: string = props.event ?? '';

      if (!RELEVANT_EVENTS.has(event)) continue;

      const severity = noaaSeverity(event);
      const areaDesc: string = props.areaDesc ?? '';
      const airports = inferAirportsFromArea(areaDesc);

      rawAlerts.push({
        id: `NOAA-${props.id}`,
        source: 'NOAA',
        region: 'AMN',
        severity,
        phenomenon: event,
        country: 'United States',
        airports,
        validFrom: props.onset ?? props.effective ?? '',
        validTo:   props.expires ?? '',
        headline:  props.headline ?? `${event} – ${areaDesc.slice(0, 80)}`,
      });
    }

    // Déduplication : un seul enregistrement par (phénomène + aéroports)
    const seen = new Map<string, WeatherAlert>();

    for (const alert of rawAlerts) {
      const key = `${alert.phenomenon}-${[...alert.airports].sort().join(',')}`;
      if (!seen.has(key)) {
        seen.set(key, alert);
      } else {
        const existing = seen.get(key)!;
        const merged = [...new Set([...existing.airports, ...alert.airports])];
        seen.set(key, { ...existing, airports: merged });
      }
    }

    return [...seen.values()];
  } catch (e) {
    console.error('[NOAA] fetch error:', e);
    return [];
  }
}

function inferAirportsFromArea(areaDesc: string): string[] {
  const airports: string[] = [];
  const checks: [string, string][] = [
    ['New York',       'KJFK'],
    ['New Jersey',     'KEWR'],
    ['Massachusetts',  'KBOS'],
    ['Illinois',       'KORD'],
    ['California',     'KLAX'],
    ['Florida',        'KMIA'],
    ['Texas',          'KIAH'],
    ['Virginia',       'KIAD'],
    ['Georgia',        'KATL'],
    ['Washington',     'KSEA'],
    ['Colorado',       'KDEN'],
    ['Minnesota',      'KMSP'],
    ['Nevada',         'KLAS'],
    ['Arizona',        'KPHX'],
    ['Michigan',       'KDTW'],
    ['Pennsylvania',   'KPHL'],
    ['North Carolina', 'KCLT'],
    ['Oregon',         'KPDX'],
    ['Utah',           'KSLC'],
    ['Missouri',       'KSTL'],
    ['Tennessee',      'KBNA'],
    ['Louisiana',      'KMSY'],
    ['Maryland',       'KBWI'],
    ['Indiana',        'KIND'],
    ['Wisconsin',      'KMKE'],
    ['Ohio',           'KCMH'],
    ['Alaska',         'PANC'],
    ['Hawaii',         'PHNL'],
  ];

  for (const [state, icao] of checks) {
    if (areaDesc.includes(state)) airports.push(icao);
  }

  return airports;
}
