import type { Alert } from './alertsServer';
import { LC_AIRPORTS } from './airports';

// ─── Helpers ────────────────────────────────────────────────────────────────────

type Severity = 'red' | 'orange' | 'yellow';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function getAirportsNearCoords(lat: number, lon: number, radiusKm = 400): string[] {
  return LC_AIRPORTS
    .filter(a => haversineKm(lat, lon, a.lat, a.lon) <= radiusKm)
    .map(a => a.icao);
}

function regionFromCoords(lat: number, lon: number): string {
  if (lon > 60) return 'ASIE';
  if (lon > 20 && lat < 40) return 'AFR';
  if (lon > -20 && lat < 40) return 'AFR';
  if (lon < -30 && lat > 20) return 'AMN';
  if (lon < -30 && lat <= 20) return 'AMS';
  return 'EUR';
}

function stripCdata(s: string): string {
  let result = s;
  let start = result.indexOf('<![CDATA[');
  while (start !== -1) {
    const end = result.indexOf(']]>', start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(start + 9, end) + result.slice(end + 3);
    start = result.indexOf('<![CDATA[', start);
  }
  return result;
}

const HAWAII_VOLCANO_NAMES = new Set([
  'KILAUEA', 'MAUNA LOA', 'MAUNA KEA', 'HUALALAI', 'LOIHI',
  'KILAUEA VOLCANO', 'MAUNA LOA VOLCANO',
]);

function isHawaiiVolcano(name: string | null | undefined): boolean {
  if (!name) return false;
  return HAWAII_VOLCANO_NAMES.has(name.toUpperCase().trim());
}

function getAirportsNearCoordsWithOverride(lat: number, lon: number, radiusKm: number, volcanoName?: string | null): string[] {
  const base = getAirportsNearCoords(lat, lon, radiusKm);
  const isHawaii = (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154) || isHawaiiVolcano(volcanoName);
  if (isHawaii && !base.includes('NTAA')) return [...base, 'NTAA'];
  return base;
}

function hasAshCloudExtent(text: string): boolean {
  const extentPatterns = [
    /([NS])\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*\s+[NS]\s*\d+\.?\d*\s+[EW]\s*\d+\.?\d*/i,
    /extent.*?[0-9.-]+\s*[NS]\s+to\s+[0-9.-]+\s*[NS]/i,
    /[NS]\d{2,3}\s*[EW]\d{2,3}\s*[-–]\s*[NS]\d{2,3}\s*[EW]\d{2,3}/i,
    /<gml:posList[^>]*>([\s\S]*?)<\/gml:posList>/i,
    /within\s+[0-9.-]+\s*km\s+of/i,
    /bounded\s+by/i,
    /box\s+from/i,
    /ashCloudExtent/i,
    /(-?\d+\.?\d+\s+-?\d+\.?\d+\s+){2,}/,
  ];
  return extentPatterns.some(p => p.test(text));
}

function vaacGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
}

function iwxxmGetTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function vaacParseVolcanoCoords(text: string): { lat: number; lon: number } | null {
  const m = text.match(/([NS])\s*(\d+(?:\.\d+)?)\s+([EW])\s*(\d+(?:\.\d+)?)/i);
  if (!m) {
    const m2 = text.match(/(\d+(?:\.\d+)?)\s*([NS])\s+(\d+(?:\.\d+)?)\s*([EW])/i);
    if (!m2) return null;
    return {
      lat: parseFloat(m2[1]) * (m2[2].toUpperCase() === 'S' ? -1 : 1),
      lon: parseFloat(m2[3]) * (m2[4].toUpperCase() === 'W' ? -1 : 1),
    };
  }
  return {
    lat: parseFloat(m[2]) * (m[1].toUpperCase() === 'S' ? -1 : 1),
    lon: parseFloat(m[4]) * (m[3].toUpperCase() === 'W' ? -1 : 1),
  };
}

function vaacParseFlLevel(text: string): string {
  const m = text.match(/FL\s*(\d{3})/i);
  return m ? `FL${m[1]}` : '';
}

function vaacSeverity(flLevel: string): Severity {
  if (!flLevel) return 'yellow';
  const fl = parseInt(flLevel.replace('FL', ''), 10);
  if (fl >= 200) return 'red';
  if (fl >= 100) return 'orange';
  return 'yellow';
}

// ─── parseVaaTextBlock ───────────────────────────────────────────────────────────

