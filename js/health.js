/* =========================================================
   EUREKA · Diabetic Care Club
   Shared health-record helpers used by the staff records page
   (records.js) and the patient pages (login.js, patient.js).
   Data is kept in this browser's localStorage.
   ========================================================= */
window.DCC = (function () {
  'use strict';

  const STORE_KEY = 'eureka-dcc-records-v1';
  const SESSION_KEY = 'eureka-dcc-session';

  /* ---------- DOM ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- Data store ---------- */
  function loadState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (data && Array.isArray(data.patients)) return data;
    } catch (e) { /* storage unavailable or corrupt — start fresh */ }
    return { patients: [], selectedId: null, nextNo: 1 };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable — data stays for this visit only */ }
  }

  /* ---------- Patient session ---------- */
  const session = {
    get() {
      try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
    },
    set(patientId) {
      try { sessionStorage.setItem(SESSION_KEY, patientId); } catch (e) { /* ignore */ }
    },
    clear() {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    }
  };

  // Compare mobile numbers on their last 10 digits, so "+91 98000 00000" matches "9800000000".
  const normalizePhone = value => String(value || '').replace(/\D/g, '').slice(-10);

  /* ---------- Helpers ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Patients ---------- */
  // Used by both staff registration (records.js) and patient self-registration (register.js).
  function findDuplicate(state, name, phone) {
    const n = name.trim().toLowerCase();
    const m = normalizePhone(phone);
    return state.patients.find(p => p.name.trim().toLowerCase() === n && normalizePhone(p.phone) === m) || null;
  }

  function createPatient(state, fields) {
    if (!state.nextNo) state.nextNo = state.patients.length + 1;
    const patient = {
      id: uid(),
      code: 'DCC-' + String(state.nextNo++).padStart(4, '0'),
      name: fields.name,
      age: fields.age,
      gender: fields.gender,
      phone: fields.phone,
      type: fields.type,
      since: fields.since,
      created: Date.now(),
      readings: []
    };
    state.patients.push(patient);
    return patient;
  }

  const sortedReadings = p =>
    p ? [...p.readings].sort((a, b) => a.date.localeCompare(b.date) || a.created - b.created) : [];

  function latestOf(readings, key, skip = 0) {
    for (let i = readings.length - 1; i >= 0; i--) {
      if (readings[i][key] != null && skip-- === 0) return readings[i];
    }
    return null;
  }

  const initials = name =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  function patientMeta(p) {
    return [
      p.code,
      p.age && `${p.age} yrs`,
      p.gender,
      p.type,
      p.since && `Diagnosed ${p.since}`,
      p.phone
    ].filter(Boolean).join('  ·  ');
  }

  /* ---------- Dates ---------- */
  const DAY = 86400000;
  const OVERDUE_DAYS = 30;
  const toDate = iso => new Date(iso + 'T00:00:00');
  const fmtDate = iso => toDate(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const shortDate = iso => toDate(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  const daysSince = iso => Math.round((toDate(todayISO()) - toDate(iso)) / DAY);

  /* ---------- Targets & status ---------- */
  // General targets for people with diabetes; the doctor may set personal ones.
  const STATUS_LABEL = { low: 'Low', normal: 'In target', elevated: 'Above target', high: 'High' };
  const classify = {
    fasting: v => (v < 70 ? 'low' : v <= 130 ? 'normal' : v <= 180 ? 'elevated' : 'high'),
    pp:      v => (v < 70 ? 'low' : v < 180 ? 'normal' : v < 250 ? 'elevated' : 'high'),
    hba1c:   v => (v < 7 ? 'normal' : v < 8 ? 'elevated' : 'high'),
    bp: (s, d) => (s >= 140 || d >= 90 ? 'high' : s >= 130 || d >= 80 ? 'elevated' : 'normal')
  };
  const badge = status => el('span', 'badge ' + status, STATUS_LABEL[status]);

  const METRICS = [
    { key: 'fasting', label: 'Fasting sugar', unit: 'mg/dL', value: r => r.fasting, status: r => classify.fasting(r.fasting), delta: true },
    { key: 'pp', label: 'Post-meal sugar', unit: 'mg/dL', value: r => r.pp, status: r => classify.pp(r.pp), delta: true },
    { key: 'hba1c', label: 'HbA1c', unit: '%', value: r => r.hba1c, status: r => classify.hba1c(r.hba1c), delta: true },
    { key: 'sys', label: 'Blood pressure', unit: 'mmHg', value: r => `${r.sys}/${r.dia}`, status: r => classify.bp(r.sys, r.dia) }
  ];

  /* ---------- Monitoring flags ---------- */
  function alertsFor(p) {
    const readings = sortedReadings(p);
    if (!readings.length) return ['No readings recorded yet'];

    const alerts = [];
    const days = daysSince(readings[readings.length - 1].date);
    if (days > OVERDUE_DAYS) alerts.push(`No reading for ${days} days — follow-up due`);

    METRICS.forEach(m => {
      const r = latestOf(readings, m.key);
      if (!r) return;
      const s = m.status(r);
      if (s === 'high' || s === 'low') {
        alerts.push(`${m.label} ${s}: ${m.value(r)}${m.unit === '%' ? '%' : ' ' + m.unit}`);
      }
    });
    return alerts;
  }

  function renderAlerts(list, alerts) {
    list.innerHTML = '';
    if (alerts.length) alerts.forEach(text => list.append(el('li', null, text)));
    else list.append(el('li', 'ok', 'All latest readings are within limits'));
  }

  /* ---------- Latest-value cards ---------- */
  function renderStats(container, readings) {
    container.innerHTML = '';
    METRICS.forEach(m => {
      const r = latestOf(readings, m.key);
      const card = el('div', 'stat');
      card.append(el('span', 'stat-label', m.label));

      const value = el('div', 'stat-value', r ? String(m.value(r)) : '—');
      if (r) value.append(el('small', null, ' ' + m.unit));
      card.append(value);

      if (r) {
        const foot = el('div', 'stat-foot');
        foot.append(badge(m.status(r)));
        const prev = m.delta && latestOf(readings, m.key, 1);
        if (prev) {
          const diff = Math.round((r[m.key] - prev[m.key]) * 10) / 10;
          const text = diff === 0 ? 'No change' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} since last`;
          foot.append(el('span', 'stat-delta', text));
        }
        card.append(foot, el('span', 'stat-date', fmtDate(r.date)));
      } else {
        card.append(el('span', 'stat-date', 'No reading yet'));
      }
      container.append(card);
    });
  }

  /* ---------- Reading history table ---------- */
  const TRASH_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/>' +
    '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  function valueCell(text, status) {
    const td = document.createElement('td');
    if (text == null) td.textContent = '—';
    else td.append(el('span', 'val', String(text)), badge(status));
    return td;
  }

  function renderHistory(tbody, readings, options = {}) {
    const cols = options.deletable ? 8 : 7;
    tbody.innerHTML = '';
    if (!readings.length) {
      const tr = el('tr', 'table-empty');
      const td = el('td', null, options.emptyText || 'No readings recorded yet.');
      td.colSpan = cols;
      tr.append(td);
      tbody.append(tr);
      return;
    }

    [...readings].reverse().forEach(r => {
      const tr = document.createElement('tr');
      tr.append(
        el('td', null, fmtDate(r.date)),
        valueCell(r.fasting, r.fasting != null && classify.fasting(r.fasting)),
        valueCell(r.pp, r.pp != null && classify.pp(r.pp)),
        valueCell(r.hba1c != null ? r.hba1c + '%' : null, r.hba1c != null && classify.hba1c(r.hba1c)),
        valueCell(r.sys != null ? `${r.sys}/${r.dia}` : null, r.sys != null && classify.bp(r.sys, r.dia)),
        el('td', null, r.weight != null ? r.weight + ' kg' : '—'),
        el('td', 'notes', r.notes || '—')
      );

      if (options.deletable) {
        const actions = el('td', 'actions');
        const del = el('button', 'row-del');
        del.type = 'button';
        del.dataset.id = r.id;
        del.setAttribute('aria-label', 'Delete reading of ' + fmtDate(r.date));
        del.innerHTML = TRASH_ICON;
        actions.append(del);
        tr.append(actions);
      }
      tbody.append(tr);
    });
  }

  /* ---------- Trend chart (canvas) ---------- */
  const CHART = {
    fasting: '#0b5351',
    pp: '#25b8b1',
    band: 'rgba(37, 184, 177, 0.12)',
    grid: '#e3f1ef',
    text: '#5a7271'
  };

  function drawChart(canvas, emptyEl, readings) {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = readings.filter(r => r.fasting != null || r.pp != null);
    emptyEl.hidden = data.length > 0;
    if (!data.length) return;

    const pad = { t: 14, r: 18, b: 34, l: 44 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    const values = data.flatMap(r => [r.fasting, r.pp]).filter(v => v != null);
    const maxV = Math.max(250, Math.ceil((Math.max(...values) + 20) / 50) * 50);

    const x = i => pad.l + (data.length === 1 ? pw / 2 : (i * pw) / (data.length - 1));
    const y = v => pad.t + ph - (v / maxV) * ph;

    // Target range band (70–180 mg/dL)
    ctx.fillStyle = CHART.band;
    ctx.fillRect(pad.l, y(180), pw, y(70) - y(180));

    // Grid + y labels
    ctx.font = '12px Quicksand, "Segoe UI", sans-serif';
    ctx.fillStyle = CHART.text;
    ctx.strokeStyle = CHART.grid;
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= maxV; v += 50) {
      const yy = Math.round(y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(w - pad.r, yy);
      ctx.stroke();
      ctx.fillText(String(v), pad.l - 8, yy);
    }

    // X labels, thinned so they never overlap and kept inside the canvas.
    // When the readings span more than one year, show the year too (e.g. "Aug 25").
    const multiYear = data[0].date.slice(0, 4) !== data[data.length - 1].date.slice(0, 4);
    const label = iso => multiYear
      ? toDate(iso).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      : shortDate(iso);
    const step = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(pw / 70))));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.forEach((r, i) => {
      if (i % step !== 0) return;
      const text = label(r.date);
      const half = ctx.measureText(text).width / 2;
      const lx = Math.min(Math.max(x(i), pad.l + half), w - half - 2);
      ctx.fillText(text, lx, h - pad.b + 10);
    });

    // Lines + points
    ['fasting', 'pp'].forEach(key => {
      const pts = [];
      data.forEach((r, i) => { if (r[key] != null) pts.push([x(i), y(r[key])]); });
      if (!pts.length) return;

      ctx.strokeStyle = CHART[key];
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();

      ctx.lineWidth = 2;
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();
      });
    });
  }

  // Redraw a chart when the window is resized and once the web font has loaded.
  function keepChartFresh(redraw) {
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(redraw, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  }

  return {
    el, uid, loadState, saveState, session, normalizePhone, findDuplicate, createPatient, STORE_KEY,
    sortedReadings, latestOf, initials, patientMeta,
    fmtDate, todayISO, daysSince, classify, alertsFor,
    renderAlerts, renderStats, renderHistory, drawChart, keepChartFresh
  };
})();
