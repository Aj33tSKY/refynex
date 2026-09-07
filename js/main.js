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

  /* Hero title rotating word */
  const heroRotateText = document.getElementById('heroRotateText');
  if (heroRotateText) {
    const phrases = ['big launch', 'funding round', 'product demo', 'founder story'];
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

  /* Portfolio carousel (horizontal scroll-snap row, ~3 cards/view) */
  const workGrid = document.getElementById('workGrid');
  const workPrev = document.getElementById('workPrev');
  const workNext = document.getElementById('workNext');
  const workProgressBar = document.getElementById('workProgressBar');
  let updateWorkCarousel = () => {};

  if (workGrid && workPrev && workNext) {
    updateWorkCarousel = function () {
      const maxScroll = workGrid.scrollWidth - workGrid.clientWidth;
      workPrev.disabled = workGrid.scrollLeft <= 4;
      workNext.disabled = workGrid.scrollLeft >= maxScroll - 4;
      if (workProgressBar) {
        const visibleRatio = maxScroll > 0 ? workGrid.clientWidth / workGrid.scrollWidth : 1;
        const scrolledRatio = maxScroll > 0 ? workGrid.scrollLeft / maxScroll : 0;
        workProgressBar.style.width = Math.min(visibleRatio, 1) * 100 + '%';
        workProgressBar.style.transform = `translateX(${scrolledRatio * (100 / visibleRatio - 100)}%)`;
      }
    };

    function pageBy(direction) {
      workGrid.scrollBy({ left: direction * workGrid.clientWidth, behavior: 'smooth' });
    }

    workPrev.addEventListener('click', () => pageBy(-1));
    workNext.addEventListener('click', () => pageBy(1));
    workGrid.addEventListener('scroll', updateWorkCarousel, { passive: true });
    window.addEventListener('resize', updateWorkCarousel);

    updateWorkCarousel();

    /*
     * Manual horizontal drag, paired with touch-action: pan-y in CSS.
     * That CSS makes the browser hand every touch here straight to the
     * page's own (vertical) scrolling instead of grabbing it for this
     * row — which also means the row no longer scrolls horizontally on
     * its own, so swiping through the images has to be driven from
     * here: track the touch, decide once (on the first ~6px of
     * movement) whether the gesture is more horizontal or vertical,
     * and only then either drive scrollLeft ourselves (horizontal) or
     * do nothing and let the page scroll (vertical).
     *
     * Deliberately just 1:1 tracking — no momentum, no snap. A custom
     * inertia simulation was tried and felt sticky/off compared to
     * native scrolling; this just follows the finger and stops exactly
     * where it's released, which is the closest a hand-rolled handler
     * gets to "no custom physics" while still fixing the vertical-
     * scroll bug above (pan-x + native scrolling was tried twice and
     * confirmed on a real iPhone both times to still block vertical
     * scroll here, so it's not an option).
     */
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScrollLeft = 0;
    let dragAxis = null; // null (undecided) | 'x' | 'y'

    workGrid.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartScrollLeft = workGrid.scrollLeft;
      dragAxis = null;
    }, { passive: true });

    workGrid.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (dragAxis === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        dragAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (dragAxis === 'x') {
        e.preventDefault();
        // Plain `.scrollLeft = ` is still subject to this element's CSS
        // scroll-behavior: smooth (it applies to any scroll, not just
        // wheel/nav-button ones), which would animate/lag behind every
        // touchmove tick instead of tracking the finger 1:1. Forcing
        // 'instant' here bypasses that.
        workGrid.scrollTo({ left: touchStartScrollLeft - dx, behavior: 'instant' });
      }
      // dragAxis === 'y': leave the event alone, the page scrolls itself.
    }, { passive: false });
  }

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
      // Filtering changes the row's total scrollable width — jumping
      // back to the start avoids landing scrolled past the end of a
      // now-shorter row (which would show an empty gap) or mid-way
      // through cards that no longer make sense together.
      if (workGrid) workGrid.scrollTo({ left: 0, behavior: 'instant' });
      updateWorkCarousel();
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
  if (heroVideo) {
    /*
     * Picks and sets the video source here in JS rather than via
     * <source media="..."> children (see index.html comment) — Safari
     * (all iOS browsers, WebKit-only) has been confirmed unreliable
     * about honoring that on <video>, even though it works correctly
     * under Chromium/Chrome DevTools device emulation. Setting
     * .src directly always takes priority over any <source> children
     * per spec, in every browser — a completely different, more
     * deterministic code path than letting the browser pick.
     */
    // Written as 4 explicit static strings (not built up from parts)
    // so the build step's plain text find/replace (scripts/
    // fingerprint-assets.js) can find and rewrite each exact path to
    // its content-hashed filename — a dynamically-assembled string
    // wouldn't match anything to replace.
    const isMobile = window.matchMedia('(max-width: 780px)').matches;
    const canWebm = heroVideo.canPlayType('video/webm') !== '';
    let heroVideoSrc;
    if (isMobile && canWebm) heroVideoSrc = 'assets/video/reel5-mobile.webm';
    else if (isMobile) heroVideoSrc = 'assets/video/reel5-mobile.mp4';
    else if (canWebm) heroVideoSrc = 'assets/video/reel5-desktop.webm';
    else heroVideoSrc = 'assets/video/reel5-desktop.mp4';
    heroVideo.src = heroVideoSrc;
    heroVideo.load();

    /* Pause hero video when scrolled out of view (saves CPU/battery) */
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.1 });
    videoObserver.observe(heroVideo);
  }

  const impactVideo = document.getElementById('impactVideo');
  if (impactVideo) {
    /* preload="none" above defers the fetch until it's actually about
       to be seen, then this plays/pauses it in step with scroll so it
       never runs while off-screen (saves CPU/battery, like heroVideo). */
    const impactVideoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) impactVideo.play().catch(() => {});
        else impactVideo.pause();
      });
    }, { threshold: 0.1 });
    impactVideoObserver.observe(impactVideo);
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
