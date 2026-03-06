// src/pages/api/chainages.ts
import type { APIRoute } from 'astro';
import { getCachedAfFlights } from '../../lib/afFlights';
import { AF_IATA_TO_ICAO }   from '../../lib/tafParser';

export const prerender = false;

function ms(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}

export interface ChainageStop {
  registration: string;
  aircraftType: string;
  iata:         string;
  arrFlight:    string;
  depFlight:    string | null;
  arrMs:        number;
  depMs:        number | null;
}

export const GET: APIRoute = async ({ url }) => {
  const raw = url.searchParams.get('airports') ?? '';
  const inputCodes = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (inputCodes.length === 0) {
    return new Response(JSON.stringify({ error: 'Paramètre airports manquant' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetIcaos = new Set<string>();
  for (const code of inputCodes) {
    if (code.length === 4) targetIcaos.add(code);
    else { const icao = AF_IATA_TO_ICAO[code]; if (icao) targetIcaos.add(icao); }
  }

  // ── Plage horaire : par défaut 24h glissantes, ou personnalisée ───────────────
  const now = Date.now();
  let wStart: number;
  let wEnd: number;

  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  if (startParam && endParam) {
    const customStart = ms(startParam);
    const customEnd = ms(endParam);
    if (customStart === null || customEnd === null || customEnd <= customStart) {
      return new Response(JSON.stringify({ error: 'Paramètres start/end invalides' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    wStart = customStart;
    wEnd = customEnd;
  } else {
    wStart = now;
    wEnd = now + 24 * 60 * 60 * 1000;
  }

  try {
    // getCachedAfFlights retourne AfFlightArrival[] (tableau plat, pas {arrivals, departures})
    const allFlights = await getCachedAfFlights(false);

    // Filtrer arrivées dans la fenêtre sur les aéroports cibles
    // (avec marge de 2h avant pour capturer les avions déjà au sol)
    const windowArrivals = allFlights.filter(f => {
      const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      return t !== null && t >= wStart - 2 * 60 * 60 * 1000 && t <= wEnd && targetIcaos.has(f.icao);
    });

    // Index des prochains départs par immatriculation :
    // Pour chaque vol arrivant, on cherche dans l'ensemble des vols
    // le prochain vol de la même immatriculation AU MÊME aéroport,
    // dont la STA/ETA est APRÈS l'arrivée de ce vol.
    // On construit un index reg-icao → vol avec la plus petite STD après l'arrivée.
    const depCandidates = new Map<string, typeof allFlights[number]>();
    for (const f of allFlights) {
      const reg = (f.registration ?? '').toUpperCase();
      if (!reg || !f.icao) continue;
      // Un "départ" est un vol dont l'aéroport de départ (departureIata / icao source) est notre escale.
      // Dans la structure AF, chaque enregistrement est une ARRIVÉE sur f.icao.
      // Le prochain départ de la même immatriculation depuis cet aéroport correspond
      // à un autre vol de la même reg arrivant depuis cet aéroport... 
      // Mais l'API n'expose pas directement les départs.
      // On utilise donc les champs de départ embarqués dans l'arrivée :
      // f.scheduledDeparture / f.estimatedOffBlockTime correspondent au départ du tronçon.
      // Pour le chaînage, le vol ARRIVANT sur l'escale EST précédé d'un tronçon depuis une autre escale.
      // Le chaînage cherche : après l'atterrissage, quel est le prochain vol AU DÉPART de l'escale ?
      // On approxime en cherchant un autre vol de même reg avec une STA proche de la STD cherchée.
      const key = `${reg}-${f.icao}`;
      const existing = depCandidates.get(key);
      const fMs = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
      const exMs = existing ? ms(existing.estimatedTouchDownTime ?? existing.scheduledArrival) : null;
      // On garde le vol le plus tôt par reg-icao (candidat départ = prochain mouvement)
      if (!existing || (fMs !== null && exMs !== null && fMs < exMs)) {
        depCandidates.set(key, f);
      }
    }

    const stops: ChainageStop[] = [];
    for (const arr of windowArrivals) {
      const reg   = (arr.registration ?? 'UNKNOWN').toUpperCase();
      const arrMs = ms(arr.estimatedTouchDownTime ?? arr.scheduledArrival)!;

      // Chercher un autre vol de même immatriculation arrivant sur le même aéroport APRÈS arrMs
      // => c'est le prochain tronçon (départ de l'escale vers ailleurs)
      const nextFlight = allFlights
        .filter(f => {
          if ((f.registration ?? '').toUpperCase() !== reg) return false;
          if (f.icao !== arr.icao) return false;
          if (f.flightNumber === arr.flightNumber) return false;
          const t = ms(f.estimatedTouchDownTime ?? f.scheduledArrival);
          return t !== null && t > arrMs;
        })
        .sort((a, b) => {
          const ta = ms(a.estimatedTouchDownTime ?? a.scheduledArrival)!;
          const tb = ms(b.estimatedTouchDownTime ?? b.scheduledArrival)!;
          return ta - tb;
        })[0] ?? null;

      // depMs : on utilise la STD/EOBT du vol suivant si dispo, sinon son ETA
      const depMs = nextFlight
        ? (ms(nextFlight.scheduledDeparture ?? null) ?? ms(nextFlight.estimatedTouchDownTime ?? nextFlight.scheduledArrival))
        : null;

      stops.push({
        registration: reg,
        aircraftType: arr.aircraftType ?? '',
        iata:         arr.iata,
        arrFlight:    `AF${arr.flightNumber}`,
        depFlight:    nextFlight ? `AF${nextFlight.flightNumber}` : null,
        arrMs,
        depMs,
      });
    }

    stops.sort((a, b) => a.arrMs - b.arrMs);

    return new Response(
      JSON.stringify({ stops, generatedAt: new Date().toISOString(), windowStart: wStart, windowEnd: wEnd }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[API /chainages]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
