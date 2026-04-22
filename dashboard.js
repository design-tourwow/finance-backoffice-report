// dashboard.js
// Dashboard landing page — vanilla JS
// Renders a welcome hero and a grid of entry-point cards for every
// report page in the sidebar (Work List is intentionally excluded).

(function () {
  'use strict';

  var CARDS = [
    {
      href: '/sales-by-country',
      title: 'Sales by Country',
      description: 'สรุปยอดขายแยกตามประเทศปลายทาง',
      icon: iconGlobe()
    },
    {
      href: '/wholesale-destinations',
      title: 'Wholesale Destinations',
      description: 'รายงานยอด Wholesale แยกตามปลายทาง',
      icon: iconMap()
    },
    {
      href: '/commission-report-plus',
      title: 'Commission Report Plus',
      description: 'รายงานคอมมิชชั่นระดับออเดอร์พร้อมฟิลเตอร์ละเอียด',
      icon: iconReceipt()
    },
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
    },
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
  ];

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  function render() {
    var pc = document.getElementById('page-content');
    if (!pc) return;

    pc.innerHTML = [
      renderHero(),
      renderCards()
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

  function renderCards() {
    return [
      '<section class="dashboard-cards" aria-label="เมนูรายงาน">',
      '  <div class="dashboard-card-grid">',
      CARDS.map(renderCard).join('\n'),
      '  </div>',
      '</section>'
    ].join('\n');
  }

  function renderCard(card) {
    return [
      '  <a class="dashboard-card" href="' + escapeHtml(card.href) + '">',
      '    <span class="dashboard-card-icon" aria-hidden="true">' + card.icon + '</span>',
      '    <span class="dashboard-card-body">',
      '      <span class="dashboard-card-title">' + escapeHtml(card.title) + '</span>',
      '      <span class="dashboard-card-description">' + escapeHtml(card.description) + '</span>',
      '    </span>',
      '    <span class="dashboard-card-arrow" aria-hidden="true">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
      '    </span>',
      '  </a>'
    ].join('\n');
  }

  // ---------- inline SVG icons (24×24, stroke=currentColor) ---------- //
  function iconGlobe() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="12" cy="12" r="10"/>'
      + '<line x1="2" y1="12" x2="22" y2="12"/>'
      + '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
      + '</svg>';
  }

  function iconMap() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>'
      + '<line x1="8" y1="2" x2="8" y2="18"/>'
      + '<line x1="16" y1="6" x2="16" y2="22"/>'
      + '</svg>';
  }

  function iconReceipt() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 2V2z"/>'
      + '<line x1="8" y1="8" x2="16" y2="8"/>'
      + '<line x1="8" y1="12" x2="16" y2="12"/>'
      + '<line x1="8" y1="16" x2="13" y2="16"/>'
      + '</svg>';
  }

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

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
