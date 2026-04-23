// shared-period-selector.js — Central period (ทั้งหมด / รายปี / รายไตรมาส / รายเดือน)
// picker built on top of the existing dropdown components so visual style
// matches every other dropdown in the report pages.
//
// Composition:
//   mode dropdown   → FilterSortDropdownComponent (single-select)
//   value dropdown  →
//     multiSelect: false → FilterSortDropdownComponent (single-select)
//     multiSelect: true  → FilterSearchDropdown (checkbox list + confirm)
//
// Exposes window.SharedPeriodSelector.
//
// API:
//   var instance = window.SharedPeriodSelector.mount({
//     modeContainerId : 'host-for-mode-dropdown',
//     valueContainerId: 'host-for-value-dropdown',
//     availablePeriods: { years: [...] },   // shape produced by backend getAvailablePeriods
//     multiSelect     : false,               // default false — single value per mode
//     modes           : ['all','yearly','quarterly','monthly'],  // default all four
//     initialState    : { mode, year, quarter, month, periods },
//     onChange        : function (state) {}  // fired on every change
//   });
//
//   instance.getState();
//   instance.destroy();
//
// State shape emitted:
//   single: { mode, year, quarter, month }
//   multi : { mode, periods: [{year, quarter, month}, ...] }

(function () {
  'use strict';

  // ── Icons (SVG) ───────────────────────────────────────────────────────────
  var ICON_ALL      = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
  var ICON_CALENDAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  var MODE_LABELS = {
    all      : 'ทั้งหมด',
    yearly   : 'รายปี',
    quarterly: 'รายไตรมาส',
    monthly  : 'รายเดือน'
  };

  // ── Utility ───────────────────────────────────────────────────────────────
  function utils() {
    return (window.SharedUtils && window.SharedUtils) || null;
  }

  function getPeriodYears(periods) {
    return (periods && Array.isArray(periods.years)) ? periods.years : [];
  }

  function getCurrentYear() {
    var u = utils();
    return u && u.getCurrentYear ? u.getCurrentYear() : new Date().getFullYear();
  }

  function getCurrentQuarter() {
    var u = utils();
    return u && u.getCurrentQuarter ? u.getCurrentQuarter() : Math.ceil((new Date().getMonth() + 1) / 3);
  }

  function getCurrentMonth() {
    return new Date().getMonth() + 1;
  }

  // ── Option builders (shaped for dropdown components) ──────────────────────
  function buildYearOptions(periods) {
    var years = getPeriodYears(periods);
    if (!years.length) {
      var fallback = utils() && utils().getYearOptions ? utils().getYearOptions() : [];
      return fallback.map(function (y) {
        var val = (y && typeof y === 'object') ? y.value : y;
        var lbl = (y && typeof y === 'object') ? (y.label || String(y.value)) : String(y);
        return { value: String(val), label: lbl };
      });
    }
    return years.map(function (entry) {
      var label = entry.label != null && entry.label !== ''
        ? ('พ.ศ. ' + entry.label + ' (' + entry.year_ce + ')')
        : String(entry.year_ce);
      return { value: String(entry.year_ce), label: label };
    });
  }

  function buildQuarterOptions(periods) {
    var years = getPeriodYears(periods);
    if (!years.length) {
      var fallback = utils() && utils().getQuarterOptions ? utils().getQuarterOptions() : [];
      return fallback.map(function (q) {
        return {
          value: q.year + '-' + q.quarter,
          label: q.label,
          year: Number(q.year),
          quarter: Number(q.quarter)
        };
      });
    }
    var out = [];
    years.forEach(function (entry) {
      (entry.quarters || []).forEach(function (qt) {
        out.push({
          value: entry.year_ce + '-' + qt.quarter,
          label: (qt.label || ('Q' + qt.quarter)) + ' พ.ศ. ' + (entry.label || entry.year_ce),
          year: Number(entry.year_ce),
          quarter: Number(qt.quarter)
        });
      });
    });
    return out;
  }

  function buildMonthOptions(periods) {
    var years = getPeriodYears(periods);
    if (!years.length) {
      var fallback = utils() && utils().getMonthOptions ? utils().getMonthOptions() : [];
      var cy = getCurrentYear();
      return fallback.map(function (m) {
        return {
          value: cy + '-' + m.value,
          label: m.label + ' ' + cy,
          year: cy,
          month: Number(m.value)
        };
      });
    }
    var out = [];
    years.forEach(function (entry) {
      (entry.months || []).forEach(function (mm) {
        out.push({
          value: entry.year_ce + '-' + mm.month,
          label: (mm.label || ('Month ' + mm.month)) + ' พ.ศ. ' + (entry.label || entry.year_ce),
          year: Number(entry.year_ce),
          month: Number(mm.month)
        });
      });
    });
    return out;
  }

  // ── Mount ─────────────────────────────────────────────────────────────────
  function mount(config) {
    config = config || {};
    var modeHost  = document.getElementById(config.modeContainerId);
    var valueHost = document.getElementById(config.valueContainerId);
    if (!modeHost) {
      console.error('[SharedPeriodSelector] mode container not found:', config.modeContainerId);
      return null;
    }
    if (!valueHost) {
      console.error('[SharedPeriodSelector] value container not found:', config.valueContainerId);
      return null;
    }

    var multiSelect     = !!config.multiSelect;
    var allowedModes    = config.modes || ['all', 'yearly', 'quarterly', 'monthly'];
    var onChange        = typeof config.onChange === 'function' ? config.onChange : function () {};
    var availablePeriods = config.availablePeriods || { years: [] };
    var initial         = config.initialState || {};

    var state = {
      mode   : allowedModes.indexOf(initial.mode) >= 0 ? initial.mode : allowedModes[0],
      year   : initial.year    != null ? Number(initial.year)    : getCurrentYear(),
      quarter: initial.quarter != null ? Number(initial.quarter) : getCurrentQuarter(),
      month  : initial.month   != null ? Number(initial.month)   : getCurrentMonth(),
      periods: Array.isArray(initial.periods) ? initial.periods.slice() : []
    };

    function emit() {
      if (multiSelect) {
        onChange({ mode: state.mode, periods: state.periods.slice() });
      } else {
        onChange({ mode: state.mode, year: state.year, quarter: state.quarter, month: state.month });
      }
    }

    // ── Mode dropdown ────────────────────────────────────────────────────
    function renderModeDropdown() {
      var opts = allowedModes.map(function (m) {
        return {
          value : m,
          label : MODE_LABELS[m] || m,
          icon  : m === 'all' ? ICON_ALL : ICON_CALENDAR,
          active: m === state.mode
        };
      });
      var active = opts.filter(function (o) { return o.active; })[0] || opts[0];

      if (!window.FilterSortDropdownComponent || !window.FilterSortDropdownComponent.initDropdown) {
        console.error('[SharedPeriodSelector] FilterSortDropdownComponent missing');
        return;
      }
      window.FilterSortDropdownComponent.initDropdown({
        containerId : config.modeContainerId,
        defaultLabel: active.label,
        defaultIcon : active.icon,
        options     : opts,
        onChange    : function (val) {
          state.mode = val;
          // Reset inner selections to sensible defaults when switching mode
          if (multiSelect) {
            state.periods = [];
          } else {
            state.year    = getCurrentYear();
            state.quarter = getCurrentQuarter();
            state.month   = getCurrentMonth();
          }
          renderValueDropdown();
          emit();
        }
      });
    }

    // ── Value dropdown (depends on mode + multiSelect flag) ──────────────
    function renderValueDropdown() {
      valueHost.innerHTML = '';

      if (state.mode === 'all') {
        valueHost.style.display = 'none';
        return;
      }
      valueHost.style.display = '';

      var options;
      if      (state.mode === 'yearly')    options = buildYearOptions(availablePeriods);
      else if (state.mode === 'quarterly') options = buildQuarterOptions(availablePeriods);
      else                                  options = buildMonthOptions(availablePeriods);

      var placeholder;
      if      (state.mode === 'yearly')    placeholder = 'เลือกปี';
      else if (state.mode === 'quarterly') placeholder = 'เลือกไตรมาส';
      else                                  placeholder = 'เลือกเดือน';

      if (multiSelect) {
        if (!window.FilterSearchDropdown || !window.FilterSearchDropdown.init) {
          console.error('[SharedPeriodSelector] FilterSearchDropdown missing (needed for multiSelect)');
          return;
        }
        var activeValues = state.periods.map(valueOfPeriod);
        var opts = options.map(function (o) {
          return {
            value : o.value,
            label : o.label,
            icon  : ICON_CALENDAR,
            active: activeValues.indexOf(o.value) >= 0,
            year  : o.year,
            quarter: o.quarter,
            month : o.month
          };
        });

        window.FilterSearchDropdown.init({
          containerId : config.valueContainerId,
          defaultLabel: placeholder,
          defaultIcon : ICON_CALENDAR,
          options     : opts,
          multiSelect : true,
          groupLabel  : MODE_LABELS[state.mode] || '',
          placeholder : 'ค้นหา' + placeholder.replace('เลือก', '') + '...',
          onChange    : function (_csv, values) {
            var selected = opts.filter(function (o) { return (values || []).indexOf(o.value) >= 0; });
            state.periods = selected.map(function (o) {
              return {
                type   : state.mode,
                year   : o.year,
                quarter: o.quarter,
                month  : o.month,
                label  : o.label
              };
            });
            emit();
          }
        });
      } else {
        // Single-select value dropdown
        var activeVal = valueFromState(state);
        var opts2 = options.map(function (o) {
          return {
            value : o.value,
            label : o.label,
            icon  : ICON_CALENDAR,
            active: o.value === activeVal,
            year  : o.year,
            quarter: o.quarter,
            month : o.month
          };
        });
        var active = opts2.filter(function (o) { return o.active; })[0] || opts2[0];

        window.FilterSortDropdownComponent.initDropdown({
          containerId : config.valueContainerId,
          defaultLabel: active ? active.label : placeholder,
          defaultIcon : ICON_CALENDAR,
          options     : opts2,
          onChange    : function (val) {
            var picked = opts2.filter(function (o) { return o.value === val; })[0];
            if (!picked) return;
            if (state.mode === 'yearly')    { state.year = picked.year; }
            if (state.mode === 'quarterly') { state.year = picked.year; state.quarter = picked.quarter; }
            if (state.mode === 'monthly')   { state.year = picked.year; state.month   = picked.month; }
            emit();
          }
        });
      }
    }

    function valueOfPeriod(p) {
      if (p.type === 'yearly')    return String(p.year);
      if (p.type === 'quarterly') return p.year + '-' + p.quarter;
      if (p.type === 'monthly')   return p.year + '-' + p.month;
      return '';
    }

    function valueFromState(s) {
      if (s.mode === 'yearly')    return String(s.year);
      if (s.mode === 'quarterly') return s.year + '-' + s.quarter;
      if (s.mode === 'monthly')   return s.year + '-' + s.month;
      return '';
    }

    renderModeDropdown();
    renderValueDropdown();

    return {
      getState: function () {
        return multiSelect
          ? { mode: state.mode, periods: state.periods.slice() }
          : { mode: state.mode, year: state.year, quarter: state.quarter, month: state.month };
      },
      destroy: function () {
        try { modeHost.innerHTML = ''; } catch (e) {}
        try { valueHost.innerHTML = ''; } catch (e) {}
      }
    };
  }

  // ── Date-range helper: converts state → {dateFrom, dateTo} ───────────────
  // Used by sales-by-country / wholesale-destinations which send date ranges
  // to the API rather than (year, quarter, month) triples.
  function toDateRange(state, availablePeriods) {
    if (!state) return { dateFrom: '', dateTo: '' };
    if (state.mode === 'all') {
      // Whole span of availablePeriods
      var years = getPeriodYears(availablePeriods);
      if (!years.length) return { dateFrom: '', dateTo: '' };
      var earliest = years[years.length - 1];
      var latest = years[0];
      return {
        dateFrom: earliest.year_ce + '-01-01',
        dateTo  : latest.year_ce   + '-12-31'
      };
    }
    // Multi: convert list of period objects → min(start) / max(end)
    if (state.periods) {
      if (!state.periods.length) return { dateFrom: '', dateTo: '' };
      var ranges = state.periods.map(function (p) { return periodToRange(p.type, p.year, p.quarter, p.month); });
      var fromList = ranges.map(function (r) { return r.dateFrom; }).sort();
      var toList   = ranges.map(function (r) { return r.dateTo;   }).sort();
      return { dateFrom: fromList[0], dateTo: toList[toList.length - 1] };
    }
    // Single
    return periodToRange(state.mode, state.year, state.quarter, state.month);
  }

  function periodToRange(mode, year, quarter, month) {
    function pad(n) { return String(n).padStart(2, '0'); }
    if (mode === 'yearly') {
      return { dateFrom: year + '-01-01', dateTo: year + '-12-31' };
    }
    if (mode === 'quarterly') {
      var q = Number(quarter);
      var startMonth = (q - 1) * 3 + 1;
      var endMonth   = startMonth + 2;
      var endDay     = new Date(year, endMonth, 0).getDate();
      return { dateFrom: year + '-' + pad(startMonth) + '-01', dateTo: year + '-' + pad(endMonth) + '-' + pad(endDay) };
    }
    if (mode === 'monthly') {
      var m = Number(month);
      var lastDay = new Date(year, m, 0).getDate();
      return { dateFrom: year + '-' + pad(m) + '-01', dateTo: year + '-' + pad(m) + '-' + pad(lastDay) };
    }
    return { dateFrom: '', dateTo: '' };
  }

  window.SharedPeriodSelector = {
    mount      : mount,
    toDateRange: toDateRange,
    MODE_LABELS: MODE_LABELS
  };

})();
