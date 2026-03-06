// src/pages/api/briefing.ts
// ─── API Trame Briefing CCO ─────────────────────────────────────────────────────────────────────────────────────────
import type { APIRoute } from 'astro';
import { fetchTafRisks }         from '../../lib/tafParser';
import { getCachedAfArrivals }   from '../../lib/afFlights';
import { fetchCycloneBulletins } from '../../lib/cycloneParser';
import { fetchVAAC }             from '../../lib/alertsServer';
import { fetchTailwindStatus }   from '../../lib/tailwindMonitor';
import { fetchRocketLaunches }   from '../../lib/launchParser';

export interface BriefingMeteoLine {
  flight:         string;
  iata:           string;
  name:           string;
  phenomenon:     string;
  severity:       'red' | 'orange' | 'yellow';
  etaZ:           string;
  fenetreZ:       string;
  capaAttenteMin: number | null;
  degagement:     string | null;
}

export interface BriefingData {
  generatedAt:     string;
  meteoHorsEurope: BriefingMeteoLine[];
  tropicale:       { name: string; basin: string; category: string; windKt: number; affected: string[] }[];
  volcanique:      { volcanoName: string; country: string; flLevel: string; vaac: string }[];
  tirsFusee:       { site: string; rocket: string; provider: string; timeZ: string; airports: string[] }[];
  tailwindWatch:   { iata: string; name: string; alert: boolean; currentTW: number | null; runway: string | null; forecastAlerts: any[] }[];
  carburant:       string;
  geopolitique:    string;
  effectifDsp:     string;
}

// ─── Cache mémoire ──────────────────────────────────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
let _cache: { ts: number; data: BriefingData } | null = null;

// ─── Constantes ─────────────────────────────────────────────────────────────────────────────────────────
const EUROPEAN_IATAS = new Set(['CDG', 'ORY', 'NCE', 'LDE', 'DUB', 'PIK']);

const PHENOMENON_LABELS: Record<string, string> = {
  THUNDERSTORM: 'Orages',
  FUNNEL_CLOUD: 'Trombe',
  SNOW:         'Neige',
  FREEZING:     'Précip. verglaçantes',
  HAIL:         'Grêle',
  WIND:         'Vent fort',
  LOW_VIS:      'Visibilité réduite',
  CB_TCU:       'CB/TCU',
  LOW_CEILING:  'Plafond bas',
};

const SEV_ORDER: Record<string, number> = { red: 0, orange: 1, yellow: 2 };

