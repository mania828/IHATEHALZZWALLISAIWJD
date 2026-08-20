// ============================================================================
// HALZZWALL /math — settings.js
// Shared on every page. Reads the theme + text-scale choice from localStorage
// and applies it immediately (before paint) so there's no flash of the
// wrong theme. Include this as early as possible in <head>, unminified,
// no defer/async.
// ============================================================================

(function () {
  var THEMES = {
    sunlight: { bg: '#f5f3ff', bgDeep: '#ece7ff', ink: '#241a3d', dim: '#6b6280', violet: '#7c3aed', surface: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.18)' },
    dark:     { bg: '#0a0418', bgDeep: '#0a0418', ink: '#f0eaff', dim: '#9d8fc9', violet: '#a78bfa', surface: 'rgba(20,16,52,0.55)', border: 'rgba(190,150,255,0.18)' },
    night:    { bg: '#000000', bgDeep: '#000000', ink: '#e8e8ea', dim: '#78788a', violet: '#8b5cf6', surface: 'rgba(20,20,26,0.6)', border: 'rgba(139,92,246,0.16)' },
    sunset:   { bg: '#1a0a12', bgDeep: '#12060d', ink: '#ffe8d6', dim: '#c99a8a', violet: '#ff7a59', surface: 'rgba(255,122,89,0.08)', border: 'rgba(255,122,89,0.2)' },
  };

  var SCALES = { small: 88, normal: 100, large: 115, xl: 130 };

  function apply() {
    var themeName = localStorage.getItem('mathTheme') || 'dark';
    var scaleName = localStorage.getItem('mathTextScale') || 'normal';
    var theme = THEMES[themeName] || THEMES.dark;
    var scale = SCALES[scaleName] || 100;

    var root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--bg-deep', theme.bgDeep);
    root.style.setProperty('--ink', theme.ink);
    root.style.setProperty('--dim', theme.dim);
    root.style.setProperty('--violet', theme.violet);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--border', theme.border);
    root.style.zoom = scale + '%';
    root.setAttribute('data-theme', themeName);
  }

  apply();

  // Re-apply if changed in another tab (e.g. settings page open alongside a game)
  window.addEventListener('storage', function (e) {
    if (e.key === 'mathTheme' || e.key === 'mathTextScale') apply();
  });

  window.HALZZ_SETTINGS = { apply: apply, THEMES: THEMES, SCALES: SCALES };
})();
