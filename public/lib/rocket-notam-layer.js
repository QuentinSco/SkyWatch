/**
 * rocket-notam-layer.js
 * Leaflet layer manager for AHA/DRA rocket launch zones
 * Integrates with SkyWatch map display
 */

// Color coding by classification and status
const NOTAM_COLORS = {
  // AHA = strict NO FLY ZONE
  'AHA': {
    NO_FLY: { fill: '#dc2626', stroke: '#991b1b', opacity: 0.5 }
  },
  // DRA = CAUTION zone (may be closed by separate NOTAM)
  'DRA': {
    CAUTION: { fill: '#f97316', stroke: '#c2410c', opacity: 0.35 }
  },
  // LAUNCH_HAZARD = hybrid (CARF with hazardous ops)
  'LAUNCH_HAZARD': {
    CAUTION_HIGH: { fill: '#f59e0b', stroke: '#d97706', opacity: 0.4 },
    AVOID: { fill: '#fbbf24', stroke: '#f59e0b', opacity: 0.3 }
  },
  // Generic fallback
  'LAUNCH': {
    INFO: { fill: '#64748b', stroke: '#475569', opacity: 0.25 }
  }
};

let rocketLayerGroup = null;
let fetchInterval = null;

/**
 * Get color configuration for a NOTAM based on classification and status
 */
function getNotamColor(classification, status) {
  const classConfig = NOTAM_COLORS[classification];
  if (!classConfig) return NOTAM_COLORS.LAUNCH.INFO;
  
  return classConfig[status] || Object.values(classConfig)[0];
}

/**
 * Format popup content for a rocket NOTAM
 */
function makePopupContent(properties) {
  const { classification, status, notamNumber, missionId, validFrom, validTo, altitudeLower, altitudeUpper, confidence } = properties;
  
  const colorConfig = getNotamColor(classification, status);
  
  // Status badge
  const statusLabels = {
    NO_FLY: 'NO FLY ZONE',
    CAUTION_HIGH: 'CAUTION - HIGH RISK',
    CAUTION: 'CAUTION',
    AVOID: 'AVOID',
    INFO: 'INFORMATIONAL'
  };
  
  const statusLabel = statusLabels[status] || status;
  
  // Classification emoji
  const classEmoji = {
    AHA: '🚫',
    DRA: '⚠️',
    LAUNCH_HAZARD: '🚀',
    LAUNCH: 'ℹ️'
  };
  
  const emoji = classEmoji[classification] || '🚀';
  
  // Format dates
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };
  
  // Altitude display
  const altDisplay = altitudeUpper === null 
    ? `${altitudeLower}ft → UNLIMITED`
    : `${altitudeLower}ft → ${altitudeUpper}ft`;
  
  // Confidence indicator
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor = confidence >= 0.9 ? '#16a34a' : (confidence >= 0.7 ? '#f59e0b' : '#6b7280');
  
  return `
    <div style="min-width:280px;max-width:320px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:24px">${emoji}</span>
        <div style="flex:1">
          <div style="background:${colorConfig.stroke};color:white;font-weight:700;font-size:10px;padding:3px 8px;border-radius:4px;text-transform:uppercase;display:inline-block;margin-bottom:3px">
            ${statusLabel}
          </div>
          <div style="font-size:11px;color:#6b7280;font-family:monospace">${notamNumber || 'N/A'}</div>
        </div>
      </div>
      
      <div style="background:#f8fafc;border-left:3px solid ${colorConfig.stroke};padding:8px;margin-bottom:8px;border-radius:4px">
        <div style="font-weight:600;color:#111;margin-bottom:4px">${classification}</div>
        ${missionId ? `<div style="color:#374151;font-family:monospace;font-size:12px;margin-bottom:2px">🛰️ ${missionId}</div>` : ''}
        <div style="color:#6b7280;font-size:11px;margin-top:4px">
          Confidence: <span style="color:${confidenceColor};font-weight:600">${confidencePercent}%</span>
        </div>
      </div>
      
      <div style="font-size:11px;color:#374151;margin-bottom:6px">
        <div style="margin-bottom:3px">
          <span style="font-weight:600">Valid from:</span><br/>
          ${formatDate(validFrom)}
        </div>
        <div>
          <span style="font-weight:600">Valid to:</span><br/>
          ${formatDate(validTo)}
        </div>
      </div>
      
      <div style="font-size:11px;color:#6b7280;padding-top:6px;border-top:1px solid #e5e7eb">
        <div>✈️ Altitude: <span style="font-family:monospace">${altDisplay}</span></div>
      </div>
    </div>
  `;
}

