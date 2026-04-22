// shared-filter-panel.js — Shared cascading filter-panel renderer.
// Dropdown cascade logic: team → jobPos → user (shared by all 4 report pages).
//
// Cascade rules (matching existing pages):
//   - Changing "team" clears jobPosition and user, and filters the user list.
//   - Changing "jobPosition" clears user, and filters the user list.
//   - Changing "country" / "year" / "quarter" / "month" / "mode" does not cascade.
//
// Exposes window.SharedFilterPanel (IIFE).

(function () {
  'use strict';

  var DEFAULT_LABELS = {
    title        : 'ตัวกรอง',
    mode         : 'รูปแบบรายงาน',
    modeAll      : 'ทั้งหมด',
    modeQuarter  : 'รายไตรมาส',
    modeMonth    : 'รายเดือน',
    modeYear     : 'รายปี',
    quarter      : 'ไตรมาส',
    month        : 'เดือน',
    year         : 'ปี',
    country      : 'ประเทศ',
    team         : 'ทีม',
    jobPosition  : 'ตำแหน่งงาน',
    user         : 'ผู้ใช้',
    anyCountry   : 'ทุกประเทศ',
    anyTeam      : 'ทุกทีม',
    anyJobPos    : 'ทุกตำแหน่ง',
    anyUser      : 'ทุกคน',
    apply        : 'แสดงผล'
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isEl(el) {
    return el && typeof el === 'object' && typeof el.appendChild === 'function';
  }

  function getLabels(user) {
    return Object.assign({}, DEFAULT_LABELS, (user && typeof user === 'object') ? user : {});
  }

  function buildOptions(items, valueKey, labelKey, selectedValue) {
    if (!Array.isArray(items)) return '';
    return items.map(function (item) {
      if (item == null) return '';
      var v = item[valueKey];
      var l = item[labelKey];
      var sel = (selectedValue != null && String(selectedValue) === String(v)) ? ' selected' : '';
      return '<option value="' + escapeHtml(v) + '"' + sel + '>' + escapeHtml(l) + '</option>';
    }).join('');
  }

  // Compute default/derived values so render() is tolerant of partial state objects.
  function normalizeState(state) {
    state = state || {};
    var currentYear    = (window.SharedUtils && window.SharedUtils.getCurrentYear)    ? window.SharedUtils.getCurrentYear()    : new Date().getFullYear();
    var currentQuarter = (window.SharedUtils && window.SharedUtils.getCurrentQuarter) ? window.SharedUtils.getCurrentQuarter() : Math.ceil((new Date().getMonth() + 1) / 3);

    return {
      mode         : state.mode || 'quarterly',
      year         : state.year != null ? state.year : currentYear,
      quarter      : state.quarter != null ? state.quarter : currentQuarter,
      month        : state.month != null ? state.month : (new Date().getMonth() + 1),
      country_id   : state.country_id != null ? state.country_id : null,
      team_number  : state.team_number != null ? state.team_number : null,
      job_position : state.job_position != null ? state.job_position : null,
      user_id      : state.user_id != null ? state.user_id : null
    };
  }

  // Filter users client-side per team+jobPos — same logic as the 4 pages.
  function filterUsers(allUsers, teamNumber, jobPosition) {
    if (!Array.isArray(allUsers)) return [];
    return allUsers.filter(function (u) {
      if (teamNumber && u.team_number !== teamNumber) return false;
      if (jobPosition && (!u.job_position ||
          u.job_position.toLowerCase() !== String(jobPosition).toLowerCase())) return false;
      return true;
    });
  }

  function userDisplayName(u) {
    if (!u) return '';
    if (u.nickname) return u.nickname;
    var first = u.first_name || '';
    var last  = u.last_name || '';
    var full  = (first + ' ' + last).trim();
    return full || ('User ' + (u.ID != null ? u.ID : ''));
  }

  function render(cfg) {
    cfg = cfg || {};
    if (!isEl(cfg.containerEl)) {
      console.warn('[SharedFilterPanel] render: invalid containerEl');
      return;
    }

    var labels  = getLabels(cfg.labels);
    var state   = normalizeState(cfg.state);
    var options = cfg.options || {};
    var onChange = typeof cfg.onChange === 'function' ? cfg.onChange : null;
    var onApply  = typeof cfg.onApply  === 'function' ? cfg.onApply  : null;

    // ── Build dropdown options HTML ──────────────────────────────────────────

    // Sort countries by Thai name if helper available
    var countries = Array.isArray(options.countries) ? options.countries.slice() : [];
    if (window.SharedUtils && typeof window.SharedUtils.sortCountriesByThai === 'function' && countries.length > 0) {
      try { countries = window.SharedUtils.sortCountriesByThai(countries); }
      catch (e) { /* ignore sort failure, keep unsorted */ }
    }
    var countryOpts = '<option value="">' + escapeHtml(labels.anyCountry) + '</option>' +
      countries.map(function (c) {
        if (!c) return '';
        var sel = (state.country_id != null && Number(state.country_id) === Number(c.id)) ? ' selected' : '';
        return '<option value="' + escapeHtml(c.id) + '"' + sel + '>' + escapeHtml(c.name_th || c.name_en || ('#' + c.id)) + '</option>';
      }).join('');

    var teams = Array.isArray(options.teams) ? options.teams : [];
    var teamOpts = '<option value="">' + escapeHtml(labels.anyTeam) + '</option>' +
      teams.map(function (t) {
        if (!t) return '';
        var sel = (state.team_number != null && Number(state.team_number) === Number(t.team_number)) ? ' selected' : '';
        return '<option value="' + escapeHtml(t.team_number) + '"' + sel + '>Team ' + escapeHtml(t.team_number) + '</option>';
      }).join('');

    // Filter & display-label job positions using the shared helper if available.
    var rawJobs = Array.isArray(options.jobPositions) ? options.jobPositions : [];
    var jobPositions;
    if (window.SharedUtils && typeof window.SharedUtils.filterAndDisplayJobPositions === 'function') {
      try { jobPositions = window.SharedUtils.filterAndDisplayJobPositions(rawJobs, state.team_number || undefined); }
      catch (e) { jobPositions = rawJobs; }
    } else {
      jobPositions = rawJobs;
    }
    var jobOpts = '<option value="">' + escapeHtml(labels.anyJobPos) + '</option>' +
      jobPositions.map(function (p) {
        if (!p) return '';
        var sel = (state.job_position && String(state.job_position) === String(p.job_position)) ? ' selected' : '';
        return '<option value="' + escapeHtml(p.job_position) + '"' + sel + '>' +
          escapeHtml(p.display_name || p.job_position) + '</option>';
      }).join('');

    var rawUsers = Array.isArray(options.users) ? options.users : [];
    var filteredUsers = filterUsers(rawUsers, state.team_number, state.job_position);
    var userOpts = '<option value="">' + escapeHtml(labels.anyUser) + '</option>' +
      filteredUsers.map(function (u) {
        if (!u) return '';
        var sel = (state.user_id != null && Number(state.user_id) === Number(u.ID)) ? ' selected' : '';
        return '<option value="' + escapeHtml(u.ID) + '"' + sel + '>' + escapeHtml(userDisplayName(u)) + '</option>';
      }).join('');

    // Period selects — only render the ones relevant to the current mode.
    var yearList = Array.isArray(options.years) && options.years.length > 0
      ? options.years
      : ((window.SharedUtils && window.SharedUtils.getYearOptions) ? window.SharedUtils.getYearOptions() : []);
    var yearOpts = yearList.map(function (y) {
      var val = (y && typeof y === 'object') ? y.value : y;
      var lbl = (y && typeof y === 'object') ? (y.label || y.value) : y;
      var sel = (state.year != null && Number(state.year) === Number(val)) ? ' selected' : '';
      return '<option value="' + escapeHtml(val) + '"' + sel + '>' + escapeHtml(lbl) + '</option>';
    }).join('');

    var monthList = Array.isArray(options.months) && options.months.length > 0
      ? options.months
      : ((window.SharedUtils && window.SharedUtils.getMonthOptions) ? window.SharedUtils.getMonthOptions() : []);
    var monthOpts = buildOptions(monthList, 'value', 'label', state.month);

    var quarterList = Array.isArray(options.quarters) && options.quarters.length > 0
      ? options.quarters
      : ((window.SharedUtils && window.SharedUtils.getQuarterOptions) ? window.SharedUtils.getQuarterOptions() : []);
    var quarterOpts = quarterList.map(function (q) {
      if (!q) return '';
      var val = q.year + '-' + q.quarter;
      var sel = (Number(state.year) === Number(q.year) && Number(state.quarter) === Number(q.quarter)) ? ' selected' : '';
      return '<option value="' + escapeHtml(val) + '"' + sel + '>' + escapeHtml(q.label) + '</option>';
    }).join('');

    var periodHTML = '';
    if (state.mode === 'quarterly') {
      periodHTML =
        '<div class="shared-filter-group">' +
          '<label for="shared-quarter-sel">' + escapeHtml(labels.quarter) + '</label>' +
          '<select id="shared-quarter-sel" data-shared-field="quarter">' + quarterOpts + '</select>' +
        '</div>';
    } else if (state.mode === 'monthly') {
      periodHTML =
        '<div class="shared-filter-group">' +
          '<label for="shared-month-sel">' + escapeHtml(labels.month) + '</label>' +
          '<select id="shared-month-sel" data-shared-field="month">' + monthOpts + '</select>' +
        '</div>' +
        '<div class="shared-filter-group">' +
          '<label for="shared-year-sel">' + escapeHtml(labels.year) + '</label>' +
          '<select id="shared-year-sel" data-shared-field="year">' + yearOpts + '</select>' +
        '</div>';
    } else if (state.mode === 'yearly') {
      periodHTML =
        '<div class="shared-filter-group">' +
          '<label for="shared-year-sel">' + escapeHtml(labels.year) + '</label>' +
          '<select id="shared-year-sel" data-shared-field="year">' + yearOpts + '</select>' +
        '</div>';
    }

    // ── Assemble panel HTML ──────────────────────────────────────────────────

    var html =
      '<div class="shared-filter-panel">' +
        '<h2 class="shared-filter-title">' + escapeHtml(labels.title) + '</h2>' +
        '<div class="shared-filter-grid">' +
          '<div class="shared-filter-group">' +
            '<label for="shared-mode-sel">' + escapeHtml(labels.mode) + '</label>' +
            '<select id="shared-mode-sel" data-shared-field="mode">' +
              '<option value="all"'       + (state.mode === 'all'       ? ' selected' : '') + '>' + escapeHtml(labels.modeAll)     + '</option>' +
              '<option value="quarterly"' + (state.mode === 'quarterly' ? ' selected' : '') + '>' + escapeHtml(labels.modeQuarter) + '</option>' +
              '<option value="monthly"'   + (state.mode === 'monthly'   ? ' selected' : '') + '>' + escapeHtml(labels.modeMonth)   + '</option>' +
              '<option value="yearly"'    + (state.mode === 'yearly'    ? ' selected' : '') + '>' + escapeHtml(labels.modeYear)    + '</option>' +
            '</select>' +
          '</div>' +
          periodHTML +
          '<div class="shared-filter-group">' +
            '<label for="shared-country-sel">' + escapeHtml(labels.country) + '</label>' +
            '<select id="shared-country-sel" data-shared-field="country_id">' + countryOpts + '</select>' +
          '</div>' +
          '<div class="shared-filter-group">' +
            '<label for="shared-team-sel">' + escapeHtml(labels.team) + '</label>' +
            '<select id="shared-team-sel" data-shared-field="team_number">' + teamOpts + '</select>' +
          '</div>' +
          '<div class="shared-filter-group">' +
            '<label for="shared-jobpos-sel">' + escapeHtml(labels.jobPosition) + '</label>' +
            '<select id="shared-jobpos-sel" data-shared-field="job_position">' + jobOpts + '</select>' +
          '</div>' +
          '<div class="shared-filter-group">' +
            '<label for="shared-user-sel">' + escapeHtml(labels.user) + '</label>' +
            '<select id="shared-user-sel" data-shared-field="user_id">' + userOpts + '</select>' +
          '</div>' +
          '<div class="shared-filter-actions">' +
            '<button type="button" class="shared-btn-apply" data-shared-apply>' + escapeHtml(labels.apply) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    cfg.containerEl.innerHTML = html;

    // ── Wire events ──────────────────────────────────────────────────────────
    // Use delegation so callers can also hook into innerHTML if they wish.

    function emitChange(nextState) {
      if (!onChange) return;
      try { onChange(nextState); }
      catch (e) { console.warn('[SharedFilterPanel] onChange threw:', e); }
    }

    function rerenderWith(nextState) {
      // Re-render with the updated state so cascaded selects reflect new options.
      render({
        containerEl : cfg.containerEl,
        state       : nextState,
        options     : options,
        onChange    : onChange,
        onApply     : onApply,
        labels      : cfg.labels
      });
    }

    cfg.containerEl.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var field = t.getAttribute('data-shared-field');
      if (!field) return;

      // Accumulate onto the closure's own state so successive changes without
      // a caller-driven re-render still build on the latest values.
      var nextState = normalizeState(state);
      var raw = t.value;
      var needsRerender = false;

      switch (field) {
        case 'mode':
          nextState.mode = raw;
          // Re-sync period defaults when switching mode (matches existing pages).
          if (window.SharedUtils) {
            if (raw === 'quarterly') {
              nextState.year    = window.SharedUtils.getCurrentYear();
              nextState.quarter = window.SharedUtils.getCurrentQuarter();
            } else if (raw === 'monthly') {
              nextState.year  = window.SharedUtils.getCurrentYear();
              nextState.month = new Date().getMonth() + 1;
            } else if (raw === 'yearly') {
              nextState.year = window.SharedUtils.getCurrentYear();
            }
          }
          needsRerender = true;
          break;
        case 'quarter':
          // value is "YYYY-Q"
          var parts = String(raw).split('-');
          if (parts.length === 2) {
            nextState.year    = parseInt(parts[0], 10);
            nextState.quarter = parseInt(parts[1], 10);
          }
          break;
        case 'month':
          nextState.month = raw ? parseInt(raw, 10) : null;
          break;
        case 'year':
          nextState.year = raw ? parseInt(raw, 10) : null;
          break;
        case 'country_id':
          nextState.country_id = raw ? parseInt(raw, 10) : null;
          break;
        case 'team_number':
          nextState.team_number  = raw ? parseInt(raw, 10) : null;
          nextState.job_position = null;  // cascade reset
          nextState.user_id      = null;
          needsRerender = true;
          break;
        case 'job_position':
          nextState.job_position = raw || null;
          nextState.user_id      = null;  // cascade reset
          needsRerender = true;
          break;
        case 'user_id':
          nextState.user_id = raw ? parseInt(raw, 10) : null;
          break;
      }

      state = nextState; // persist so non-rerender changes still accumulate
      emitChange(nextState);

      if (needsRerender) {
        rerenderWith(nextState);
      }
    });

    cfg.containerEl.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.hasAttribute('data-shared-apply')) {
        if (!onApply) return;
        try { onApply(normalizeState(state)); }
        catch (err) { console.warn('[SharedFilterPanel] onApply threw:', err); }
      }
    });
  }

  window.SharedFilterPanel = {
    render: render
  };

})();