function parseVaaTextBlock(block: string, sourceName: string, region: string, sourceUrl: string): Alert | null {
  try {
    const clean = block.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
    if (!hasAshCloudExtent(clean)) return null;
    if (/NO FURTHER ADVISORIES/i.test(clean)) return null;
    const fcstLines = clean.match(/FCST VA CLD \+\d+HR[^\n\r]*/gi) ?? [];
    if (fcstLines.length > 0 && fcstLines.every(l => /NO VA EXP/i.test(l))) return null;

    const get = (tag: string) =>
      clean.match(new RegExp(`${tag}[:\\s]+([^\\n\\r]{2,60})`, 'i'))?.[1]?.trim() ?? '';

    const volcanoRaw = get('VOLCANO') || 'Inconnu';
    const volcano = volcanoRaw !== 'Inconnu' ? volcanoRaw : null;
    const dtg     = get('DTG');
    const psn     = get('PSN');
    const flLevel = vaacParseFlLevel(clean);
    const coords  = vaacParseVolcanoCoords(psn || clean);
    const severity = vaacSeverity(flLevel);

    let lat = coords?.lat;
    let lon = coords?.lon;
    if (!coords) {
      const psnDM = psn.match(/([NS])(\d{2})(\d{2})\s+([EW])(\d{3})(\d{2})/i);
      if (psnDM) {
        lat = (parseInt(psnDM[2]) + parseInt(psnDM[3]) / 60) * (psnDM[1].toUpperCase() === 'S' ? -1 : 1);
        lon = (parseInt(psnDM[5]) + parseInt(psnDM[6]) / 60) * (psnDM[4].toUpperCase() === 'W' ? -1 : 1);
      }
    }

    const nxtMatch = clean.match(/NXT ADVISORY[:\s]+(?:WILL BE ISSUED BY\s+)?(\d{8}\/\d{4})Z/i);
    let validTo: string | null = null;
    if (nxtMatch) {
      const s = nxtMatch[1];
      const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00Z`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        if (d < new Date()) return null;
        validTo = iso;
      }
    }

    const volcanoDisplay = volcano ?? 'Volcan';
    const airports = (lat != null && lon != null)
      ? getAirportsNearCoordsWithOverride(lat, lon, 800, volcano)
      : [];

    return {
      id:         `VAAC-${sourceName}-${volcanoDisplay.replace(/\s+/g, '_')}-${dtg || Date.now()}`,
      source:     'VAAC',
      region,
      severity,
      phenomenon: 'Cendres volcaniques',
      country:    get('AREA') || sourceName,
      airports,
      ...(lat != null && lon != null ? { lat, lon } : {}),
      validFrom:  new Date().toISOString(),
      validTo,
      headline:   `Cendres volcaniques — ${volcanoDisplay}${flLevel ? ' ' + flLevel : ''} (VAAC ${sourceName})`,
      description: clean.slice(0, 400).trim(),
      link:       sourceUrl,
      eventType:  'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    } as any;
  } catch {
    return null;
  }
}

function parseVAACRssItem(item: string, sourceName: string, region: string): Alert | null {
  try {
    const title       = vaacGetTag(item, 'title');
    const description = vaacGetTag(item, 'description');
    const link        = vaacGetTag(item, 'link');
    const pubDate     = vaacGetTag(item, 'pubDate') || vaacGetTag(item, 'dc:date');
    const text        = `${title}\n${description}`;

    if (!hasAshCloudExtent(text)) return null;

    const flLevel  = vaacParseFlLevel(text);
    const coords   = vaacParseVolcanoCoords(text);
    const severity = vaacSeverity(flLevel);

    const volcanoRaw = title.match(/VOLCANO:\s*([^\n/|,]+)/i)?.[1]?.trim()
      || title.match(/^([A-Z\s]+(?:VOLCANO)?)\s/i)?.[1]?.trim()
      || null;
    const volcano = volcanoRaw && volcanoRaw !== 'Inconnu' ? volcanoRaw : null;

    const airports = coords
      ? getAirportsNearCoordsWithOverride(coords.lat, coords.lon, 800, volcano)
      : [];

    return {
      id:         `VAAC-${sourceName}-${(volcano ?? 'unknown').replace(/\s+/g, '_')}-${pubDate}`,
      source:     'VAAC',
      region,
      severity,
      phenomenon: 'Cendres volcaniques',
      country:    vaacGetTag(item, 'dc:subject') || sourceName,
      airports,
      ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
      validFrom:  pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      validTo:    null,
      headline:   `Cendres volcaniques — ${volcano ?? 'Volcan'}${flLevel ? ' ' + flLevel : ''} (VAAC ${sourceName})`,
      description: description.slice(0, 400),
      link,
      eventType:  'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    } as any;
  } catch {
    return null;
  }
}

async function fetchVAACRss(sourceName: string, url: string, region: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/rss+xml,text/xml,application/xml,*/*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn(`[VAAC ${sourceName}] HTTP ${res.status}`); return alerts; }
    const xml   = await res.text();
    const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
    if (items.length === 0) { console.log(`[VAAC ${sourceName}] Aucun advisory actif`); return alerts; }
    for (const item of items) {
      const alert = parseVAACRssItem(item, sourceName, region);
      if (alert) alerts.push(alert);
    }
    console.log(`[VAAC ${sourceName}] ${alerts.length}/${items.length} advisory(ies) avec extent`);
  } catch (e) {
    console.warn(`[VAAC ${sourceName}]`, e instanceof Error ? e.message : e);
  }
  return alerts;
}

async function fetchVAACHtml(sourceName: string, url: string, region: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn(`[VAAC ${sourceName}] HTTP ${res.status}`); return alerts; }
    const html   = await res.text();
    const hasVAA = /VA\s+ADVISORY|VOLCANIC\s+ASH\s+ADVISORY/i.test(html);
    if (!hasVAA) { console.log(`[VAAC ${sourceName}] Aucun advisory actif`); return alerts; }
    const blocks = html.split(/(?=VA\s+ADVISORY)/i).filter(b => b.trim().length > 30);
    for (const block of blocks.slice(0, 10)) {
      const alert = parseVaaTextBlock(block, sourceName, region, url);
      if (alert) alerts.push(alert);
    }
    console.log(`[VAAC ${sourceName}] ${alerts.length}/${blocks.length} advisory(ies) avec extent`);
  } catch (e) {
    console.warn(`[VAAC ${sourceName}]`, e instanceof Error ? e.message : e);
  }
  return alerts;
}

// ─── VAAC Washington (IWXXM XML) ─────────────────────────────────────────────────

const VAAC_WASHINGTON_BASE   = 'https://www.ospo.noaa.gov/products/atmosphere/vaac';
const VAAC_WASHINGTON_ORIGIN = 'https://www.ospo.noaa.gov';

async function fetchVAACWashington(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const listRes = await fetch(`${VAAC_WASHINGTON_BASE}/messages.html`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
      signal:  AbortSignal.timeout(10000),
    });
    if (!listRes.ok) { console.warn(`[VAAC Washington] listing HTTP ${listRes.status}`); return alerts; }
    const html     = await listRes.text();
    const xmlLinks: string[] = [];
    const linkRe   = /href="([^"]*\/xml_files\/FVXX\d+_\d+_\d+\.xml)"/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].startsWith('http') ? m[1] : `${VAAC_WASHINGTON_ORIGIN}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
      if (!xmlLinks.includes(href)) xmlLinks.push(href);
    }
    if (xmlLinks.length === 0) { console.warn('[VAAC Washington] aucun fichier XML'); return alerts; }

    const xmlResults = await Promise.allSettled(
      xmlLinks.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
          signal:  AbortSignal.timeout(10000),
        }).then(r => r.ok ? r.text() : Promise.reject(r.status))
      )
    );

    for (let i = 0; i < xmlResults.length; i++) {
      const res = xmlResults[i];
      if (res.status !== 'fulfilled') continue;
      const xml = res.value;

      const hasIwxxmExtent =
        /<(?:[^:>]+:)?posList[^>]*>[^<]{10,}<\/(?:[^:>]+:)?posList>/i.test(xml) ||
        /<(?:[^:>]+:)?ashCloud[^/][^>]*>[\s\S]{20,}<\/(?:[^:>]+:)?ashCloud>/i.test(xml);
      if (!hasIwxxmExtent) continue;

      const volcanoBlockMatch = xml.match(/<(?:[^:>]+:)?EruptingVolcano[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?EruptingVolcano>/i);
      let volcanoName: string | null = null;
      if (volcanoBlockMatch) {
        const nameMatch = volcanoBlockMatch[1].match(/<(?:[^:>]+:)?name(?:\s[^>]*)?>([^<]*)<\/(?:[^:>]+:)?name>/i);
        if (nameMatch) volcanoName = nameMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+\d+$/, '').trim() || null;
      }

      const posTag = xml.match(/<gml:pos[^>]*>([\s\S]*?)<\/gml:pos>/i);
      if (!posTag) continue;
      const parts = posTag[1].trim().split(/\s+/);
      if (parts.length < 2) continue;
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const issueTimeRaw    = iwxxmGetTag(xml, 'timePosition');
      const stateOrRegion   = iwxxmGetTag(xml, 'stateOrRegion');
      const advisoryNumber  = iwxxmGetTag(xml, 'advisoryNumber');
      const eruptionDetails = iwxxmGetTag(xml, 'eruptionDetails');

      const upperLimitMatch = xml.match(/<(?:[^:>]+:)?upperLimit\s+uom="FL"[^>]*>(\d+)<\/(?:[^:>]+:)?upperLimit>/i);
      const flValue  = upperLimitMatch ? parseInt(upperLimitMatch[1], 10) : 0;
      const flLevel  = flValue > 0 ? `FL${String(flValue).padStart(3, '0')}` : '';

      const dirMatch  = xml.match(/<(?:[^:>]+:)?directionOfMotion[^>]*>(\d+(?:\.\d+)?)<\/(?:[^:>]+:)?directionOfMotion>/i);
      const spdMatch  = xml.match(/<(?:[^:>]+:)?speedOfMotion[^>]*>(\d+(?:\.\d+)?)<\/(?:[^:>]+:)?speedOfMotion>/i);
      const direction = dirMatch ? Math.round(parseFloat(dirMatch[1])) : null;
      const speedKt   = spdMatch ? Math.round(parseFloat(spdMatch[1])) : null;

      const nextAdvisoryBlock   = xml.match(/<(?:[^:>]+:)?nextAdvisoryTime[^>]*>[\s\S]*?<\/(?:[^:>]+:)?nextAdvisoryTime>/i);
      const noFurtherAdvisory   = /NO_FURTHER_ADVISORIES|no further advisories/i.test(xml);
      const nextAdvisoryTimeStr = nextAdvisoryBlock
        ? (nextAdvisoryBlock[0].match(/<gml:timePosition[^>]*>([^<]+)<\/gml:timePosition>/i) || [])[1] || null
        : null;

      if (noFurtherAdvisory) continue;
      if (nextAdvisoryTimeStr && new Date(nextAdvisoryTimeStr) < new Date()) continue;

      const volcanoDisplay = volcanoName ?? 'Volcan inconnu';
      const flStr     = flLevel ? ` — Cendres ${flLevel}` : '';
      const motionStr = direction !== null && speedKt !== null ? ` | ${direction}° / ${speedKt} kt` : '';
      const airports  = getAirportsNearCoordsWithOverride(lat, lon, 600, volcanoName);

      alerts.push({
        id:          `vaac-washington-${volcanoDisplay.replace(/\s/g, '')}-${issueTimeRaw}`,
        source:      'VAAC',
        region:      regionFromCoords(lat, lon),
        severity:    vaacSeverity(flLevel),
        phenomenon:  'Cendres volcaniques',
        country:     stateOrRegion || 'Amérique centrale',
        airports,
        lat, lon,
        validFrom:   issueTimeRaw,
        validTo:     nextAdvisoryTimeStr,
        headline:    `Avis cendres volcaniques : ${volcanoDisplay}${flStr}${motionStr} (VAAC Washington)`,
        description: [
          advisoryNumber  ? `Advisory ${advisoryNumber}` : '',
          eruptionDetails,
          flLevel         ? `Niveau : ${flLevel}` : '',
          direction !== null ? `Direction : ${direction}°` : '',
          speedKt   !== null ? `Vitesse : ${speedKt} kt` : '',
        ].filter(Boolean).join(' — ').slice(0, 500),
        link:        xmlLinks[i],
        eventType:   'VAAC',
        ...(volcanoName ? { volcanoName } : {}),
      } as any);
    }
  } catch (e) {
    console.error('[VAAC Washington]', e);
  }
  return alerts;
}

