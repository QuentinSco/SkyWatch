// src/pages/api/backup-upload.ts
import type { APIRoute } from 'astro';
import { redis } from '../../lib/redis';
import { parseCsvBackup } from '../../lib/csvBackupParser';

export const prerender = false;

export const KV_BACKUP_KEY      = 'af_backup_flights';
export const KV_BACKUP_MODE_KEY = 'af_backup_mode';
const KV_BACKUP_TTL_SEC         = 30 * 60 * 60; // 30 h

// Clé du cache taf-vol-risks — doit correspondre à TAF_VOL_CACHE_KEY dans taf-vol-risks.ts
const TAF_VOL_CACHE_KEY = 'taf_vol_risks_cache_v3';

const kv = redis;

// CORS permissif pour cet endpoint interne
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── OPTIONS (preflight) ────────────────────────────────────────────────
export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

// ── GET : statut du mode backup ──────────────────────────────────────
export const GET: APIRoute = async () => {
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };
  if (!kv) {
    return new Response(JSON.stringify({ active: false, error: 'KV non disponible' }), { headers });
  }
  try {
    const active = await kv.get<boolean>(KV_BACKUP_MODE_KEY);
    if (!active) {
      return new Response(JSON.stringify({ active: false }), { headers });
    }
    const cache = await kv.get<{ uploadedAt: number; filename: string; flights: unknown[] }>(KV_BACKUP_KEY);
    return new Response(JSON.stringify({
      active:      true,
      uploadedAt:  cache?.uploadedAt  ?? null,
      filename:    cache?.filename    ?? null,
      flightCount: cache?.flights?.length ?? 0,
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ active: false, error: String(e) }), { status: 500, headers });
  }
};

// ── POST : upload CSV { csv, filename } ou désactivation { action: 'disable' } ──
export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };

  if (!kv) {
    return new Response(JSON.stringify({ ok: false, error: 'KV non disponible' }), { status: 503, headers });
  }

  try {
    let body: { action?: string; csv?: string; filename?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Body JSON invalide' }), { status: 400, headers });
    }

    // ── Désactivation du mode backup ────────────────────────────────────────
    if (body?.action === 'disable') {
      await Promise.all([
        kv.del(KV_BACKUP_MODE_KEY),
        // Invalider le cache taf-vol-risks qui contient backupMode:true
        // Sans ça, le cache (TTL 20min) continuerait à renvoyer backupMode:true
        // après désactivation, jusqu'à son expiration naturelle.
        kv.del(TAF_VOL_CACHE_KEY),
      ]);
      console.log('[backup-upload] Mode backup désactivé');
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // ── Upload CSV ───────────────────────────────────────────────────────────
    const csvText = body?.csv ?? '';
    const filename = body?.filename ?? 'upload.csv';

    if (!csvText.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'CSV vide' }), { status: 400, headers });
    }

    const cache = parseCsvBackup(csvText, filename);

    await Promise.all([
      kv.set(KV_BACKUP_KEY,      cache, { ex: KV_BACKUP_TTL_SEC }),
      kv.set(KV_BACKUP_MODE_KEY, true,  { ex: KV_BACKUP_TTL_SEC }),
      // Invalider le cache taf-vol-risks pour forcer un rechargement avec les nouveaux vols
      kv.del(TAF_VOL_CACHE_KEY),
    ]);

    console.log(`[backup-upload] ${cache.flights.length} vols stockés (source: ${filename})`);

    return new Response(JSON.stringify({
      ok:          true,
      flightCount: cache.flights.length,
      rowCount:    cache.rowCount,
      filename,
      uploadedAt:  cache.uploadedAt,
    }), { headers });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[backup-upload] Erreur parse:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 400, headers });
  }
};
