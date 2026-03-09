/**
 * Dark Mode Manager for SkyWatch
 * Gère le basculement entre mode clair et mode sombre avec persistance localStorage
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'skywatch-dark-mode';
  const DARK_CLASS = 'dark';

  function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  }

  function applyTheme(isDark) {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }
    updateToggleButton(isDark);
    localStorage.setItem(STORAGE_KEY, isDark.toString());
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark } }));
  }

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

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains(DARK_CLASS);
    applyTheme(!isDark);
  }

  function createToggleButton() {
    const sidebar = document.querySelector('aside');
    if (!sidebar) return;
    if (document.getElementById('dark-mode-toggle')) return;

    const container = document.createElement('div');
    container.className = 'mt-4 pt-4 border-t border-gray-200';

    const button = document.createElement('button');
    button.id = 'dark-mode-toggle';
    button.className = 'flex items-center justify-between w-full px-3 py-2 rounded-lg transition group';
    button.setAttribute('aria-label', 'Activer le mode sombre');
    button.title = 'Mode sombre';

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

    const footer = sidebar.querySelector('.mt-auto');
    if (footer) {
      sidebar.insertBefore(container, footer);
    } else {
      sidebar.appendChild(container);
    }

    // Sync l'état visuel maintenant que le bouton existe
    const isDark = document.documentElement.classList.contains(DARK_CLASS);
    updateToggleButton(isDark);
  }

  function createMobileToggleButton() {
    // Sélecteur mis à jour pour correspondre à xl:hidden (breakpoint 1280px)
    const mobileHeader = document.querySelector('.xl\\:hidden');
    if (!mobileHeader) return;
    if (document.getElementById('dark-mode-toggle-mobile')) return;

    const button = document.createElement('button');
    button.id = 'dark-mode-toggle-mobile';
    button.className = 'p-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition text-xl';
    button.innerHTML = '<span class="theme-icon">🌙</span>';
    button.setAttribute('aria-label', 'Activer le mode sombre');
    button.addEventListener('click', toggleTheme);

    const headerFlex = mobileHeader.querySelector('.flex.items-center.justify-between');
    if (headerFlex) {
      headerFlex.appendChild(button);
    }

    // Sync l'état visuel maintenant que le bouton existe
    const isDark = document.documentElement.classList.contains(DARK_CLASS);
    updateToggleButton(isDark);
  }

  function watchSystemTheme() {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        applyTheme(e.matches);
      }
    });
  }

  function init() {
    const isDark = getInitialTheme();
    applyTheme(isDark);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createToggleButton();
        createMobileToggleButton();
      });
    } else {
      createToggleButton();
      createMobileToggleButton();
    }

    watchSystemTheme();
    console.log('[DarkMode] Initialisé, mode:', isDark ? 'sombre' : 'clair');
  }

  init();

  window.SkyWatchDarkMode = {
    toggle: toggleTheme,
    set: applyTheme,
    isDark: () => document.documentElement.classList.contains(DARK_CLASS)
  };
})();
