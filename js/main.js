document.addEventListener('DOMContentLoaded', () => {

  /* Preloader */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('done'), 400);
  });
  // Fallback in case 'load' is slow (large video)
  setTimeout(() => preloader.classList.add('done'), 2500);

  /* Footer year */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* Header scroll state */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /*
   * Real liquid-glass refraction (backdrop-filter: url(#svg-filter))
   * only renders correctly in Chromium engines — Safari and Firefox
   * parse the declaration but don't feed real backdrop pixels into the
   * SVG filter, so it silently no-ops there (confirmed: a genuine,
   * currently-unresolved platform gap, not a bug in this code). We only
   * opt in on Chromium and leave everyone else on the plain blur+
   * saturate glass already set in CSS. "Chrome" appears in the UA
   * string of every Chromium-based browser (Chrome, Edge, Opera, Brave,
   * Arc) for legacy compat, and never in Safari's or Firefox's.
   */
  if (/Chrome/.test(navigator.userAgent)) {
    document.documentElement.classList.add('supports-glass-refraction');
  }

  /* Hero title rotating word */
  const heroRotateText = document.getElementById('heroRotateText');
  if (heroRotateText) {
    const phrases = ['big launch', 'brand film', 'product demo', 'founder showcase', 'big event'];
    let phraseIndex = 0;
    let currentWord = phrases[0];

    // Per-character opacity wave (as seen on poly.ai's hero): each
    // letter fades independently, no sliding/blur. Exiting letters fade
    // out back-to-front (last letter first), incoming letters fade in
    // front-to-back (first letter first) — both waves travel the same
    // left-to-right direction, so exit reads as an erase and entry as a
    // type-in. Timed dynamically per word length so longer phrases
    // don't rush and shorter ones don't drag.
    const CHAR_DURATION = 320; // ms, each letter's own opacity transition
    const CHAR_STAGGER = 20;   // ms, delay step between adjacent letters

    function renderChars(word, initialOpacity) {
      heroRotateText.innerHTML = '';
      const frag = document.createDocumentFragment();
      Array.from(word).forEach(ch => {
        const span = document.createElement('span');
        span.className = 'hero-rotate-char';
        span.textContent = ch === ' ' ? ' ' : ch;
        span.style.transitionDelay = '0ms';
        span.style.opacity = String(initialOpacity);
        frag.appendChild(span);
      });
      heroRotateText.appendChild(frag);
    }
    renderChars(currentWord, 1);

    function exitWord(callback) {
      const chars = Array.from(heroRotateText.children);
      const n = chars.length;
      chars.forEach((span, i) => {
        span.style.transitionDelay = ((n - 1 - i) * CHAR_STAGGER) + 'ms';
        span.style.opacity = '0';
      });
      setTimeout(callback, (n - 1) * CHAR_STAGGER + CHAR_DURATION);
    }

    function enterWord(word) {
      currentWord = word;
      renderChars(word, 0);
      const chars = Array.from(heroRotateText.children);
      void heroRotateText.offsetWidth; // commit opacity:0 before transitioning to 1
      chars.forEach((span, i) => {
        span.style.transitionDelay = (i * CHAR_STAGGER) + 'ms';
        span.style.opacity = '1';
      });
    }

    /*
     * "founder showcase" is meaningfully longer than the other phrases —
     * at the hero's large font-size it can overflow past the right edge
     * instead of wrapping (the line is nowrap so the rotating word never
     * breaks awkwardly mid-word). The line itself is a fixed-width block
     * with overflow:hidden (needed for the reveal-on-load slide-up
     * animation), and that clip boundary is set by layout, before any
     * transform runs — so scaling the title visually afterward can't
     * un-clip content that already overflowed at layout time. Reducing
     * the actual font-size does affect layout width, so that's what
     * actually fixes it.
     *
     * The fit is computed ONCE (per viewport) against the *longest*
     * phrase, then held fixed across every rotation — sizing per-phrase
     * would make short words snap back to a larger size than long ones,
     * producing a jarring size jump on every rotation.
     */
    const heroTitle = document.querySelector('.hero-title');
    const heroTitleLine2 = heroTitle ? heroTitle.querySelectorAll('span.reveal')[1] : null;
    function fitHeroTitle() {
      if (!heroTitle || !heroTitleLine2) return;
      // Reset first so measurement reflects the CSS clamp() value for
      // the *current* viewport, not a stale shrunk-down size left over
      // from a previous (possibly wider) viewport.
      heroTitle.style.fontSize = '';
      const baseFontSize = parseFloat(getComputedStyle(heroTitle).fontSize);
      const available = heroTitleLine2.clientWidth;
      let maxNeeded = 0;
      phrases.forEach(phrase => {
        heroRotateText.textContent = phrase;
        maxNeeded = Math.max(maxNeeded, heroTitleLine2.scrollWidth);
      });
      if (maxNeeded > available) {
        heroTitle.style.fontSize = (baseFontSize * (available / maxNeeded) * 0.98) + 'px';
      }
      renderChars(currentWord, 1);
    }
    fitHeroTitle();
    window.addEventListener('resize', fitHeroTitle);

    setInterval(() => {
      exitWord(() => {
        phraseIndex = (phraseIndex + 1) % phrases.length;
        enterWord(phrases[phraseIndex]);
      });
    }, 3000);
  }

  /* Mobile menu */
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });

  /* Portfolio filters */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const workItems = document.querySelectorAll('.work-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      workItems.forEach(item => {
        const show = filter === 'all' || item.dataset.cat === filter;
        item.classList.toggle('hide', !show);
      });
    });
  });

  /* Scroll reveal */
  const animatedEls = document.querySelectorAll(
    '.service-card, .work-item, .about-content, .featured-content, .featured-media'
  );
  animatedEls.forEach(el => el.setAttribute('data-animate', ''));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

  const heroVideo = document.getElementById('heroVideo');
  // Gates the hero CTA glass-refraction proxy below (desktop Chromium
  // only — non-Chromium browsers can't render the SVG refraction at
  // all, and it's not worth the extra scroll-sync JS on mobile either).
  const enableHeroGlass =
    document.documentElement.classList.contains('supports-glass-refraction') &&
    window.matchMedia('(min-width: 769px)').matches;

  /* Pause hero video when scrolled out of view (saves CPU/battery) */
  if (heroVideo) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.1 });
    videoObserver.observe(heroVideo);
  }

  /*
   * Every glass-refraction element that actually works sits outside the
   * hero section's DOM/stacking context; the in-hero "View Our Work"
   * button never has, across several different attempted fixes. Rather
   * than keep guessing at the hero's internal structure, #heroWorkBtn
   * stays the real, functional, focusable button, and a decorative
   * proxy living outside the hero (#heroWorkBtnProxy, position: fixed)
   * is kept pixel-synced to it and does the actual visual rendering —
   * matching the one structural trait every working case shares.
   * pointer-events: none on the proxy means clicks always reach the
   * real button underneath.
   */
  const heroWorkBtn = document.getElementById('heroWorkBtn');
  const heroWorkBtnProxy = document.getElementById('heroWorkBtnProxy');
  if (heroWorkBtn && heroWorkBtnProxy && enableHeroGlass) {
    let proxySyncScheduled = false;
    function syncHeroCtaProxy() {
      proxySyncScheduled = false;
      const r = heroWorkBtn.getBoundingClientRect();
      heroWorkBtnProxy.style.width = r.width + 'px';
      heroWorkBtnProxy.style.height = r.height + 'px';
      heroWorkBtnProxy.style.transform = `translate(${r.left}px, ${r.top}px)`;
    }
    // Recomputing the SVG displacement filter at a new position every
    // scroll frame is expensive enough to visibly lag — swap to the
    // cheap plain-blur fallback for the duration of active scrolling
    // and restore the real refraction ~150ms after scrolling settles.
    let scrollStopTimer = null;
    function scheduleSync() {
      heroWorkBtnProxy.classList.add('is-scrolling');
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => heroWorkBtnProxy.classList.remove('is-scrolling'), 150);
      if (!proxySyncScheduled) {
        proxySyncScheduled = true;
        requestAnimationFrame(syncHeroCtaProxy);
      }
    }
    // pointer-events:none on the proxy means it can never receive real
    // :hover/:focus itself — the real (invisible) button does, so
    // forward both states across as classes.
    heroWorkBtn.addEventListener('mouseenter', () => heroWorkBtnProxy.classList.add('is-hover'));
    heroWorkBtn.addEventListener('mouseleave', () => heroWorkBtnProxy.classList.remove('is-hover'));
    heroWorkBtn.addEventListener('focus', () => heroWorkBtnProxy.classList.add('is-focus'));
    heroWorkBtn.addEventListener('blur', () => heroWorkBtnProxy.classList.remove('is-focus'));

    // Delayed so the real button's own reveal-on-load animation
    // (.hero-actions.reveal) plays fully visible before the swap.
    setTimeout(() => {
      syncHeroCtaProxy();
      heroWorkBtnProxy.classList.add('active');
      heroWorkBtn.classList.add('cta-proxied');
      window.addEventListener('scroll', scheduleSync, { passive: true });
      window.addEventListener('resize', scheduleSync);
    }, 1700);
  }

  /* Contact form */
  const form = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitBtnLabel = submitBtn.querySelector('.btn-label') || submitBtn;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    submitBtn.disabled = true;
    submitBtnLabel.textContent = 'Sending…';
    formNote.textContent = '';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        formNote.textContent = "Thanks — your message is on its way. We'll get back to you as soon as possible.";
        form.reset();
      } else {
        formNote.textContent = data.error || 'Something went wrong — please email launch@refynelabs.co.uk directly.';
      }
    } catch (err) {
      formNote.textContent = 'Something went wrong — please email launch@refynelabs.co.uk directly.';
    } finally {
      submitBtn.disabled = false;
      submitBtnLabel.textContent = 'Send Message';
    }
  });

});
