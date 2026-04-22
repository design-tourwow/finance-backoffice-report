// chart-defaults.js — Apply Kanit as the default font for Chart.js renders.
// Must load AFTER the Chart.js CDN but BEFORE any page code that creates charts.
// Canvas text does NOT inherit CSS font-family, so this global default is the
// only way to keep chart labels / legends / tooltips in Kanit.

(function () {
  'use strict';
  if (typeof window.Chart !== 'undefined' && window.Chart.defaults && window.Chart.defaults.font) {
    if (window.AppFont && typeof window.AppFont.applyChartDefaults === 'function') {
      window.AppFont.applyChartDefaults(window.Chart);
    } else {
      window.Chart.defaults.font.family = "'Kanit', sans-serif";
    }
  }
})();
