/* ==========================================================
   Sportify Everyone — Homepage interactions
   Vanilla JS only. Every visual update runs inside
   requestAnimationFrame and only writes transform/opacity,
   so scrolling and animations stay at 60fps.
   ========================================================== */

/* ----------------------------------------------------------
   Editable contact config — builds the rows in the "Apply Now"
   popup (index.html only). Leave `facebook` as an empty string
   to hide that row entirely rather than ship a broken link.
   ---------------------------------------------------------- */
const CONTACT = {
  whatsapp: 'https://wa.me/19143864963?text=Hi%20Sportify%20Everyone%2C%20I%27d%20like%20to%20apply.',
  email: 'mailto:sportifyeveryone@gmail.com?subject=Application%20enquiry',
  instagram: 'https://www.instagram.com/ciee.pk/',
  facebook: '',
};

// When true, adds a 5th row linking to the full application form
const SHOW_FORM_OPTION = false;

// Safety net in case the inline <head> flag didn't run
document.documentElement.classList.add('js');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Declared up here (not down in section 7, where it's used) because
  // showPage() below can call startCounters() synchronously if the
  // page is already fully loaded by the time this script runs — that
  // would reference `counters` before a lower `const` had executed.
  const counters = document.querySelectorAll('.count');

  /* --------------------------------------------------------
     1. Split the hero headline into words (animated in CSS)
     -------------------------------------------------------- */
  document.querySelectorAll('.split-words').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words
      .map((word, i) => `<span class="word" aria-hidden="true" style="--i:${i}">${word}</span>`)
      .join(' ');
  });

  /* --------------------------------------------------------
     2. Page loader → reveal the page
     Waits for images/fonts (window "load"), shows the loader
     for at least 500ms so it never flickers, and gives up
     after 3s so a slow image can't block the page.
     -------------------------------------------------------- */
  const loadStart = performance.now();
  let pageShown = false;

  const showPage = () => {
    if (pageShown) return;
    pageShown = true;
    const wait = Math.max(0, 500 - (performance.now() - loadStart));
    setTimeout(() => {
      root.classList.add('loaded');
      startCounters();
    }, prefersReducedMotion ? 0 : wait);
  };

  if (document.readyState === 'complete') showPage();
  else window.addEventListener('load', showPage);
  setTimeout(showPage, 3000);

  /* --------------------------------------------------------
     3. Navbar: hide on scroll down, show on scroll up
     -------------------------------------------------------- */
  let lastScrollY = window.scrollY;

  const updateNavbar = (currentY) => {
    const menuOpen = navLinks.classList.contains('open');

    navbar.classList.toggle('nav-scrolled', currentY > 10);

    // Hide only after scrolling past the navbar, never while the menu is open
    if (currentY > lastScrollY && currentY > navbar.offsetHeight && !menuOpen) {
      navbar.classList.add('nav-hidden');
    } else if (currentY < lastScrollY) {
      navbar.classList.remove('nav-hidden');
    }

    lastScrollY = Math.max(currentY, 0);
  };

  /* --------------------------------------------------------
     4. Hero parallax (background, watermark and content
        move at different speeds for depth)
     -------------------------------------------------------- */
  const hero = document.getElementById('home');
  const heroBg = document.getElementById('heroBg');
  const heroWatermark = document.getElementById('heroWatermark');
  // The fade/shift targets .hero-bottom (headline, buttons, widget),
  // not .hero-content — .hero-content has to stay transform-free so
  // it never becomes an accidental containing block for the featured
  // -program card, which is positioned relative to .hero on desktop.
  const heroBottomEl = document.getElementById('heroBottom');

  const updateParallax = (y) => {
    // Guards hero being absent on pages other than index.html (e.g.
    // apply.html), which shares this script but has no hero section
    if (prefersReducedMotion || !hero || !heroBg || !heroWatermark || !heroBottomEl) return;
    const h = hero.offsetHeight;
    if (y > h) return; // hero is off-screen — skip the work

    heroBg.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
    heroWatermark.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
    heroBottomEl.style.transform = `translate3d(0, ${y * 0.1}px, 0)`;
    heroBottomEl.style.opacity = String(Math.max(0, 1 - y / (h * 0.85)));
  };

  // One rAF-throttled scroll handler drives navbar + parallax
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      updateNavbar(y);
      updateParallax(y);
      scrollTicking = false;
    });
  }, { passive: true });

  updateParallax(window.scrollY);

  /* --------------------------------------------------------
     5. Mobile menu
     -------------------------------------------------------- */
  const setMenu = (open) => {
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) navbar.classList.remove('nav-hidden');
  };

  navToggle.addEventListener('click', () => {
    setMenu(!navLinks.classList.contains('open'));
  });

  // Close after tapping a link or the Apply Now button (now a
  // <button>, not an <a>, since it opens the popup instead of
  // navigating), on Escape, or when resizing up to desktop
  navLinks.querySelectorAll('a, button').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* --------------------------------------------------------
     6. Scroll reveal with stagger
     Elements that enter the viewport together are staggered
     by their order in that batch (so cards, steps and
     headings cascade in one after another).
     -------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.fade-in');

  // The reveal is an enhancement, never a requirement — anything that
  // isn't (or can't be) watched by the observer must still end up
  // visible, so every exit path here converges on "add .visible".
  try {
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, i) => {
            const el = entry.target;
            el.style.setProperty('--d', `${i * 130}ms`);
            el.classList.add('visible');
            observer.unobserve(el);

            // Drop the delay afterwards so hover effects stay instant
            setTimeout(() => el.style.removeProperty('--d'), 1600 + i * 130);
          });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

      revealEls.forEach((el) => revealObserver.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('visible'));
    }
  } catch (err) {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // Safety net: if any element is somehow never watched (wrong class,
  // an observer that silently fails to fire, etc.) it still appears —
  // a touch later than a scroll reveal, but never stuck invisible.
  window.addEventListener('load', () => {
    setTimeout(() => {
      revealEls.forEach((el) => el.classList.add('visible'));
    }, 4000);
  });

  /* --------------------------------------------------------
     7. Count-up numbers
     Counts from 0 to data-target when visible. Hero numbers
     wait for their load-in animation to start first.
     -------------------------------------------------------- */
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const formatCount = (value, decimals) =>
    decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US');

  const runCounter = (el, delay = 0) => {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 2000;

    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = formatCount(target * easeOutExpo(t), decimals);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  };

  // Reset to 0 up-front (HTML keeps real values for no-JS visitors)
  if (!prefersReducedMotion) {
    counters.forEach((el) => {
      el.textContent = formatCount(0, parseInt(el.dataset.decimals || '0', 10));
    });
  }

  function startCounters() {
    if (prefersReducedMotion) return;

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const inHero = entry.target.closest('.hero');
        runCounter(entry.target, inHero ? 1000 : 250);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach((el) => counterObserver.observe(el));
  }

  /* --------------------------------------------------------
     8. Hero card 3D tilt that follows the pointer
     -------------------------------------------------------- */
  const heroCard = document.getElementById('heroCard');

  if (heroCard && canHover && !prefersReducedMotion) {
    const maxTilt = 10; // degrees
    let tiltFrame = null;

    heroCard.addEventListener('pointermove', (e) => {
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(() => {
        const rect = heroCard.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;  // 0 → 1
        const py = (e.clientY - rect.top) / rect.height;  // 0 → 1

        heroCard.classList.add('is-tilting');
        heroCard.style.setProperty('--ry', `${(px - 0.5) * maxTilt * 2}deg`);
        heroCard.style.setProperty('--rx', `${(0.5 - py) * maxTilt * 2}deg`);
        heroCard.style.setProperty('--mx', `${px * 100}%`);
        heroCard.style.setProperty('--my', `${py * 100}%`);
        tiltFrame = null;
      });
    });

    heroCard.addEventListener('pointerleave', () => {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = null;
      heroCard.classList.remove('is-tilting');
      // Card eases back to flat via its CSS transition
      ['--rx', '--ry', '--mx', '--my'].forEach((p) => heroCard.style.removeProperty(p));
    });
  }

  /* --------------------------------------------------------
     9. Programs slider dots (mobile / tablet only)
     -------------------------------------------------------- */
  const grid = document.getElementById('programsGrid');
  const dotsWrap = document.getElementById('sliderDots');

  if (grid && dotsWrap) {
    const cards = [...grid.querySelectorAll('.program-card')];

    const dots = cards.map((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show program ${i + 1}`);
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => {
        const padding = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
        grid.scrollTo({ left: card.offsetLeft - padding, behavior: 'smooth' });
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    let dotsTicking = false;
    grid.addEventListener('scroll', () => {
      if (dotsTicking) return;
      dotsTicking = true;
      requestAnimationFrame(() => {
        // Active = card whose left edge is closest to the scroll position
        const padding = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
        let active = 0;
        let best = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - padding - grid.scrollLeft);
          if (dist < best) { best = dist; active = i; }
        });
        dots.forEach((dot, i) => dot.setAttribute('aria-selected', String(i === active)));
        dotsTicking = false;
      });
    }, { passive: true });
  }

  /* --------------------------------------------------------
     10. Activities marquee (two independent rows)
     Each row's items are duplicated once into its own track so
     a -50% translate (CSS, desktop only) loops seamlessly — the
     visible half always looks identical to the next.
     -------------------------------------------------------- */
  document.querySelectorAll('.marquee-track').forEach((track) => {
    [...track.children].forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* --------------------------------------------------------
     11. Testimonials: auto-rotate every 5s with fade + dots
     -------------------------------------------------------- */
  const testimonialSlider = document.getElementById('testimonialSlider');
  const testimonialDots = document.getElementById('testimonialDots');
  const testimonialWrap = testimonialSlider?.closest('.testimonial-wrap');
  const testimonialPrev = document.getElementById('testimonialPrev');
  const testimonialNext = document.getElementById('testimonialNext');

  if (testimonialSlider && testimonialDots) {
    const slides = [...testimonialSlider.querySelectorAll('.testimonial-slide')];
    let activeIndex = slides.findIndex((s) => s.classList.contains('is-active'));
    if (activeIndex < 0) activeIndex = 0;

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show testimonial ${i + 1}`);
      dot.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      dot.addEventListener('click', () => goTo(i, true));
      testimonialDots.appendChild(dot);
      return dot;
    });

    const goTo = (index, userInitiated) => {
      slides[activeIndex].classList.remove('is-active');
      dots[activeIndex].setAttribute('aria-selected', 'false');
      activeIndex = index;
      slides[activeIndex].classList.add('is-active');
      dots[activeIndex].setAttribute('aria-selected', 'true');
      if (userInitiated) restart();
    };

    const step = (delta) => goTo((activeIndex + delta + slides.length) % slides.length, true);
    const next = () => goTo((activeIndex + 1) % slides.length, false);

    testimonialPrev?.addEventListener('click', () => step(-1));
    testimonialNext?.addEventListener('click', () => step(1));

    let timer = null;
    const start = () => { timer = setInterval(next, 5000); };
    const stop = () => { clearInterval(timer); timer = null; };
    const restart = () => { stop(); start(); };

    if (!prefersReducedMotion) {
      if (!document.hidden) start();

      // Pause while the tab is hidden or the visitor is interacting
      // (reading the quote, or hovering either arrow button)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
      });
      (testimonialWrap || testimonialSlider).addEventListener('pointerenter', stop);
      (testimonialWrap || testimonialSlider).addEventListener('pointerleave', start);
    }
  }

  /* --------------------------------------------------------
     12. Highlight the nav link for the section in view
     -------------------------------------------------------- */
  const sectionLinks = navLinks.querySelectorAll('a:not(.btn)');
  const sections = [...sectionLinks]
    // On apply.html these hrefs point to "index.html#home" etc. —
    // not a same-page anchor, and not even a valid CSS selector for
    // querySelector (it would throw). Only resolve genuine "#id" links.
    .map((link) => {
      const href = link.getAttribute('href') || '';
      return href.startsWith('#') ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((section) => activeObserver.observe(section));

  /* --------------------------------------------------------
     13. apply.html: hide the loading spinner once the Tally
     iframe has actually loaded. Absent on every other page,
     hence the guard.
     -------------------------------------------------------- */
  const applyIframe = document.getElementById('applyIframe');
  const applySpinner = document.getElementById('applySpinner');

  if (applyIframe && applySpinner) {
    applyIframe.addEventListener('load', () => {
      applySpinner.classList.add('is-hidden');
    });
  }

  /* --------------------------------------------------------
     14. "Apply Now" popup (index.html only — every button with
     .js-apply-trigger opens this instead of navigating). Absent
     elsewhere (e.g. apply.html), hence the guard.
     -------------------------------------------------------- */
  const applyModal = document.getElementById('applyModal');
  const applyModalRows = document.getElementById('applyModalRows');
  const applyModalClose = document.getElementById('applyModalClose');
  const applyModalBackdrop = document.getElementById('applyModalBackdrop');
  const applyModalSheet = applyModal ? applyModal.querySelector('.apply-modal-sheet') : null;
  const applyTriggers = document.querySelectorAll('.js-apply-trigger');

  if (applyModal && applyModalRows && applyModalSheet && applyTriggers.length) {
    // Build the row list from CONTACT — anything falsy (including
    // SHOW_FORM_OPTION being false) is filtered out below, so an
    // empty facebook string simply omits that row rather than
    // shipping a link to nowhere.
    const ROW_DEFS = [
      CONTACT.whatsapp && { title: 'WhatsApp', desc: 'Chat with us', href: CONTACT.whatsapp, icon: '#icon-whatsapp' },
      CONTACT.email && { title: 'Email', desc: 'Send us an email', href: CONTACT.email, icon: '#icon-mail' },
      CONTACT.instagram && { title: 'Instagram', desc: 'Message us on Instagram', href: CONTACT.instagram, icon: '#icon-instagram' },
      CONTACT.facebook && { title: 'Facebook', desc: 'Message us on Facebook', href: CONTACT.facebook, icon: '#icon-facebook' },
      SHOW_FORM_OPTION && { title: 'Application Form', desc: 'Fill the quick form', href: 'apply.html', icon: '#icon-form', internal: true },
    ].filter(Boolean);

    ROW_DEFS.forEach((row, i) => {
      const a = document.createElement('a');
      a.className = 'apply-modal-row';
      a.href = row.href;
      a.style.setProperty('--i', i);
      if (!row.internal) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      a.innerHTML =
        `<span class="apply-modal-row-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="${row.icon}"/></svg></span>` +
        `<span class="apply-modal-row-text"><strong>${row.title}</strong><span>${row.desc}</span></span>` +
        `<span class="apply-modal-row-arrow" aria-hidden="true">→</span>`;
      applyModalRows.appendChild(a);
    });

    let lastFocused = null;
    let closeTimer = null;

    const getFocusable = () =>
      [...applyModalSheet.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')];

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        closeApplyModal();
        return;
      }
      if (e.key !== 'Tab') return;

      // Simple focus trap: wrap Tab/Shift+Tab at the sheet's edges
      const focusables = getFocusable();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    function openApplyModal(trigger) {
      lastFocused = trigger || document.activeElement;
      clearTimeout(closeTimer);
      applyModal.classList.remove('is-closing');
      applyModal.hidden = false;
      document.body.classList.add('modal-open');

      // Force a layout flush so the browser registers the
      // hidden→visible change before .is-open is added — otherwise
      // there's nothing for the opacity/scale transition to animate
      // from and it just snaps straight to the open state.
      void applyModal.offsetHeight;
      applyModal.classList.add('is-open');

      const focusables = getFocusable();
      (focusables[0] || applyModalSheet).focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeApplyModal() {
      applyModal.classList.remove('is-open');
      applyModal.classList.add('is-closing');
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);

      const duration = prefersReducedMotion ? 0 : 260;
      closeTimer = setTimeout(() => {
        applyModal.hidden = true;
        applyModal.classList.remove('is-closing');
      }, duration);

      if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus();
    }

    applyTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => openApplyModal(trigger));
    });

    if (applyModalClose) applyModalClose.addEventListener('click', closeApplyModal);
    if (applyModalBackdrop) applyModalBackdrop.addEventListener('click', closeApplyModal);
  }

  /* --------------------------------------------------------
     11. Keep the footer copyright year current
     -------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
