# 🌙 Dark Mode Toggle Button Design

Guide visuel du nouveau bouton toggle pour le mode sombre de SkyWatch.

---

## 🎨 Design Final

### Position

Le bouton toggle est positionné **en bas de la sidebar**, juste au-dessus du footer avec les informations "Horizon : J à J+3".

```
┌──────────────────────────────────┐
│  🛡 SkyWatch                   │
│  Superviseur dispatch          │
│                                │
│  Mise à jour: il y a 5 min      │
│  ● 12  ● 5  ● 3               │
│                                │
│  SECTIONS                      │
│  🗺️ Carte                     │
│  🌐 Alertes actives  12       │
│  ✈️ Vols impactés    5        │
│  🌩 TAF Risques AF    3        │
│                                │
│  ────────────────────────  │
│                                │
│  Thème      ☀️  [  ●  ]  🌙    │  ← Toggle Button
│                                │
│  ────────────────────────  │
│  Horizon : J à J+3             │
│  Phénomènes grande échelle     │
└──────────────────────────────────┘
```

### États du Toggle

#### Mode Clair (Défaut)
```
Thème      ☀️  [ ●    ]  🌙
            ↑            ↑
          actif       inactif
         (opacity: 1) (opacity: 0.4)
```

- Slider positionné à **gauche** (`translateX(0)`)
- Soleil ☀️ **pleine opacité**
- Lune 🌙 **opacité réduite** (0.4)
- Background toggle : `#e5e7eb` (gris clair)

#### Mode Sombre
```
Thème      ☀️  [    ● ]  🌙
            ↑            ↑
         inactif      actif
        (opacity: 0.4) (opacity: 1)
```

- Slider positionné à **droite** (`translateX(24px)`)
- Soleil ☀️ **opacité réduite** (0.4)
- Lune 🌙 **pleine opacité**
- Background toggle : `#475569` (gris foncé)

---

## 💻 Structure HTML

```html
<div class="mt-4 pt-4 border-t border-gray-200">
  <button id="dark-mode-toggle" 
          class="flex items-center justify-between w-full px-3 py-2 rounded-lg transition group">
    
    <!-- Label -->
    <span class="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition">
      Thème
    </span>
    
    <!-- Toggle avec emojis -->
    <div class="flex items-center gap-2">
      <!-- Soleil (mode clair) -->
      <span class="icon-left text-sm" style="opacity: 1; transition: opacity 0.2s;">
        ☀️
      </span>
      
      <!-- Toggle switch -->
      <div class="relative inline-block w-12 h-6 bg-gray-200 rounded-full cursor-pointer transition group-hover:bg-gray-300" 
           style="box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Slider -->
        <div class="toggle-slider absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-out" 
             style="transform: translateX(0);"></div>
      </div>
      
      <!-- Lune (mode sombre) -->
      <span class="icon-right text-sm" style="opacity: 0.4; transition: opacity 0.2s;">
        🌙
      </span>
    </div>
  </button>
</div>
```

---

## 🎨 Styles CSS

### Variables

```css
:root {
  --toggle-bg: #e5e7eb;        /* Gris clair */
  --toggle-bg-hover: #d1d5db;  /* Gris clair hover */
}

.dark {
  --toggle-bg: #475569;        /* Gris foncé */
  --toggle-bg-hover: #64748b;  /* Gris foncé hover */
}
```

### Transitions

```css
/* Slider animation */
#dark-mode-toggle .toggle-slider {
  transition: transform 0.2s ease-out, background-color 0.2s ease;
}

/* Hover effect sur le slider */
#dark-mode-toggle:hover .toggle-slider {
  background-color: #f9fafb;
}

.dark #dark-mode-toggle:hover .toggle-slider {
  background-color: #e5e7eb;
}

/* Background toggle */
#dark-mode-toggle > div > div {
  background-color: var(--toggle-bg);
}

#dark-mode-toggle:hover > div > div {
  background-color: var(--toggle-bg-hover);
}
```

---

## ⚡ JavaScript Logic

### Mise à jour de l'état du toggle

```javascript
function updateToggleButton(isDark) {
  const btn = document.getElementById('dark-mode-toggle');
  if (!btn) return;
  
  const iconLeft = btn.querySelector('.icon-left');   // ☀️
  const iconRight = btn.querySelector('.icon-right'); // 🌙
  const slider = btn.querySelector('.toggle-slider');
  
  if (isDark) {
    // Mode sombre activé
    iconLeft.style.opacity = '0.4';   // Soleil atténué
    iconRight.style.opacity = '1';     // Lune visible
    slider.style.transform = 'translateX(24px)'; // Slider à droite
  } else {
    // Mode clair activé
    iconLeft.style.opacity = '1';      // Soleil visible
    iconRight.style.opacity = '0.4';   // Lune atténuée
    slider.style.transform = 'translateX(0)'; // Slider à gauche
  }
}
```