// ─── VAAC Tokyo (scraping dédié) ───────────────────────────────────────────────────

const VAAC_TOKYO_LIST = 'https://www.data.jma.go.jp/vaac/data/vaac_list.html';
const VAAC_TOKYO_BASE = 'https://www.data.jma.go.jp';

function parseVAACTokyoText(text: string, fileUrl: string): Alert | null {
  try {
    const clean = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&[a-z]+;/gi, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ');

    if (/NO FURTHER ADVISORIES/i.test(clean)) return null;
    if (/VA NOT IDENTIFIABLE FM SATELLITE/i.test(clean)) return null;
    if (/VAAC TOKYO HAS TRANSFERRED RESPONSIBILITY/i.test(clean)) return null;
    const fcstLines = clean.match(/FCST VA CLD \+\d+HR[^\n]*/gi) ?? [];
    if (fcstLines.length > 0 && fcstLines.every(l => /NO VA EXP/i.test(l))) return null;

    const get = (tag: string) =>
      clean.match(new RegExp(`${tag}[:\s]+([^\n]{2,80})`, 'im'))?.[1]?.trim() ?? '';

    const volcanoRaw = get('VOLCANO');
    const volcano = volcanoRaw ? volcanoRaw.replace(/\s+\d{6}$/, '').trim() || null : null;
    const dtg  = get('DTG');
    const psn  = get('PSN');
    const areaRaw = get('AREA');
    const area = areaRaw.split(/\s+/)[0] || 'Asie';

    const flMatch = clean.match(/(?:OBS|FCST)\s+VA\s+CLD[^\n]*?(?:SFC\/)?FL(\d{3})/i)
      || clean.match(/FL\s*(\d{3})/i);
    const flLevel  = flMatch ? `FL${flMatch[1]}` : '';
    const severity = vaacSeverity(flLevel);

    function parsePSN(s: string): { lat: number; lon: number } | null {
      const dm = s.match(/([NS])(\d{2})(\d{2})\s+([EW])(\d{2,3})(\d{2})/i);
      if (dm) {
        return {
          lat: (parseInt(dm[2]) + parseInt(dm[3]) / 60) * (dm[1].toUpperCase() === 'S' ? -1 : 1),
          lon: (parseInt(dm[5]) + parseInt(dm[6]) / 60) * (dm[4].toUpperCase() === 'W' ? -1 : 1),
        };
      }
      return vaacParseVolcanoCoords(s);
    }

    const coords = parsePSN(psn) ?? parsePSN(clean);
    const volcanoDisplay = volcano ?? 'Volcan inconnu';
    const baseAirports = coords != null
      ? getAirportsNearCoordsWithOverride(coords.lat, coords.lon, 800, volcano)
      : [];

    const extraAirports: string[] = [];
    if (coords != null) {
      const isRussian = coords.lat > 45 && coords.lon > 100;
      const isPhilippines = coords.lat < 25 && coords.lon >= 115 && coords.lon <= 130;
      if (isRussian) extraAirports.push('RJTT', 'RJBB', 'RKSI');
      if (isPhilippines && !baseAirports.includes('RPLL')) extraAirports.push('RPLL');
    }
    const airports = [...new Set([...baseAirports, ...extraAirports])];

    const CARDINAL_TO_DEG: Record<string, number> = {
      N: 360, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
      S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337,
    };
    let direction: number | null = null;
    let speedKt:   number | null = null;
    const movCardinal = clean.match(/MOV[:\s]+([A-Z]{1,3})\s+(\d+)\s*KT/i);
    const movDeg      = clean.match(/MOV[:\s]+(\d{3})\s*DEG\s+(\d+)\s*KT/i);
    if (movCardinal) { direction = CARDINAL_TO_DEG[movCardinal[1].toUpperCase()] ?? null; speedKt = parseInt(movCardinal[2], 10); }
    else if (movDeg) { direction = parseInt(movDeg[1], 10); speedKt = parseInt(movDeg[2], 10); }

    const descLines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !/^(FVFE|Tokyo VAAC|Volcanic Ash Advisory|Back to)/i.test(l));
    const motionParts = [direction !== null ? `Direction : ${direction}°` : '', speedKt !== null ? `Vitesse : ${speedKt} kt` : ''].filter(Boolean).join(' — ');
    const description = [descLines.slice(0, 12).join(' | '), motionParts].filter(Boolean).join(' — ').slice(0, 500);

    return {
      id:          `VAAC-Tokyo-${volcanoDisplay.replace(/\s+/g, '_')}-${dtg || Date.now()}`,
      source:      'VAAC',
      region:      'ASIE',
      severity,
      phenomenon:  'Cendres volcaniques',
      country:     area,
      airports,
      ...(coords != null ? { lat: coords.lat, lon: coords.lon } : {}),
      validFrom:   new Date().toISOString(),
      validTo:     null,
      headline:    `Cendres volcaniques — ${volcanoDisplay}${flLevel ? ' ' + flLevel : ''} (VAAC Tokyo)`,
      description,
      link:        fileUrl,
      eventType:   'VAAC',
      ...(volcano ? { volcanoName: volcano } : {}),
    } as any;
  } catch {
    return null;
  }
}

