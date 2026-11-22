/* =============================================================================
   customer-login.js — Customer login and sign-up
   On success the session is saved (inside TurfDB) and the customer is sent to
   the booking page.
============================================================================= */
(function () {
  'use strict';

  // Already logged in? Skip straight to booking.
  if (TurfDB.getCurrentCustomer()) {
    window.location.replace('booking.html');
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const message = document.getElementById('message');

  /* ---------- Tabs ---------- */

  function showTab(name) {
    const isLogin = name === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabSignup.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', isLogin);
    tabSignup.setAttribute('aria-selected', !isLogin);
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    TurfUtils.clearMessage(message);
  }

  tabLogin.addEventListener('click', function () { showTab('login'); });
  tabSignup.addEventListener('click', function () { showTab('signup'); });

  // Allows linking straight to the sign-up tab: customer-login.html#signup
  if (window.location.hash === '#signup') {
    showTab('signup');
  }

  /* ---------- Log in ---------- */

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const result = TurfDB.loginCustomer(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );

    if (!result.ok) {
      TurfUtils.showMessage(message, 'error', result.error);
      return;
    }
    window.location.href = 'booking.html';
  });

  /* ---------- Sign up ---------- */

  signupForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (password !== confirm) {
      TurfUtils.showMessage(message, 'error', 'The passwords do not match.');
      return;
    }

    const created = TurfDB.registerCustomer({ name: name, email: email, phone: phone, password: password });
    if (!created.ok) {
      TurfUtils.showMessage(message, 'error', created.error);
      return;
    }

    // Log the new customer in right away, then go to booking
    TurfDB.loginCustomer(email, password);
    window.location.href = 'booking.html';
  });
})();