/**
 * Add rocket NOTAM layer to map
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} geojson - GeoJSON FeatureCollection from API
 */
export function addRocketNotamLayer(map, geojson) {
  if (!map || !geojson || !geojson.features) {
    console.warn('[rocket-notam-layer] Invalid map or GeoJSON data');
    return;
  }
  
  // Remove existing layer if present
  if (rocketLayerGroup) {
    map.removeLayer(rocketLayerGroup);
  }
  
  rocketLayerGroup = L.layerGroup();
  
  geojson.features.forEach(feature => {
    const { classification, status } = feature.properties;
    const colorConfig = getNotamColor(classification, status);
    
    // Create polygon
    const polygon = L.polygon(
      feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]), // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
      {
        color: colorConfig.stroke,
        fillColor: colorConfig.fill,
        fillOpacity: colorConfig.opacity,
        weight: 2.5,
        dashArray: status === 'NO_FLY' ? '' : '5, 5' // Solid for NO_FLY, dashed for others
      }
    );
    
    // Add popup
    polygon.bindPopup(makePopupContent(feature.properties), {
      maxWidth: 340,
      className: 'rocket-notam-popup'
    });
    
    // Add tooltip on hover (shows NOTAM number)
    polygon.bindTooltip(
      `${feature.properties.classification}: ${feature.properties.notamNumber || 'N/A'}`,
      { sticky: true, direction: 'top' }
    );
    
    polygon.addTo(rocketLayerGroup);
  });
  
  rocketLayerGroup.addTo(map);
  
  console.log(`[rocket-notam-layer] Added ${geojson.features.length} rocket NOTAM zones to map`);
  
  return rocketLayerGroup;
}

/**
 * Fetch and display rocket NOTAMs on map
 * @param {L.Map} map - Leaflet map instance
 */
export async function loadRocketNotams(map) {
  try {
    const response = await fetch('/api/rocket-notams.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const geojson = await response.json();
    console.log(`[rocket-notam-layer] Loaded ${geojson.features?.length || 0} NOTAMs from API`);
    
    addRocketNotamLayer(map, geojson);
    
    return geojson;
  } catch (error) {
    console.error('[rocket-notam-layer] Failed to load rocket NOTAMs:', error);
    return null;
  }
}

/**
 * Start auto-refresh of rocket NOTAMs
 * @param {L.Map} map - Leaflet map instance
 * @param {number} intervalMs - Refresh interval in milliseconds (default: 5 minutes)
 */
export function startAutoRefresh(map, intervalMs = 5 * 60 * 1000) {
  // Clear existing interval
  if (fetchInterval) {
    clearInterval(fetchInterval);
  }
  
  // Load immediately
  loadRocketNotams(map);
  
  // Set up periodic refresh
  fetchInterval = setInterval(() => {
    console.log('[rocket-notam-layer] Auto-refreshing rocket NOTAMs...');
    loadRocketNotams(map);
  }, intervalMs);
  
  console.log(`[rocket-notam-layer] Auto-refresh enabled (every ${intervalMs / 1000}s)`);
}

/**
 * Stop auto-refresh
 */
export function stopAutoRefresh() {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
    console.log('[rocket-notam-layer] Auto-refresh stopped');
  }
}

/**
 * Remove rocket NOTAM layer from map
 * @param {L.Map} map - Leaflet map instance
 */
export function removeRocketNotamLayer(map) {
  if (rocketLayerGroup && map) {
    map.removeLayer(rocketLayerGroup);
    rocketLayerGroup = null;
    console.log('[rocket-notam-layer] Layer removed');
  }
}

/**
 * Toggle rocket NOTAM layer visibility
 * @param {L.Map} map - Leaflet map instance
 * @returns {boolean} New visibility state
 */
export function toggleRocketNotamLayer(map) {
  if (!map) return false;
  
  if (rocketLayerGroup && map.hasLayer(rocketLayerGroup)) {
    map.removeLayer(rocketLayerGroup);
    console.log('[rocket-notam-layer] Layer hidden');
    return false;
  } else {
    if (rocketLayerGroup) {
      rocketLayerGroup.addTo(map);
    } else {
      loadRocketNotams(map);
    }
    console.log('[rocket-notam-layer] Layer shown');
    return true;
  }
}
