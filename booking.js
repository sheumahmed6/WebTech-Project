(function () {
  'use strict';

  const info = TurfDB.getTurfInfo();
  const customer = TurfDB.getCurrentCustomer();   // null if not logged in

  /*  Page elements */
  const loginPrompt = document.getElementById('login-prompt');
  const bookingArea = document.getElementById('booking-area');
  const navUser = document.getElementById('nav-user');
  const logoutBtn = document.getElementById('logout-btn');

  const dateInput = document.getElementById('booking-date');
  const courtSelect = document.getElementById('court-select');
  const slotGrid = document.getElementById('slot-grid');
  const message = document.getElementById('booking-message');
  const summaryText = document.getElementById('summary-text');
  const confirmBtn = document.getElementById('confirm-btn');

  const noBookings = document.getElementById('no-bookings');
  const bookingsWrap = document.getElementById('bookings-wrap');
  const bookingsBody = document.getElementById('bookings-body');

  // Not logged in
  if (!customer) {
    loginPrompt.hidden = false;
    return;
  }

  /* State  */
  const selectedSlots = new Set();   // e.g. {"18:00", "19:00"}

  /* Set up the page  */
  bookingArea.hidden = false;
  navUser.textContent = 'Hi, ' + customer.name;
  navUser.hidden = false;
  logoutBtn.hidden = false;

  info.courts.forEach(function (courtName) {
    const option = document.createElement('option');
    option.value = courtName;
    option.textContent = courtName;
    courtSelect.appendChild(option);
  });

  dateInput.min = TurfUtils.todayString();
  dateInput.max = TurfUtils.daysFromToday(info.advanceBookingDays);
  dateInput.value = dateInput.min;

  /* grid  */

  function renderSlots() {
    const date = dateInput.value;
    const court = courtSelect.value;
    slotGrid.innerHTML = '';

    if (!date) {
      slotGrid.innerHTML = '<p class="muted">Pick a date to see the time slots.</p>';
      updateSummary();
      return;
    }

    const taken = TurfDB.getTakenSlots(date, court);

    TurfDB.getTimeSlots().forEach(function (slot) {
      const isTaken = taken.includes(slot);
      const isPast = TurfUtils.hasSlotStarted(date, slot);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot';
      button.dataset.slot = slot;

      const label = document.createElement('span');
      label.textContent = TurfUtils.formatSlot(slot);
      button.appendChild(label);

      if (isTaken || isPast) {
        button.disabled = true;
        button.classList.add(isTaken ? 'booked' : 'past');
        const note = document.createElement('span');
        note.className = 'slot-note';
        note.textContent = isTaken ? 'Booked' : 'Time has passed';
        button.appendChild(note);
      } else if (selectedSlots.has(slot)) {
        button.classList.add('selected');
      }

      slotGrid.appendChild(button);
    });

    updateSummary();
  }

  function updateSummary() {
    const count = selectedSlots.size;
    if (count === 0) {
      summaryText.textContent = 'No slots selected.';
      confirmBtn.disabled = true;
    } else {
      const total = count * info.pricePerHour;
      summaryText.textContent =
        count + (count === 1 ? ' slot' : ' slots') + ' selected. Total: ' + info.currency + total;
      confirmBtn.disabled = false;
    }
  }

  // Click on a slot: select or unselect it
  slotGrid.addEventListener('click', function (event) {
    const button = event.target.closest('.slot');
    if (!button || button.disabled) return;

    const slot = button.dataset.slot;
    if (selectedSlots.has(slot)) {
      selectedSlots.delete(slot);
      button.classList.remove('selected');
    } else {
      selectedSlots.add(slot);
      button.classList.add('selected');
    }
    TurfUtils.clearMessage(message);
    updateSummary();
  });

  // New date or court: start with a clean selection
  function onPickerChange() {
    selectedSlots.clear();
    TurfUtils.clearMessage(message);
    renderSlots();
  }
  dateInput.addEventListener('change', onPickerChange);
  courtSelect.addEventListener('change', onPickerChange);

  /* Confirm booking */

  confirmBtn.addEventListener('click', function () {
    const date = dateInput.value;
    const court = courtSelect.value;
    const slots = Array.from(selectedSlots).sort();

    const result = TurfDB.createBookings({
      customer: customer,
      date: date,
      court: court,
      timeSlots: slots
    });

    selectedSlots.clear();

    if (result.ok) {
      const n = result.bookings.length;
      TurfUtils.showMessage(
        message, 'success',
        n + (n === 1 ? ' slot' : ' slots') + ' booked on ' + court + ', ' + TurfUtils.formatDate(date) + '.'
      );
    } else {
      TurfUtils.showMessage(message, 'error', result.error);
    }

    renderSlots();       // refresh so newly taken slots show as booked
    renderMyBookings();
  });

  /*upcoming bookings */

  function renderMyBookings() {
    const upcoming = TurfDB.getBookingsByCustomer(customer.email)
      .filter(function (b) {
        return b.status === TurfDB.STATUS.CONFIRMED && !TurfUtils.hasSlotEnded(b.date, b.timeSlot);
      })
      .sort(TurfUtils.compareBookings);

    bookingsBody.innerHTML = '';
    noBookings.hidden = upcoming.length > 0;
    bookingsWrap.hidden = upcoming.length === 0;

    upcoming.forEach(function (b) {
      const row = document.createElement('tr');
      row.innerHTML =
        '<td>' + TurfUtils.escapeHtml(TurfUtils.formatDate(b.date)) + '</td>' +
        '<td>' + TurfUtils.escapeHtml(TurfUtils.formatSlot(b.timeSlot)) + '</td>' +
        '<td>' + TurfUtils.escapeHtml(b.court) + '</td>' +
        '<td>' + TurfUtils.escapeHtml(info.currency + b.price) + '</td>' +
        '<td><button type="button" class="btn btn-danger btn-sm" data-cancel="' +
          TurfUtils.escapeHtml(b.id) + '">Cancel</button></td>';
      bookingsBody.appendChild(row);
    });
  }

  // Cancel button 
  bookingsBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-cancel]');
    if (!button) return;

    if (!window.confirm('Cancel this booking?')) return;

    const result = TurfDB.cancelBookingForCustomer(button.dataset.cancel, customer.email);
    if (result.ok) {
      TurfUtils.showMessage(message, 'success', 'Booking cancelled. The slot is available again.');
    } else {
      TurfUtils.showMessage(message, 'error', result.error);
    }
    renderSlots();
    renderMyBookings();
  });

  /*  Logout  */

  logoutBtn.addEventListener('click', function () {
    TurfDB.logoutCustomer();
    window.location.href = 'index.html';
  });

  

  window.addEventListener('storage', function () {
    renderSlots();
    renderMyBookings();
  });

  /* First render */
  renderSlots();
  renderMyBookings();
})();
