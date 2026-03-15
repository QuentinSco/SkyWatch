(function () {

  const SEVERITY_BADGE = {
    red:    'bg-red-600 text-white',
    orange: 'bg-orange-500 text-white',
    yellow: 'bg-yellow-400 text-black',
  };
  const SEVERITY_LABEL = {
    red:    '🔴',
    orange: '🟠',
    yellow: '🟡',
  };
  const SEVERITY_DOT = {
    red:    '#dc2626',
    orange: '#f97316',
    yellow: '#eab308',
  };
  const SOURCE_ICON = {
    GDACS:      '🌍',
    NOAA:       '🌪',
    MeteoAlarm: '⚡',
    VAAC:       '🌋',
  };
  const REGION_LABEL = {
    EUR:  'Europe',
    AMN:  'Amérique du Nord',
    AMS:  'Amérique du Sud',
    AFR:  'Afrique',
    ASIE: 'Asie',
    PAC:  'Pacifique',
  };

  const PHENOMENON_EMOJI = {
    'Cyclone tropical':      '🌀',
    'Tremblement de terre':  '🌏',
    'Éruption volcanique':   '🌋',
    'Inondation':            '🌊',
    'Tsunami':               '🌊',
    'Incendie':              '🔥',
    'Cendres volcaniques':   '🌋',
    'Orage':                 '⛈',
    'Vent violent':          '💨',
    'Neige / Verglas':       '🌨',
    'Brouillard':            '🌫',
    'Chaleur extrême':       '🌡',
    'Froid extrême':         '❄️',
    'Inondation / Pluie':    '🌊',
    'Pluie intense':         '🌧',
    'Blizzard':              '🌨️',
    'Hurricane':             '🌀',
    'Tornade':               '🌪',
    'Brume':                 '🌫',
    'Vent':                  '💨',
    'Neige':                 '🌨',
    'Poussière / Sable':     '🏜',
    'Gel / Verglas':         '🧊',
  };

  const ROCKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="display:inline;width:1em;height:1em;vertical-align:-0.15em" aria-hidden="true"><path d="M13.75 2c-1.79 0-3.5.7-4.77 1.95L4 8.93V11l2.5 2.5L9 11l1-1 4-4 3.1-.1c.8-.03 1.57.28 2.13.84l.03.03c.56.56.87 1.33.84 2.13L20 12l-4 4-1 1-2.5 2.5H15l4.98-4.98A6.74 6.74 0 0 0 22 10.25C22 5.7 18.3 2 13.75 2ZM9 15.5 4.5 20l-.01-.01A1.49 1.49 0 0 1 4 19H3a1 1 0 0 1-1-1v-1a1.49 1.49 0 0 1 .44-1.06L7 11.5 9 13.5l.5.5L9 15.5Zm5-6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/></svg>`;

  function formatShortDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  function timeWindowStatus(validTo) {
    if (!validTo) return null;
    const now  = Date.now();
    const end  = new Date(validTo).getTime();
    const diff = end - now;
    if (diff < 0)        return { label: 'Expiré', cls: 'text-gray-400' };
    if (diff < 3600000)  return { label: '< 1h',   cls: 'text-red-500 font-bold' };
    if (diff < 21600000) return { label: '< 6h',   cls: 'text-orange-500 font-semibold' };
    return null;
  }

  function countdownLabel(validFrom) {
    if (!validFrom) return '';
    const diff = new Date(validFrom).getTime() - Date.now();
    if (diff <= 0) return '<span class="text-red-600 font-semibold">EN COURS</span>';
    const totalMin = Math.floor(diff / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    let label, cls;
    if (h < 1) {
      label = `T-${m}min`; cls = 'text-red-600 font-semibold';
    } else if (h < 6) {
      label = `T-${h}h${m > 0 ? String(m).padStart(2,'0') : ''}`; cls = 'text-orange-500 font-semibold';
    } else if (h < 24) {
      label = `T-${h}h`; cls = 'text-yellow-600';
    } else {
      const d = Math.floor(h / 24); const rh = h % 24;
      label = rh > 0 ? `T-${d}j${rh}h` : `T-${d}j`; cls = 'text-gray-500';
    }
    return `<span class="${cls}">${label}</span>`;
  }

  function groupByRegion(alerts) {
    return alerts.reduce((acc, a) => {
      const r = a.region || 'AUTRE';
      if (!acc[r]) acc[r] = [];
      acc[r].push(a);
      return acc;
    }, {});
  }

  function phenomenonEmoji(phenomenon) {
    if (!phenomenon) return '⚠️';
    if (PHENOMENON_EMOJI[phenomenon]) return PHENOMENON_EMOJI[phenomenon];
    const match = Object.entries(PHENOMENON_EMOJI)
      .find(([k]) => phenomenon.toLowerCase().includes(k.toLowerCase()));
    return match ? match[1] : '⚠️';
  }

  function renderAlertRow(alert) {
    const isSpatial = alert.phenomenon === 'Tir spatial';
    const isBackup  = alert.isBackup === true || alert.eventType === 'LAUNCH_BACKUP';

    let badgeCls, badgeLabel;
    if (isSpatial) {
      badgeCls   = isBackup ? 'bg-violet-400 text-white' : 'bg-violet-600 text-white';
      badgeLabel = `${ROCKET_SVG} ${isBackup ? 'BACKUP' : 'SPATIAL'}`;
    } else {
      badgeCls   = SEVERITY_BADGE[alert.severity] ?? 'bg-gray-200 text-gray-600';
      badgeLabel = SEVERITY_LABEL[alert.severity] ?? alert.severity.toUpperCase();
    }

    const status = timeWindowStatus(alert.validTo);
    const icon   = isSpatial ? ROCKET_SVG : (SOURCE_ICON[alert.source] ?? '⚠️');
    const airportsHtml = alert.airports?.length
      ? alert.airports.map(a =>
          `<span class="inline-block bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold">${a}</span>`
        ).join(' ')
      : '<span class="text-gray-400">—</span>';

    let sourceHtml;
    if (alert.sourceLinks && alert.sourceLinks.length > 0) {
      sourceHtml = `<div class="flex flex-col gap-0.5">
        <span class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">${alert.source}</span>
        ${alert.sourceLinks.map(l =>
          `<a href="${l.url}" target="_blank" rel="noopener noreferrer"
             class="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 border border-blue-200 hover:bg-blue-100 transition"
             onclick="event.stopPropagation()">${l.label} ↗</a>`
        ).join('')}
      </div>`;
    } else {
      sourceHtml = `<span class="text-xs font-semibold text-gray-400">${icon} ${alert.source}</span>`;
    }

    let resumeHtml;
    if (isSpatial) {
      const provider    = alert.provider    || '';
      const rocket      = alert.rocket      || '';
      const missionName = alert.missionName || '';
      const siteName    = alert.siteName    || '';
      const cdHtml      = countdownLabel(alert.validFrom);
      const providerRocket = [provider, rocket].filter(Boolean).join(' · ');
      resumeHtml = `
        <div class="text-xs leading-snug">
          <div class="font-semibold text-gray-800">${cdHtml}${cdHtml ? ' — ' : ''}${providerRocket}</div>
          ${missionName ? `<div class="text-gray-500">${missionName}</div>` : ''}
          ${siteName    ? `<div class="text-gray-400 text-[11px]">${siteName}</div>` : ''}
        </div>`;
    } else {
      const text = alert.headline.slice(0, 90) + (alert.headline.length > 90 ? '…' : '');
      resumeHtml = `<span class="text-gray-600 text-xs break-words">${text}</span>`;
    }

    // Lien ligne dépliée :
    // - tir spatial : sourceLinks[0] si dispo, sinon rien (jamais l'URL LL2 brute)
    // - autre alerte : alert.link (source officielle météo/géophysique)
    let detailLinkHtml = '';
    if (isSpatial) {
      const firstLink = alert.sourceLinks && alert.sourceLinks.length > 0 ? alert.sourceLinks[0] : null;
      if (firstLink) {
        detailLinkHtml = `<a href="${firstLink.url}" target="_blank" rel="noopener" class="text-blue-500 underline text-xs">→ ${firstLink.label}</a>`;
      }
    } else if (alert.link) {
      detailLinkHtml = `<a href="${alert.link}" target="_blank" rel="noopener" class="text-blue-500 underline text-xs">→ Source officielle</a>`;
    }

    return `
      <tr class="border-b border-gray-100 hover:bg-blue-50/60 transition cursor-pointer"
          onclick="this.nextElementSibling.classList.toggle('hidden')">
        <td class="py-2 px-3">
          <span class="${badgeCls} inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold uppercase">${badgeLabel}</span>
        </td>
        <td class="py-2 px-3 text-sm font-medium text-gray-800">${icon} ${alert.phenomenon}</td>
        <td class="py-2 px-3 text-sm text-gray-600">${alert.country}</td>
        <td class="py-2 px-3"><div class="flex flex-wrap gap-1">${airportsHtml}</div></td>
        <td class="py-2 px-3 text-xs text-gray-500">
          ${formatShortDate(alert.validFrom)}<br>
          <span class="text-gray-400">→ ${formatShortDate(alert.validTo)}</span>
          ${status ? `<span class="ml-1 ${status.cls}">${status.label}</span>` : ''}
        </td>
        <td class="py-2 px-3">${sourceHtml}</td>
        <td class="py-2 px-3 text-xs text-gray-600 max-w-xs">${resumeHtml}</td>
      </tr>
      <tr class="hidden bg-gray-50">
        <td colspan="7" class="px-6 py-3 text-xs text-gray-600">
          <div class="flex flex-col gap-1">
            ${alert.description ? `<p class="text-gray-700">${alert.description}</p>` : ''}
            ${detailLinkHtml}
          </div>
        </td>
      </tr>
    `;
  }

  function renderRegionSection(region, alerts) {
    const regionLabel = REGION_LABEL[region] ?? region;
    const rows = alerts.map(renderAlertRow).join('');
    return `
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-base font-bold text-gray-800">${regionLabel}</h3>
          <span class="text-xs text-gray-400 font-medium">${alerts.length} alerte${alerts.length > 1 ? 's' : ''}</span>
        </div>
        <div class="rounded-xl border border-gray-200 shadow-sm">
          <table class="w-full text-sm text-left text-gray-700 bg-white">
            <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="py-2 px-3">Niveau</th>
                <th class="py-2 px-3">Phénomène</th>
                <th class="py-2 px-3">Pays / Zone</th>
                <th class="py-2 px-3">Aéroports AF</th>
                <th class="py-2 px-3">Fenêtre</th>
                <th class="py-2 px-3">Source</th>
                <th class="py-2 px-3">Résumé</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  let leafletMap   = null;
  let markersLayer = null;

  function initMap() {
    if (leafletMap) return;
    if (!window.L) { console.warn('[main.js] Leaflet non disponible'); return; }
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });
    leafletMap = L.map('alert-map', { zoomControl: true }).setView([20, 10], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '© OpenStreetMap contributors',
    }).addTo(leafletMap);
    markersLayer = L.layerGroup().addTo(leafletMap);
  }

  function updateMapMarkers(alerts) {
    if (!leafletMap || !markersLayer) return;
    markersLayer.clearLayers();
    for (const alert of alerts) {
      if (alert.lat == null || alert.lon == null) continue;

      const isSpatial = alert.phenomenon === 'Tir spatial';
      const color     = isSpatial ? '#7c3aed' : (SEVERITY_DOT[alert.severity] ?? '#6b7280');
      const strokeColor = isSpatial ? '#5b21b6' : color;

      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 36;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(18, 18, 16, 0, Math.PI * 2);
      ctx.fillStyle = isSpatial ? '#7c3aed' : 'white';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isSpatial ? 'white' : 'black';
      ctx.fillText(isSpatial ? '🚀' : phenomenonEmoji(alert.phenomenon), 18, 19);

      const icon = L.icon({ iconUrl: canvas.toDataURL('image/png'), iconSize: [36,36], iconAnchor: [18,18], popupAnchor: [0,-20] });
      const marker = L.marker([alert.lat, alert.lon], { icon });

      let popupContent;
      if (isSpatial) {
        const cdHtml = countdownLabel(alert.validFrom);
        const providerRocket = [alert.provider, alert.rocket].filter(Boolean).join(' · ');
        popupContent = `
          <div class="text-xs font-sans" style="min-width:180px">
            <div class="font-bold text-sm mb-1">🚀 ${alert.phenomenon}</div>
            <div class="font-semibold mb-1">${cdHtml ? cdHtml + ' — ' : ''}${providerRocket}</div>
            ${alert.missionName ? `<div class="text-gray-600">${alert.missionName}</div>` : ''}
            ${alert.siteName    ? `<div class="text-gray-400">${alert.siteName}</div>` : ''}
            ${alert.airports?.length ? `<div class="mt-1">✈️ ${alert.airports.join(' · ')}</div>` : ''}
          </div>`;
      } else {
        popupContent = `
          <div class="text-xs font-sans">
            <div class="font-bold text-sm mb-1">${phenomenonEmoji(alert.phenomenon)} ${alert.phenomenon}</div>
            <div class="text-gray-600 mb-1">${alert.country}</div>
            <div class="font-semibold" style="color:${color}">${SEVERITY_LABEL[alert.severity] ?? alert.severity}</div>
            <div class="text-gray-500 mt-1">${alert.headline.slice(0,100)}${alert.headline.length>100?'…':''}</div>
            <div class="text-gray-400 mt-1">Source : ${alert.source}</div>
            ${alert.airports?.length ? `<div class="mt-1">✈️ ${alert.airports.join(' · ')}</div>` : ''}
          </div>`;
      }

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    }
  }

  async function loadAlerts() {
    const mainEl     = document.getElementById('main-content');
    const lastUpdate = document.getElementById('last-update');
    const countersEl = document.getElementById('counters');
    if (!mainEl) return;

    mainEl.innerHTML = `
      <div class="flex items-center gap-3 text-gray-400 text-sm py-12 justify-center">
        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des alertes mondiales…
      </div>`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/alerts', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const alerts = await res.json();

      const redCount    = alerts.filter(a => a.severity === 'red').length;
      const orangeCount = alerts.filter(a => a.severity === 'orange').length;
      const yellowCount = alerts.filter(a => a.severity === 'yellow').length;

      if (countersEl) {
        countersEl.innerHTML = [
          redCount    ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">🔴 ${redCount}</span>` : '',
          orangeCount ? `<span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">🟠 ${orangeCount}</span>` : '',
          yellowCount ? `<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">🟡 ${yellowCount}</span>` : '',
        ].join('');
      }
      if (lastUpdate) {
        lastUpdate.textContent = 'MàJ ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }

      initMap();
      updateMapMarkers(alerts);

      if (alerts.length === 0) {
        mainEl.innerHTML = `
          <div class="text-center py-16 text-gray-400">
            <div class="text-5xl mb-3">✅</div>
            <div class="text-sm font-medium">Aucune alerte significative sur le réseau AF</div>
          </div>`;
        return;
      }

      const byRegion    = groupByRegion(alerts);
      const regionOrder = ['EUR', 'AMN', 'AMS', 'AFR', 'ASIE', 'PAC'];
      const ordered     = [
        ...regionOrder.filter(r => byRegion[r]),
        ...Object.keys(byRegion).filter(r => !regionOrder.includes(r)),
      ];

      mainEl.innerHTML = `
        <h2 class="text-xl font-bold text-gray-900 mb-6">
          🌐 Alertes actives
          <span class="text-sm font-normal text-gray-400 ml-2">${alerts.length} phénomène${alerts.length > 1 ? 's' : ''} détecté${alerts.length > 1 ? 's' : ''}</span>
        </h2>
        ${ordered.map(r => renderRegionSection(r, byRegion[r])).join('')}
      `;

    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Timeout — API trop lente (>15s)' : 'Erreur : ' + e.message;
      mainEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">⚠️ ${msg}</div>`;
      if (lastUpdate) lastUpdate.textContent = 'Erreur de chargement';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadAlerts();
    setInterval(loadAlerts, 5 * 60 * 1000);
  });

})();
