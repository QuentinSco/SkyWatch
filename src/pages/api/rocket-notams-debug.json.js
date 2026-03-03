/**
 * Debug endpoint: /api/rocket-notams-debug.json
 * Tests raw NOTAM fetching from notams.aim.faa.gov
 * Returns unfiltered results to diagnose issues
 */

const NOTAM_SEARCH_URL = 'https://notams.aim.faa.gov/notamSearch/search';
const ROCKET_FIRS = ['ZMA', 'ZHU', 'ZLA', 'ZJX'];

export async function GET() {
  const results = [];
  const errors = [];

  for (const fir of ROCKET_FIRS) {
    try {
      console.log(`[debug] Fetching ${fir}...`);
      
      const res = await fetch(NOTAM_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://notams.aim.faa.gov',
          'Referer': 'https://notams.aim.faa.gov/notamSearch/',
        },
        body: new URLSearchParams({
          designatorsForTFR: fir,
          retrieveArtcc: 'false',
          sortColumns: 'CLMN_LSID+ASC+',
          formatType: 'DOMESTIC',
          retrievalType: 'ALL',
          pageSize: '150',
          pageNum: '1',
          action: 'notamRetrievalByICAOs',
          openItems: 'false',
        }),
      });

      console.log(`[debug] ${fir} HTTP status: ${res.status}`);

      if (!res.ok) {
        errors.push({ fir, error: `HTTP ${res.status}`, message: res.statusText });
        continue;
      }

      const text = await res.text();
      console.log(`[debug] ${fir} response length: ${text.length} chars`);
      
      // Try to parse as JSON
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        errors.push({ fir, error: 'Invalid JSON', sample: text.substring(0, 200) });
        continue;
      }

      const notamList = json?.notamList || json?.items || [];
      console.log(`[debug] ${fir} NOTAMs found: ${notamList.length}`);

      // Filter for rocket-related keywords
      const rocketNotams = notamList.filter(item => {
        const raw = item?.icaoMessage || item?.traditionalMessage || '';
        const upper = raw.toUpperCase();
        return (
          upper.includes('SPACE') ||
          upper.includes('LAUNCH') ||
          upper.includes('AHA') ||
          upper.includes('DRA') ||
          upper.includes('ROCKET') ||
          upper.includes('STARLINK') ||
          upper.includes('STLNK')
        );
      });

      console.log(`[debug] ${fir} rocket-related: ${rocketNotams.length}`);

      results.push({
        fir,
        totalNotams: notamList.length,
        rocketNotams: rocketNotams.length,
        samples: rocketNotams.slice(0, 3).map(n => ({
          icao: n?.icaoMessage?.substring(0, 150),
          trad: n?.traditionalMessage?.substring(0, 150),
        })),
      });

    } catch (error) {
      console.error(`[debug] ${fir} exception:`, error);
      errors.push({ fir, error: error.message, stack: error.stack });
    }
  }

  return new Response(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results,
        errors,
        summary: {
          totalFetched: results.reduce((sum, r) => sum + r.totalNotams, 0),
          totalRocket: results.reduce((sum, r) => sum + r.rocketNotams, 0),
        },
        note: 'This endpoint bypasses parsing to test raw NOTAM retrieval from notams.aim.faa.gov',
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
