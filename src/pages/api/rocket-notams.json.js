/**
 * API endpoint: /api/rocket-notams.json
 * Fetches and parses rocket launch NOTAMs (AHA/DRA zones) from FAA NOTAM Search
 * Returns GeoJSON FeatureCollection for Leaflet integration
 * 
 * Note: This is a mock endpoint for demonstration. In production, you would:
 * 1. Use FAA NOTAM Search API (https://notams.aim.faa.gov/notamSearch)
 * 2. Use Notamify API (https://notamify.com) with proper authentication
 * 3. Set up a backend scraper with proper rate limiting
 */

import { parseRocketNotam } from '../../../JS/notamRocket.js';

// Mock data - Example rocket NOTAMs for demonstration
const MOCK_NOTAMS = [
  // Real KZMA NOTAM provided by user
  `!CARF 03/029 ZMA AIRSPACE DCC EROP X3730 F9 STLNK 10-40 AREA A STNR
ALT RESERVATION WI AN AREA DEFINED AS 283900N0804100W TO
284100N0803500W TO 292800N0795700W TO 291400N0793800W TO
285000N0794500W TO 282600N0803000W TO POINT OF ORIGIN SFC-UNL.
CAUTION SPACE LAUNCH / HAZARDOUS OPS AND POSSIBILITY OF FALLING
SPACE DEBRIS. 2603040658-2603041140`,
  
  // Additional example: SpaceX Starbase TFR (Boca Chica)
  `!FDC 3/045 ZHU AIRSPACE SPACE OPERATIONS
PURSUANT TO 14 CFR SECTION 91.143, SPACE FLIGHT OPERATIONS AREA
ALT RESERVATION WI AN AREA DEFINED AS 260000N0972000W TO
260500N0971500W TO 265000N0970000W TO 264500N0970500W TO
POINT OF ORIGIN SFC-UNL.
NO FLY ZONE - AHA (ANOMALY HAZARD AREA)
SPACEX STARSHIP TEST FLIGHT
2603101400-2603101800`,
  
  // Example: Vandenberg SFB launch
  `!FDC 3/088 ZLA AIRSPACE SPACE OPERATIONS
ALT RESERVATION WI AN AREA DEFINED AS 343000N1204500W TO
343500N1204000W TO 350000N1195000W TO 345500N1195500W TO
POINT OF ORIGIN SFC-FL600.
AHA - ANOMALY HAZARD AREA / NO FLY ZONE
VANDENBERG SFB SPACE LAUNCH
2603151200-2603151600`
];

export async function GET({ request }) {
  try {
    console.log('[rocket-notams] Processing mock NOTAMs for demonstration...');
    
    // Parse mock NOTAMs using our parser
    const parsedNotams = MOCK_NOTAMS.map(text => {
      try {
        return parseRocketNotam(text);
      } catch (error) {
        console.error('[rocket-notams] Failed to parse NOTAM:', error);
        return null;
      }
    }).filter(n => n !== null);
    
    console.log(`[rocket-notams] Parsed ${parsedNotams.length} NOTAMs`);
    
    // Filter only active or future NOTAMs
    const now = new Date();
    const activeNotams = parsedNotams.filter(n => {
      if (!n.validity?.end) return true;
      return new Date(n.validity.end) > now;
    });
    
    console.log(`[rocket-notams] Active NOTAMs: ${activeNotams.length}`);
    
    // Convert to GeoJSON FeatureCollection
    const features = activeNotams
      .filter(n => n.polygon && n.polygon.length > 0)
      .map(n => {
        // Close the polygon by adding first point at the end
        const coordinates = [
          ...n.polygon.map(p => [p.lng, p.lat]),
          [n.polygon[0]?.lng, n.polygon[0]?.lat]
        ].filter(coord => coord[0] != null && coord[1] != null);
        
        return {
          type: 'Feature',
          properties: {
            notamType: n.notamType,
            notamNumber: n.notamNumber,
            classification: n.classification,
            status: n.status,
            confidence: n.confidence,
            missionId: n.missionId,
            validFrom: n.validity?.start?.toISOString(),
            validTo: n.validity?.end?.toISOString(),
            altitudeLower: n.altitude.lower,
            altitudeUpper: n.altitude.upper,
            raw: n.raw.substring(0, 500)
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };
      });
    
    const geojson = {
      type: 'FeatureCollection',
      features,
      metadata: {
        generated: new Date().toISOString(),
        count: features.length,
        mode: 'DEMO',
        sources: ['Mock Data - Demo Mode'],
        note: 'This is demonstration data. In production, integrate with FAA NOTAM Search API or Notamify API.'
      }
    };
    
    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (error) {
    console.error('[rocket-notams] Error:', error);
    
    return new Response(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [],
        metadata: {
          error: error.message,
          generated: new Date().toISOString()
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * PRODUCTION IMPLEMENTATION NOTES:
 * 
 * Option 1: FAA NOTAM Search API (Official, Free)
 * - Endpoint: https://notams.aim.faa.gov/notamSearch/search
 * - Requires web form submission / screen scraping
 * - Rate limits apply
 * 
 * Option 2: Notamify API (Commercial, Structured)
 * - Endpoint: https://api.notamify.com/v2/notams
 * - Provides parsed data with categories
 * - Pricing: 1 credit per page
 * - Example query: GET /v2/notams?icao=KZMA&category=ROCKET_LAUNCH
 * 
 * Option 3: NASA NOTAMs API (Public, Structured)
 * - Endpoint: https://dip.amesaero.nasa.gov (requires registration)
 * - Value-added processing of FAA SWIM feed
 * - Free for research/educational use
 * 
 * Example integration with Notamify:
 * 
 * const response = await fetch('https://api.notamify.com/v2/notams', {
 *   headers: {
 *     'Authorization': `Bearer ${process.env.NOTAMIFY_API_KEY}`,
 *     'Content-Type': 'application/json'
 *   },
 *   params: {
 *     category: 'SPACE_OPERATIONS',
 *     active: true,
 *     page: 1,
 *     per_page: 50
 *   }
 * });
 * 
 * const data = await response.json();
 * // Process data.notams with built-in interpretation
 */
