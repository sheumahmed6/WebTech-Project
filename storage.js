/* =============================================================================
   storage.js — Shared data layer (localStorage version)
   -----------------------------------------------------------------------------
   Every page reads and writes data ONLY through the `TurfDB` object below.
   No other file touches localStorage directly.

   MOVING TO A REAL DATABASE LATER
     1. Keep the function names and the shape of the objects they return.
     2. Replace each function body with a fetch() call to your API. The
        "Later:" comment above each function suggests an endpoint.
     3. Make those functions `async` and add `await` where the pages call them.

   NOTE: Passwords are saved in plain text here ONLY because this is a demo.
   A real backend must hash passwords and use secure sessions or tokens.

   DATA STORED (JSON in localStorage)
     turf_users            [ { id, name, email, phone, password, createdAt } ]
     turf_bookings         [ { id, customerName, customerEmail, date, court,
                               timeSlot, price, status, createdAt, updatedAt } ]
     turf_customer_session { id, name, email, phone, loggedInAt }   (or missing)
     turf_admin_session    { username, loggedInAt }                 (or missing)

   FORMATS
     date      "YYYY-MM-DD"   (local date)
     timeSlot  "HH:00"        (24-hour start time of a one-hour slot, e.g. "18:00")
     status    "confirmed" | "cancelled" | "completed"
============================================================================= */

