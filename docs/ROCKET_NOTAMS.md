# Rocket NOTAM Integration (AHA/DRA)

## Vue d'ensemble

SkyWatch intègre un système de visualisation des zones AHA (Anomaly Hazard Area) et DRA (Debris Response Area) liées aux tirs de fusées commerciales et gouvernementales aux États-Unis.

## Architecture

### Composants

1. **Parser** : `JS/notamRocket.js`
   - Analyse le texte brut des NOTAMs
   - Extrait coordonnées, validité, altitude, mission ID
   - Classifie en AHA, DRA, LAUNCH_HAZARD
   - Score de confiance pour chaque classification

2. **API Endpoint** : `src/pages/api/rocket-notams.json.js`
   - Retourne GeoJSON FeatureCollection
   - Mode DEMO actuellement (données mock)
   - Prêt pour intégration avec API externe

3. **Layer Leaflet** : `public/lib/rocket-notam-layer.js`
   - Affichage des polygones sur la carte
   - Popups détaillés avec info NOTAM
   - Auto-refresh toutes les 5 minutes

4. **Test Suite** : `JS/notamRocketTest.js`
   - Validation avec NOTAM KZMA réel
   - Tests de parsing et conversion GeoJSON

## Classification des NOTAMs

### AHA (Anomaly Hazard Area)
- **Statut** : NO_FLY (fermeture stricte)
- **Type NOTAM** : TFR (Temporary Flight Restriction)
- **Couleur** : Rouge (#dc2626)
- **Ligne** : Pleine
- **Opacité** : 50%
- **Exemple** : Zone de retombée en cas d'anomalie lors du tir

### DRA (Debris Response Area)  
- **Statut** : CAUTION (conscience situationnelle)
- **Type NOTAM** : Généralement CARF
- **Couleur** : Orange (#f97316)
- **Ligne** : Pointillée
- **Opacité** : 35%
- **Exemple** : Zone élargie de récupération de débris

### LAUNCH_HAZARD (Hybride)
- **Statut** : CAUTION_HIGH
- **Type NOTAM** : CARF avec "HAZARDOUS OPS"
- **Couleur** : Orange vif (#f59e0b)
- **Ligne** : Pointillée
- **Opacité** : 40%
- **Exemple** : Trajectoire de vol primaire (comme KZMA)

## Format des coordonnées

Les NOTAMs utilisent le format ICAO standard :
```
DDMMSSN/SDDDMMSSW
```

Exemple :
```
283900N0804100W → 28°39'00"N 080°41'00"W → 28.65°N, -80.683°W
```

Le parser convertit automatiquement en decimal degrees pour Leaflet.

## Exemple de NOTAM KZMA

```
!CARF 03/029 ZMA AIRSPACE DCC EROP X3730 F9 STLNK 10-40 AREA A STNR
ALT RESERVATION WI AN AREA DEFINED AS 283900N0804100W TO
284100N0803500W TO 292800N0795700W TO 291400N0793800W TO
285000N0794500W TO 282600N0803000W TO POINT OF ORIGIN SFC-UNL.
CAUTION SPACE LAUNCH / HAZARDOUS OPS AND POSSIBILITY OF FALLING
SPACE DEBRIS. 2603040658-2603041140
```

**Parsing résultat** :
- Type : CARF
- Classification : LAUNCH_HAZARD
- Statut : CAUTION_HIGH
- Confiance : 85%
- Mission : STLNK 10-40 (SpaceX Starlink groupe 10-40)
- Polygone : 6 points (hexagone offshore Floride)
- Altitude : SFC-UNL (0ft → unlimited)
- Validité : 2026-03-04 06:58Z → 11:40Z (4h42)

## Mode DEMO actuel

L'API retourne actuellement 3 NOTAMs d'exemple :
1. **KZMA CARF** : Starlink 10-40 (fourni par l'utilisateur)
2. **SpaceX Starbase TFR** : Boca Chica, Texas (test Starship)
3. **Vandenberg SFB** : Californie (lancement orbital)

Ces données permettent de tester l'intégration Leaflet sans dépendre d'une API externe.

## Migration vers production

### Option 1 : API officielle FAA (Gratuite)

**Endpoint** : `https://notams.aim.faa.gov/notamSearch/search`

**Avantages** :
- Gratuit
- Source officielle
- Données en temps réel

**Inconvénients** :
- Nécessite scraping HTML (pas d'API REST structurée)
- Rate limiting strict
- Parsing complexe

**Implémentation** :
```javascript
const response = await fetch('https://notams.aim.faa.gov/notamSearch/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    searchType: 'freeText',
    freeText: 'SPACE LAUNCH',
    reportType: 'RAW'
  })
});
```

### Option 2 : Notamify API (Commercial)

**Endpoint** : `https://api.notamify.com/v2/notams`  
**Documentation** : https://notamify.com/notam-v2-endpoints

**Avantages** :
- Parsing automatique avec AI
- Catégories structurées (42 types)
- GeoJSON natif
- Interprétation enrichie

**Inconvénients** :
- Payant (1 crédit/page)
- Nécessite API key

**Implémentation** :
```javascript
const response = await fetch('https://api.notamify.com/v2/notams', {
  headers: {
    'Authorization': `Bearer ${process.env.NOTAMIFY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  params: {
    category: 'SPACE_OPERATIONS', // Catégorie pré-filtrée
    active: true,
    page: 1,
    per_page: 50
  }
});

const data = await response.json();
// data.notams contient déjà interpretation.map_elements avec GeoJSON
```

### Option 3 : NASA NOTAMs API (Gratuite, Structurée)

**Endpoint** : `https://dip.amesaero.nasa.gov`  
**Documentation** : https://ntrs.nasa.gov/citations/20250003355

**Avantages** :
- Gratuit pour usage recherche/éducatif
- Données structurées (AIXM/GeoJSON)
- Traitement value-added du feed FAA SWIM
- Extraction géospatiale/temporelle automatique

**Inconvénients** :
- Nécessite registration NASA
- Délai possible vs temps réel FAA

**Note** : L'API NASA redistribue le feed public FAA SWIM avec processing supplémentaire.

## Variables d'environnement (Production)

Pour activer l'API en production, ajouter à `.env` :

```bash
# Option Notamify
NOTAMIFY_API_KEY=your_api_key_here

# Option NASA (si nécessaire)
NASA_API_KEY=your_nasa_key_here
```

Puis modifier `src/pages/api/rocket-notams.json.js` pour utiliser l'API choisie au lieu des données mock.

## Filtrage des NOTAMs pertinents

Le parser utilise ces mots-clés pour identifier les NOTAMs rockets :
- AHA, ANOMALY HAZARD
- DRA, DEBRIS RESPONSE  
- SPACE OPERATIONS, SPACE LAUNCH
- FALLING SPACE DEBRIS, HAZARDOUS OPS
- STLNK, STARLINK (SpaceX)

Moteurs de lancement américains couverts :
- **SpaceX** : Cap Canaveral (KZMA), Vandenberg (ZLA), Starbase (ZHU)
- **ULA** : Cap Canaveral, Vandenberg
- **Blue Origin** : Cap Canaveral
- **Rocket Lab** : Wallops (ZDC)

## Tests locaux

```bash
# Parser seul
node JS/notamRocketTest.js

# API complète (Astro dev server)
npm run dev
# Puis ouvrir http://localhost:4321/api/rocket-notams.json
```

## Roadmap

### Phase 1 (Actuelle) ✅
- [x] Parser NOTAM brut
- [x] Classification AHA/DRA
- [x] Extraction coordonnées ICAO
- [x] API GeoJSON
- [x] Layer Leaflet avec popups
- [x] Mode DEMO fonctionnel

### Phase 2 (À venir)
- [ ] Intégration API production (Notamify ou NASA)
- [ ] Cache Redis pour réduire appels API
- [ ] Filtrage par FIR (KZMA, ZLA, ZHU, etc.)
- [ ] Alertes en temps réel (WebSocket)
- [ ] Historique des tirs (archive)

### Phase 3 (Future)
- [ ] Prédiction trajectoire basée sur polygone
- [ ] Intégration calendrier de tirs (SpaceX/ULA)
- [ ] Notification push si vol AF dans zone
- [ ] Export ICS pour calendrier

## Ressources

- [FAA NOTAM Search](https://notams.aim.faa.gov/notamSearch)
- [Notamify API Docs](https://notamify.com/notam-v2-endpoints)
- [NASA NOTAMs API](https://ntrs.nasa.gov/citations/20250003355)
- [ICAO NOTAM Format](https://www.icao.int/safety/information-management/Pages/NOTAM-Annex-15.aspx)
- [SpaceX Launch Schedule](https://www.spacex.com/launches/)

## Support

Pour toute question sur l'intégration rocket NOTAMs :
- Parser issues → `JS/notamRocket.js`
- API issues → `src/pages/api/rocket-notams.json.js`  
- Display issues → `public/lib/rocket-notam-layer.js`

---

**Dernière mise à jour** : 3 mars 2026  
**Status** : Mode DEMO (prêt pour production avec API key)
