/* =========================================================
   EUREKA · Diabetic Care Club
   Shared script: header, navigation, footer year, enquiry form
   ========================================================= */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);

  /* ---------- Header shadow on scroll ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  const navToggle = $('#navToggle');
  const siteNav = $('#siteNav');

  function setNav(open) {
    siteNav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  navToggle.addEventListener('click', () => setNav(!siteNav.classList.contains('open')));
  siteNav.addEventListener('click', e => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });
  document.addEventListener('click', e => {
    if (siteNav.classList.contains('open') && !e.target.closest('.site-header')) setNav(false);
  });

  /* ---------- Patient login button ---------- */
  // Once a patient has logged in (this tab), the header button leads to their record.
  const loginBtn = $('#loginBtn');
  let loggedIn = false;
  try { loggedIn = Boolean(sessionStorage.getItem('eureka-dcc-session')); } catch (e) { /* ignore */ }
  if (loginBtn && loggedIn) {
    loginBtn.href = 'my-record.html';
    loginBtn.querySelector('.login-text').textContent = 'My Record';
  }

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Enquiry form (contact page) ---------- */
  const enquiryForm = $('#enquiryForm');
  if (enquiryForm) {
    const WHATSAPP_NUMBER = '919088350914';
    const msg = $('#enquiryMsg');

    enquiryForm.addEventListener('submit', e => {
      e.preventDefault();
      const f = enquiryForm.elements;
      const name = f.namedItem('name').value.trim();
      const phone = f.namedItem('phone').value.trim();
      const topic = f.namedItem('topic').value;
      const message = f.namedItem('message').value.trim();

      let text = `Hello Diabetic Care Club,\n\nName: ${name}\nPhone: ${phone}\nI want to: ${topic}`;
      if (message) text += `\n\n${message}`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      msg.textContent = 'WhatsApp has opened in a new tab — press send there to reach us.';
      enquiryForm.reset();
    });
  }
})();
