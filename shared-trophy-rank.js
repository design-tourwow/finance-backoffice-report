// shared-trophy-rank.js — Gold / silver / bronze trophy SVG used in ranking
// summary tables (Telesales / CRM seller rank). Keeps the palette in one
// place so commission-report-plus and repeated-customer-report (and any
// future ranking tables) can share the same visual without copy-pasting
// the inline SVG.
//
// Exposes window.SharedTrophyRank.

(function () {
  'use strict';

  // Rank → 3-tone gradient palette (cup body, mid band, base).
  // Hex codes match the legacy commission-report-plus inline SVG.
  var PALETTE = {
    1: { c0: '#FFC54D', c1: '#C19D72', c2: '#A88763' },  // gold
    2: { c0: '#D4D4D4', c1: '#A8A8A8', c2: '#8C8C8C' },  // silver
    3: { c0: '#CD7F32', c1: '#A0622A', c2: '#8B4513' }   // bronze
  };

  // Returns an HTML string for ranks 1–3, empty string otherwise (caller
  // can fall back to plain rank number). 20×20 by default; pass `size` to
  // override for compact / hero contexts.
  function getTrophySvg(rank, size) {
    var p = PALETTE[rank];
    if (!p) return '';
    var s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 120 120" ' +
      'style="flex-shrink:0;margin-right:4px" xmlns="http://www.w3.org/2000/svg"><g>' +
      '<path fill="' + p.c0 + '" d="M101,34l-0.2-1.7h-10c0.5-3.4,0.8-6.9,1-10.5c0.1-1.9-1.4-3.5-3.1-3.5H31.4c-1.8,0-3.2,1.6-3.1,3.5c0.1,3.6,0.5,7.1,1,10.5h-10L19,34c-0.1,0.4-1.2,10.6,5.4,19.8c4.3,6,11,10.1,19.7,12.2c2.8,2.8,5.9,4.9,9.2,6.2c-0.4,4.1-0.9,8.1-1.4,11.8h16.3c-0.6-3.8-1.1-7.7-1.5-11.8c3.3-1.2,6.4-3.3,9.2-6.2c8.7-2.1,15.4-6.2,19.7-12.2C102.2,44.6,101,34.4,101,34z M27.3,51.3c-4.2-5.8-4.7-12.1-4.7-15.1h7.3c1.9,9.5,5.3,17.9,9.6,24.2C34.3,58.4,30.2,55.3,27.3,51.3z M92.7,51.3c-2.9,4-7,7.1-12.2,9.1c4.4-6.4,7.7-14.7,9.6-24.2h7.3C97.4,39.2,96.8,45.5,92.7,51.3z"/>' +
      '<path fill="' + p.c1 + '" d="M77,98.1H43c-1,0-1.8-0.8-1.8-1.8V83.5c0-1,0.8-1.8,1.8-1.8h34c1,0,1.8,0.8,1.8,1.8v12.8C78.8,97.3,78,98.1,77,98.1z"/>' +
      '<path fill="' + p.c2 + '" d="M37.9,101.9h44.2c1,0,1.8-0.8,1.8-1.8v-3.8c0-1-0.8-1.8-1.8-1.8H37.9c-1,0-1.8,0.8-1.8,1.8v3.8C36.1,101,36.9,101.9,37.9,101.9z"/>' +
      '<path fill="' + p.c0 + '" d="M68,91H52c-0.7,0-1.2-0.5-1.2-1.2v-2.5c0-0.7,0.5-1.2,1.2-1.2h16c0.7,0,1.2,0.5,1.2,1.2v2.5C69.2,90.5,68.6,91,68,91z"/>' +
    '</g></svg>';
  }

  window.SharedTrophyRank = {
    PALETTE: PALETTE,
    getTrophySvg: getTrophySvg
  };

})();
