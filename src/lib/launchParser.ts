import type { Alert } from './geoUtils';
import { getAirportsNearCoords, regionFromCoords } from './geoUtils';

const LAUNCH_WINDOW_HOURS = 72;

const SEVERITY_BY_HOURS: { maxH: number; severity: 'red' | 'orange' | 'yellow' }[] = [
  { maxH: 12,  severity: 'red' },
  { maxH: 24,  severity: 'orange' },
  { maxH: 72,  severity: 'yellow' },
];

const LAUNCH_IMPACT_RADIUS_KM = 500;

// Statuts LL2 à exclure : lancements déjà terminés ou échoués
const EXCLUDE_STATUS_IDS = new Set([4, 7]); // 4=Failed, 7=Partial Failure

// Statuts considérés comme "backup" (TBD/TBC)
const BACKUP_STATUS_IDS = new Set([2, 8]); // 2=TBD, 8=TBC

/** Extrait le slug depuis l'URL LL2, ex: https://ll.thespacedevs.com/2.2.0/launch/falcon-9-block-5-starlink-group-17-18/ → falcon-9-block-5-starlink-group-17-18 */
function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  // L'URL LL2 se termine par /<slug>/ ou /<uuid>/
  const m = url.replace(/\/$/, '').match(/\/([^\/]+)$/);
  return m ? m[1] : '';
}

/** Construit le lien NextRocket.space — utilise le slug si c'est un slug lisible (pas un UUID) */
function nextrocketUrl(launch: any): string {
  const slug = slugFromUrl(launch.url);
  // UUID = 8-4-4-4-12 hex
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (slug && !isUuid) {
    return `https://nextrocket.space/launch/${slug}`;
  }
  // Fallback : page d'accueil NextRocket avec le nom en recherche
  return 'https://nextrocket.space';
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

      console.log(
        `[LaunchLib] ${launch.name} | status=${statusId}(${launch.status?.abbrev ?? launch.status?.name})` +
        ` | T-${Math.round(hoursUntil)}h | pad=(${launch.pad?.latitude},${launch.pad?.longitude})` +
        (isBackup ? ' [BACKUP]' : '')
      );

      if (EXCLUDE_STATUS_IDS.has(statusId)) {
        console.log(`  ↳ IGNORE (statut échec/partiel : ${statusId})`);
        continue;
      }

      if (hoursUntil < 0 || hoursUntil > LAUNCH_WINDOW_HOURS) {
        console.log(`  ↳ IGNORE (hors fenêtre 0-72h : T-${Math.round(hoursUntil)}h)`);
        continue;
      }

      const lat = launch.pad?.latitude  ? parseFloat(launch.pad.latitude)  : null;
      const lon = launch.pad?.longitude ? parseFloat(launch.pad.longitude) : null;
      if (lat === null || lon === null) {
        console.log('  ↳ IGNORE (pas de coordonnées pad)');
        continue;
      }

      const airports = getAirportsNearCoords(lat, lon, LAUNCH_IMPACT_RADIUS_KM);
      if (airports.length === 0) {
        console.log(`  ↳ IGNORE (aucun aéroport AF dans ${LAUNCH_IMPACT_RADIUS_KM}km)`);
        continue;
      }

      const severity = isBackup
        ? 'yellow'
        : (SEVERITY_BY_HOURS.find(s => hoursUntil <= s.maxH)?.severity ?? 'yellow');

      const provider    = launch.launch_service_provider?.abbrev ?? launch.launch_service_provider?.name ?? '?';
      const rocket      = launch.rocket?.configuration?.name ?? 'Lanceur inconnu';
      const siteName    = launch.pad?.name ?? launch.pad?.location?.name ?? 'Site inconnu';
      const missionName = launch.mission?.name ?? launch.name ?? 'Mission inconnue';

      const backupSuffix = isBackup ? ' | Tir de secours (TBD)' : ' | Tir prévu';

      console.log(`  ↳ ALERTE ${severity.toUpperCase()}${isBackup ? ' [BACKUP]' : ''} — aéroports impactés : ${airports.join(', ')}`);

      const launchDetailUrl = launch.url ?? `https://ll.thespacedevs.com/2.2.0/launch/${launch.id}/`;
      const nrUrl = nextrocketUrl(launch);

      const sourceLinks: { label: string; url: string }[] = [
        { label: 'Fiche LL2', url: launchDetailUrl },
        ...(nrUrl !== 'https://nextrocket.space'
          ? [{ label: 'NextRocket.space', url: nrUrl }]
          : []),
      ];

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
        // Champs supplémentaires pour le rendu
        provider,
        rocket,
        missionName,
        siteName,
        hoursUntil: Math.round(hoursUntil),
      } as Alert & { sourceLinks: { label: string; url: string }[]; isBackup: boolean; provider: string; rocket: string; missionName: string; siteName: string; hoursUntil: number });
    }

    console.log(`[LaunchLib] ${alerts.length} lancement(s) impactant(s) dans les 72h`);
  } catch (e) {
    console.error('[LaunchLib]', e);
  }
  return alerts;
}
