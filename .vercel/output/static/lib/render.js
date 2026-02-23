const REGION_LABELS = {
  AMN:  '🌎 Amérique du Nord',
  AMS:  '🌎 Amérique du Sud',
  EUR:  '🌍 Europe',
  AFR:  '🌍 Afrique / Moyen-Orient',
  ASIE: '🌏 Asie',
};

const SOURCE_LINKS = {
  GDACS:      'https://www.gdacs.org',
  NOAA:       'https://www.weather.gov/alerts',
  MeteoAlarm: 'https://www.meteoalarm.org',
};

const SOURCE_LABEL = {
  GDACS:      '📋 Rapport GDACS complet',
  NOAA:       '📋 Alerte NOAA complète',
  MeteoAlarm: '📋 Détail MeteoAlarm',
};

function severityBadge(s) {
  const cfg = {
    red:    { cls: 'bg-red-500 text-white',          label: '🔴 ROUGE'  },
    orange: { cls: 'bg-orange-400 text-white',       label: '🟠 ORANGE' },
    yellow: { cls: 'bg-yellow-400 text-gray-900',    label: '🟡 JAUNE'  },
  };
  const c = cfg[s];
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${c.cls}">${c.label}</span>`;
}

function airportBadges(airports) {
  if (!airports.length) return `<span class="text-gray-300 italic text-xs">—</span>`;
  return `<div class="flex flex-wrap gap-1">${airports.map(a =>
    `<span class="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-mono whitespace-nowrap">${a}</span>`
  ).join('')}</div>`;
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return str; }
}

function detailPanel(a, idx) {
  const sourceLink  = a.link || SOURCE_LINKS[a.source] || '#';
  const sourceLabel = SOURCE_LABEL[a.source] ?? '📋 Source';

  return `
    <tr id="detail-${idx}" class="hidden bg-blue-50 border-b border-blue-100">
      <td colspan="6" class="px-6 py-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">

          <div>
            <div class="text-xs font-semibold text-gray-500 uppercase mb-1">📅 Validité</div>
            <div class="text-gray-700">
              <span class="font-medium">Début :</span> ${formatDate(a.validFrom)}<br/>
              <span class="font-medium">Fin :</span>   ${formatDate(a.validTo)}
            </div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-semibold text-gray-500 uppercase mb-1">📝 Détail</div>
            <div class="text-gray-700 leading-relaxed">
              ${a.description
                ? `<p>${a.description}</p>`
                : `<p class="text-gray-400 italic">Résumé non disponible.</p>`
              }
            </div>
          </div>

        </div>

        <div class="mt-3 flex gap-4 flex-wrap items-center">
          <a href="${sourceLink}" target="_blank" rel="noopener"
             class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline font-medium">
            ${sourceLabel} ↗
          </a>
          <a href="${SOURCE_LINKS[a.source]}" target="_blank" rel="noopener"
             class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline">
            🌐 ${a.source} ↗
          </a>
        </div>
      </td>
    </tr>`;
}

export function renderRegion(region, alerts) {
  const filtered = alerts.filter(a => a.region === region);
  const borderColor = filtered.some(a => a.severity === 'red')    ? 'border-red-500'
    : filtered.some(a => a.severity === 'orange') ? 'border-orange-400'
    : 'border-yellow-400';

  const body = filtered.length === 0
    ? `<p class="text-gray-400 text-sm italic">Aucune alerte significative.</p>`
    : `<div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table class="w-full text-sm text-left text-gray-700 bg-white">
          <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="py-3 px-4">Niveau</th>
              <th class="py-3 px-4">Phénomène</th>
              <th class="py-3 px-4">Pays / Zone</th>
              <th class="py-3 px-4">Aéroports AF concernés</th>
              <th class="py-3 px-4">Source</th>
              <th class="py-3 px-4">Résumé</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((a, i) => {
              const idx = region + '-' + i;
              return `
                <tr data-detail-id="${idx}"
                    class="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
                  <td class="py-2 px-4">${severityBadge(a.severity)}</td>
                  <td class="py-2 px-4 font-medium text-gray-800">${a.phenomenon}</td>
                  <td class="py-2 px-4 text-gray-600">${a.country}</td>
                  <td class="py-2 px-4">${airportBadges(a.airports)}</td>
                  <td class="py-2 px-4">
                    <span class="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 border border-gray-200">${a.source}</span>
                  </td>
                  <td class="py-2 px-4 text-gray-500 text-xs max-w-xs truncate"
                      title="${a.headline.replace(/"/g, '&quot;')}">
                    ${a.headline.slice(0, 90)}${a.headline.length > 90 ? '…' : ''}
                    <span class="chevron ml-1 text-blue-400">▼</span>
                  </td>
                </tr>
                ${detailPanel(a, idx)}`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

  return `<section class="border-l-4 ${borderColor} pl-4 mb-8">
    <h2 class="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
      ${REGION_LABELS[region]}
      <span class="text-sm font-normal text-gray-400">(${filtered.length} alerte${filtered.length > 1 ? 's' : ''})</span>
    </h2>
    ${body}
  </section>`;
}