async function fetchVAACTokyo(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const listRes = await fetch(VAAC_TOKYO_LIST, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!listRes.ok) { console.warn(`[VAAC Tokyo] listing HTTP ${listRes.status}`); return alerts; }
    const html = await listRes.text();

    const now = Date.now();
    const maxAge = 24 * 3600 * 1000;
    const textLinks: string[] = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(html)) !== null) {
      const row = rowMatch[1];
      const linkMatch = row.match(/href="([^"]*_Text\.html)"/i);
      if (!linkMatch) continue;
      const href = linkMatch[1];
      const dateMatch = row.match(/<td[^>]*>\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s*<\/td>/i);
      if (dateMatch) {
        const iso = dateMatch[1].replace(/\//g, '-').replace(' ', 'T') + 'Z';
        const rowDate = new Date(iso).getTime();
        if (!isNaN(rowDate) && now - rowDate > maxAge) continue;
      }
      let fullUrl: string;
      if (href.startsWith('http')) fullUrl = href;
      else if (href.startsWith('/')) fullUrl = `${VAAC_TOKYO_BASE}${href}`;
      else { const base = VAAC_TOKYO_LIST.replace(/[^/]+$/, ''); fullUrl = `${base}${href}`; }
      if (!textLinks.includes(fullUrl)) textLinks.push(fullUrl);
    }

    if (textLinks.length === 0) { console.log('[VAAC Tokyo] Aucun advisory récent (< 24h)'); return alerts; }

    const fileResults = await Promise.allSettled(
      textLinks.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkyWatch/1.0)' },
          signal:  AbortSignal.timeout(8000),
        }).then(r => r.ok ? r.text() : Promise.reject(r.status))
      )
    );

    const parsed: Alert[] = [];
    for (let i = 0; i < fileResults.length; i++) {
      const res = fileResults[i];
      if (res.status !== 'fulfilled') continue;
      const alert = parseVAACTokyoText(res.value, textLinks[i]);
      if (alert) parsed.push(alert);
    }

    const seenVolcano = new Set<string>();
    for (const alert of parsed) {
      const key = ((alert as any).volcanoName ?? alert.headline).toUpperCase();
      if (!seenVolcano.has(key)) { seenVolcano.add(key); alerts.push(alert); }
    }
    console.log(`[VAAC Tokyo] ${alerts.length} advisory(ies) actif(s)`);
  } catch (e) {
    console.warn('[VAAC Tokyo]', e instanceof Error ? e.message : e);
  }
  return alerts;
}

// ─── Export principal ──────────────────────────────────────────────────────────────────

export async function fetchVAAC(): Promise<Alert[]> {
  const results = await Promise.allSettled([
    fetchVAACWashington(),
    fetchVAACHtml('Anchorage',     'https://www.weather.gov/vaac/VA_advisories',                   'AMN'),
    fetchVAACHtml('Montreal',      'https://weather.gc.ca/eer/vaac/index_e.html',                  'AMN'),
    fetchVAACHtml('Buenos Aires',  'https://www.ssd.noaa.gov/VAAC/OTH/BA/messages.html',          'AMS'),
    fetchVAACHtml('London',        'https://www.ssd.noaa.gov/VAAC/OTH/UK/messages.html',          'EUR'),
    fetchVAACRss('Toulouse',       'https://vaac.meteo.fr/rss/vaac_feed.rss',                      'EUR'),
    fetchVAACTokyo(),
    fetchVAACHtml('Darwin',        'http://www.bom.gov.au/aviation/volcanic-ash/',                 'ASIE'),
    fetchVAACHtml('Wellington',    'http://vaac.metservice.com/',                                  'PAC'),
  ]);
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
