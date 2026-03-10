// src/lib/csvBackupParser.ts
// Parse le CSV "onDemandExtractList" Air France (séparateur ';').
// Produit des AfFlightArrival utilisables par taf-vol-risks.

import type { AfFlightArrival } from './afFlights';
import { AF_IATA_TO_ICAO } from './tafParser';

// Colonne "T.C." (col BN dans Excel) : seul "LC" (Long-Courrier) est retenu.
// MC = Moyen-Courrier, CC = Court-Courrier, AFF = Affrètement → exclus.

function parseDateHr(dateStr: string, hrStr: string): string | undefined {
  const d = dateStr?.trim();
  const h = hrStr?.trim();
  if (!d || !h) return undefined;
  const parts = d.split('/');
  if (parts.length !== 3) return undefined;
  const iso = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T${h.padStart(5,'0')}:00Z`;
  return isNaN(Date.parse(iso)) ? undefined : iso;
}

export interface CsvBackupCache {
  flights: AfFlightArrival[];
  uploadedAt: number;
  filename: string;
  rowCount: number;
}

export function parseCsvBackup(csvText: string, filename = 'upload.csv'): CsvBackupCache {
  const lines = csvText.replace(/\r/g, '').split('\n');

  const headerIdx = lines.findIndex(l => l.trimStart().startsWith('FLIGHT NUM'));
  if (headerIdx === -1) throw new Error('En-tête "FLIGHT NUM" introuvable dans le CSV.');

  const headers = lines[headerIdx].split(';').map(h => h.trim());
  const dataLines = lines.slice(headerIdx + 1).filter(l => {
    const t = l.trim();
    return t !== '' && !t.startsWith(';');
  });

  function col(cells: string[], name: string): string {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (cells[idx] ?? '').trim() : '';
  }

  // Pré-calculer les indices des colonnes "AF HR" (apparaissent 2 fois : départ + arrivée)
  const afHrIndices = headers.reduce<number[]>((acc, h, i) => {
    if (h === 'AF HR') acc.push(i);
    return acc;
  }, []);
  const afHrArrIdx   = afHrIndices.length >= 2 ? afHrIndices[1] : (afHrIndices[0] ?? -1);
  const afDateArrIdx = afHrArrIdx > 0 ? afHrArrIdx - 1 : -1;

  const flights: AfFlightArrival[] = [];

  for (const line of dataLines) {
    const cells = line.split(';');
    if (cells.length < headers.length - 5) continue;

    const rawNum = col(cells, 'FLIGHT NUM');
    if (!rawNum.startsWith('AF ')) continue;
    const flightNumber = rawNum.replace('AF ', '').trim().padStart(3, '0');

    // ── Filtre T.C. : Long-Courrier uniquement ──────────────────────────────────
    if (col(cells, 'T.C.').toUpperCase() !== 'LC') continue;

    // ── Aéroport arrivée ──────────────────────────────────────────────────
    const arrIata = col(cells, 'ARR PRV').toUpperCase();
    if (!arrIata) continue;
    const arrIcao = AF_IATA_TO_ICAO[arrIata];
    if (!arrIcao) continue;

    const depIata = col(cells, 'DEP PRV').toUpperCase();
    const tyAv    = col(cells, 'TY AV');

    // ── Horaires ───────────────────────────────────────────────────────────
    const sta = parseDateHr(col(cells, 'SA DATE'), col(cells, 'SA HR'));
    if (!sta) continue;

    const afHrStr   = afHrArrIdx  >= 0 ? (cells[afHrArrIdx]  ?? '').trim() : '';
    const afDateStr = afDateArrIdx >= 0 ? (cells[afDateArrIdx] ?? '').trim() : '';
    const etaFromAfHr = parseDateHr(afDateStr, afHrStr);

    const actualIn = parseDateHr(col(cells, 'IN DATE'), col(cells, 'IN HR'));

    // Priorité : posé (IN) > estimé en vol (AF HR) > STA
    const estimatedTouchDownTime = actualIn ?? etaFromAfHr;

    const std          = parseDateHr(col(cells, 'SD DATE'), col(cells, 'SD HR'));
    const registration = col(cells, 'REGISTRATION') || undefined;

    flights.push({
      flightId:              `AF${flightNumber}-CSV-A-${arrIcao}-${sta}`,
      marketingCarrier:      'AF',
      flightNumber,
      movementType:          'A',
      iata:                  arrIata,
      icao:                  arrIcao,
      registration,
      aircraftType:          tyAv || undefined,
      isLongHaul:            true, // T.C.=LC garantit long-courrier
      scheduledArrival:      sta,
      estimatedTouchDownTime,
      timeToArrivalMinutes:  estimatedTouchDownTime
        ? Math.round((new Date(estimatedTouchDownTime).getTime() - Date.now()) / 60000)
        : undefined,
      ...(depIata ? { departureIata: depIata } : {}),
      ...(std     ? { scheduledDeparture: std } : {}),
    });
  }

  return { flights, uploadedAt: Date.now(), filename, rowCount: dataLines.length };
}
