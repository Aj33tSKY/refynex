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
   * Real liquid-glass refraction via liquidGL (vendored, js/liquidgl.js —
   * MIT, https://github.com/naughtyduk/liquidGL). It renders its own
   * WebGL lens over each target, sampling actual pixels from its own
   * snapshot, rather than relying on backdrop-filter (which does not
   * work reliably at all — inconsistent even for static content, and
   * Chrome's backdrop-filter cannot read a <video> element's composited
   * layer under any configuration).
   *
   * The hero "View Our Work" button is deliberately NOT a target here:
   * measured (via requestAnimationFrame counting) real-time refraction
   * of the *playing* hero video costs ~43% FPS on its own (23fps ->
   * 13fps), because the library must re-composite a fresh video frame
   * into its texture every frame. Every other glass element below sits
   * over static content, which costs a much cheaper ~18%.
   *
   * .filter-btn and .service-card were also tried and pulled back out:
   * both render with persistent glitch artifacts (or, with bevel
   * disabled, the element's own text/content disappearing entirely)
   * that survived every fix attempted — display:inline-flex, zero
   * border-radius, zero bevel, isolating a single instance, ruling out
   * the .active colour state, ruling out double-init. This looks like a
   * genuine unresolved bug in the library for these element shapes, not
   * something fixable from our side, so only the button shapes that
   * demonstrably render clean are targeted.
   *
   * Every target keeps its own CSS (background/border/box-shadow/blur)
   * as the fallback for browsers without WebGL — liquidGL enhances it,
   * it doesn't replace it.
   */
  if (typeof liquidGL === 'function') {
    liquidGL({
      target: '.btn-outline, #contactForm .btn-primary',
      snapshot: 'body',
      resolution: 1.0, // default 2.0 is unnecessarily sharp for small buttons
      refraction: 0.045,
      aberration: 0, // was 0.04 — caused a visible rainbow-fringe glitch at rounded corners
      bevelDepth: 0.12,
      bevelWidth: 0.2,
      frost: 0,
      shadow: true,
      specular: true,
      reveal: 'none',
    });
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

  /* Custom cursor (desktop only) */
  const cursorDot = document.getElementById('cursorDot');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('mousemove', e => {
      cursorDot.style.left = e.clientX + 'px';
      cursorDot.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, .work-item').forEach(el => {
      el.addEventListener('mouseenter', () => cursorDot.classList.add('hovered'));
      el.addEventListener('mouseleave', () => cursorDot.classList.remove('hovered'));
    });
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

  /* Pause hero video when scrolled out of view (saves CPU/battery) */
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.1 });
    videoObserver.observe(heroVideo);
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
        formNote.textContent = data.error || 'Something went wrong — please email hello@refynelabs.co.uk directly.';
      }
    } catch (err) {
      formNote.textContent = 'Something went wrong — please email hello@refynelabs.co.uk directly.';
    } finally {
      submitBtn.disabled = false;
      submitBtnLabel.textContent = 'Send Message';
    }
  });

});
