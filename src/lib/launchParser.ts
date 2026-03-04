import type { Alert } from './geoUtils';
import { getAirportsNearCoords, regionFromCoords } from './geoUtils';

const LAUNCH_WINDOW_HOURS = 72;

const SEVERITY_BY_HOURS: { maxH: number; severity: 'red' | 'orange' | 'yellow' }[] = [
  { maxH: 12,  severity: 'red' },
  { maxH: 24,  severity: 'orange' },
  { maxH: 72,  severity: 'yellow' },
];

const LAUNCH_IMPACT_RADIUS_KM = 500;

const EXCLUDE_STATUS_IDS = new Set([4, 7]);
const BACKUP_STATUS_IDS  = new Set([2, 8]);

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const m = url.replace(/\/$/, '').match(/\/([^\/]+)$/);
  return m ? m[1] : '';
}

function nextrocketUrl(launch: any): string {
  const slug = slugFromUrl(launch.url);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (slug && !isUuid) return `https://nextrocket.space/launch/${slug}`;
  return '';
}

export async function fetchRocketLaunches(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const url = new URL('https://ll.thespacedevs.com/2.2.0/launch/upcoming/');
    url.searchParams.set('limit', '50');
    url.searchParams.set('ordering', 'window_start');

    console.log('[LaunchLib] Requête:', url.toString());

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[LaunchLib] HTTP', res.status, await res.text().catch(() => ''));
      return alerts;
    }

    const json = await res.json();
    const now = Date.now();
    console.log(`[LaunchLib] ${json.count ?? '?'} lancements dispo, ${json.results?.length ?? 0} reçus`);

    for (const launch of (json.results ?? [])) {
      const statusId = launch.status?.id;

      const windowStart = new Date(launch.window_start ?? launch.net).getTime();
      const windowEnd   = new Date(launch.window_end   ?? launch.net).getTime();
      const hoursUntil  = (windowStart - now) / 3_600_000;

      const isBackup = BACKUP_STATUS_IDS.has(statusId);

      if (EXCLUDE_STATUS_IDS.has(statusId)) continue;
      if (hoursUntil < 0 || hoursUntil > LAUNCH_WINDOW_HOURS) continue;

      const lat = launch.pad?.latitude  ? parseFloat(launch.pad.latitude)  : null;
      const lon = launch.pad?.longitude ? parseFloat(launch.pad.longitude) : null;
      if (lat === null || lon === null) continue;

      const airports = getAirportsNearCoords(lat, lon, LAUNCH_IMPACT_RADIUS_KM);
      if (airports.length === 0) continue;

      const severity = isBackup
        ? 'yellow'
        : (SEVERITY_BY_HOURS.find(s => hoursUntil <= s.maxH)?.severity ?? 'yellow');

      const provider    = launch.launch_service_provider?.abbrev ?? launch.launch_service_provider?.name ?? '?';
      const rocket      = launch.rocket?.configuration?.name ?? 'Lanceur inconnu';
      const siteName    = launch.pad?.name ?? launch.pad?.location?.name ?? 'Site inconnu';
      const missionName = launch.mission?.name ?? launch.name ?? 'Mission inconnue';

      // Lien site officiel du provider (plus lisible que la fiche LL2)
      const providerInfoUrl: string = launch.launch_service_provider?.info_url ?? '';
      const providerName: string    = launch.launch_service_provider?.name ?? provider;

      // Dernière mise à jour LL2 : updates[0] (le plus récent)
      const lastUpdate = Array.isArray(launch.updates) && launch.updates.length > 0
        ? launch.updates[0]
        : null;
      const lastUpdateUrl: string     = lastUpdate?.info_url  ?? '';
      const lastUpdateComment: string = lastUpdate?.comment   ?? '';

      const nrUrl = nextrocketUrl(launch);

      const sourceLinks: { label: string; url: string }[] = [];
      if (providerInfoUrl) sourceLinks.push({ label: providerName, url: providerInfoUrl });
      if (nrUrl)           sourceLinks.push({ label: 'NextRocket.space', url: nrUrl });
      if (lastUpdateUrl)   sourceLinks.push({ label: lastUpdateComment ? `MàJ : ${lastUpdateComment.slice(0, 40)}` : 'Dernière MàJ', url: lastUpdateUrl });
      // Fallback : si aucun lien utile, on garde la fiche LL2
      if (sourceLinks.length === 0) {
        const launchDetailUrl = launch.url ?? `https://ll.thespacedevs.com/2.2.0/launch/${launch.id}/`;
        sourceLinks.push({ label: 'Fiche LL2', url: launchDetailUrl });
      }

      const launchDetailUrl = launch.url ?? `https://ll.thespacedevs.com/2.2.0/launch/${launch.id}/`;
      const backupSuffix = isBackup ? ' | Tir de secours (TBD)' : ' | Tir prévu';

      console.log(`  ↳ ALERTE ${severity.toUpperCase()}${isBackup ? ' [BACKUP]' : ''} — aéroports impactés : ${airports.join(', ')}`);

      alerts.push({
        id:          `LAUNCH-${launch.id}`,
        source:      'LaunchLib',
        region:      regionFromCoords(lat, lon),
        severity,
        phenomenon:  'Tir spatial',
        eventType:   isBackup ? 'LAUNCH_BACKUP' : 'LAUNCH',
        country:     launch.pad?.location?.country_code ?? '',
        airports,
        lat, lon,
        validFrom:   new Date(windowStart).toISOString(),
        validTo:     new Date(windowEnd).toISOString(),
        headline:    `${provider} — ${rocket} | ${siteName}${backupSuffix}`,
        description: `Mission : ${missionName}. Vérifier NOTAMs aéroports impactés : ${airports.join(', ')}.`,
        link:        launchDetailUrl,
        sourceLinks,
        isBackup,
        provider,
        rocket,
        missionName,
        siteName,
        hoursUntil: Math.round(hoursUntil),
      } as any);
    }

    console.log(`[LaunchLib] ${alerts.length} lancement(s) impactant(s) dans les 72h`);
  } catch (e) {
    console.error('[LaunchLib]', e);
  }
  return alerts;
}
