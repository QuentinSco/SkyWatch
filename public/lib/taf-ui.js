(function () {

  const SEVERITY_BADGE = {
    red:    'bg-red-600 text-white',
    orange: 'bg-orange-500 text-white',
    yellow: 'bg-yellow-400 text-black',
  };
  const SEVERITY_LABEL = {
    red:    '🔴 ROUGE',
    orange: '🟠 ORANGE',
    yellow: '🟡 JAUNE',
  };
  const THREAT_ICONS = {
    THUNDERSTORM: '⛈',
    SNOW:         '🌨',
    WIND:         '💨',
    FREEZING:     '🧊',
    HAIL:         '🌧',
    CB_TCU:       '⛅',
    LOW_VIS:      '🌫',
    FUNNEL_CLOUD: '🌪',
  };
  const CI_LABEL = {
    'TEMPO':       { text: 'TEMPO',         cls: 'bg-purple-100 text-purple-700 border border-purple-300' },
    'BECMG':       { text: 'BECMG',         cls: 'bg-blue-100 text-blue-700 border border-blue-300' },
    'PROB30':      { text: 'PROB 30%',      cls: 'bg-gray-100 text-gray-600 border border-gray-300' },
    'PROB40':      { text: 'PROB 40%',      cls: 'bg-yellow-100 text-yellow-700 border border-yellow-300' },
    'PROB30 TEMPO':{ text: 'PROB 30% TEMPO',cls: 'bg-purple-50 text-purple-600 border border-purple-200' },
    'PROB40 TEMPO':{ text: 'PROB 40% TEMPO',cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  };
  const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatUTC(ts) {
    return new Date(ts * 1000).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  function formatIsoToLocalShort(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  function formatTta(tta) {
    if (typeof tta !== 'number' || isNaN(tta)) return '—';
    const abs  = Math.abs(tta);
    const sign = tta > 0 ? 'T-' : 'T+';
    if (abs < 60) return sign + abs + 'min';
    const h   = Math.floor(abs / 60);
    const min = abs % 60;
    return sign + h + 'h' + (min > 0 ? String(min).padStart(2, '0') + 'min' : '');
  }

  /**
   * Formate un TAF brut pour la lisibilité :
   * - Saut de ligne avant chaque groupe temporel : FM, TEMPO, BECMG, PROB30, PROB40, RMK
   * - "PROB30 TEMPO" et "PROB40 TEMPO" restent sur la même ligne (traités comme un seul token)
   */
  function formatTafRaw(raw) {
    if (!raw) return '';
    // 1. Normalise les espaces multiples / retours existants
    const flat = raw.trim().replace(/\s+/g, ' ');
    // 2. Insère \n avant les groupes temporels.
    //    On traite PROB3x/PROB4x TEMPO en premier pour les coller ensemble,
    //    puis les tokens simples restants.
    return flat
      // Priorité : PROB30 TEMPO et PROB40 TEMPO → un seul saut avant "PROB3x TEMPO"
      .replace(/\s+(PROB(30|40)\s+TEMPO)\b/g, '\n$1')
      // Ensuite : FM, BECMG, TEMPO standalone (non précédé de PROBxx),
      //           PROB30/PROB40 standalone (non suivi de TEMPO), RMK
      .replace(/\s+(FM\d{6}|BECMG\b|(?<!PROB(?:30|40) )TEMPO\b|PROB(30|40)(?!\s+TEMPO)\b|RMK\b)/g, '\n$1');
  }

  function lastUpdateBar() {
    return `
      <div class="text-xs text-gray-400 mt-2 flex items-center gap-2">
        <span>Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        <button id="btn-refresh-vol" class="text-blue-500 hover:text-blue-700 underline text-xs">
          ↺ Actualiser
        </button>
      </div>`;
  }

  function bindRefreshBtn() {
    document.getElementById('btn-refresh-vol')
      ?.addEventListener('click', loadTafVolRisks);
  }

  // ── TAF : badge menace ────────────────────────────────────────────────────────
  function renderThreatBadge(threat) {
    const icon   = THREAT_ICONS[threat.type] ?? '⚠️';
    const badge  = SEVERITY_BADGE[threat.severity];
    const ci     = CI_LABEL[threat.changeIndicator] ?? null;
    return `
      <div class="flex flex-col gap-1 text-xs">
        <div class="flex items-center gap-2 font-mono font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded px-2 py-1 w-fit">
          🕐 ${formatUTC(threat.periodStart)} → ${formatUTC(threat.periodEnd)}
          ${ci ? `<span class="${ci.cls} px-1.5 py-0.5 rounded font-semibold">${ci.text}</span>` : ''}
        </div>
        <div class="flex items-center flex-wrap gap-2">
          <span class="${badge} px-2 py-0.5 rounded font-bold whitespace-nowrap">${icon} ${threat.label}</span>
          <span class="text-gray-500 font-mono">${threat.value ?? ''}</span>
        </div>
        <div class="font-mono bg-white border border-gray-100 rounded px-2 py-1 text-gray-600">${threat.snippet.trim()}</div>
      </div>`;
  }

  // ── TAF : ligne tableau ───────────────────────────────────────────────────────
  function renderTafRiskCard(risk) {
    const badgeCls    = SEVERITY_BADGE[risk.worstSeverity];
    const threatsHtml = risk.threats.map(t => `
      <div class="mb-2 pb-2 border-b border-gray-100 last:border-0">${renderThreatBadge(t)}</div>`
    ).join('');
    return `
      <tr class="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer"
          onclick="this.nextElementSibling.classList.toggle('hidden')">
        <td class="py-2 px-4">
          <span class="${badgeCls} inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase">${SEVERITY_LABEL[risk.worstSeverity]}</span>
        </td>
        <td class="py-2 px-4 font-mono font-bold text-gray-800">${risk.icao}</td>
        <td class="py-2 px-4 text-gray-600">${risk.name}</td>
        <td class="py-2 px-4">
          <div class="flex flex-wrap gap-1">
            ${Object.values(
              risk.threats.reduce((acc, t) => {
                if (!acc[t.type] || SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[acc[t.type].severity]) acc[t.type] = t;
                return acc;
              }, {})
            ).map(t => {
              const icon = THREAT_ICONS[t.type] ?? '⚠️';
              const cls  = SEVERITY_BADGE[t.severity];
              return `<span class="${cls} text-xs px-1.5 py-0.5 rounded font-semibold">${icon} ${t.label}</span>`;
            }).join('')}
          </div>
        </td>
        <td class="py-2 px-4 font-mono text-xs text-gray-400 max-w-xs truncate" title="${risk.rawTaf}">
          ${risk.rawTaf.slice(0, 80)}${risk.rawTaf.length > 80 ? '…' : ''}
        </td>
      </tr>
      <tr class="hidden bg-gray-50">
        <td colspan="5" class="px-6 py-3">
          <div class="text-xs font-semibold text-gray-500 uppercase mb-2">Détail des menaces</div>
          ${threatsHtml}
          <div class="mt-3 font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600" style="white-space:pre-wrap;word-break:break-word">${formatTafRaw(risk.rawTaf)}</div>
        </td>
      </tr>`;
  }

  // ── TAF : chargement section ──────────────────────────────────────────────────
  async function loadTafRisks() {
    const container  = document.getElementById('taf-main');
    const countersEl = document.getElementById('taf-counters');
    if (!container) { console.error('[taf-ui] #taf-main introuvable'); return; }

    container.innerHTML = `
      <div class="flex items-center gap-3 text-gray-400 text-sm py-8 justify-center">
        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des TAFs sur le réseau AF…
      </div>`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/taf-risks', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const risks = await res.json();

      const redCount    = risks.filter(r => r.worstSeverity === 'red').length;
      const orangeCount = risks.filter(r => r.worstSeverity === 'orange').length;
      if (countersEl) {
        countersEl.innerHTML = [
          redCount    ? `<span class="bg-red-100 text-red-700 font-semibold text-xs px-3 py-1 rounded-full">🔴 ${redCount}</span>` : '',
          orangeCount ? `<span class="bg-orange-100 text-orange-700 font-semibold text-xs px-3 py-1 rounded-full">🟠 ${orangeCount}</span>` : '',
        ].join('');
      }

      if (risks.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12 text-gray-400">
            <div class="text-4xl mb-2">✅</div>
            <div class="text-sm font-medium">Aucun phénomène significatif sur le réseau AF</div>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="text-xs text-gray-400 mb-3">
          ${risks.length} aéroport${risks.length > 1 ? 's' : ''} avec phénomènes — Cliquez une ligne pour voir le détail
        </div>
        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="w-full text-sm text-left text-gray-700 bg-white">
            <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="py-3 px-4">Niveau</th>
                <th class="py-3 px-4">ICAO</th>
                <th class="py-3 px-4">Aéroport</th>
                <th class="py-3 px-4">Menaces détectées</th>
                <th class="py-3 px-4">TAF (extrait)</th>
              </tr>
            </thead>
            <tbody>${risks.map(renderTafRiskCard).join('')}</tbody>
          </table>
        </div>`;
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Timeout — API trop lente (>15s)' : e.message;
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ Erreur lors du chargement des TAFs : ${msg}
        </div>`;
    }
  }

  // ── Vols AF : rendu ligne ─────────────────────────────────────────────────────
  let _rowIdx = 0;

  function renderTafVolRow(hit) {
    const threat = hit.threat;
    const flight = hit.flight;
    const taf    = hit.taf;
    const icon   = THREAT_ICONS[threat.type] ?? '⚠️';
    const badge  = SEVERITY_BADGE[threat.severity];
    const ci     = CI_LABEL[threat.changeIndicator] ?? null;
    const etaIso = flight.estimatedArrival || flight.scheduledArrival;
    const etaStr = formatIsoToLocalShort(etaIso);
    const tta    = etaIso ? Math.round((new Date(etaIso).getTime() - Date.now()) / 60000) : null;
    const ttaStr = formatTta(tta);
    const windowStr = `${formatUTC(threat.periodStart)} → ${formatUTC(threat.periodEnd)}`;

    const rowId = 'vol-row-' + (_rowIdx++);

    const otherThreats = taf.threats.filter(t =>
      !(t.type === threat.type &&
        t.periodStart === threat.periodStart &&
        t.periodEnd   === threat.periodEnd)
    );
    const otherThreatsHtml = otherThreats.length
      ? otherThreats.map(t => `<div class="mb-2 pb-2 border-b border-gray-100 last:border-0">${renderThreatBadge(t)}</div>`).join('')
      : '<span class="text-gray-400">Aucune autre menace détectée sur ce TAF.</span>';

    return `
      <tr class="border-b border-gray-100 hover:bg-blue-50/70 transition cursor-pointer"
          onclick="document.getElementById('${rowId}').classList.toggle('hidden')">
        <td class="py-2 px-3">
          <span class="${badge} px-2 py-0.5 rounded text-xs font-bold uppercase">${SEVERITY_LABEL[threat.severity]}</span>
        </td>
        <td class="py-2 px-3 font-mono font-semibold text-gray-800">AF${flight.flightNumber}</td>
        <td class="py-2 px-3 text-xs text-gray-500">
          ${flight.registration ?? '—'}
          <span class="ml-1 text-gray-400">${flight.aircraftType ?? ''}</span>
        </td>
        <td class="py-2 px-3 text-sm text-gray-800">${taf.iata} (${taf.icao}) — ${taf.name}</td>
        <td class="py-2 px-3 text-xs text-gray-700">${icon} ${threat.label}</td>
        <td class="py-2 px-3 text-xs font-mono text-gray-700 whitespace-nowrap">
          <div class="font-semibold text-gray-800">${windowStr}</div>
          ${ci ? `<span class="${ci.cls} inline-block mt-1 px-1.5 py-0.5 rounded text-[11px] font-semibold">${ci.text}</span>` : ''}
        </td>
        <td class="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
          ${etaStr}
          <div class="text-[10px] text-gray-400">${ttaStr}</div>
        </td>
      </tr>
      <tr id="${rowId}" class="hidden bg-gray-50">
        <td colspan="7" class="px-5 py-3">
          <div class="flex flex-col gap-3 text-xs">

            <!-- ✅ PRIORITÉ : Fenêtre d'arrivée du vol -->
            <div class="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div class="flex items-center gap-3 flex-wrap mb-2">
                <span class="${badge} px-2 py-0.5 rounded font-bold text-xs">${icon} ${threat.label}</span>
                <span class="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-semibold text-xs px-2 py-1 rounded">
                  🕐 ${windowStr}
                  ${ci ? `<span class="${ci.cls} ml-1 px-1.5 py-0.5 rounded font-semibold">${ci.text}</span>` : ''}
                </span>
                <span class="text-gray-500">ETA <strong>${etaStr}</strong></span>
                <span class="font-semibold ${tta !== null && tta > 0 ? 'text-orange-600' : 'text-green-600'}">${ttaStr}</span>
              </div>
              <div class="font-mono bg-gray-50 border border-gray-100 rounded px-2 py-1 text-gray-700">${threat.snippet.trim()}</div>
            </div>

            <!-- Autres menaces : toggle -->
            <div>
              <button
                class="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                onclick="(function(btn){
                  var el = btn.closest('.flex.flex-col').querySelector('.other-threats-block');
                  el.classList.toggle('hidden');
                  btn.textContent = el.classList.contains('hidden')
                    ? '▶ Autres menaces sur ${taf.iata} (${otherThreats.length})'
                    : '▼ Masquer les autres menaces';
                })(this); event.stopPropagation();">
                ▶ Autres menaces sur ${taf.iata} (${otherThreats.length})
              </button>
              <div class="other-threats-block hidden mt-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                ${otherThreatsHtml}
              </div>
            </div>

            <!-- TAF complet : toggle -->
            <div>
              <button
                class="text-xs text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1"
                onclick="(function(btn){
                  var el = btn.closest('.flex.flex-col').querySelector('.taf-raw-block');
                  el.classList.toggle('hidden');
                  btn.textContent = el.classList.contains('hidden')
                    ? '▶ Afficher TAF complet'
                    : '▼ Masquer TAF complet';
                })(this); event.stopPropagation();">
                ▶ Afficher TAF complet
              </button>
              <div class="taf-raw-block hidden mt-2 font-mono bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-600 text-[11px]" style="white-space:pre-wrap;word-break:break-word">${formatTafRaw(taf.rawTaf)}</div>
            </div>

          </div>
        </td>
      </tr>`;
  }

  // ── Vols AF : chargement section ──────────────────────────────────────────────
  async function loadTafVolRisks() {
    _rowIdx = 0;
    const container  = document.getElementById('taf-vol-main');
    const countersEl = document.getElementById('taf-vol-counters');
    if (!container) { console.error('[taf-ui] #taf-vol-main introuvable'); return; }

    container.innerHTML = `
      <div class="flex items-center gap-3 text-gray-400 text-sm py-4">
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Analyse des vols AF vs menaces TAF…
      </div>`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch('/api/taf-vol-risks', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const hits = await res.json();

      const red    = hits.filter(h => h.threat.severity === 'red').length;
      const orange = hits.filter(h => h.threat.severity === 'orange').length;
      if (countersEl) {
        countersEl.innerHTML = [
          red    ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">🔴 ${red}</span>` : '',
          orange ? `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">🟠 ${orange}</span>` : '',
          hits.length ? `<span class="text-gray-400 text-xs">Total ${hits.length} vol${hits.length > 1 ? 's' : ''}</span>` : '',
        ].join('');
      }

      if (hits.length === 0) {
        container.innerHTML = `
          <div class="text-gray-400 text-sm py-4">
            Aucun vol AF LC actuellement dans une fenêtre de menace TAF détectée.
          </div>
          ${lastUpdateBar()}`;
        bindRefreshBtn();
        return;
      }

      container.innerHTML = `
        <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table class="w-full text-sm text-left text-gray-700 bg-white">
            <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="py-2 px-3">Niveau</th>
                <th class="py-2 px-3">Vol</th>
                <th class="py-2 px-3">Immat / Type</th>
                <th class="py-2 px-3">Destination</th>
                <th class="py-2 px-3">Menace</th>
                <th class="py-2 px-3">Fenêtre TAF</th>
                <th class="py-2 px-3">ETA</th>
              </tr>
            </thead>
            <tbody>${hits.map(renderTafVolRow).join('')}</tbody>
          </table>
        </div>
        ${lastUpdateBar()}`;
      bindRefreshBtn();

    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Timeout — API trop lente (>30s)' : e.message;
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ Erreur lors du chargement AF/TAF : ${msg}
        </div>
        ${lastUpdateBar()}`;
      bindRefreshBtn();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadTafRisks();
    loadTafVolRisks();
    setInterval(() => { loadTafVolRisks(); }, 20 * 60 * 1000);
    setInterval(() => { loadTafRisks();    },  5 * 60 * 1000);
  });

})();
