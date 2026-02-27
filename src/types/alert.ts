export type Severity = 'red' | 'orange' | 'yellow';
export type Region = 'AMN' | 'AMS' | 'EUR' | 'ASIE' | 'AMO';

export interface SourceLink {
  label: string;
  url: string;
}

export interface WeatherAlert {
  id: string;
  source: 'GDACS' | 'NOAA' | 'MeteoAlarm' | 'VAAC';
  region: Region;
  severity: Severity;
  phenomenon: string;   // ex : "Tropical Cyclone", "Blizzard", "Storm"
  country: string;
  airports: string[];   // codes ICAO dans la zone
  validFrom: string;    // ISO string
  validTo: string;
  headline: string;
  sourceLinks?: SourceLink[];  // liens vers les sources de suivi (TC, etc.)
}
