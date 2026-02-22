import { fetchGDACS }      from '/lib/gdacs.js';
import { fetchNOAA }       from '/lib/noaa.js';
import { fetchMeteoAlarm } from '/lib/meteoalarm.js';
import { renderRegion }    from '/lib/render.js';

const REGIONS = ['AMN', 'AMS', 'AMO', 'EUR', 'ASIE'];
const SEVERITY_ORDER = { red: 0, orange: 1, yellow: 2 };

// Délégation d'événement globale — fonctionne même sur HTML généré dynamiquement
document.addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-detail-id]');
  if (!row) return;
  const idx = row.dataset.detailId;
  const detail = document.getElementById('detail-' + idx);
  if (!detail) return;
  detail.classList.toggle('hidden');
  const chevron = row.querySelector('.chevron');
  if (chevron) chevron.textContent = detail.classList.contains('hidden') ? '▼' : '▲';
});

async function main() {
  const [gdacs, noaa, meteoalarm] = await Promise.all([
    fetchGDACS(), fetchNOAA(), fetchMeteoAlarm()
  ]);

  const all = [...gdacs, ...noaa, ...meteoalarm]
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const red    = all.filter(a => a.severity === 'red').length;
  const orange = all.filter(a => a.severity === 'orange').length;
  const yellow = all.filter(a => a.severity === 'yellow').length;

  document.getElementById('last-update').textContent =
    `Dernière mise à jour : ${new Date().toLocaleString('fr-FR')}`;

  document.getElementById('counters').innerHTML = `
    <span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">${red} rouge${red > 1 ? 's' : ''}</span>
    <span class="bg-orange-400 text-white px-2 py-1 rounded-full text-xs font-semibold">${orange} orange${orange > 1 ? 's' : ''}</span>
    <span class="bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs font-semibold">${yellow} jaune${yellow > 1 ? 's' : ''}</span>
  `;

  document.getElementById('main-content').innerHTML =
    REGIONS.map(r => renderRegion(r, all)).join('');
}

main();
