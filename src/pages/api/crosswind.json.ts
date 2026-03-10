// src/pages/api/crosswind.json.ts
//
// Endpoint dédié à la page crosswind.
// Retourne LC + MC + CC (lcOnly = false) — pas de filtre métier ici.
// Le filtre LC est géré côté taf-vol-risks (page d'accueil).

import type { APIRoute } from 'astro';
import { getCachedAfArrivals }             from '../../lib/afFlights';
import { fetchTafRisks, AF_AIRPORT_ICAOS } from '../../lib/tafParser';
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url:   import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export const GET: APIRoute = async ({ url }) => {
  const force = url.searchParams.get('force') === '1';

  // ICAO demandés par le client
  const icaosParam      = url.searchParams.get('icaos') ?? '';
  const requestedIcaos  = icaosParam
    ? icaosParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : null; // null = tous

  try {
    // ── Vols AF : LC + MC (lcOnly = false) ───────────────────────────────────
    const allFlights = await getCachedAfArrivals(force, /* lcOnly = */ false);

    const now = Date.now();
    const flights = allFlights.filter(f => {
      if (f.aircraftType === 'BUS') return false;
      const eta = new Date(f.estimatedTouchDownTime ?? f.scheduledArrival).getTime();
      return eta > now - 30 * 60 * 1000;
    });

    // ── TAF bruts (cache Redis 30min) ────────────────────────────────────────
    const TAF_CACHE_KEY = 'taf_raw_cache_v2';
    let tafByIcao: Record<string, any> = {};

    if (!force) {
      try {
        const cached = await kv.get<Record<string, any>>(TAF_CACHE_KEY);
        if (cached) tafByIcao = cached;
      } catch { /* refetch */ }
    }

    if (Object.keys(tafByIcao).length === 0) {
      const [tafRisks, rawFcsts] = await Promise.all([
        fetchTafRisks(force),
        (async () => {
          try {
            const icaoList = AF_AIRPORT_ICAOS.join(',');
            const r = await fetch(
              `https://aviationweather.gov/api/data/taf?ids=${icaoList}&format=json&metar=false&taf=true`,
              { signal: AbortSignal.timeout(15000) }
            );
            return r.ok ? (await r.json() as any[]) : [];
          } catch { return []; }
        })(),
      ]);

      const rawByIcao: Record<string, any> = {};
      for (const t of rawFcsts) {
        const icao = t.icaoId ?? t.stationId;
        if (icao) rawByIcao[icao] = t;
      }

      for (const risk of tafRisks) {
        tafByIcao[risk.icao] = {
          icao:    risk.icao,
          iata:    risk.iata,
          name:    risk.name,
          rawTaf:  risk.rawTaf,
          threats: risk.threats,
          fcsts:   rawByIcao[risk.icao]?.fcsts ?? [],
        };
      }
      for (const [icao, raw] of Object.entries(rawByIcao)) {
        if (!tafByIcao[icao] && (raw as any).fcsts?.length) {
          tafByIcao[icao] = {
            icao,
            iata:    (raw as any).iataId ?? icao,
            name:    icao,
            rawTaf:  (raw as any).rawTAF ?? '',
            threats: [],
            fcsts:   (raw as any).fcsts,
          };
        }
      }

      try { await kv.set(TAF_CACHE_KEY, tafByIcao, { ex: 30 * 60 }); } catch { /* non-fatal */ }
    }

    // Filtrer selon la demande client
    const filteredTafs: Record<string, any> = {};
    for (const [icao, taf] of Object.entries(tafByIcao)) {
      if (!requestedIcaos || requestedIcaos.includes(icao)) {
        filteredTafs[icao] = taf;
      }
    }

    const flightsByIcao: Record<string, any[]> = {};
    for (const f of flights) {
      if (requestedIcaos && !requestedIcaos.includes(f.icao)) continue;
      if (!flightsByIcao[f.icao]) flightsByIcao[f.icao] = [];
      flightsByIcao[f.icao].push(f);
    }

    return new Response(JSON.stringify({ tafs: filteredTafs, flights: flightsByIcao }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[crosswind API] error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
