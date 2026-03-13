// src/lib/csvBackupParser.ts
// Parse le CSV "onDemandExtractList" Air France (séparateur ';').
// Produit des AfFlightArrival (arrivées + départs, LC + MC + CC) utilisables par toutes les pages.

import type { AfFlightArrival } from './afFlights';
import { AF_IATA_TO_ICAO } from './tafParser';
import { isLongHaulAircraft } from './afFlights';

// Colonne "T.C." (col BN dans Excel) :
// LC = Long-Courrier, MC = Moyen-Courrier, CC = Court-Courrier → inclus
// AFF = Affrètement → exclu
const EXCLUDED_TC = new Set(['AFF']);

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
  // Indice 0 = AF HR départ, indice 1 = AF HR arrivée
  const afHrDepIdx   = afHrIndices.length >= 1 ? afHrIndices[0] : -1;
  const afDateDepIdx = afHrDepIdx >= 1 ? afHrDepIdx - 1 : -1;
  const afHrArrIdx   = afHrIndices.length >= 2 ? afHrIndices[1] : (afHrIndices[0] ?? -1);
  const afDateArrIdx = afHrArrIdx > 0 ? afHrArrIdx - 1 : -1;

  const flights: AfFlightArrival[] = [];

  for (const line of dataLines) {
    const cells = line.split(';');
    if (cells.length < headers.length - 5) continue;

    const rawNum = col(cells, 'FLIGHT NUM');
    if (!rawNum.startsWith('AF ')) continue;
    const flightNumber = rawNum.replace('AF ', '').trim().padStart(3, '0');

    // ── Filtre T.C. : LC + MC + CC inclus, AFF exclu ───────────────────────────
    const tc = col(cells, 'T.C.').toUpperCase();
    if (!tc || EXCLUDED_TC.has(tc)) continue;

    const registration = col(cells, 'REGISTRATION') || undefined;
    const tyAv         = col(cells, 'TY AV') || undefined;
    const isLongHaul   = isLongHaulAircraft(tyAv);

    const arrIata = col(cells, 'ARR PRV').toUpperCase();
    const depIata = col(cells, 'DEP PRV').toUpperCase();

    // ── ARRIVÉE ───────────────────────────────────────────────────────────────
    if (arrIata) {
      const arrIcao = AF_IATA_TO_ICAO[arrIata];
      const sta = parseDateHr(col(cells, 'SA DATE'), col(cells, 'SA HR'));

      if (arrIcao && sta) {
        const afHrArrStr   = afHrArrIdx  >= 0 ? (cells[afHrArrIdx]  ?? '').trim() : '';
        const afDateArrStr = afDateArrIdx >= 0 ? (cells[afDateArrIdx] ?? '').trim() : '';
        const etaFromAfHr  = parseDateHr(afDateArrStr, afHrArrStr);
        const actualIn     = parseDateHr(col(cells, 'IN DATE'), col(cells, 'IN HR'));
        const estimatedTouchDownTime = actualIn ?? etaFromAfHr;

        const std = parseDateHr(col(cells, 'SD DATE'), col(cells, 'SD HR'));

        flights.push({
          flightId:              `AF${flightNumber}-CSV-A-${arrIcao}-${sta}`,
          marketingCarrier:      'AF',
          flightNumber,
          movementType:          'A',
          iata:                  arrIata,
          icao:                  arrIcao,
          registration,
          aircraftType:          tyAv,
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
    }

    // ── DÉPART ───────────────────────────────────────────────────────────────
    if (depIata) {
      const depIcao = AF_IATA_TO_ICAO[depIata];
      const std = parseDateHr(col(cells, 'SD DATE'), col(cells, 'SD HR'));

      if (depIcao && std) {
        const afHrDepStr   = afHrDepIdx   >= 0 ? (cells[afHrDepIdx]   ?? '').trim() : '';
        const afDateDepStr = afDateDepIdx >= 0 ? (cells[afDateDepIdx] ?? '').trim() : '';
        const eobt         = parseDateHr(afDateDepStr, afHrDepStr);

        flights.push({
          flightId:              `AF${flightNumber}-CSV-D-${depIcao}-${std}`,
          marketingCarrier:      'AF',
          flightNumber,
          movementType:          'D',
          iata:                  depIata,
          icao:                  depIcao,
          registration,
          aircraftType:          tyAv,
          isLongHaul,
          scheduledArrival:      std,  // champ réutilisé = STD pour les départs
          estimatedTouchDownTime: eobt, // = EOBT
          timeToArrivalMinutes:  eobt
            ? Math.round((new Date(eobt).getTime() - Date.now()) / 60000)
            : undefined,
          estimatedOffBlockTime: eobt,
          scheduledDeparture:    std,
          ...(arrIata ? { departureIata: arrIata } : {}), // champ sémantiquement inversé mais utilisé pour info
        });
      }
    }
  }

  return { flights, uploadedAt: Date.now(), filename, rowCount: dataLines.length };
}
