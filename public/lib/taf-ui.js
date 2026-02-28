(function () {

  const SEVERITY_BADGE = {
    red:    'bg-red-600 text-white',
    orange: 'bg-orange-500 text-white',
    yellow: 'bg-yellow-400 text-black',
    none:   'bg-green-500 text-white',
  };
  const SEVERITY_LABEL = {
    red:    '🔴 ROUGE',
    orange: '🟠 ORANGE',
    yellow: '🟡 JAUNE',
    none:   '✅ DÉGAGÉ',
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
  const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2, none: 3 };

  const PERIOD_BG = {
    red:    '#ef4444',
    orange: '#f97316',
    yellow: '#facc15',
    none:   '#22c55e',
  };

  // ── Helpers ────────────────────────────────────────────────────────────────────────
  function formatUTC(ts) {
    return new Date(ts * 1000).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  function formatHHMM(ts) {
    return new Date(ts * 1000).toLocaleString('fr-FR', {
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

  function formatTafRaw(raw) {
    if (!raw) return '';
    const flat = raw.trim().replace(/\s+/g, ' ');
    return flat
      .replace(/\s+(PROB(30|40)\s+TEMPO)\b/g, '\n$1')
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

  // ── TAF : badge menace ──────────────────────────────────────────────────────────────────
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

  // ── TAF : ligne tableau ───────────────────────────────────────────────────────────────
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

  // ── TAF : chargement section ───────────────────────────────────────────────────────────────
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

  // ── Vols AF : rendu ligne ───────────────────────────────────────────────────────────────
  let _rowIdx = 0;

  function renderTafVolRow(hit) {
    const threat = hit.threat;
    const flight = hit.flight;
    const taf    = hit.taf;
    const icon   = THREAT_ICONS[threat.type] ?? '⚠️';
    const badge  = SEVERITY_BADGE[threat.severity];
    const ci     = CI_LABEL[threat.changeIndicator] ?? null;
    // ✅ Fix : estimatedTouchDownTime (était estimatedArrival, champ inexistant)
    const etaIso = flight.estimatedTouchDownTime || flight.scheduledArrival;
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

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // ██████████████████████  FRISE TEMPORELLE TAF BASE  ██████████████████████████████████████
  // ─────────────────────────────────────────────────────────────────────────────────────────

  function periodSeverity(slotStart, slotEnd, threats) {
    if (!threats || threats.length === 0) return 'none';
    let best = 'none';
    for (const t of threats) {
      const overlap = t.periodStart < slotEnd && t.periodEnd > slotStart;
      if (!overlap) continue;
      if (best === 'none' || SEVERITY_ORDER[t.severity] < SEVERITY_ORDER[best]) {
        best = t.severity;
      }
    }
    return best;
  }

  function buildFcstSnippet(fcst) {
    const parts = [];
    if (fcst.wdir != null && fcst.wspd != null) {
      const dir = String(fcst.wdir).padStart(3, '0');
      const spd = String(fcst.wspd).padStart(2, '0');
      const gst = fcst.wgst ? `G${String(fcst.wgst).padStart(2, '0')}` : '';
      parts.push(`${dir}${spd}${gst}KT`);
    }
    if (fcst.wxString) parts.push(fcst.wxString);
    if (fcst.visib && fcst.visib !== '9999' && fcst.visib !== '6+') {
      parts.push(`VIS ${fcst.visib}`);
    }
    const cbs = (fcst.clouds || []).filter(c => c.type === 'CB' || c.type === 'TCU');
    if (cbs.length) parts.push(cbs.map(c => `${c.cover}${c.base}${c.type}`).join(' '));
    return parts.join(' ');
  }

  function renderTafTimeline(baseTaf) {
    const fcsts     = baseTaf.fcsts   || [];
    const threats   = baseTaf.threats || [];
    const nowSec    = Math.floor(Date.now() / 1000);
    const windowSec = 24 * 3600;

    const tStart = nowSec;
    const tEnd   = fcsts.length > 0
      ? Math.min(tStart + windowSec, Math.max(...fcsts.map(f => f.timeTo ?? f.timeFrom)))
      : tStart + windowSec;

    if (fcsts.length === 0 || tEnd <= tStart) {
      return `<div class="text-xs text-gray-400 italic">TAF non disponible</div>`;
    }

    const totalSec = tEnd - tStart;

    // ── Étape 1 : résolution des périodes en slots de 30 min sans chevauchement ────────
    const SLOT = 30 * 60;
    const nSlots = Math.ceil((tEnd - tStart) / SLOT);
    const slotSev   = new Array(nSlots).fill('none');
    const slotFcst  = new Array(nSlots).fill(null);

    const CI_PRIORITY = { TEMPO: 3, 'PROB30 TEMPO': 3, 'PROB40 TEMPO': 3, BECMG: 2, PROB30: 1, PROB40: 1 };
    const sortedFcsts = [...fcsts].sort((a, b) =>
      (CI_PRIORITY[a.changeIndicator] ?? 0) - (CI_PRIORITY[b.changeIndicator] ?? 0)
    );

    for (const f of sortedFcsts) {
      const fStart = Math.max(f.timeFrom ?? tStart, tStart);
      const fEnd   = Math.min(f.timeTo   ?? tEnd,   tEnd);
      if (fEnd <= fStart) continue;

      const iSlot = Math.floor((fStart - tStart) / SLOT);
      const eSlot = Math.ceil( (fEnd   - tStart) / SLOT);

      for (let s = iSlot; s < eSlot && s < nSlots; s++) {
        const slotStart = tStart + s * SLOT;
        const slotEnd   = tStart + (s + 1) * SLOT;
        const overlap = fStart < slotEnd && fEnd > slotStart;
        if (!overlap) continue;

        const sev = periodSeverity(slotStart, slotEnd, threats);

        const curPriority = slotFcst[s] ? (CI_PRIORITY[slotFcst[s].changeIndicator] ?? 0) : -1;
        const newPriority = CI_PRIORITY[f.changeIndicator] ?? 0;
        if (newPriority >= curPriority) {
          if (slotSev[s] === 'none' || SEVERITY_ORDER[sev] < SEVERITY_ORDER[slotSev[s]]) {
            slotSev[s] = sev;
          }
          slotFcst[s] = f;
        }
      }
    }

    // ── Étape 2 : fusion des slots consécutifs de même sévérité en segments ──
    const segments = [];
    let i = 0;
    while (i < nSlots) {
      const sev  = slotSev[i];
      const fcst = slotFcst[i];
      let j = i + 1;
      while (j < nSlots && slotSev[j] === sev) j++;

      const segStart = tStart + i * SLOT;
      const segEnd   = Math.min(tStart + j * SLOT, tEnd);
      const left  = ((segStart - tStart) / totalSec) * 100;
      const width = ((segEnd   - segStart) / totalSec) * 100;

      // ✅ Fix label : basé sur les menaces qui chevauchent CE segment précisément
      // (était basé sur la période forecast, qui peut couvrir des plages sans menace
      // → un segment vert affichait "Visibilité 700m" au lieu de "Dégagé")
      const matchingThreats = threats.filter(t =>
        t.periodStart < segEnd && t.periodEnd > segStart
      );
      const label = matchingThreats.length === 0
        ? 'Dégagé'
        : matchingThreats.map(t => (THREAT_ICONS[t.type] ?? '⚠️') + ' ' + t.label).join(' · ');

      const ci      = fcst?.changeIndicator ?? '';
      // ✅ snippet masqué pour les segments dégagés (sev = 'none')
      const snippet = sev !== 'none' && fcst ? buildFcstSnippet(fcst) : '';

      segments.push({ left, width, sev, label, ci, segStart, segEnd, snippet });
      i = j;
    }

    // Graduations toutes les 3h
    const ticks = [];
    const firstTickSec = tStart + (3600 - (tStart % 3600)) % 3600;
    for (let t = firstTickSec; t < tEnd; t += 3 * 3600) {
      const pct   = ((t - tStart) / totalSec) * 100;
      const lbl   = new Date(t * 1000).toLocaleString('fr-FR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
      }) + 'Z';
      ticks.push({ pct, label: lbl });
    }

    const groupId = 'taf-grp-' + baseTaf.icao;

    const barsHtml = segments.map((s, i) => {
      const color  = PERIOD_BG[s.sev] ?? '#22c55e';
      const textCl = s.sev === 'yellow' ? 'text-black' : 'text-white';
      const tipId  = `taf-seg-${baseTaf.icao}-${i}`;
      return `
        <div
          class="absolute top-0 h-full rounded transition-opacity hover:opacity-80 cursor-pointer"
          style="left:${s.left.toFixed(2)}%;width:${s.width.toFixed(2)}%;background:${color}"
          onclick="(function(){
            var g=document.querySelectorAll('[data-taf-group=&quot;${groupId}&quot;]');
            g.forEach(function(el){ if(el.id!=='${tipId}') el.classList.add('hidden'); });
            var tip=document.getElementById('${tipId}');
            if(tip) tip.classList.toggle('hidden');
          })(); event.stopPropagation();"
        >${s.width > 12 ? `<span class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] font-semibold ${textCl} truncate px-1 pointer-events-none leading-tight">${s.label}</span>` : ''}</div>`;
    }).join('');

    const tipsHtml = segments.map((s, i) => {
      const tipId  = `taf-seg-${baseTaf.icao}-${i}`;
      const center = s.left + s.width / 2;
      const posStyle = center > 50
        ? `right:${(100 - s.left - s.width).toFixed(2)}%;left:auto;`
        : `left:${s.left.toFixed(2)}%;right:auto;`;
      return `
        <div id="${tipId}" data-taf-group="${groupId}"
             class="hidden absolute z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs w-56 pointer-events-none"
             style="${posStyle}top:calc(100% + 6px)">
          <div class="font-semibold text-gray-700 mb-1">${formatHHMM(s.segStart)} → ${formatHHMM(s.segEnd)}</div>
          <div class="mb-1">${s.label}</div>
          ${s.ci ? `<div class="text-gray-400 text-[10px]">${s.ci}</div>` : ''}
          ${s.snippet ? `<div class="font-mono text-gray-600 mt-1 bg-gray-50 rounded px-1 py-0.5">${s.snippet}</div>` : ''}
        </div>`;
    }).join('');

    const ticksHtml = ticks.map(t => `
      <div class="absolute top-0 h-full border-l border-white/40 pointer-events-none"
           style="left:${t.pct.toFixed(2)}%">
        <span class="absolute -bottom-5 text-[9px] text-gray-400 -translate-x-1/2 whitespace-nowrap">${t.label}</span>
      </div>`
    ).join('');

    const nowHtml = `
      <div class="absolute top-0 h-full border-l-2 border-blue-500 pointer-events-none z-10"
           style="left:0%">
        <span class="absolute -top-5 text-[10px] text-blue-600 font-semibold -translate-x-1/2">NOW</span>
      </div>`;

    return `
      <div class="relative mt-8 mb-6 select-none" onclick="void(0)">
        <div class="relative h-8 rounded-lg bg-gray-100 border border-gray-200" style="overflow:visible">
          ${barsHtml}
          ${tipsHtml}
          ${ticksHtml}
          ${nowHtml}
        </div>
        <div class="relative h-5"></div>
        <div class="flex gap-3 mt-2 flex-wrap text-xs">
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-green-500"></span>Dégagé</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-yellow-400"></span>Jaune</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-orange-500"></span>Orange</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm bg-red-600"></span>Rouge</span>
        </div>
      </div>`;
  }

  // ── Section CDG/ORY ─────────────────────────────────────────────────────────────
  function renderBaseSection(baseHits, baseTafs) {
    const tafsToRender = (baseTafs && baseTafs.length > 0)
      ? baseTafs
      : (baseHits && baseHits.length > 0)
        ? Object.values(baseHits.reduce((acc, h) => {
            const key = h.taf.icao;
            if (!acc[key]) acc[key] = { ...h.taf, threats: [], fcsts: [] };
            const dup = acc[key].threats.some(t =>
              t.type === h.threat.type && t.periodStart === h.threat.periodStart);
            if (!dup) acc[key].threats.push(h.threat);
            return acc;
          }, {}))
        : [];

    if (tafsToRender.length === 0) {
      return `
        <section class="mt-8 pt-6 border-t border-gray-200">
          <h2 class="text-xl font-bold text-gray-900 mb-1">🏠 État base CDG / ORY</h2>
          <p class="text-gray-500 text-sm mb-4">TAF actifs sur CDG/ORY.</p>
          <div class="text-center py-8 text-gray-400">
            <div class="text-3xl mb-2">⏳</div>
            <div class="text-sm">TAF en cours de chargement…</div>
          </div>
        </section>`;
    }

    const cards = tafsToRender.map(taf => {
      const sev   = taf.worstSeverity ?? 'none';
      const badge = SEVERITY_BADGE[sev];
      const label = SEVERITY_LABEL[sev];

      const threatsList = taf.threats.length > 0
        ? taf.threats.map(t => `
          <div class="mb-2 pb-2 border-b border-gray-100 last:border-0">${renderThreatBadge(t)}</div>`
          ).join('')
        : `<div class="text-xs text-green-600 font-medium py-1">✅ Aucun phénomène significatif sur ce TAF</div>`;

      const tafId = 'base-taf-raw-' + taf.icao;

      return `
        <div class="bg-white border ${sev === 'none' ? 'border-green-200' : sev === 'red' ? 'border-red-300' : 'border-orange-200'} rounded-xl p-4 shadow-sm">
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <span class="${badge} px-2 py-0.5 rounded text-xs font-bold">${label}</span>
            <span class="font-mono font-bold text-gray-800 text-base">${taf.iata}</span>
            <span class="text-gray-400 font-mono text-sm">${taf.icao}</span>
            <span class="text-gray-600 text-sm">${taf.name}</span>
          </div>
          ${renderTafTimeline(taf)}
          <div class="mt-2">${threatsList}</div>
          <div class="mt-3">
            <button
              class="text-xs text-gray-400 hover:text-gray-600 font-semibold flex items-center gap-1"
              onclick="(function(btn){
                var el = document.getElementById('${tafId}');
                el.classList.toggle('hidden');
                btn.innerHTML = el.classList.contains('hidden')
                  ? '▶ Afficher TAF brut'
                  : '▼ Masquer TAF brut';
              })(this)">
              ▶ Afficher TAF brut
            </button>
            <div id="${tafId}" class="hidden mt-2 font-mono text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600" style="white-space:pre-wrap;word-break:break-word">${formatTafRaw(taf.rawTaf)}</div>
          </div>
        </div>`;
    }).join('');

    const allThreats  = tafsToRender.flatMap(t => t.threats);
    const redCount    = allThreats.filter(t => t.severity === 'red').length;
    const orangeCount = allThreats.filter(t => t.severity === 'orange').length;

    return `
      <section class="mt-8 pt-6 border-t border-gray-200">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900">🏠 État base CDG / ORY</h2>
            <p class="text-gray-500 text-sm mt-0.5">TAF actifs sur notre base — frise 24h. Hors croisement vols LC.</p>
          </div>
          <div class="flex gap-2 text-xs">
            ${redCount    ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">🔴 ${redCount} menace${redCount > 1 ? 's' : ''}</span>` : ''}
            ${orangeCount ? `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">🟠 ${orangeCount} menace${orangeCount > 1 ? 's' : ''}</span>` : ''}
            ${allThreats.length === 0 ? '<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">✅ Aucune menace</span>' : ''}
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cards}</div>
      </section>`;
  }

  // ── Vols AF : chargement section ────────────────────────────────────────────────
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

      const { hits, baseHits, baseTafs } = await res.json();

      const red    = hits.filter(h => h.threat.severity === 'red').length;
      const orange = hits.filter(h => h.threat.severity === 'orange').length;
      if (countersEl) {
        countersEl.innerHTML = [
          red    ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">🔴 ${red}</span>` : '',
          orange ? `<span class="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">🟠 ${orange}</span>` : '',
          hits.length ? `<span class="text-gray-400 text-xs">Total ${hits.length} vol${hits.length > 1 ? 's' : ''}</span>` : '',
        ].join('');
      }

      let mainHtml;
      if (hits.length === 0) {
        mainHtml = `
          <div class="text-gray-400 text-sm py-4">
            Aucun vol AF LC actuellement dans une fenêtre de menace TAF détectée.
          </div>`;
      } else {
        mainHtml = `
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
          </div>`;
      }

      const baseSectionHtml = renderBaseSection(baseHits, baseTafs);
      const isWide = window.matchMedia('(min-width: 1280px)').matches;
      const baseBodyEl = document.getElementById('base-status-body');

      if (isWide && baseBodyEl) {
        container.innerHTML = mainHtml + lastUpdateBar();
        baseBodyEl.innerHTML = baseSectionHtml;
      } else {
        container.innerHTML = mainHtml + baseSectionHtml + lastUpdateBar();
      }
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

  // ── Init ────────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadTafRisks();
    loadTafVolRisks();
    setInterval(() => { loadTafVolRisks(); }, 20 * 60 * 1000);
    setInterval(() => { loadTafRisks();    },  5 * 60 * 1000);
  });

})();
