/* =============================================
   LATAWA REAL ESTATE — loader.js (v5 + Sanity)
   
   Sanity CDN query helper lives here.
   Every page calls sanityFetch(query) to pull
   live content from Sanity's public API.
   
   CONFIG — update these two lines with your
   Sanity project values:
   ============================================= */

const SANITY_PROJECT_ID = 'scsdsvoq';   // ← from sanity.io/manage
const SANITY_DATASET    = 'production';         // ← usually 'production'
const SANITY_API_VER    = '2024-01-01';

/* Query Sanity's public CDN — no auth needed for published docs */
async function sanityFetch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}?query=${encoded}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Sanity fetch ' + res.status);
    const json = await res.json();
    return json.result;
  } catch(e) {
    console.warn('[Sanity] fetch failed:', e);
    return null;
  }
}

/* Build Sanity image URL from an image asset reference */
function sanityImg(imageObj, w, q) {
  if (!imageObj?.asset?._ref) return null;
  const ref = imageObj.asset._ref;
  // ref format: image-{hash}-{width}x{height}-{ext}
  const [, id, dim, ext] = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/) || [];
  if (!id) return null;
  const base = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dim}.${ext}`;
  const params = [];
  if (w) params.push(`w=${w}`);
  if (q) params.push(`q=${q}`);
  else params.push('q=80');
  params.push('auto=format', 'fit=crop');
  return base + '?' + params.join('&');
}

/* =============================================
   PATH HELPER — works on server & file://
   ============================================= */
function getBasePath() {
  const proto = window.location.protocol;
  if (proto === 'http:' || proto === 'https:') return '/';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const depth = parts.length > 0 && parts[parts.length-1].includes('.') ? parts.length - 1 : parts.length;
  return depth > 0 ? '../'.repeat(depth) : './';
}

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_MOBILE = window.innerWidth <= 768;

/* =============================================
   INJECT HEADER & FOOTER
   ============================================= */
async function injectComponents() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const base = getBasePath();
  const slug = path === '/' || path === '/index.html' ? 'home'
    : path.split('/').filter(Boolean)[0] || 'home';

  // Header
  try {
    const hRes = await fetch(base + 'components/header.html');
    if (!hRes.ok) throw new Error('header ' + hRes.status);
    const hHtml = await hRes.text();
    const hw = document.createElement('div');
    hw.innerHTML = hHtml;
    hw.querySelectorAll('[data-page]').forEach(el => {
      if (el.getAttribute('data-page') === slug) el.classList.add('active');
    });
    const pc = document.getElementById('page-content');
    const par = pc ? pc.parentNode : document.body;
    const ref = pc || document.body.firstChild;
    hw.childNodes.forEach(n => { if (n.nodeType===1||n.nodeType===3) par.insertBefore(n.cloneNode(true), ref); });
  } catch(e) {
    console.warn('[loader] Header inject failed:', e);
  }

  // Footer
  try {
    const fRes = await fetch(base + 'components/footer.html');
    if (!fRes.ok) throw new Error('footer ' + fRes.status);
    const fHtml = await fRes.text();
    const fw = document.createElement('div');
    fw.innerHTML = fHtml;
    const fe = fw.querySelector('footer');
    if (fe) document.body.appendChild(fe);
  } catch(e) {
    console.warn('[loader] Footer inject failed:', e);
  }

  // Apply Sanity branding to header/footer
  await applyBranding();
}

/* =============================================
   APPLY SANITY BRANDING (logo, name, tagline)
   Runs after header/footer are in DOM
   ============================================= */
async function applyBranding() {
  const site = await sanityFetch(`*[_type=="siteSettings"][0]{
    siteName, siteSubtitle, tagline, footerAbout, accentColor, copyrightYear,
    logo, announcementBanner
  }`);
  if (!site) return;

  // Logo
  if (site.logo) {
    const logoUrl = sanityImg(site.logo, 160, 90);
    if (logoUrl) {
      document.querySelectorAll('.nav-logo .logo-svg, .footer-logo .logo-svg').forEach(svg => {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = site.siteName || 'Logo';
        img.style.cssText = 'height:40px;width:auto;object-fit:contain;';
        svg.replaceWith(img);
      });
    }
  }

  // Site name
  if (site.siteName) {
    document.querySelectorAll('.logo-name').forEach(el => el.textContent = site.siteName);
  }
  if (site.siteSubtitle) {
    document.querySelectorAll('.logo-sub').forEach(el => el.textContent = site.siteSubtitle);
  }

  // Footer tagline + about
  if (site.tagline) {
    document.querySelectorAll('.footer-tagline, .footer-credit').forEach(el => el.textContent = site.tagline);
  }
  if (site.footerAbout) {
    const fa = document.querySelector('.footer-about');
    if (fa) fa.textContent = site.footerAbout;
  }

  // Copyright year
  if (site.copyrightYear) {
    const copy = document.querySelector('.footer-bottom p');
    if (copy) copy.textContent = `© ${site.copyrightYear} Latawa Real Estate. All rights reserved.`;
  }

  // Accent colour (CSS variable)
  if (site.accentColor?.hex) {
    document.documentElement.style.setProperty('--accent', site.accentColor.hex);
  }

  // Announcement banner
  const b = site.announcementBanner;
  if (b?.active && b?.text) {
    const bar = document.createElement('div');
    bar.id = 'announcement-bar';
    const bg = b.color?.hex || '#C9A769';
    bar.style.cssText = `width:100%;padding:10px 20px;text-align:center;background:${bg};color:#080808;font-size:13px;font-weight:600;letter-spacing:0.5px;position:relative;z-index:1001;font-family:var(--font-body,Inter,sans-serif);`;
    const close = `<button onclick="this.parentNode.remove()" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;opacity:0.6;" aria-label="Close">\u00d7</button>`;
    bar.innerHTML = b.link
      ? `<a href="${b.link}" style="color:inherit;text-decoration:none;">${b.text} \u2192</a>${close}`
      : b.text + close;
    document.body.insertBefore(bar, document.body.firstChild);
  }
}

