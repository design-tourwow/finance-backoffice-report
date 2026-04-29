// Handle external link click - pass token via /authentoken path
function handleExternalLink(e, url) {
  e.preventDefault();
  var token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  var baseUrl = url.replace(/\/+$/, '');
  var targetUrl = token ? baseUrl + '/authentoken?token=' + encodeURIComponent(token) : url;
  window.open(targetUrl, '_blank');
}

// Menu Component - Centralized Menu Management
(function() {
  'use strict';

  const ROLE_ACCESS = {
    admin: {
      '/401': true,
      '/403': true,
      '/': true,
      '/dashboard': true,
      '/tour-image-manager': true,
      '/sales-by-country': true,
      '/wholesale-destinations': true,
      '/sales-report': true,
      '/sales-report-by-seller': true,
      '/canceled-orders': true,
      '/work-list': true,
      '/supplier-commission': true,
      '/discount-sales': true,
      '/order-external-summary': true,
      '/request-discount': true,
      '/order-report': true,
      '/repeated-customer-report': true
    },
    ts: {
      '/401': true,
      '/403': true,
      '/': true,
      '/dashboard': true,
      '/tour-image-manager': false,
      '/sales-by-country': false,
      '/wholesale-destinations': false,
      '/sales-report': false,
      '/sales-report-by-seller': true,
      '/canceled-orders': false,
      '/work-list': false,
      '/supplier-commission': false,
      '/discount-sales': false,
      '/order-external-summary': false,
      '/request-discount': false,
      '/order-report': false,
      '/repeated-customer-report': false
    },
    crm: {
      '/401': true,
      '/403': true,
      '/': true,
      '/dashboard': true,
      '/tour-image-manager': false,
      '/sales-by-country': false,
      '/wholesale-destinations': false,
      '/sales-report': false,
      '/sales-report-by-seller': true,
      '/canceled-orders': false,
      '/work-list': false,
      '/supplier-commission': false,
      '/discount-sales': false,
      '/order-external-summary': false,
      '/request-discount': false,
      '/order-report': false,
      '/repeated-customer-report': false
    }
  };

  const HEADER_MENU_VISIBLE = false;

  // Menu configuration - แก้ไขที่เดียว ใช้ได้ทุกหน้า
  // Menu configuration - แก้ไขที่เดียว ใช้ได้ทุกหน้า
  const MENU_ITEMS = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      url: '/dashboard',
      requireAuth: true
    },
    {
      id: 'tour-image-manager',
      label: 'Tour Image Manager',
      url: '/tour-image-manager',
      requireAuth: true
    },
    {
      id: 'report',
      label: 'Report',
      requireAuth: true,
      submenu: [
        {
          id: 'sales-by-country',
          label: 'Sales by Country',
          url: '/sales-by-country',
          requireAuth: true
        },
        {
          id: 'wholesale-destinations',
          label: 'Wholesale Destinations',
          url: '/wholesale-destinations',
          requireAuth: true
        },
        {
          id: 'sales-report',
          label: 'Sales Report',
          url: '/sales-report',
          requireAuth: true
        },
        {
          id: 'sales-report-by-seller',
          label: 'Sales Report by Seller',
          url: '/sales-report-by-seller',
          requireAuth: true
        },
        {
          id: 'canceled-orders',
          label: 'Canceled Orders',
          url: '/canceled-orders',
          requireAuth: true
        }
      ]
    },
    {
      id: 'report-pnut',
      label: "Report P'NUT",
      requireAuth: true,
      submenu: [
        {
          id: 'supplier-commission',
          label: 'Supplier Commission',
          url: '/supplier-commission',
          requireAuth: true
        },
        {
          id: 'discount-sales',
          label: 'Discount Sales',
          url: '/discount-sales',
          requireAuth: true
        }
      ]
    },
    {
      id: 'report-poh',
      label: "Report P'OH",
      requireAuth: true,
      submenu: [
        {
          id: 'request-discount',
          label: 'Order Discount',
          url: '/request-discount',
          requireAuth: true
        },
        {
          id: 'order-external-summary',
          label: 'Order แก้ย้อนหลัง',
          url: '/order-external-summary',
          requireAuth: true
        }
      ]
    },
    {
      id: 'report-coauay',
      label: "Report Co'Auay",
      requireAuth: true,
      submenu: [
        {
          id: 'repeated-customer-report',
          label: 'Repeated Customer Report',
          url: '/repeated-customer-report',
          requireAuth: true
        }
      ]
    }
  ];

  function normalizePath(path) {
    if (!path) return '/';
    var clean = String(path).split('?')[0].split('#')[0] || '/';
    clean = clean.replace(/\/index\.html$/i, '/');
    clean = clean.replace(/\.html$/i, '');
    clean = clean.replace(/\/+$/, '') || '/';
    return clean;
  }

  function decodeTokenPayload(token) {
    if (!token) return null;
    if (typeof TokenUtils !== 'undefined' && TokenUtils.decodeToken) {
      return TokenUtils.decodeToken(token);
    }
    try {
      var parts = String(token).split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.warn('[MenuComponent] Failed to decode token payload:', error);
      return null;
    }
  }

  // ─── View-As constants ─────────────────────────────────────────────────
  var VIEW_AS_ADMIN_ID = 555;          // single authorized impersonator
  var VIEW_AS_ROLES = ['ts', 'crm'];

  function getRealUserMember() {
    var token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) return null;
    var payload = decodeTokenPayload(token);
    return payload && payload.user && payload.user.agency_member ? payload.user.agency_member : null;
  }

  function getRealUserRole() {
    var m = getRealUserMember();
    var role = m && m.job_position ? String(m.job_position).toLowerCase() : '';
    if (role === 'admin' || role === 'ts' || role === 'crm') return role;
    return m ? 'admin' : null;
  }

  function getRealUserId() {
    var m = getRealUserMember();
    return m && typeof m.id === 'number' ? m.id : 0;
  }

  function isViewAsEligible() {
    return getRealUserRole() === 'admin' && getRealUserId() === VIEW_AS_ADMIN_ID;
  }

  function isImpersonating() {
    if (!isViewAsEligible()) return false;
    var role = sessionStorage.getItem('viewAsRole');
    var uid  = sessionStorage.getItem('viewAsUserId');
    return !!(role && uid && VIEW_AS_ROLES.indexOf(role) !== -1);
  }

  function getCurrentUserRole() {
    // Effective role — view-as override takes precedence when impersonation
    // is active for the eligible admin. Menu visibility, page-access guard,
    // and any other UI-side role decision must use this.
    var token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) return null;
    if (isImpersonating()) {
      return sessionStorage.getItem('viewAsRole');
    }
    return getRealUserRole() || 'admin';
  }

  function canAccessPath(path, role) {
    var normalizedPath = normalizePath(path);
    var effectiveRole = role || getCurrentUserRole();
    if (!effectiveRole) return true;
    var roleAccess = ROLE_ACCESS[effectiveRole] || ROLE_ACCESS.admin;
    if (Object.prototype.hasOwnProperty.call(roleAccess, normalizedPath)) {
      return roleAccess[normalizedPath] !== false;
    }
    return true;
  }

  function filterMenuItems(items, role) {
    return items.reduce(function (acc, item) {
      if (item.submenu && item.submenu.length) {
        var visibleSubmenu = filterMenuItems(item.submenu, role);
        if (visibleSubmenu.length) {
          acc.push(Object.assign({}, item, { submenu: visibleSubmenu }));
        }
        return acc;
      }
      if (!item.url || canAccessPath(item.url, role)) {
        acc.push(item);
      }
      return acc;
    }, []);
  }

  function getVisibleMenuItems(role) {
    return filterMenuItems(MENU_ITEMS, role || getCurrentUserRole());
  }

  // Flatten MENU_ITEMS so every entry is a leaf with a url. Parents
  // that only exist as submenu containers (no url of their own) are
  // dropped; each of their children gets promoted to the top level.
  function getFlatMenuItems() {
    var visibleMenuItems = getVisibleMenuItems();
    var flat = [];
    visibleMenuItems.forEach(function (item) {
      if (item.submenu && item.submenu.length) {
        item.submenu.forEach(function (sub) {
          if (sub && sub.url) flat.push(sub);
        });
      } else if (item.url) {
        flat.push(item);
      }
    });
    return flat;
  }

  // Get current page path
  function getCurrentPath() {
    return normalizePath(window.location.pathname);
  }

  function setHeaderMenuVisibility(isVisible) {
    var topBar = document.querySelector('.top-bar');
    if (!topBar) return;
    topBar.style.display = isVisible ? '' : 'none';
    topBar.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
  }

  // Check if menu item is active
  function isActive(menuUrl) {
    const currentPath = getCurrentPath();
    return currentPath === menuUrl || currentPath === menuUrl + '.html';
  }

  // Render sidebar menu — flat list; submenu parents are hidden, their
  // /slug children are promoted to top-level entries.
  function renderSidebarMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    const menuHTML = getFlatMenuItems().map(item => {
      const activeClass = isActive(item.url) ? ' active' : '';
      const ariaCurrent = isActive(item.url) ? ' aria-current="page"' : '';
      if (item.external) {
        return `<a href="${item.url}" class="nav-item${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent} onclick="handleExternalLink(event, '${item.url}')">${item.label}</a>`;
      }
      return `<a href="${item.url}" class="nav-item${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent}>${item.label}</a>`;
    }).join('');

    navMenu.innerHTML = menuHTML;
  }

  // Render header menu — flat list; submenu parents are hidden, their
  // /slug children are promoted to top-level entries.
  function renderHeaderMenu() {
    const navbarList = document.querySelector('.navbar-list');
    if (!navbarList) return;

    if (!HEADER_MENU_VISIBLE) {
      navbarList.innerHTML = '';
      setHeaderMenuVisibility(false);
      return;
    }

    setHeaderMenuVisibility(true);

    const menuHTML = getFlatMenuItems().map(item => {
      const activeClass = isActive(item.url) ? ' active' : '';
      const ariaCurrent = isActive(item.url) ? ' aria-current="page"' : '';
      if (item.external) {
        return `
          <li class="navbar-item">
            <a href="${item.url}" class="navbar-link${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent} onclick="handleExternalLink(event, '${item.url}')">${item.label}</a>
          </li>
        `;
      }
      return `
        <li class="navbar-item">
          <a href="${item.url}" class="navbar-link${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent}>${item.label}</a>
        </li>
      `;
    }).join('');

    navbarList.innerHTML = menuHTML;
  }

  // Check authentication
  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) {
      return TourImageAPI.hasToken();
    }
    // Fallback check
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
  }

  function redirectToUnauthorizedPage() {
    if (typeof TokenUtils !== 'undefined' && TokenUtils.redirectToUnauthorizedPage) {
      TokenUtils.redirectToUnauthorizedPage();
      return;
    }
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
    window.location.href = '/401';
  }

  function redirectToForbiddenPage() {
    if (typeof TokenUtils !== 'undefined' && TokenUtils.redirectToForbiddenPage) {
      TokenUtils.redirectToForbiddenPage();
      return;
    }
    window.location.href = '/403';
  }

  // Legacy name kept for compatibility with page modules that already call it.
  function showAuthModal() {
    redirectToUnauthorizedPage();
  }

  // Redirect to login
  function redirectToLogin() {
    const hostname = window.location.hostname;
    let loginUrl = 'https://financebackoffice.tourwow.com/login';
    
    if (hostname.includes('staging')) {
      loginUrl = 'https://financebackoffice-staging2.tourwow.com/login';
    }
    
    console.log('🔙 Redirecting to login:', loginUrl);
    
    // Clear token
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.removeToken) {
      TourImageAPI.removeToken();
    } else {
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('authToken');
    }
    
    // Redirect
    window.location.href = loginUrl;
  }

  // Handle menu click with auth check
  function handleMenuClick(e) {
    const link = e.target.closest('a');
    if (!link) return;

    const requireAuth = link.getAttribute('data-require-auth') === 'true';
    
    if (requireAuth && !checkAuth()) {
      e.preventDefault();
      console.log('❌ No token found - redirecting to /401');
      redirectToUnauthorizedPage();
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // View-As feature (admin id=555 only)
  // ───────────────────────────────────────────────────────────────────────

  var VA_STYLE_ID = 'view-as-styles';
  var VA_BANNER_ID = 'view-as-banner';
  var VA_TRIGGER_ID = 'view-as-trigger';
  var VA_DIALOG_ID = 'view-as-dialog';

  function injectViewAsStyles() {
    if (document.getElementById(VA_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = VA_STYLE_ID;
    s.textContent =
      '.va-banner{position:sticky;top:0;z-index:1000;display:flex;flex-wrap:wrap;align-items:center;gap:12px;' +
      'padding:8px 16px;background:#fff3cd;color:#7c4a00;border-bottom:2px solid #f0ad4e;font-size:14px;' +
      'font-family:inherit;}' +
      '.va-banner__left{display:flex;align-items:center;gap:8px;flex:1 1 auto;}' +
      '.va-banner__center{flex:0 1 auto;color:#7c4a00aa;}' +
      '.va-banner__right{display:flex;gap:8px;margin-left:auto;}' +
      '.va-banner__target{font-weight:600;}' +
      '.va-btn-switch,.va-btn-exit{padding:4px 12px;border-radius:6px;border:1px solid #d49a2e;' +
      'background:#fff;color:#7c4a00;cursor:pointer;font-size:13px;}' +
      '.va-btn-exit{background:#7c4a00;color:#fff;border-color:#7c4a00;}' +
      '.va-btn-switch:hover{background:#fff7dd;}' +
      '.va-btn-exit:hover{background:#5a3700;}' +
      '@media(max-width:767px){.va-banner{flex-direction:column;align-items:flex-start;}' +
      '.va-banner__right{margin-left:0;}}' +
      '.va-trigger-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;margin:8px 16px;' +
      'border-radius:999px;border:1px solid #cbd5e0;background:#fff;color:#2d3748;cursor:pointer;' +
      'font-size:13px;font-family:inherit;}' +
      '.va-trigger-btn:hover{background:#edf2f7;}' +
      '.va-dialog-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;' +
      'align-items:center;justify-content:center;padding:16px;}' +
      '.va-dialog{background:#fff;border-radius:12px;width:min(480px,95vw);max-height:90vh;overflow-y:auto;' +
      'padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:inherit;color:#1f2937;}' +
      '.va-dialog__header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}' +
      '.va-dialog__title{font-size:18px;font-weight:700;margin:0;}' +
      '.va-dialog__close{background:none;border:none;font-size:22px;cursor:pointer;color:#718096;}' +
      '.va-roles{display:flex;gap:12px;margin-bottom:16px;}' +
      '.va-role-card{flex:1;padding:14px;border:2px solid #e2e8f0;border-radius:10px;text-align:center;' +
      'cursor:pointer;background:#fff;font-weight:600;}' +
      '.va-role-card.is-selected{border-color:#3182ce;background:#ebf8ff;color:#2c5282;}' +
      '.va-role-card[disabled]{cursor:not-allowed;opacity:.4;}' +
      '.va-user-search{width:100%;padding:8px 10px;border:1px solid #cbd5e0;border-radius:6px;' +
      'margin-bottom:8px;font-family:inherit;font-size:14px;box-sizing:border-box;}' +
      '.va-user-list{max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;' +
      'background:#fafafa;}' +
      '.va-user-group{padding:6px 12px;background:#edf2f7;font-size:12px;font-weight:600;color:#4a5568;}' +
      '.va-user-item{padding:8px 12px;cursor:pointer;display:flex;justify-content:space-between;' +
      'border-bottom:1px solid #edf2f7;font-size:13px;}' +
      '.va-user-item:hover{background:#fff;}' +
      '.va-user-item.is-selected{background:#bee3f8;}' +
      '.va-user-item__id{color:#a0aec0;font-size:12px;}' +
      '.va-dialog__actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;}' +
      '.va-btn-apply,.va-btn-cancel{padding:8px 18px;border-radius:6px;border:1px solid #cbd5e0;' +
      'background:#fff;cursor:pointer;font-family:inherit;font-size:14px;}' +
      '.va-btn-apply{background:#3182ce;color:#fff;border-color:#3182ce;}' +
      '.va-btn-apply[disabled]{background:#a0aec0;border-color:#a0aec0;cursor:not-allowed;}' +
      '.va-dialog__error{padding:12px;background:#fed7d7;color:#9b2c2c;border-radius:6px;margin-bottom:12px;}' +
      'body.va-impersonating{}';
    document.head.appendChild(s);
  }

  function injectViewAsTrigger() {
    if (!isViewAsEligible() || isImpersonating()) return;
    if (document.getElementById(VA_TRIGGER_ID)) return;
    var sidebar = document.querySelector('.sidebar') || document.querySelector('aside');
    if (!sidebar) return;
    var btn = document.createElement('button');
    btn.id = VA_TRIGGER_ID;
    btn.className = 'va-trigger-btn';
    btn.type = 'button';
    btn.innerHTML = '\u{1F441} ดูเป็น...';
    btn.addEventListener('click', openViewAsPickerDialog);
    sidebar.appendChild(btn);
  }

  function injectViewAsBanner() {
    if (!isImpersonating()) return;
    if (document.getElementById(VA_BANNER_ID)) return;
    var mainContent = document.querySelector('main.main-content') || document.querySelector('main');
    if (!mainContent) return;

    var role = sessionStorage.getItem('viewAsRole') || '';
    var nick = sessionStorage.getItem('viewAsUserNick') || sessionStorage.getItem('viewAsUserId') || '?';
    var team = sessionStorage.getItem('viewAsUserTeam') || '';
    var roleLabel = role.toUpperCase();
    var teamLabel = team ? ', Team ' + team : '';

    var banner = document.createElement('div');
    banner.id = VA_BANNER_ID;
    banner.className = 'va-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML =
      '<div class="va-banner__left">' +
      '  <span>⚠️</span>' +
      '  <strong class="va-banner__target">ดูในฐานะ: ' + escapeHtml(nick) + ' (' + escapeHtml(roleLabel) + escapeHtml(teamLabel) + ')</strong>' +
      '</div>' +
      '<div class="va-banner__center">คุณคือ: Admin (id ' + getRealUserId() + ')</div>' +
      '<div class="va-banner__right">' +
      '  <button class="va-btn-switch" type="button">เปลี่ยน</button>' +
      '  <button class="va-btn-exit" type="button">ออกจากโหมดดูเป็น</button>' +
      '</div>';

    banner.querySelector('.va-btn-switch').addEventListener('click', openViewAsPickerDialog);
    banner.querySelector('.va-btn-exit').addEventListener('click', exitViewAs);

    mainContent.insertBefore(banner, mainContent.firstChild);
    document.body.classList.add('va-impersonating');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function exitViewAs() {
    sessionStorage.removeItem('viewAsRole');
    sessionStorage.removeItem('viewAsUserId');
    sessionStorage.removeItem('viewAsUserNick');
    sessionStorage.removeItem('viewAsUserTeam');
    window.location.reload();
  }

  function openViewAsPickerDialog() {
    if (!isViewAsEligible()) return;
    closeViewAsPickerDialog();

    var overlay = document.createElement('div');
    overlay.className = 'va-dialog-overlay';
    overlay.id = VA_DIALOG_ID;
    overlay.innerHTML =
      '<div class="va-dialog" role="dialog" aria-modal="true" aria-labelledby="va-dlg-title">' +
      '  <div class="va-dialog__header">' +
      '    <h2 id="va-dlg-title" class="va-dialog__title">ดูในฐานะ Role อื่น</h2>' +
      '    <button class="va-dialog__close" type="button" aria-label="ปิด">×</button>' +
      '  </div>' +
      '  <div class="va-dialog__body">' +
      '    <div class="va-dialog__error" hidden></div>' +
      '    <div role="radiogroup" aria-label="เลือก Role" class="va-roles">' +
      '      <button class="va-role-card" data-role="ts" type="button" role="radio">TS</button>' +
      '      <button class="va-role-card" data-role="crm" type="button" role="radio">CRM</button>' +
      '    </div>' +
      '    <input class="va-user-search" type="search" placeholder="ค้นหาชื่อ / ทีม..." aria-label="ค้นหาผู้ใช้"/>' +
      '    <div class="va-user-list" role="listbox"><div style="padding:24px;text-align:center;color:#a0aec0;">กำลังโหลด...</div></div>' +
      '  </div>' +
      '  <div class="va-dialog__actions">' +
      '    <button class="va-btn-cancel" type="button">ยกเลิก</button>' +
      '    <button class="va-btn-apply" type="button" disabled>เริ่มดูเป็น</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    var state = { members: [], selectedRole: null, selectedUser: null };

    var dlg          = overlay.querySelector('.va-dialog');
    var errorBox     = overlay.querySelector('.va-dialog__error');
    var roleCards    = overlay.querySelectorAll('.va-role-card');
    var searchInput  = overlay.querySelector('.va-user-search');
    var listEl       = overlay.querySelector('.va-user-list');
    var applyBtn     = overlay.querySelector('.va-btn-apply');
    var cancelBtn    = overlay.querySelector('.va-btn-cancel');
    var closeBtn     = overlay.querySelector('.va-dialog__close');

    function setSelectedRole(role) {
      state.selectedRole = role;
      state.selectedUser = null;
      sessionStorage.setItem('viewAsLastRole', role);
      roleCards.forEach(function (c) {
        c.classList.toggle('is-selected', c.getAttribute('data-role') === role);
        c.setAttribute('aria-checked', c.getAttribute('data-role') === role ? 'true' : 'false');
      });
      renderUserList();
      updateApplyButton();
    }

    function renderUserList() {
      var search = (searchInput.value || '').toLowerCase().trim();
      var filtered = state.members.filter(function (u) {
        var role = String(u.job_position || '').toLowerCase();
        if (state.selectedRole && role !== state.selectedRole) return false;
        if (!search) return true;
        var hay = (u.nickname + ' ' + u.first_name + ' ' + u.last_name + ' ' + (u.team_number || '')).toLowerCase();
        return hay.indexOf(search) !== -1;
      });
      if (filtered.length === 0) {
        listEl.innerHTML = '<div style="padding:24px;text-align:center;color:#a0aec0;">ไม่พบผลลัพธ์</div>';
        return;
      }
      var groups = {};
      filtered.forEach(function (u) {
        var key = u.team_number != null && u.team_number !== '' ? String(u.team_number) : '__none';
        if (!groups[key]) groups[key] = [];
        groups[key].push(u);
      });
      var keys = Object.keys(groups).sort(function (a, b) {
        if (a === '__none') return 1; if (b === '__none') return -1;
        return parseInt(a, 10) - parseInt(b, 10);
      });
      var html = '';
      keys.forEach(function (k) {
        var label = k === '__none' ? 'ไม่ระบุทีม' : 'Team ' + k;
        html += '<div class="va-user-group">' + escapeHtml(label) + '</div>';
        groups[k].forEach(function (u) {
          var isSel = state.selectedUser && state.selectedUser.ID === u.ID;
          var name = (u.nickname || '?') + ' — ' + (u.first_name || '') + ' ' + (u.last_name || '');
          html += '<div class="va-user-item' + (isSel ? ' is-selected' : '') +
                  '" role="option" data-id="' + u.ID + '" tabindex="0">' +
                  '<span>' + escapeHtml(name.trim()) + '</span>' +
                  '<span class="va-user-item__id">id ' + u.ID + '</span></div>';
        });
      });
      listEl.innerHTML = html;
      listEl.querySelectorAll('.va-user-item').forEach(function (el) {
        el.addEventListener('click', function () {
          var id = parseInt(el.getAttribute('data-id'), 10);
          state.selectedUser = state.members.find(function (m) { return m.ID === id; }) || null;
          renderUserList();
          updateApplyButton();
        });
      });
    }

    function updateApplyButton() {
      var ok = !!(state.selectedRole && state.selectedUser);
      applyBtn.disabled = !ok;
      applyBtn.textContent = ok
        ? 'เริ่มดูเป็น ' + (state.selectedUser.nickname || state.selectedUser.ID)
        : 'เริ่มดูเป็น';
    }

    function closeDialog() {
      closeViewAsPickerDialog();
      document.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
    }

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', onKeyDown);

    roleCards.forEach(function (c) {
      c.setAttribute('aria-checked', 'false');
      c.addEventListener('click', function () { setSelectedRole(c.getAttribute('data-role')); });
    });
    searchInput.addEventListener('input', renderUserList);

    applyBtn.addEventListener('click', function () {
      if (applyBtn.disabled) return;
      sessionStorage.setItem('viewAsRole', state.selectedRole);
      sessionStorage.setItem('viewAsUserId', String(state.selectedUser.ID));
      sessionStorage.setItem('viewAsUserNick', state.selectedUser.nickname || '');
      sessionStorage.setItem('viewAsUserTeam', state.selectedUser.team_number != null ? String(state.selectedUser.team_number) : '');
      window.location.reload();
    });

    // Pre-select last role and currently impersonated user (if any)
    var defaultRole = sessionStorage.getItem('viewAsLastRole')
                   || sessionStorage.getItem('viewAsRole')
                   || 'ts';

    function loadMembers() {
      // Prefer SharedHttp when available (consistent 401/403 redirect handling),
      // otherwise fall back to plain fetch — some pages (dashboard, index,
      // wholesale-destinations, sales-by-country, tour-image-manager, work-list)
      // don't include shared-http.js but still need the picker to work.
      var loader;
      if (window.SharedHttp && typeof window.SharedHttp.get === 'function') {
        loader = window.SharedHttp.get('/api/agency-members', { params: { roles: 'ts,crm' } });
      } else {
        var token = (window.TokenUtils && window.TokenUtils.getToken && window.TokenUtils.getToken()) ||
                    sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        var base  = window.REPORT_API_BASE_URL || '';
        var url   = base + '/api/agency-members?roles=ts,crm';
        var headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        loader = fetch(url, { headers: headers }).then(function (r) {
          if (r.status === 401) {
            if (window.TokenUtils && window.TokenUtils.redirectToLogin) {
              window.TokenUtils.redirectToLogin('Session หมดอายุ กรุณา login อีกครั้ง');
            }
            throw new Error('Unauthorized');
          }
          if (r.status === 403) {
            if (window.TokenUtils && window.TokenUtils.redirectToForbiddenPage) {
              window.TokenUtils.redirectToForbiddenPage();
            }
            throw new Error('Forbidden');
          }
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        });
      }

      loader
        .then(function (resp) {
          var data = (resp && (resp.data || resp)) || [];
          state.members = Array.isArray(data) ? data : [];
          setSelectedRole(defaultRole);
          var preId = parseInt(sessionStorage.getItem('viewAsUserId') || '0', 10);
          if (preId) {
            state.selectedUser = state.members.find(function (m) { return m.ID === preId; }) || null;
            renderUserList();
            updateApplyButton();
          }
        })
        .catch(function (err) {
          showError('โหลดรายชื่อล้มเหลว: ' + (err && err.message ? err.message : 'unknown'));
        });
    }

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      listEl.innerHTML = '';
    }

    loadMembers();
    setTimeout(function () { closeBtn.focus(); }, 0);
  }

  function closeViewAsPickerDialog() {
    var existing = document.getElementById(VA_DIALOG_ID);
    if (existing) existing.remove();
  }

  // Initialize menu component
  function initMenuComponent() {
    console.log('🎯 Initializing Menu Component...');

    if (checkAuth() && !canAccessPath(getCurrentPath())) {
      console.warn('[MenuComponent] Access denied for current route, redirecting to /403');
      redirectToForbiddenPage();
      return;
    }

    // Render menus
    renderSidebarMenu();
    renderHeaderMenu();

    // View-as feature: trigger button + banner injection
    injectViewAsStyles();
    injectViewAsTrigger();
    injectViewAsBanner();

    // Add click handlers
    document.addEventListener('click', handleMenuClick);

    console.log('✅ Menu Component initialized');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuComponent);
  } else {
    initMenuComponent();
  }

  // Export for external use if needed
  window.MenuComponent = {
    render: function() {
      renderSidebarMenu();
      renderHeaderMenu();
    },
    canAccessPath: canAccessPath,
    getCurrentUserRole: getCurrentUserRole,
    getRealUserRole: getRealUserRole,
    getRealUserId: getRealUserId,
    isImpersonating: isImpersonating,
    isViewAsEligible: isViewAsEligible,
    openViewAsPickerDialog: openViewAsPickerDialog,
    exitViewAs: exitViewAs,
    getVisibleMenuItems: getVisibleMenuItems,
    checkAuth: checkAuth,
    redirectToForbiddenPage: redirectToForbiddenPage,
    redirectToUnauthorizedPage: redirectToUnauthorizedPage,
    showAuthModal: showAuthModal
  };

})();
