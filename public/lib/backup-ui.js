(function () {
  'use strict';

  // ── État local ───────────────────────────────────────────────────────────────────
  let _backupActive  = false;
  let _backupInfo    = null; // { uploadedAt, filename, flightCount }
  let _uploading     = false;

  // ── Helpers ─────────────────────────────────────────────────────────────────────
  function fmtTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  // ── Rendu du widget ──────────────────────────────────────────────────────────────
  function render() {
    const el = document.getElementById('backup-widget');
    if (!el) return;

    if (!_backupActive) {
      // Affichage minimal : juste un lien discret
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-gray-300 dark:text-gray-700 text-[10px] select-none">⚡ Mode backup :</span>
          <label class="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="file"
              id="backup-file-input"
              accept=".csv,text/csv,text/plain"
              class="hidden"
            />
            <span
              id="backup-upload-btn"
              class="text-[10px] text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 underline cursor-pointer transition"
              onclick="document.getElementById('backup-file-input').click()"
            >
              ${_uploading ? '⏳ Chargement…' : 'Charger un CSV'}
            </span>
          </label>
        </div>`;

      document.getElementById('backup-file-input')
        ?.addEventListener('change', onFileSelected);

    } else {
      // Mode backup actif : badge visible + infos + bouton désactiver
      const info = _backupInfo;
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
            ⚠️ Mode backup CSV actif
          </span>
          ${info ? `
            <span class="text-[10px] text-gray-500 dark:text-gray-400">
              ${info.flightCount} vols — ${info.filename} — chargé ${fmtTime(info.uploadedAt)}
            </span>` : ''}
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="file"
              id="backup-file-input"
              accept=".csv,text/csv,text/plain"
              class="hidden"
            />
            <span
              class="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 underline cursor-pointer transition"
              onclick="document.getElementById('backup-file-input').click()"
            >Remplacer</span>
          </label>
          <button
            id="backup-disable-btn"
            class="text-[10px] text-red-400 hover:text-red-600 underline transition"
          >Désactiver</button>
        </div>`;

      document.getElementById('backup-file-input')
        ?.addEventListener('change', onFileSelected);
      document.getElementById('backup-disable-btn')
        ?.addEventListener('click', onDisable);
    }
  }

  // ── Banner dans la section Vols ──────────────────────────────────────────────────
  function updateBackupBanner(active, info) {
    const existing = document.getElementById('backup-mode-banner');
    if (!active) {
      if (existing) existing.remove();
      return;
    }
    const container = document.getElementById('taf-vol-main');
    if (!container) return;

    const html = `
      <div id="backup-mode-banner"
           class="mb-3 flex items-center gap-2 flex-wrap bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
        <span class="font-semibold">⚠️ Mode backup CSV</span>
        <span class="text-amber-600 dark:text-amber-400">— API Air France indisponible. Vols issus du fichier :</span>
        <span class="font-mono">${info?.filename ?? 'CSV'}</span>
        ${info ? `<span class="text-amber-500">(${info.flightCount} vols, chargé ${fmtTime(info.uploadedAt)})</span>` : ''}
      </div>`;

    if (existing) {
      existing.outerHTML = html;
    } else {
      container.insertAdjacentHTML('afterbegin', html);
    }
  }

  // Exposé pour taf-ui.js
  window.backupUI = { updateBackupBanner };

  // ── Handlers ─────────────────────────────────────────────────────────────────────
  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  }

  async function uploadFile(file) {
    _uploading = true;
    render();

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/backup-upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!json.ok) throw new Error(json.error ?? 'Erreur upload');

      _backupActive = true;
      _backupInfo   = { uploadedAt: json.uploadedAt, filename: json.filename, flightCount: json.flightCount };

      render();
      updateBackupBanner(true, _backupInfo);

      // Relancer le calcul TAF-vol avec les nouvelles données
      if (typeof window.loadTafVolRisks === 'function') {
        window.loadTafVolRisks();
      }
    } catch (err) {
      _uploading = false;
      render();
      alert('Erreur lors du chargement du CSV : ' + err.message);
    } finally {
      _uploading = false;
    }
  }

  async function onDisable() {
    try {
      await fetch('/api/backup-upload', { method: 'DELETE' });
    } catch { /* silencieux */ }
    _backupActive = false;
    _backupInfo   = null;
    render();
    updateBackupBanner(false, null);
    if (typeof window.loadTafVolRisks === 'function') {
      window.loadTafVolRisks();
    }
  }

  // ── Init : vérification du statut au chargement ─────────────────────────────────
  async function init() {
    try {
      const res  = await fetch('/api/backup-upload');
      const json = await res.json();
      if (json.active) {
        _backupActive = true;
        _backupInfo   = { uploadedAt: json.uploadedAt, filename: json.filename, flightCount: json.flightCount };
      }
    } catch { /* silencieux */ }
    render();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
