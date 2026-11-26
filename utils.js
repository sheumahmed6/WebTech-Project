/* =============================================================================
   utils.js — Small shared helpers for dates, times, text and messages
   -----------------------------------------------------------------------------
   Nothing here touches localStorage, so this file stays the same when
   storage.js is later swapped for real API calls.
   Load order on every page: storage.js, utils.js, then the page's own script.
============================================================================= */

const TurfUtils = (function () {
  'use strict';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /* ---------- Dates ---------- */

  // Date object -> "YYYY-MM-DD" in LOCAL time.
  // (toISOString() would give the UTC date, which can be off by a day.)
  function toDateString(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function todayString() {
    return toDateString(new Date());
  }

  // "YYYY-MM-DD" for today plus N days
  function daysFromToday(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toDateString(d);
  }

  // "2026-11-21" -> "Sat, 21 Nov 2026"
  function formatDate(dateString) {
    const parts = dateString.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  /* ---------- Time slots ---------- */

  // "18:00" -> "6:00 PM"
  function formatTime(hhmm) {
    const parts = hhmm.split(':').map(Number);
    const hour = parts[0] % 24;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return hour12 + ':' + pad(parts[1]) + ' ' + suffix;
  }

  // "18:00" -> "19:00"
  function nextHour(timeSlot) {
    return pad(parseInt(timeSlot, 10) + 1) + ':00';
  }

  // "18:00" -> "6:00 PM – 7:00 PM"
  function formatSlot(timeSlot) {
    return formatTime(timeSlot) + ' \u2013 ' + formatTime(nextHour(timeSlot));
  }

  function slotStart(date, timeSlot) {
    return new Date(date + 'T' + timeSlot + ':00');   // parsed as local time
  }

  function slotEnd(date, timeSlot) {
    return new Date(slotStart(date, timeSlot).getTime() + 60 * 60 * 1000);
  }

  function hasSlotStarted(date, timeSlot) {
    return slotStart(date, timeSlot) <= new Date();
  }

  function hasSlotEnded(date, timeSlot) {
    return slotEnd(date, timeSlot) <= new Date();
  }

  // For Array.sort(): earliest date, then time, then court
  function compareBookings(a, b) {
    return a.date.localeCompare(b.date) ||
           a.timeSlot.localeCompare(b.timeSlot) ||
           a.court.localeCompare(b.court);
  }

  /* ---------- Text and messages ---------- */

  // Escape user-entered text before putting it inside innerHTML
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Show a message in a <div class="alert" hidden> element.
  // type: "error" | "success" | "info"
  function showMessage(element, type, text) {
    element.className = 'alert alert-' + type;
    element.textContent = text;
    element.hidden = false;
  }

  function clearMessage(element) {
    element.textContent = '';
    element.hidden = true;
  }

  return {
    todayString: todayString,
    daysFromToday: daysFromToday,
    formatDate: formatDate,
    formatTime: formatTime,
    formatSlot: formatSlot,
    hasSlotStarted: hasSlotStarted,
    hasSlotEnded: hasSlotEnded,
    compareBookings: compareBookings,
    escapeHtml: escapeHtml,
    showMessage: showMessage,
    clearMessage: clearMessage
  };
})();
