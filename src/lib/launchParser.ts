import type { Alert } from './geoUtils';
import { getAirportsNearCoords, regionFromCoords } from './geoUtils';

// ─── Debug ────────────────────────────────────────────────────────────────────
// Passer à true pour voir les logs détaillés dans la console serveur
const DEBUG = false;

function dbg(...args: unknown[]): void {
  if (DEBUG) console.log('[LaunchLib DEBUG]', ...args);
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const LL2_BASE            = 'https://ll.thespacedevs.com/2.2.0';
const LAUNCH_WINDOW_HOURS = 72;
const LAUNCH_IMPACT_RADIUS_KM = 500;

const SEVERITY_BY_HOURS: { maxH: number; severity: 'red' | 'orange' | 'yellow' }[] = [
  { maxH: 12, severity: 'red'    },
  { maxH: 24, severity: 'orange' },
  { maxH: 72, severity: 'yellow' },
];

/**
 * Statuts LL2 à exclure complètement :
 *   4 = Launch Failure
 *   7 = Partial Failure
 */
const EXCLUDE_STATUS_IDS = new Set([4, 7]);

/**
 * Statuts LL2 considérés comme "backup" (fenêtre non confirmée) :
 *   2 = TBD
 *   8 = TBC
 * → forcent severity = yellow, quel que soit l'horizon
 */
const BACKUP_STATUS_IDS = new Set([2, 8]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  const m = url.replace(/\/$/, '').match(/\/([^/]+)$/);
  return m ? m[1] : '';
}

function nextrocketUrl(launch: any): string {
  const slug = slugFromUrl(launch.url);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (slug && !isUuid) return `https://nextrocket.space/launch/${slug}`;
  return '';
}

// ─── Fetch principal ──────────────────────────────────────────────────────────

export async function fetchRocketLaunches(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const now = Date.now();

    /**
     * FIX : on filtre côté API avec window_start__lte pour s'assurer que
     * les lancements dans les LAUNCH_WINDOW_HOURS suivantes sont toujours
     * inclus dans les résultats, même si la file d'attente LL2 dépasse
     * la limite de 50 entrées (nombreux TBD/TBC lointains).
     *
     * Sans ce filtre, un lancement "Go" dans 20h pouvait être absent si
     * 50+ lancements TBD/TBC étaient listés avant lui par window_start.
     */
    const windowTo = new Date(now + LAUNCH_WINDOW_HOURS * 3_600_000).toISOString();

    const url = new URL(`${LL2_BASE}/launch/upcoming/`);
    url.searchParams.set('limit',              '50');
    url.searchParams.set('ordering',           'window_start');
    url.searchParams.set('window_start__lte',  windowTo);

    dbg(`Requête LL2 : ${url.toString()}`);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'SkyWatch/0.1', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error('[LaunchLib] HTTP', res.status, res.statusText);
      return alerts;
    }

    const json = await res.json();
    const results: any[] = json.results ?? [];

    dbg(`LL2 a retourné ${results.length} lancement(s) (count total = ${json.count})`);

    for (const launch of results) {
      const statusId    = launch.status?.id;
      const statusName  = launch.status?.abbrev ?? '?';
      const windowStart = new Date(launch.window_start ?? launch.net).getTime();
      const windowEnd   = new Date(launch.window_end   ?? launch.net).getTime();
      const hoursUntil  = (windowStart - now) / 3_600_000;
      const isBackup    = BACKUP_STATUS_IDS.has(statusId);

      dbg(`→ ${launch.name} | status=${statusName}(${statusId}) | hoursUntil=${hoursUntil.toFixed(1)}`);

      // Exclure les échecs
      if (EXCLUDE_STATUS_IDS.has(statusId)) {
        dbg(`  ✗ exclu (statut échec)`);
        continue;
      }

      // Exclure ce qui est passé ou trop loin
      if (hoursUntil < 0) {
        dbg(`  ✗ exclu (passé, hoursUntil=${hoursUntil.toFixed(1)})`);
        continue;
      }
      if (hoursUntil > LAUNCH_WINDOW_HOURS) {
        dbg(`  ✗ exclu (trop loin, hoursUntil=${hoursUntil.toFixed(1)} > ${LAUNCH_WINDOW_HOURS})`);
        continue;
      }

      // Coordonnées du pad
      const lat = launch.pad?.latitude  ? parseFloat(launch.pad.latitude)  : null;
      const lon = launch.pad?.longitude ? parseFloat(launch.pad.longitude) : null;
      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        dbg(`  ✗ exclu (coordonnées manquantes)`);
        continue;
      }

      // Aéroports AF dans le rayon d'impact
      const airports = getAirportsNearCoords(lat, lon, LAUNCH_IMPACT_RADIUS_KM);
      dbg(`  Aéroports AF dans ${LAUNCH_IMPACT_RADIUS_KM} km : [${airports.join(', ')}]`);
      if (airports.length === 0) {
        dbg(`  ✗ exclu (aucun aéroport AF dans le rayon)`);
        continue;
      }

      // Sévérité
      const severity = isBackup
        ? 'yellow'
        : (SEVERITY_BY_HOURS.find(s => hoursUntil <= s.maxH)?.severity ?? 'yellow');

      // Métadonnées
      const provider    = launch.launch_service_provider?.abbrev ?? launch.launch_service_provider?.name ?? '?';
      const rocket      = launch.rocket?.configuration?.name ?? 'Lanceur inconnu';
      const siteName    = launch.pad?.name ?? launch.pad?.location?.name ?? 'Site inconnu';
      const missionName = launch.mission?.name ?? launch.name ?? 'Mission inconnue';

      const providerInfoUrl: string = launch.launch_service_provider?.info_url ?? '';
      const providerName: string    = launch.launch_service_provider?.name ?? provider;
      const nrUrl = nextrocketUrl(launch);

      // Dernier update (ordonné du plus ancien au plus récent dans LL2)
      const updates = Array.isArray(launch.updates) ? launch.updates : [];
      const lastUpdate = updates.length > 0 ? updates[updates.length - 1] : null;
      const lastUpdateUrl: string     = lastUpdate?.info_url ?? '';
      const lastUpdateComment: string = lastUpdate?.comment  ?? '';

      /**
       * Ordre de priorité des liens :
       * 1. updates[last].info_url  → lien spécifique à la mission
       * 2. NextRocket.space        → fiche lisible si slug disponible
       * 3. provider.info_url       → site générique du provider (fallback)
       * On n'expose jamais l'URL LL2 brute.
       */
      const sourceLinks: { label: string; url: string }[] = [];
      if (lastUpdateUrl)   sourceLinks.push({
        label: lastUpdateComment ? lastUpdateComment.slice(0, 45) : 'Page lancement',
        url:   lastUpdateUrl,
      });
      if (nrUrl)           sourceLinks.push({ label: 'NextRocket.space', url: nrUrl });
      if (providerInfoUrl) sourceLinks.push({ label: providerName,       url: providerInfoUrl });

      const launchDetailUrl = launch.url
        ?? `${LL2_BASE}/launch/${launch.id}/`;

      dbg(`  ✓ ajouté | severity=${severity} | airports=[${airports.join(', ')}]`);

      alerts.push({
        id:          `LAUNCH-${launch.id}`,
        source:      'LaunchLib',
        region:      regionFromCoords(lat, lon),
        severity,
        phenomenon:  'Tir spatial',
        eventType:   isBackup ? 'LAUNCH_BACKUP' : 'LAUNCH',
        country:     launch.pad?.location?.country_code ?? '',
        airports,
        lat,
        lon,
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

    console.log(`[LaunchLib] ${alerts.length} lancement(s) impactant(s) dans les ${LAUNCH_WINDOW_HOURS}h`);

  } catch (e) {
    console.error('[LaunchLib]', e);
  }

  return alerts;
}
