const SEVERITY_COLOR = { red: '#ef4444', orange: '#f97316', yellow: '#eab308' };
const SEVERITY_RADIUS = { red: 14, orange: 10, yellow: 8 };
const PHENOMENON_EMOJI = {
  // GDACS
  'Cyclone tropical':      '🌀',
  'Tremblement de terre':  '🫨',
  'Éruption volcanique':   '🌋',
  'Inondation':            '🌊',
  'Tsunami':               '🌊',
  'Incendie':              '🔥',
  // VAAC
  'Cendres volcaniques':   '🌋',
  // MeteoAlarm / NOAA
  'Orage':                 '⛈',
  'Vent violent':          '💨',
  'Neige / Verglas':       '🌨',
  'Brouillard':            '🌫',
  'Chaleur extrême':       '🌡',
  'Froid extrême':         '❄️',
  'Inondation / Pluie':    '🌊',
  'Pluie intense':         '🌧',
  // NOAA keywords
  'Blizzard':              '❄️',
  'Hurricane':             '🌀',
  'Tornado':               '🌪',
  'Fog':                   '🌫',
  'Wind':                  '💨',
  'Snow':                  '🌨',
  'Flood':                 '🌊',
  'Dust':                  '🏜',
  'Freezing':              '🧊',
};

let mapInstance = null;

function phenomenonEmoji(phenomenon) {
  if (!phenomenon) return '⚠️';
  // Correspondance exacte d'abord
  if (PHENOMENON_EMOJI[phenomenon]) return PHENOMENON_EMOJI[phenomenon];
  // Sinon recherche par inclusion (ex: "High Wind Warning" → 'Wind')
  const match = Object.entries(PHENOMENON_EMOJI)
    .find(([k]) => phenomenon.toLowerCase().includes(k.toLowerCase()));
  return match ? match[1] : '⚠️';
}

function makeCircleIcon(severity, phenomenon) {
  const color = SEVERITY_COLOR[severity] ?? '#6b7280';
  const emoji = phenomenonEmoji(phenomenon);
  return L.divIcon({
    className: '',
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -20],
    html: `
      <div style="
        width:34px; height:34px;
        background:white;
        border:2.5px solid ${color};
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:18px; line-height:1;
        box-shadow:0 1px 4px rgba(0,0,0,0.25);
      ">${emoji}</div>
    `,
  });
}

function popupContent(a) {
  const severityLabel = { red: 'ROUGE', orange: 'ORANGE', yellow: 'JAUNE' }[a.severity] ?? a.severity;
  const color = SEVERITY_COLOR[a.severity] ?? '#6b7280';
  const from = a.validFrom ? new Date(a.validFrom).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const to   = a.validTo   ? new Date(a.validTo).toLocaleString('fr-FR',   { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="background:${color};color:white;font-weight:700;font-size:11px;padding:2px 7px;border-radius:4px;text-transform:uppercase">${severityLabel}</span>
        <span style="font-size:11px;color:#6b7280">${a.source}</span>
      </div>
      <div style="font-weight:600;color:#111;margin-bottom:2px">${a.phenomenon}</div>
      <div style="color:#374151;margin-bottom:4px">${a.country}</div>
      <div style="color:#6b7280;font-size:11px;margin-bottom:6px">${a.headline.slice(0, 100)}${a.headline.length > 100 ? '…' : ''}</div>
      <div style="font-size:11px;color:#9ca3af">
        ${from} → ${to}
      </div>
      ${a.airports && a.airports.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${a.airports.map(ap => `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:3px;font-size:10px;font-family:monospace">${ap}</span>`).join('')}</div>` : ''}
    </div>`;
}

export function initMap(alerts) {
  if (!document.getElementById('alert-map')) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map('alert-map', {
    center: [20, 10],
    zoom: 2,
    minZoom: 1,
    maxZoom: 10,
    worldCopyJump: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapInstance);

  const withCoords = alerts.filter(a => a.lat != null && a.lon != null);

  for (const a of withCoords) {
    const marker = L.marker([a.lat, a.lon], { icon: makeCircleIcon(a.severity, a.phenomenon) });
    marker.bindPopup(popupContent(a), { maxWidth: 300 });
    marker.addTo(mapInstance);
  }

  if (withCoords.length > 0) {
    const bounds = L.latLngBounds(withCoords.map(a => [a.lat, a.lon]));
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }
}
