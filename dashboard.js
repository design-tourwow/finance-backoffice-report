// dashboard.js
// Dashboard landing page — vanilla JS
// Renders a welcome hero and a grid of cards linking to the four
// ported report pages (Report P'NUT / Report P'OH).

(function () {
  'use strict';

  // ------------------------------------------------------------------ //
  // Card configuration                                                  //
  // ------------------------------------------------------------------ //
  var CARD_GROUPS = [
    {
      id: 'pnut',
      title: "Report P'NUT",
      cards: [
        {
          href: '/supplier-commission',
          title: 'Supplier Commission',
          description: 'รายงาน Supplier Commission แยกตามประเทศและทีม',
          icon: iconChart()
        },
        {
          href: '/discount-sales',
          title: 'Discount Sales',
          description: 'รายงานยอดส่วนลดจากการขาย',
          icon: iconTag()
        }
      ]
    },
    {
      id: 'poh',
      title: "Report P'OH",
      cards: [
        {
          href: '/request-discount',
          title: 'Order Discount',
          description: 'รายงานคำขอส่วนลดของออเดอร์',
          icon: iconDocument()
        },
        {
          href: '/order-external-summary',
          title: 'Order แก้ย้อนหลัง',
          description: 'รายงานการแก้ไขออเดอร์ย้อนหลังจากระบบภายนอก',
          icon: iconClock()
        }
      ]
    }
  ];

  // ------------------------------------------------------------------ //
  // Bootstrap                                                           //
  // ------------------------------------------------------------------ //
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  // ------------------------------------------------------------------ //
  // Render                                                              //
  // ------------------------------------------------------------------ //
  function render() {
    var pc = document.getElementById('page-content');
    if (!pc) return;

    pc.innerHTML = [
      renderHero(),
      renderGroups()
    ].join('\n');
  }

  function renderHero() {
    return [
      '<section class="dashboard-hero" aria-labelledby="dashboard-hero-title">',
      '  <h2 id="dashboard-hero-title" class="dashboard-hero-title">',
      '    ยินดีต้อนรับเข้าสู่ระบบ Finance Backoffice Report',
      '  </h2>',
      '  <p class="dashboard-hero-subtitle">',
      '    เลือกรายงานที่ต้องการเพื่อดูข้อมูลสรุปและตัวเลขที่สำคัญสำหรับการทำงานประจำวัน',
      '  </p>',
      '</section>'
    ].join('\n');
  }

  function renderGroups() {
    return CARD_GROUPS.map(function (group) {
      return [
        '<section class="dashboard-group" aria-labelledby="dashboard-group-' + escapeHtml(group.id) + '">',
        '  <h2 id="dashboard-group-' + escapeHtml(group.id) + '" class="dashboard-group-title">',
        '    ' + escapeHtml(group.title),
        '  </h2>',
        '  <div class="dashboard-card-grid">',
        group.cards.map(renderCard).join('\n'),
        '  </div>',
        '</section>'
      ].join('\n');
    }).join('\n');
  }

  function renderCard(card) {
    return [
      '  <a class="dashboard-card" href="' + escapeHtml(card.href) + '">',
      '    <span class="dashboard-card-icon" aria-hidden="true">' + card.icon + '</span>',
      '    <span class="dashboard-card-body">',
      '      <span class="dashboard-card-title">' + escapeHtml(card.title) + '</span>',
      '      <span class="dashboard-card-description">' + escapeHtml(card.description) + '</span>',
      '    </span>',
      '  </a>'
    ].join('\n');
  }

  // ------------------------------------------------------------------ //
  // Inline SVG icons                                                    //
  // ------------------------------------------------------------------ //
  function iconChart() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<line x1="18" y1="20" x2="18" y2="10"/>'
      + '<line x1="12" y1="20" x2="12" y2="4"/>'
      + '<line x1="6" y1="20" x2="6" y2="14"/>'
      + '</svg>';
  }

  function iconTag() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>'
      + '<line x1="7" y1="7" x2="7.01" y2="7"/>'
      + '</svg>';
  }

  function iconDocument() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
      + '<polyline points="14 2 14 8 20 8"/>'
      + '<line x1="16" y1="13" x2="8" y2="13"/>'
      + '<line x1="16" y1="17" x2="8" y2="17"/>'
      + '</svg>';
  }

  function iconClock() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="12" cy="12" r="10"/>'
      + '<polyline points="12 6 12 12 16 14"/>'
      + '</svg>';
  }

  // ------------------------------------------------------------------ //
  // Helpers                                                             //
  // ------------------------------------------------------------------ //
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
