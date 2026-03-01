# 🛡 SkyWatch

**Agrégateur d'alertes météorologiques pour dispatchers aéronautiques**

SkyWatch est un outil de supervision en temps réel qui agrège et affiche les alertes météorologiques critiques affectant les opérations aériennes d'Air France. Conçu pour les dispatchers, il combine données météo, TAF (Terminal Aerodrome Forecast) et informations de vol pour une vision complète de la situation opérationnelle.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Sources de données](#-sources-de-données)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Déploiement](#-déploiement)
- [Utilisation](#-utilisation)
- [Développement](#-développement)
- [Structure du projet](#-structure-du-projet)
- [Améliorations futures](#-améliorations-futures)
- [Contribution](#-contribution)
- [License](#-license)

---

## ✨ Fonctionnalités

### Alertes Météorologiques
- 🌐 **Agrégation multi-sources** : GDACS (UN/CE), NOAA/NWS, MeteoAlarm (EUMETNET)
- 🗺️ **Cartographie interactive** : Visualisation Leaflet avec markers géolocalisés
- 🚨 **Classification par sévérité** : Rouge (critique), Orange (modéré), Jaune (mineur)
- 📊 **Compteurs temps réel** : Suivi du nombre d'alertes actives par niveau

### Données Aéronautiques
- ✈️ **Vols impactés** : Croisement TAF/vols AF avec fenêtre de menace
- 🌩 **TAF Risques** : Phénomènes significatifs sur le réseau Air France
- 🛫 **État bases** : Monitoring CDG/ORY avec conditions actuelles
- 🌀 **Cyclones tropicaux** : NHC, RSMC La Réunion, JTWC

### Interface & UX
- 🌙 **Mode sombre** : Basculement automatique avec sauvegarde de préférence
- ⚡ **Lazy loading** : Chargement différé des sections pour performances optimales
- 📱 **Design responsive** : Optimisé mobile, tablet, desktop
- 🎯 **Navigation intelligente** : Sidebar avec scroll-spy et ancres

### Performance
- 🚀 **Cache Redis** : Upstash Redis pour minimiser les appels API
- 📦 **Optimisation Bundle** : Code splitting et assets optimisés
- 🔄 **Rafraîchissement intelligent** : Polling adaptatif selon la criticité

---

## 🏗 Architecture

### Stack Technique

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Astro)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │    Styles    │  │
│  │   .astro     │  │   TypeScript │  │  Tailwind CSS│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  API Routes (Astro SSR)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/alerts  │  │  /api/tafs   │  │ /api/flights │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Cache Layer (Redis)                  │
│                   Upstash Redis Cloud                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  External Data Sources                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │  GDACS   │  │   NOAA   │  │MeteoAlarm│  │  AF API ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└─────────────────────────────────────────────────────────┘
```

### Flux de Données

1. **Requête utilisateur** → Page Astro (SSR)
2. **Récupération données** → Vérification cache Redis
   - Si cache valide → Retour immédiat
   - Si cache expiré → Appel APIs externes
3. **Agrégation** → Normalisation et fusion des sources
4. **Rendu** → Hydratation côté client avec JavaScript
5. **Updates** → Polling périodique via API routes

---

## 📡 Sources de Données

| Source | Type | Fréquence | Limite API |
|--------|------|-----------|------------|
| **GDACS** | Disasters | Événement | Illimité |
| **NOAA/NWS** | Weather Alerts | Temps réel | Illimité |
| **MeteoAlarm** | European Alerts | 5 min | Illimité |
| **AviationWeather** | TAF | 1h | Illimité |
| **Air France API** | Flights | Temps réel | 100 req/jour |
| **NHC** | Hurricanes | 6h | Illimité |
| **RSMC La Réunion** | Cyclones IO | 6h | Illimité |
| **JTWC** | Typhoons | 6h | Illimité |

---

## 🔧 Prérequis

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x ou **pnpm** ≥ 8.x
- **Compte Upstash** (Redis gratuit)
- **Clés API** :
  - Air France API (optionnel, limite 100 req/jour)

---

## 📦 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/QuentinSco/SkyWatch.git
cd SkyWatch
```

### 2. Installer les dépendances

```bash
npm install
# ou
pnpm install
```

### 3. Configuration des variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Air France API (optionnel)
AF_API_KEY=your_af_api_key
AF_API_BASE_URL=https://api.airfrance.com

# Environment
NODE_ENV=development
```

---

## ⚙️ Configuration

### Upstash Redis

1. Créer un compte sur [Upstash](https://upstash.com)
2. Créer une base Redis (plan gratuit : 10k commandes/jour)
3. Copier `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
4. Coller dans `.env`

### Air France API

1. Demander accès à l'API interne Air France
2. Récupérer la clé API
3. Configurer `AF_API_KEY` dans `.env`

⚠️ **Limite : 100 requêtes/jour** - Le cache Redis est essentiel pour optimiser.

---

## 🚀 Déploiement

### Développement Local

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:4321`

### Production

#### Option 1 : Netlify

```bash
npm run build
# Deploy sur Netlify
```

**Configuration Netlify** :
- Build command : `npm run build`
- Publish directory : `dist`
- Ajouter les variables d'environnement dans Settings > Environment

#### Option 2 : Vercel

```bash
npm run build
# Deploy sur Vercel
```

**Configuration Vercel** :
- Framework preset : `Astro`
- Build command : `npm run build`
- Output directory : `dist`
- Ajouter les variables d'environnement dans Settings > Environment Variables

#### Option 3 : Node.js Server

```bash
npm run build
node dist/server/entry.mjs
```

---

## 🖥 Utilisation

### Interface Principale

1. **Carte interactive** : Cliquez sur les markers pour voir les détails d'une alerte
2. **Sidebar navigation** : Accès rapide aux sections (Carte, Alertes, Vols, TAF)
3. **Mode sombre** : Cliquez sur l'icône 🌙 pour basculer
4. **Compteurs temps réel** : Nombre d'alertes actives par catégorie

### Navigation

- **Scroll automatique** : Cliquez sur un lien de la sidebar pour naviguer
- **Highlighting actif** : La section visible est automatiquement mise en évidence
- **Lazy loading** : Les sections lourdes (Vols, TAF) se chargent au scroll

### Alertes

**Codes couleur** :
- 🔴 **Rouge** : Alerte critique (ouragan cat. 4+, séisme majeur)
- 🟠 **Orange** : Alerte modérée (tempête sévère, inondations)
- 🟡 **Jaune** : Alerte mineure (vent fort, neige)

---

## 💻 Développement

### Structure du Code

```
src/
├── pages/
│   ├── index.astro          # Page principale
│   └── api/
│       ├── alerts.json.ts   # API agrégation alertes
│       ├── tafs.json.ts     # API TAF risques
│       └── flights.json.ts  # API vols impactés
├── lib/
│   ├── alertsServer.ts      # Parsers multi-sources
│   ├── tafParser.ts         # Parser TAF
│   ├── afFlights.ts         # Intégration API AF
│   ├── cycloneParser.ts     # Parser cyclones
│   └── redis.ts             # Client Redis
├── styles/
│   └── global.css           # Styles + dark mode
└── components/              # Composants réutilisables

public/lib/
├── main.js                  # Logique principale client
├── taf-ui.js                # Rendu TAF
├── map.js                   # Carte Leaflet
├── dark-mode.js             # Gestion mode sombre
└── lazy-load.js             # Lazy loading sections
```

### Scripts npm

```bash
npm run dev        # Serveur de développement
npm run build      # Build production
npm run preview    # Preview du build
npm run astro      # CLI Astro
```

### Ajouter une Source de Données

1. Créer un parser dans `src/lib/` :

```typescript
// src/lib/mySourceParser.ts
export async function fetchMySource() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}

export function normalizeMySource(data: any) {
  return {
    id: data.id,
    title: data.title,
    severity: mapSeverity(data.level),
    // ...
  };
}
```

2. Intégrer dans `src/lib/alertsServer.ts` :

```typescript
import { fetchMySource, normalizeMySource } from './mySourceParser';

export async function aggregateAlerts() {
  const mySourceData = await fetchMySource();
  const normalized = mySourceData.map(normalizeMySource);
  // Fusionner avec autres sources
}
```

---

## 📁 Structure du Projet

```
SkyWatch/
├── .astro/              # Cache Astro (ignoré)
├── .vscode/             # Config VS Code
├── node_modules/        # Dépendances (ignoré)
├── public/
│   ├── favicon.svg
│   └── lib/             # Scripts client
│       ├── main.js
│       ├── taf-ui.js
│       ├── map.js
│       ├── dark-mode.js
│       └── lazy-load.js
├── src/
│   ├── assets/          # Images, fonts
│   ├── components/      # Composants Astro
│   ├── layouts/         # Layouts pages
│   ├── lib/             # Logique serveur
│   ├── pages/           # Routes & API
│   ├── styles/          # CSS global
│   └── types/           # Types TypeScript
├── .gitignore
├── astro.config.mjs     # Config Astro
├── package.json
├── README.md
├── tailwind.config.mjs  # Config Tailwind
└── tsconfig.json        # Config TypeScript
```

---

## 🚧 Améliorations Futures

### Court terme
- [ ] **Notifications push** : Alertes temps réel via WebSockets
- [ ] **Export PDF** : Rapports quotidiens automatiques
- [ ] **Filtres avancés** : Par type, région, sévérité
- [ ] **Tests automatisés** : Playwright E2E + Vitest unit

### Moyen terme
- [ ] **ML Prédictions** : Anticipation fenêtres de risque
- [ ] **Dashboard admin** : Configuration sources et seuils
- [ ] **Multi-langues** : i18n EN/FR
- [ ] **API publique** : Endpoints pour intégrations tierces

### Long terme
- [ ] **Mobile app** : React Native ou PWA avancée
- [ ] **Collaboration** : Annotations et partage entre dispatchers
- [ ] **Intégration IA** : Suggestions décisions opérationnelles

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. **Fork** le repository
2. **Créer une branche** : `git checkout -b feature/ma-feature`
3. **Commit** : `git commit -m 'feat: ajout de ma feature'`
4. **Push** : `git push origin feature/ma-feature`
5. **Pull Request** : Ouvrir une PR sur GitHub

### Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction bug
  - `docs:` documentation
  - `style:` formatage
  - `refactor:` refactoring
  - `test:` ajout tests
  - `chore:` maintenance

---

## 📄 License

Ce projet est sous license **MIT**. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Auteurs

- **Quentin Scozzafave** - *Initial work* - [@QuentinSco](https://github.com/QuentinSco)

---

## 🙏 Remerciements

- **Air France** - API vols et support métier
- **GDACS** - Global Disaster Alert and Coordination System
- **NOAA** - National Oceanic and Atmospheric Administration
- **EUMETNET** - MeteoAlarm European network
- **Upstash** - Redis cloud infrastructure

---

## 📞 Support

Pour toute question ou problème :
- **Issues GitHub** : [github.com/QuentinSco/SkyWatch/issues](https://github.com/QuentinSco/SkyWatch/issues)
- **Email** : q.scozzafave@gmail.com

---

<div align="center">
  <strong>Fait avec ❤️ pour les dispatchers Air France</strong>
  <br>
  <sub>SkyWatch POC v0.1 - Open source uniquement</sub>
</div>