### Insertion dans la sidebar

```javascript
function createToggleButton() {
  const sidebar = document.querySelector('aside');
  if (!sidebar) return;
  
  // Crée le conteneur avec border-top
  const container = document.createElement('div');
  container.className = 'mt-4 pt-4 border-t border-gray-200';
  
  // Crée le bouton
  const button = document.createElement('button');
  button.id = 'dark-mode-toggle';
  // ... (voir structure HTML)
  
  container.appendChild(button);
  
  // Insère juste avant le footer
  const footer = sidebar.querySelector('.mt-auto');
  if (footer) {
    sidebar.insertBefore(container, footer);
  } else {
    sidebar.appendChild(container);
  }
}
```

---

## 📱 Version Mobile

Pour le header mobile, un bouton plus simple avec uniquement l'emoji :

```html
<button id="dark-mode-toggle-mobile" 
        class="p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition text-xl">
  <span class="theme-icon">🌙</span>
</button>
```

**Comportement** :
- Mode clair : affiche 🌙 (lune)
- Mode sombre : affiche ☀️ (soleil)
- Au clic : bascule entre les deux modes

---

## ✨ Interactions Utilisateur

### Feedback Visuel

1. **Hover** :
   - Background du toggle devient légèrement plus foncé
   - Slider devient légèrement plus clair
   - Label "Thème" passe de gris moyen à gris foncé

2. **Click** :
   - Slider se déplace horizontalement (0.2s ease-out)
   - Opacité des emojis s'inverse (0.2s)
   - Tout le thème de l'application bascule (0.2s)

3. **Active State** :
   - L'emoji actif est à pleine opacité (1.0)
   - L'emoji inactif est atténué (0.4)
   - Le slider est aligné avec l'état actif

---

## 🎯 Accessibilité

```javascript
// Attributs ARIA
button.setAttribute('aria-label', 
  isDark ? 'Activer le mode clair' : 'Activer le mode sombre'
);

// Tooltip
button.title = isDark ? 'Mode clair' : 'Mode sombre';
```

**Support clavier** :
- `Tab` : Focus sur le bouton
- `Enter` / `Space` : Toggle le thème
- Focus visible avec outline navigateur

---

## 📏 Exemple Complet

### Mode Clair
```
┌──────────────────────────────────┐
│                                │
│  Thème      ☀️  ╭──●────╮  🌙    │
│            │     │ │        │
│            ╰──────╯        │
│            visible   atténué   │
│                                │
└──────────────────────────────────┘

Background: #f8fafc (clair)
Toggle: #e5e7eb (gris clair)
Slider: translateX(0)
```

### Mode Sombre
```
┌──────────────────────────────────┐
│                                │
│  Thème      ☀️  ╭─────●─╮  🌙    │
│            │     │ │        │
│            ╰──────╯        │
│            atténué   visible   │
│                                │
└──────────────────────────────────┘

Background: #0f172a (sombre)
Toggle: #475569 (gris foncé)
Slider: translateX(24px)
```

---

## 🚀 Test & Validation

### Checklist

- [x] Bouton positionné en bas de la sidebar
- [x] Border-top pour séparer de la navigation
- [x] Emojis ☀️ et 🌙 affichés correctement
- [x] Slider anime sur 0.2s avec ease-out
- [x] Opacité des emojis change selon l'état
- [x] Background du toggle adapte au mode sombre
- [x] Hover effect sur le toggle
- [x] Persistance localStorage fonctionne
- [x] Version mobile simplifiée
- [x] Accessibilité ARIA correcte

### Commandes de Test

```bash
# Build et preview
npm run build
npm run preview

# Ouvrir http://localhost:4321
# Tester :
# 1. Cliquer sur le toggle
# 2. Vérifier l'animation du slider
# 3. Vérifier le changement d'opacité des emojis
# 4. Recharger la page : le mode doit persister
# 5. Tester en responsive (mobile)
```

---

<div align="center">
  <strong>✨ Design implémenté avec succès ✨</strong>
  <br>
  <sub>Toggle élégant et intuitif pour SkyWatch</sub>
</div>
