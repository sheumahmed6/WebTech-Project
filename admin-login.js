(function () {
  'use strict';

  // if login then direct admin dashboard
  if (TurfDB.getCurrentAdmin()) {
    window.location.replace('admin-dashboard.html');
    return;
  }

  const form = document.getElementById('admin-form');
  const message = document.getElementById('message');

  // demo nam and pass
  const demo = TurfDB.getDemoAdminCredentials();
  document.getElementById('demo-username').textContent = demo.username;
  document.getElementById('demo-password').textContent = demo.password;
  

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const result = TurfDB.loginAdmin(
      document.getElementById('admin-username').value,
      document.getElementById('admin-password').value
    );

    if (!result.ok) {
      TurfUtils.showMessage(message, 'error', result.error);
      return;
    }
    window.location.href = 'admin-dashboard.html';
  });
})();
