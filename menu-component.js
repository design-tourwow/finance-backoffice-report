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
          id: 'commission-report-plus',
          label: 'Commission Report Plus',
          url: '/commission-report-plus',
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

  function getVisibleMenuItems() {
    return MENU_ITEMS;
  }

  // Flatten MENU_ITEMS so every entry is a leaf with a url. Parents
  // that only exist as submenu containers (no url of their own) are
  // dropped; each of their children gets promoted to the top level.
  function getFlatMenuItems() {
    var flat = [];
    MENU_ITEMS.forEach(function (item) {
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
    return window.location.pathname;
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

  // Show custom modal
  function showAuthModal() {
    // Check if modal already exists
    let modal = document.getElementById('authModal');
    
    if (!modal) {
      // Create modal
      modal = document.createElement('div');
      modal.id = 'authModal';
      modal.className = 'auth-modal';
      modal.innerHTML = `
        <div class="auth-modal-overlay"></div>
        <div class="auth-modal-content">
          <div class="auth-modal-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div class="auth-modal-header">
            <h3>ไม่พบ Token หรือ Token หมดอายุ</h3>
          </div>
          <div class="auth-modal-body">
            <p>กรุณาเข้าสู่ระบบใหม่อีกครั้ง</p>
          </div>
          <div class="auth-modal-footer">
            <button type="button" class="btn btn-primary" id="authModalOk">ตกลง</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add event listener
      document.getElementById('authModalOk').addEventListener('click', function() {
        redirectToLogin();
      });

      // Close on overlay click
      modal.querySelector('.auth-modal-overlay').addEventListener('click', function() {
        redirectToLogin();
      });

      // Close on Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          redirectToLogin();
        }
      });
    }

    // Show modal
    modal.style.display = 'flex';
    
    // Focus on OK button
    setTimeout(() => {
      document.getElementById('authModalOk').focus();
    }, 100);
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
      console.log('❌ No token found - showing auth modal');
      showAuthModal();
      return false;
    }
  }

  // Initialize menu component
  function initMenuComponent() {
    console.log('🎯 Initializing Menu Component...');
    
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
    checkAuth: checkAuth,
    showAuthModal: showAuthModal
  };

})();
