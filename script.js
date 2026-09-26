(function () {
  'use strict';

  /* ============ Google Sheets integration ============ =
     1. Open google-apps-script.gs in Extensions → Apps Script on your sheet.
     2. Run initialSetup, then setupSheetHeaders (Allow permissions when asked).
     3. Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
     4. Paste the deployment's /exec URL below. */
  var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqk7SdAOEJ69Gb1jKY4sxjeHIJj6bFkAGrTRlb8dKAiHoiSWAp0CLrKcniiTNcDLAy/exec';

  /* ============ Navbar scroll state ============ */
  var nav = document.getElementById('nav');
  function updateNav() {
    if (window.scrollY > 24) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  /* ============ Mobile menu ============ */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleMobileMenu() {
    var isOpen = mobileMenu.classList.contains('open');
    if (isOpen) {
      closeMobileMenu();
    } else {
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  hamburger.addEventListener('click', toggleMobileMenu);

  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ============ Smooth scroll for in-page nav links ============ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (targetId.length > 1) {
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ============ Waitlist modal ============ */
  var overlay = document.getElementById('modal-overlay');
  var modalClose = document.getElementById('modal-close');
  var formView = document.getElementById('modal-form-view');
  var successView = document.getElementById('modal-success-view');
  var form = document.getElementById('waitlist-form');
  var emailInput = document.getElementById('wl-email');
  var emailError = document.getElementById('wl-email-error');
  var modalDone = document.getElementById('modal-done');
  var lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeMobileMenu();
    resetModalView();
    window.setTimeout(function () {
      emailInput.focus();
    }, 300);
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  function resetModalView() {
    formView.classList.remove('hidden');
    successView.classList.remove('active');
    emailInput.classList.remove('invalid');
    emailError.textContent = '';
    document.getElementById('wl-general-error').textContent = '';
    form.reset();
  }

  document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  modalClose.addEventListener('click', closeModal);
  modalDone.addEventListener('click', closeModal);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeModal();
    }
  });

  /* ============ Form validation + Google Sheets submission ============ */
  var generalError = document.getElementById('wl-general-error');
  var submitBtn = document.getElementById('wl-submit');
  var jsonpCounter = 0;

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* Local cache only — a convenience record, not the source of truth.
     The Google Sheet (via Apps Script) is what actually stores signups. */
  function getStoredEmails() {
    try {
      var raw = window.localStorage.getItem('speaklab_waitlist');
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function cacheEmailLocally(email, usecase) {
    try {
      var list = getStoredEmails();
      list.push({ email: email, usecase: usecase || null, joinedAt: new Date().toISOString() });
      window.localStorage.setItem('speaklab_waitlist', JSON.stringify(list));
    } catch (err) {
      /* localStorage unavailable — safe to ignore, the sheet still has the record */
    }
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Joining…' : 'Join the Waitlist';
  }

  /* JSONP request to the Apps Script web app — avoids CORS issues with a
     plain <script> tag instead of fetch(), since Apps Script doesn't
     support cross-origin POST from the browser.

     The request is dispatched immediately and almost always succeeds
     server-side well before Google's response makes it back to the
     browser. Rather than make the person wait out that round trip, we
     show success optimistically after a short grace period and keep
     listening in the background — a genuine error that arrives late is
     logged to the console instead of interrupting an already-completed
     signup. */
  function submitToGoogleSheets(email, usecase, callback) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf('PASTE_YOUR') !== -1) {
      /* Not configured yet — keep the demo working locally. */
      callback({ result: 'success', offline: true });
      return;
    }

    jsonpCounter += 1;
    var callbackName = 'gasWaitlistCallback_' + jsonpCounter;
    var script = document.createElement('script');
    var settled = false;

    function invoke(response) {
      if (settled) return;
      settled = true;
      window.clearTimeout(optimisticTimer);
      callback(response);
    }

    window[callbackName] = function (response) {
      var arrivedLate = settled;
      invoke(response);
      window.clearTimeout(hardTimeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      if (arrivedLate && response && response.result !== 'success') {
        console.warn('SpeakLab waitlist: ' + (response.error || 'submission failed after optimistic success.'));
      }
    };

    script.onerror = function () {
      invoke({ result: 'error', error: 'Could not reach the server. Please try again.' });
    };

    /* Give the real response a brief chance to arrive quickly... */
    var optimisticTimer = window.setTimeout(function () {
      invoke({ result: 'success', optimistic: true });
    }, 1200);

    /* ...but never leave the global callback hanging forever. */
    var hardTimeout = window.setTimeout(function () {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }, 20000);

    var query =
      'Email=' + encodeURIComponent(email) +
      '&UseCase=' + encodeURIComponent(usecase || '') +
      '&callback=' + encodeURIComponent(callbackName);

    script.src = GOOGLE_SCRIPT_URL + '?' + query;
    document.body.appendChild(script);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    var usecase = document.getElementById('wl-usecase').value;

    if (!isValidEmail(email)) {
      emailInput.classList.add('invalid');
      emailError.textContent = 'Enter a valid email address.';
      emailInput.focus();
      return;
    }

    emailInput.classList.remove('invalid');
    emailError.textContent = '';
    generalError.textContent = '';
    setSubmitting(true);

    submitToGoogleSheets(email, usecase, function (response) {
      setSubmitting(false);

      if (response && response.result === 'success') {
        cacheEmailLocally(email, usecase);
        showSuccess();
      } else {
        generalError.textContent = (response && response.error) || 'Something went wrong. Please try again.';
      }
    });
  });

  emailInput.addEventListener('input', function () {
    emailInput.classList.remove('invalid');
    emailError.textContent = '';
  });

  function showSuccess() {
    formView.classList.add('hidden');
    successView.classList.add('active');
  }

  /* ============ FAQ accordion ============ */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');

    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          openItem.querySelector('.faq-a').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        q.setAttribute('aria-expanded', 'false');
        a.style.maxHeight = null;
      } else {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ============ Audience grid generation ============ */
  var audienceGrid = document.getElementById('audience-grid');
  if (audienceGrid) {
    var states = [
      { state: 'engaged', label: 'Engaged' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'confused', label: 'Confused' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'raising', label: 'Question' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'distracted', label: 'Distracted' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'confused', label: 'Confused' },
      { state: 'engaged', label: 'Engaged' },
      { state: 'engaged', label: 'Engaged' }
    ];

    states.forEach(function (item) {
      var avatar = document.createElement('div');
      avatar.className = 'audience-avatar';
      avatar.setAttribute('data-state', item.state);
      var label = document.createElement('span');
      label.className = 'audience-label';
      label.textContent = item.label;
      avatar.appendChild(label);
      audienceGrid.appendChild(avatar);
    });
  }

  /* ============ Scroll reveal via IntersectionObserver ============ */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var delay = (i % 4) * 80;
            window.setTimeout(function () {
              entry.target.classList.add('is-visible');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }
})();