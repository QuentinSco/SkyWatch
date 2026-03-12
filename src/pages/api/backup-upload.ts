// src/pages/api/backup-upload.ts
import type { APIRoute } from 'astro';
import { redis } from '../../lib/redis';
import { parseCsvBackup } from '../../lib/csvBackupParser';

export const prerender = false;

export const KV_BACKUP_KEY      = 'af_backup_flights';
export const KV_BACKUP_MODE_KEY = 'af_backup_mode';
const KV_BACKUP_TTL_SEC         = 30 * 60 * 60; // 30 h

// Clés de cache à purger lors du basculement backup ON/OFF
// → garantit que toutes les pages rechargent depuis la bonne source immédiatement
const TAF_VOL_CACHE_KEY  = 'taf_vol_risks_cache_v3';
const AF_FLIGHTS_KEY     = 'af_flights_cache';
const BRIEFING_CACHE_KEY = 'briefing_cache_v4';

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
        // Purger tous les caches dérivés pour forcer un rechargement
        // depuis l'API AF dès la prochaine requête
        kv.del(TAF_VOL_CACHE_KEY),
        kv.del(AF_FLIGHTS_KEY),
        kv.del(BRIEFING_CACHE_KEY),
      ]);
      console.log('[backup-upload] Mode backup désactivé — caches purgés (af_flights, taf_vol_risks, briefing)');
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
      // Purger tous les caches dérivés pour forcer un rechargement
      // immédiat depuis le CSV backup dans toutes les pages
      kv.del(TAF_VOL_CACHE_KEY),
      kv.del(AF_FLIGHTS_KEY),
      kv.del(BRIEFING_CACHE_KEY),
    ]);

    console.log(`[backup-upload] ${cache.flights.length} vols stockés (source: ${filename}) — caches purgés (af_flights, taf_vol_risks, briefing)`);

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
