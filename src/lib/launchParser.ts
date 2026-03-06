import type { Alert } from './geoUtils';
import { getAirportsNearCoords, regionFromCoords } from './geoUtils';

const LAUNCH_WINDOW_HOURS = 12;

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

    // ── DEBUG ──────────────────────────────────────────────────────────────
    console.log(`[LaunchLib:DEBUG] now = ${new Date().toISOString()}`);
    console.log(`[LaunchLib:DEBUG] LAUNCH_WINDOW_HOURS = ${LAUNCH_WINDOW_HOURS}`);
    console.log(`[LaunchLib:DEBUG] URL = ${url.toString()}`);
    // ───────────────────────────────────────────────────────────────────────

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

    // ── DEBUG ──────────────────────────────────────────────────────────────
    console.log(`[LaunchLib:DEBUG] LL2 total count = ${json.count}, résultats reçus = ${json.results?.length ?? 0}`);
    // ───────────────────────────────────────────────────────────────────────

    for (const launch of (json.results ?? [])) {
      const statusId    = launch.status?.id;
      const windowStart = new Date(launch.window_start ?? launch.net).getTime();
      const windowEnd   = new Date(launch.window_end   ?? launch.net).getTime();
      const hoursUntil  = (windowStart - now) / 3_600_000;
      const isBackup    = BACKUP_STATUS_IDS.has(statusId);

      // ── DEBUG : une ligne par lancement ──────────────────────────────────
      const tag = launch.name?.includes('Starlink') ? '🚀★' : '🚀';
      console.log(
        `[LaunchLib:DEBUG] ${tag} "${launch.name}"` +
        ` | statusId=${statusId} (${launch.status?.abbrev})` +
        ` | hoursUntil=${hoursUntil.toFixed(1)}h` +
        ` | window_start=${launch.window_start ?? '(null→net)'}` +
        ` | net=${launch.net}`
      );
      // ─────────────────────────────────────────────────────────────────────

      if (EXCLUDE_STATUS_IDS.has(statusId)) {
        console.log(`[LaunchLib:DEBUG]   → ❌ EXCLU (statusId ${statusId} in EXCLUDE_STATUS_IDS)`);
        continue;
      }
      if (hoursUntil < 0 || hoursUntil > LAUNCH_WINDOW_HOURS) {
        console.log(`[LaunchLib:DEBUG]   → ❌ HORS FENÊTRE (hoursUntil=${hoursUntil.toFixed(1)} — doit être 0-${LAUNCH_WINDOW_HOURS})`);
        continue;
      }

      const lat = launch.pad?.latitude  ? parseFloat(launch.pad.latitude)  : null;
      const lon = launch.pad?.longitude ? parseFloat(launch.pad.longitude) : null;
      if (lat === null || lon === null) {
        console.log(`[LaunchLib:DEBUG]   → ❌ PAS DE COORDONNÉES pad`);
        continue;
      }

      const airports = getAirportsNearCoords(lat, lon, LAUNCH_IMPACT_RADIUS_KM);

      // ── DEBUG ──────────────────────────────────────────────────────────────
      console.log(`[LaunchLib:DEBUG]   → pad (${lat}, ${lon}) | aéroports trouvés : [${airports.join(', ')}]`);
      // ───────────────────────────────────────────────────────────────────────

      if (airports.length === 0) {
        console.log(`[LaunchLib:DEBUG]   → ❌ AUCUN AÉROPORT dans ${LAUNCH_IMPACT_RADIUS_KM} km`);
        continue;
      }

      console.log(`[LaunchLib:DEBUG]   → ✅ RETENU severity=${isBackup ? 'yellow(backup)' : '?'}`);


      const severity = isBackup
        ? 'yellow'
        : (SEVERITY_BY_HOURS.find(s => hoursUntil <= s.maxH)?.severity ?? 'yellow');

      const provider    = launch.launch_service_provider?.abbrev ?? launch.launch_service_provider?.name ?? '?';
      const rocket      = launch.rocket?.configuration?.name ?? 'Lanceur inconnu';
      const siteName    = launch.pad?.name ?? launch.pad?.location?.name ?? 'Site inconnu';
      const missionName = launch.mission?.name ?? launch.name ?? 'Mission inconnue';

      const providerInfoUrl: string = launch.launch_service_provider?.info_url ?? '';
      const providerName: string    = launch.launch_service_provider?.name ?? provider;
      const nrUrl = nextrocketUrl(launch);

      const updates = Array.isArray(launch.updates) ? launch.updates : [];
      const lastUpdate = updates.length > 0 ? updates[updates.length - 1] : null;
      const lastUpdateUrl: string     = lastUpdate?.info_url ?? '';
      const lastUpdateComment: string = lastUpdate?.comment  ?? '';

      const sourceLinks: { label: string; url: string }[] = [];
      if (lastUpdateUrl)   sourceLinks.push({
        label: lastUpdateComment ? lastUpdateComment.slice(0, 45) : 'Page lancement',
        url: lastUpdateUrl,
      });
      if (nrUrl)           sourceLinks.push({ label: 'NextRocket.space', url: nrUrl });
      if (providerInfoUrl) sourceLinks.push({ label: providerName, url: providerInfoUrl });

      const launchDetailUrl = launch.url ?? `https://ll.thespacedevs.com/2.2.0/launch/${launch.id}/`;

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
        headline:    `${provider} — ${rocket} | ${siteName}`,
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

    console.log(`[LaunchLib] ${alerts.length} lancement(s) impactant(s) dans les 12h`);
  } catch (e) {
    console.error('[LaunchLib]', e);
  }
  return alerts;
}
