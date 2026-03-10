// src/lib/csvBackupParser.ts
// Parse le CSV "onDemandExtractList" Air France (séparateur ';').
// Produit des AfFlightArrival utilisables par taf-vol-risks.

import type { AfFlightArrival } from './afFlights';
import { isLongHaulAircraft, isOperationalAircraft } from './afFlights';
import { AF_IATA_TO_ICAO } from './tafParser';

// ── Colonnes utiles ────────────────────────────────────────────────────────
// FLIGHT NUM | DEP PRV | TER PRV | ARR PRV | TER PRV |
// SD DATE    | SD HR   | SA DATE | SA HR   |
// AF DEP DT  | AF HR   (heure estimée départ / ETA si en vol)
// IN DATE    | IN HR   (arrivée réelle)
// REGISTRATION | TY AV | OWN

function parseDateHr(dateStr: string, hrStr: string): string | undefined {
  // Format CSV : DD/MM/YYYY et HH:MM (UTC)
  const d = dateStr?.trim();
  const h = hrStr?.trim();
  if (!d || !h || d === '' || h === '') return undefined;
  // DD/MM/YYYY → YYYY-MM-DD
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

  // Cherche la ligne d'en-tête (commence par "FLIGHT NUM")
  const headerIdx = lines.findIndex(l => l.trimStart().startsWith('FLIGHT NUM'));
  if (headerIdx === -1) {
    throw new Error('En-tête "FLIGHT NUM" introuvable dans le CSV.');
  }

  const headers = lines[headerIdx].split(';').map(h => h.trim());
  const dataLines = lines.slice(headerIdx + 1).filter(l => {
    const t = l.trim();
    return t !== '' && !t.startsWith(';');
  });

  function col(cells: string[], name: string): string {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (cells[idx] ?? '').trim() : '';
  }

  const flights: AfFlightArrival[] = [];

  for (const line of dataLines) {
    const cells = line.split(';');
    if (cells.length < headers.length - 5) continue; // ligne tronquée

    const rawNum = col(cells, 'FLIGHT NUM'); // ex : "AF 702"
    if (!rawNum.startsWith('AF ')) continue;
    const flightNumber = rawNum.replace('AF ', '').trim().padStart(3, '0');

    const tyAv = col(cells, 'TY AV');
    if (!isOperationalAircraft(tyAv)) continue;

    // ── Aéroport arrivée ─────────────────────────────────────────────────
    const arrIata = col(cells, 'ARR PRV').trim().toUpperCase();
    if (!arrIata) continue;
    const arrIcao = AF_IATA_TO_ICAO[arrIata];
    if (!arrIcao) continue;

    // ── Aéroport départ ──────────────────────────────────────────────────
    const depIata = col(cells, 'DEP PRV').trim().toUpperCase();

    // ── Horaires ─────────────────────────────────────────────────────────
    // SA DATE / SA HR = heure d'arrivée schedulée
    const sta = parseDateHr(col(cells, 'SA DATE'), col(cells, 'SA HR'));
    if (!sta) continue;

    // AF HR = heure estimée (ETA si en vol) — colonne juste après AF DEP DT
    // Dans le CSV l'en-tête est "AF HR" et apparaît deux fois (départ et arrivée).
    // On prend la DEUXIÈME occurrence (index le plus élevé) = arrivée estimée.
    const afHrIndices = headers.reduce<number[]>((acc, h, i) => {
      if (h === 'AF HR') acc.push(i);
      return acc;
    }, []);
    const afHrArrIdx = afHrIndices.length >= 2 ? afHrIndices[1] : afHrIndices[0];
    const afDateArrIdx = afHrArrIdx !== undefined ? afHrArrIdx - 1 : -1;
    const afDateStr = afDateArrIdx >= 0 ? (cells[afDateArrIdx] ?? '').trim() : '';
    const afHrStr   = afHrArrIdx  !== undefined ? (cells[afHrArrIdx]  ?? '').trim() : '';
    const etaFromAfHr = parseDateHr(afDateStr, afHrStr);

    // IN DATE / IN HR = arrivée réelle (avion déjà posé)
    const inDate = col(cells, 'IN DATE');
    const inHr   = col(cells, 'IN HR');
    const actualIn = parseDateHr(inDate, inHr);

    // ETA finale : IN (posé) > AF HR (estimée en vol) > STA
    const estimatedTouchDownTime = actualIn ?? etaFromAfHr;

    // SD DATE / SD HR = départ schedulé
    const std = parseDateHr(col(cells, 'SD DATE'), col(cells, 'SD HR'));

    const registration = col(cells, 'REGISTRATION') || undefined;
    const isLongHaul   = isLongHaulAircraft(tyAv);

    // ── Vol arrivée ───────────────────────────────────────────────────────
    const flightId = `AF${flightNumber}-CSV-A-${arrIcao}-${sta}`;
    flights.push({
      flightId,
      marketingCarrier:      'AF',
      flightNumber,
      movementType:          'A',
      iata:                  arrIata,
      icao:                  arrIcao,
      registration,
      aircraftType:          tyAv || undefined,
      isLongHaul,
      scheduledArrival:      sta,
      estimatedTouchDownTime,
      timeToArrivalMinutes:  estimatedTouchDownTime
        ? Math.round((new Date(estimatedTouchDownTime).getTime() - Date.now()) / 60000)
        : undefined,
      ...(depIata ? { departureIata: depIata } : {}),
      ...(std     ? { scheduledDeparture: std } : {}),
    });
  }

  return {
    flights,
    uploadedAt: Date.now(),
    filename,
    rowCount: dataLines.length,
  };
}
