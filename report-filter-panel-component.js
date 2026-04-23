// report-filter-panel-component.js
// The canonical report filter-panel: mode + period + country + team +
// jobPosition + user, with cascade (team → jobPosition → user).
// Composes FilterSortDropdown + FilterSearchDropdown + filter-panel.css.
//
// Used by supplier-commission, discount-sales, order-external-summary,
// request-discount. Replaces the legacy shared-filter-panel.js (which
// rendered native <select> elements).
//
// Exposes window.ReportFilterPanel (IIFE).
//
// Usage:
//   ReportFilterPanel.init({
//     containerId: 'xx-filter-area',
//     state      : filterState,          // mutated on change / apply
//     options    : filterOptions,        // { countries, teams, jobPositions, users, availablePeriods }
//     prefix     : 'xx',                 // used for dropdown sub-container IDs
//     onApply    : function (state) {},  // called when "ค้นหา" is clicked
//   });

(function () {
  'use strict';

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Icons (SVG) ──────────────────────────────────────────────────────────
  var ICONS = {
    calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    all     : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
    globe   : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    team    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    role    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    person  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    search  : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    reset   : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>'
  };

  function findActive(opts) {
    for (var i = 0; i < opts.length; i++) if (opts[i].active) return opts[i];
    return null;
  }

  function userDisplayName(u) {
    if (!u) return '';
    if (u.nickname) return u.nickname;
    var first = u.first_name || '';
    var last  = u.last_name || '';
    var full  = (first + ' ' + last).trim();
    return full || ('User ' + (u.ID != null ? u.ID : ''));
  }

  // Period helpers (buildYearOptionsFromPeriods, buildQuarterOptionsFromPeriods,
  // buildMonthYearOptionsFromPeriods, applyActiveOption) moved into
  // shared-period-selector.js. This file keeps only helpers used by
  // country/team/jobpos/user dropdowns.

  function init(cfg) {
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[ReportFilterPanel] container not found:', cfg.containerId);
      return null;
    }

    var state   = cfg.state || {};
    var options = cfg.options || {};
    var prefix  = cfg.prefix || 'rfp';
    var layout  = cfg.layout || 'stacked';
    var onApply = typeof cfg.onApply === 'function' ? cfg.onApply : function () {};
    var utils   = window.SharedUtils;

    // Defaults so partial state objects still render.
    if (state.mode == null)    state.mode    = 'monthly';
    if (state.year == null)    state.year    = utils.getCurrentYear();
    if (state.quarter == null) state.quarter = utils.getCurrentQuarter();
    if (state.month == null)   state.month   = new Date().getMonth() + 1;

    var ids = {
      mode    : prefix + '-dd-mode',
      period  : prefix + '-period-controls',
      periodL : prefix + '-period-label',
      quarter : prefix + '-dd-quarter',
      month   : prefix + '-dd-month',
      year    : prefix + '-dd-year',
      country : prefix + '-dd-country',
      team    : prefix + '-dd-team',
      jobpos  : prefix + '-dd-jobpos',
      user    : prefix + '-dd-user',
      apply   : prefix + '-btn-apply',
      reset   : prefix + '-btn-reset',
      actions : prefix + '-filter-actions-host'
    };

    container.innerHTML = layout === 'paired-grid'
      ? renderPairedGridLayout(ids)
      : renderStackedLayout(ids);

    initPeriodSelector();
    initCountryDropdown();
    initTeamDropdown();
    initJobPosDropdown();
    initUserDropdown();

    // Action buttons — delegate to the shared SharedFilterActions component
    // if loaded; fall back to direct button wiring for legacy pages that
    // haven't added the <script> tag yet.
    function onSearchClick() { onApply(state); }
    function onResetClick() {
      state.mode         = 'monthly';
      state.year         = utils.getCurrentYear();
      state.quarter      = utils.getCurrentQuarter();
      state.month        = new Date().getMonth() + 1;
      state.country_id   = null;
      state.team_number  = null;
      state.job_position = null;
      state.user_id      = null;
      init(cfg);
      onApply(state);
    }

    if (window.SharedFilterActions && document.getElementById(ids.actions)) {
      window.SharedFilterActions.mount({
        containerId: ids.actions,
        searchId   : ids.apply,
        resetId    : ids.reset,
        onSearch   : onSearchClick,
        onReset    : onResetClick
      });
    } else {
      var applyBtn = document.getElementById(ids.apply);
      var resetBtn = document.getElementById(ids.reset);
      if (applyBtn) applyBtn.addEventListener('click', onSearchClick);
      if (resetBtn) resetBtn.addEventListener('click', onResetClick);
    }

    // ── Dropdown initializers ──────────────────────────────────────────────

    // Period selector (mode + value) — delegates to SharedPeriodSelector so
    // every page gets the same dropdown look, and the only mode/year/quarter/
    // month logic lives in one place. The period-label toggling (hidden when
    // mode === 'all') is still handled here because the label element is
    // owned by this panel's layout.
    function initPeriodSelector() {
      var label = document.getElementById(ids.periodL);
      var host  = document.getElementById(ids.period);

      if (!window.SharedPeriodSelector || !window.SharedPeriodSelector.mount) {
        console.error('[ReportFilterPanel] SharedPeriodSelector missing — load shared-period-selector.js');
        return;
      }

      function applyLabelVisibility() {
        if (!label || !host) return;
        var hidden = state.mode === 'all';
        label.style.display = hidden ? 'none' : '';
      }

      applyLabelVisibility();

      window.SharedPeriodSelector.mount({
        modeContainerId : ids.mode,
        valueContainerId: ids.period,
        availablePeriods: options.availablePeriods || { years: [] },
        multiSelect     : false,
        modes           : ['all', 'quarterly', 'monthly', 'yearly'],
        initialState    : {
          mode   : state.mode,
          year   : state.year,
          quarter: state.quarter,
          month  : state.month
        },
        onChange        : function (s) {
          state.mode    = s.mode;
          state.year    = s.year;
          state.quarter = s.quarter;
          state.month   = s.month;
          applyLabelVisibility();
        }
      });
    }

    function initCountryDropdown() {
      var countries = (options.countries || []).slice();
      if (utils.sortCountriesByThai) {
        try { countries = utils.sortCountriesByThai(countries); } catch (e) { /* noop */ }
      }
      var flags = window.CountryFlags;
      // Normalise state.country_id: null / scalar / csv string / number[]
      // → a Set of id strings for active-option marking.
      var activeSet = {};
      if (state.country_id != null && state.country_id !== '') {
        var selectedIds = Array.isArray(state.country_id)
          ? state.country_id
          : String(state.country_id).split(',');
        selectedIds.forEach(function (id) {
          var s = String(id).trim();
          if (s) activeSet[s] = true;
        });
      }
      var opts = countries.map(function (c) {
        return {
          value : String(c.id),
          label : c.name_th || c.name_en || ('#' + c.id),
          icon  : flags ? flags.iconFor(c, { size: 18 }) : '',
          active: !!activeSet[String(c.id)]
        };
      });
      window.FilterSearchDropdown.init({
        containerId : ids.country,
        defaultLabel: 'ทุกประเทศ',
        defaultIcon : ICONS.globe,
        options     : opts,
        placeholder : 'ค้นหาประเทศ...',
        multiSelect : true,
        groupLabel  : 'ประเทศ',
        onChange    : function (csvValue) {
          state.country_id = csvValue || null;
        }
      });
    }

    function initTeamDropdown() {
      var opts = [{ value: '', label: 'ทุกทีม', icon: ICONS.team, active: state.team_number == null }]
        .concat((options.teams || []).map(function (t) {
          return {
            value : String(t.team_number),
            label : 'Team ' + t.team_number,
            icon  : ICONS.team,
            active: state.team_number != null && Number(t.team_number) === Number(state.team_number)
          };
        }));
      var current = findActive(opts) || opts[0];
      window.FilterSortDropdownComponent.initDropdown({
        containerId : ids.team,
        defaultLabel: current.label,
        defaultIcon : current.icon,
        options     : opts,
        onChange    : function (val) {
          state.team_number  = val ? parseInt(val, 10) : null;
          state.job_position = null;
          state.user_id      = null;
          initJobPosDropdown();
          initUserDropdown();
        }
      });
    }

    function initJobPosDropdown() {
      var raw = options.jobPositions || [];
      var jobs = utils.filterAndDisplayJobPositions
        ? utils.filterAndDisplayJobPositions(raw, state.team_number || undefined)
        : raw;
      var opts = [{ value: '', label: 'ทุกตำแหน่ง', icon: ICONS.role, active: state.job_position == null }]
        .concat(jobs.map(function (p) {
          return {
            value : String(p.job_position),
            label : p.display_name || p.job_position,
            icon  : ICONS.role,
            active: state.job_position != null &&
                    String(state.job_position).toLowerCase() === String(p.job_position).toLowerCase()
          };
        }));
      var current = findActive(opts) || opts[0];
      window.FilterSortDropdownComponent.initDropdown({
        containerId : ids.jobpos,
        defaultLabel: current.label,
        defaultIcon : current.icon,
        options     : opts,
        onChange    : function (val) {
          state.job_position = val || null;
          state.user_id      = null;
          initUserDropdown();
        }
      });
    }

    function initUserDropdown() {
      var all = options.users || [];
      var filtered = all.filter(function (u) {
        if (state.team_number && u.team_number !== state.team_number) return false;
        if (state.job_position && (!u.job_position ||
            u.job_position.toLowerCase() !== String(state.job_position).toLowerCase())) return false;
        return true;
      });
      var opts = [{ value: '', label: 'ทุกคน', icon: ICONS.person, active: state.user_id == null }]
        .concat(filtered.map(function (u) {
          return {
            value : String(u.ID),
            label : userDisplayName(u),
            icon  : ICONS.person,
            active: state.user_id != null && Number(u.ID) === Number(state.user_id)
          };
        }));
      var current = findActive(opts) || opts[0];
      window.FilterSearchDropdown.init({
        containerId : ids.user,
        defaultLabel: current.label,
        defaultIcon : current.icon,
        options     : opts,
        placeholder : 'ค้นหาผู้ใช้...',
        onChange    : function (val) {
          state.user_id = val ? parseInt(val, 10) : null;
        }
      });
    }

    return {
      state: state,
      destroy: function () { container.innerHTML = ''; }
    };
  }

  function renderStackedLayout(ids) {
    return '' +
      '<div class="filter-wrap filter-wrap-stacked">' +
        '<div class="filter-row">' +
          '<span class="filter-label">รูปแบบ</span>' +
          '<div id="' + ids.mode + '"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label" id="' + ids.periodL + '">ช่วงเวลา</span>' +
          '<div class="filter-period-controls" id="' + ids.period + '"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ประเทศ</span>' +
          '<div id="' + ids.country + '"></div>' +
        '</div>' +
        '<div class="filter-row-divider"></div>' +
        '<div class="filter-row">' +
          '<span class="filter-label">ทีม</span>' +
          '<div id="' + ids.team + '"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ตำแหน่ง</span>' +
          '<div id="' + ids.jobpos + '"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ผู้ใช้</span>' +
          '<div id="' + ids.user + '"></div>' +
          '<div id="' + ids.actions + '"></div>' +
        '</div>' +
      '</div>';
  }

  function renderPairedGridLayout(ids) {
    return '' +
      '<div class="filter-wrap filter-wrap-stacked filter-wrap-paired-grid">' +
        '<div class="filter-grid-main">' +
          renderField('รูปแบบ', '<div id="' + ids.mode + '"></div>') +
          renderField('ช่วงเวลา', '<div class="filter-period-controls" id="' + ids.period + '"></div>', ids.periodL, 'filter-field-period') +
          renderField('ประเทศ', '<div id="' + ids.country + '"></div>') +
          renderField('ทีม', '<div id="' + ids.team + '"></div>') +
          renderField('ตำแหน่ง', '<div id="' + ids.jobpos + '"></div>') +
          renderField('ผู้ใช้', '<div id="' + ids.user + '"></div>') +
        '</div>' +
        '<div class="filter-actions" id="' + ids.actions + '"></div>' +
      '</div>';
  }

  function renderField(labelText, controlHtml, labelId, extraClass) {
    return '' +
      '<div class="filter-field' + (extraClass ? ' ' + extraClass : '') + '">' +
        '<span class="filter-label"' + (labelId ? ' id="' + labelId + '"' : '') + '>' + labelText + '</span>' +
        controlHtml +
      '</div>';
  }

  window.ReportFilterPanel = { init: init };

})();
