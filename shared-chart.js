// shared-chart.js — Shared Chart.js bar-chart wrapper.
// Destroy-and-redraw safe. Extracted from discount-sales.js / supplier-commission.js /
// request-discount.js patterns where every page manually calls chart.destroy() before
// recreating the same canvas.
//
// Assumes Chart.js (window.Chart) is loaded via CDN in the page HTML.
// Exposes window.SharedChart (IIFE).

(function () {
  'use strict';

  function hasChart() {
    return typeof window.Chart !== 'undefined';
  }

  // Chart.js renders labels / legend / tooltip in a <canvas> — CSS font-family
  // rules do NOT apply there. Set a global default so every chart on the site
  // renders in Kanit to match the surrounding UI. Runs once when this file
  // loads after the Chart.js CDN.
  if (hasChart() && window.Chart.defaults && window.Chart.defaults.font) {
    window.Chart.defaults.font.family = "'Kanit', sans-serif";
  }

  function formatCurrency(v) {
    if (window.SharedUtils && typeof window.SharedUtils.formatCurrency === 'function') {
      return window.SharedUtils.formatCurrency(v);
    }
    return Number(v).toLocaleString();
  }

  // Deep merge small-config objects (one level is enough for Chart.js options).
  // Destination wins when both sides have the same primitive; objects merge recursively.
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

  // Default bar-chart options mirroring the existing pages' look-and-feel.
  function defaultBarOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30,
            font: { family: 'Kanit, sans-serif', size: 11 }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (val) { return '฿' + formatCurrency(val); },
            font: { family: 'Kanit, sans-serif', size: 11 }
          }
        }
      }
    };
  }

  /**
   * Create (or re-create) a Chart.js bar chart on the given canvas element.
   *
   * @param {Object} cfg
   * @param {HTMLCanvasElement} cfg.canvasEl - target canvas
   * @param {string[]} cfg.labels - x-axis labels
   * @param {Array<Object>} cfg.datasets - Chart.js datasets array
   * @param {Object} [cfg.options] - Chart.js options to merge over defaults
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

    // Destroy prior instance if caller passed one, to make re-draw safe.
    if (cfg.previous) {
      destroy(cfg.previous);
    }

    var options = mergeOptions(defaultBarOptions(), cfg.options || {});

    try {
      return new window.Chart(cfg.canvasEl, {
        type: 'bar',
        data: {
          labels: cfg.labels,
          datasets: cfg.datasets
        },
        options: options
      });
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
