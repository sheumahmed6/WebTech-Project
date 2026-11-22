(function () {
  'use strict';

  const info = TurfDB.getTurfInfo();
  const customer = TurfDB.getCurrentCustomer();   // null if not logged in
  const admin = TurfDB.getCurrentAdmin();         // null if not logged in

  /* Turf details */

  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }

  function fillList(id, items) {
    const list = document.getElementById(id);
    items.forEach(function (text) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
  }

  const openTime = TurfUtils.formatTime(String(info.openHour).padStart(2, '0') + ':00');
  const closeTime = TurfUtils.formatTime(String(info.closeHour).padStart(2, '0') + ':00');

  document.title = info.name;
  setText('turf-name', info.name);
  setText('turf-tagline', info.tagline);
  setText('court-count', info.courts.length + ' badminton courts');
  fillList('court-list', info.courts);
  setText('open-days', info.openDays);
  setText('open-hours', openTime + ' \u2013 ' + closeTime);
  setText('price', info.currency + info.pricePerHour + ' per hour');
  setText('address', info.address);
  setText('phone', info.phone);
  setText('email', info.email);
  fillList('rules-list', info.rules);

  /*  Navigation based on login state  */

  const navCustomerLogin = document.getElementById('nav-customer-login');
  const navBooking = document.getElementById('nav-booking');
  const navAdmin = document.getElementById('nav-admin');
  const navLogout = document.getElementById('nav-logout');
  const heroCta = document.getElementById('hero-cta');

  if (customer) {
    // Logged-in customer
    navCustomerLogin.hidden = true;
    navBooking.hidden = false;
    navLogout.hidden = false;
    heroCta.textContent = 'Book a court';
    heroCta.href = 'booking.html';
  }

  if (admin) {
    // Logged-in admin
    navAdmin.textContent = 'Admin Dashboard';
    navAdmin.href = 'admin-dashboard.html';
  }

  navLogout.addEventListener('click', function () {
    TurfDB.logoutCustomer();
    window.location.reload();
  });
})();
