export interface TafThreat {
    icao: string;
    etaAf: string; // heure arrivée vol AF
    threats: string[];
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }
  
  export function parseTafThreats(taf: any): TafThreat[] {
    const threats: string[] = [];
    
    // Menaces HIGH
    if (taf.wind_speed_kts > 30) threats.push(`GUST ${taf.wind_gust_kts}kt`);
    if (taf.weather?.includes('TS') || taf.weather?.includes('TSRA')) 
      threats.push('THUNDERSTORM');
    if (taf.weather?.includes('SN')) threats.push('SNOW');
    if (taf.visibility_statute_mi < 0.5) threats.push('LOW VIS');
    
    // Menaces MEDIUM
    if (taf.cloud_layers.some((c: any) => c.base_ft_agl < 1000))
      threats.push('CB LOW');
    
    return threats.length > 0 ? [{
      icao: taf.station_id,
      etaAf: '14:30', // à croiser avec AF API
      threats,
      severity: threats.some(t => ['THUNDERSTORM','SNOW'].includes(t)) ? 'HIGH' : 'MEDIUM'
    }] : [];
  }
  