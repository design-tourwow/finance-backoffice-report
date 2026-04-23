// shared-filter-actions.js
// Shared Search + Reset action-button pair for filter panels.
// Visual reference: /commission-report-plus — .filter-btn-search (primary
// blue) + .filter-btn-reset (white + border), inline-flex row, 12px gap.
//
// Exposes window.SharedFilterActions.
//
// Usage — click-handler pages (commission-report-plus + 4 new reports
// via ReportFilterPanel):
//   SharedFilterActions.mount({
//     containerId: 'myHost',
//     onSearch   : function () { ... },
//     onReset    : function () { ... }
//   });
//
// Usage — native-form pages (tour-image-manager / sales-by-country /
// order-report) that already listen on form 'submit' / 'reset':
//   SharedFilterActions.mount({
//     containerId: 'myHost',
//     searchType : 'submit',   // lets the existing form.addEventListener fire
//     resetType  : 'reset'
//   });
//
// Options
//   containerId  {string}   — required; empty element that will host the buttons
//   searchLabel  {string}   — default 'ค้นหา'
//   resetLabel   {string}   — default 'เริ่มใหม่'
//   searchType   {string}   — 'button' | 'submit' (default 'button')
//   resetType    {string}   — 'button' | 'reset'  (default 'button')
//   searchId     {string}   — optional id on the search button
//   resetId      {string}   — optional id on the reset button
//   onSearch     {Function} — optional click callback (fires in addition to
//                             native submit/reset if the button type is
//                             'submit'/'reset')
//   onReset      {Function} — optional click callback
//
// Returns { searchBtn, resetBtn, destroy }.

(function () {
  'use strict';

  var SEARCH_ICON_SVG =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="8"/>' +
      '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
    '</svg>';

  var RESET_ICON_SVG =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="1 4 1 10 7 10"/>' +
      '<path d="M3.51 15a9 9 0 1 0 .49-4.5"/>' +
    '</svg>';

  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function mount(cfg) {
    cfg = cfg || {};
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[SharedFilterActions] container not found:', cfg.containerId);
      return null;
    }

    var searchLabel = cfg.searchLabel || 'ค้นหา';
    var resetLabel  = cfg.resetLabel  || 'เริ่มใหม่';
    var searchType  = cfg.searchType === 'submit' ? 'submit' : 'button';
    var resetType   = cfg.resetType  === 'reset'  ? 'reset'  : 'button';
    var searchId    = cfg.searchId || '';
    var resetId     = cfg.resetId  || '';
    var searchIdAttr = searchId ? ' id="' + escAttr(searchId) + '"' : '';
    var resetIdAttr  = resetId  ? ' id="' + escAttr(resetId)  + '"' : '';

    container.classList.add('shared-filter-actions');
    container.innerHTML =
      '<button type="' + searchType + '"' + searchIdAttr + ' class="filter-btn-search">' +
        SEARCH_ICON_SVG +
        '<span>' + escText(searchLabel) + '</span>' +
      '</button>' +
      '<button type="' + resetType + '"' + resetIdAttr + ' class="filter-btn-reset">' +
        RESET_ICON_SVG +
        '<span>' + escText(resetLabel) + '</span>' +
      '</button>';

    var searchBtn = container.querySelector('.filter-btn-search');
    var resetBtn  = container.querySelector('.filter-btn-reset');

    if (typeof cfg.onSearch === 'function') {
      searchBtn.addEventListener('click', function (e) {
        try { cfg.onSearch(e); }
        catch (err) { console.warn('[SharedFilterActions] onSearch threw:', err); }
      });
    }
    if (typeof cfg.onReset === 'function') {
      resetBtn.addEventListener('click', function (e) {
        try { cfg.onReset(e); }
        catch (err) { console.warn('[SharedFilterActions] onReset threw:', err); }
      });
    }

    return {
      searchBtn: searchBtn,
      resetBtn : resetBtn,
      destroy  : function () {
        container.classList.remove('shared-filter-actions');
        container.innerHTML = '';
      }
    };
  }

  window.SharedFilterActions = { mount: mount };

})();
