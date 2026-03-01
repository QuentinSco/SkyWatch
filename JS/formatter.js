const {
    Descriptive,
    Intensity,
    Phenomenon,
    SpeedUnit,
    CloudQuantity,
    CloudType,
    DistanceUnit,
    ValueIndicator,
    Visibility,
    ICloud,
    TurbulenceIntensity,
    IcingIntensity,
} = require("metar-taf-parser");

const FlightCategory = {
    VFR: "VFR",
    MVFR: "MVFR",
    IFR: "IFR",
    LIFR: "LIFR",
};

// LVP thresholds per ICAO code (ceiling in feet, visibility/RVR in meters)
// These reflect CAT III LVP activation criteria per local aerodrome procedures.
const LVP_THRESHOLDS = {
    LFPG: { ceilingFt: 200, rvrMeters: 600 }, // CDG
    LFPO: { ceilingFt: 200, rvrMeters: 600 }, // ORY
    EGLL: { ceilingFt: 200, rvrMeters: 600 }, // LHR
    EHAM: { ceilingFt: 200, rvrMeters: 600 }, // AMS
    EDDF: { ceilingFt: 200, rvrMeters: 600 }, // FRA
    LEMD: { ceilingFt: 200, rvrMeters: 600 }, // MAD
    LIRF: { ceilingFt: 200, rvrMeters: 600 }, // FCO
    LPPT: { ceilingFt: 200, rvrMeters: 600 }, // LIS
};

// PROB alerting threshold: PROB >= this value triggers a highlighted alert
export const PROB_ALERT_THRESHOLD = 40;

// Category rank: lower value = more restrictive
const CATEGORY_RANK = {
    [FlightCategory.LIFR]: 0,
    [FlightCategory.IFR]: 1,
    [FlightCategory.MVFR]: 2,
    [FlightCategory.VFR]: 3,
};

function worseCategory(a, b) {
    return CATEGORY_RANK[a] <= CATEGORY_RANK[b] ? a : b;
}

// --- Formatting helpers (unchanged) ------------------------------------------

function formatIndicator(indicator) {
    switch (indicator) {
        case ValueIndicator.GreaterThan:
            return "or greater";
        case ValueIndicator.LessThan:
            return "or less";
        default:
            return "";
    }
}

export function formatPhenomenon(phenomenon) {
    switch (phenomenon) {
        case Phenomenon.RAIN:                   return "Rain";
        case Phenomenon.DRIZZLE:                return "Drizzle";
        case Phenomenon.SNOW:                   return "Snow";
        case Phenomenon.SNOW_GRAINS:            return "Snow grains";
        case Phenomenon.ICE_PELLETS:            return "Ice pellets";
        case Phenomenon.ICE_CRYSTALS:           return "Ice crystals";
        case Phenomenon.HAIL:                   return "Hail";
        case Phenomenon.SMALL_HAIL:             return "Small hail";
        case Phenomenon.UNKNOW_PRECIPITATION:   return "Unknown precipitation";
        case Phenomenon.FOG:                    return "Fog";
        case Phenomenon.VOLCANIC_ASH:           return "Volcanic ash";
        case Phenomenon.MIST:                   return "Mist";
        case Phenomenon.HAZE:                   return "Haze";
        case Phenomenon.WIDESPREAD_DUST:        return "Widespread dust";
        case Phenomenon.SMOKE:                  return "Smoke";
        case Phenomenon.SAND:                   return "Sand";
        case Phenomenon.SPRAY:                  return "Spray";
        case Phenomenon.SQUALL:                 return "Squall";
        case Phenomenon.SAND_WHIRLS:            return "Sand whirls";
        case Phenomenon.THUNDERSTORM:           return "Thunderstorm";
        case Phenomenon.DUSTSTORM:              return "Duststorm";
        case Phenomenon.SANDSTORM:              return "Sandstorm";
        case Phenomenon.FUNNEL_CLOUD:           return "Funnel cloud";
        case Phenomenon.NO_SIGNIFICANT_WEATHER: return "No significant weather";
    }
}

