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

  // ── Rendu du widget footer ──────────────────────────────────────────────────────
  function render() {
    const el = document.getElementById('backup-widget');
    if (!el) return;

    if (!_backupActive) {
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-gray-300 dark:text-gray-700 text-[10px] select-none">⚡ Mode backup :</span>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="file" id="backup-file-input" accept=".csv,text/csv,text/plain" class="hidden" />
            <span
              class="text-[10px] text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 underline cursor-pointer transition"
              onclick="document.getElementById('backup-file-input').click()"
            >${_uploading ? '\u23f3 Chargement\u2026' : 'Charger un CSV'}</span>
          </label>
        </div>`;
      document.getElementById('backup-file-input')?.addEventListener('change', onFileSelected);
    } else {
      const info = _backupInfo;
      el.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
            \u26a0\ufe0f Mode backup CSV actif
          </span>
          ${info ? `<span class="text-[10px] text-gray-500 dark:text-gray-400">${info.flightCount}\u00a0vols \u2014 ${info.filename} \u2014 charg\u00e9 ${fmtTime(info.uploadedAt)}</span>` : ''}
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="file" id="backup-file-input" accept=".csv,text/csv,text/plain" class="hidden" />
            <span
              class="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 underline cursor-pointer transition"
              onclick="document.getElementById('backup-file-input').click()"
            >Remplacer</span>
          </label>
          <button id="backup-disable-btn" class="text-[10px] text-red-400 hover:text-red-600 underline transition">D\u00e9sactiver</button>
        </div>`;
      document.getElementById('backup-file-input')?.addEventListener('change', onFileSelected);
      document.getElementById('backup-disable-btn')?.addEventListener('click', onDisable);
    }
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
        ${info ? `<span class="text-amber-500">(${info.flightCount}\u00a0vols, charg\u00e9 ${fmtTime(info.uploadedAt)})</span>` : ''}
      </div>`;
    if (existing) { existing.outerHTML = html; }
    else { container.insertAdjacentHTML('afterbegin', html); }
  }

  window.backupUI = { updateBackupBanner };

  // ── Handlers ────────────────────────────────────────────────────────────────────
  function onFileSelected(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    uploadFile(file);
  }

  // Lit le fichier en JS puis envoie le texte en JSON
  // → évite le multipart/form-data bloqué par Vercel ("Cross-site" error)
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

      // Lire la réponse en texte d'abord pour éviter un crash si ce n'est pas du JSON
      const rawText = await res.text();
      let json;
      try { json = JSON.parse(rawText); }
      catch { throw new Error('Réponse serveur invalide : ' + rawText.slice(0, 120)); }

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

  // ── Init ──────────────────────────────────────────────────────────────────────
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
