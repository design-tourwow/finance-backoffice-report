// Tour Image Manager - LOCAL DEBUG VERSION
// This file is for localhost debugging only
(function () {
  'use strict';

  console.log('🔧 LOCAL DEBUG MODE - tour-image-manager-local.js loaded');

  document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOMContentLoaded fired');
    
    // Check if TourImageAPI is loaded
    if (typeof TourImageAPI === 'undefined') {
      console.error('❌ TourImageAPI not found!');
      return;
    }
    console.log('✅ TourImageAPI loaded:', TourImageAPI);
    
    // Check token
    const hasToken = TourImageAPI.hasToken();
    const token = TourImageAPI.getToken();
    console.log('🔑 Has token:', hasToken);
    console.log('🔑 Token value:', token ? token.substring(0, 50) + '...' : 'null');
    
    // Check modal element
    const modal = document.getElementById('tokenModal');
    console.log('🎭 Token modal element:', modal);
    
    if (!hasToken) {
      console.log('⚠️ No token found - attempting to show modal');
      if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Modal display set to flex');
      } else {
        console.error('❌ Modal element not found!');
      }
    } else {
      console.log('✅ Token exists, will validate');
    }
  });

})();
