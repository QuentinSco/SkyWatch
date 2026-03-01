const REGION_LABELS = {
  AMN:  '\uD83C\uDF0E Am\u00e9rique du Nord',
  AMS:  '\uD83C\uDF0E Am\u00e9rique du Sud',
  EUR:  '\uD83C\uDF0D Europe',
  AFR:  '\uD83C\uDF0D Afrique / Moyen-Orient',
  ASIE: '\uD83C\uDF0F Asie',
};

const SOURCE_LINKS = {
  GDACS:      'https://www.gdacs.org',
  NOAA:       'https://www.weather.gov/alerts',
  MeteoAlarm: 'https://www.meteoalarm.org',
  VAAC:       'https://www.icao.int/safety/meteorology/vaac/Pages/default.aspx',
};

const SOURCE_LABEL = {
  GDACS:      '\uD83D\uDCCB Rapport GDACS complet',
  NOAA:       '\uD83D\uDCCB Alerte NOAA compl\u00e8te',
  MeteoAlarm: '\uD83D\uDCCB D\u00e9tail MeteoAlarm',
  VAAC:       '\uD83D\uDCCB Avis VAAC complet',
};

function severityBadge(s) {
  const dot = { red: '\uD83D\uDD34', orange: '\uD83D\uDFE0', yellow: '\uD83D\uDFE1' };
  const lbl = { red: 'rouge',        orange: 'orange',        yellow: 'jaune'  };
  return `<span class="text-lg" title="${lbl[s] ?? s}">${dot[s] ?? '\u26AA'}</span>`;
}

function airportBadges(airports) {
  if (!airports.length) return `<span class="text-gray-300 italic text-xs">\u2014</span>`;
  return `<div class="flex flex-wrap gap-1">${airports.map(a =>
    `<span class="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-mono whitespace-nowrap">${a}</span>`
  ).join('')}</div>`;
}

function formatDate(str) {
  if (!str) return '\u2014';
  try {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return str; }
}

function formatShortDate(str) {
  if (!str) return '\u2014';
  try {
    return new Date(str).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return str; }
}

function timeWindow(validFrom, validTo) {
  const now = Date.now();
  const from = validFrom ? new Date(validFrom).getTime() : null;
  const to   = validTo   ? new Date(validTo).getTime()   : null;

  let statusLabel = '';
  let statusCls   = '';

  if (to) {
    const msLeft = to - now;
    if (msLeft < 0) {
      statusLabel = 'Expir\u00e9e';
      statusCls   = 'text-gray-400 italic';
    } else {
      const h = Math.floor(msLeft / 3600000);
      const m = Math.floor((msLeft % 3600000) / 60000);
      if (h < 6) {
        statusLabel = h > 0 ? `expire dans ${h}h${m > 0 ? m + 'm' : ''}` : `expire dans ${m}m`;
        statusCls   = 'text-red-500 font-semibold';
      } else if (h < 24) {
        statusLabel = `expire dans ${h}h`;
        statusCls   = 'text-orange-500 font-medium';
      } else {
        const d = Math.floor(h / 24);
        statusLabel = `expire dans ${d}j`;
        statusCls   = 'text-gray-500';
      }
    }
  }

  const fromStr = from ? formatShortDate(validFrom) : '\u2014';
  const toStr   = to   ? formatShortDate(validTo)   : '\u2014';

  return `<div class="text-xs leading-tight whitespace-nowrap">
    <div class="text-gray-500">${fromStr}</div>
    <div class="text-gray-400 text-[10px]">\u2192 ${toStr}</div>
    ${statusLabel ? `<div class="mt-0.5 ${statusCls} text-[10px]">${statusLabel}</div>` : ''}
  </div>`;
}

function detailPanel(a, idx) {
  const sourceLink  = a.link || SOURCE_LINKS[a.source] || '#';
  const sourceLabel = SOURCE_LABEL[a.source] ?? '\uD83D\uDCCB Source';

  return `
    <tr id="detail-${idx}" class="hidden bg-blue-50 border-b border-blue-100">
      <td colspan="7" class="px-6 py-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">

          <div>
            <div class="text-xs font-semibold text-gray-500 uppercase mb-1">\uD83D\uDCC5 Validit\u00e9</div>
            <div class="text-gray-700">
              <span class="font-medium">D\u00e9but :</span> ${formatDate(a.validFrom)}<br/>
              <span class="font-medium">Fin :</span>   ${formatDate(a.validTo)}
            </div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-semibold text-gray-500 uppercase mb-1">\uD83D\uDCDD D\u00e9tail</div>
            <div class="text-gray-700 leading-relaxed">
              ${a.description
                ? `<p>${a.description}</p>`
                : `<p class="text-gray-400 italic">R\u00e9sum\u00e9 non disponible.</p>`
              }
            </div>
          </div>

        </div>

        <div class="mt-3 flex gap-4 flex-wrap items-center">
          <a href="${sourceLink}" target="_blank" rel="noopener"
             class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline font-medium">
            ${sourceLabel} \u2197
          </a>
          <a href="${SOURCE_LINKS[a.source]}" target="_blank" rel="noopener"
             class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 underline">
            \uD83C\uDF10 ${a.source} \u2197
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
              <th class="py-3 px-4">Ph\u00e9nom\u00e8ne</th>
              <th class="py-3 px-4">Pays / Zone</th>
              <th class="py-3 px-4">A\u00e9roports AF concern\u00e9s</th>
              <th class="py-3 px-4">Fen\u00eatre</th>
              <th class="py-3 px-4">Source</th>
              <th class="py-3 px-4">R\u00e9sum\u00e9</th>
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
                  <td class="py-2 px-4">${timeWindow(a.validFrom, a.validTo)}</td>
                  <td class="py-2 px-4">
                    <span class="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 border border-gray-200">${a.source}</span>
                  </td>
                  <td class="py-2 px-4 text-gray-500 text-xs max-w-xs truncate"
                      title="${a.headline.replace(/"/g, '&quot;')}">
                    ${a.headline.slice(0, 90)}${a.headline.length > 90 ? '\u2026' : ''}
                    <span class="chevron ml-1 text-blue-400">\u25BC</span>
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
