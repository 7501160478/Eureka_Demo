/* =========================================================
   EUREKA · Diabetic Care Club
   Patient login (login.html): Patient ID + registered mobile number
   ========================================================= */
(function () {
  'use strict';

  const D = window.DCC;
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');

  // Already logged in on this tab — go straight to the record.
  const state = D.loadState();
  const activeId = D.session.get();
  if (activeId && state.patients.some(p => p.id === activeId)) {
    location.replace('my-record.html');
    return;
  }

  function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
  }

  form.addEventListener('input', () => { errorBox.hidden = true; });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements;
    const code = f.namedItem('patientId').value.trim().toUpperCase();
    const mobile = D.normalizePhone(f.namedItem('mobile').value);

    if (!code || mobile.length !== 10) {
      showError('Please enter your Patient ID and your 10-digit mobile number.');
      return;
    }

    // Read fresh data in case staff registered the patient in another tab.
    const patient = D.loadState().patients.find(p => p.code.toUpperCase() === code);

    if (!patient) {
      showError('Patient ID or mobile number is incorrect. Please check and try again.');
      return;
    }
    if (!D.normalizePhone(patient.phone)) {
      showError('No mobile number is registered for this Patient ID. Please call the club to update it.');
      return;
    }
    if (D.normalizePhone(patient.phone) !== mobile) {
      showError('Patient ID or mobile number is incorrect. Please check and try again.');
      return;
    }

    D.session.set(patient.id);
    location.href = 'my-record.html';
  });
})();
