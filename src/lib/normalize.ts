import type { WeatherAlert, Region, Severity } from '../types/alert';

// Mapping pays ISO3 → région dispatch AF
const COUNTRY_REGION: Record<string, Region> = {
  // AMN – Amérique du Nord
  USA: 'AMN', CAN: 'AMN', MEX: 'AMN',
  // AMS – Amérique du Sud & Caraïbes
  BRA: 'AMS', ARG: 'AMS', PER: 'AMS', VEN: 'AMS',
  COL: 'AMS', CHL: 'AMS', BOL: 'AMS', ECU: 'AMS',
  URY: 'AMS', PRY: 'AMS',
  // AMO – Antilles / Outremer Atlantique / Caraïbes
  GLP: 'AMO', MTQ: 'AMO', GUF: 'AMO', HTI: 'AMO',
  CUB: 'AMO', DOM: 'AMO', JAM: 'AMO',
  // EUR – Europe
  FRA: 'EUR', DEU: 'EUR', ESP: 'EUR', ITA: 'EUR',
  GBR: 'EUR', PRT: 'EUR', NLD: 'EUR', BEL: 'EUR',
  CHE: 'EUR', AUT: 'EUR', POL: 'EUR', ROU: 'EUR',
  HRV: 'EUR', MNE: 'EUR', MKD: 'EUR', UKR: 'EUR',
  RUS: 'EUR',
  // ASIE – Asie, Océan Indien, Pacifique, Afrique
  CHN: 'ASIE', JPN: 'ASIE', IND: 'ASIE', IDN: 'ASIE',
  THA: 'ASIE', VNM: 'ASIE', KOR: 'ASIE', PHL: 'ASIE',
  AUS: 'ASIE', NZL: 'ASIE', SLB: 'ASIE', AFG: 'ASIE',
  MDG: 'ASIE', REU: 'ASIE', MUS: 'ASIE', MYT: 'ASIE',
  // Afrique → ASIE dans le découpage AF OPS
  KEN: 'ASIE', SEN: 'ASIE', MLI: 'ASIE', TCD: 'ASIE',
  BEN: 'ASIE', BFA: 'ASIE', CAF: 'ASIE', COD: 'ASIE',
  CMR: 'ASIE', GIN: 'ASIE', NGA: 'ASIE', CIV: 'ASIE',
};

// ICAO des principaux aéroports AF par pays
export const AF_AIRPORTS: Record<string, string[]> = {
  USA: ['KJFK', 'KLAX', 'KORD', 'KIAD', 'KMIA', 'KBOS', 'KSFO'],
  CAN: ['CYYZ', 'CYVR', 'CYMX'],
  MEX: ['MMMX'],
  BRA: ['SBGR', 'SBRJ', 'SBBE'],
  ARG: ['SAEZ'],
  VEN: ['SVMI'],
  PER: ['SPJC'],
  GLP: ['TFFR'], MTQ: ['TFFF'], GUF: ['SOCA'],
  HTI: ['MTPP'],
  FRA: ['LFPG', 'LFPO', 'LFLL', 'LFLY', 'LFMN', 'LFRS'],
  DEU: ['EDDF', 'EDDM', 'EDDB'],
  ESP: ['LEMD', 'LEBL'],
  ITA: ['LIRF', 'LIML'],
  GBR: ['EGLL', 'EGKK'],
  PRT: ['LPPT'],
  CHN: ['ZBAA', 'ZSPD', 'ZGGG'],
  JPN: ['RJTT', 'RJAA'],
  IND: ['VIDP', 'VABB'],
  IDN: ['WIII', 'WADD'],
  AUS: ['YSSY', 'YMML'],
  NZL: ['NZAA'],
  KEN: ['HKJK'],
  SEN: ['GOBD'],
  CMR: ['FKYS'],
  REU: ['FMEE'], MUS: ['FIMP'],
  MDG: ['FMMI'],
};

export function getRegion(iso3: string): Region {
  return COUNTRY_REGION[iso3] ?? 'ASIE'; // fallback
}

export function getAirports(iso3: string): string[] {
  return AF_AIRPORTS[iso3] ?? [];
}

// NOAA: Advisory→yellow, Watch→orange, Warning→red
export function noaaSeverity(s: string): Severity {
  const sl = s.toLowerCase();
  if (sl.includes('warning')) return 'red';
  if (sl.includes('watch')) return 'orange';
  return 'yellow';
}

// GDACS: Green→yellow, Orange→orange, Red→red
export function gdacsSeverity(s: string): Severity {
  const sl = s.toLowerCase();
  if (sl === 'red') return 'red';
  if (sl === 'orange') return 'orange';
  return 'yellow';
}
