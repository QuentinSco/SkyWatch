/**
 * rocket-notam-layer.js
 * Couche Leaflet pour les zones de lancement depuis Launch Library 2
 *
 * Statuts affichés :
 *   IN_FLIGHT   → rouge plein        (lancement en cours)
 *   GO          → orange pointillé   (Go for Launch, < 48h)
 *   UPCOMING    → gris pointillé     (planifié, < 48h)
 *   CLEARED     → vert plein         (réussi, fenêtre 6h)
 *
 * Le statut SUCCESS est détecté automatiquement depuis LL2 —
 * plus besoin du bouton manuel.
 */

const STATUS_STYLE = {
  IN_FLIGHT: { fill: '#dc2626', stroke: '#991b1b', opacity: 0.55, dash: '' },
  GO:        { fill: '#f59e0b', stroke: '#d97706', opacity: 0.40, dash: '6,4' },
  UPCOMING:  { fill: '#64748b', stroke: '#475569', opacity: 0.25, dash: '4,6' },
  CLEARED:   { fill: '#16a34a', stroke: '#15803d', opacity: 0.35, dash: '' },
};

const STATUS_EMOJI = {
  IN_FLIGHT: '🔴',
  GO:        '🚀',
  UPCOMING:  '🗓️',
  CLEARED:   '✅',
};

let rocketLayerGroup = null;
let _map = null;

// ─── Formatage ────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

function fmtDuration(ms) {
  if (!ms || ms <= 0) return '0min';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

// ─── Popup ─────────────────────────────────────────────────────────────────
function makePopup(p) {
  const style = STATUS_STYLE[p.status] || STATUS_STYLE.UPCOMING;
  const emoji = STATUS_EMOJI[p.status] || '🚀';

  // Zone CLEARED
  if (p.status === 'CLEARED') {
    const remaining = fmtDuration(p.remainingMs);
    return `
      <div style="min-width:270px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:26px">✅</span>
          <div>
            <div style="background:#15803d;color:white;font-weight:700;font-size:10px;padding:2px 8px;border-radius:4px;text-transform:uppercase">COULOIR LIBÉRÉ</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">${p.provider || ''}</div>
          </div>
        </div>
        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:8px;border-radius:4px;margin-bottom:8px">
          <div style="font-weight:600;margin-bottom:2px">${p.name}</div>
          ${p.missionName ? `<div style="color:#374151;font-size:12px">🛰️ ${p.missionName}</div>` : ''}
          <div style="color:#374151;font-size:12px;margin-top:4px">✅ Tir réussi à ${fmtDate(p.clearedSince)}</div>
          <div style="color:#16a34a;font-weight:600;margin-top:3px">Zone effacée dans ${remaining}</div>
        </div>
        <div style="font-size:11px;color:#6b7280">📍 ${p.padLocation || p.pad || '—'}</div>
      </div>`;
  }

  // Zone active / à venir
  const timeLabel = p.status === 'IN_FLIGHT'
    ? `Décollage : ${fmtDate(p.net)}`
    : `NET&nbsp;: ${fmtDate(p.net)}`;

  return `
    <div style="min-width:270px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:24px">${emoji}</span>
        <div>
          <div style="background:${style.stroke};color:white;font-weight:700;font-size:10px;padding:2px 8px;border-radius:4px;text-transform:uppercase">${p.statusLabel || p.status}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">${p.provider || ''}</div>
        </div>
      </div>

      <div style="background:#f8fafc;border-left:3px solid ${style.stroke};padding:8px;border-radius:4px;margin-bottom:8px">
        <div style="font-weight:600;color:#111;margin-bottom:3px">${p.name}</div>
        ${p.missionName ? `<div style="color:#374151;font-size:12px">🛰️ ${p.missionName}</div>` : ''}
        ${p.missionType  ? `<div style="color:#6b7280;font-size:11px">${p.missionType}</div>` : ''}
      </div>

      <div style="font-size:11px;color:#374151;margin-bottom:6px">
        <div>⏰ ${timeLabel}</div>
        ${p.windowEnd ? `<div style="color:#9ca3af">↦ Fin fenêtre : ${fmtDate(p.windowEnd)}</div>` : ''}
      </div>

      <div style="font-size:11px;color:#6b7280;padding-top:6px;border-top:1px solid #e5e7eb">
        <div>📍 ${p.padLocation || p.pad || '—'}</div>
        <div>✈️ Zone approximative (±80km) — consulter NOTAM officiel</div>
      </div>

      ${p.infoUrl ? `<a href="${p.infoUrl}" target="_blank" rel="noopener"
         style="display:block;margin-top:8px;font-size:11px;color:#3b82f6;text-decoration:underline">
         → Détail LL2
       </a>` : ''}
    </div>`;
}

// ─── Construction de la couche ───────────────────────────────────────────────────
function buildLayer(map, geojson) {
  if (!map || !geojson?.features) return;

  if (rocketLayerGroup) map.removeLayer(rocketLayerGroup);
  rocketLayerGroup = L.layerGroup();

  geojson.features.forEach(feature => {
    const p     = feature.properties;
    const style = STATUS_STYLE[p.status] || STATUS_STYLE.UPCOMING;
    const emoji = STATUS_EMOJI[p.status] || '🚀';

    const latlngs = feature.geometry.coordinates[0].map(c => [c[1], c[0]]);

    const poly = L.polygon(latlngs, {
      color:       p.stroke  || style.stroke,
      fillColor:   p.fill    || style.fill,
      fillOpacity: p.opacity || style.opacity,
      weight:      2.5,
      dashArray:   p.dashArray !== undefined ? p.dashArray : style.dash,
    });

    poly.bindPopup(makePopup(p), { maxWidth: 340 });
    poly.bindTooltip(
      `${emoji} ${p.name || p.missionName || 'Launch'} — ${p.statusLabel || p.status}`,
      { sticky: true, direction: 'top' }
    );

    // Auto-expire la zone CLEARED quand les 6h s'écoulent
    if (p.status === 'CLEARED' && p.remainingMs > 0) {
      setTimeout(() => {
        if (_map) loadRocketNotams(_map);
      }, p.remainingMs + 2000);
    }

    poly.addTo(rocketLayerGroup);
  });

  rocketLayerGroup.addTo(map);
  console.log(`[rocket-notam-layer] ${geojson.features.length} zone(s) affichée(s)`);
}

// ─── Chargement ─────────────────────────────────────────────────────────────────
async function loadRocketNotams(map) {
  _map = map;
  try {
    const res = await fetch('/api/rocket-notams.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();
    buildLayer(map, geojson);
    return geojson;
  } catch (err) {
    console.warn('[rocket-notam-layer] Erreur chargement:', err.message);
    return null;
  }
}

// Exposition sur window pour main.js (is:inline)
window.loadRocketNotams = loadRocketNotams;
