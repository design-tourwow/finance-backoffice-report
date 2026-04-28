// shared-table-count.js
// Renders the standard `.dashboard-table-title` block (icon + "แสดง N รายการ")
// shown above every report table. Centralises the markup + number formatting
// so every page shares the same look and so the count can be updated in
// place without re-rendering the whole table header.
//
// Usage:
//   // On initial render — emit the full wrapper into your HTML string.
//   ${window.SharedTableCount.render({ id: 'crp-table-count', count: rows.length })}
//
//   // After client-side filtering / sorting — update the count in place:
//   window.SharedTableCount.update('crp-table-count', filteredRows.length);
//
// Options for render():
//   id     — required. id attribute on the inner <span> so update() can find it.
//   count  — number to display. Defaults to 0.
//   label  — unit, default 'รายการ'. Pass '' to omit.
//   prefix — leading word, default 'แสดง'. Pass '' to omit.
//   icon   — full <svg ...> string. Defaults to the clipboard-list icon
//            already used on the report pages.

(function () {
  'use strict';

  var DEFAULT_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>' +
      '<rect x="9" y="3" width="6" height="4" rx="1"/>' +
      '<path d="M9 12h6M9 16h4"/>' +
    '</svg>';

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatCount(n) {
    var num = Number(n);
    if (!isFinite(num)) num = 0;
    try { return new Intl.NumberFormat('en-US').format(Math.round(num)); }
    catch (e) { return String(Math.round(num)); }
  }

  function buildText(count, label, prefix) {
    var parts = [];
    if (prefix) parts.push(prefix);
    parts.push(formatCount(count));
    if (label) parts.push(label);
    return parts.join(' ');
  }

  function render(opts) {
    opts = opts || {};
    var id     = opts.id || '';
    var count  = opts.count != null ? opts.count : 0;
    var label  = opts.label  != null ? opts.label  : 'รายการ';
    var prefix = opts.prefix != null ? opts.prefix : 'แสดง';
    var icon   = opts.icon   || DEFAULT_ICON;
    var idAttr = id ? ' id="' + escapeAttr(id) + '"' : '';
    return '<div class="dashboard-table-title">' +
             icon +
             '<span' + idAttr + '>' + buildText(count, label, prefix) + '</span>' +
           '</div>';
  }

  function update(id, count, label, prefix) {
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var lbl = label  != null ? label  : 'รายการ';
    var pfx = prefix != null ? prefix : 'แสดง';
    el.textContent = buildText(count, lbl, pfx);
  }

  window.SharedTableCount = {
    render: render,
    update: update
  };

})();
