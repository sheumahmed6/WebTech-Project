/* =============================================================================
   admin-dashboard.js — Admin dashboard
   - Only a logged-in admin can see this page (otherwise redirect to login)
   - Lists every booking, with filters by date and status
   - Admin can mark a booking Completed or Cancel it

   NOTE: This check only hides the page in the browser. It is NOT real
   security. When a backend exists, the server must check the admin's login
   on every API request.
============================================================================= */
(function () {
  'use strict';

  /* ---------- Guard: admins only ---------- */
  if (!TurfDB.getCurrentAdmin()) {
    window.location.replace('admin-login.html');
    return;
  }

  /* ---------- Page elements ---------- */
  const dashboard = document.getElementById('dashboard');
  const filterDate = document.getElementById('filter-date');
  const filterStatus = document.getElementById('filter-status');
  const filterToday = document.getElementById('filter-today');
  const filterClear = document.getElementById('filter-clear');
  const message = document.getElementById('message');
  const resultCount = document.getElementById('result-count');
  const noResults = document.getElementById('no-results');
  const tableWrap = document.getElementById('table-wrap');
  const tbody = document.getElementById('bookings-body');

  const STATUS_LABELS = {
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  dashboard.hidden = false;   // admin confirmed: show the page

  /* ---------- Summary numbers ---------- */

  function countByStatus(bookings, status) {
    return bookings.filter(function (b) { return b.status === status; }).length;
  }

  function renderStats(all) {
    document.getElementById('stat-total').textContent = all.length;
    document.getElementById('stat-confirmed').textContent = countByStatus(all, TurfDB.STATUS.CONFIRMED);
    document.getElementById('stat-completed').textContent = countByStatus(all, TurfDB.STATUS.COMPLETED);
    document.getElementById('stat-cancelled').textContent = countByStatus(all, TurfDB.STATUS.CANCELLED);
  }

  /* ---------- Bookings table ---------- */

  function render() {
    const all = TurfDB.getAllBookings();
    renderStats(all);

    // Apply filters (an empty filter means "show all")
    const date = filterDate.value;
    const status = filterStatus.value;
    const shown = all
      .filter(function (b) {
        return (!date || b.date === date) && (!status || b.status === status);
      })
      .sort(TurfUtils.compareBookings);

    resultCount.textContent = 'Showing ' + shown.length + ' of ' + all.length + ' bookings.';
    noResults.hidden = shown.length > 0;
    tableWrap.hidden = shown.length === 0;

    tbody.innerHTML = '';
    shown.forEach(function (b, index) {
      // Action buttons only make sense for confirmed bookings
      let actions = '<span class="muted">None</span>';
      if (b.status === TurfDB.STATUS.CONFIRMED) {
        actions =
          '<button type="button" class="btn btn-primary btn-sm" data-action="complete" data-id="' +
            TurfUtils.escapeHtml(b.id) + '">Mark completed</button>' +
          '<button type="button" class="btn btn-danger btn-sm" data-action="cancel" data-id="' +
            TurfUtils.escapeHtml(b.id) + '">Cancel</button>';
      }

      const row = document.createElement('tr');
      row.innerHTML =
        '<td>' + (index + 1) + '</td>' +
        '<td><strong>' + TurfUtils.escapeHtml(b.customerName) + '</strong><br>' +
          '<span class="muted">' + TurfUtils.escapeHtml(b.customerEmail) + '</span></td>' +
        '<td>' + TurfUtils.escapeHtml(TurfUtils.formatDate(b.date)) + '</td>' +
        '<td>' + TurfUtils.escapeHtml(TurfUtils.formatSlot(b.timeSlot)) + '</td>' +
        '<td>' + TurfUtils.escapeHtml(b.court) + '</td>' +
        '<td><span class="badge badge-' + TurfUtils.escapeHtml(b.status) + '">' +
          TurfUtils.escapeHtml(STATUS_LABELS[b.status] || b.status) + '</span></td>' +
        '<td class="actions">' + actions + '</td>';
      tbody.appendChild(row);
    });
  }

  /* ---------- Actions: complete / cancel ---------- */

  tbody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    let result;

    if (button.dataset.action === 'cancel') {
      if (!window.confirm('Cancel this booking? The slot will become available again.')) return;
      result = TurfDB.updateBookingStatus(id, TurfDB.STATUS.CANCELLED);
    } else {
      result = TurfDB.updateBookingStatus(id, TurfDB.STATUS.COMPLETED);
    }

    if (result.ok) {
      TurfUtils.clearMessage(message);
    } else {
      TurfUtils.showMessage(message, 'error', result.error);
    }
    render();
  });

  /* ---------- Filters ---------- */

  filterDate.addEventListener('change', render);
  filterStatus.addEventListener('change', render);

  filterToday.addEventListener('click', function () {
    filterDate.value = TurfUtils.todayString();
    render();
  });

  filterClear.addEventListener('click', function () {
    filterDate.value = '';
    filterStatus.value = '';
    render();
  });

  /* ---------- Logout ---------- */

  document.getElementById('logout-btn').addEventListener('click', function () {
    TurfDB.logoutAdmin();
    window.location.href = 'admin-login.html';
  });

  /* ---------- Refresh when a customer books in another tab ---------- */
  // (With a real backend you would poll the API instead.)
  window.addEventListener('storage', render);

  /* ---------- First render ---------- */
  render();
})();
