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

  // Bypass TokenUtils — read the JWT directly so the eligibility check
  // doesn't see the patched (impersonated) payload from below.
  function getRealUserMember() {
    var token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) return null;
    try {
      var parts = String(token).split('.');
      if (parts.length !== 3) return null;
      var payload = JSON.parse(atob(parts[1]));
      return payload && payload.user && payload.user.agency_member ? payload.user.agency_member : null;
    } catch (e) {
      return null;
    }
  }

  function getRealUserRole() {
    var m = getRealUserMember();
    var role = m && m.job_position ? String(m.job_position).toLowerCase() : '';
    if (role === 'admin' || role === 'ts' || role === 'crm') return role;
    return m ? 'admin' : null;
  }

  function getRealUserId() {
    var m = getRealUserMember();
    if (!m) return 0;
    var n = Number(m.id);
    return Number.isFinite(n) ? n : 0;
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

  // Override TokenUtils.decodeToken so any page that decodes the JWT to
  // populate its own `currentUser` object (e.g. sales-report-by-seller.js)
  // sees the impersonated identity instead of the real admin id=555.
  // The actual JWT in storage is untouched — Authorization: Bearer still
  // carries the real admin token; the backend re-derives effective role
  // from X-View-As-* headers anyway, so this is purely a UI affordance
  // that lets per-page logic naturally render the impersonated role's
  // experience (mask seller names, hide Excel/PDF export, etc.).
  function patchTokenUtilsForViewAs() {
    if (typeof window === 'undefined') return;
    if (window.__viewAsTokenPatched) return;
    if (!window.TokenUtils || typeof window.TokenUtils.decodeToken !== 'function') {
      console.warn('[ViewAs] Patch deferred — TokenUtils not ready yet');
      return;
    }
    var originalDecode = window.TokenUtils.decodeToken.bind(window.TokenUtils);
    window.TokenUtils.decodeToken = function (token) {
      var payload = originalDecode(token);
      if (!payload) return payload;
      try {
        var member = payload.user && payload.user.agency_member;
        if (!member) return payload;
        var role = sessionStorage.getItem('viewAsRole');
        var uidStr = sessionStorage.getItem('viewAsUserId');
        if (!role || !uidStr) return payload;            // not impersonating
        if (role !== 'ts' && role !== 'crm') return payload;
        var realRole = String(member.job_position || '').toLowerCase();
        var realIdNum = parseInt(String(member.id), 10);
        if (realRole !== 'admin' || realIdNum !== VIEW_AS_ADMIN_ID) {
          console.warn('[ViewAs] Override skipped — real user is not admin id=' + VIEW_AS_ADMIN_ID,
            { realRole: realRole, realId: member.id, parsedId: realIdNum });
          return payload;
        }
        var uid = parseInt(uidStr, 10);
        if (!isFinite(uid) || uid <= 0) {
          console.warn('[ViewAs] Override skipped — invalid viewAsUserId:', uidStr);
          return payload;
        }
        var teamRaw = sessionStorage.getItem('viewAsUserTeam');
        var team = parseInt(teamRaw || '', 10);
        if (!window.__viewAsLogged) {
          console.log('[ViewAs] God-mode active — overriding agency_member to', role, 'user id=' + uid);
          window.__viewAsLogged = true;
        }
        return Object.assign({}, payload, {
          user: Object.assign({}, payload.user, {
            agency_member: Object.assign({}, member, {
              id: uid,
              job_position: role,
              nick_name: sessionStorage.getItem('viewAsUserNick') || member.nick_name,
              team: isFinite(team) ? team : member.team
            })
          })
        });
      } catch (e) {
        console.error('[ViewAs] Patch error:', e);
        return payload;
      }
    };
    window.__viewAsTokenPatched = true;
    console.log('[ViewAs] TokenUtils.decodeToken patch installed');
  }

  // Some report pages call fetch() directly (e.g. sales-report-by-seller-api.js)
  // instead of going through SharedHttp. Patch window.fetch once globally so
  // X-View-As-* headers are injected on API requests during impersonation
  // regardless of how the page issues its requests.
  function patchFetchForViewAs() {
    if (typeof window === 'undefined' || !window.fetch || window.__viewAsFetchPatched) return;
    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      init = init || {};
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      // Match same-origin /api/ paths and the absolute API base URL hosts —
      // skip third-party requests so their CORS contracts aren't disturbed.
      var apiHosts = ['/api/', 'finance-backoffice-report-api.vercel.app', 'financebackoffice.tourwow.com'];
      var isApiCall = false;
      for (var i = 0; i < apiHosts.length; i++) {
        if (url.indexOf(apiHosts[i]) !== -1) { isApiCall = true; break; }
      }
      if (isApiCall) {
        try {
          var role = sessionStorage.getItem('viewAsRole');
          var uid = sessionStorage.getItem('viewAsUserId');
          if (role && uid) {
            var headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
            if (!headers.has('X-View-As-Role'))    headers.set('X-View-As-Role', role);
            if (!headers.has('X-View-As-User-Id')) headers.set('X-View-As-User-Id', uid);
            init.headers = headers;
          }
        } catch (e) { /* sessionStorage may be unavailable */ }
      }
      return originalFetch(input, init);
    };
    window.__viewAsFetchPatched = true;
  }

  function injectViewAsStyles() {
    if (document.getElementById(VA_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = VA_STYLE_ID;
    s.textContent = [
      // ── Banner: subtle amber tint + steel-blue accents (matches system theme) ──
      '.va-banner{',
      '  position:sticky;top:0;z-index:900;',
      '  display:flex;flex-wrap:wrap;align-items:center;gap:14px;',
      '  padding:10px 20px;',
      '  background:linear-gradient(135deg,#fffaeb 0%,#fef3c7 100%);',
      '  color:#78350f;',
      '  border-bottom:1px solid #f0c674;',
      '  font:500 13px/1.4 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  box-shadow:0 1px 3px rgba(120,53,15,.08);',
      '}',
      '.va-banner__icon{font-size:16px;flex-shrink:0;}',
      '.va-banner__left{display:flex;align-items:center;gap:10px;flex:1 1 auto;min-width:0;}',
      '.va-banner__target{font-weight:600;color:#78350f;letter-spacing:.01em;}',
      '.va-banner__divider{color:#d2a154;}',
      '.va-banner__self{color:#a16207;font-size:12.5px;}',
      '.va-banner__right{display:flex;gap:8px;margin-left:auto;flex-shrink:0;}',
      '.va-btn-switch,.va-btn-exit{',
      '  padding:6px 14px;border-radius:6px;cursor:pointer;',
      '  font:500 13px/1 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  transition:background .15s ease,border-color .15s ease;',
      '}',
      '.va-btn-switch{background:#fff;color:#78350f;border:1px solid #e0c068;}',
      '.va-btn-switch:hover{background:#fffbeb;border-color:#c9a14a;}',
      '.va-btn-exit{background:#78350f;color:#fff;border:1px solid #78350f;}',
      '.va-btn-exit:hover{background:#5a2607;border-color:#5a2607;}',
      '@media(max-width:767px){',
      '  .va-banner{flex-direction:column;align-items:flex-start;padding:10px 16px;}',
      '  .va-banner__right{margin-left:0;width:100%;}',
      '  .va-btn-switch,.va-btn-exit{flex:1;text-align:center;}',
      '}',
      // ── Trigger button in sidebar ──
      '.va-trigger-btn{',
      '  display:flex;align-items:center;justify-content:center;gap:6px;',
      '  padding:8px 14px;margin:12px 16px 8px;',
      '  border-radius:6px;border:1px solid #d4dde6;',
      '  background:#fff;color:#4a7ba7;cursor:pointer;',
      '  font:500 13px/1.4 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  transition:background .15s ease,border-color .15s ease,color .15s ease;',
      '}',
      '.va-trigger-btn:hover{background:#f0f7ff;border-color:#4a7ba7;color:#3a6287;}',
      '.va-trigger-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(74,123,167,.25);}',
      // ── Modal overlay ──
      '.va-dialog-overlay{',
      '  position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);',
      '  z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;',
      '  font-family:var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '}',
      '.va-dialog{',
      '  background:#fff;border-radius:12px;',
      '  width:min(480px,95vw);max-height:90vh;overflow-y:auto;',
      '  box-shadow:0 20px 50px rgba(0,0,0,.25);',
      '  color:#1a1a1a;',
      '}',
      '.va-dialog__header{',
      '  display:flex;justify-content:space-between;align-items:center;',
      '  padding:18px 22px 14px;border-bottom:1px solid #e5e7eb;',
      '}',
      '.va-dialog__title{font-size:17px;font-weight:600;margin:0;color:#1a1a1a;}',
      '.va-dialog__close{',
      '  background:none;border:none;font-size:22px;cursor:pointer;color:#9ca3af;',
      '  width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;',
      '  transition:background .15s ease,color .15s ease;',
      '}',
      '.va-dialog__close:hover{background:#f5f5f5;color:#374151;}',
      '.va-dialog__body{padding:18px 22px;}',
      // ── Role cards ──
      '.va-roles__label{font-size:12px;font-weight:600;color:#6b7280;letter-spacing:.04em;text-transform:uppercase;margin:0 0 8px;}',
      '.va-roles{display:flex;gap:10px;margin-bottom:18px;}',
      '.va-role-card{',
      '  flex:1;padding:14px 12px;border:1.5px solid #e5e7eb;border-radius:10px;',
      '  background:#fff;cursor:pointer;text-align:center;',
      '  font:600 14px/1.2 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  color:#374151;',
      '  transition:border-color .15s ease,background .15s ease,color .15s ease;',
      '}',
      '.va-role-card:hover{border-color:#4a7ba7;background:#f0f7ff;}',
      '.va-role-card.is-selected{border-color:#4a7ba7;background:#e8f0f7;color:#3a6287;box-shadow:0 0 0 3px rgba(74,123,167,.12);}',
      '.va-role-card[disabled]{cursor:not-allowed;opacity:.4;}',
      // ── Search input ──
      '.va-user-search{',
      '  width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;',
      '  font:14px/1.4 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  margin-bottom:10px;box-sizing:border-box;background:#fff;color:#1a1a1a;',
      '  transition:border-color .15s ease,box-shadow .15s ease;',
      '}',
      '.va-user-search:focus{outline:none;border-color:#4a7ba7;box-shadow:0 0 0 3px rgba(74,123,167,.15);}',
      '.va-user-search::placeholder{color:#9ca3af;}',
      // ── User list ──
      '.va-user-list{',
      '  max-height:280px;overflow-y:auto;',
      '  border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;',
      '}',
      '.va-user-group{',
      '  padding:6px 14px;background:#f5f5f5;border-bottom:1px solid #e5e7eb;',
      '  font-size:11px;font-weight:600;color:#6b7280;letter-spacing:.05em;text-transform:uppercase;',
      '  position:sticky;top:0;',
      '}',
      '.va-user-item{',
      '  padding:10px 14px;cursor:pointer;',
      '  display:flex;justify-content:space-between;align-items:center;gap:10px;',
      '  border-bottom:1px solid #f0f0f0;',
      '  font-size:13.5px;color:#374151;',
      '  transition:background .12s ease;',
      '}',
      '.va-user-item:last-child{border-bottom:none;}',
      '.va-user-item:hover{background:#fff;}',
      '.va-user-item.is-selected{background:#e8f0f7;color:#3a6287;font-weight:500;}',
      '.va-user-item__name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.va-user-item__id{color:#9ca3af;font-size:11.5px;flex-shrink:0;font-variant-numeric:tabular-nums;}',
      '.va-user-empty{padding:32px 14px;text-align:center;color:#9ca3af;font-size:13px;}',
      // ── Actions ──
      '.va-dialog__actions{',
      '  display:flex;justify-content:flex-end;gap:10px;',
      '  padding:14px 22px 18px;border-top:1px solid #e5e7eb;background:#fafafa;',
      '  border-radius:0 0 12px 12px;',
      '}',
      '.va-btn-apply,.va-btn-cancel{',
      '  padding:9px 20px;border-radius:6px;cursor:pointer;',
      '  font:500 14px/1 var(--font-family-base, "Roboto", "Kanit", sans-serif);',
      '  transition:background .15s ease,border-color .15s ease;',
      '}',
      '.va-btn-cancel{background:#fff;color:#6b7280;border:1px solid #d1d5db;}',
      '.va-btn-cancel:hover{background:#f5f5f5;color:#374151;}',
      '.va-btn-apply{background:#4a7ba7;color:#fff;border:1px solid #4a7ba7;}',
      '.va-btn-apply:hover:not([disabled]){background:#3a6287;border-color:#3a6287;}',
      '.va-btn-apply[disabled]{background:#cbd5e0;border-color:#cbd5e0;color:#fff;cursor:not-allowed;}',
      // ── Error state ──
      '.va-dialog__error{',
      '  padding:11px 14px;background:#fef2f2;color:#991b1b;',
      '  border:1px solid #fecaca;border-radius:8px;',
      '  margin-bottom:14px;font-size:13px;line-height:1.5;',
      '}',
      // ── body class hook (subtle inset shadow during impersonation) ──
      'body.va-impersonating{}',
      ''
    ].join('\n');
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
    btn.setAttribute('aria-label', 'เปิดโหมดดูเป็น');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '<circle cx="12" cy="12" r="3"/></svg>' +
      '<span>ดูเป็น Role อื่น</span>';
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
      '  <span class="va-banner__icon" aria-hidden="true">' +
      '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      '      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '      <circle cx="12" cy="12" r="3"/></svg>' +
      '  </span>' +
      '  <span class="va-banner__target">กำลังดูในฐานะ: ' + escapeHtml(nick) + ' (' + escapeHtml(roleLabel) + escapeHtml(teamLabel) + ')</span>' +
      '  <span class="va-banner__divider" aria-hidden="true">·</span>' +
      '  <span class="va-banner__self">คุณคือ Admin (id ' + getRealUserId() + ')</span>' +
      '</div>' +
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
      '    <button class="va-dialog__close" type="button" aria-label="ปิด">&times;</button>' +
      '  </div>' +
      '  <div class="va-dialog__body">' +
      '    <div class="va-dialog__error" hidden></div>' +
      '    <p class="va-roles__label">เลือก Role</p>' +
      '    <div role="radiogroup" aria-label="เลือก Role" class="va-roles">' +
      '      <button class="va-role-card" data-role="ts" type="button" role="radio">TS</button>' +
      '      <button class="va-role-card" data-role="crm" type="button" role="radio">CRM</button>' +
      '    </div>' +
      '    <p class="va-roles__label">เลือกผู้ใช้</p>' +
      '    <input class="va-user-search" type="search" placeholder="ค้นหาชื่อเล่น / ชื่อจริง..." aria-label="ค้นหาผู้ใช้"/>' +
      '    <div class="va-user-list" role="listbox"><div class="va-user-empty">กำลังโหลด...</div></div>' +
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
        listEl.innerHTML = '<div class="va-user-empty">ไม่พบผู้ใช้ที่ตรงกับการค้นหา</div>';
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
          var nick = u.nickname || '-';
          var fullName = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
          var displayName = fullName ? nick + ' — ' + fullName : nick;
          html += '<div class="va-user-item' + (isSel ? ' is-selected' : '') +
                  '" role="option" data-id="' + u.ID + '" tabindex="0" aria-selected="' + (isSel ? 'true' : 'false') + '">' +
                  '<span class="va-user-item__name">' + escapeHtml(displayName) + '</span>' +
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

    // View-as feature: UI + fetch + token patches.
    // (TokenUtils patch is also applied at script-body level below so it
    //  takes effect before page-level scripts decode the token.)
    patchTokenUtilsForViewAs();
    patchFetchForViewAs();
    injectViewAsStyles();
    injectViewAsTrigger();
    injectViewAsBanner();

    // Add click handlers
    document.addEventListener('click', handleMenuClick);

    console.log('✅ Menu Component initialized');
  }

  // Patch TokenUtils.decodeToken IMMEDIATELY at script-body time, before
  // any page-level script (e.g. sales-report-by-seller.js) gets a chance
  // to call it during their own initialisation. menu-component.js is
  // loaded after token-utils.js but before page-level scripts in every
  // page's <head>, so this synchronous patch is in place by the time
  // page scripts read the token.
  patchTokenUtilsForViewAs();

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