const TurfDB = (function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     1. CONSTANTS
  --------------------------------------------------------------------------- */

  // localStorage keys
  const KEYS = {
    USERS: 'turf_users',
    BOOKINGS: 'turf_bookings',
    CUSTOMER_SESSION: 'turf_customer_session',
    ADMIN_SESSION: 'turf_admin_session'
  };

  // Allowed booking statuses
  const STATUS = Object.freeze({
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed'
  });

  // Turf details shown on the home page and used by the booking page.
  // Later: GET /api/turf
  const TURF_INFO = Object.freeze({
    name: 'Smash Badminton Turf',
    tagline: 'Indoor courts you can book by the hour.',
    courts: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
    openDays: 'Every day',
    openHour: 6,            // first slot starts at 06:00
    closeHour: 23,          // last slot ends at 23:00
    pricePerHour: 15,       // per court, per hour
    currency: '$',
    advanceBookingDays: 30, // how far ahead customers can book
    address: '123 Sports Avenue, City Centre',
    phone: '+00 123 456 7890',
    email: 'info@smashturf.example',
    rules: [
      'Non-marking shoes are required on court.',
      'Arrive 10 minutes before your slot starts.',
      'Each slot is one hour. Time cannot be carried over.',
      'Only water is allowed on the courts.',
      'Cancel through your bookings page if you cannot make it.'
    ]
  });

  // Demo admin login. Later: replace with real admin accounts on the server.
  const DEMO_ADMIN = Object.freeze({ username: 'admin', password: 'admin123' });

  /* ---------------------------------------------------------------------------
     2. LOW-LEVEL HELPERS (the only code that calls localStorage)
  --------------------------------------------------------------------------- */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error('Could not read "' + key + '" from localStorage:', err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeKey(key) {
    localStorage.removeItem(key);
  }

  // Simple unique id. A real database will generate its own ids.
  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  // User object without the password (safe to keep in the session)
  function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email, phone: user.phone };
  }

  /* ---------------------------------------------------------------------------
     3. TURF INFO AND TIME SLOTS
  --------------------------------------------------------------------------- */

  function getTurfInfo() {
    return TURF_INFO;
  }

  // Returns every bookable slot start time, e.g. ["06:00", "07:00", ... "22:00"]
  function getTimeSlots() {
    const slots = [];
    for (let hour = TURF_INFO.openHour; hour < TURF_INFO.closeHour; hour++) {
      slots.push(String(hour).padStart(2, '0') + ':00');
    }
    return slots;
  }

  /* ---------------------------------------------------------------------------
     4. CUSTOMERS (accounts and login session)
  --------------------------------------------------------------------------- */

  // Create a customer account.
  // Later: POST /api/customers/register
  function registerCustomer(details) {
    const users = readJSON(KEYS.USERS, []);
    const email = normalizeEmail(details.email);

    if (users.some(function (u) { return u.email === email; })) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
      id: generateId('usr'),
      name: String(details.name || '').trim(),
      email: email,
      phone: String(details.phone || '').trim(),
      password: details.password,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeJSON(KEYS.USERS, users);
    return { ok: true, user: publicUser(user) };
  }

  // Check credentials and start a session.
  // Later: POST /api/customers/login  (server returns a token or sets a cookie)
  function loginCustomer(email, password) {
    const users = readJSON(KEYS.USERS, []);
    const cleanEmail = normalizeEmail(email);
    const user = users.find(function (u) {
      return u.email === cleanEmail && u.password === password;
    });

    if (!user) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    const session = Object.assign({}, publicUser(user), { loggedInAt: new Date().toISOString() });
    writeJSON(KEYS.CUSTOMER_SESSION, session);
    return { ok: true, user: publicUser(user) };
  }

  // Returns the logged-in customer, or null.
  // Later: GET /api/customers/me
  function getCurrentCustomer() {
    return readJSON(KEYS.CUSTOMER_SESSION, null);
  }

  // Later: POST /api/customers/logout
  function logoutCustomer() {
    removeKey(KEYS.CUSTOMER_SESSION);
  }

  /* ---------------------------------------------------------------------------
     5. ADMIN (login session)
  --------------------------------------------------------------------------- */

  // Later: POST /api/admin/login
  function loginAdmin(username, password) {
    if (String(username).trim() === DEMO_ADMIN.username && password === DEMO_ADMIN.password) {
      writeJSON(KEYS.ADMIN_SESSION, { username: DEMO_ADMIN.username, loggedInAt: new Date().toISOString() });
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect admin username or password.' };
  }

  // Returns the logged-in admin, or null.
  // Later: GET /api/admin/me
  function getCurrentAdmin() {
    return readJSON(KEYS.ADMIN_SESSION, null);
  }

  // Later: POST /api/admin/logout
  function logoutAdmin() {
    removeKey(KEYS.ADMIN_SESSION);
  }

  // Only used to display the demo login on the admin login page. Remove later.
  function getDemoAdminCredentials() {
    return { username: DEMO_ADMIN.username, password: DEMO_ADMIN.password };
  }

  /* ---------------------------------------------------------------------------
     6. BOOKINGS
  --------------------------------------------------------------------------- */

  // Every booking (admin view).
  // Later: GET /api/bookings
  function getAllBookings() {
    return readJSON(KEYS.BOOKINGS, []);
  }

  // Bookings that belong to one customer.
  // Later: GET /api/bookings?email=...  (or GET /api/customers/me/bookings)
  function getBookingsByCustomer(email) {
    const cleanEmail = normalizeEmail(email);
    return getAllBookings().filter(function (b) { return b.customerEmail === cleanEmail; });
  }

  // Time slots already taken on a date for one court.
  // Cancelled bookings do not block a slot, so it becomes available again.
  // Later: GET /api/availability?date=...&court=...
  function getTakenSlots(date, court) {
    return getAllBookings()
      .filter(function (b) {
        return b.date === date && b.court === court && b.status !== STATUS.CANCELLED;
      })
      .map(function (b) { return b.timeSlot; });
  }

  // Create one booking per selected slot. All-or-nothing: if any slot is
  // already taken, nothing is saved. This is the double-booking check.
  // (A real database should also enforce it with a unique constraint.)
  // Later: POST /api/bookings
  function createBookings(request) {
    const customer = request.customer;
    const date = request.date;
    const court = request.court;
    const timeSlots = request.timeSlots || [];

    if (!customer || !date || !court || timeSlots.length === 0) {
      return { ok: false, error: 'Choose a date, a court and at least one time slot.' };
    }

    const validSlots = getTimeSlots();
    if (!TURF_INFO.courts.includes(court) || timeSlots.some(function (s) { return !validSlots.includes(s); })) {
      return { ok: false, error: 'The selected court or time slot is not valid.' };
    }

    const taken = getTakenSlots(date, court);
    const conflicts = timeSlots.filter(function (s) { return taken.includes(s); });
    if (conflicts.length > 0) {
      return {
        ok: false,
        conflicts: conflicts,
        error: 'Some of the selected slots were just booked by someone else. Choose different slots.'
      };
    }

    const now = new Date().toISOString();
    const created = timeSlots.map(function (slot) {
      return {
        id: generateId('bk'),
        customerName: customer.name,
        customerEmail: normalizeEmail(customer.email),
        date: date,
        court: court,
        timeSlot: slot,
        price: TURF_INFO.pricePerHour,
        status: STATUS.CONFIRMED,
        createdAt: now,
        updatedAt: now
      };
    });

    writeJSON(KEYS.BOOKINGS, getAllBookings().concat(created));
    return { ok: true, bookings: created };
  }

  // Shared by the customer and admin actions below.
  // Only a confirmed booking can be changed. If `ownerEmail` is given, the
  // booking must belong to that customer.
  function changeStatus(id, newStatus, ownerEmail) {
    const bookings = getAllBookings();
    const booking = bookings.find(function (b) { return b.id === id; });

    if (!booking) {
      return { ok: false, error: 'Booking not found.' };
    }
    if (ownerEmail && booking.customerEmail !== normalizeEmail(ownerEmail)) {
      return { ok: false, error: 'You can only change your own bookings.' };
    }
    if (booking.status !== STATUS.CONFIRMED) {
      return { ok: false, error: 'Only confirmed bookings can be changed.' };
    }

    booking.status = newStatus;
    booking.updatedAt = new Date().toISOString();
    writeJSON(KEYS.BOOKINGS, bookings);
    return { ok: true, booking: booking };
  }

  // Customer cancels their own booking.
  // Later: PATCH /api/bookings/:id  { status: "cancelled" }  (server checks the owner)
  function cancelBookingForCustomer(id, customerEmail) {
    return changeStatus(id, STATUS.CANCELLED, customerEmail);
  }

  // Admin cancels or completes any booking.
  // Later: PATCH /api/admin/bookings/:id  { status: "cancelled" | "completed" }
  function updateBookingStatus(id, newStatus) {
    if (newStatus !== STATUS.CANCELLED && newStatus !== STATUS.COMPLETED) {
      return { ok: false, error: 'Invalid status.' };
    }
    return changeStatus(id, newStatus, null);
  }

  /* ---------------------------------------------------------------------------
     Public API
  --------------------------------------------------------------------------- */
  return {
    STATUS: STATUS,

    getTurfInfo: getTurfInfo,
    getTimeSlots: getTimeSlots,

    registerCustomer: registerCustomer,
    loginCustomer: loginCustomer,
    getCurrentCustomer: getCurrentCustomer,
    logoutCustomer: logoutCustomer,

    loginAdmin: loginAdmin,
    getCurrentAdmin: getCurrentAdmin,
    logoutAdmin: logoutAdmin,
    getDemoAdminCredentials: getDemoAdminCredentials,

    getAllBookings: getAllBookings,
    getBookingsByCustomer: getBookingsByCustomer,
    getTakenSlots: getTakenSlots,
    createBookings: createBookings,
    cancelBookingForCustomer: cancelBookingForCustomer,
    updateBookingStatus: updateBookingStatus
  };
})();
