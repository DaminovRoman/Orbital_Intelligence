/* ==========================================================================
   ORBITAL INTELLIGENCE — Interaction & Simulation Layer
   Vanilla JS. No external dependencies.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  mqReducedMotion.addEventListener('change', function (e) { prefersReducedMotion = e.matches; });

  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ------------------------------------------------------------------
     PRELOADER
     Driven entirely by elapsed wall-clock time against a short, fixed
     total duration — never by "window.load" or any other browser
     event, which some embedded/preview WebViews throttle, delay, or
     never dispatch at all. A single timestamp-based function computes
     percent + message for "now" and is called from three independent
     sources (interval, animation frame, and visibility-change) so if
     any one of those gets paused by the host environment, another
     still catches it up to the correct value — it can never freeze on
     a stale number. A hard-capped total duration means the layer is
     always gone within ~2.3s of starting, no matter what the page or
     network is doing. Runs independently of the hero's own entrance
     timers in initHeroPanels — that sequence plays out underneath/
     after this layer is gone.
  ------------------------------------------------------------------ */
  (function initPreloader() {
    var root = document.getElementById('preloader');
    if (!root) return;

    var percentEl = document.getElementById('preloaderPercent');
    var barFillEl = document.getElementById('preloaderBarFill');
    var labelEl = document.getElementById('preloaderLabel');
    var body = document.body;

    var messages = [
      'Инициализация данных',
      'Синхронизация телеметрии',
      'Калибровка орбитальных моделей',
      'Подготовка интерфейса',
      'Готово'
    ];

    function removeLayer() {
      root.classList.add('is-done');
      body.classList.remove('is-loading');
      window.setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      }, 650);
    }

    if (prefersReducedMotion) {
      // Skip the choreography entirely: show 100% briefly, then remove.
      if (percentEl) percentEl.textContent = '100';
      if (barFillEl) barFillEl.style.width = '100%';
      if (labelEl) labelEl.textContent = 'Готово';
      window.setTimeout(removeLayer, 240);
      return;
    }

    var shownPercent = -1;
    function setPercent(p) {
      var clamped = Math.max(0, Math.min(100, Math.round(p)));
      if (clamped === shownPercent) return;
      shownPercent = clamped;
      if (percentEl) percentEl.textContent = String(clamped);
      if (barFillEl) barFillEl.style.width = clamped + '%';
    }

    var shownMessageIndex = -1;
    function setMessageByIndex(i) {
      if (!labelEl || i === shownMessageIndex) return;
      shownMessageIndex = i;
      labelEl.style.opacity = '0';
      window.setTimeout(function () {
        labelEl.textContent = messages[i];
        labelEl.style.opacity = '1';
      }, 160);
    }

    // Short, fixed total: this is a visual flourish, not a real
    // loading gate, so it should never ask the person to wait more
    // than ~2 seconds regardless of what the page is actually doing.
    var startTime = Date.now();
    var totalDuration = 1800;
    var finished = false;

    function valueAt(elapsed) {
      var t = Math.min(1, elapsed / totalDuration);
      // Ease-out cubic: quick climb, gentle settle into 100%.
      return 1 - Math.pow(1 - t, 3);
    }

    function update() {
      if (finished) return true;
      var elapsed = Date.now() - startTime;

      if (elapsed >= totalDuration) {
        finish();
        return true;
      }

      setPercent(valueAt(elapsed) * 100);

      var msgIndex = Math.min(
        messages.length - 2,
        Math.floor((elapsed / totalDuration) * (messages.length - 1))
      );
      setMessageByIndex(Math.max(0, msgIndex));
      return false;
    }

    function finish() {
      if (finished) return;
      finished = true;
      setMessageByIndex(messages.length - 1);
      setPercent(100);
      window.setTimeout(removeLayer, 300);
    }

    // Source 1: a steady interval — the primary driver.
    var intervalHandle = window.setInterval(function () {
      if (update()) window.clearInterval(intervalHandle);
    }, 40);

    // Source 2: requestAnimationFrame as a second, independent driver.
    // If the host throttles setInterval but still paints frames (or
    // vice versa), this keeps the timeline moving either way.
    function rafLoop() {
      if (update()) return;
      window.requestAnimationFrame(rafLoop);
    }
    window.requestAnimationFrame(rafLoop);

    // Source 3: catch up immediately if the page regains visibility
    // after being backgrounded, instead of waiting for the next tick.
    if (document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') update();
      });
    }

    update();
  })();

  /* ------------------------------------------------------------------
     UTIL
  ------------------------------------------------------------------ */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(min, max) { return min + Math.random() * (max - min); }

  function setupHiDPICanvas(canvas, cssW, cssH) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /* ------------------------------------------------------------------
     NAVIGATION — scroll contrast + mobile menu
  ------------------------------------------------------------------ */
  (function initNav() {
    var nav = document.getElementById('siteNav');
    var burger = document.getElementById('navBurger');
    var mobileMenu = document.getElementById('mobileMenu');

    function onScroll() {
      if (window.scrollY > 24) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function closeMenu() {
      burger.setAttribute('aria-expanded', 'false');
      mobileMenu.hidden = true;
      nav.classList.remove('is-menu-open');
      document.body.style.overflow = '';
    }
    function openMenu() {
      burger.setAttribute('aria-expanded', 'true');
      mobileMenu.hidden = false;
      nav.classList.add('is-menu-open');
      document.body.style.overflow = 'hidden';
    }

    burger.addEventListener('click', function () {
      var isOpen = burger.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeMenu(); else openMenu();
    });

    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') closeMenu();
    });

    // Close mobile menu if viewport grows past breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeMenu();
    });
  })();

  /* ------------------------------------------------------------------
     TEXT SPLITTING — wraps words/chars in spans ahead of reveal
     Splits headings/eyebrows marked [data-reveal-text] into per-word
     spans (each clipped by an overflow wrapper so they rise from
     underneath their own baseline), and [data-reveal-chars] into
     per-character spans with an incremental delay for a typewriter feel.
  ------------------------------------------------------------------ */
  (function initTextSplit() {
    function splitWords(el) {
      // Preserve a trailing &nbsp; join (used in hero/CTA headings) by
      // walking text nodes rather than naive innerHTML.split(' ').
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var textNodes = [];
      var n;
      while ((n = walker.nextNode())) textNodes.push(n);

      textNodes.forEach(function (node) {
        var text = node.nodeValue;
        if (!text || !text.trim()) return;
        var frag = document.createDocumentFragment();
        // Split on spaces but keep &nbsp;-joined pairs together as one "word"
        var parts = text.split(/( )/);
        parts.forEach(function (part) {
          if (part === '') return;
          if (part === ' ') {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          var wrap = document.createElement('span');
          wrap.className = 'word-wrap';
          var word = document.createElement('span');
          word.className = 'word';
          word.textContent = part;
          wrap.appendChild(word);
          frag.appendChild(wrap);
        });
        node.parentNode.replaceChild(frag, node);
      });
    }

    function splitChars(el) {
      // Letters are grouped into per-word nowrap spans, all inside ONE
      // wrapper span. The wrapper matters: .eyebrow is display:inline-flex
      // (dot + text), so if each letter were a direct child it would
      // become its own flex item — separated by the flex gap, never
      // wrapping, and forcing the row wider than the viewport. With a
      // single wrapper the text is one flex item and wraps normally.
      var text = el.textContent;
      el.textContent = '';
      var wrap = document.createElement('span');
      wrap.className = 'chars';
      var wordEl = null;
      Array.prototype.forEach.call(text, function (ch) {
        if (ch === ' ') {
          wordEl = null;
          wrap.appendChild(document.createTextNode(' '));
          return;
        }
        if (!wordEl) {
          wordEl = document.createElement('span');
          wordEl.className = 'char-word';
          wrap.appendChild(wordEl);
        }
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        wordEl.appendChild(span);
      });
      el.appendChild(wrap);
    }

    var wordTargets = document.querySelectorAll('[data-reveal-text]');
    wordTargets.forEach(function (el) {
      if (prefersReducedMotion) return; // keep plain text, CSS already shows it fully
      splitWords(el);
      var words = el.querySelectorAll('.word');
      words.forEach(function (w, i) {
        w.style.setProperty('--word-delay', Math.min(i * 42, 520) + 'ms');
      });
    });

    var charTargets = document.querySelectorAll('[data-reveal-chars]');
    charTargets.forEach(function (el) {
      if (prefersReducedMotion) return;
      splitChars(el);
      var chars = el.querySelectorAll('.char');
      chars.forEach(function (c, i) {
        c.style.setProperty('--char-delay', Math.min(i * 18, 400) + 'ms');
      });
    });
  })();

  /* ------------------------------------------------------------------
     SCROLL STORYTELLING — IntersectionObserver reveal
     Handles [data-reveal] (and its variants), [data-reveal-text],
     [data-reveal-chars] and [data-reveal-group] (staggered children)
     all through a single observer keyed off the is-in class.
  ------------------------------------------------------------------ */
  (function initReveal() {
    var selector = '[data-reveal], [data-reveal-text], [data-reveal-chars], [data-reveal-group]';
    var items = document.querySelectorAll(selector);
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // Staggered groups (grids/lists): give each child an incremental
    // transition-delay so items cascade in rather than popping together.
    document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.transitionDelay = Math.min(i * 90, 540) + 'ms';
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------
     SCROLL PROGRESS BAR — fixed top-of-viewport indicator
  ------------------------------------------------------------------ */
  (function initScrollProgress() {
    var bar = document.getElementById('scrollProgressBar');
    if (!bar) return;

    var ticking = false;
    function update() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? clamp((scrollTop / docHeight) * 100, 0, 100) : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ------------------------------------------------------------------
     GENTLE SCROLL PARALLAX — subtle depth on marked elements
     Moves [data-parallax] elements a fraction of scroll delta while
     they're near the viewport, using translate3d for GPU compositing.
     Skipped entirely under reduced motion.
  ------------------------------------------------------------------ */
  (function initParallax() {
    if (prefersReducedMotion) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;

    var speeds = els.map(function (el) {
      return parseFloat(el.getAttribute('data-parallax')) || 0.08;
    });

    var ticking = false;
    function update() {
      var vh = window.innerHeight;
      els.forEach(function (el, i) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return; // skip offscreen work
        var centerOffset = (rect.top + rect.height / 2) - vh / 2;
        var shift = centerOffset * speeds[i] * -1;
        el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ------------------------------------------------------------------
     HERO PANEL ENTRANCE — staggered, triggered once in view
  ------------------------------------------------------------------ */
  (function initHeroPanels() {
    var panels = document.querySelectorAll('.hero__panel');
    var introEls = document.querySelectorAll('.hero-intro');

    if (prefersReducedMotion) {
      panels.forEach(function (p) { p.classList.add('is-visible'); });
      introEls.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!panels.length && !introEls.length) return;

    // Stagger the hero text block in first (eyebrow → title → subtitle →
    // actions → meta), then let the floating data panels rise in.
    introEls.forEach(function (el, i) {
      el.style.transitionDelay = (i * 110) + 'ms';
    });

    window.requestAnimationFrame(function () {
      setTimeout(function () {
        introEls.forEach(function (el) { el.classList.add('is-in'); });
        panels.forEach(function (p) { p.classList.add('is-visible'); });
      }, 120);
    });
  })();

  /* ------------------------------------------------------------------
     MAGNETIC CTA — subtle pointer attraction (mouse only)
  ------------------------------------------------------------------ */
  (function initMagnetic() {
    if (isTouch || prefersReducedMotion) return;
    var buttons = document.querySelectorAll('.magnetic');
    buttons.forEach(function (btn) {
      var strength = 10;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = 'translate(' + (x / rect.width * strength) + 'px,' + (y / rect.height * strength) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate(0,0)';
      });
    });
  })();

  /* ------------------------------------------------------------------
     HERO CANVAS — abstract planet with orbital rings + light points
  ------------------------------------------------------------------ */
  (function initHeroCanvas() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    var scene = canvas.closest('.hero__scene');
    var ctx, W, H, cx, cy, planetR;
    var rings = [];
    var points = [];
    var raf = null;
    var running = true;
    var lastTime = 0;

    function buildScene() {
      var rect = scene.getBoundingClientRect();
      W = rect.width; H = rect.height;
      ctx = setupHiDPICanvas(canvas, W, H);
      cx = W * 0.58;
      cy = H * 0.5;
      planetR = Math.min(W, H) * 0.19;

      rings = [
        { rx: planetR * 1.9, ry: planetR * 0.62, tilt: -0.32, speed: 0.00018 },
        { rx: planetR * 2.5, ry: planetR * 0.95, tilt: 0.18, speed: -0.00012 },
        { rx: planetR * 3.15, ry: planetR * 1.3, tilt: -0.08, speed: 0.00009 }
      ];

      points = [];
      rings.forEach(function (ring, ringIndex) {
        var count = 2 + ringIndex;
        for (var i = 0; i < count; i++) {
          points.push({
            ringIndex: ringIndex,
            angle: rand(0, Math.PI * 2),
            speed: ring.speed * rand(2.2, 3.4) * (ringIndex % 2 === 0 ? 1 : -1),
            size: rand(1.4, 2.6)
          });
        }
      });
    }

    function drawRing(ring, t) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring.tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      var grad = ctx.createLinearGradient(-ring.rx, 0, ring.rx, 0);
      grad.addColorStop(0, 'rgba(102,231,255,0)');
      grad.addColorStop(0.5, 'rgba(88,124,255,0.35)');
      grad.addColorStop(1, 'rgba(102,231,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    function drawPlanet(t) {
      var grad = ctx.createRadialGradient(cx - planetR * 0.3, cy - planetR * 0.3, planetR * 0.1, cx, cy, planetR * 1.3);
      grad.addColorStop(0, 'rgba(156,140,255,0.95)');
      grad.addColorStop(0.45, 'rgba(88,124,255,0.55)');
      grad.addColorStop(1, 'rgba(7,11,24,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, planetR * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      var coreGrad = ctx.createRadialGradient(cx - planetR * 0.35, cy - planetR * 0.35, planetR * 0.05, cx, cy, planetR);
      coreGrad.addColorStop(0, '#CFE0FF');
      coreGrad.addColorStop(0.5, '#587CFF');
      coreGrad.addColorStop(1, '#24265A');
      ctx.beginPath();
      ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }

    function drawPoint(p, t) {
      var ring = rings[p.ringIndex];
      var angle = p.angle + t * p.speed;
      var localX = Math.cos(angle) * ring.rx;
      var localY = Math.sin(angle) * ring.ry;
      var cosT = Math.cos(ring.tilt), sinT = Math.sin(ring.tilt);
      var x = cx + localX * cosT - localY * sinT;
      var y = cy + localX * sinT + localY * cosT;

      var behind = Math.sin(angle) < 0;
      var alpha = behind ? 0.35 : 1;

      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(102,231,255,' + alpha + ')';
      ctx.shadowColor = 'rgba(102,231,255,0.9)';
      ctx.shadowBlur = behind ? 2 : 7;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      rings.forEach(function (r) { drawRing(r, t); });
      drawPlanet(t);

      // draw back points first, then planet already drawn, then front points
      points.forEach(function (p) {
        var ring = rings[p.ringIndex];
        var angle = p.angle + t * p.speed;
        if (Math.sin(angle) < 0) drawPoint(p, t);
      });
      points.forEach(function (p) {
        var ring = rings[p.ringIndex];
        var angle = p.angle + t * p.speed;
        if (Math.sin(angle) >= 0) drawPoint(p, t);
      });

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf) cancelAnimationFrame(raf);
      if (prefersReducedMotion) {
        // Draw a single static frame — no continuous motion
        ctx.clearRect(0, 0, W, H);
        rings.forEach(function (r) { drawRing(r, 0); });
        drawPlanet(0);
        points.forEach(function (p) { drawPoint(p, 0); });
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    }

    buildScene();
    running = true;
    start();

    // Pause when hero not visible — saves compute on long scrolls
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!running) { running = true; start(); }
          } else {
            running = false;
            if (raf) cancelAnimationFrame(raf);
          }
        });
      }, { threshold: 0.05 });
      io.observe(scene);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        buildScene();
        if (running) start();
      }, 150);
    });
  })();

  /* ------------------------------------------------------------------
     PLATFORM STAGES — Collect / Analyze / Discover
  ------------------------------------------------------------------ */
  (function initStages() {
    var buttons = document.querySelectorAll('.stage-btn');
    var stageEl = document.querySelector('.stages__stage');
    var titleEl = document.getElementById('stageTitle');
    var descEl = document.getElementById('stageDesc');
    var listEl = document.getElementById('stageList');
    var nodesGroup = document.getElementById('stageNodes');
    var linesGroup = document.getElementById('stageLines');
    if (!buttons.length || !nodesGroup) return;

    var data = {
      collect: {
        title: 'Сбор',
        desc: 'Платформа объединяет сигналы спутников, телескопов и наземных станций в единый поток данных, синхронизированный по времени и координатам.',
        list: ['Приём телеметрии в реальном времени', 'Нормализация разнородных форматов', 'Пространственно-временная синхронизация'],
        nodeCount: 6,
        nodeR: 150,
        connected: false
      },
      analyze: {
        title: 'Анализ',
        desc: 'Модели выявляют закономерности в собранных данных, отфильтровывают шум и строят прогнозы на основе наблюдаемой динамики.',
        list: ['Выявление закономерностей', 'Построение прогнозных моделей', 'Оценка достоверности сигнала'],
        nodeCount: 6,
        nodeR: 100,
        connected: true
      },
      discover: {
        title: 'Открытие',
        desc: 'Результаты представлены в виде, удобном для изучения: визуализации, сравнения и поддержки решений исследователя.',
        list: ['Интерактивная визуализация результатов', 'Сравнение сценариев', 'Поддержка принятия решений'],
        nodeCount: 4,
        nodeR: 55,
        connected: false
      }
    };

    function renderNodes(stageKey) {
      var cfg = data[stageKey];
      var svgNS = 'http://www.w3.org/2000/svg';
      nodesGroup.innerHTML = '';
      linesGroup.innerHTML = '';

      var coords = [];
      for (var i = 0; i < cfg.nodeCount; i++) {
        var angle = (Math.PI * 2 * i) / cfg.nodeCount - Math.PI / 2;
        var x = 200 + Math.cos(angle) * cfg.nodeR;
        var y = 200 + Math.sin(angle) * cfg.nodeR;
        coords.push([x, y]);

        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 4);
        circle.setAttribute('fill', i % 2 === 0 ? '#66E7FF' : '#9C8CFF');
        circle.style.opacity = '0.9';
        nodesGroup.appendChild(circle);
      }

      if (cfg.connected) {
        for (var j = 0; j < coords.length; j++) {
          var next = coords[(j + 1) % coords.length];
          var line = document.createElementNS(svgNS, 'line');
          line.setAttribute('x1', coords[j][0]);
          line.setAttribute('y1', coords[j][1]);
          line.setAttribute('x2', next[0]);
          line.setAttribute('y2', next[1]);
          line.setAttribute('stroke', 'rgba(102,231,255,0.25)');
          line.setAttribute('stroke-width', '1');
          linesGroup.appendChild(line);
        }
      }

      // Center dot for discover (represents distilled insight)
      if (stageKey === 'discover') {
        var centerDot = document.createElementNS(svgNS, 'circle');
        centerDot.setAttribute('cx', 200);
        centerDot.setAttribute('cy', 200);
        centerDot.setAttribute('r', 6);
        centerDot.setAttribute('fill', '#F3F6FF');
        nodesGroup.appendChild(centerDot);
      }
    }

    function setStage(stageKey, fromClick) {
      var cfg = data[stageKey];
      if (!cfg) return;

      buttons.forEach(function (b) {
        var active = b.getAttribute('data-stage') === stageKey;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      if (!prefersReducedMotion && fromClick) {
        stageEl.classList.remove('is-morphing');
        void stageEl.offsetWidth; // restart animation
        stageEl.classList.add('is-morphing');
      }

      titleEl.textContent = cfg.title;
      descEl.textContent = cfg.desc;
      listEl.innerHTML = '';
      cfg.list.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        listEl.appendChild(li);
      });

      renderNodes(stageKey);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStage(btn.getAttribute('data-stage'), true);
      });
    });

    setStage('collect', false);
  })();

  /* ------------------------------------------------------------------
     INTERACTIVE ORBITAL SIMULATION — the site's centerpiece
     Canvas-based, keyboard accessible, pausable, reduced-motion aware.
  ------------------------------------------------------------------ */
  (function initSimulation() {
    var canvas = document.getElementById('simCanvas');
    if (!canvas) return;
    var stage = canvas.closest('.sim-stage');
    var objectsList = document.getElementById('simObjects');
    var readout = document.getElementById('simReadout');
    var pauseBtn = document.getElementById('simPause');
    var pauseLabel = document.getElementById('simPauseLabel');
    var pauseIcon = document.getElementById('simPauseIcon');

    var ctx, W, H, cx, cy;
    var raf = null;
    var paused = prefersReducedMotion; // start paused if reduced motion requested
    var isVisible = true;
    var selectedId = null;
    var hoveredId = null;

    var satellites = [
      { id: 'oi-142', name: 'OI-142', cls: 'LEO', color: '#66E7FF', radius: 0, baseRadius: 120, speed: 0.00042, angle: 0.4, altitude: 540, velocity: 7.61, incl: 51.6 },
      { id: 'oi-098', name: 'OI-098', cls: 'LEO', color: '#587CFF', radius: 0, baseRadius: 150, speed: -0.00031, angle: 2.1, altitude: 705, velocity: 7.49, incl: 97.4 },
      { id: 'oi-233', name: 'OI-233', cls: 'MEO', color: '#9C8CFF', radius: 0, baseRadius: 190, speed: 0.00021, angle: 4.0, altitude: 19100, velocity: 3.87, incl: 55.0 },
      { id: 'oi-071', name: 'OI-071', cls: 'GEO', color: '#F3F6FF', radius: 0, baseRadius: 230, speed: 0.00012, angle: 5.3, altitude: 35786, velocity: 3.07, incl: 0.1 }
    ];

    function buildObjectList() {
      objectsList.innerHTML = '';
      satellites.forEach(function (sat) {
        var btn = document.createElement('button');
        btn.className = 'sim-object-btn';
        btn.type = 'button';
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', 'false');
        btn.dataset.id = sat.id;
        btn.innerHTML =
          '<span class="sim-object-btn__name"><span class="sim-object-btn__dot" style="background:' + sat.color + '"></span>' + sat.name + '</span>' +
          '<span class="sim-object-btn__class">' + sat.cls + '</span>';
        btn.addEventListener('click', function () { selectSatellite(sat.id); });
        objectsList.appendChild(btn);
      });
    }

    function updateReadout(sat) {
      if (!sat) {
        readout.innerHTML = '<p class="sim-readout__hint">Выберите спутник на схеме или в списке</p>';
        return;
      }
      readout.innerHTML =
        '<p class="sim-readout__name">' + sat.name + '</p>' +
        '<div class="sim-readout__row"><span>Класс орбиты</span><span>' + sat.cls + '</span></div>' +
        '<div class="sim-readout__row"><span>Высота</span><span>' + sat.altitude.toLocaleString('ru-RU') + ' км</span></div>' +
        '<div class="sim-readout__row"><span>Скорость</span><span>' + sat.velocity.toFixed(2) + ' км/с</span></div>' +
        '<div class="sim-readout__row"><span>Наклонение</span><span>' + sat.incl.toFixed(1) + '°</span></div>' +
        '<span class="sim-readout__tag">СИМУЛЯЦИЯ ОРБИТАЛЬНЫХ ДАННЫХ</span>';
    }

    function selectSatellite(id) {
      selectedId = (selectedId === id) ? null : id;
      objectsList.querySelectorAll('.sim-object-btn').forEach(function (btn) {
        btn.setAttribute('aria-selected', btn.dataset.id === selectedId ? 'true' : 'false');
      });
      var sat = satellites.find(function (s) { return s.id === selectedId; });
      updateReadout(sat);
    }

    function layout() {
      var rect = stage.getBoundingClientRect();
      W = rect.width; H = rect.height;
      ctx = setupHiDPICanvas(canvas, W, H);
      cx = W / 2; cy = H / 2;
      var scale = Math.min(W, H) / 560;
      satellites.forEach(function (sat) { sat.radius = sat.baseRadius * scale; });
    }

    function drawGrid() {
      ctx.strokeStyle = 'rgba(164,174,199,0.07)';
      ctx.lineWidth = 1;
      var step = 40;
      for (var x = cx % step; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (var y = cy % step; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    function drawCentralBody() {
      var r = Math.min(W, H) * 0.045;
      var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r * 2.2);
      grad.addColorStop(0, 'rgba(102,231,255,0.5)');
      grad.addColorStop(1, 'rgba(7,11,24,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();

      var coreGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      coreGrad.addColorStop(0, '#CFE0FF');
      coreGrad.addColorStop(1, '#587CFF');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = coreGrad; ctx.fill();
    }

    function drawOrbit(sat, highlighted) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, sat.radius, sat.radius * 0.4, 0.15, 0, Math.PI * 2);
      ctx.strokeStyle = highlighted ? 'rgba(102,231,255,0.65)' : 'rgba(164,174,199,0.16)';
      ctx.lineWidth = highlighted ? 1.4 : 1;
      ctx.stroke();
    }

    function satPosition(sat, t) {
      var angle = sat.angle + t * sat.speed;
      var x = cx + Math.cos(angle) * sat.radius;
      var y = cy + Math.sin(angle) * sat.radius * 0.4 * Math.cos(0.15) - Math.sin(0.15) * 0; // simple tilt approximation
      // apply ellipse tilt properly
      var ex = Math.cos(angle) * sat.radius;
      var ey = Math.sin(angle) * sat.radius * 0.4;
      var tilt = 0.15;
      x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      return { x: x, y: y, angle: angle };
    }

    function drawSatellite(sat, t) {
      var pos = satPosition(sat, t);
      var isSelected = sat.id === selectedId;
      var isHovered = sat.id === hoveredId;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(102,231,255,0.8)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected || isHovered ? 5 : 3.4, 0, Math.PI * 2);
      ctx.fillStyle = sat.color;
      ctx.shadowColor = sat.color;
      ctx.shadowBlur = isSelected ? 12 : 5;
      ctx.fill();
      ctx.shadowBlur = 0;

      sat._screenX = pos.x;
      sat._screenY = pos.y;
    }

    var startTime = null;
    function frame(ts) {
      if (!startTime) startTime = ts;
      var t = ts - startTime;

      ctx.clearRect(0, 0, W, H);
      drawGrid();
      satellites.forEach(function (sat) { drawOrbit(sat, sat.id === selectedId || sat.id === hoveredId); });
      drawCentralBody();
      satellites.forEach(function (sat) { drawSatellite(sat, t); });

      if (!paused && isVisible) raf = requestAnimationFrame(frame);
    }

    function renderStatic() {
      // Draws one frame at t=0 for reduced-motion / paused states
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      satellites.forEach(function (sat) { drawOrbit(sat, sat.id === selectedId || sat.id === hoveredId); });
      drawCentralBody();
      satellites.forEach(function (sat) { drawSatellite(sat, 0); });
    }

    function play() {
      paused = false;
      pauseBtn.setAttribute('aria-pressed', 'false');
      pauseLabel.textContent = 'Пауза';
      pauseIcon.innerHTML = '<rect x="3" y="2" width="3.4" height="12" rx="0.8"/><rect x="9.6" y="2" width="3.4" height="12" rx="0.8"/>';
      startTime = null;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function pause() {
      paused = true;
      pauseBtn.setAttribute('aria-pressed', 'true');
      pauseLabel.textContent = 'Продолжить';
      pauseIcon.innerHTML = '<path d="M4,2 L13,8 L4,14 Z"/>';
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      renderStatic();
    }

    pauseBtn.addEventListener('click', function () {
      if (paused) play(); else pause();
    });

    // Pointer interaction: click nearest satellite within tolerance
    function handlePick(clientX, clientY, isHover) {
      var rect = canvas.getBoundingClientRect();
      var px = clientX - rect.left;
      var py = clientY - rect.top;
      var closest = null, closestDist = 18; // pick tolerance in CSS px
      satellites.forEach(function (sat) {
        if (sat._screenX == null) return;
        var d = Math.hypot(sat._screenX - px, sat._screenY - py);
        if (d < closestDist) { closestDist = d; closest = sat; }
      });
      if (isHover) {
        var newHover = closest ? closest.id : null;
        if (newHover !== hoveredId) {
          hoveredId = newHover;
          canvas.style.cursor = closest ? 'pointer' : 'default';
          if (paused) renderStatic();
        }
      } else if (closest) {
        selectSatellite(closest.id);
      }
    }

    canvas.addEventListener('click', function (e) { handlePick(e.clientX, e.clientY, false); });
    canvas.addEventListener('mousemove', function (e) { handlePick(e.clientX, e.clientY, true); });
    canvas.addEventListener('mouseleave', function () {
      if (hoveredId) { hoveredId = null; if (paused) renderStatic(); }
    });
    canvas.addEventListener('touchstart', function (e) {
      if (!e.touches.length) return;
      var t = e.touches[0];
      handlePick(t.clientX, t.clientY, false);
    }, { passive: true });

    // Keyboard access: Tab through the object list already works via native buttons;
    // Enter/Space on list buttons already triggers click. Add arrow-key cycling for convenience.
    objectsList.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var idx = satellites.findIndex(function (s) { return s.id === selectedId; });
      if (e.key === 'ArrowDown') idx = (idx + 1) % satellites.length;
      else idx = (idx - 1 + satellites.length) % satellites.length;
      selectSatellite(satellites[idx].id);
      var btn = objectsList.querySelector('[data-id="' + satellites[idx].id + '"]');
      if (btn) btn.focus();
    });

    // Reduce compute when off-screen
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible && !paused && !raf) raf = requestAnimationFrame(frame);
          if (!isVisible && raf) { cancelAnimationFrame(raf); raf = null; }
        });
      }, { threshold: 0.05 });
      io.observe(stage);
    }

    var resizeTimer2;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer2);
      resizeTimer2 = setTimeout(function () {
        layout();
        if (paused || prefersReducedMotion) renderStatic();
      }, 150);
    });

    buildObjectList();
    layout();
    updateReadout(null);

    if (prefersReducedMotion) {
      pause();
    } else {
      play();
    }
  })();

  /* ------------------------------------------------------------------
     TECHNOLOGY PIPELINE — DATA INPUT → AI PROCESSING → ANALYTICS → INSIGHTS
  ------------------------------------------------------------------ */
  (function initPipeline() {
    var steps = document.querySelectorAll('.pipeline__step');
    var descEl = document.getElementById('pipelineDesc');
    if (!steps.length) return;

    var descriptions = [
      'Необработанные данные со спутников, телескопов и наземных станций поступают в систему в исходном виде.',
      'Модели выделяют значимые сигналы, устраняют шум и приводят данные к единому формату для анализа.',
      'Аналитический модуль сопоставляет паттерны, строит прогнозы и оценивает достоверность выводов.',
      'Результат представляется в виде, готовом для изучения и принятия решения — без лишней технической обвязки.'
    ];

    function setStep(index) {
      steps.forEach(function (step, i) {
        var active = i === index;
        step.classList.toggle('is-active', active);
        step.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      descEl.textContent = descriptions[index];
    }

    steps.forEach(function (step, i) {
      step.addEventListener('click', function () { setStep(i); });
    });

    setStep(0);
  })();

  /* ------------------------------------------------------------------
     FINAL CTA CANVAS — deep space sphere with slow light sweep
  ------------------------------------------------------------------ */
  (function initCtaCanvas() {
    var canvas = document.getElementById('ctaCanvas');
    if (!canvas) return;
    var section = canvas.closest('.final-cta');
    var ctx, W, H, cx, cy;
    var raf = null;
    var isVisible = false;

    function layout() {
      var rect = section.getBoundingClientRect();
      W = rect.width; H = rect.height;
      ctx = setupHiDPICanvas(canvas, W, H);
      // Positioned low-and-wide like a light on the horizon, well clear of the
      // centered headline block (which occupies roughly the middle 45% of H).
      cx = W / 2; cy = H * 0.11;
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, W, H);

      // Orbital rings — wide and shallow, reading as a distant horizon arc
      [0.9, 1.3, 1.7].forEach(function (mult, i) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.min(W, H) * 0.22 * mult, Math.min(W, H) * 0.05 * mult, 0.06, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(102,231,255,' + (0.14 - i * 0.035) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Soft background glow — subtle, never brighter than the text it sits behind
      var pulse = prefersReducedMotion ? 0.5 : (0.5 + Math.sin(t * 0.0006) * 0.18);
      var r = Math.min(W, H) * 0.09;
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
      grad.addColorStop(0, 'rgba(102,231,255,' + (0.4 * pulse + 0.12) + ')');
      grad.addColorStop(0.4, 'rgba(88,124,255,0.1)');
      grad.addColorStop(1, 'rgba(7,11,24,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();

      // Small bright core — the "point of light on the horizon"
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#F3F6FF';
      ctx.shadowColor = '#66E7FF';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame(t) {
      drawFrame(t);
      if (!prefersReducedMotion && isVisible) raf = requestAnimationFrame(frame);
    }

    layout();

    if (prefersReducedMotion) {
      drawFrame(0);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible && !prefersReducedMotion && !raf) raf = requestAnimationFrame(frame);
          if (!isVisible && raf) { cancelAnimationFrame(raf); raf = null; }
        });
      }, { threshold: 0.05 });
      io.observe(section);
    } else if (!prefersReducedMotion) {
      raf = requestAnimationFrame(frame);
    }

    var resizeTimer3;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer3);
      resizeTimer3 = setTimeout(function () {
        layout();
        if (prefersReducedMotion) drawFrame(0);
      }, 150);
    });
  })();

  /* ------------------------------------------------------------------
     DEMO MODAL — open/close, focus trap, validation, demo-mode success
  ------------------------------------------------------------------ */
  (function initModal() {
    var overlay = document.getElementById('modalOverlay');
    var modal = document.getElementById('demoModal');
    var openBtn = document.getElementById('openDemoModal');
    var closeBtn = document.getElementById('modalClose');
    var formView = document.getElementById('modalFormView');
    var successView = document.getElementById('modalSuccessView');
    var form = document.getElementById('demoForm');
    var resetBtn = document.getElementById('modalReset');
    if (!overlay || !openBtn) return;

    var lastFocused = null;

    var fields = {
      name: { input: document.getElementById('fieldName'), error: document.getElementById('err-name'), validate: function (v) { return v.trim().length >= 2 ? '' : 'Укажите имя (минимум 2 символа)'; } },
      email: { input: document.getElementById('fieldEmail'), error: document.getElementById('err-email'), validate: function (v) {
          var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return re.test(v.trim()) ? '' : 'Введите корректный рабочий email';
        } },
      company: { input: document.getElementById('fieldCompany'), error: document.getElementById('err-company'), validate: function (v) { return v.trim().length >= 2 ? '' : 'Укажите название компании'; } },
      message: { input: document.getElementById('fieldMessage'), error: document.getElementById('err-message'), validate: function (v) { return v.trim().length >= 10 ? '' : 'Опишите задачу чуть подробнее (от 10 символов)'; } }
    };

    function getFocusable() {
      return modal.querySelectorAll('button:not([hidden] button), a[href], input, textarea, [tabindex]:not([tabindex="-1"])');
    }

    function openModal() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      var firstInput = document.getElementById('fieldName');
      setTimeout(function () { if (firstInput) firstInput.focus(); }, 60);
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        overlay.hidden = true;
        // Reset to form view for next open
        successView.hidden = true;
        formView.hidden = false;
      }, prefersReducedMotion ? 0 : 320);
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {
        var focusable = Array.prototype.filter.call(getFocusable(), function (el) {
          return el.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    resetBtn.addEventListener('click', closeModal);

    function validateField(key) {
      var f = fields[key];
      var msg = f.validate(f.input.value);
      f.error.textContent = msg;
      f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].input.addEventListener('blur', function () { validateField(key); });
      fields[key].input.addEventListener('input', function () {
        if (fields[key].input.getAttribute('aria-invalid') === 'true') validateField(key);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var allValid = true;
      Object.keys(fields).forEach(function (key) {
        if (!validateField(key)) allValid = false;
      });
      if (!allValid) {
        var firstInvalid = Object.keys(fields).find(function (key) {
          return fields[key].input.getAttribute('aria-invalid') === 'true';
        });
        if (firstInvalid) fields[firstInvalid].input.focus();
        return;
      }

      // DEMO MODE: no real backend. We explicitly do not claim a server request occurred.
      formView.hidden = true;
      successView.hidden = false;
      successView.querySelector('h2').focus ? null : null;
      var heading = successView.querySelector('h2');
      heading.setAttribute('tabindex', '-1');
      heading.focus();

      form.reset();
      Object.keys(fields).forEach(function (key) {
        fields[key].error.textContent = '';
        fields[key].input.removeAttribute('aria-invalid');
      });
    });
  })();

  /* ------------------------------------------------------------------
     AI CHAT WIDGET — floating launcher + simulated assistant
     DEMO MODE: no backend, no network calls. Replies are drawn from a
     small local keyword→answer table so the experience reads as a real
     product conversation without ever claiming a live AI connection.
  ------------------------------------------------------------------ */
  (function initAiChat() {
    var root = document.getElementById('aiChat');
    var launcher = document.getElementById('aiChatLauncher');
    var panel = document.getElementById('aiChatPanel');
    var closeBtn = document.getElementById('aiChatClose');
    var messages = document.getElementById('aiChatMessages');
    var form = document.getElementById('aiChatForm');
    var input = document.getElementById('aiChatInput');
    var sendBtn = document.getElementById('aiChatSend');
    if (!root || !launcher || !panel || !form || !input) return;

    var STARTER_PROMPTS = [
      { label: 'Что умеет платформа?', prompt: 'Что умеет платформа Orbital Intelligence?' },
      { label: 'Как работает прогноз?', prompt: 'Как устроено прогнозирование траекторий?' },
      { label: 'Как запросить демо?', prompt: 'Как запросить демонстрацию?' }
    ];

    var isOpen = false;
    var hasGreeted = false;
    var lastFocused = null;
    var typingEl = null;

    /* ---------------- Simulated knowledge base ----------------
       Ordered keyword → answer pairs. First matching keyword wins,
       so more specific phrases are listed before general ones. */
    var KB = [
      { keys: ['демонстрац', 'демо', 'показ'], answer: 'Чтобы запросить демонстрацию, нажмите кнопку «Запросить демонстрацию» в верхнем меню или в разделе внизу страницы — откроется форма. Напомню: форма тоже работает в демонстрационном режиме и никуда не отправляется.' },
      { keys: ['трактор', 'орбит', 'движен'], answer: 'Модуль <strong>«Орбитальный интеллект»</strong> анализирует траектории объектов с учётом гравитационных возмущений и сближений, опираясь на объединённые данные спутников и наземных станций. Подробнее — в разделе «Возможности».' },
      { keys: ['прогноз', 'predict'], answer: 'Блок <strong>«Прогнозные системы»</strong> строит прогнозные модели на основе доступных наблюдений, чтобы оценивать вероятные сценарии развития событий. Все прогнозы визуально отделены от подтверждённых наблюдений — это один из принципов платформы.' },
      { keys: ['спутник', 'satellite', 'сигнал'], answer: '<strong>«Спутниковая аналитика»</strong> занимается обработкой спутниковых сигналов: фильтрация шума, выделение значимых сигналов и агрегация по объектам. Можете попробовать интерактивную симуляцию в разделе «Интерактивная модель» чуть выше.' },
      { keys: ['архитектур', 'технолог', 'как устроен', 'как работает платформ'], answer: 'Платформа устроена по конвейеру из четырёх этапов: Ввод данных → Обработка ИИ → Аналитический модуль → Готовые выводы. Каждый этап можно изучить в разделе «Технологии».' },
      { keys: ['умеет', 'может', 'возможност', 'capabilit'], answer: 'Платформа умеет: анализировать орбитальные траектории, обрабатывать спутниковые сигналы, строить прогнозные модели и находить закономерности в научных данных. Коротко об этом — в разделе «Возможности» выше.' },
      { keys: ['для кого', 'применен', 'использован', 'кому подходит'], answer: 'Платформой пользуются космические технологические компании, разработчики спутниковых систем, исследовательские лаборатории и инженерно-аналитические команды. Примеры — в разделе «Применение».' },
      { keys: ['цена', 'стоимост', 'тариф', 'price'], answer: 'На этой демонстрационной странице цены не указаны — это концептуальный проект. По вопросам стоимости и условий лучше запросить демонстрацию через форму, там можно оставить сообщение.' },
      { keys: ['контакт', 'связ', 'email', 'почт', 'написать'], answer: 'Демонстрационный адрес — hello@orbital-intelligence.example (указан в подвале страницы как пример, перед запуском его нужно заменить на реальный).' },
      { keys: ['привет', 'здравств', 'добр'], answer: 'Привет! Я демонстрационный ассистент Orbital Intelligence. Спросите что-нибудь о платформе — например, как устроено прогнозирование траекторий или кому подходит продукт.' },
      { keys: ['спасибо', 'благодар'], answer: 'Пожалуйста! Если появятся ещё вопросы о платформе — я здесь.' },
      { keys: ['настоящ', 'реальн', 'ли ты ии', 'бэкенд', 'backend'], answer: 'Честно говоря — нет. Это демонстрационный виджет: мои ответы собраны из небольшого локального набора заготовок, без обращения к серверу или настоящей ИИ-модели. В реальном продукте здесь будет полноценный ИИ-ассистент.' }
    ];
    var FALLBACK = 'Хороший вопрос! В этой демонстрационной версии у меня ограниченный набор ответов — попробуйте спросить о платформе, прогнозировании, спутниковой аналитике или о том, как запросить демо.';

    function findAnswer(text) {
      var q = text.toLowerCase();
      for (var i = 0; i < KB.length; i++) {
        var entry = KB[i];
        for (var j = 0; j < entry.keys.length; j++) {
          if (q.indexOf(entry.keys[j]) !== -1) return entry.answer;
        }
      }
      return FALLBACK;
    }

    /* ---------------- Message rendering ---------------- */
    function scrollToBottom() {
      messages.scrollTop = messages.scrollHeight;
    }

    function appendMessage(role, html) {
      var el = document.createElement('div');
      el.className = 'ai-msg ' + (role === 'user' ? 'ai-msg--user' : 'ai-msg--bot');
      el.innerHTML = html;
      messages.appendChild(el);
      scrollToBottom();
      return el;
    }

    function showTyping() {
      typingEl = document.createElement('div');
      typingEl.className = 'ai-msg ai-msg--typing';
      typingEl.setAttribute('aria-hidden', 'true');
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(typingEl);
      scrollToBottom();
    }

    function hideTyping() {
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      typingEl = null;
    }

    function renderStarterChips() {
      var wrap = document.createElement('div');
      wrap.className = 'ai-chat__suggestions';
      wrap.id = 'aiChatSuggestions';
      STARTER_PROMPTS.forEach(function (item) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ai-chat__chip';
        chip.setAttribute('data-prompt', item.prompt);
        chip.textContent = item.label;
        wrap.appendChild(chip);
      });
      messages.appendChild(wrap);
      scrollToBottom();
    }

    function removeStarterChips() {
      var wrap = document.getElementById('aiChatSuggestions');
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    // Event delegation: chips are created dynamically, so listen on the
    // messages container rather than binding to each chip individually.
    messages.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.ai-chat__chip') : null;
      if (!chip) return;
      sendUserMessage(chip.getAttribute('data-prompt') || chip.textContent);
    });

    function sendUserMessage(text) {
      text = text.trim();
      if (!text) return;

      appendMessage('user', escapeHtml(text));
      removeStarterChips();
      input.value = '';
      autosizeInput();
      sendBtn.disabled = true;

      var answer = findAnswer(text);
      var delay = prefersReducedMotion ? 150 : clamp(450 + text.length * 12, 500, 1400);

      showTyping();
      setTimeout(function () {
        hideTyping();
        appendMessage('bot', answer);
        sendBtn.disabled = false;
        if (!prefersReducedMotion) input.focus();
      }, delay);
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function seedGreeting() {
      if (hasGreeted) return;
      hasGreeted = true;
      appendMessage('bot', 'Здравствуйте! Я ассистент <strong>Orbital Intelligence</strong>. Спросите о платформе — или выберите тему ниже:');
      renderStarterChips();
      // The greeting + chips together are usually taller than the visible
      // area. appendMessage/renderStarterChips both auto-scroll to bottom
      // (correct for an ongoing conversation), but on first open the user
      // should see the start of the greeting, not its tail — so reset to top.
      messages.scrollTop = 0;
    }

    /* ---------------- Input autosize ---------------- */
    function singleLineMinHeight() {
      // Read the CSS-defined single-line height fresh each time, since the
      // short-viewport media queries change it (38px normally, 32px when
      // compacted) — hardcoding one value here would fight whichever
      // breakpoint is active.
      input.style.height = '';
      var fromCss = parseFloat(getComputedStyle(input).height);
      return isNaN(fromCss) ? 38 : fromCss;
    }
    function autosizeInput() {
      var minH = singleLineMinHeight();
      input.style.height = 'auto';
      input.style.height = Math.max(minH, Math.min(input.scrollHeight, 110)) + 'px';
    }
    input.addEventListener('input', autosizeInput);

    /* ---------------- Open / close ---------------- */
    function getFocusable() {
      return panel.querySelectorAll('button:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])');
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { closeChat(); return; }
      if (e.key === 'Tab') {
        var focusable = Array.prototype.filter.call(getFocusable(), function (el) {
          return el.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }

    function openChat() {
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;
      launcher.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.add('is-open'); });
      seedGreeting();
      setTimeout(function () { input.focus(); }, prefersReducedMotion ? 0 : 280);
      document.addEventListener('keydown', onKeydown);
    }

    function closeChat() {
      if (!isOpen) return;
      isOpen = false;
      launcher.setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-open');
      setTimeout(function () { panel.hidden = true; }, prefersReducedMotion ? 0 : 320);
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
      else launcher.focus();
    }

    launcher.addEventListener('click', function () {
      if (isOpen) closeChat(); else openChat();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeChat);

    /* ---------------- Composer ---------------- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sendUserMessage(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage(input.value);
      }
    });

    // Close if viewport crosses the small-screen breakpoint while open and
    // layout changes enough to warrant re-measuring (keeps things simple,
    // matches the mobile-menu resize behaviour above).
    window.addEventListener('resize', function () {
      if (isOpen) scrollToBottom();
    });
  })();

  /* ------------------------------------------------------------------
     FOOTER YEAR
  ------------------------------------------------------------------ */
  (function initFooterYear() {
    var el = document.getElementById('footerYear');
    if (el) el.textContent = String(new Date().getFullYear());
  })();

})();
