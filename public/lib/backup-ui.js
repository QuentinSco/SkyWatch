(function () {
  'use strict';

  let _backupActive = false;
  let _backupInfo   = null;
  let _uploading    = false;

  function fmtTime(ts) {
    if (!ts) return '\u2014';
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC',
    }) + 'Z';
  }

  // ── File input partagé ───────────────────────────────────────────────────────
  // Un seul <input type=file> dans le DOM, jamais recréé → pas de double déclenchement
  const _fileInput = document.createElement('input');
  _fileInput.type   = 'file';
  _fileInput.accept = '.csv,text/csv,text/plain';
  _fileInput.style.display = 'none';
  _fileInput.addEventListener('change', function () {
    const file = _fileInput.files?.[0];
    _fileInput.value = ''; // reset pour permettre de recharger le même fichier
    if (file) uploadFile(file);
  });
  document.body.appendChild(_fileInput);

  function openPicker() { _fileInput.click(); }

  // ── Rendu du widget footer ───────────────────────────────────────────────────
  function render() {
    const el = document.getElementById('backup-widget');
    if (!el) return;

    if (!_backupActive) {
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-gray-300 dark:text-gray-700 text-[10px] select-none">⚡ Mode backup :</span>
          <button
            class="text-[10px] text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 underline cursor-pointer transition bg-transparent border-none p-0"
            id="backup-open-btn"
          >${_uploading ? '\u23f3 Chargement\u2026' : 'Charger un CSV'}</button>
        </div>`;
    } else {
      const info = _backupInfo;
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
            \u26a0\ufe0f Mode backup CSV actif
          </span>
          ${info ? `<span class="text-[10px] text-gray-500 dark:text-gray-400">${info.flightCount}\u00a0vols \u2014 ${info.filename} \u2014 charg\u00e9 ${fmtTime(info.uploadedAt)}</span>` : ''}
          <button
            class="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 underline cursor-pointer transition bg-transparent border-none p-0"
            id="backup-open-btn"
          >Remplacer</button>
          <button
            class="text-[10px] text-red-400 hover:text-red-600 underline transition bg-transparent border-none p-0"
            id="backup-disable-btn"
          >D\u00e9sactiver</button>
        </div>`;
      document.getElementById('backup-disable-btn')?.addEventListener('click', onDisable);
    }
    document.getElementById('backup-open-btn')?.addEventListener('click', openPicker);
  }

  // ── Banner dans la section Vols ──────────────────────────────────────────────
  function updateBackupBanner(active, info) {
    const existing = document.getElementById('backup-mode-banner');
    if (!active) { if (existing) existing.remove(); return; }
    const container = document.getElementById('taf-vol-main');
    if (!container) return;
    const html = `
      <div id="backup-mode-banner"
           class="mb-3 flex items-center gap-2 flex-wrap bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
        <span class="font-semibold">\u26a0\ufe0f Mode backup CSV</span>
        <span class="text-amber-600 dark:text-amber-400">\u2014 API Air France indisponible. Vols issus du fichier\u00a0:</span>
        <span class="font-mono">${info?.filename ?? 'CSV'}</span>
        ${info ? `<span class="text-amber-500">(${info.flightCount}\u00a0vols LC, charg\u00e9 ${fmtTime(info.uploadedAt)})</span>` : ''}
      </div>`;
    if (existing) { existing.outerHTML = html; }
    else { container.insertAdjacentHTML('afterbegin', html); }
  }

  window.backupUI = { updateBackupBanner };

  // ── Upload ─────────────────────────────────────────────────────────────────────
  async function uploadFile(file) {
    _uploading = true;
    render();
    try {
      const csvText = await file.text();
      const res = await fetch('/api/backup-upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ csv: csvText, filename: file.name }),
      });
      const rawText = await res.text();
      let json;
      try { json = JSON.parse(rawText); }
      catch { throw new Error('Réponse serveur invalide : ' + rawText.slice(0, 120)); }
      if (!json.ok) throw new Error(json.error ?? 'Erreur upload');

      _backupActive = true;
      _backupInfo   = { uploadedAt: json.uploadedAt, filename: json.filename, flightCount: json.flightCount };
      render();
      updateBackupBanner(true, _backupInfo);
      if (typeof window.loadTafVolRisks === 'function') window.loadTafVolRisks();
    } catch (err) {
      alert('Erreur lors du chargement du CSV\u00a0: ' + (err.message ?? err));
    } finally {
      _uploading = false;
      render();
    }
  }

  async function onDisable() {
    try { await fetch('/api/backup-upload', { method: 'DELETE' }); } catch { /* silencieux */ }
    _backupActive = false;
    _backupInfo   = null;
    render();
    updateBackupBanner(false, null);
    if (typeof window.loadTafVolRisks === 'function') window.loadTafVolRisks();
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
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
