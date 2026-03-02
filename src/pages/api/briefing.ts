// src/pages/api/briefing.ts
// ─── API Trame Briefing CCO ───────────────────────────────────────────────────
// Agrège les données SkyWatch pour pré-remplir la trame superviseur.
// Horizon météo : 6h glissantes (ETA vols).

import type { APIRoute } from 'astro';
import { fetchTafRisks }         from '../../lib/tafParser';
import { getCachedAfArrivals }   from '../../lib/afFlights';
import { fetchCycloneBulletins } from '../../lib/cycloneParser';
import { fetchVAAC }             from '../../lib/alertsServer';
import { fetchTailwindStatus }   from '../../lib/tailwindMonitor';

// ─── Types exportés (utilisés par la page briefing.astro) ────────────────────
export interface BriefingMeteoLine {
  flight:         string;   // "AF256"
  iata:           string;   // "SIN"
  name:           string;   // "Singapour"
  phenomenon:     string;   // "Orages"
  severity:       'red' | 'orange' | 'yellow';
  etaZ:           string;   // "0845z"
  fenetreZ:       string;   // "0830z/0930z"
  capaAttenteMin: number | null;
  degagement:     string | null;
}

export interface BriefingData {
  generatedAt:     string;
  meteoHorsEurope: BriefingMeteoLine[];
  tropicale:       { name: string; basin: string; category: string; windKt: number; affected: string[] }[];
  volcanique:      { volcanoName: string; country: string; flLevel: string; vaac: string }[];
  tailwindWatch:   { iata: string; name: string; alert: boolean; currentTW: number | null; runway: string | null; forecastAlerts: any[] }[];
  carburant:       string;
  geopolitique:    string;
  effectifDsp:     string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
// Aéroports AF européens — exclus de la section "Météo hors Europe"
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

// ─── Route GET ────────────────────────────────────────────────────────────────
export const prerender = false;

export const GET: APIRoute = async () => {
  const now   = Date.now();
  const now6h = now + 6 * 60 * 60 * 1000;

  try {
    const [tafRisks, allFlights, cyclones, vaacAlerts, tailwind] = await Promise.all([
      fetchTafRisks(),
      getCachedAfArrivals(false),
      fetchCycloneBulletins(),
      fetchVAAC(),
      fetchTailwindStatus(),
    ]);

    // ── Météo hors Europe — croisement TAF × vols AF sur 6h ──────────────────
    const meteoLines: BriefingMeteoLine[] = [];
    const seen = new Set<string>(); // dédup flight+phénomène

    for (const taf of tafRisks) {
      if (EUROPEAN_IATAS.has(taf.iata)) continue;

      const flights = allFlights.filter(f => {
        if (f.icao !== taf.icao) return false;
        const eta = f.estimatedTouchDownTime ?? f.scheduledArrival;
        if (!eta) return false;
        const ms = new Date(eta).getTime();
        return ms >= now && ms <= now6h;
      });

      for (const threat of taf.threats) {
        for (const flight of flights) {
          const etaIso = flight.estimatedTouchDownTime ?? flight.scheduledArrival!;
          const etaMs  = new Date(etaIso).getTime();
          // Fenêtre : ETA dans la période de menace ±buffer
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

    // Tri : rouge en premier, puis par ETA croissant
    meteoLines.sort((a, b) =>
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      a.etaZ.localeCompare(b.etaZ)
    );

    // ── Perturbations tropicales (hors INVEST) ────────────────────────────────
    const tropicale = cyclones
      .filter(c => c.category !== 'INVEST')
      .map(c => ({
        name: c.name, basin: c.basin,
        category: c.category, windKt: c.windKt,
        affected: c.affectedAirports,
      }));

    // ── Volcanique (VAAC) ─────────────────────────────────────────────────────
    const volcanique = (vaacAlerts as any[]).map(a => ({
      volcanoName: a.volcanoName ?? 'Volcan',
      country:     a.country    ?? '',
      flLevel:     a.headline?.match(/FL\d+/)?.[0] ?? '',
      vaac:        a.region     ?? '',
    }));

    // ── Vent arrière ──────────────────────────────────────────────────────────
    const tailwindWatch = tailwind.map(t => ({
      iata:           t.iata,
      name:           t.name,
      alert:          t.tailwindAlert,
      currentTW:      t.worstRunway?.tailwindKt ?? null,
      runway:         t.worstRunway?.runway      ?? null,
      forecastAlerts: t.forecastAlerts,
    }));

    const data: BriefingData = {
      generatedAt:     new Date().toISOString(),
      meteoHorsEurope: meteoLines,
      tropicale,
      volcanique,
      tailwindWatch,
      carburant:    '',
      geopolitique: '',
      effectifDsp:  'OK',
    };

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[API /briefing]', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
