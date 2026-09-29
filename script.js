(function () {
  'use strict';

  /* ============ Navbar scroll state ============ */
  var nav = document.getElementById('nav');
  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  /* ============ Mobile menu ============ */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.contains('open');
      hamburger.classList.toggle('open', !isOpen);
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      mobileMenu.classList.toggle('open', !isOpen);
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  /* ============ Smooth scroll for in-page links ============ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      var target = targetId && targetId.length > 1 ? document.querySelector(targetId) : null;
      if (!target) return;
      event.preventDefault();
      closeMobileMenu();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ============ Founding Member PayPal checkout ============ */
  var paypalCheckout = document.getElementById('paypal-checkout-area');
  var paypalStatus = document.getElementById('paypal-status');
  var purchaseSuccess = document.getElementById('purchase-success');
  var subscriptionId = document.getElementById('subscription-id');
  var paypalContainer = document.getElementById('paypal-button-container-P-4XN185836X341800XNK5526Y');

  function setPayPalStatus(message, type) {
    if (!paypalStatus) return;
    paypalStatus.textContent = message || '';
    paypalStatus.className = 'paypal-status' + (type ? ' is-' + type : '');
  }

  function showPurchaseSuccess(id) {
    if (!id || !paypalCheckout || !purchaseSuccess || !subscriptionId) return;
    subscriptionId.textContent = id;
    paypalCheckout.hidden = true;
    purchaseSuccess.hidden = false;
    try {
      window.localStorage.setItem('speaklabSubscriptionID', id);
    } catch (err) {
      /* Storage is optional; the visible confirmation remains available. */
    }
  }

  function restorePurchaseSuccess() {
    try {
      var storedId = window.localStorage.getItem('speaklabSubscriptionID');
      if (storedId) showPurchaseSuccess(storedId);
    } catch (err) {
      /* Storage may be unavailable in private browsing modes. */
    }
  }

  restorePurchaseSuccess();

  if (paypalContainer && !purchaseSuccess.hidden) {
    /* A confirmed browser session does not need a second button render. */
  } else if (paypalContainer && window.paypal && window.paypal.Buttons) {
    window.paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'gold',
        layout: 'vertical',
        label: 'subscribe'
      },
      createSubscription: function (data, actions) {
        return actions.subscription.create({
          plan_id: 'P-4XN185836X341800XNK5526Y'
        });
      },
      onApprove: function (data) {
        showPurchaseSuccess(data.subscriptionID);
      },
      onCancel: function () {
        setPayPalStatus("Checkout was cancelled. You haven't been charged.", 'notice');
      },
      onError: function () {
        setPayPalStatus('Something went wrong while opening PayPal. Please try again.', 'error');
      }
    }).render('#paypal-button-container-P-4XN185836X341800XNK5526Y');
  } else if (paypalContainer) {
    setPayPalStatus('Something went wrong while opening PayPal. Please try again.', 'error');
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

  /* SPEAKLAB HERO MOTION */
  var heroProductDemo = document.querySelector('.hero-product-demo');
  var heroMotionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroMotionDesktop = window.matchMedia('(min-width: 769px)');

  if (heroProductDemo && !heroMotionReduced) {
    window.requestAnimationFrame(function () {
      heroProductDemo.classList.add('hero-motion-ready');
    });

    var heroParallaxX = 0;
    var heroParallaxY = 0;
    var heroTargetX = 0;
    var heroTargetY = 0;
    var heroParallaxFrame = null;

    function renderHeroParallax() {
      heroParallaxX += (heroTargetX - heroParallaxX) * 0.08;
      heroParallaxY += (heroTargetY - heroParallaxY) * 0.08;
      heroProductDemo.style.setProperty('--parallax-x', heroParallaxX.toFixed(2) + 'px');
      heroProductDemo.style.setProperty('--parallax-y', heroParallaxY.toFixed(2) + 'px');

      if (Math.abs(heroTargetX - heroParallaxX) > 0.05 || Math.abs(heroTargetY - heroParallaxY) > 0.05) {
        heroParallaxFrame = window.requestAnimationFrame(renderHeroParallax);
      } else {
        heroParallaxFrame = null;
      }
    }

    function requestHeroParallax() {
      if (!heroParallaxFrame) heroParallaxFrame = window.requestAnimationFrame(renderHeroParallax);
    }

    function moveHeroParallax(event) {
      if (!heroMotionDesktop.matches) return;
      var bounds = heroProductDemo.getBoundingClientRect();
      var relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      var relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
      heroTargetX = relativeX * 26;
      heroTargetY = relativeY * 26;
      requestHeroParallax();
    }

    function resetHeroParallax() {
      heroTargetX = 0;
      heroTargetY = 0;
      requestHeroParallax();
    }

    heroProductDemo.addEventListener('pointermove', moveHeroParallax, { passive: true });
    heroProductDemo.addEventListener('pointerleave', resetHeroParallax, { passive: true });
    heroMotionDesktop.addEventListener('change', resetHeroParallax);
  }

  /* ============================================================
     SPEAKLAB PRODUCT MOTION
     ============================================================ */
  var productMotionScene = document.querySelector('.product-motion-scene');
  var productMotionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var productMotionDesktop = window.matchMedia('(min-width: 900px)');

  if (productMotionScene && !productMotionReduced) {
    var productMotionStarted = false;
    var productParallaxX = 0;
    var productParallaxY = 0;
    var productTargetX = 0;
    var productTargetY = 0;
    var productParallaxFrame = null;
    var productScrollFrame = null;

    function startProductMotion() {
      if (productMotionStarted) return;
      productMotionStarted = true;
      window.requestAnimationFrame(function () {
        productMotionScene.classList.add('product-motion-ready');
      });
    }

    function renderProductParallax() {
      productParallaxX += (productTargetX - productParallaxX) * 0.075;
      productParallaxY += (productTargetY - productParallaxY) * 0.075;
      productMotionScene.style.setProperty('--product-parallax-x', productParallaxX.toFixed(2) + 'px');
      productMotionScene.style.setProperty('--product-parallax-y', productParallaxY.toFixed(2) + 'px');

      if (Math.abs(productTargetX - productParallaxX) > 0.05 || Math.abs(productTargetY - productParallaxY) > 0.05) {
        productParallaxFrame = window.requestAnimationFrame(renderProductParallax);
      } else {
        productParallaxFrame = null;
      }
    }

    function requestProductParallax() {
      if (!productParallaxFrame) productParallaxFrame = window.requestAnimationFrame(renderProductParallax);
    }

    function moveProductParallax(event) {
      if (!productMotionDesktop.matches || !productMotionStarted) return;
      var bounds = productMotionScene.getBoundingClientRect();
      var relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      var relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
      productTargetX = relativeX * 20;
      productTargetY = relativeY * 20;
      requestProductParallax();
    }

    function resetProductParallax() {
      productTargetX = 0;
      productTargetY = 0;
      requestProductParallax();
    }

    function updateProductScrollOffset() {
      productScrollFrame = null;
      if (!productMotionStarted || !productMotionDesktop.matches) {
        productMotionScene.style.setProperty('--product-scroll-main', '0px');
        productMotionScene.style.setProperty('--product-scroll-card', '0px');
        return;
      }

      var bounds = productMotionScene.getBoundingClientRect();
      var viewportCenter = window.innerHeight * 0.5;
      var sceneCenter = bounds.top + bounds.height * 0.5;
      var progress = Math.max(-1, Math.min(1, (viewportCenter - sceneCenter) / (window.innerHeight * 0.8)));
      productMotionScene.style.setProperty('--product-scroll-main', (progress * -8).toFixed(2) + 'px');
      productMotionScene.style.setProperty('--product-scroll-card', (progress * -14).toFixed(2) + 'px');
    }

    function requestProductScrollOffset() {
      if (!productScrollFrame) productScrollFrame = window.requestAnimationFrame(updateProductScrollOffset);
    }

    productMotionScene.addEventListener('pointermove', moveProductParallax, { passive: true });
    productMotionScene.addEventListener('pointerleave', resetProductParallax, { passive: true });
    productMotionDesktop.addEventListener('change', function () {
      resetProductParallax();
      requestProductScrollOffset();
    });
    window.addEventListener('scroll', requestProductScrollOffset, { passive: true });
    window.addEventListener('resize', requestProductScrollOffset, { passive: true });

    if ('IntersectionObserver' in window) {
      var productMotionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            startProductMotion();
            requestProductScrollOffset();
            productMotionObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      productMotionObserver.observe(productMotionScene);
    } else {
      startProductMotion();
      requestProductScrollOffset();
    }
  } else if (productMotionScene) {
    productMotionScene.classList.add('product-motion-ready');
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