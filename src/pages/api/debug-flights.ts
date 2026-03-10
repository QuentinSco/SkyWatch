// src/pages/api/debug-flights.ts
// ⚠️  Route de DIAGNOSTIC temporaire — à supprimer après investigation
import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url:   import.meta.env.KV_REST_API_URL,
  token: import.meta.env.KV_REST_API_TOKEN,
});

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const icaoFilter = url.searchParams.get('icao')?.toUpperCase() ?? null;

  try {
    const cache = await kv.get<{ flights: any[]; fetchedAt: number; quotaExceeded?: boolean }>('af_flights_cache');

    if (!cache) {
      return new Response(JSON.stringify({ error: 'Cache vide ou absent', flights: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const flights = Array.isArray(cache.flights) ? cache.flights : [];

    // Stats globales
    const arr = flights.filter((f: any) => !f.movementType || f.movementType === 'A');
    const dep = flights.filter((f: any) => f.movementType === 'D');
    const icaos = [...new Set(flights.map((f: any) => f.icao))].sort();

    // Filtre optionnel par ICAO
    const filtered = icaoFilter ? flights.filter((f: any) => f.icao === icaoFilter) : flights;

    return new Response(JSON.stringify({
      fetchedAt:     new Date(cache.fetchedAt).toISOString(),
      quotaExceeded: cache.quotaExceeded ?? false,
      totalFlights:  flights.length,
      arrCount:      arr.length,
      depCount:      dep.length,
      icaosPresents: icaos,
      icaoFilter,
      results:       filtered.map((f: any) => ({
        flightId:               f.flightId,
        flightNumber:           f.flightNumber,
        movementType:           f.movementType,
        iata:                   f.iata,
        icao:                   f.icao,
        aircraftType:           f.aircraftType,
        isLongHaul:             f.isLongHaul,
        registration:           f.registration,
        scheduledArrival:       f.scheduledArrival,
        estimatedTouchDownTime: f.estimatedTouchDownTime,
      })),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
