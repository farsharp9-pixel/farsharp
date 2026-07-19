/* ============================================================
   enhance.js — motion & interaction layer for v2
   Independent of script.js; only adds behaviour, never removes.
   Respects prefers-reduced-motion and touch devices.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer:fine)').matches;
  var lerp = function (a, b, n) { return a + (b - a) * n; };
  var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };

  /* ---- Preloader ------------------------------------------------ */
  document.body.classList.add('is-loading');
  function hidePreloader() {
    var p = document.getElementById('preloader');
    document.body.classList.remove('is-loading');
    document.body.classList.add('loaded');
    if (p) { p.classList.add('done'); setTimeout(function () { p.remove(); }, 800); }
  }
  var preloaderDone = false;
  function doHide() { if (!preloaderDone) { preloaderDone = true; hidePreloader(); } }
  if (reduce) { doHide(); }
  else {
    window.addEventListener('load', function () { setTimeout(doHide, 500); });
    setTimeout(doHide, 2600); // safety net
  }

  /* ---- Custom cursor ------------------------------------------- */
  if (finePointer && !reduce) {
    var dot = document.getElementById('cursorDot');
    var ring = document.getElementById('cursorRing');
    if (dot && ring) {
      document.documentElement.classList.add('has-cursor');
      var mx = window.innerWidth / 2, my = window.innerHeight / 2;
      var rx = mx, ry = my, shown = false;
      window.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!shown) { shown = true; dot.classList.add('on'); ring.classList.add('on'); }
        dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      });
      (function raf() {
        rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        requestAnimationFrame(raf);
      })();
      var hot = 'a,button,.mini-card,.brand-card,.service,.system-card,.lang-toggle,.hero-polaroid,.collage-vinyl,input,textarea,select,label';
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest(hot)) ring.classList.add('hot');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest(hot)) ring.classList.remove('hot');
      });
      document.addEventListener('mousedown', function () { ring.classList.add('press'); });
      document.addEventListener('mouseup', function () { ring.classList.remove('press'); });
      window.addEventListener('mouseleave', function () { dot.classList.remove('on'); ring.classList.remove('on'); });
    }
  }

  /* ---- Scroll progress + nav + back-to-top --------------------- */
  var progress = document.getElementById('scrollProgress');
  var nav = document.querySelector('nav');
  var lastY = window.pageYOffset;
  var toTop = document.createElement('button');
  toTop.className = 'to-top'; toTop.setAttribute('aria-label', 'Back to top'); toTop.innerHTML = '↑';
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  document.body.appendChild(toTop);

  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (nav) {
      nav.classList.toggle('nav-scrolled', y > 40);
      if (y > 320 && y > lastY) nav.classList.add('nav-hidden');
      else nav.classList.remove('nav-hidden');
    }
    toTop.classList.toggle('show', y > 600);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- Active nav link ----------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = navLinks.map(function (a) {
    var id = a.getAttribute('href'); return (id && id.charAt(0) === '#' && id.length > 1) ? document.querySelector(id) : null;
  });
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a, i) { a.classList.toggle('active', sections[i] === en.target); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) navObs.observe(s); });
  }

  /* ---- Counters ------------------------------------------------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce) { el.textContent = target; return; }
    var start = performance.now(), dur = 1200;
    (function step(now) {
      var t = clamp((now - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  /* ---- Skill bars ---------------------------------------------- */
  var skillFills = Array.prototype.slice.call(document.querySelectorAll('.skill-fill'));
  skillFills.forEach(function (el) { el.dataset.w = el.style.width || getComputedStyle(el).width; if (!reduce) el.style.width = '0'; });

  if ('IntersectionObserver' in window) {
    var oneShot = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        if (t.classList.contains('cnum')) animateCount(t);
        if (t.classList.contains('skill-fill')) t.style.width = t.dataset.w;
        obs.unobserve(t);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.cnum').forEach(function (el) { oneShot.observe(el); });
    skillFills.forEach(function (el) { oneShot.observe(el); });
  } else {
    document.querySelectorAll('.cnum').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    skillFills.forEach(function (el) { el.style.width = el.dataset.w; });
  }

  /* ---- Parallax (mouse + scroll), uses CSS `translate` --------- */
  if (!reduce) {
    var topo = document.querySelector('.bg-topo');
    var layers = [
      { el: document.querySelector('.blot-1'), f: 26 },
      { el: document.querySelector('.blot-2'), f: -32 },
      { el: document.querySelector('.collage-photo-1'), f: 18 },
      { el: document.querySelector('.collage-photo-2'), f: -22 },
      { el: document.querySelector('.collage-stamp'), f: 30 },
      { el: document.querySelector('.collage-vinyl'), f: -26 },
      { el: document.querySelector('.collage-fern'), f: 14 },
      { el: document.querySelector('.collage-crossword'), f: 22 }
    ].filter(function (l) { return l.el; });
    var pmx = 0, pmy = 0, tmx = 0, tmy = 0, sY = 0;
    window.addEventListener('mousemove', function (e) {
      tmx = (e.clientX / window.innerWidth - 0.5);
      tmy = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
    window.addEventListener('scroll', function () { sY = window.pageYOffset; }, { passive: true });
    (function paraLoop() {
      pmx = lerp(pmx, tmx, 0.06); pmy = lerp(pmy, tmy, 0.06);
      if (topo) topo.style.translate = (pmx * 22).toFixed(1) + 'px ' + (pmy * 22 + sY * 0.12).toFixed(1) + 'px';
      layers.forEach(function (l) {
        l.el.style.translate = (pmx * l.f).toFixed(1) + 'px ' + (pmy * l.f).toFixed(1) + 'px';
      });
      requestAnimationFrame(paraLoop);
    })();
  }

  /* ---- Magnetic buttons (uses CSS `translate`) ----------------- */
  if (finePointer && !reduce) {
    document.querySelectorAll('.btn-ink,.btn-ghost,.nav-cta,.system-btn,.whatsapp-cta').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.3;
        var y = (e.clientY - r.top - r.height / 2) * 0.4;
        btn.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      btn.addEventListener('mouseleave', function () { btn.style.translate = '0 0'; });
    });
  }

  /* ---- Card tilt ------------------------------------------------ */
  if (finePointer && !reduce) {
    document.querySelectorAll('.mini-card,.service,.system-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
        card.classList.add('tilt-active');
      });
      card.addEventListener('mouseleave', function () {
        card.classList.remove('tilt-active');
        card.style.removeProperty('--rx'); card.style.removeProperty('--ry');
      });
    });
  }

  /* ---- Smooth anchor scroll ------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    a.addEventListener('click', function (e) {
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
})();
