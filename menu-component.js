// Menu Component - Centralized Menu Management
(function() {
  'use strict';

  // Menu configuration - แก้ไขที่เดียว ใช้ได้ทุกหน้า
  const MENU_ITEMS = [
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
        }
      ]
    }
  ];

  // Get current page path
  function getCurrentPath() {
    return window.location.pathname;
  }

  // Check if menu item is active
  function isActive(menuUrl) {
    const currentPath = getCurrentPath();
    // Handle /sales-by-country which maps to /order-report-2.html
    if (menuUrl === '/sales-by-country') {
      return currentPath === '/sales-by-country' ||
             currentPath === '/order-report-2' ||
             currentPath === '/order-report-2.html';
    }
    return currentPath === menuUrl || currentPath === menuUrl + '.html';
  }

  // Check if any submenu item is active
  function isSubmenuActive(submenu) {
    if (!submenu) return false;
    return submenu.some(item => isActive(item.url));
  }

  // Render sidebar menu
  function renderSidebarMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    const menuHTML = MENU_ITEMS.map(item => {
      if (item.submenu) {
        // Menu with submenu
        const isExpanded = isSubmenuActive(item.submenu);
        const expandedClass = isExpanded ? ' expanded' : '';

        const submenuHTML = item.submenu.map(subItem => {
          const activeClass = isActive(subItem.url) ? ' active' : '';
          const ariaCurrent = isActive(subItem.url) ? ' aria-current="page"' : '';
          return `<a href="${subItem.url}" class="nav-subitem${activeClass}" data-require-auth="${subItem.requireAuth}"${ariaCurrent}>${subItem.label}</a>`;
        }).join('');

        return `
          <div class="nav-item-group${expandedClass}">
            <button class="nav-item nav-item-toggle" data-require-auth="${item.requireAuth}">
              ${item.label}
              <svg class="nav-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="nav-submenu">
              ${submenuHTML}
            </div>
          </div>
        `;
      } else {
        // Regular menu item
        const activeClass = isActive(item.url) ? ' active' : '';
        const ariaCurrent = isActive(item.url) ? ' aria-current="page"' : '';
        return `<a href="${item.url}" class="nav-item${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent}>${item.label}</a>`;
      }
    }).join('');

    navMenu.innerHTML = menuHTML;

    // Add toggle event listeners
    navMenu.querySelectorAll('.nav-item-toggle').forEach(btn => {
      btn.addEventListener('click', function() {
        const group = this.closest('.nav-item-group');
        group.classList.toggle('expanded');
      });
    });
  }

  // Render header menu
  function renderHeaderMenu() {
    const navbarList = document.querySelector('.navbar-list');
    if (!navbarList) return;

    const menuHTML = MENU_ITEMS.map(item => {
      if (item.submenu) {
        // Menu with dropdown
        const isDropdownActive = isSubmenuActive(item.submenu);
        const activeClass = isDropdownActive ? ' active' : '';

        const submenuHTML = item.submenu.map(subItem => {
          const subActiveClass = isActive(subItem.url) ? ' active' : '';
          const ariaCurrent = isActive(subItem.url) ? ' aria-current="page"' : '';
          return `<a href="${subItem.url}" class="navbar-dropdown-item${subActiveClass}" data-require-auth="${subItem.requireAuth}"${ariaCurrent}>${subItem.label}</a>`;
        }).join('');

        return `
          <li class="navbar-item navbar-dropdown">
            <button class="navbar-link navbar-dropdown-toggle${activeClass}" data-require-auth="${item.requireAuth}">
              ${item.label}
              <svg class="navbar-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="navbar-dropdown-menu">
              ${submenuHTML}
            </div>
          </li>
        `;
      } else {
        // Regular menu item
        const activeClass = isActive(item.url) ? ' active' : '';
        const ariaCurrent = isActive(item.url) ? ' aria-current="page"' : '';
        return `
          <li class="navbar-item">
            <a href="${item.url}" class="navbar-link${activeClass}" data-require-auth="${item.requireAuth}"${ariaCurrent}>${item.label}</a>
          </li>
        `;
      }
    }).join('');

    navbarList.innerHTML = menuHTML;

    // Add dropdown toggle event listeners
    navbarList.querySelectorAll('.navbar-dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.closest('.navbar-dropdown');
        const isOpen = dropdown.classList.contains('open');

        // Close all dropdowns first
        navbarList.querySelectorAll('.navbar-dropdown').forEach(d => d.classList.remove('open'));

        // Toggle current
        if (!isOpen) {
          dropdown.classList.add('open');
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      navbarList.querySelectorAll('.navbar-dropdown').forEach(d => d.classList.remove('open'));
    });
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
