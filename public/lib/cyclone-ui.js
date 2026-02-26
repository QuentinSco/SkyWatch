(function () {

  const SEV_BADGE = {
    red:    'bg-red-600 text-white',
    orange: 'bg-orange-500 text-white',
    yellow: 'bg-yellow-400 text-black',
  };

  const CAT_LABEL = {
    TD:    { text: 'Dépression tropicale', icon: '🌀' },
    TS:    { text: 'Tempête tropicale',    icon: '🌪' },
    C1:    { text: 'Ouragan Cat.1',         icon: '🌀' },
    C2:    { text: 'Ouragan Cat.2',         icon: '🌀' },
    C3:    { text: 'Ouragan Cat.3',         icon: '🌀' },
    C4:    { text: 'Ouragan Cat.4',         icon: '🌀' },
    C5:    { text: 'Ouragan Cat.5',         icon: '🌀' },
    TC:    { text: 'Cyclone tropical',      icon: '🌀' },
    STD:   { text: 'Dép. subtropicale',    icon: '🌫' },
    STS:   { text: 'Tempête subtropicale',  icon: '🌫' },
    INVEST:{ text: 'Zone à surveiller',    icon: '🔍' },
  };

  // Couleur du badge catégorie (distinct du badge sévérité)
  const CAT_CLS = {
    TD:    'bg-blue-100 text-blue-700 border border-blue-300',
    TS:    'bg-orange-100 text-orange-700 border border-orange-300',
    C1:    'bg-red-100 text-red-700 border border-red-300',
    C2:    'bg-red-200 text-red-800 border border-red-400',
    C3:    'bg-red-300 text-red-900 border border-red-500',
    C4:    'bg-red-500 text-white border border-red-700',
    C5:    'bg-red-700 text-white border border-red-900',
    TC:    'bg-purple-100 text-purple-700 border border-purple-300',
    STD:   'bg-gray-100 text-gray-600 border border-gray-300',
    STS:   'bg-gray-200 text-gray-700 border border-gray-400',
    INVEST:'bg-yellow-100 text-yellow-700 border border-yellow-300',
  };

  function fmtPos(b) {
    if (!b.position || (b.position.lat === 0 && b.position.lon === 0)) return '—';
    const latStr = Math.abs(b.position.lat).toFixed(1) + (b.position.lat >= 0 ? 'N' : 'S');
    const lonStr = Math.abs(b.position.lon).toFixed(1) + (b.position.lon >= 0 ? 'E' : 'W');
    return `${latStr} ${lonStr}`;
  }

  function renderAffected(icaos) {
    if (!icaos || icaos.length === 0) return '<span class="text-gray-400 italic">Aucun aéroport AF dans un rayon de 500km</span>';
    return icaos.map(icao =>
      `<span class="bg-red-50 border border-red-200 text-red-700 text-xs font-mono px-1.5 py-0.5 rounded">${icao}</span>`
    ).join(' ');
  }

  function renderCard(b, idx) {
    const sev  = SEV_BADGE[b.severity]  ?? SEV_BADGE.yellow;
    const cat  = CAT_LABEL[b.category] ?? { text: b.category, icon: '🌀' };
    const catCls = CAT_CLS[b.category] ?? CAT_CLS.TD;
    const detailId = `cyc-detail-${idx}`;
    const pubDate = b.publishedAt ? new Date(b.publishedAt).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    }) + 'Z' : '—';

    return `
      <!-- Carte cyclone : clic pour détail -->
      <div class="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <!-- En-tête cliquable -->
        <div class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
             onclick="document.getElementById('${detailId}').classList.toggle('hidden')">
          <span class="${sev} text-xs font-bold px-2 py-0.5 rounded uppercase">${b.severity.toUpperCase()}</span>
          <span class="text-lg font-bold text-gray-900">${cat.icon} ${b.name}</span>
          <span class="${catCls} text-xs font-semibold px-2 py-0.5 rounded">${cat.text}</span>
          <span class="text-xs text-gray-500 ml-auto">${b.basin} — ${b.source}</span>
          <span class="text-gray-400 text-sm">▼</span>
        </div>

        <!-- Rangée résumée -->
        <div class="flex flex-wrap items-center gap-4 px-4 pb-3 text-xs text-gray-700 border-t border-gray-100">
          <span>💨 <strong>${b.windKt} kt</strong></span>
          <span>📍 <strong>${fmtPos(b)}</strong></span>
          ${b.movingToward ? `<span>➜ ${b.movingToward}</span>` : ''}
          <span class="text-gray-400">Bulletin : ${pubDate}</span>
          ${b.link ? `<a href="${b.link}" target="_blank" rel="noopener" class="text-blue-500 hover:underline ml-auto">Bulletin officiel ↗</a>` : ''}
        </div>

        <!-- Détail dépliable -->
        <div id="${detailId}" class="hidden border-t border-gray-100 px-4 py-3 bg-gray-50 text-xs">
          <div class="mb-2 font-semibold text-gray-600 uppercase text-[10px] tracking-wide">Aéroports AF réseau dans le rayon 500km</div>
          <div class="flex flex-wrap gap-1 mb-3">${renderAffected(b.affectedAirports)}</div>
          ${b.headline ? `<div class="italic text-gray-500">${b.headline}</div>` : ''}
        </div>
      </div>`;
  }

  async function loadCyclones() {
    const container  = document.getElementById('cyclone-main');
    const counterEl  = document.getElementById('cyclone-counter');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center gap-2 text-gray-400 text-sm py-4">
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Chargement des bulletins cycloniques…
      </div>`;

    try {
      const res = await fetch('/api/cyclones');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const bulletins = await res.json();

      if (counterEl) {
        const red    = bulletins.filter(b => b.severity === 'red').length;
        const orange = bulletins.filter(b => b.severity === 'orange').length;
        counterEl.innerHTML = [
          red    ? `<span class="bg-red-100 text-red-700 font-semibold text-xs px-3 py-1 rounded-full">🔴 ${red}</span>` : '',
          orange ? `<span class="bg-orange-100 text-orange-700 font-semibold text-xs px-3 py-1 rounded-full">🟠 ${orange}</span>` : '',
          bulletins.length === 0 ? `<span class="text-green-600 text-xs font-semibold">✅ Aucun système actif</span>` : '',
        ].join('');
      }

      if (bulletins.length === 0) {
        container.innerHTML = `
          <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
            ✅ Aucun système cyclonique actif sur les bassins surveillés (Atlantique, Pac. Est, Oc. Indien, Pac. Ouest).
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="text-xs text-gray-400 mb-3">
          ${bulletins.length} système${bulletins.length > 1 ? 's' : ''} actif${bulletins.length > 1 ? 's' : ''}
          — Sources&nbsp;: NHC (NOAA) · RSMC La Réunion (Météo-France) · JTWC (US Navy)
        </div>
        <div class="flex flex-col gap-3">
          ${bulletins.map((b, i) => renderCard(b, i)).join('')}
        </div>`;

    } catch (e) {
      container.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ Erreur lors du chargement des bulletins cycloniques : ${e.message}
        </div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', loadCyclones);

})();
