/**
 * Dark Mode Manager for SkyWatch
 * Gère le basculement entre mode clair et mode sombre avec persistance localStorage
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'skywatch-dark-mode';
  const DARK_CLASS = 'dark';

  /**
   * Récupère la préférence utilisateur ou détecte la préférence système
   */
  function getInitialTheme() {
    // 1. Vérifie localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }

    // 2. Détecte la préférence système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    // 3. Par défaut : mode clair
    return false;
  }

  /**
   * Applique le thème au document
   */
  function applyTheme(isDark) {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }

    // Met à jour l'icône du bouton si présent
    updateToggleButton(isDark);
    
    // Sauvegarde la préférence
    localStorage.setItem(STORAGE_KEY, isDark.toString());

    // Dispatch event pour informer d'autres composants
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark } }));
  }

  /**
   * Met à jour l'apparence du bouton toggle
   */
  function updateToggleButton(isDark) {
    const btn = document.getElementById('dark-mode-toggle');
    const btnMobile = document.getElementById('dark-mode-toggle-mobile');
    
    if (btn) {
      const iconLeft = btn.querySelector('.icon-left');
      const iconRight = btn.querySelector('.icon-right');
      const slider = btn.querySelector('.toggle-slider');
      
      if (iconLeft && iconRight && slider) {
        iconLeft.style.opacity = isDark ? '0.4' : '1';
        iconRight.style.opacity = isDark ? '1' : '0.4';
        slider.style.transform = isDark ? 'translateX(24px)' : 'translateX(0)';
      }
      
      btn.setAttribute('aria-label', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
      btn.title = isDark ? 'Mode clair' : 'Mode sombre';
    }
    
    if (btnMobile) {
      const icon = btnMobile.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = isDark ? '☀️' : '🌙';
      }
      btnMobile.setAttribute('aria-label', isDark ? 'Activer le mode clair' : 'Activer le mode sombre');
      btnMobile.title = isDark ? 'Mode clair' : 'Mode sombre';
    }
  }

  /**
   * Bascule entre mode clair et sombre
   */
  function toggleTheme() {
    const isDark = document.documentElement.classList.contains(DARK_CLASS);
    applyTheme(!isDark);
  }

  /**
   * Crée le bouton de toggle dans la sidebar (en bas)
   */
  function createToggleButton() {
    const sidebar = document.querySelector('aside');
    if (!sidebar) return;

    // Vérifie si le bouton existe déjà
    if (document.getElementById('dark-mode-toggle')) return;

    // Crée le conteneur du toggle
    const container = document.createElement('div');
    container.className = 'mt-4 pt-4 border-t border-gray-200';
    
    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.className = 'flex items-center justify-between w-full px-3 py-2 rounded-lg transition group';
    button.setAttribute('aria-label', 'Activer le mode sombre');
    button.title = 'Mode sombre';
    
    // Structure HTML du toggle avec emojis
    button.innerHTML = `
      <span class="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition">Thème</span>
      <div class="flex items-center gap-2">
        <span class="icon-left text-sm" style="opacity: 1; transition: opacity 0.2s;">☀️</span>
        <div class="relative inline-block w-12 h-6 bg-gray-200 rounded-full cursor-pointer transition group-hover:bg-gray-300" style="box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
          <div class="toggle-slider absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-out" style="transform: translateX(0);"></div>
        </div>
        <span class="icon-right text-sm" style="opacity: 0.4; transition: opacity 0.2s;">🌙</span>
      </div>
    `;
    
    button.addEventListener('click', toggleTheme);
    
    container.appendChild(button);
    
    // Insère en bas de la sidebar, juste avant le footer
    const footer = sidebar.querySelector('.mt-auto');
    if (footer) {
      sidebar.insertBefore(container, footer);
    } else {
      sidebar.appendChild(container);
    }
  }

  /**
   * Crée le bouton de toggle mobile dans le header
   */
  function createMobileToggleButton() {
    const mobileHeader = document.querySelector('.lg\\:hidden');
    if (!mobileHeader) return;

    // Vérifie si le bouton existe déjà
    if (document.getElementById('dark-mode-toggle-mobile')) return;

    const button = document.createElement('button');
    button.id = 'dark-mode-toggle-mobile';
    button.className = 'p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition text-xl';
    button.innerHTML = '<span class="theme-icon">🌙</span>';
    button.setAttribute('aria-label', 'Activer le mode sombre');
    button.addEventListener('click', toggleTheme);

    // Insère dans le header mobile
    const headerFlex = mobileHeader.querySelector('.flex.items-center.justify-between');
    if (headerFlex) {
      headerFlex.appendChild(button);
    }
  }

  /**
   * Écoute les changements de préférence système
   */
  function watchSystemTheme() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      // Ne change que si l'utilisateur n'a pas de préférence explicite
      if (localStorage.getItem(STORAGE_KEY) === null) {
        applyTheme(e.matches);
      }
    });
  }

  /**
   * Initialise le mode sombre
   */
  function init() {
    // Applique immédiatement le thème pour éviter le flash
    const isDark = getInitialTheme();
    applyTheme(isDark);

    // Crée les boutons de toggle
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createToggleButton();
        createMobileToggleButton();
      });
    } else {
      createToggleButton();
      createMobileToggleButton();
    }

    // Écoute les changements système
    watchSystemTheme();

    console.log('[DarkMode] Initialisé, mode:', isDark ? 'sombre' : 'clair');
  }

  // Initialise dès que possible
  init();

  // Export pour usage externe
  window.SkyWatchDarkMode = {
    toggle: toggleTheme,
    set: applyTheme,
    isDark: () => document.documentElement.classList.contains(DARK_CLASS)
  };
})();
