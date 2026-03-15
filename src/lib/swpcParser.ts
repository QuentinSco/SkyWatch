import type { Alert } from './alertsServer';

// ─── SWPC (NOAA Space Weather) ────────────────────────────────────────────────
// Alertes impactant l'aviation : GNSS/GPS, Communications HF/SATCOM, Radiations équipages
//
// Seuils retenus (NOAA scales) :
//   GNSS      → tempête géomagnétique G3+ (Kp≥7) : dégradation GPS sévère
//   HF/SATCOM → radio blackout R3+ (éruption ≥X1) : coupure HF sur face illuminée du globe
//   Radiation → S3+ proton storm (≥10³ pfu) : dose équipages significative routes polaires
//
// Niveaux 1 et 2 ignorés — impact opérationnel insuffisant pour l'aviation commerciale.

type Severity = 'red' | 'orange' | 'yellow';
type SwpcCategory = 'GNSS' | 'HF_SATCOM' | 'RADIATION';

interface SwpcRule {
  match: (productId: string, message: string) => boolean;
  category: SwpcCategory;
  phenomenon: string;
  severity: (message: string) => Severity;
  headline: (message: string) => string;
}

function swpcScale(msg: string, letter: 'G' | 'R' | 'S'): number {
  const m = msg.match(new RegExp(`${letter}(\\d)\\s*[-–]`, 'i'));
  return m ? parseInt(m[1], 10) : 0;
}

function swpcValidFrom(msg: string): string {
  const m = msg.match(/(?:Valid From|Begin Time|Threshold Reached)[:\s]+([\w\s:]+UTC)/i);
  if (m) {
    const d = new Date(m[1].trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function swpcValidTo(msg: string): string | null {
  const m = msg.match(/(?:Valid To|Now Valid Until|End Time)[:\s]+([\w\s:]+UTC)/i);
  if (m) {
    const d = new Date(m[1].trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

const SWPC_RULES: SwpcRule[] = [
  // Tempête géomagnétique G3+ → impact GNSS sévère
  {
    match: (id, msg) => {
      if (/^K(0[7-9]|[1-9]\d)[WA]$/i.test(id)) return true;
      if (/^A[4-9]\dF$/i.test(id)) return true;
      if (swpcScale(msg, 'G') >= 3) return true;
      return false;
    },
    category: 'GNSS',
    phenomenon: 'Perturbation GNSS/GPS',
    severity: (msg) => swpcScale(msg, 'G') >= 4 ? 'red' : 'orange',
    headline: (msg) => {
      const g = swpcScale(msg, 'G');
      const label = g >= 5 ? 'G5 Extrême' : g === 4 ? 'G4 Sévère' : 'G3 Fort';
      return `Tempête géomagnétique ${label} — Perturbations GNSS/GPS sévères`;
    },
  },
  // Radio blackout R3+ (flare ≥X1) → coupure HF/SATCOM
  {
    match: (id, msg) => /^XRA$/i.test(id) || swpcScale(msg, 'R') >= 3,
    category: 'HF_SATCOM',
    phenomenon: 'Radio Blackout HF',
    severity: (msg) => swpcScale(msg, 'R') >= 4 ? 'red' : 'orange',
    headline: (msg) => {
      const r = swpcScale(msg, 'R');
      const label = r >= 5 ? 'R5 Extrême' : r === 4 ? 'R4 Sévère' : 'R3 Fort';
      return `Radio Blackout ${label} — Coupure HF/SATCOM sur face illuminée`;
    },
  },
  // Radiation storm S3+ → dose équipages routes polaires
  {
    match: (id, msg) => /^P1[01][WA]$/i.test(id) || swpcScale(msg, 'S') >= 3,
    category: 'RADIATION',
    phenomenon: 'Radiation Storm',
    severity: (msg) => swpcScale(msg, 'S') >= 4 ? 'red' : 'orange',
    headline: (msg) => {
      const s = swpcScale(msg, 'S');
      const label = s >= 5 ? 'S5 Extrême' : s === 4 ? 'S4 Sévère' : 'S3 Fort';
      return `Radiation Storm ${label} — Évitement routes polaires recommandé`;
    },
  },
];

export async function fetchSWPC(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/alerts.json', {
      headers: {
        'User-Agent': 'SkyWatch/1.0 (aviation alerts)',
        'Accept':     'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[SWPC] HTTP', res.status); return alerts; }

    const json: Array<{ product_id: string; issue_datetime: string; message: string }> = await res.json();
    const seen = new Set<SwpcCategory>();

    for (const item of json) {
      const { product_id, issue_datetime, message } = item;

      for (const rule of SWPC_RULES) {
        if (seen.has(rule.category)) continue;
        if (!rule.match(product_id, message)) continue;

        const validTo = swpcValidTo(message);
        if (validTo && new Date(validTo) < new Date()) continue;

        const severity  = rule.severity(message);
        const validFrom = swpcValidFrom(message);

        const descLines = message
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('Space Weather') && !l.startsWith('NOAA Space'));
        const description = descLines.slice(0, 6).join(' — ').slice(0, 500);

        alerts.push({
          id:          `SWPC-${rule.category}-${issue_datetime}`,
          source:      'SWPC',
          region:      'GLOBAL',
          severity,
          phenomenon:  rule.phenomenon,
          eventType:   `SWPC_${rule.category}`,
          country:     'Global',
          airports:    [],
          validFrom,
          validTo,
          headline:    rule.headline(message),
          description,
          link:        'https://www.swpc.noaa.gov/communities/aviation-community-dashboard',
        } as any);

        seen.add(rule.category);
        break;
      }

      if (seen.size === SWPC_RULES.length) break;
    }

    console.log(`[SWPC] ${alerts.length} alerte(s) space weather active(s)`);
  } catch (e) {
    console.error('[SWPC]', e);
  }
  return alerts;
}
