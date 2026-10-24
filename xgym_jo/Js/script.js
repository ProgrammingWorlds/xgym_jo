/* =====================================================
   X GYM JORDAN — script.js
   GSAP + ScrollTrigger + Three.js + Lenis
===================================================== */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger);

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE    = matchMedia('(hover:hover) and (pointer:fine)').matches;
if (REDUCED) document.documentElement.classList.add('no-anim');

/* ---------------- Smooth scroll (Lenis) ---------------- */
let lenis = null;
if (!REDUCED && window.Lenis) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToEl = (t) => {
  if (lenis) lenis.scrollTo(t, { offset: -70 });
  else (typeof t === 'string' ? $(t) : t)?.scrollIntoView({ behavior: 'smooth' });
};

/* ---------------- Text splitting ---------------- */
function splitText(el, mode = 'words') {
  const text = el.textContent;
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  const units = mode === 'chars'
    ? text.split(/(\s+)/).flatMap(p => p.trim() ? [...p] : [' '])
    : text.trim().split(/\s+/);
  const targets = [];
  units.forEach(u => {
    if (u === ' ') { el.appendChild(document.createTextNode(' ')); return; }
    const mask  = document.createElement('span'); mask.className  = 'mask';
    const inner = document.createElement('span'); inner.className = 'unit';
    inner.textContent = u;
    mask.appendChild(inner);
    el.appendChild(mask);
    targets.push(inner);
  });
  return targets;
}

/* ---------------- 3D Hero (Three.js) ---------------- */
let heroWorld = null;
function initThree() {
  const canvas = $('#webgl');
  if (!canvas || !window.THREE) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { canvas.style.display = 'none'; return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.set(0, 0, 10);

  const world = new THREE.Group();   // positioned / scaled responsively
  scene.add(world);
  heroWorld = world;

  /* --- the metallic X --- */
  const xGroup = new THREE.Group();
  const metal  = new THREE.MeshStandardMaterial({ color: 0xb9c2c8, metalness: .85, roughness: .32 });
  const barGeo = new THREE.BoxGeometry(.92, 4.6, .92);
  [-1, 1].forEach(s => {
    const bar = new THREE.Mesh(barGeo, metal);
    bar.rotation.z = s * .62;
    bar.add(new THREE.LineSegments(                       // neon edges
      new THREE.EdgesGeometry(barGeo),
      new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: .55 })
    ));
    xGroup.add(bar);
  });
  const core = new THREE.Mesh(                            // glowing energy core
    new THREE.SphereGeometry(.34, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x00e0ff, emissive: 0x00e0ff, emissiveIntensity: 2.2, roughness: .3 })
  );
  xGroup.add(core);
  world.add(xGroup);

  /* --- orbit ring --- */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, .025, 12, 160),
    new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: .5 })
  );
  ring.rotation.x = 1.2;
  world.add(ring);

  /* --- particles --- */
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - .5) * 26;
    pos[i * 3 + 1] = (Math.random() - .5) * 16;
    pos[i * 3 + 2] = (Math.random() - .5) * 12 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x00e0ff, size: .05, transparent: true, opacity: .5, depthWrite: false
  }));
  scene.add(stars);

  /* --- lights (cyan key / pink rim / white top) --- */
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const l1 = new THREE.PointLight(0x00e0ff, 1.6, 60); l1.position.set(-7, 5, 7);
  const l2 = new THREE.PointLight(0xff2d78, 1.4, 60); l2.position.set(8, -4, 5);
  const l3 = new THREE.DirectionalLight(0xffffff, .8); l3.position.set(3, 6, 9);
  scene.add(l1, l2, l3);

  /* --- mouse parallax --- */
  let mx = 0, my = 0;
  if (FINE) window.addEventListener('mousemove', e => {
    mx = e.clientX / innerWidth  - .5;
    my = e.clientY / innerHeight - .5;
  });

  const resize = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w > 899;
    world.position.set(wide ? 2.6 : 0, wide ? 0 : 1.6, 0);
    world.scale.setScalar(wide ? 1 : .62);
  };
  resize();
  window.addEventListener('resize', resize);

  if (!REDUCED) gsap.to(core.scale, {
    x: 1.35, y: 1.35, z: 1.35, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut'
  });

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (window.scrollY > innerHeight * 1.3) return;   // save GPU when hero is gone
    if (!REDUCED) {
      xGroup.rotation.y += dt * .5;
      ring.rotation.z   += dt * .18;
      stars.rotation.y  += dt * .02;
    }
    const spin = Math.min(window.scrollY / innerHeight, 1);   // scroll-driven tilt
    world.rotation.x += ((spin * .55) - world.rotation.x) * .06;
    camera.position.x += ((mx * 1.1)  - camera.position.x) * .05;
    camera.position.y += ((-my * .8)  - camera.position.y) * .05;
    camera.lookAt(world.position.x * .4, 0, 0);
    renderer.render(scene, camera);
  })();
}

