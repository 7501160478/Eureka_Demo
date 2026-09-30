/* =========================================================
   EUREKA · Diabetic Care Club
   Patient self-registration (register.html)
   ========================================================= */
(function () {
  'use strict';

  const D = window.DCC;
  const $ = sel => document.querySelector(sel);

  const form = $('#registerForm');
  const errorBox = $('#registerError');
  const successBox = $('#registerSuccess');
  let newPatientId = null;

  form.elements.namedItem('since').max = new Date().getFullYear();

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('input', () => { errorBox.hidden = true; });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    const val = name => f.namedItem(name).value.trim();

    const name = val('fullName');
    const phone = val('phone');
    const age = Number(val('age'));
    const since = val('since') ? Number(val('since')) : null;

    if (!name) return showError('Please enter your full name.');
    if (!age || age < 1 || age > 120) return showError('Please enter a valid age.');
    if (!val('gender')) return showError('Please select your gender.');
    if (D.normalizePhone(phone).length !== 10) return showError('Please enter a valid 10-digit mobile number.');
    if (!val('type')) return showError('Please select your diabetes type.');
    if (since && (since < 1950 || since > new Date().getFullYear())) return showError('Please enter a valid year of diagnosis.');

    // Read fresh data so a registration made elsewhere is never overwritten.
    const state = D.loadState();
    if (D.findDuplicate(state, name, phone)) {
      return showError('You are already registered with this name and mobile number. Please log in, or call the club if you have forgotten your Patient ID.');
    }

    const patient = D.createPatient(state, {
      name,
      age,
      gender: val('gender'),
      phone,
      type: val('type'),
      since
    });
    D.saveState(state);
    newPatientId = patient.id;

    $('#newCode').textContent = patient.code;
    $('#newName').textContent = patient.name.split(/\s+/)[0];
    form.hidden = true;
    successBox.hidden = false;
    successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('#goToRecord').addEventListener('click', () => {
    if (!newPatientId) return;
    D.session.set(newPatientId);
    location.href = 'my-record.html';
  });
})();