function formatDescriptive(descriptive, hasPhenomenon) {
    switch (descriptive) {
        case Descriptive.SHOWERS:
            return `Showers${hasPhenomenon ? " of" : ""}`;
        case Descriptive.SHALLOW:     return "Shallow";
        case Descriptive.PATCHES:
            return `Patches${hasPhenomenon ? " of" : ""}`;
        case Descriptive.PARTIAL:     return "Partial";
        case Descriptive.DRIFTING:    return "Drifting";
        case Descriptive.THUNDERSTORM: return "Thunderstorm";
        case Descriptive.BLOWING:     return "Blowing";
        case Descriptive.FREEZING:    return "Freezing";
        default: return "";
    }
}

function formatIntensity(intensity) {
    switch (intensity) {
        case Intensity.LIGHT:    return "Light";
        case Intensity.MODERATE: return "Moderate";
        case Intensity.HEAVY:    return "Heavy";
        default: return "";
    }
}

function formatSpeed(speed) {
    if (speed.unit === SpeedUnit.KT) {
        return `${speed.value} knots`;
    } else if (speed.unit === SpeedUnit.MPS) {
        return `${speed.value} meters per second`;
    } else {
        return "";
    }
}

export function formatCloudQuantity(cloud) {
    let ret = "";

    switch (cloud.quantity) {
        case CloudQuantity.NSC:
            return "No significant clouds";
        case CloudQuantity.SKC:
            return "Clear sky";
        case CloudQuantity.BKN:
            ret += "Broken clouds";
            break;
        case CloudQuantity.FEW:
            ret += "Few clouds";
            break;
        case CloudQuantity.SCT:
            ret += "Scattered clouds";
            break;
        case CloudQuantity.OVC:
            ret += "Overcast";
    }

    if (cloud.type) {
        ret += ` (${formatCloudType(cloud.type)})`;
    }

    ret += ` at ${cloud.height?.toLocaleString()}ft`;

    return ret;
}

function formatCloudType(type) {
    switch (type) {
        case CloudType.CB:  return "Cumulonimbus";
        case CloudType.TCU: return "Towering cumulus";
        case CloudType.CI:  return "Cirrus";
        case CloudType.CC:  return "Cirrocumulus";
        case CloudType.CS:  return "Cirrostratus";
        case CloudType.AC:  return "Altocumulus";
        case CloudType.ST:  return "Stratus";
        case CloudType.CU:  return "Cumulus";
        case CloudType.AS:  return "Astrostratus";
        case CloudType.NS:  return "Nimbostratus";
        case CloudType.SC:  return "Stratocumulus";
    }
}

function formatDistance(distance) {
    if (distance.unit === DistanceUnit.M) {
        return `${distance.value} meters`;
    } else if (distance.unit === DistanceUnit.KM) {
        return `${distance.value} kilometers`;
    } else {
        return "";
    }
}

export function formatFlightCategory(category) {
    switch (category) {
        case FlightCategory.VFR:  return "Visual Flight Rules (VFR)";
        case FlightCategory.MVFR: return "Marginal Visual Flight Rules (MVFR)";
        case FlightCategory.IFR:  return "Instrument Flight Rules (IFR)";
        case FlightCategory.LIFR: return "Low Instrument Flight Rules (LIFR)";
        default: return "";
    }
}

// --- Ceiling determination ---------------------------------------------------

function determineCeilingFromClouds(clouds) {
    let ceiling;
    clouds.forEach((cloud) => {
        if (
            cloud.height != null &&
            cloud.height < (ceiling?.height || Infinity) &&
            (cloud.quantity === CloudQuantity.OVC ||
                cloud.quantity === CloudQuantity.BKN)
        ) {
            ceiling = cloud;
        }
    });
    return ceiling;
}

/**
 * Determines the effective ceiling in feet, combining cloud ceiling and
 * vertical visibility. Takes the MINIMUM of the two (most restrictive).
 *
 * Edge case — VV///:
 *   When hasVVGroup=true but verticalVisibility is null/undefined, the
 *   vertical visibility is unmeasurable. This is the worst possible case
 *   and is treated as 0ft.
 *
 *   Distinguishing "no VV group" from "VV///" requires the caller to inspect
 *   the raw string (e.g. /\bVV\/\/\/\b/.test(raw)) and pass hasVVGroup=true.
 *
 * @param {Array}           clouds
 * @param {number|null}     verticalVisibility  — feet; null + hasVVGroup = VV///
 * @param {boolean}         hasVVGroup          — true if raw report contains VV group
 * @returns {number} Ceiling in feet, or Infinity if unrestricted
 */
