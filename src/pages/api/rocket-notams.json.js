/**
 * API endpoint: /api/rocket-notams.json
 * Fetches and parses rocket launch NOTAMs (AHA/DRA zones) from FAA
 * Returns GeoJSON FeatureCollection for Leaflet integration
 */

import notams from 'notams';
import { filterRocketNotams } from '../../../JS/notamRocket.js';

export async function GET({ request }) {
  try {
    console.log('[rocket-notams] Fetching TFRs and CARFs from FAA...');
    
    // Fetch both TFRs (AHA) and all NOTAMs that might contain CARFs (DRA)
    const [tfrs, allNotams] = await Promise.allSettled([
      notams.fetchAllByType('ALLTFR', 'DOMESTIC'),
      notams.fetchAllByType('ALLCARF', 'DOMESTIC')
    ]);
    
    // Combine results
    const allFetched = [
      ...(tfrs.status === 'fulfilled' ? tfrs.value : []),
      ...(allNotams.status === 'fulfilled' ? allNotams.value : [])
    ];
    
    console.log(`[rocket-notams] Total NOTAMs fetched: ${allFetched.length}`);
    
    // Filter and parse rocket-related NOTAMs
    const rocketNotams = filterRocketNotams(allFetched);
    
    console.log(`[rocket-notams] Rocket NOTAMs found: ${rocketNotams.length}`);
    
    // Filter only active or future NOTAMs
    const now = new Date();
    const activeNotams = rocketNotams.filter(n => {
      if (!n.validity?.end) return true; // Keep if no end date
      return new Date(n.validity.end) > now;
    });
    
    console.log(`[rocket-notams] Active rocket NOTAMs: ${activeNotams.length}`);
    
    // Convert to GeoJSON FeatureCollection
    const features = activeNotams.map(n => {
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
          raw: n.raw.substring(0, 500) // Truncate for response size
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
        sources: ['FAA PilotWeb ALLTFR', 'FAA PilotWeb ALLCARF']
      }
    };
    
    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache 5 minutes
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
