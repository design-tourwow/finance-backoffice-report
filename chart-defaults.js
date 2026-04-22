// chart-defaults.js — Apply the shared app font to Chart.js renders.
// Must load AFTER the Chart.js CDN but BEFORE any page code that creates charts.
// Canvas text does NOT inherit CSS font-family, so this global default is the
// only way to keep chart labels / legends / tooltips aligned with the UI font.

(function () {
  'use strict';
  if (!window.AppFont || typeof window.AppFont.applyChartDefaults !== 'function') return;
  if (typeof window.Chart !== 'undefined' && window.Chart.defaults && window.Chart.defaults.font) {
    window.AppFont.applyChartDefaults(window.Chart);
  }
})();
