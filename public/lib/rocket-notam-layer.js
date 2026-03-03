/**
 * rocket-notam-layer.js
 * Leaflet layer manager for AHA/DRA rocket launch zones
 *
 * Feature: after a dispatcher clicks "Tir réussi ✅",
 * the zone turns green and stays visible 6h (CLEARED status).
 * Stored in localStorage so persiste entre les rechargements.
 */

const NOTAM_COLORS = {
  AHA:           { NO_FLY:      { fill: '#dc2626', stroke: '#991b1b', opacity: 0.50 } },
  DRA:           { CAUTION:     { fill: '#f97316', stroke: '#c2410c', opacity: 0.35 } },
  LAUNCH_HAZARD: { CAUTION_HIGH:{ fill: '#f59e0b', stroke: '#d97706', opacity: 0.40 },
                   AVOID:       { fill: '#fbbf24', stroke: '#f59e0b', opacity: 0.30 } },
  LAUNCH:        { INFO:        { fill: '#64748b', stroke: '#475569', opacity: 0.25 } },
  // Zone verte après tir réussi
  CLEARED:       { OK:          { fill: '#16a34a', stroke: '#15803d', opacity: 0.35 } },
};

// Durée d'affichage de la zone verte après confirmation (ms)
const CLEARED_DURATION_MS = 6 * 60 * 60 * 1000; // 6 heures

const LS_KEY = 'skywatch_launches_ok'; // localStorage

let rocketLayerGroup = null;
let fetchInterval    = null;
let _leafletMap      = null; // référence globale pour les callbacks popup

// ─── Helpers localStorage ─────────────────────────────────────────────────
function getLaunchesOk() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLaunchOk(notamKey) {
  const all = getLaunchesOk();
  all[notamKey] = new Date().toISOString();
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

/**
 * Retourne l'état CLEARED d'un NOTAM :
 * - null   = pas encore marqué comme réussi
 * - { ts, remainingMs } = réussi, encore dans la fenêtre 6h
 * - 'expired' = fenêtre 6h écoulée
 */
function getClearedStatus(notamKey) {
  const all  = getLaunchesOk();
  const tsStr = all[notamKey];
  if (!tsStr) return null;

  const ts        = new Date(tsStr).getTime();
  const elapsed   = Date.now() - ts;
  if (elapsed > CLEARED_DURATION_MS) return 'expired';

  return {
    ts: new Date(tsStr),
    remainingMs: CLEARED_DURATION_MS - elapsed,
  };
}

// Clé unique pour un NOTAM (numéro ou mission ID + from)
function notamKey(props) {
  return props.notamNumber || `${props.missionId}_${props.validFrom}`;
}

// ─── Couleur ───────────────────────────────────────────────────────────────
function getColor(classification, status, cleared) {
  if (cleared && cleared !== 'expired') return NOTAM_COLORS.CLEARED.OK;
  const cls = NOTAM_COLORS[classification];
  if (!cls) return NOTAM_COLORS.LAUNCH.INFO;
  return cls[status] || Object.values(cls)[0];
}

// ─── Popup ─────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m}min`;
}

function makePopupContent(props, cleared) {
  const color = getColor(props.classification, props.status, cleared);
  const key   = notamKey(props);

  const statusLabels = {
    NO_FLY: 'NO FLY ZONE', CAUTION_HIGH: 'CAUTION — HIGH RISK',
    CAUTION: 'CAUTION', AVOID: 'AVOID', INFO: 'INFO',
  };
  const classEmoji = { AHA: '🚫', DRA: '⚠️', LAUNCH_HAZARD: '🚀', LAUNCH: 'ℹ️' };

  const altDisplay = props.altitudeUpper === null
    ? `${props.altitudeLower}ft → UNLIMITED`
    : `${props.altitudeLower}ft → ${props.altitudeUpper}ft`;

  const confidencePercent = Math.round((props.confidence || 0) * 100);
  const confidenceColor   = props.confidence >= 0.9 ? '#16a34a'
                          : props.confidence >= 0.7 ? '#f59e0b' : '#6b7280';

  // ─── Zone CLEARED ───
  if (cleared && cleared !== 'expired') {
    const remaining = formatDuration(cleared.remainingMs);
    const confirmedAt = cleared.ts.toLocaleString('fr-FR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC', timeZoneName: 'short',
    });
    return `
      <div style="min-width:280px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="font-size:28px">✅</span>
          <div>
            <div style="background:#15803d;color:white;font-weight:700;font-size:10px;padding:3px 8px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:3px">COULOIR LIBÉRÉ</div>
            <div style="font-size:11px;color:#6b7280;font-family:monospace">${props.notamNumber || 'N/A'}</div>
          </div>
        </div>
        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:8px;border-radius:4px;margin-bottom:8px">
          ${props.missionId ? `<div style="font-weight:600;margin-bottom:2px">🚀 ${props.missionId}</div>` : ''}
          <div style="color:#374151">✅ Tir réussi confirmé à ${confirmedAt}</div>
          <div style="color:#16a34a;font-weight:600;margin-top:4px">Zone effacée dans ${remaining}</div>
        </div>
        <div style="font-size:11px;color:#6b7280">✈️ Le couloir est considéré libéré jusqu'à la fin de la fenêtre de 6h.</div>
      </div>`;
  }

  // ─── Zone active ───
  return `
    <div style="min-width:280px;max-width:320px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:24px">${classEmoji[props.classification] || '🚀'}</span>
        <div style="flex:1">
          <div style="background:${color.stroke};color:white;font-weight:700;font-size:10px;padding:3px 8px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:3px">
            ${statusLabels[props.status] || props.status}
          </div>
          <div style="font-size:11px;color:#6b7280;font-family:monospace">${props.notamNumber || 'N/A'}</div>
        </div>
      </div>

      <div style="background:#f8fafc;border-left:3px solid ${color.stroke};padding:8px;margin-bottom:8px;border-radius:4px">
        <div style="font-weight:600;color:#111;margin-bottom:4px">${props.classification}</div>
        ${props.missionId ? `<div style="color:#374151;font-family:monospace;font-size:12px;margin-bottom:2px">🛰️ ${props.missionId}</div>` : ''}
        <div style="color:#6b7280;font-size:11px;margin-top:4px">
          Confiance : <span style="color:${confidenceColor};font-weight:600">${confidencePercent}%</span>
        </div>
      </div>

      <div style="font-size:11px;color:#374151;margin-bottom:8px">
        <div style="margin-bottom:3px"><span style="font-weight:600">Début :</span> ${formatDate(props.validFrom)}</div>
        <div><span style="font-weight:600">Fin :</span> ${formatDate(props.validTo)}</div>
        <div style="margin-top:4px">✈️ Altitude&nbsp;: <span style="font-family:monospace">${altDisplay}</span></div>
      </div>

      <!-- Bouton confirmation tir réussi -->
      <button
        onclick="window.__rocketConfirmOk('${key}')"
        style="
          width:100%;padding:8px;margin-top:4px;
          background:#16a34a;color:white;
          border:none;border-radius:6px;
          font-size:13px;font-weight:600;cursor:pointer;
        "
      >
        ✅ Tir réussi — Libérer le couloir (6h)
      </button>
    </div>`;
}

