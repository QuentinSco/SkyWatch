/**
 * Lazy Loading Manager for SkyWatch
 * Charges les sections vols impactés et TAF uniquement quand elles deviennent visibles
 * pour améliorer les performances de chargement initial
 */

(function() {
  'use strict';

  const LAZY_SECTIONS = [
    {
      id: 'section-vols',
      loadFn: loadFlights,
      loaded: false
    },
    {
      id: 'section-taf',
      loadFn: loadTAF,
      loaded: false
    }
  ];

  // Configuration de l'IntersectionObserver
  const observerOptions = {
    root: null,
    rootMargin: '200px', // Commence à charger 200px avant que la section soit visible
    threshold: 0
  };

  /**
   * Charge la section des vols impactés
   */
  async function loadFlights() {
    console.log('[LazyLoad] Chargement de la section Vols impactés...');
    const container = document.getElementById('taf-vol-main');
    if (!container) return;

    try {
      // Si taf-ui.js définit une fonction globale pour charger les vols
      if (typeof window.loadTafVolsSection === 'function') {
        await window.loadTafVolsSection();
      } else {
        // Fallback : déclenche un événement custom que taf-ui.js peut écouter
        window.dispatchEvent(new CustomEvent('lazyload:flights'));
      }
      console.log('[LazyLoad] ✓ Vols impactés chargés');
    } catch (error) {
      console.error('[LazyLoad] Erreur chargement vols:', error);
      container.innerHTML = '<div class="text-red-500 text-sm p-4 bg-red-50 rounded-lg">⚠️ Erreur lors du chargement des vols</div>';
    }
  }

  /**
   * Charge la section TAF Risques
   */
  async function loadTAF() {
    console.log('[LazyLoad] Chargement de la section TAF Risques...');
    const container = document.getElementById('taf-main');
    if (!container) return;

    try {
      // Si taf-ui.js définit une fonction globale pour charger les TAF
      if (typeof window.loadTafRisquesSection === 'function') {
        await window.loadTafRisquesSection();
      } else {
        // Fallback : déclenche un événement custom que taf-ui.js peut écouter
        window.dispatchEvent(new CustomEvent('lazyload:taf'));
      }
      console.log('[LazyLoad] ✓ TAF Risques chargés');
    } catch (error) {
      console.error('[LazyLoad] Erreur chargement TAF:', error);
      container.innerHTML = '<div class="text-red-500 text-sm p-4 bg-red-50 rounded-lg">⚠️ Erreur lors du chargement des TAF</div>';
    }
  }

  /**
   * Initialise l'observation des sections
   */
  function initLazyLoading() {
    // Vérifie le support d'IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      console.warn('[LazyLoad] IntersectionObserver non supporté, chargement immédiat');
      // Charge tout immédiatement si pas de support
      LAZY_SECTIONS.forEach(section => {
        if (!section.loaded) {
          section.loadFn();
          section.loaded = true;
        }
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const section = LAZY_SECTIONS.find(s => s.id === sectionId);
          
          if (section && !section.loaded) {
            section.loaded = true;
            section.loadFn();
            observer.unobserve(entry.target);
          }
        }
      });
    }, observerOptions);

    // Observe chaque section lazy-loadable
    LAZY_SECTIONS.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
        console.log(`[LazyLoad] Observer configuré pour #${section.id}`);
      }
    });
  }

  // Initialise au chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
  } else {
    initLazyLoading();
  }

  // Export pour tests ou usage externe
  window.SkyWatchLazyLoad = {
    init: initLazyLoading,
    forceLoad: (sectionId) => {
      const section = LAZY_SECTIONS.find(s => s.id === sectionId);
      if (section && !section.loaded) {
        section.loaded = true;
        section.loadFn();
      }
    }
  };
})();