/* =============================================
   PRELOADER
   ============================================= */
function initPreloader() {
  return new Promise((resolve) => {
    const preloader = document.getElementById('preloader');
    const fill = document.getElementById('preloaderFill');
    if (!preloader || !fill) { resolve(); return; }
    let progress = 0;
    const step = () => {
      progress += Math.random() * 20 + 8;
      if (progress >= 100) {
        progress = 100; fill.style.width = '100%';
        if (typeof gsap !== 'undefined') {
          gsap.to(preloader, { opacity:0, duration:0.6, delay:0.2, onComplete:() => { preloader.style.display='none'; resolve(); }});
        } else {
          setTimeout(() => { preloader.style.opacity='0'; setTimeout(() => { preloader.style.display='none'; resolve(); }, 600); }, 200);
        }
        return;
      }
      fill.style.width = progress + '%';
      setTimeout(step, 120);
    };
    step();
  });
}

/* =============================================
   NAVBAR
   ============================================= */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { navbar.classList.toggle('scrolled', window.scrollY > 60); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
}

/* =============================================
   MOBILE MENU
   ============================================= */
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (!menu || !hamburger) return;
  menu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  const spans = hamburger.querySelectorAll('span');
  if (typeof gsap !== 'undefined') {
    gsap.to(spans[0], { rotate:0, y:0, duration:0.3 });
    gsap.to(spans[1], { opacity:1, duration:0.2 });
    gsap.to(spans[2], { rotate:0, y:0, duration:0.3 });
  }
  setTimeout(() => { menu.style.display = 'none'; }, 400);
}

function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (!hamburger || !menu) return;
  hamburger.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    const spans = hamburger.querySelectorAll('span');
    if (isOpen) {
      closeMobileMenu();
    } else {
      menu.style.display = 'flex';
      requestAnimationFrame(() => menu.classList.add('open'));
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (typeof gsap !== 'undefined') {
        gsap.to(spans[0], { rotate:45, y:6.5, duration:0.3 });
        gsap.to(spans[1], { opacity:0, duration:0.2 });
        gsap.to(spans[2], { rotate:-45, y:-6.5, duration:0.3 });
      }
    }
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMobileMenu()));
  document.addEventListener('keydown', e => { if (e.key==='Escape' && menu.classList.contains('open')) closeMobileMenu(); });
}