// ─── Callback global appelé depuis le HTML du popup ────────────────────────
window.__rocketConfirmOk = function (key) {
  if (!confirm(`Confirmer le tir réussi pour ce NOTAM ?\nLa zone sera affichée comme libérée pendant 6h.`)) return;
  saveLaunchOk(key);
  // Rafraîchit la couche pour appliquer la couleur verte immédiatement
  if (_leafletMap) loadRocketNotams(_leafletMap);
};

// ─── Construction de la couche Leaflet ───────────────────────────────────────
function addRocketNotamLayer(map, geojson) {
  if (!map || !geojson?.features) return;

  if (rocketLayerGroup) map.removeLayer(rocketLayerGroup);
  rocketLayerGroup = L.layerGroup();

  // Nettoyage des entrées localStorage expirées
  const all = getLaunchesOk();
  let changed = false;
  for (const k in all) {
    if (getClearedStatus(k) === 'expired') { delete all[k]; changed = true; }
  }
  if (changed) localStorage.setItem(LS_KEY, JSON.stringify(all));

  geojson.features.forEach(feature => {
    const props   = feature.properties;
    const key     = notamKey(props);
    const cleared = getClearedStatus(key);

    // Zone expirée ET déjà confirmée depuis > 6h → on n'affiche pas
    if (cleared === 'expired') return;

    const color = getColor(props.classification, props.status, cleared);

    const latlngs = feature.geometry.coordinates[0].map(c => [c[1], c[0]]);

    const poly = L.polygon(latlngs, {
      color:       color.stroke,
      fillColor:   color.fill,
      fillOpacity: color.opacity,
      weight:      2.5,
      // Plein si CLEARED ou NO_FLY, pointillé sinon
      dashArray: (cleared || props.status === 'NO_FLY') ? '' : '6, 5',
    });

    poly.bindPopup(makePopupContent(props, cleared), {
      maxWidth: 340,
      className: 'rocket-notam-popup',
    });

    const tooltipLabel = cleared
      ? `✅ CLEARED — ${props.missionId || props.notamNumber || 'NOTAM'}`
      : `🚀 ${props.classification} — ${props.notamNumber || props.missionId || 'N/A'}`;

    poly.bindTooltip(tooltipLabel, { sticky: true, direction: 'top' });

    // Auto-expire : programme la suppression quand la fenêtre de 6h s'écoule
    if (cleared && cleared !== 'expired') {
      setTimeout(() => {
        if (_leafletMap) loadRocketNotams(_leafletMap);
      }, cleared.remainingMs + 1000);
    }

    poly.addTo(rocketLayerGroup);
  });

  rocketLayerGroup.addTo(map);
  console.log(`[rocket-notam-layer] ${geojson.features.length} zone(s) affichée(s)`);
}

// ─── Fetch + affichage ────────────────────────────────────────────────────────────
async function loadRocketNotams(map) {
  _leafletMap = map;
  try {
    const res = await fetch('/api/rocket-notams.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();
    addRocketNotamLayer(map, geojson);
    return geojson;
  } catch (err) {
    console.error('[rocket-notam-layer] Fetch error:', err);
    return null;
  }
}

// ─── Exposition sur window (utilisé par main.js via is:inline) ────────────────
// main.js fait : window.loadRocketNotams(map)
window.loadRocketNotams = loadRocketNotams;
