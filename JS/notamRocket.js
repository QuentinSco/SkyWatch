/**
 * notamRocket.js
 * Parser for rocket launch NOTAMs (AHA/DRA) from FAA PilotWeb
 * Integrates with the notams package to fetch and classify space operation NOTAMs
 */

const ROCKET_KEYWORDS = [
  'AHA', 'DRA', 'ANOMALY HAZARD', 'DEBRIS RESPONSE',
  'SPACE OPERATIONS', 'LAUNCH', 'SPACE LAUNCH',
  'FALLING SPACE DEBRIS', 'HAZARDOUS OPS',
  'STLNK', 'STARLINK' // SpaceX missions
];

/**
 * Extract coordinates from NOTAM text in format DDMMSSN/SDDDMMSSW
 * Example: 283900N0804100W -> {lat: 28.65, lng: -80.68333}
 * @param {string} notamText - Raw NOTAM text
 * @returns {Array<{lat: number, lng: number}>} Array of coordinate points
 */
export function extractCoordinates(notamText) {
  const coordRegex = /(\d{6}[NS])(\d{7}[EW])/g;
  const matches = [...notamText.matchAll(coordRegex)];
  
  return matches.map(([_, lat, lon]) => {
    const latDeg = parseInt(lat.slice(0, 2));
    const latMin = parseInt(lat.slice(2, 4));
    const latSec = parseInt(lat.slice(4, 6));
    const latSign = lat.slice(6) === 'N' ? 1 : -1;
    
    const lonDeg = parseInt(lon.slice(0, 3));
    const lonMin = parseInt(lon.slice(3, 5));
    const lonSec = parseInt(lon.slice(5, 7));
    const lonSign = lon.slice(7) === 'E' ? 1 : -1;
    
    return {
      lat: latSign * (latDeg + latMin/60 + latSec/3600),
      lng: lonSign * (lonDeg + lonMin/60 + lonSec/3600)
    };
  });
}

/**
 * Extract validity period from NOTAM date-time group
 * Format: YYMMDDHHMM-YYMMDDHHMM
 * @param {string} notamText - Raw NOTAM text
 * @returns {{start: Date, end: Date} | null}
 */
export function extractValidity(notamText) {
  const validityRegex = /(\d{10})-(\d{10})/;
  const match = notamText.match(validityRegex);
  
  if (!match) return null;
  
  const parseDateTime = (str) => {
    const year = 2000 + parseInt(str.slice(0, 2));
    const month = parseInt(str.slice(2, 4)) - 1; // JS months are 0-indexed
    const day = parseInt(str.slice(4, 6));
    const hour = parseInt(str.slice(6, 8));
    const minute = parseInt(str.slice(8, 10));
    return new Date(Date.UTC(year, month, day, hour, minute));
  };
  
  return {
    start: parseDateTime(match[1]),
    end: parseDateTime(match[2])
  };
}

/**
 * Extract altitude limits from NOTAM text
 * @param {string} notamText - Raw NOTAM text
 * @returns {{lower: number, upper: number | null}} Altitude in feet (null = unlimited)
 */
export function extractAltitude(notamText) {
  const text = notamText.toUpperCase();
  
  // Surface to unlimited
  if (text.includes('SFC-UNL') || text.includes('SFC TO UNL')) {
    return { lower: 0, upper: null };
  }
  
  // Specific altitude range (e.g., "SFC-FL180" or "10000FT-UNL")
  const altRegex = /(?:SFC|(\d+)(?:FT|MSL)?)-(?:UNL|FL(\d+)|(\d+)(?:FT|MSL)?)/;
  const match = text.match(altRegex);
  
  if (match) {
    const lower = match[1] ? parseInt(match[1]) : 0;
    const upper = match[2] ? parseInt(match[2]) * 100 : (match[3] ? parseInt(match[3]) : null);
    return { lower, upper };
  }
  
  // Default: assume SFC-UNL for space operations
  return { lower: 0, upper: null };
}

/**
 * Classify NOTAM as AHA, DRA, or general LAUNCH based on keywords and structure
 * @param {string} notamText - Raw NOTAM text
 * @returns {{type: string, status: string, confidence: number}}
 */
