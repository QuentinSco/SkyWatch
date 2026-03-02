export interface LaunchZone {
  type: 'AHA' | 'DRA';
  polygon: [number, number][];
  notamNumber: string;
  windowStart: string;
  windowEnd:   string;
}

export function parseLaunchTfr(xml: string): LaunchZone[] {
  const zones: LaunchZone[] = [];
  const notamNumber = xml.match(/<notamNumber>([^<]+)<\/notamNumber>/i)?.[1] ?? '';
  const windowStart = xml.match(/<startDate>([^<]+)<\/startDate>/i)?.[1] ?? '';
  const windowEnd   = xml.match(/<endDate>([^<]+)<\/endDate>/i)?.[1] ?? '';

  const areaGroups = [...xml.matchAll(/<TFRAreaGroup>([\s\S]*?)<\/TFRAreaGroup>/gi)];

  for (const group of areaGroups) {
    const groupXml = group[1];

    const isAha = /\bAHA\b/i.test(groupXml);
    const isDra = /\bDRA\b/i.test(groupXml);
    if (!isAha && !isDra) continue;

    const coords = parseDmsPolygon(groupXml);
    if (coords.length < 3) continue;

    zones.push({
      type:        isAha ? 'AHA' : 'DRA',
      polygon:     coords,
      notamNumber,
      windowStart,
      windowEnd,
    });
  }

  return zones;
}

function parseDmsPolygon(xml: string): [number, number][] {
  const points = [...xml.matchAll(
    /lat="(\d{2})(\d{2})(\d{2})([NS])"[^>]*lon="(\d{3})(\d{2})(\d{2})([EW])"/gi
  )];
  return points.map(m => {
    const lat = (parseInt(m[1]) + parseInt(m[2])/60 + parseInt(m[3])/3600)
                * (m[4] === 'S' ? -1 : 1);
    const lon = (parseInt(m[5]) + parseInt(m[6])/60 + parseInt(m[7])/3600)
                * (m[8] === 'W' ? -1 : 1);
    return [lat, lon];
  });
}

export async function fetchLaunchTfrs(): Promise<LaunchZone[]> {
  const zones: LaunchZone[] = [];
  try {
    const listRes = await fetch('https://tfr.faa.gov/tfr2/list.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!listRes.ok) {
      console.error('[TFR] List fetch failed:', listRes.status);
      return zones;
    }

    const html = await listRes.text();
    const tfrIds: string[] = [];
    const linkRe = /detail_(\d+_\d+)\.html/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      if (!tfrIds.includes(m[1])) tfrIds.push(m[1]);
    }

    const xmlResults = await Promise.allSettled(
      tfrIds.slice(0, 10).map(id =>
        fetch(`https://tfr.faa.gov/save_pages/detail_${id}.xml`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
          signal: AbortSignal.timeout(8000),
        }).then(r => r.ok ? r.text() : Promise.reject(r.status))
      )
    );

    for (const result of xmlResults) {
      if (result.status !== 'fulfilled') continue;
      const xml = result.value;

      if (!/space\s+operation/i.test(xml)) continue;

      const parsed = parseLaunchTfr(xml);
      zones.push(...parsed);
    }

    console.log(`[TFR] ${zones.length} zone(s) AHA/DRA trouvée(s)`);
  } catch (e) {
    console.error('[TFR]', e);
  }
  return zones;
}