function fmtZ(isoOrUnix: string | number): string {
  const d = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}z`;
}

// ─── Route GET ─────────────────────────────────────────────────────────────────────────────────────────
export const prerender = false;

export const GET: APIRoute = async () => {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return new Response(JSON.stringify(_cache.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const now    = Date.now();
  const now10h = now + 10 * 60 * 60 * 1000;
  const now12h = now + 12 * 60 * 60 * 1000;

  try {
    const [tafRisks, allFlights, cyclones, vaacAlerts, tailwind, launches] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(false),
      fetchCycloneBulletins(),
      fetchVAAC(),
      fetchTailwindStatus(),
      fetchRocketLaunches(),
    ]);

    // ── Météo hors Europe ──────────────────────────────────────────────────────────────────────
    const meteoLines: BriefingMeteoLine[] = [];
    const seen = new Set<string>();

    for (const taf of tafRisks) {
      if (EUROPEAN_IATAS.has(taf.iata)) continue;

      const flights = allFlights.filter(f => {
        if (f.icao !== taf.icao) return false;
        const eta = f.estimatedTouchDownTime ?? f.scheduledArrival;
        if (!eta) return false;
        const ms = new Date(eta).getTime();
        return ms >= now && ms <= now10h;
      });

      for (const threat of taf.threats) {
        // Alertes rouges uniquement
        if (threat.severity !== 'red') continue;

        for (const flight of flights) {
          const etaIso = flight.estimatedTouchDownTime ?? flight.scheduledArrival!;
          const etaMs  = new Date(etaIso).getTime();
          const inWindow =
            etaMs >= threat.periodStart * 1000 - 60 * 60 * 1000 &&
            etaMs <= threat.periodEnd   * 1000 + 2 * 60 * 60 * 1000;
          if (!inWindow) continue;

          const key = `AF${flight.flightNumber}-${taf.icao}-${threat.type}`;
          if (seen.has(key)) continue;
          seen.add(key);

          meteoLines.push({
            flight:         `AF${flight.flightNumber}`,
            iata:           taf.iata,
            name:           taf.name,
            phenomenon:     PHENOMENON_LABELS[threat.type] ?? threat.type,
            severity:       threat.severity,
            etaZ:           fmtZ(etaIso),
            fenetreZ:       `${fmtZ(threat.periodStart)}/${fmtZ(threat.periodEnd)}`,
            capaAttenteMin: null,
            degagement:     null,
          });
        }
      }
    }

    // Tri par sévérité desc puis ETA croissant
    meteoLines.sort((a, b) =>
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      a.etaZ.localeCompare(b.etaZ)
    );

    const dedupKeys = new Set<string>();
    const meteoHorsEurope = meteoLines.filter(line => {
      const k = `${line.flight}-${line.iata}`;
      if (dedupKeys.has(k)) return false;
      dedupKeys.add(k);
      return true;
    });

    // ── Perturbations tropicales ──────────────────────────────────────────────────────────────────
    const tropicale = cyclones
      .filter(c => c.name !== 'SEASON' && c.category !== 'INVEST' && c.windKt > 0)
      .map(c => ({ name: c.name, basin: c.basin, category: c.category, windKt: c.windKt, affected: c.affectedAirports }));

    // ── Volcanique — uniquement si un aéroport AF est dans la zone d'impact ──────────────────────────
    const volcanique = (vaacAlerts as any[])
      .filter(a => Array.isArray(a.airports) && a.airports.length > 0)
      .map(a => ({
        volcanoName: a.volcanoName ?? 'Volcan',
        country:     a.country    ?? '',
        flLevel:     a.headline?.match(/FL\d+/)?.[0] ?? '',
        vaac:        a.region     ?? '',
      }));

    // ── Tirs de fusée — horizon 12h ───────────────────────────────────────────────────────────────────────────
    const tirsFusee = launches
      .filter(l => {
        const start = new Date(l.validFrom).getTime();
        return start >= now && start <= now12h;
      })
      .map(l => {
        const parts = l.headline.split('|').map((p: string) => p.trim());
        const site  = parts[1] ?? 'Site inconnu';
        const rocket = parts[0]?.split('—')[1]?.trim() ?? 'Lanceur';
        const provider = parts[0]?.split('—')[0]?.replace(/🚀/g, '').trim() ?? '?';
        return {
          site,
          rocket,
          provider,
          timeZ:    fmtZ(l.validFrom),
          airports: l.airports,
        };
      });

    // ── Tailwind watch — uniquement si un vol AF opère vers SXM/SJO dans la fenêtre h-10 ──────────────────
    const operatedIcaos = new Set(
      allFlights
        .filter(f => {
          const eta = f.estimatedTouchDownTime ?? f.scheduledArrival;
          if (!eta) return false;
          const ms = new Date(eta).getTime();
          return ms >= now && ms <= now10h;
        })
        .map(f => f.icao)
    );

    const tailwindWatch = tailwind
      .filter(t => operatedIcaos.has(t.icao))
      .map(t => ({
        iata:           t.iata,
        name:           t.name,
        alert:          t.tailwindAlert,
        currentTW:      t.worstRunway?.tailwindKt ?? null,
        runway:         t.worstRunway?.runway      ?? null,
        forecastAlerts: t.forecastAlerts,
      }));

    const data: BriefingData = {
      generatedAt:     new Date().toISOString(),
      meteoHorsEurope,
      tropicale,
      volcanique,
      tirsFusee,
      tailwindWatch,
      carburant:    '',
      geopolitique: '',
      effectifDsp:  'OK',
    };

    _cache = { ts: Date.now(), data };

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });

  } catch (e) {
    console.error('[API /briefing]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
