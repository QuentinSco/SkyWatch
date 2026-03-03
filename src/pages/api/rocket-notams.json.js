/**
 * /api/rocket-notams.json
 *
 * Source : Launch Library 2 (The Space Devs)
 *   https://ll.thespacedevs.com/2.2.0/
 *   Free, no API key, 15 req/h unauthenticated (on met en cache 5 min)
 *
 * Retourne un GeoJSON des lancements :
 *   - fenêtre J-1 / J+1 (actifs ou imminents)
 *   - lancés avec succès il y a moins de 6h (zone verte auto)
 *
 * Zones approximatives : cercles basés sur les coordonnées du pad
 * (les NOTAMs exacts restent la référence officielle, mais ça suffit
 * pour l'affichage opérationnel à l'échelle de la carte monde).
 */

const LL2_BASE  = 'https://ll.thespacedevs.com/2.2.0';
const CLEARED_H = 6; // heures d'affichage après succès

// Rayon approximatif de la zone de restriction autour du pad (km)
// AHA réelle = définie dans le NOTAM, on prend 80 km comme proxy conservative
const DEFAULT_RADIUS_KM = 80;

/** Codes statut LL2 pertinents */
const STATUS = {
  GO:         'Go',
  IN_FLIGHT:  'In Flight',
  SUCCESS:    'Success',
  FAILURE:    'Failure',
  TBD:        'TBD',
  TBC:        'TBC',
  ON_HOLD:    'Hold',
};

/** Convertit un cercle (lat, lng, km) en polygone GeoJSON (n points) */
function circleToPolygon(lat, lng, radiusKm, nPoints = 32) {
  const R  = 6371; // rayon Terre km
  const d  = radiusKm / R;
  const coords = [];
  for (let i = 0; i <= nPoints; i++) {
    const angle = (2 * Math.PI * i) / nPoints;
    const latR  = (lat * Math.PI) / 180;
    const pLat  = Math.asin(
      Math.sin(latR) * Math.cos(d) +
      Math.cos(latR) * Math.sin(d) * Math.cos(angle)
    );
    const pLng  =
      (lng * Math.PI) / 180 +
      Math.atan2(
        Math.sin(angle) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(pLat)
      );
    coords.push([
      parseFloat(((pLng * 180) / Math.PI).toFixed(5)),
      parseFloat(((pLat * 180) / Math.PI).toFixed(5)),
    ]);
  }
  return coords;
}

/** Calcule le statut opérationnel d'une zone à partir des données LL2 */
function zoneStatus(launch) {
  const abbrev = launch.status?.abbrev || '';
  const net    = new Date(launch.net).getTime();
  const now    = Date.now();

  if (abbrev === STATUS.SUCCESS) {
    const elapsedMs = now - net;
    if (elapsedMs < CLEARED_H * 3600000) {
      return {
        type:        'CLEARED',
        color:       { fill: '#16a34a', stroke: '#15803d', opacity: 0.35 },
        label:       'COULOIR LIBÉRÉ',
        dashArray:   '',
        clearedSince: launch.net,
        remainingMs:  CLEARED_H * 3600000 - elapsedMs,
      };
    }
    return null; // plus de 6h — ne plus afficher
  }

  if (abbrev === STATUS.FAILURE) return null; // échec, pas besoin d'afficher

  if (abbrev === STATUS.IN_FLIGHT) {
    return {
      type:      'IN_FLIGHT',
      color:     { fill: '#dc2626', stroke: '#991b1b', opacity: 0.55 },
      label:     'LANCEMENT EN COURS',
      dashArray: '',
    };
  }

  if (abbrev === STATUS.GO) {
    return {
      type:      'GO',
      color:     { fill: '#f59e0b', stroke: '#d97706', opacity: 0.40 },
      label:     'GO FOR LAUNCH',
      dashArray: '6,4',
    };
  }

  // TBD / TBC / autres — fenêtre < 48h
  const diffH = (net - now) / 3600000;
  if (diffH >= 0 && diffH <= 48) {
    return {
      type:      'UPCOMING',
      color:     { fill: '#64748b', stroke: '#475569', opacity: 0.25 },
      label:     'LANCEMENT PLANIFIÉ',
      dashArray: '4,6',
    };
  }

  return null;
}

/** Construit une Feature GeoJSON à partir d'un lancement LL2 */
function launchToFeature(launch, status) {
  const lat = parseFloat(launch.pad?.latitude);
  const lng = parseFloat(launch.pad?.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const polygon = circleToPolygon(lat, lng, DEFAULT_RADIUS_KM);

  return {
    type: 'Feature',
    properties: {
      launchId:     launch.id,
      name:         launch.name,
      status:       status.type,
      statusLabel:  status.label,
      abbrev:       launch.status?.abbrev,
      net:          launch.net,
      windowEnd:    launch.window_end,
      pad:          launch.pad?.name,
      padLocation:  launch.pad?.location?.name,
      provider:     launch.launch_service_provider?.name,
      missionName:  launch.mission?.name || null,
      missionType:  launch.mission?.type || null,
      infoUrl:      launch.url,
      // Champs CLEARED
      clearedSince: status.clearedSince || null,
      remainingMs:  status.remainingMs  || null,
      // Style
      fill:         status.color.fill,
      stroke:       status.color.stroke,
      opacity:      status.color.opacity,
      dashArray:    status.dashArray,
      // Centre du pad pour le tooltip
      centerLat: lat,
      centerLng: lng,
    },
    geometry: {
      type:        'Polygon',
      coordinates: [polygon],
    },
  };
}

export async function GET() {
  try {
    const now = new Date();

    // Fenêtre : J-1 (pour les succès récents) jusqu'à J+2 (lancements à venir)
    const from = new Date(now.getTime() - CLEARED_H * 3600000 - 3600000); // 7h avant
    const to   = new Date(now.getTime() + 48 * 3600000);                  // 48h après

    const params = new URLSearchParams({
      window_start__gte: from.toISOString(),
      window_start__lte: to.toISOString(),
      limit:  '25',
      ordering: 'net',
    });

    console.log(`[rocket-notams] Calling Launch Library 2...`);

    const res = await fetch(`${LL2_BASE}/launch/?${params}`, {
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'SkyWatch-Dispatch/1.0 (skywatch-aviation)',
      },
    });

    if (!res.ok) {
      throw new Error(`LL2 HTTP ${res.status}: ${res.statusText}`);
    }

    const data    = await res.json();
    const launches = data.results || [];

    console.log(`[rocket-notams] LL2 returned ${launches.length} launch(es)`);

    const features = launches
      .map(launch => {
        const status = zoneStatus(launch);
        if (!status) return null; // ignorer (expiré, échec, trop loin)
        return launchToFeature(launch, status);
      })
      .filter(Boolean);

    console.log(`[rocket-notams] Zones à afficher : ${features.length}`);

    const geojson = {
      type:     'FeatureCollection',
      features,
      metadata: {
        generated:  now.toISOString(),
        count:      features.length,
        source:     'Launch Library 2 (thespacedevs.com)',
        window:     { from: from.toISOString(), to: to.toISOString() },
        note:       features.length === 0
          ? 'Aucun lancement dans la fenêtre J-7h / J+48h.'
          : undefined,
      },
    };

    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=300', // cache 5 min
      },
    });

  } catch (error) {
    console.error('[rocket-notams] Error:', error);

    return new Response(
      JSON.stringify({
        type:     'FeatureCollection',
        features: [],
        metadata: {
          error:     error.message,
          generated: new Date().toISOString(),
          hint: 'Launch Library 2 est limité à 15 req/h sans clé. En cas de 429, attendre 4 min.',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