function determineCeiling(clouds, verticalVisibility, hasVVGroup) {
    const cloudCeilingFt = determineCeilingFromClouds(clouds)?.height ?? Infinity;

    let vvFt;
    if (hasVVGroup && verticalVisibility == null) {
        // VV/// — unmeasurable, treat as 0ft (absolute LVP trigger)
        vvFt = 0;
    } else if (typeof verticalVisibility === "number") {
        vvFt = verticalVisibility;
    } else {
        // No VV group present — no restriction from VV
        vvFt = Infinity;
    }

    return Math.min(cloudCeilingFt, vvFt);
}

// --- Unit conversions --------------------------------------------------------

function convertToMiles(visibility) {
    if (!visibility) return undefined;

    switch (visibility.unit) {
        case DistanceUnit.StatuteMiles:
            return visibility.value;
        case DistanceUnit.Meters: {
            const distance = visibility.value * 0.000621371;
            if (visibility.value % 1000 === 0 || visibility.value === 9999)
                return Math.round(distance);
            return +distance.toFixed(2);
        }
        default:
            return undefined;
    }
}

function convertToMeters(visibility) {
    if (!visibility) return undefined;

    switch (visibility.unit) {
        case DistanceUnit.Meters:
            return visibility.value;
        case DistanceUnit.KM:
            return visibility.value * 1000;
        case DistanceUnit.StatuteMiles:
            return Math.round(visibility.value * 1609.34);
        default:
            return undefined;
    }
}

// --- Category helpers --------------------------------------------------------

function getCategoryFromHeight(heightFt) {
    if (heightFt <= 500)  return FlightCategory.LIFR;
    if (heightFt <= 1000) return FlightCategory.IFR;
    if (heightFt <= 3000) return FlightCategory.MVFR;
    return FlightCategory.VFR;
}

function getCategoryFromDistance(distanceMiles) {
    if (distanceMiles <= 1) return FlightCategory.LIFR;
    if (distanceMiles <= 3) return FlightCategory.IFR;
    if (distanceMiles <= 5) return FlightCategory.MVFR;
    return FlightCategory.VFR;
}

// --- Core export: flight category + limiting factor -------------------------

/**
 * Returns the flight category AND identifies which parameter (ceiling or
 * visibility) is the primary limiting factor, so the UI can highlight the
 * right element rather than always defaulting to visibility.
 *
 * When ceiling and visibility map to the same category, ceiling wins
 * (operationally more significant for approach procedures).
 *
 * @param {object}      visibility
 * @param {Array}       clouds
 * @param {number|null} verticalVisibility
 * @param {boolean}     hasVVGroup
 * @returns {{ flightCategory: string, limitingFactor: object }}
 */
export function getFlightCategoryDetails(
    visibility,
    clouds,
    verticalVisibility,
    hasVVGroup = false
) {
    const distanceMiles = convertToMiles(visibility) ?? Infinity;
    const ceilingFt     = determineCeiling(clouds, verticalVisibility, hasVVGroup);

    const ceilingCat = getCategoryFromHeight(ceilingFt);
    const visCat     = getCategoryFromDistance(distanceMiles);

    // Ceiling wins on tie (approach procedure priority)
    const flightCategory = worseCategory(ceilingCat, visCat);

    let limitingFactor;
    if (CATEGORY_RANK[ceilingCat] <= CATEGORY_RANK[visCat]) {
        const isVVSlash = hasVVGroup && verticalVisibility == null;
        limitingFactor = {
            type:    isVVSlash ? "VV///" : "ceiling",
            valueFt: ceilingFt === Infinity ? null : ceilingFt,
            // Cloud object included so UI can render e.g. "BKN002 → 200ft"
            cloud:   isVVSlash ? null : (determineCeilingFromClouds(clouds) ?? null),
        };
    } else {
        limitingFactor = {
            type:        "visibility",
            valueMiles:  distanceMiles === Infinity ? null : distanceMiles,
            valueMeters: convertToMeters(visibility) ?? null,
        };
    }

    return { flightCategory, limitingFactor };
}

/**
 * Backward-compatible wrapper — signature unchanged for existing Swift callers.
 * New callers should prefer getFlightCategoryDetails().
 */