/* =============================================
   SMOOTH ANCHOR LINKS
   ============================================= */
function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
          closeMobileMenu();
        }
      }
    });
  });
}

/* =============================================
   SCROLL REVEALS
   ============================================= */
function initScrollReveals() {
  if (PREFERS_REDUCED) {
    document.querySelectorAll('.reveal-up').forEach(el => { el.style.opacity='1'; el.style.transform='none'; });
    return;
  }
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    document.querySelectorAll('.reveal-up').forEach(el => {
      gsap.fromTo(el, { opacity:0, y:28 }, { opacity:1, y:0, duration:0.75, ease:'power3.out',
        scrollTrigger: { trigger:el, start:'top 90%', toggleActions:'play none none none' }});
    });
    const staggerGroups = [
      {sel:'.prop-card',stagger:0.07},{sel:'.service-card',stagger:0.07},{sel:'.trust-card',stagger:0.07},
      {sel:'.process-step',stagger:0.10},{sel:'.gallery-item',stagger:0.06},{sel:'.stat-card',stagger:0.07},
      {sel:'.founder-card',stagger:0.08},{sel:'.value-card',stagger:0.07},{sel:'.timeline-item',stagger:0.06},
      {sel:'.why-row',stagger:0.07},{sel:'.package-card',stagger:0.08},{sel:'.project-card',stagger:0.07},
    ];
    staggerGroups.forEach(({sel,stagger}) => {
      const items = document.querySelectorAll(sel);
      if (!items.length) return;
      items.forEach(el => el.classList.remove('reveal-up'));
      gsap.fromTo(items, { opacity:0, y:32 }, { opacity:1, y:0, duration:0.7, ease:'power3.out', stagger,
        scrollTrigger: { trigger:items[0].parentElement, start:'top 86%', toggleActions:'play none none none' }});
    });
    gsap.utils.toArray('.timeline-item').forEach((item,i) => {
      gsap.fromTo(item, { opacity:0, x:-16 }, { opacity:1, x:0, duration:0.6, ease:'power3.out', delay:i*0.04,
        scrollTrigger: { trigger:item, start:'top 92%', toggleActions:'play none none none' }});
    });
    if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh(), { passive:true });
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.transition='opacity 0.7s ease, transform 0.7s ease';
          entry.target.style.opacity='1'; entry.target.style.transform='none';
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin:'0px 0px -80px 0px' });
    document.querySelectorAll('.reveal-up').forEach(el => io.observe(el));
  }
}

/* =============================================
   CONTACT FORM
   ============================================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    const name = form.elements['name']?.value.trim();
    const phone = form.elements['phone']?.value.trim();
    if (!name || !phone) {
      btn.textContent = 'Please fill required fields';
      setTimeout(() => { btn.textContent = orig; }, 2200); return;
    }
    btn.textContent = 'Sending…'; btn.style.pointerEvents = 'none';
    setTimeout(() => {
      btn.textContent = 'Message Sent ✓'; form.reset();
      setTimeout(() => { btn.textContent = orig; btn.style.pointerEvents = ''; }, 3000);
    }, 1000);
  });
}

/* =============================================
   MARQUEE
   ============================================= */
function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  const wrap = track.closest('.marquee-wrap');
  if (!wrap) return;
  wrap.addEventListener('mouseenter', () => track.style.animationPlayState='paused');
  wrap.addEventListener('mouseleave', () => track.style.animationPlayState='running');
}

/* =============================================
   BOOT
   ============================================= */
async function boot() {
  await injectComponents();
  initNavbar();
  initMobileMenu();
  initSmoothLinks();
  initMarquee();
  initContactForm();
  if (typeof gsap !== 'undefined') {
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
    if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
  }
  await initPreloader();
  initScrollReveals();
  if (typeof window.__pageInit === 'function') window.__pageInit();
}

document.addEventListener('DOMContentLoaded', boot);
