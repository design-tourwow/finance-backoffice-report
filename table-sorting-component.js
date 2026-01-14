/**
 * Table Sorting Component
 * Adds sortable columns to tables with A-Z, Z-A functionality
 */

const TableSortingComponent = {
  /**
   * Initialize sortable table
   * @param {Object} options - Configuration options
   * @param {string} options.tableId - ID of table element
   * @param {Array} options.columns - Array of column configs [{key, label, type, sortable}]
   * @param {Array} options.data - Array of data objects
   * @param {Function} options.onSort - Callback when data is sorted
   * @returns {Object} Table instance with methods
   */
  initSortableTable(options) {
    const { tableId, columns, data, onSort } = options;
    
    const table = document.getElementById(tableId);
    if (!table) {
      console.error('TableSorting: Table not found', tableId);
      return null;
    }

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody) {
      console.error('TableSorting: thead or tbody not found');
      return null;
    }

    const state = {
      data: [...data],
      sortColumn: null,
      sortDirection: null, // 'asc' or 'desc'
      columns: columns
    };

    function renderHeaders() {
      thead.innerHTML = '';
      const headerRow = document.createElement('tr');
      
      columns.forEach((column, index) => {
        const th = document.createElement('th');
        th.className = 'sortable-header';
        
        if (column.sortable !== false) {
          th.classList.add('sortable');
          th.setAttribute('data-column', index);
          th.setAttribute('role', 'button');
          th.setAttribute('tabindex', '0');
          
          const headerContent = document.createElement('div');
          headerContent.className = 'header-content';
          
          const label = document.createElement('span');
          label.textContent = column.label;
          headerContent.appendChild(label);
          
          const sortIcon = document.createElement('span');
          sortIcon.className = 'sort-icon';
          sortIcon.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path class="sort-default" d="M7 15l5 5 5-5M7 9l5-5 5 5" opacity="0.3"/>
              <path class="sort-asc-arrow" d="M7 9l5-5 5 5" opacity="0" stroke="#4a7ba7"/>
              <path class="sort-desc-arrow" d="M7 15l5 5 5-5" opacity="0" stroke="#4a7ba7"/>
            </svg>
            <span class="sort-label"></span>
          `;
          headerContent.appendChild(sortIcon);
          
          // Update sort label
          const sortLabel = sortIcon.querySelector('.sort-label');
          if (state.sortColumn === index) {
            if (state.sortDirection === 'asc') {
              const topChar = column.type === 'number' || column.type === 'currency' ? '1' : 'A';
              const bottomChar = column.type === 'number' || column.type === 'currency' ? '9' : 'Z';
              sortLabel.innerHTML = `<span class="sort-top">${topChar}</span><span class="sort-bottom">${bottomChar}</span>`;
            } else if (state.sortDirection === 'desc') {
              const topChar = column.type === 'number' || column.type === 'currency' ? '9' : 'Z';
              const bottomChar = column.type === 'number' || column.type === 'currency' ? '1' : 'A';
              sortLabel.innerHTML = `<span class="sort-top">${topChar}</span><span class="sort-bottom">${bottomChar}</span>`;
            }
          }
          
          th.appendChild(headerContent);
          
          // Update active state
          if (state.sortColumn === index) {
            th.classList.add('sorted');
            th.classList.add(state.sortDirection);
          }
          
          // Click handler
          th.addEventListener('click', () => sortByColumn(index));
          
          // Keyboard support
          th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              sortByColumn(index);
            }
          });
        } else {
          th.textContent = column.label;
        }
        
        // Add alignment class
        if (column.align) {
          th.classList.add(`align-${column.align}`);
        }
        
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
    }

    function renderRows() {
      tbody.innerHTML = '';
      
      state.data.forEach((row) => {
        const tr = document.createElement('tr');
        
        columns.forEach((column) => {
          const td = document.createElement('td');
          const value = row[column.key];
          
          // Format value based on type
          if (column.type === 'currency') {
            td.textContent = formatCurrency(value);
            td.classList.add('currency');
          } else if (column.type === 'number') {
            td.textContent = formatNumber(value);
            td.classList.add('number');
          } else {
            td.textContent = value || '-';
          }
          
          // Add alignment class
          if (column.align) {
            td.classList.add(`align-${column.align}`);
          }
          
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
    }

    function sortByColumn(columnIndex) {
      const column = columns[columnIndex];
      
      // Toggle sort direction
      if (state.sortColumn === columnIndex) {
        if (state.sortDirection === 'asc') {
          state.sortDirection = 'desc';
        } else if (state.sortDirection === 'desc') {
          // Reset to default
          state.sortColumn = null;
          state.sortDirection = null;
          state.data = [...data]; // Reset to original order
        }
      } else {
        state.sortColumn = columnIndex;
        state.sortDirection = 'asc';
      }
      
      // Sort data if direction is set
      if (state.sortDirection) {
        state.data.sort((a, b) => {
          let aVal = a[column.key];
          let bVal = b[column.key];
          
          // Handle null/undefined
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          
          // Convert to numbers for numeric columns
          if (column.type === 'number' || column.type === 'currency') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          } else {
            // String comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
          }
          
          let comparison = 0;
          if (aVal > bVal) comparison = 1;
          if (aVal < bVal) comparison = -1;
          
          return state.sortDirection === 'asc' ? comparison : -comparison;
        });
      }
      
      renderHeaders();
      renderRows();
      
      if (onSort) {
        onSort(state.data, state.sortColumn, state.sortDirection);
      }
    }

    function formatNumber(num) {
      if (num === null || num === undefined) return '-';
      return new Intl.NumberFormat('th-TH').format(num);
    }

    function formatCurrency(num) {
      if (num === null || num === undefined) return '-';
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
    }

    // Initial render
    renderHeaders();
    renderRows();

    // Public API
    return {
      updateData: (newData) => {
        state.data = [...newData];
        state.sortColumn = null;
        state.sortDirection = null;
        renderHeaders();
        renderRows();
      },
      getSortState: () => ({
        column: state.sortColumn,
        direction: state.sortDirection
      }),
      refresh: () => {
        renderHeaders();
        renderRows();
      }
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TableSortingComponent;
}