export function getFlightCategory(
    visibility,
    clouds,
    verticalVisibility,
    hasVVGroup = false
) {
    return getFlightCategoryDetails(
        visibility, clouds, verticalVisibility, hasVVGroup
    ).flightCategory;
}

// --- LVP detection -----------------------------------------------------------

/**
 * Checks whether conditions breach LVP thresholds for a given ICAO airport.
 *
 * Trigger priority:
 *   1. VV///  → immediate LVP regardless of reported ceiling value
 *   2. Ceiling ≤ threshold.ceilingFt
 *   3. Visibility ≤ threshold.rvrMeters
 *
 * Returns { isLVP: false } for unknown ICAO codes so callers degrade
 * gracefully when no airport-specific data is configured.
 *
 * @param {string}      icao
 * @param {object}      visibility
 * @param {Array}       clouds
 * @param {number|null} verticalVisibility
 * @param {boolean}     hasVVGroup
 * @returns {{ isLVP: boolean, triggeringFactor: string|null }}
 */
export function checkLVP(
    icao,
    visibility,
    clouds,
    verticalVisibility,
    hasVVGroup = false
) {
    const threshold = LVP_THRESHOLDS[icao?.toUpperCase()];
    if (!threshold) return { isLVP: false, triggeringFactor: null };

    // 1. VV/// → unmeasurable = automatic LVP
    if (hasVVGroup && verticalVisibility == null) {
        return { isLVP: true, triggeringFactor: "VV///" };
    }

    // 2. Ceiling check
    const ceilingFt = determineCeiling(clouds, verticalVisibility, hasVVGroup);
    if (ceilingFt <= threshold.ceilingFt) {
        return {
            isLVP: true,
            triggeringFactor: `ceiling ≤ ${threshold.ceilingFt}ft (${ceilingFt}ft)`,
        };
    }

    // 3. Visibility/RVR check
    const visMeters = convertToMeters(visibility);
    if (visMeters != null && visMeters <= threshold.rvrMeters) {
        return {
            isLVP: true,
            triggeringFactor: `visibility ≤ ${threshold.rvrMeters}m (${visMeters}m)`,
        };
    }

    return { isLVP: false, triggeringFactor: null };
}

// --- Formatting exports ------------------------------------------------------

export function formatVisibility(visibility) {
    if (!visibility) return "Unknown visibility";

    let value = `${visibility.value} ${visibility.unit}`;
    const indiciator = formatIndicator(visibility.indicator);
    if (indiciator) value = `${value} ${indiciator}`;
    return value;
}

export function formatClouds(clouds) {
    if (clouds.length === 0) return "";

    let result = "";
    for (const cloud of clouds) {
        result += `${formatCloudQuantity(cloud)}\n`;
    }
    return result.slice(0, -1);
}

function formatTurbulence(turbulence) {
    if (turbulence.intensity) {
        return `Turbulence: ${formatIntensity(turbulence.intensity)}`;
    }
    return "";
}

function formatIcing(icing) {
    if (icing.intensity) {
        return `Icing: ${formatIntensity(icing.intensity)}`;
    }
    return "";
}

function parseMETAR(metar) {
    const {
        temperature,
        dewPoint,
        wind,
        visibility,
        weather,
        clouds,
        flightCategory,
        turbulence,
        icing,
    } = metar;
    const temperatureString    = temperature    ? `${temperature}°C`                            : "";
    const dewPointString       = dewPoint       ? `${dewPoint}°C`                               : "";
    const windString           = wind           ? formatWind(wind)                              : "";
    const visibilityString     = visibility     ? formatVisibility(visibility)                  : "";
    const weatherString        = weather        ? `Weather: ${weather}`                         : "";
    const cloudsString         = clouds         ? formatClouds(clouds)                          : "";
    const flightCategoryString = flightCategory ? `Flight category: ${formatFlightCategory(flightCategory)}` : "";
    const turbulenceString     = turbulence     ? formatTurbulence(turbulence)                  : "";
    const icingString          = icing          ? formatIcing(icing)                            : "";

    const parsedMETAR = [
        temperatureString,
        dewPointString,
        windString,
        visibilityString,
        weatherString,
        cloudsString,
        flightCategoryString,
        turbulenceString,
        icingString,
    ].filter((item) => item !== "");

    return parsedMETAR.join("\n");
}
