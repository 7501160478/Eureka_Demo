/* =========================================================
   EUREKA · Diabetic Care Club
   Staff page: patient records & continuous monitoring (records.html)
   Uses the shared helpers in health.js (window.DCC).
   ========================================================= */
(function () {
  'use strict';

  const D = window.DCC;
  const { el } = D;
  const $ = (sel, root = document) => root.querySelector(sel);

  function readState() {
    const s = D.loadState();
    if (!s.nextNo) s.nextNo = s.patients.length + 1;
    if (!s.patients.some(p => p.id === s.selectedId)) {
      s.selectedId = s.patients.length ? s.patients[0].id : null;
    }
    return s;
  }

  let state = readState();
  const save = () => D.saveState(state);

  const ui = { search: '', filter: 'all' };
  const currentPatient = () => state.patients.find(p => p.id === state.selectedId) || null;

  /* ---------- Elements ---------- */
  const listEl = $('#patientList');
  const searchEl = $('#patientSearch');
  const filterTabs = document.querySelectorAll('[data-filter]');
  const emptyState = $('#emptyState');
  const detailView = $('#detailView');
  const canvas = $('#trendChart');
  const chartEmpty = $('#chartEmpty');
  const historyBody = $('#historyBody');

  const registerDialog = $('#registerDialog');
  const readingDialog = $('#readingDialog');
  const patientForm = $('#patientForm');
  const readingForm = $('#readingForm');

  patientForm.elements.namedItem('since').max = new Date().getFullYear();

  function showMsg(target, text, isError) {
    target.textContent = text;
    target.classList.toggle('error', Boolean(isError));
  }

  /* ---------- Rendering ---------- */
  function render() {
    const alerts = new Map(state.patients.map(p => [p.id, D.alertsFor(p)]));
    renderOverview(alerts);
    renderList(alerts);
    renderDetail(alerts);
  }

  function renderOverview(alerts) {
    let recent = 0;
    let total = 0;
    state.patients.forEach(p => {
      total += p.readings.length;
      recent += p.readings.filter(r => D.daysSince(r.date) <= 30).length;
    });
    const attention = [...alerts.values()].filter(a => a.length).length;

    $('#ovPatients').textContent = state.patients.length;
    $('#ovAttention').textContent = attention;
    $('#ovRecent').textContent = recent;
    $('#ovTotal').textContent = total;
    $('#countAll').textContent = state.patients.length;
    $('#countAttention').textContent = attention;
  }

  function renderList(alerts) {
    const q = ui.search.toLowerCase();
    const items = state.patients
      .filter(p => ui.filter === 'all' || alerts.get(p.id).length)
      .filter(p => !q || [p.name, p.code, p.phone].some(v => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => (alerts.get(b.id).length > 0) - (alerts.get(a.id).length > 0) || a.name.localeCompare(b.name));

    listEl.innerHTML = '';
    if (!items.length) {
      const text = !state.patients.length
        ? 'No patients registered yet.'
        : ui.filter === 'attention' && !q
          ? 'No patient needs attention right now.'
          : 'No patients match your search.';
      listEl.append(el('li', 'list-empty', text));
      return;
    }

    items.forEach(p => {
      const a = alerts.get(p.id);
      const li = document.createElement('li');
      const btn = el('button', 'patient-item');
      btn.type = 'button';
      btn.dataset.id = p.id;
      if (p.id === state.selectedId) btn.setAttribute('aria-current', 'true');

      const info = el('span', 'p-info');
      info.append(el('span', 'p-name', p.name), el('span', 'p-sub', `${p.code} · ${p.type}`));

      const dot = el('span', 'dot' + (a.length ? ' alert' : ''));
      dot.title = a.length ? 'Needs attention' : 'Latest readings within limits';

      btn.append(el('span', 'avatar', D.initials(p.name)), info, dot);
      li.append(btn);
      listEl.append(li);
    });
  }

  function renderDetail(alerts) {
    const p = currentPatient();
    emptyState.hidden = Boolean(p);
    detailView.hidden = !p;
    if (!p) return;

    const readings = D.sortedReadings(p);
    $('#dAvatar').textContent = D.initials(p.name);
    $('#dName').textContent = p.name;
    $('#dMeta').textContent = D.patientMeta(p);
    D.renderAlerts($('#dAlerts'), alerts.get(p.id));
    D.renderStats($('#stats'), readings);
    D.renderHistory(historyBody, readings, {
      deletable: true,
      emptyText: 'No readings recorded yet. Use “Add reading” to log the first one.'
    });
    D.drawChart(canvas, chartEmpty, readings);
  }

  D.keepChartFresh(() => D.drawChart(canvas, chartEmpty, D.sortedReadings(currentPatient())));

  /* ---------- Dialogs ---------- */
  function openDialog(dialog) {
    dialog.querySelector('.form-msg').textContent = '';
    dialog.showModal();
  }

  [registerDialog, readingDialog].forEach(dialog => {
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
  });

  function openRegister() {
    patientForm.reset();
    openDialog(registerDialog);
  }
  $('#openRegister').addEventListener('click', openRegister);
  $('#emptyRegister').addEventListener('click', openRegister);

  $('#openReading').addEventListener('click', () => {
    const p = currentPatient();
    if (!p) return;
    readingForm.reset();
    const date = readingForm.elements.namedItem('date');
    date.value = D.todayISO();
    date.max = D.todayISO();
    $('#readingFor').textContent = `For ${p.name} (${p.code})`;
    openDialog(readingDialog);
  });

  /* ---------- Forms ---------- */
  patientForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = patientForm.elements;
    const val = name => f.namedItem(name).value.trim();
    const msg = $('#patientMsg');
    const name = val('fullName');
    const phone = val('phone');

    if (!name) {
      showMsg(msg, 'Please enter the patient name.', true);
      return;
    }
    if (D.normalizePhone(phone).length !== 10) {
      showMsg(msg, 'Enter a valid 10-digit mobile number.', true);
      return;
    }
    if (D.findDuplicate(state, name, phone)) {
      showMsg(msg, 'A patient with this name and mobile number is already registered.', true);
      return;
    }

    const patient = D.createPatient(state, {
      name,
      age: val('age') ? Number(val('age')) : null,
      gender: val('gender'),
      phone,
      type: val('type'),
      since: val('since') ? Number(val('since')) : null
    });
    state.selectedId = patient.id;
    ui.filter = 'all';
    ui.search = '';
    searchEl.value = '';
    filterTabs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
    save();
    registerDialog.close();
    render();
  });

  readingForm.addEventListener('submit', e => {
    e.preventDefault();
    const p = currentPatient();
    if (!p) return;

    const f = readingForm.elements;
    const num = name => {
      const v = f.namedItem(name).value.trim();
      return v === '' ? null : Number(v);
    };
    const msg = $('#readingMsg');

    const reading = {
      id: D.uid(),
      created: Date.now(),
      date: f.namedItem('date').value,
      fasting: num('fasting'),
      pp: num('pp'),
      hba1c: num('hba1c'),
      sys: num('sys'),
      dia: num('dia'),
      weight: num('weight'),
      notes: f.namedItem('notes').value.trim()
    };

    if (!reading.date) {
      showMsg(msg, 'Please choose the reading date.', true);
      return;
    }
    if ((reading.sys == null) !== (reading.dia == null)) {
      showMsg(msg, 'Enter both systolic and diastolic BP.', true);
      return;
    }
    if ([reading.fasting, reading.pp, reading.hba1c, reading.sys, reading.weight].every(v => v == null)) {
      showMsg(msg, 'Enter at least one measurement.', true);
      return;
    }

    p.readings.push(reading);
    save();
    readingDialog.close();
    render();
  });

  /* ---------- List, search & filters ---------- */
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.patient-item');
    if (!btn) return;
    state.selectedId = btn.dataset.id;
    save();
    render();
    if (window.matchMedia('(max-width: 960px)').matches) {
      detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  searchEl.addEventListener('input', () => {
    ui.search = searchEl.value.trim();
    render();
  });

  filterTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      ui.filter = btn.dataset.filter;
      filterTabs.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    });
  });

  /* ---------- Delete ---------- */
  $('#deletePatient').addEventListener('click', () => {
    const p = currentPatient();
    if (!p) return;
    if (!confirm(`Remove ${p.name} (${p.code}) and all their readings? This cannot be undone.`)) return;
    state.patients = state.patients.filter(x => x.id !== p.id);
    state.selectedId = state.patients.length ? state.patients[0].id : null;
    save();
    render();
  });

  historyBody.addEventListener('click', e => {
    const btn = e.target.closest('.row-del');
    const p = currentPatient();
    if (!btn || !p) return;
    if (!confirm('Delete this reading?')) return;
    p.readings = p.readings.filter(r => r.id !== btn.dataset.id);
    save();
    render();
  });

  // Another tab (e.g. a patient registering) changed the records — reload so nothing is overwritten.
  window.addEventListener('storage', e => {
    if (e.key !== D.STORE_KEY) return;
    const selected = state.selectedId;
    state = readState();
    if (state.patients.some(p => p.id === selected)) state.selectedId = selected;
    render();
  });

  /* ---------- Init ---------- */
  render();
})();