/* ---------------- Preloader + hero intro ---------------- */
let heroChars = [];
if (!REDUCED) {
  $$('#heroTitle .h-line').forEach(l => heroChars.push(...splitText(l, 'chars')));
  gsap.set(heroChars, { yPercent: 115 });
}

function heroIntro() {
  const tl = gsap.timeline({ delay: .05 });
  tl.to(heroChars, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: .028 }, 0)
    .from('.hero-eyebrow',   { y: 24, opacity: 0, duration: .8, ease: 'power3.out' }, .1)
    .from('.hero-sub',       { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, .5)
    .from('.hero-cta > *',   { y: 30, opacity: 0, duration: .8, stagger: .1 }, .6)
    .from('.hero-stats .stat',{ y: 30, opacity: 0, duration: .8, stagger: .08 }, .75)
    .from('#nav',            { y: -60, opacity: 0, duration: .9, ease: 'power3.out' }, .3)
    .from('.hero-foot > *',  { y: 20, opacity: 0, duration: .7, stagger: .08 }, .95)
    .from('.h-accent',       { scale: 0, opacity: 0, duration: .6, ease: 'back.out(3)' }, 1.05);
  if (heroWorld) {
    tl.from(heroWorld.scale, { x: .001, y: .001, z: .001, duration: 1.8, ease: 'expo.out' }, .1)
      .from('#webgl', { opacity: 0, duration: 1.4 }, .1);
  }
}

function preloader() {
  const pre = $('#preloader');
  if (REDUCED) { pre.remove(); document.body.classList.remove('loading'); return; }
  lenis && lenis.stop();
  const count = { v: 0 }, counter = $('.pre-count');
  gsap.timeline({ onComplete() {
      pre.remove();
      document.body.classList.remove('loading');
      lenis && lenis.start();
      heroIntro();
  }})
  .to(count, { v: 100, duration: 1.8, ease: 'power2.inOut',
      onUpdate: () => counter.textContent = String(Math.round(count.v)).padStart(2, '0') })
  .to('.pre-bar i', { scaleX: 1, duration: 1.8, ease: 'power2.inOut' }, 0)
  .to('.pre-inner, .pre-count', { yPercent: -30, opacity: 0, duration: .45, ease: 'power2.in' }, '+=.15')
  .to(pre, { yPercent: -100, duration: .9, ease: 'power4.inOut' }, '<.1');
}

/* ---------------- Scroll animations ---------------- */
function initAnimations() {
  /* generic reveals */
  $$('[data-reveal]').forEach(el => {
    gsap.from(el, { y: 44, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* split headings */
  $$('[data-split]').forEach(h => {
    const words = splitText(h, 'words');
    gsap.set(words, { yPercent: 115 });
    gsap.to(words, { yPercent: 0, duration: .9, ease: 'power4.out', stagger: .06,
      scrollTrigger: { trigger: h, start: 'top 86%' } });
  });

  /* counters */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), obj = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 2, ease: 'power3.out',
        onUpdate: () => el.textContent = Math.round(obj.v).toLocaleString('en-US') }) });
  });

  /* marquees */
  $$('.marquee').forEach(mq => {
    const track = $('.marquee-track', mq);
    track.appendChild($('.marquee-inner', track).cloneNode(true));
    const rev = mq.classList.contains('reverse');
    gsap.fromTo(track, { xPercent: rev ? -50 : 0 },
      { xPercent: rev ? 0 : -50, duration: 24, ease: 'none', repeat: -1 });
  });

  /* about image parallax */
  $$('.about-media img').forEach((img, i) => {
    gsap.fromTo(img, { yPercent: i ? -8 : -6 }, { yPercent: i ? 8 : 6, ease: 'none',
      scrollTrigger: { trigger: '.about-media', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* pinned horizontal gallery (desktop only) */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.gallery-track');
    const dist  = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '#gallery', start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
      }});
    $$('.g-panel img').forEach(img => {
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img.closest('.g-panel'), containerAnimation: tween,
          start: 'left right', end: 'right left', scrub: true } });
    });
  });

  /* 3D tilt cards + glare */
  if (FINE) $$('.tilt').forEach(card => {
    gsap.set(card, { transformPerspective: 700 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power2.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power2.out' });
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - .5;
      const py = (e.clientY - r.top)  / r.height - .5;
      ry(px * 10); rx(py * -10);
      card.style.setProperty('--gx', ((px + .5) * 100) + '%');
      card.style.setProperty('--gy', ((py + .5) * 100) + '%');
    });
    card.addEventListener('mouseleave', () => { rx(0); ry(0); });
  });

  /* magnetic buttons */
  if (FINE) $$('.magnetic').forEach(btn => {
    const xTo = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3.out' });
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * .3);
      yTo((e.clientY - r.top  - r.height / 2) * .3);
    });
    btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });

  /* custom cursor */
  if (FINE) {
    const dot = $('.cursor-dot'), ringEl = $('.cursor-ring');
    gsap.set([dot, ringEl], { xPercent: -50, yPercent: -50 });
    const dx = gsap.quickSetter(dot, 'x', 'px'), dy = gsap.quickSetter(dot, 'y', 'px');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dx(mx); dy(my); });
    gsap.ticker.add(() => {
      rx += (mx - rx) * .14; ry += (my - ry) * .14;
      gsap.set(ringEl, { x: rx, y: ry });
    });
    const HOVER = 'a, button, .tilt';
    document.addEventListener('mouseover', e => { if (e.target.closest(HOVER)) ringEl.classList.add('active'); });
    document.addEventListener('mouseout',  e => { if (e.target.closest(HOVER)) ringEl.classList.remove('active'); });
  }
}

