# 🛡 SkyWatch

**Suite d'outils opérationnels météo pour dispatchers aéronautiques**

SkyWatch est une application multi-pages de supervision en temps réel conçue pour les dispatchers Air France. Elle agrège alertes météorologiques, données TAF et informations de vol, et propose des outils de calcul et de génération de briefings opérationnels.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Pages](#-pages)
- [Architecture](#-architecture)
- [Sources de données](#-sources-de-données)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Déploiement](#-déploiement)
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
- 🌩 **TAF Risques** : Phénomènes significatifs sur le réseau Air France (groupes BECMG/FM correctement parsés)
- 🛫 **État bases** : Monitoring CDG/ORY avec conditions actuelles
- 🌀 **Cyclones tropicaux** : NHC, RSMC La Réunion, JTWC
- 🌋 **Alertes volcaniques** : Cendres SIGMET via VAAC avec direction en point cardinal et déduplication
- 🚀 **Lancements spatiaux** : Suivi des prochains tirs de fusée via Launch Library 2, pour information et awareness opérationnel des dispatchers

### Briefing Opérationnel
- 📋 **Page Briefing** : Vue dédiée à la génération d'un compte-rendu météo opérationnel
- 📝 **Trame copiable** : Génération automatique d'un texte structuré (alertes rouges, orages groupés par phénomène, vols regroupés par escale)
- 🖨️ **Impression A4** : Mise en page optimisée pour impression paysage

### Vent Traversier (Crosswind)
- 💨 **Calcul crosswind/headwind** : Décomposition vectorielle du vent par piste
- 🕒 **Filtrage temporel** : Masquage automatique des vols hors validité TAF
- 🖨️ **Impression A4** : Export optimisé pour briefing piste

### Chainages de Vol
- 📊 **Visualisation en barres** : Représentation temporelle des chainages d'appareils
- 🏷️ **Labels flottants** : Identifiants hors barre pour lisibilité maximale
- 🖨️ **Impression A4 paysage** : Export pour planning opérationnel

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

## 📄 Pages

| Page | Route | Description |
|------|-------|-------------|
| **Tableau de bord** | `/` | Carte interactive, alertes en temps réel, vols impactés, TAF risques |
| **Briefing** | `/briefing` | Génération de trame opérationnelle copiable, impression A4 |
| **Crosswind** | `/crosswind` | Calcul vent traversier par piste, filtrage par validité TAF |
| **Chainages** | `/chainages` | Visualisation temporelle des rotations d'appareils |

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
| **Air France API** | Flights & Chainages | Temps réel | 100 req/jour |
| **NHC** | Hurricanes | 6h | Illimité |
| **RSMC La Réunion** | Cyclones IO | 6h | Illimité |
| **JTWC** | Typhoons | 6h | Illimité |
| **VAAC** | Cendres volcaniques | Événement | Illimité |
| **Launch Library 2** | Lancements spatiaux | Temps réel | 15 req/h (free) |

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
```

**Configuration Netlify** :
- Build command : `npm run build`
- Publish directory : `dist`
- Ajouter les variables d'environnement dans Settings > Environment

#### Option 2 : Vercel

```bash
npm run build
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

## 📁 Structure du Projet

```
SkyWatch/
├── public/
│   └── lib/                 # Scripts client
│       ├── main.js          # Logique principale dashboard
│       ├── taf-ui.js        # Rendu TAF
│       ├── map.js           # Carte Leaflet
│       ├── dark-mode.js     # Gestion mode sombre
│       └── lazy-load.js     # Lazy loading sections
├── src/
│   ├── lib/                 # Logique serveur
│   │   ├── alertsServer.ts  # Parsers multi-sources
│   │   ├── tafParser.ts     # Parser TAF (groupes BECMG/FM)
│   │   ├── afFlights.ts     # Intégration API AF (vols + chainages)
│   │   ├── cycloneParser.ts # Parser cyclones
│   │   └── redis.ts         # Client Redis
│   ├── pages/
│   │   ├── index.astro      # Dashboard principal
│   │   ├── briefing.astro   # Génération trame opérationnelle
│   │   ├── crosswind.astro  # Calcul vent traversier
│   │   ├── chainages.astro  # Visualisation chainages d'appareils
│   │   └── api/             # API Routes SSR
│   ├── styles/
│   │   └── global.css       # Styles globaux + dark mode
│   └── types/               # Types TypeScript
├── astro.config.mjs
├── tailwind.config.mjs
└── tsconfig.json
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

1. **Fork** le repository
2. **Créer une branche** : `git checkout -b feature/ma-feature`
3. **Commit** : `git commit -m 'feat: ajout de ma feature'`
4. **Push** : `git push origin feature/ma-feature`
5. **Pull Request** : Ouvrir une PR sur GitHub

### Conventions de commit
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

- **Quentin S** - [@QuentinSco](https://github.com/QuentinSco)

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

---

<div align="center">
  <strong>Fait avec ❤️ pour les dispatchers Air France</strong>
  <br>
  <sub>SkyWatch v0.3 — Open source uniquement</sub>
</div>
