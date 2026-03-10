// src/pages/api/backup-upload.ts
// Endpoint POST : reçoit le CSV AF, le parse et stocke en KV.
// Active le flag backupMode pour que taf-vol-risks l'utilise.

import type { APIRoute } from 'astro';
import { redis } from '../../lib/redis';
import { parseCsvBackup } from '../../lib/csvBackupParser';

export const prerender = false;

export const KV_BACKUP_KEY      = 'af_backup_flights';
export const KV_BACKUP_MODE_KEY = 'af_backup_mode';
const KV_BACKUP_TTL_SEC         = 30 * 60 * 60; // 30 h — couvre J et J+1

const kv = redis;

// ── GET : statut du mode backup ───────────────────────────────────────────
export const GET: APIRoute = async () => {
  if (!kv) {
    return new Response(JSON.stringify({ active: false, error: 'KV non disponible' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const active = await kv.get<boolean>(KV_BACKUP_MODE_KEY);
    if (!active) {
      return new Response(JSON.stringify({ active: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const cache = await kv.get<{ uploadedAt: number; filename: string; rowCount: number; flights: unknown[] }>(KV_BACKUP_KEY);
    return new Response(JSON.stringify({
      active: true,
      uploadedAt: cache?.uploadedAt ?? null,
      filename:   cache?.filename   ?? null,
      flightCount: cache?.flights?.length ?? 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ active: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ── POST : upload CSV ─────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  if (!kv) {
    return new Response(JSON.stringify({ ok: false, error: 'KV non disponible' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let csvText = '';
    let filename = 'upload.csv';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ ok: false, error: 'Champ "file" manquant' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      csvText  = await (file as File).text();
      filename = (file as File).name;
    } else {
      // Fallback : body texte brut
      csvText = await request.text();
    }

    if (!csvText.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'Fichier vide' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const cache = parseCsvBackup(csvText, filename);

    await Promise.all([
      kv.set(KV_BACKUP_KEY,      cache,   { ex: KV_BACKUP_TTL_SEC }),
      kv.set(KV_BACKUP_MODE_KEY, true,    { ex: KV_BACKUP_TTL_SEC }),
    ]);

    console.log(`[backup-upload] ${cache.flights.length} vols stockés (source: ${filename})`);

    return new Response(JSON.stringify({
      ok:          true,
      flightCount: cache.flights.length,
      rowCount:    cache.rowCount,
      filename,
      uploadedAt:  cache.uploadedAt,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[backup-upload] Erreur parse:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ── DELETE : désactiver le mode backup ────────────────────────────────────
export const DELETE: APIRoute = async () => {
  if (!kv) {
    return new Response(JSON.stringify({ ok: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    await kv.del(KV_BACKUP_MODE_KEY);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
