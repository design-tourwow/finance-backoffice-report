// shared-font.js - canonical font-family access for CSS and JS consumers.
(function () {
  'use strict';

  var CSS_VAR_NAME = '--font-family-base';
  var FALLBACK_CSS_FAMILY = "'Kanit', sans-serif";
  var FALLBACK_CHART_FAMILY = 'Kanit';

  function cssFamily() {
    var root = typeof document !== 'undefined' ? document.documentElement : null;
    if (!root || typeof window.getComputedStyle !== 'function') return FALLBACK_CSS_FAMILY;

    var value = window.getComputedStyle(root).getPropertyValue(CSS_VAR_NAME);
    value = value ? value.trim() : '';
    return value || FALLBACK_CSS_FAMILY;
  }

  function chartFamily() {
    var family = cssFamily();
    var match = family.match(/['"]?([^,'"]+)/);
    return match && match[1] ? match[1].trim() : FALLBACK_CHART_FAMILY;
  }

  function applyChartDefaults(chartLib) {
    if (!chartLib || !chartLib.defaults || !chartLib.defaults.font) return;
    chartLib.defaults.font.family = cssFamily();
  }

  function stylesheetTag() {
    return '<link rel="stylesheet" href="shared-font.css" />';
  }

  window.AppFont = {
    cssVarName: CSS_VAR_NAME,
    cssFamily: cssFamily,
    chartFamily: chartFamily,
    applyChartDefaults: applyChartDefaults,
    stylesheetTag: stylesheetTag
  };
})();