/* ---------------- Nav / menu ---------------- */
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled',
  (lenis ? lenis.scroll : window.scrollY) > 40);
if (lenis) lenis.on('scroll', onScroll);
window.addEventListener('scroll', onScroll);

let menuOpen = false;
const menu = $('#menu'), menuBtn = $('#menuBtn');
let menuTl = null;
if (!REDUCED) {
  menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .to(menu, { clipPath: 'circle(150% at calc(100% - 3rem) 3rem)', duration: .8, ease: 'power3.inOut' })
    .from('.menu-links a', { y: 60, opacity: 0, stagger: .06, duration: .55, ease: 'power3.out' }, '-=.35')
    .from('.menu-meta > div', { y: 20, opacity: 0, stagger: .12, duration: .5 }, '-=.4');
}
function toggleMenu(force) {
  menuOpen = typeof force === 'boolean' ? force : !menuOpen;
  document.body.classList.toggle('menu-open', menuOpen);
  if (menuTl) {
    if (menuOpen) { lenis && lenis.stop(); menuTl.timeScale(1).play(); }
    else { lenis && lenis.start(); menuTl.timeScale(1.6).reverse(); }
  } else {
    menuOpen ? (lenis && lenis.stop()) : (lenis && lenis.start());
  }
}
menuBtn.addEventListener('click', () => toggleMenu());
window.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });

/* smooth anchors */
 $$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    const t = $(id);
    if (menuOpen) { toggleMenu(false); setTimeout(() => scrollToEl(t), 500); }
    else scrollToEl(t);
  });
});

 $('#toTop').addEventListener('click', () =>
  lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }));
 $('#year').textContent = new Date().getFullYear();

/* ---------------- LIVE open/closed status (Amman time) ---------------- */
const SCHED = { sun:[6,23], mon:[6,23], tue:[6,23], wed:[6,23], thu:[6,22], fri:[10,18], sat:[6,23] };
const DAYS  = ['sun','mon','tue','wed','thu','fri','sat'];
const fmtT  = h => { const ap = h >= 12 ? 'PM' : 'AM'; const hh = h % 12 === 0 ? 12 : h % 12; return `${hh}:00 ${ap}`; };

function ammanNow() {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Amman', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date());
  const g = t => p.find(x => x.type === t).value;
  return { day: g('weekday').toLowerCase(), h: (+g('hour')) % 24, m: +g('minute'), s: +g('second') };
}
function updateLive() {
  const { day, h, m, s } = ammanNow();
  const clock = $('#liveClock');
  if (clock) clock.textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const [o, c] = SCHED[day];
  const open = h >= o && h < c;
  let msg;
  if (open) msg = `OPEN NOW — CLOSES ${fmtT(c)}`;
  else {
    let next = o, when = 'TODAY';
    for (let i = 0; i < 7; i++) {
      const d = DAYS[(DAYS.indexOf(day) + i) % 7];
      if (i === 0 && h < o) { next = SCHED[d][0]; break; }
      if (i > 0) { next = SCHED[d][0]; when = i === 1 ? 'TOMORROW' : d.toUpperCase(); break; }
    }
    msg = `CLOSED — OPENS ${when} ${fmtT(next)}`;
  }
  $$('[data-live]').forEach(el =>
    el.innerHTML = `<span class="status-dot ${open ? 'on' : ''}"></span>${msg}`);
  $$('.h-row').forEach(r =>
    r.classList.toggle('today', r.dataset.days.split(' ').includes(day)));
}
updateLive();
setInterval(updateLive, 1000);

/* ---------------- boot ---------------- */
initThree();
preloader();
if (!REDUCED) initAnimations();
else $$('[data-count]').forEach(el => el.textContent = (+el.dataset.count).toLocaleString('en-US'));
window.addEventListener('load', () => ScrollTrigger.refresh());