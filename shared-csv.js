// shared-csv.js — Shared CSV export utility with UTF-8 BOM for Thai in Excel.
// Standard flow: BOM + join + Blob + anchor click + revoke.
//
// Exposes window.SharedCSV (IIFE).

(function () {
  'use strict';

  // UTF-8 BOM — Excel needs this to render Thai characters correctly.
  var UTF8_BOM = '﻿';

  /**
   * Escape a single CSV field per RFC 4180:
   *  - If the value contains comma, quote, CR, or LF, wrap in quotes.
   *  - Double any embedded quotes.
   *  - Null/undefined → empty string.
   *  - Numbers/booleans → toString().
   */
  function escapeField(value) {
    if (value == null) return '';
    var str = String(value);
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function buildCSV(headers, rows) {
    var lines = [];
    if (Array.isArray(headers) && headers.length > 0) {
      lines.push(headers.map(escapeField).join(','));
    }
    if (Array.isArray(rows)) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (Array.isArray(r)) {
          lines.push(r.map(escapeField).join(','));
        } else {
          // Skip non-array rows but warn — do not throw.
          console.warn('[SharedCSV] row[' + i + '] is not an array, skipping');
        }
      }
    }
    return UTF8_BOM + lines.join('\r\n');
  }

  /**
   * Trigger a browser download of the CSV.
   * @param {Object} cfg
   * @param {string}   cfg.filename - suggested download filename (with or without .csv)
   * @param {string[]} cfg.headers  - column header row
   * @param {Array<Array>} cfg.rows - data rows as array-of-arrays
   */
  function exportCSV(cfg) {
    cfg = cfg || {};
    if (!cfg.filename || typeof cfg.filename !== 'string') {
      console.warn('[SharedCSV] export: filename is required');
      return;
    }
    if (typeof document === 'undefined' || typeof Blob === 'undefined' ||
        typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      console.warn('[SharedCSV] export: browser APIs not available');
      return;
    }

    var filename = cfg.filename;
    if (!/\.csv$/i.test(filename)) filename += '.csv';

    var csv = buildCSV(cfg.headers, cfg.rows);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);

    var link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Small delay ensures the download starts before revocation on some browsers.
    setTimeout(function () {
      try { URL.revokeObjectURL(url); }
      catch (e) { /* ignore */ }
    }, 0);
  }

  window.SharedCSV = {
    // Primary API surface required by the spec.
    export: exportCSV,
    // Alias for call sites that can't use the `export` keyword directly
    // (e.g. older minifiers or linters). Optional but harmless.
    exportCSV: exportCSV
  };

})();
