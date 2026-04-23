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
      '/canceled-orders': true,
      '/work-list': true,
      '/supplier-commission': true,
      '/discount-sales': true,
      '/order-external-summary': true,
      '/request-discount': true,
      '/order-report': true
    },
    ts: {
      '/401': true,
      '/403': true,
      '/': true,
      '/dashboard': true,
      '/tour-image-manager': false,
      '/sales-by-country': false,
      '/wholesale-destinations': false,
      '/sales-report': true,
      '/canceled-orders': true,
      '/work-list': false,
      '/supplier-commission': false,
      '/discount-sales': false,
      '/order-external-summary': false,
      '/request-discount': false,
      '/order-report': false
    },
    crm: {
      '/401': true,
      '/403': true,
      '/': true,
      '/dashboard': true,
      '/tour-image-manager': false,
      '/sales-by-country': false,
      '/wholesale-destinations': false,
      '/sales-report': true,
      '/canceled-orders': true,
      '/work-list': false,
      '/supplier-commission': false,
      '/discount-sales': false,
      '/order-external-summary': false,
      '/request-discount': false,
      '/order-report': false
    }
  };

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

  function getCurrentUserRole() {
    var token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) return null;
    var payload = decodeTokenPayload(token);
    var member = payload && payload.user && payload.user.agency_member ? payload.user.agency_member : {};
    var role = member && member.job_position ? String(member.job_position).toLowerCase() : '';
    if (role === 'admin' || role === 'ts' || role === 'crm') return role;
    return 'admin';
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
    getVisibleMenuItems: getVisibleMenuItems,
    checkAuth: checkAuth,
    redirectToForbiddenPage: redirectToForbiddenPage,
    redirectToUnauthorizedPage: redirectToUnauthorizedPage,
    showAuthModal: showAuthModal
  };

})();
