/* =========================================================
   EUREKA · Diabetic Care Club
   Logged-in patient's own health record (my-record.html) — read only,
   filtered by a chosen date range.
   ========================================================= */
(function () {
  'use strict';

  const D = window.DCC;
  const $ = sel => document.querySelector(sel);

  const patient = D.loadState().patients.find(p => p.id === D.session.get());
  if (!patient) {
    D.session.clear();
    location.replace('login.html');
    return;
  }

  const all = D.sortedReadings(patient);
  const canvas = $('#trendChart');
  const chartEmpty = $('#chartEmpty');
  const fromEl = $('#rangeFrom');
  const toEl = $('#rangeTo');
  const rangeError = $('#rangeError');
  const rangeSummary = $('#rangeSummary');
  const presets = document.querySelectorAll('[data-range]');

  const today = D.todayISO();
  const firstDate = all.length && all[0].date < today ? all[0].date : today;
  let shown = all;

  /* ---------- Patient details (whole record) ---------- */
  document.title = `${patient.name} — My Health Record | Diabetic Care Club`;
  $('#welcomeName').textContent = patient.name.split(/\s+/)[0];
  $('#dAvatar').textContent = D.initials(patient.name);
  $('#dName').textContent = patient.name;
  $('#dMeta').textContent = D.patientMeta(patient);

  const last = all[all.length - 1];
  $('#lastVisit').textContent = last
    ? `Last reading recorded on ${D.fmtDate(last.date)}.`
    : 'No readings have been recorded yet. They will appear here after your check-up.';

  D.renderAlerts($('#dAlerts'), D.alertsFor(patient));

  /* ---------- Date range ---------- */
  fromEl.max = today;
  toEl.max = today;

  function isoDaysAgo(days) {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function showRange(from, to, preset) {
    if (from > to) {
      rangeError.textContent = 'The "From" date must be on or before the "To" date.';
      rangeError.hidden = false;
      return;
    }
    rangeError.hidden = true;
    fromEl.value = from;
    toEl.value = to;
    presets.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.range === preset)));

    shown = all.filter(r => r.date >= from && r.date <= to);
    const n = shown.length;
    rangeSummary.textContent = `${n} reading${n === 1 ? '' : 's'} from ${D.fmtDate(from)} to ${D.fmtDate(to)}`;

    chartEmpty.textContent = all.length ? 'No sugar readings in this date range.' : 'No sugar readings to show yet.';
    D.renderStats($('#stats'), shown);
    D.renderHistory($('#historyBody'), shown, {
      emptyText: all.length
        ? 'No readings in this date range. Try a wider range.'
        : 'No readings recorded yet. Your readings will appear here after your check-up.'
    });
    D.drawChart(canvas, chartEmpty, shown);
  }

  function applyPreset(key) {
    const from = key === 'all' ? firstDate : isoDaysAgo(Number(key));
    showRange(from, today, key);
  }

  presets.forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.range)));

  $('#rangeForm').addEventListener('submit', e => {
    e.preventDefault();
    showRange(fromEl.value || firstDate, toEl.value || today, null);
  });

  D.keepChartFresh(() => D.drawChart(canvas, chartEmpty, shown));
  applyPreset('all');

  /* ---------- Log out ---------- */
  $('#logout').addEventListener('click', () => {
    D.session.clear();
    location.href = 'login.html';
  });
})();
