// shared-chart.js — Shared Chart.js bar-chart wrapper.
// Mirrors the visual pattern used by wholesale-destinations.js +
// sales-by-country.js (the original system) so every bar chart across the
// app shares one look: Kanit font, dark tooltip with blue border,
// subtle grid lines, rounded bars, ChartDataLabels enabled.
//
// Assumes Chart.js (window.Chart) is loaded via CDN in the page HTML.
// ChartDataLabels plugin is optional — if loaded (window.ChartDataLabels)
// it's enabled automatically.
// Exposes window.SharedChart (IIFE).

(function () {
  'use strict';

  var CHART_FONT_CSS_FAMILY = window.AppFont && typeof window.AppFont.cssFamily === 'function'
    ? window.AppFont.cssFamily()
    : "'Kanit', sans-serif";
  var CHART_FONT_FAMILY = window.AppFont && typeof window.AppFont.chartFamily === 'function'
    ? window.AppFont.chartFamily()
    : 'Kanit';

  function hasChart() {
    return typeof window.Chart !== 'undefined';
  }

  function hasDataLabels() {
    return typeof window.ChartDataLabels !== 'undefined';
  }

  // Chart.js renders labels / legend / tooltip in a <canvas> — CSS font-family
  // rules do NOT apply there. Set a global default so every chart on the site
  // renders in Kanit to match the surrounding UI. Runs once when this file
  // loads after the Chart.js CDN.
  if (hasChart() && window.Chart.defaults && window.Chart.defaults.font) {
    window.Chart.defaults.font.family = CHART_FONT_CSS_FAMILY;
  }

  function formatCurrency(v) {
    if (window.SharedUtils && typeof window.SharedUtils.formatCurrency === 'function') {
      return window.SharedUtils.formatCurrency(v);
    }
    return Number(v).toLocaleString();
  }

  function formatNumber(v) {
    return Number(v).toLocaleString();
  }

  // Deep merge small-config objects (one level is enough for Chart.js options).
  function mergeOptions(base, override) {
    if (!override) return base;
    if (!base) return override;
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in override) {
      if (!Object.prototype.hasOwnProperty.call(override, k)) continue;
      var bv = out[k];
      var ov = override[k];
      if (bv && ov && typeof bv === 'object' && typeof ov === 'object' &&
          !Array.isArray(bv) && !Array.isArray(ov)) {
        out[k] = mergeOptions(bv, ov);
      } else {
        out[k] = ov;
      }
    }
    return out;
  }

  // Canonical bar-chart options — mirrors wholesale-destinations.js +
  // sales-by-country.js pattern.
  function defaultBarOptions(opts) {
    opts = opts || {};
    var horizontal = opts.indexAxis === 'y';

    var base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: 'rgba(255, 255, 255, 0.9)',
          borderColor: 'rgba(74, 123, 167, 0.5)',
          borderWidth: 1,
          padding: 12,
          titleFont: { family: CHART_FONT_FAMILY, size: 16, weight: '600' },
          bodyFont: { family: CHART_FONT_FAMILY, size: 15 }
        }
      },
      scales: {
        x: {
          grid: horizontal ? { color: 'rgba(0, 0, 0, 0.05)' } : { display: false },
          beginAtZero: horizontal ? true : undefined,
          ticks: {
            color: '#6b7280',
            font: { family: CHART_FONT_FAMILY, size: 13 },
            maxRotation: horizontal ? 0 : 45,
            minRotation: horizontal ? 0 : 0,
            callback: horizontal
              ? function (val) { return '฿' + formatCurrency(val); }
              : undefined
          }
        },
        y: {
          grid: horizontal ? { display: false } : { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
          beginAtZero: horizontal ? undefined : true,
          ticks: {
            color: '#6b7280',
            font: { family: CHART_FONT_FAMILY, size: 13 },
            callback: horizontal
              ? undefined
              : function (val) { return '฿' + formatCurrency(val); }
          }
        }
      }
    };

    // Enable datalabels if the plugin is loaded.
    if (hasDataLabels()) {
      base.plugins.datalabels = {
        anchor: 'end',
        align: horizontal ? 'end' : 'top',
        offset: horizontal ? 4 : 4,
        color: '#374151',
        font: { family: CHART_FONT_FAMILY, size: 13, weight: '600' },
        formatter: function (value) { return formatNumber(value); }
      };
    }

    if (horizontal) base.indexAxis = 'y';
    return base;
  }

  // Merge canonical dataset defaults into caller-provided datasets so each
  // bar gets the branded look (blue primary, rounded corners, thin border)
  // unless the caller explicitly overrides.
  function enrichDatasets(datasets) {
    if (!Array.isArray(datasets)) return datasets;
    return datasets.map(function (ds) {
      var merged = {
        backgroundColor: '#4a7ba7',
        borderColor: '#3b6490',
        borderWidth: 1,
        borderRadius: 4
      };
      for (var k in ds) {
        if (Object.prototype.hasOwnProperty.call(ds, k)) merged[k] = ds[k];
      }
      return merged;
    });
  }

  /**
   * Create (or re-create) a Chart.js bar chart on the given canvas element.
   *
   * @param {Object} cfg
   * @param {HTMLCanvasElement} cfg.canvasEl - target canvas
   * @param {string[]} cfg.labels - axis labels
   * @param {Array<Object>} cfg.datasets - Chart.js datasets array
   * @param {Object} [cfg.options] - Chart.js options to merge over canonical defaults
   * @param {Object} [cfg.previous] - optional previous chart instance to destroy first
   * @returns {Object|null} Chart instance or null on failure
   */
  function createBarChart(cfg) {
    cfg = cfg || {};
    if (!hasChart()) {
      console.warn('[SharedChart] Chart.js is not loaded — cannot create bar chart');
      return null;
    }
    if (!cfg.canvasEl) {
      console.warn('[SharedChart] createBarChart: canvasEl is required');
      return null;
    }
    if (!Array.isArray(cfg.labels) || !Array.isArray(cfg.datasets)) {
      console.warn('[SharedChart] createBarChart: labels and datasets must be arrays');
      return null;
    }

    if (cfg.previous) destroy(cfg.previous);

    var callerOptions = cfg.options || {};
    var options = mergeOptions(defaultBarOptions(callerOptions), callerOptions);
    var datasets = enrichDatasets(cfg.datasets);

    // Give the value axis 15% headroom so datalabels positioned above the
    // tallest bar (align:'top') don't clip outside the canvas. Matches
    // sales-by-country.js pattern. Only applied when caller didn't already
    // set a max on the value axis.
    var horizontal = callerOptions.indexAxis === 'y';
    var maxValue = 0;
    for (var i = 0; i < cfg.datasets.length; i++) {
      var data = cfg.datasets[i] && cfg.datasets[i].data;
      if (!Array.isArray(data)) continue;
      for (var j = 0; j < data.length; j++) {
        var v = Number(data[j]);
        if (!isNaN(v) && v > maxValue) maxValue = v;
      }
    }
    if (maxValue > 0) {
      var suggestedMax = maxValue * 1.15;
      var valueAxis = horizontal ? options.scales.x : options.scales.y;
      if (valueAxis && valueAxis.suggestedMax == null && valueAxis.max == null) {
        valueAxis.suggestedMax = suggestedMax;
      }
    }

    var chartCfg = {
      type: 'bar',
      data: { labels: cfg.labels, datasets: datasets },
      options: options
    };

    // Register datalabels plugin per-chart if the library is present.
    if (hasDataLabels()) {
      chartCfg.plugins = [window.ChartDataLabels];
    }

    try {
      return new window.Chart(cfg.canvasEl, chartCfg);
    } catch (err) {
      console.warn('[SharedChart] Chart construction failed:', err);
      return null;
    }
  }

  function destroy(chart) {
    if (!chart) return;
    if (typeof chart.destroy === 'function') {
      try { chart.destroy(); }
      catch (e) { console.warn('[SharedChart] destroy threw:', e); }
    }
  }

  window.SharedChart = {
    createBarChart: createBarChart,
    destroy       : destroy
  };

})();
