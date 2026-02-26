// ─── Lien bulletin officiel NHC / RSMC selon le basin d’un TC GDACS ──────────────────
//
// Utilisé pour enrichir les alertes GDACS de type TC avec un lien direct
// vers le bulletin le plus pertinent, sans duplication de source.
//
// Règles basin (basé sur la longitude / latitude GDACS) :
//   Atlantique + Pacifique Est/Central  → NHC (NOAA)
//   Océan Indien (ouest de 90°E)        → RSMC La Réunion (Météo-France)
//   Pacifique Ouest / Asie du Sud-Est   → JTWC (US Navy)
//   Pacifique Sud                        → RSMC Nadi (Fiji Met)

export interface TcLinks {
  label: string;   // ex. "Bulletin NHC"
  url: string;     // lien vers la page bulletin officiel
}

/**
 * Retourne le lien bulletin officiel adapté au basin du cyclone.
 * @param lat  Latitude GDACS du système
 * @param lon  Longitude GDACS du système
 * @param basin Basin explicite déjà calculé par alertsServer (optionnel)
 */
export function tcOfficialLink(lat: number, lon: number, basin?: string): TcLinks {
  // Océan Indien occidental : 20°E–90°E et latitude < 30°N
  if (lon >= 20 && lon < 90 && lat < 30) {
    return {
      label: 'Bulletin RSMC La Réunion',
      url:   'https://www.meteo.fr/temps/domtom/La_Reunion/webcmrs9.0/anglais/activitedevstop/rsmc/',
    };
  }
  // Pacifique Ouest / Asie du Sud-Est : lon ≥ 90°E
  if (lon >= 90) {
    return {
      label: 'Bulletin JTWC',
      url:   'https://www.metoc.navy.mil/jtwc/jtwc.html',
    };
  }
  // Pacifique Est : entre 180°W et 100°W (lon entre -180 et -100)
  if (lon <= -100) {
    return {
      label: 'Bulletin NHC (Pac. Est)',
      url:   'https://www.nhc.noaa.gov/?epac',
    };
  }
  // Atlantique / Cäraïbes / Golfe du Mexique : lon entre -100°W et 20°E
  return {
    label: 'Bulletin NHC (Atlantique)',
    url:   'https://www.nhc.noaa.gov/?atlc',
  };
}
