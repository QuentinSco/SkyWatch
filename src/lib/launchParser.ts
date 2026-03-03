import type { Alert } from './geoUtils';
import { getAirportsNearCoords, regionFromCoords } from './geoUtils';

const LAUNCH_WINDOW_HOURS = 72;

const SEVERITY_BY_HOURS: { maxH: number; severity: 'red' | 'orange' | 'yellow' }[] = [
  { maxH: 12,  severity: 'red' },
  { maxH: 24,  severity: 'orange' },
  { maxH: 72,  severity: 'yellow' },
];

const LAUNCH_IMPACT_RADIUS_KM = 500;

export async function fetchRocketLaunches(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const url = new URL('https://ll.thespacedevs.com/2.2.0/launch/upcoming/');
    url.searchParams.set('limit', '20');
    // Passer chaque statut séparément — une valeur CSV serait encodée en %2C → HTTP 400
    ['1', '2', '3'].forEach(s => url.searchParams.append('status', s));

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[LaunchLib] HTTP', res.status);
      return alerts;
    }

    const json = await res.json();
    const now = Date.now();

    for (const launch of (json.results ?? [])) {
      const windowStart = new Date(launch.window_start ?? launch.net).getTime();
      const windowEnd   = new Date(launch.window_end ?? launch.net).getTime();
      const hoursUntil  = (windowStart - now) / 3_600_000;

      if (hoursUntil < 0 || hoursUntil > LAUNCH_WINDOW_HOURS) continue;

      const lat = launch.pad?.latitude  ? parseFloat(launch.pad.latitude)  : null;
      const lon = launch.pad?.longitude ? parseFloat(launch.pad.longitude) : null;
      if (lat === null || lon === null) continue;

      const airports = getAirportsNearCoords(lat, lon, LAUNCH_IMPACT_RADIUS_KM);
      if (airports.length === 0) continue;

      const severity = SEVERITY_BY_HOURS.find(s => hoursUntil <= s.maxH)?.severity ?? 'yellow';
      const provider = launch.launch_service_provider?.abbrev ?? launch.launch_service_provider?.name ?? '?';
      const rocket   = launch.rocket?.configuration?.name ?? 'Lanceur inconnu';
      const siteName = launch.pad?.name ?? launch.pad?.location?.name ?? 'Site inconnu';
      const missionName = launch.mission?.name ?? launch.name ?? 'Mission inconnue';
      const statusName   = launch.status?.name ?? '';

      alerts.push({
        id:          `LAUNCH-${launch.id}`,
        source:      'LaunchLib',
        region:      regionFromCoords(lat, lon),
        severity,
        phenomenon:  'Tir spatial / TFR',
        eventType:   'LAUNCH',
        country:     launch.pad?.location?.country_code ?? '',
        airports,
        lat, lon,
        validFrom:   new Date(windowStart).toISOString(),
        validTo:     new Date(windowEnd).toISOString(),
        headline:    `🚀 ${provider} — ${rocket} | ${siteName} | T-${Math.round(hoursUntil)}h (${statusName})`,
        description: `Mission : ${missionName}. Zone TFR active autour de ${siteName}. Vérifier NOTAMs aéroports impactés : ${airports.join(', ')}.`,
        link:        launch.url ?? 'https://thespacedevs.com',
      });
    }

    console.log(`[LaunchLib] ${alerts.length} lancement(s) impactant(s) dans les 72h`);
  } catch (e) {
    console.error('[LaunchLib]', e);
  }
  return alerts;
}