export function classifyRocketNotam(notamText) {
  const text = notamText.toUpperCase();
  
  // Explicit AHA detection
  if (text.includes('AHA') || text.includes('ANOMALY HAZARD AREA')) {
    return { type: 'AHA', status: 'NO_FLY', confidence: 1.0 };
  }
  
  // Explicit DRA detection
  if (text.includes('DRA') || text.includes('DEBRIS RESPONSE AREA')) {
    return { type: 'DRA', status: 'CAUTION', confidence: 1.0 };
  }
  
  // TFR format = likely AHA
  if (text.includes('!FDC') && text.includes('TFR')) {
    return { type: 'AHA', status: 'NO_FLY', confidence: 0.9 };
  }
  
  // CARF with CAUTION = likely DRA-style (trajectory zone)
  if (text.includes('!CARF') && text.includes('CAUTION')) {
    if (text.includes('HAZARDOUS OPS') || text.includes('FALLING')) {
      return { type: 'LAUNCH_HAZARD', status: 'CAUTION_HIGH', confidence: 0.85 };
    }
    return { type: 'DRA', status: 'CAUTION', confidence: 0.75 };
  }
  
  // CARF without CAUTION = possible AHA
  if (text.includes('!CARF')) {
    return { type: 'LAUNCH_HAZARD', status: 'AVOID', confidence: 0.7 };
  }
  
  // Generic space launch NOTAM
  return { type: 'LAUNCH', status: 'INFO', confidence: 0.5 };
}

/**
 * Extract mission identifier (e.g., STLNK 10-40)
 * @param {string} notamText - Raw NOTAM text
 * @returns {string | null}
 */
export function extractMissionId(notamText) {
  const text = notamText.toUpperCase();
  
  // Starlink missions
  const starlinkMatch = text.match(/STLNK\s*[\d\-]+/);
  if (starlinkMatch) return starlinkMatch[0];
  
  // Generic mission ID patterns
  const missionMatch = text.match(/MISSION\s*([A-Z0-9\-]+)/);
  if (missionMatch) return missionMatch[1];
  
  return null;
}

/**
 * Main parsing function: converts raw NOTAM text to structured object
 * @param {string} notamText - Raw NOTAM text
 * @returns {Object} Parsed NOTAM with classification and geometry
 */
export function parseRocketNotam(notamText) {
  const classification = classifyRocketNotam(notamText);
  const polygon = extractCoordinates(notamText);
  const validity = extractValidity(notamText);
  const altitude = extractAltitude(notamText);
  const missionId = extractMissionId(notamText);
  
  // Extract NOTAM number
  const notamNumberMatch = notamText.match(/!(\w+)\s*(\d+\/\d+)/);
  const notamType = notamNumberMatch ? notamNumberMatch[1] : 'UNKNOWN';
  const notamNumber = notamNumberMatch ? notamNumberMatch[2] : null;
  
  return {
    raw: notamText,
    notamType,
    notamNumber,
    classification: classification.type,
    status: classification.status,
    confidence: classification.confidence,
    missionId,
    polygon,
    altitude,
    validity,
    parsed: new Date().toISOString()
  };
}

/**
 * Filter NOTAMs for rocket launch operations
 * @param {Array} allNotams - Array of NOTAM objects from notams package
 * @returns {Array} Filtered and parsed rocket NOTAMs
 */
export function filterRocketNotams(allNotams) {
  return allNotams
    .filter(notam => {
      const text = notam.text?.toUpperCase() || '';
      return ROCKET_KEYWORDS.some(keyword => text.includes(keyword));
    })
    .map(notam => parseRocketNotam(notam.text))
    .filter(parsed => parsed.polygon.length > 0); // Only keep NOTAMs with valid geometry
}

/**
 * Example usage with the notams package:
 * 
 * import notams from 'notams';
 * import { filterRocketNotams } from './notamRocket.js';
 * 
 * const allTfrs = await notams.fetchAllByType('ALLTFR', 'DOMESTIC');
 * const rocketNotams = filterRocketNotams(allTfrs);
 * 
 * rocketNotams.forEach(n => {
 *   console.log(`${n.classification} (${n.status}): ${n.missionId || 'Unknown mission'}`);
 *   console.log(`Valid: ${n.validity.start} to ${n.validity.end}`);
 *   console.log(`Polygon: ${n.polygon.length} points`);
 * });
 */
