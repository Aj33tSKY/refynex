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
   * Real liquid-glass refraction (backdrop-filter: url(#svg-filter)) only
   * renders correctly in Chromium engines — Safari and Firefox parse the
   * declaration but don't feed real backdrop pixels into the SVG filter,
   * so it silently no-ops there. Rather than risk a broken/blurless bar,
   * we only opt in on Chromium and leave everyone else on the plain
   * blur+saturate glass already set in CSS. "Chrome" appears in the UA
   * string of every Chromium-based browser (Chrome, Edge, Opera, Brave,
   * Arc) for legacy compat, and never in Safari's or Firefox's.
   */
  if (/Chrome/.test(navigator.userAgent)) {
    document.documentElement.classList.add('supports-glass-refraction');
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
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
      submitBtn.textContent = 'Send Message';
    }
  });

});
