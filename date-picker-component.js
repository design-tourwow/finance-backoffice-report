/**
 * Date Picker Component
 * Supports both single date and date range selection
 * Uses Thai Buddhist Era (พ.ศ.) format
 */

const DatePickerComponent = {
  // Track all open pickers to close them when opening a new one
  _openPickers: [],
  
  /**
   * Close all open date pickers
   */
  closeAllPickers() {
    this._openPickers.forEach(picker => {
      if (picker && picker.close) {
        picker.close();
      }
    });
  },
  
  /**
   * Initialize Date Range Picker
   * @param {Object} options - Configuration options
   * @param {string} options.inputId - ID of input element
   * @param {string} options.dropdownId - ID of dropdown element
   * @param {string} options.wrapperId - ID of wrapper element
   * @param {Function} options.onChange - Callback when date changes
   * @returns {Object} Picker instance with methods
   */
  initDateRangePicker(options) {
    const { inputId, dropdownId, wrapperId, onChange } = options;
    
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const wrapper = document.getElementById(wrapperId);

    if (!input || !dropdown || !wrapper) {
      console.error('DatePicker: Required elements not found', { inputId, dropdownId, wrapperId });
      return null;
    }

    const state = {
      startDate: null,
      endDate: null,
      currentMonth: new Date(),
      isOpen: false
    };

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // Toggle calendar
    input.addEventListener('click', function (e) {
      e.stopPropagation();
      
      const isVisible = dropdown.style.display === 'block';
      
      // Close all other pickers first (but not this one if it's already open)
      if (!isVisible) {
        DatePickerComponent.closeAllPickers();
        if (typeof SearchableDropdownComponent !== 'undefined') {
          SearchableDropdownComponent.closeAllDropdowns();
        }
      }
      
      dropdown.style.display = isVisible ? 'none' : 'block';
      state.isOpen = !isVisible;
      input.setAttribute('aria-expanded', state.isOpen);
      if (state.isOpen) {
        renderCalendar();
      }
    });

    // Keyboard support
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
      if (e.key === 'Escape') {
        closeCalendar();
      }
    });

    // Prevent closing when clicking inside dropdown
    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    // Close calendar when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        closeCalendar();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        closeCalendar();
        input.focus();
      }
    });

    function closeCalendar() {
      dropdown.style.display = 'none';
      state.isOpen = false;
      input.setAttribute('aria-expanded', 'false');
    }

    function renderCalendar() {
      const year = state.currentMonth.getFullYear();
      const month = state.currentMonth.getMonth();
      const buddhistYear = year + 543;

      const nextMonthDate = new Date(year, month + 1, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth();
      const nextBuddhistYear = nextYear + 543;

      let html = `
        <div class="calendar-dual">
          <div class="calendar-month">
            <div class="calendar-header">
              <button type="button" class="calendar-nav-btn prev-month" aria-label="เดือนก่อนหน้า">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="calendar-title">${thaiMonths[month]} ${buddhistYear}</div>
              <div style="width: 36px;"></div>
            </div>
            <div class="calendar-days-header">
              ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">${renderDays(year, month)}</div>
          </div>
          <div class="calendar-month">
            <div class="calendar-header">
              <div style="width: 36px;"></div>
              <div class="calendar-title">${thaiMonths[nextMonth]} ${nextBuddhistYear}</div>
              <button type="button" class="calendar-nav-btn next-month" aria-label="เดือนถัดไป">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div class="calendar-days-header">
              ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">${renderDays(nextYear, nextMonth)}</div>
          </div>
        </div>
        <div class="calendar-actions">
          <button type="button" class="calendar-btn clear">ล้าง</button>
          <button type="button" class="calendar-btn apply">ตกลง</button>
        </div>
      `;

      dropdown.innerHTML = html;

      // Event listeners
      dropdown.querySelector('.prev-month').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        renderCalendar();
      });

      dropdown.querySelector('.next-month').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        renderCalendar();
      });

      dropdown.querySelector('.clear').addEventListener('click', (e) => {
        e.stopPropagation();
        state.startDate = null;
        state.endDate = null;
        input.value = '';
        renderCalendar();
        if (onChange) onChange(null, null);
      });

      dropdown.querySelector('.apply').addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.startDate && state.endDate) {
          updateInputValue();
          closeCalendar();
          if (onChange) onChange(state.startDate, state.endDate);
        } else if (state.startDate) {
          alert('กรุณาเลือกวันที่สิ้นสุด');
        } else {
          closeCalendar();
        }
      });

      // Day click handlers
      dropdown.querySelectorAll('.calendar-day:not(.other-month)').forEach((cell) => {
        cell.addEventListener('click', function (e) {
          e.stopPropagation();
          const dateStr = this.dataset.date;
          if (!dateStr) return;

          const [y, m, d] = dateStr.split('-').map(Number);
          const selectedDate = new Date(y, m, d);

          if (!state.startDate || (state.startDate && state.endDate)) {
            state.startDate = selectedDate;
            state.endDate = null;
            updateInputValue();
            renderCalendar();
          } else {
            if (selectedDate >= state.startDate) {
              state.endDate = selectedDate;
            } else {
              state.endDate = state.startDate;
              state.startDate = selectedDate;
            }
            updateInputValue();
            renderCalendar();
            setTimeout(() => {
              closeCalendar();
              if (onChange) onChange(state.startDate, state.endDate);
            }, 300);
          }
        });

        // Hover effect for range preview
        cell.addEventListener('mouseenter', function () {
          if (state.startDate && !state.endDate) {
            const dateStr = this.dataset.date;
            if (!dateStr) return;

            const [y, m, d] = dateStr.split('-').map(Number);
            const hoverDate = new Date(y, m, d);

            dropdown.querySelectorAll('.calendar-day').forEach((day) => {
              const dayDateStr = day.dataset.date;
              if (!dayDateStr) return;

              const [dy, dm, dd] = dayDateStr.split('-').map(Number);
              const dayDate = new Date(dy, dm, dd);

              if (
                (dayDate > state.startDate && dayDate < hoverDate && hoverDate > state.startDate) ||
                (dayDate < state.startDate && dayDate > hoverDate && hoverDate < state.startDate)
              ) {
                day.classList.add('hover-range');
              } else {
                day.classList.remove('hover-range');
              }
            });
          }
        });
      });

      // Remove hover effect when leaving calendar
      dropdown.addEventListener('mouseleave', function () {
        dropdown.querySelectorAll('.hover-range').forEach((day) => {
          day.classList.remove('hover-range');
        });
      });
    }

    function updateInputValue() {
      if (state.startDate && state.endDate) {
        const start = formatDateToBuddhistEra(state.startDate);
        const end = formatDateToBuddhistEra(state.endDate);
        input.value = `${start} ถึง ${end}`;
      } else if (state.startDate) {
        const start = formatDateToBuddhistEra(state.startDate);
        input.value = `${start} - เลือกวันที่สิ้นสุด`;
      }
    }

    function formatDateToBuddhistEra(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    }

    function renderDays(year, month) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const prevLastDay = new Date(year, month, 0);

      const firstDayOfWeek = firstDay.getDay();
      const lastDate = lastDay.getDate();
      const prevLastDate = prevLastDay.getDate();

      let days = '';

      // Previous month days
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        days += `<div class="calendar-day other-month">${day}</div>`;
      }

      // Current month days
      for (let day = 1; day <= lastDate; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${month}-${day}`;
        const isStart = state.startDate && isSameDay(date, state.startDate);
        const isEnd = state.endDate && isSameDay(date, state.endDate);
        const isInRange = state.startDate && state.endDate && 
                         date > state.startDate && date < state.endDate;
        const isToday = isSameDay(date, new Date());

        let classes = 'calendar-day';
        if (isStart || isEnd) {
          classes += ' selected';
        } else if (isInRange) {
          classes += ' in-range';
        } else if (isToday) {
          classes += ' today';
        }

        days += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
      }

      // Next month days
      const totalCells = firstDayOfWeek + lastDate;
      const remainingCells = 7 - (totalCells % 7);
      if (remainingCells < 7) {
        for (let day = 1; day <= remainingCells; day++) {
          days += `<div class="calendar-day other-month">${day}</div>`;
        }
      }

      return days;
    }

    function isSameDay(date1, date2) {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    }

    // Public API
    const pickerInstance = {
      getStartDate: () => state.startDate,
      getEndDate: () => state.endDate,
      setDates: (startDate, endDate) => {
        state.startDate = startDate;
        state.endDate = endDate;
        updateInputValue();
      },
      clear: () => {
        state.startDate = null;
        state.endDate = null;
        input.value = '';
      },
      close: () => {
        dropdown.style.display = 'none';
        state.isOpen = false;
        input.setAttribute('aria-expanded', 'false');
      }
    };
    
    // Register this picker
    DatePickerComponent._openPickers.push(pickerInstance);
    
    return pickerInstance;
  },

  /**
   * Initialize Single Date Picker
   * @param {Object} options - Configuration options
   * @param {string} options.inputId - ID of input element
   * @param {string} options.dropdownId - ID of dropdown element
   * @param {string} options.wrapperId - ID of wrapper element
   * @param {Function} options.onChange - Callback when date changes
   * @returns {Object} Picker instance with methods
   */
  initSingleDatePicker(options) {
    const { inputId, dropdownId, wrapperId, onChange } = options;
    
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const wrapper = document.getElementById(wrapperId);

    if (!input || !dropdown || !wrapper) {
      console.error('DatePicker: Required elements not found', { inputId, dropdownId, wrapperId });
      return null;
    }

    const state = {
      selectedDate: null,
      currentMonth: new Date(),
      isOpen: false
    };

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // Toggle calendar
    input.addEventListener('click', function (e) {
      e.stopPropagation();
      
      const isVisible = dropdown.style.display === 'block';
      
      // Close all other pickers first (but not this one if it's already open)
      if (!isVisible) {
        DatePickerComponent.closeAllPickers();
        if (typeof SearchableDropdownComponent !== 'undefined') {
          SearchableDropdownComponent.closeAllDropdowns();
        }
      }
      
      dropdown.style.display = isVisible ? 'none' : 'block';
      state.isOpen = !isVisible;
      input.setAttribute('aria-expanded', state.isOpen);
      if (state.isOpen) {
        renderCalendar();
      }
    });

    // Close calendar when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        closeCalendar();
      }
    });

    function closeCalendar() {
      dropdown.style.display = 'none';
      state.isOpen = false;
      input.setAttribute('aria-expanded', 'false');
    }

    function renderCalendar() {
      const year = state.currentMonth.getFullYear();
      const month = state.currentMonth.getMonth();
      const buddhistYear = year + 543;

      let html = `
        <div class="calendar-single">
          <div class="calendar-month">
            <div class="calendar-header">
              <button type="button" class="calendar-nav-btn prev-month" aria-label="เดือนก่อนหน้า">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="calendar-title">${thaiMonths[month]} ${buddhistYear}</div>
              <button type="button" class="calendar-nav-btn next-month" aria-label="เดือนถัดไป">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div class="calendar-days-header">
              ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">${renderDays(year, month)}</div>
          </div>
        </div>
        <div class="calendar-actions">
          <button type="button" class="calendar-btn clear">ล้าง</button>
          <button type="button" class="calendar-btn today">วันนี้</button>
        </div>
      `;

      dropdown.innerHTML = html;

      // Event listeners
      dropdown.querySelector('.prev-month').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        renderCalendar();
      });

      dropdown.querySelector('.next-month').addEventListener('click', (e) => {
        e.stopPropagation();
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        renderCalendar();
      });

      dropdown.querySelector('.clear').addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedDate = null;
        input.value = '';
        renderCalendar();
        if (onChange) onChange(null);
      });

      dropdown.querySelector('.today').addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedDate = new Date();
        state.currentMonth = new Date();
        updateInputValue();
        renderCalendar();
        closeCalendar();
        if (onChange) onChange(state.selectedDate);
      });

      // Day click handlers
      dropdown.querySelectorAll('.calendar-day:not(.other-month)').forEach((cell) => {
        cell.addEventListener('click', function (e) {
          e.stopPropagation();
          const dateStr = this.dataset.date;
          if (!dateStr) return;

          const [y, m, d] = dateStr.split('-').map(Number);
          state.selectedDate = new Date(y, m, d);
          updateInputValue();
          closeCalendar();
          if (onChange) onChange(state.selectedDate);
        });
      });
    }

    function updateInputValue() {
      if (state.selectedDate) {
        input.value = formatDateToBuddhistEra(state.selectedDate);
      }
    }

    function formatDateToBuddhistEra(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    }

    function renderDays(year, month) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const prevLastDay = new Date(year, month, 0);

      const firstDayOfWeek = firstDay.getDay();
      const lastDate = lastDay.getDate();
      const prevLastDate = prevLastDay.getDate();

      let days = '';

      // Previous month days
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        days += `<div class="calendar-day other-month">${day}</div>`;
      }

      // Current month days
      for (let day = 1; day <= lastDate; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${month}-${day}`;
        const isSelected = state.selectedDate && isSameDay(date, state.selectedDate);
        const isToday = isSameDay(date, new Date());

        let classes = 'calendar-day';
        if (isSelected) {
          classes += ' selected';
        } else if (isToday) {
          classes += ' today';
        }

        days += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
      }

      // Next month days
      const totalCells = firstDayOfWeek + lastDate;
      const remainingCells = 7 - (totalCells % 7);
      if (remainingCells < 7) {
        for (let day = 1; day <= remainingCells; day++) {
          days += `<div class="calendar-day other-month">${day}</div>`;
        }
      }

      return days;
    }

    function isSameDay(date1, date2) {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    }

    // Public API
    const pickerInstance = {
      getDate: () => state.selectedDate,
      setDate: (date) => {
        state.selectedDate = date;
        updateInputValue();
      },
      clear: () => {
        state.selectedDate = null;
        input.value = '';
      },
      close: closeCalendar
    };
    
    // Register this picker
    DatePickerComponent._openPickers.push(pickerInstance);
    
    return pickerInstance;
  },

  /**
   * Format date to API format (YYYY-MM-DD)
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDateToAPI(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse API date format (YYYY-MM-DD) to Date object
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Date} Date object
   */
  parseAPIDate(dateStr) {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DatePickerComponent;
}
