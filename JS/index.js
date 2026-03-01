const MetarTaf = require("metar-taf-parser");
const Formatter = require("./formatter");

/**
 * Returns true when the raw TAF/METAR string contains a VV/// group.
 * This is needed to distinguish "no VV group" (undefined) from
 * "VV///" (undefined but present — unmeasurable vertical visibility).
 */
function hasVVSlash(raw) {
    return /\bVV\/\/\/\b/.test(raw);
}

export class MetarTafParser {

    // -------------------------------------------------------------------------
    // METAR
    // -------------------------------------------------------------------------

    static parseMetar(metar) {
        return JSON.stringify(MetarTaf.parseMetar(metar));
    }

    static getFlightCategory(metar) {
        const parsed = MetarTaf.parseMetar(metar);
        return Formatter.getFlightCategory(
            parsed.visibility,
            parsed.clouds,
            parsed.verticalVisibility,
            hasVVSlash(metar)
        );
    }

    /**
     * Like getFlightCategory but also returns the limiting factor
     * (ceiling or visibility) so the UI can highlight the right parameter.
     *
     * Returns JSON: { flightCategory, limitingFactor: { type, valueFt?, cloud?, valueMiles?, valueMeters? } }
     */
    static getFlightCategoryDetails(metar) {
        const parsed = MetarTaf.parseMetar(metar);
        return JSON.stringify(
            Formatter.getFlightCategoryDetails(
                parsed.visibility,
                parsed.clouds,
                parsed.verticalVisibility,
                hasVVSlash(metar)
            )
        );
    }

    /**
     * Checks LVP conditions for a METAR at a specific ICAO airport.
     *
     * Returns JSON: { isLVP: bool, triggeringFactor: string|null }
     * triggeringFactor examples:
     *   "VV///"
     *   "ceiling ≤ 200ft (200ft)"
     *   "visibility ≤ 600m (550m)"
     */
    static checkLVP(metar, icao) {
        const parsed = MetarTaf.parseMetar(metar);
        return JSON.stringify(
            Formatter.checkLVP(
                icao,
                parsed.visibility,
                parsed.clouds,
                parsed.verticalVisibility,
                hasVVSlash(metar)
            )
        );
    }

    // -------------------------------------------------------------------------
    // TAF
    // -------------------------------------------------------------------------

    static parseTAF(taf) {
        return JSON.stringify(MetarTaf.parseTAF(taf));
    }

    /**
     * Analyses every line of a TAF independently (base + all trends).
     * Returns a JSON array, one entry per segment:
     *
     * [
     *   {
     *     type:            "BASE" | "TEMPO" | "BECMG" | "PROB" | "FM" | ...,
     *     probability:     number | null,   // e.g. 40 for PROB40, null otherwise
     *     isAlertingProb:  bool,             // true when probability >= PROB_ALERT_THRESHOLD (40)
     *     period:          object,           // validity from the parser
     *     flightCategory:  "VFR"|"MVFR"|"IFR"|"LIFR",
     *     limitingFactor:  {
     *       type:        "ceiling"|"visibility"|"VV///",
     *       valueFt:     number|null,
     *       cloud:       object|null,   // parsed BKN/OVC cloud object
     *       valueMiles:  number|null,
     *       valueMeters: number|null,
     *     },
     *     lvp: { isLVP: bool, triggeringFactor: string|null } | null
     *   },
     *   ...
     * ]
     *
     * @param {string}      taf   — full raw TAF string
     * @param {string|null} icao  — ICAO code for LVP check, or null to skip
     */
    static getTAFFlightCategories(taf, icao = null) {
        const parsed = MetarTaf.parseTAF(taf);
        const results = [];

        // Helper: analyse one segment (base or trend)
        function analyseSegment(visibility, clouds, verticalVisibility, rawSegment) {
            const vvGroup = hasVVSlash(rawSegment || "");
            const details = Formatter.getFlightCategoryDetails(
                visibility,
                clouds || [],
                verticalVisibility,
                vvGroup
            );
            const lvp = icao
                ? Formatter.checkLVP(
                    icao,
                    visibility,
                    clouds || [],
                    verticalVisibility,
                    vvGroup
                  )
                : null;
            return { details, lvp };
        }

        // Base conditions (first line of TAF)
        const baseRaw = taf.split(/\n/)[0] || taf;
        const base = analyseSegment(
            parsed.visibility,
            parsed.clouds,
            parsed.verticalVisibility,
            baseRaw
        );
        results.push({
            type:           "BASE",
            probability:    null,
            isAlertingProb: false,
            period:         parsed.validity,
            flightCategory: base.details.flightCategory,
            limitingFactor: base.details.limitingFactor,
            lvp:            base.lvp,
        });

        // Individual trend lines (TEMPO, BECMG, PROB, FM, …)
        if (Array.isArray(parsed.trends)) {
            parsed.trends.forEach((trend) => {
                // Best-effort: extract the raw text of this trend from the TAF
                // by matching its type keyword + validity window in the raw string.
                const trendTypeRe = trend.type ? trend.type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
                const rawTrendMatch = trendTypeRe
                    ? taf.match(new RegExp(`(?:PROB\\d+\\s+)?${trendTypeRe}[\\s\\S]*?(?=TEMPO|BECMG|PROB|FM\\d{6}|$)`))
                    : null;
                const rawTrend = rawTrendMatch ? rawTrendMatch[0] : taf;

                const prob   = trend.probability ?? null;
                const result = analyseSegment(
                    trend.visibility,
                    trend.clouds,
                    trend.verticalVisibility,
                    rawTrend
                );

                results.push({
                    type:           trend.type || "UNKNOWN",
                    probability:    prob,
                    isAlertingProb: prob != null && prob >= Formatter.PROB_ALERT_THRESHOLD,
                    period:         trend.validity,
                    flightCategory: result.details.flightCategory,
                    limitingFactor: result.details.limitingFactor,
                    lvp:            result.lvp,
                });
            });
        }

        return JSON.stringify(results);
    }

    // -------------------------------------------------------------------------
    // Formatting (unchanged)
    // -------------------------------------------------------------------------

    static formatFlightCategory(category) {
        return Formatter.formatFlightCategory(category);
    }

    static formatClouds(metar) {
        const parsed = MetarTaf.parseMetar(metar);
        return Formatter.formatClouds(parsed.clouds);
    }

    static formatVisibility(metar) {
        const parsed = MetarTaf.parseMetar(metar);
        return Formatter.formatVisibility(parsed.visibility);
    }
}
