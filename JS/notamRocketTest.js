/**
 * notamRocketTest.js
 * Test file for rocket NOTAM parser using real KZMA FIR example
 */

import { parseRocketNotam, extractCoordinates, extractValidity, classifyRocketNotam } from './notamRocket.js';

// Real NOTAM from KZMA FIR (Miami) - SpaceX Starlink mission
const KZMA_NOTAM = `!CARF 03/029 ZMA AIRSPACE DCC EROP X3730 F9 STLNK 10-40 AREA A STNR
ALT RESERVATION WI AN AREA DEFINED AS 283900N0804100W TO
284100N0803500W TO 292800N0795700W TO 291400N0793800W TO
285000N0794500W TO 282600N0803000W TO POINT OF ORIGIN SFC-UNL.
CAUTION SPACE LAUNCH / HAZARDOUS OPS AND POSSIBILITY OF FALLING
SPACE DEBRIS. 2603040658-2603041140`;

/**
 * Test coordinate extraction
 */
function testCoordinates() {
  console.log('\n=== COORDINATE EXTRACTION TEST ===');
  const coords = extractCoordinates(KZMA_NOTAM);
  
  console.log(`Extracted ${coords.length} coordinate points:`);
  coords.forEach((point, i) => {
    console.log(`  Point ${i + 1}: ${point.lat.toFixed(5)}°N, ${Math.abs(point.lng).toFixed(5)}°W`);
  });
  
  // Verify first point (28°39'00"N 080°41'00"W)
  const expectedLat = 28 + 39/60 + 0/3600;
  const expectedLng = -(80 + 41/60 + 0/3600);
  console.log(`\n  Verification (Point 1):`);
  console.log(`    Expected: ${expectedLat.toFixed(5)}°, ${expectedLng.toFixed(5)}°`);
  console.log(`    Got:      ${coords[0].lat.toFixed(5)}°, ${coords[0].lng.toFixed(5)}°`);
  console.log(`    Match: ${Math.abs(coords[0].lat - expectedLat) < 0.0001 && Math.abs(coords[0].lng - expectedLng) < 0.0001 ? '✓' : '✗'}`);
}

/**
 * Test validity period extraction
 */
function testValidity() {
  console.log('\n=== VALIDITY PERIOD TEST ===');
  const validity = extractValidity(KZMA_NOTAM);
  
  if (validity) {
    console.log(`Start: ${validity.start.toISOString()}`);
    console.log(`End:   ${validity.end.toISOString()}`);
    console.log(`Duration: ${((validity.end - validity.start) / 3600000).toFixed(2)} hours`);
    
    // Verify dates (2026-03-04 06:58Z to 11:40Z)
    console.log(`\n  Expected: 2026-03-04T06:58:00Z to 2026-03-04T11:40:00Z`);
    console.log(`  Match: ${validity.start.toISOString() === '2026-03-04T06:58:00.000Z' ? '✓' : '✗'}`);
  } else {
    console.log('Failed to extract validity period');
  }
}

/**
 * Test classification logic
 */
function testClassification() {
  console.log('\n=== CLASSIFICATION TEST ===');
  const classification = classifyRocketNotam(KZMA_NOTAM);
  
  console.log(`Type: ${classification.type}`);
  console.log(`Status: ${classification.status}`);
  console.log(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
  
  console.log('\n  Analysis:');
  console.log(`    - Contains CARF: ${KZMA_NOTAM.includes('CARF') ? '✓' : '✗'}`);
  console.log(`    - Contains CAUTION: ${KZMA_NOTAM.includes('CAUTION') ? '✓' : '✗'}`);
  console.log(`    - Contains HAZARDOUS OPS: ${KZMA_NOTAM.includes('HAZARDOUS OPS') ? '✓' : '✗'}`);
  console.log(`    - Expected type: LAUNCH_HAZARD (DRA-like trajectory zone)`);
  console.log(`    - Expected status: CAUTION_HIGH`);
}

/**
 * Test full parsing
 */
function testFullParsing() {
  console.log('\n=== FULL PARSING TEST ===');
  const parsed = parseRocketNotam(KZMA_NOTAM);
  
  console.log(`NOTAM Type: ${parsed.notamType}`);
  console.log(`NOTAM Number: ${parsed.notamNumber}`);
  console.log(`Classification: ${parsed.classification}`);
  console.log(`Status: ${parsed.status}`);
  console.log(`Mission ID: ${parsed.missionId || 'N/A'}`);
  console.log(`Altitude: ${parsed.altitude.lower}ft to ${parsed.altitude.upper === null ? 'UNLIMITED' : parsed.altitude.upper + 'ft'}`);
  console.log(`Polygon points: ${parsed.polygon.length}`);
  console.log(`Valid from: ${parsed.validity?.start.toISOString()}`);
  console.log(`Valid to: ${parsed.validity?.end.toISOString()}`);
  
  // Generate GeoJSON for Leaflet integration
  console.log('\n=== GeoJSON OUTPUT (for Leaflet) ===');
  const geojson = {
    type: 'Feature',
    properties: {
      notamNumber: parsed.notamNumber,
      classification: parsed.classification,
      status: parsed.status,
      missionId: parsed.missionId,
      validFrom: parsed.validity?.start.toISOString(),
      validTo: parsed.validity?.end.toISOString()
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        ...parsed.polygon.map(p => [p.lng, p.lat]),
        [parsed.polygon[0].lng, parsed.polygon[0].lat] // Close the polygon
      ]]
    }
  };
  
  console.log(JSON.stringify(geojson, null, 2));
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ROCKET NOTAM PARSER TEST SUITE                            ║');
  console.log('║  Testing with KZMA FIR NOTAM (SpaceX Starlink 10-40)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  testCoordinates();
  testValidity();
  testClassification();
  testFullParsing();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TESTS COMPLETE                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, KZMA_NOTAM };
