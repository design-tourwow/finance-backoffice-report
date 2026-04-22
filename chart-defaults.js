// chart-defaults.js — Apply the shared app font to Chart.js renders.
// Must load AFTER the Chart.js CDN but BEFORE any page code that creates charts.
// Canvas text does NOT inherit CSS font-family, so this global default is the
// only way to keep chart labels / legends / tooltips aligned with the UI font.

(function () {
  'use strict';
  function updateExistingCharts() {
    if (typeof window.Chart === 'undefined' || !window.Chart.instances) return;
    Object.values(window.Chart.instances).forEach(function (chart) {
      if (chart && typeof chart.update === 'function') {
        chart.update('none');
      }
    });
  }

  if (!window.AppFont || typeof window.AppFont.applyChartDefaults !== 'function') return;
  if (typeof window.Chart !== 'undefined' && window.Chart.defaults && window.Chart.defaults.font) {
    window.AppFont.applyChartDefaults(window.Chart);
  }
  if (document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(function () {
      window.AppFont.applyChartDefaults(window.Chart);
      updateExistingCharts();
    });
  }
})();
