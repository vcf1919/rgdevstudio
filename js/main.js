/* =========================================================
   rgdevstudio · propuesta 3 — el móvil que viaja
   Sin librerías. El móvil es CSS 3D; aquí se calcula su recorrido:
   - "Estaciones" ligadas a elementos de la página (hero, cada
     proyecto, contacto). Entre estaciones se interpola posición,
     escala y giro; cada cambio de proyecto da una vuelta completa
     y la pantalla cambia cuando el móvil está de espaldas.
   - Suavizado por frame, flotación, inclinación con el ratón y
     arrastre con inercia en el hero.
   - prefers-reduced-motion: móvil quieto en el hero, sin recorrido.
   ========================================================= */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqDesk = window.matchMedia('(min-width: 901px)');

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Titular gigante: letras que suben ---------- */
  let n = 0;
  $$('.giant-row').forEach(row => {
    const text = row.textContent;
    row.textContent = '';
    for (const ch of text) {
      const s = d.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--n', n++);
      s.textContent = ch;
      row.append(s);
    }
  });

  /* ---------- Titulares gigantes: se ajustan al ancho disponible ---------- */
  const fitText = () => {
    $$('.giant-row, .footer-word').forEach(el => {
      el.style.fontSize = '';
      const box = el.parentElement.clientWidth || window.innerWidth;
      const max = el.classList.contains('footer-word') ? box : box * 0.96;
      const w = el.scrollWidth;
      if (w > max) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * max / w).toFixed(1) + 'px';
    });
  };
  fitText();

  const header = $('.site-header');

  /* ---------- Escena ---------- */
  const stage = $('.stage');
  const phone = $('.phone');
  const shadow = $('.phone-shadow');
  const glow = $('.phone-glow');
  const svcCards = $$('[data-svc]');
  const screenHost = $('.phone-screen');
  const hero = $('.hero');
  const heroSlot = $('.hero-slot');
  const dragHint = $('.drag-hint');
  const projects = $$('[data-project]');
  const PH = 620, PW = 300, SCREEN_H = 598;

  // Las pantallas de los proyectos se clonan dentro del móvil 3D
  const chatScreen = $('.screen--chat', screenHost);
  projects.forEach(p => {
    const src = $('.mini-phone .screen', p);
    if (src) screenHost.insertBefore(src.cloneNode(true), chatScreen);
  });
  const phoneScreens = {};
  $$('.screen', screenHost).forEach(s => { phoneScreens[s.dataset.screenId] = s; });
  const screenMax = {};
  const measureScreens = () => {
    Object.entries(phoneScreens).forEach(([id, s]) => {
      const inner = $('.screen-scroll', s);
      screenMax[id] = Math.max(0, inner.scrollHeight - SCREEN_H);
    });
  };

  let mode = 'static';          // 'desk' | 'mobile' | 'static'
  let stations = [];
  let vw = window.innerWidth, vh = window.innerHeight;

  const pageRect = el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + window.scrollY + r.height / 2 };
  };

  function measure() {
    fitText();
    vw = window.innerWidth;
    vh = window.innerHeight;
    mode = reduce ? 'static' : (mqDesk.matches ? 'desk' : 'mobile');
    root.classList.toggle('tour', mode !== 'static');
    root.classList.toggle('tour-desk', mode === 'desk');
    measureScreens();

    const maxScroll = Math.max(0, d.documentElement.scrollHeight - vh);
    const hs = pageRect(heroSlot);
    const heroSc = Math.min(hs.height / PH, (hs.width + 40) / PW, 1.1);
    const heroSt = { s: 0, x: hs.cx - vw / 2, y: hs.cy - vh / 2, sc: heroSc, rx: 8, ry: -20, rz: 4, screen: 'build', float: 1, inter: 1 };

    if (mode === 'static') {
      // El escenario va pegado al hero y se desplaza con la página
      stage.style.height = hero.offsetHeight + 'px';
      stations = [{ ...heroSt, y: hs.cy - hero.offsetTop - hero.offsetHeight / 2, float: 0, inter: 0 }];
      return;
    }
    stage.style.height = '';

    if (mode === 'mobile') {
      // Teléfono: hero → sale girando → vuelve en Servicios dentro de una
      // "ventana" fija arriba mientras las tarjetas pasan por debajo → sale
      const exitS = hero.offsetTop + hero.offsetHeight - vh * 0.55;
      const list = [
        heroSt,
        { s: Math.max(exitS, 1), x: 0, y: -vh / 2 - PH * heroSc / 2 - 60, sc: heroSc * 0.9, rx: -14, ry: 520, rz: -14, screen: 'build', float: 0, inter: 0 }
      ];
      const slot = $('.services-slot');
      const grid = $('.services-grid');
      if (slot && grid) {
        const hdr = header.offsetHeight;
        const slotH = slot.offsetHeight;
        const gridTop = pageRect(grid).top;
        const sc = Math.min((slotH * 1.02) / PH, (vw * 0.62) / PW);
        const y = hdr + slotH / 2 - vh / 2;
        const viewCenter = (hdr + slotH + vh) / 2;           // centro del hueco visible bajo la ventana
        const offTop = -vh / 2 - PH * sc / 2 - 60;
        const tilts = [-18, 16, -18];
        const hold = vh * 0.12;
        list.push({ s: gridTop - hdr - vh * 0.6, x: 0, y: offTop, sc, rx: 46, ry: 520, rz: -14, screen: 'svc-landing', float: 0, inter: 0, glow: 0 });
        $$('[data-svc]').forEach((card, i) => {
          const r = pageRect(card);
          const s = Math.max(r.cy - viewCenter, gridTop - hdr + 1);
          const st = { s: s - hold, x: 0, y, sc, rx: 46 + 360 * (i + 1), ry: 700, rz: tilts[i], screen: card.dataset.svc, float: 0.4, inter: 0, glow: 1, svc: i };
          list.push(st, { ...st, s: s + hold });
        });
        const gridEnd = gridTop + grid.offsetHeight;
        list.push({ s: gridEnd - hdr - slotH * 0.6, x: 0, y: offTop, sc, rx: 1072, ry: 880, rz: -14, screen: 'svc-mant', float: 0, inter: 0, glow: 0 });
      }
      for (let i = 1; i < list.length; i++) if (list[i].s <= list[i - 1].s) list[i].s = list[i - 1].s + 1;
      stations = list;
      return;
    }

    // Escritorio: hero → 3 proyectos → sale por arriba → reaparece en contacto
    const list = [heroSt];
    const rots = [340, 700, 1060];
    const tilts = [[4, -3], [6, 3], [4, -3]];
    let last = null;
    projects.forEach((p, i) => {
      const r = pageRect(p);
      const vis = pageRect($('.project-visual', p));
      const s = r.top + r.height / 2 - vh / 2;
      const sc = Math.min((vh * 0.76) / PH, (vis.width - 20) / PW, 1.05);
      last = { s, x: vis.cx - vw / 2, y: vis.cy - s - vh / 2, sc, rx: tilts[i][0], ry: rots[i], rz: tilts[i][1], screen: p.dataset.project, float: 0.55, inter: 0, project: p.dataset.project };
      list.push(last);
    });

    const contact = pageRect($('#contacto'));
    const process = pageRect($('#proceso'));
    const cslot = pageRect($('.contact-slot'));
    const csc = Math.min((cslot.height || vh * 0.7) / PH, (cslot.width + 40) / PW, 1);
    const offTop = sc => -vh / 2 - PH * sc / 2 - 80;

    // Servicios: el móvil sale por arriba al acabar los proyectos y vuelve
    // desde abajo por la columna izquierda, sin pasar nunca por el titular.
    // En cada servicio se queda quieto mientras se lee la tarjeta y da la
    // voltereta solo entre tarjetas (cambia de pantalla de espaldas).
    const sslot = pageRect($('.services-slot'));
    const ssc = Math.min((vh * 0.72) / PH, (sslot.width - 40) / PW, 0.95);
    const svcTilts = [-22, 18, -22];
    const hold = vh * 0.14;
    const services = pageRect($('#servicios'));
    const svcCardsR = $$('[data-svc]').map(pageRect);
    const s1 = svcCardsR[0].cy - vh / 2;
    const offBelow = sc => vh / 2 + PH * sc / 2 + 80;
    list.push({ s: services.top - vh * 0.5, x: last.x, y: offTop(last.sc), sc: last.sc * 0.9, rx: -10, ry: 1240, rz: -12, screen: 'moda', float: 0, inter: 0, glow: 0 });
    list.push({ s: s1 - hold - vh * 0.55, x: sslot.cx - vw / 2, y: offBelow(ssc), sc: ssc, rx: 46 + 180, ry: 1420, rz: svcTilts[0], screen: 'svc-landing', float: 0, inter: 0, glow: 0 });
    $$('[data-svc]').forEach((card, i) => {
      const r = svcCardsR[i];
      const st = { s: r.cy - vh / 2 - hold, x: sslot.cx - vw / 2, y: 0, sc: ssc, rx: 46 + 360 * (i + 1), ry: 1420, rz: svcTilts[i], screen: card.dataset.svc, float: 0.5, inter: 0, glow: 1, svc: i };
      list.push(st, { ...st, s: r.cy - vh / 2 + hold });
    });

    list.push({ s: process.top - vh * 0.3, x: sslot.cx - vw / 2, y: offTop(ssc), sc: ssc * 0.9, rx: 1072, ry: 1600, rz: -14, screen: 'svc-mant', float: 0, inter: 0, glow: 0 });
    list.push({ s: contact.top - vh * 0.85, x: cslot.cx - vw / 2, y: offTop(csc), sc: csc, rx: 1072, ry: 1600, rz: 14, screen: 'chat', float: 0, inter: 0, glow: 0 });
    const cs = clamp(cslot.cy - vh / 2, 0, maxScroll);
    const contactSt = { s: cs, x: cslot.cx - vw / 2, y: cslot.cy - cs - vh / 2, sc: csc, rx: 1086, ry: 1780, rz: -5, screen: 'chat', float: 0.8, inter: 0, glow: 0.7 };
    list.push(contactSt);
    if (cs < maxScroll - 2) list.push({ ...contactSt, s: maxScroll, y: cslot.cy - maxScroll - vh / 2 });

    // Garantiza que las estaciones van en orden de scroll
    for (let i = 1; i < list.length; i++) if (list[i].s <= list[i - 1].s) list[i].s = list[i - 1].s + 1;
    stations = list;
  }

  function sample(scroll) {
    if (stations.length === 1 || scroll <= stations[0].s) return { ...stations[0], t: 0, a: stations[0], b: stations[0] };
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i], b = stations[i + 1];
      if (scroll < b.s) {
        const t = smooth(clamp((scroll - a.s) / (b.s - a.s), 0, 1));
        return {
          x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), sc: lerp(a.sc, b.sc, t),
          rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rz: lerp(a.rz, b.rz, t),
          float: lerp(a.float, b.float, t), inter: lerp(a.inter, b.inter, t), glow: lerp(a.glow || 0, b.glow || 0, t),
          screen: t < 0.5 ? a.screen : b.screen, t, a, b
        };
      }
    }
    const z = stations[stations.length - 1];
    return { ...z, t: 1, a: z, b: z };
  }

  /* ---------- Interacción: ratón y arrastre ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer) {
    window.addEventListener('pointermove', e => {
      pointer.tx = e.clientX / vw - 0.5;
      pointer.ty = e.clientY / vh - 0.5;
    }, { passive: true });
  }

  let spin = 0, spinVel = 0, dragging = false, dragX = 0, dragged = false;
  phone.addEventListener('pointerdown', e => {
    if (!stage.classList.contains('is-interactive')) return;
    dragging = true; dragX = e.clientX; spinVel = 0;
    phone.classList.add('is-dragging');
    phone.setPointerCapture(e.pointerId);
  });
  phone.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    dragX = e.clientX;
    spin += dx * 0.6;
    spinVel = dx * 0.6;
    if (!dragged && Math.abs(spin) > 30) { dragged = true; dragHint.classList.add('is-gone'); }
  });
  const endDrag = () => { dragging = false; phone.classList.remove('is-dragging'); };
  phone.addEventListener('pointerup', endDrag);
  phone.addEventListener('pointercancel', endDrag);

  /* ---------- Bucle ---------- */
  const cur = { x: 0, y: 0, sc: 1, rx: 0, ry: 0, rz: 0, float: 1, glow: 0 };
  let first = true;
  let introStart = 0;
  let lastT = performance.now();
  let raf = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const scroll = window.scrollY;
    const tg = sample(scroll);

    if (first || mode === 'static') {
      Object.assign(cur, { x: tg.x, y: tg.y, sc: tg.sc, rx: tg.rx, ry: tg.ry, rz: tg.rz, float: tg.float, glow: tg.glow || 0 });
      first = false;
    } else {
      const k = 1 - Math.exp(-dt * 9);
      cur.x = lerp(cur.x, tg.x, k); cur.y = lerp(cur.y, tg.y, k); cur.sc = lerp(cur.sc, tg.sc, k);
      cur.rx = lerp(cur.rx, tg.rx, k); cur.ry = lerp(cur.ry, tg.ry, k); cur.rz = lerp(cur.rz, tg.rz, k);
      cur.float = lerp(cur.float, tg.float, k);
      cur.glow = lerp(cur.glow, tg.glow || 0, k);
    }

    // Arrastre con inercia; al soltar vuelve suavemente de frente
    if (!dragging) {
      spin += spinVel;
      spinVel *= Math.pow(0.9, dt * 60);
      if (Math.abs(spinVel) < 0.4) spin += (Math.round(spin / 360) * 360 - spin) * (1 - Math.exp(-dt * 4));
    }

    // Inclinación con el ratón (solo en el hero)
    pointer.x = lerp(pointer.x, pointer.tx, 0.08);
    pointer.y = lerp(pointer.y, pointer.ty, 0.08);
    const inter = mode === 'static' ? 0 : tg.inter;
    const tiltX = -pointer.y * 14 * inter;
    const tiltY = pointer.x * 26 * inter;

    // Flotación
    const t = now / 1000;
    const fl = mode === 'static' ? 0 : cur.float;
    const bob = Math.sin(t * 1.5) * 10 * fl;
    const sway = Math.sin(t * 0.9) * 1.6 * fl;

    // Entrada: cae girando y se posa
    let iy = 0, iry = 0, isc = 1;
    if (mode !== 'static') {
      const p = clamp((now - introStart) / 1700, 0, 1);
      iy = -(1 - easeOutCubic(p)) * vh * 0.95;
      iry = -(1 - easeOutQuart(p)) * 540;
      isc = 0.8 + 0.2 * easeOutCubic(p);
    }

    const x = cur.x, y = cur.y + bob + iy, sc = cur.sc * isc;
    const ry = cur.ry + spin + tiltY + iry;
    phone.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotateZ(${(cur.rz + sway).toFixed(2)}deg) rotateX(${(cur.rx + tiltX).toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    const g = (((ry % 360) + 360) % 360) / 360;
    phone.style.setProperty('--g', (1 - g).toFixed(3));

    // Sombra en el "suelo": más pequeña y clara cuanto más sube
    const lift = (bob + 10) / 20;
    const sy = cur.y + iy + PH * cur.sc * 0.5 + 34;
    shadow.style.transform = `translate3d(${x.toFixed(2)}px, ${sy.toFixed(2)}px, 0) scale(${(cur.sc * (1.05 - lift * 0.12)).toFixed(3)}, ${(cur.sc * 0.9).toFixed(3)})`;
    shadow.style.opacity = (clamp(1 - Math.abs(cur.y) / (vh * 0.45), 0, 1) * (0.9 - lift * 0.25) * (1 - Math.abs(iy) / vh) * (mode === 'mobile' ? 1 - cur.glow : 1)).toFixed(3);

    // Pantalla visible y desplazamiento interno de la web mostrada
    const screen = tg.screen;
    if (phone.dataset.screen !== screen) {
      phone.dataset.screen = screen;
      Object.entries(phoneScreens).forEach(([id, el]) => {
        const on = id === screen;
        el.classList.toggle('is-on', on);
        // Cada pantalla animada empieza desde el principio al aparecer
        if (on && el.getAnimations) el.getAnimations({ subtree: true }).forEach(a => { a.currentTime = 0; });
      });
    }

    // Halo de luz detrás del móvil
    glow.style.transform = `translate3d(${x.toFixed(2)}px, ${(cur.y + iy).toFixed(2)}px, 0) scale(${(cur.sc * (0.95 + Math.sin(t * 1.2) * 0.04)).toFixed(3)})`;
    glow.style.opacity = (cur.glow * clamp(1 - Math.abs(cur.y) / (vh * 0.6), 0, 1)).toFixed(3);

    // Servicio que se está mostrando en el móvil
    const svcIdx = (tg.t < 0.5 ? tg.a : tg.b).svc;
    svcCards.forEach((c, i) => c.classList.toggle('is-current', i === svcIdx));
    stations.forEach(st => {
      if (!st.project) return;
      const u = clamp((scroll - (st.s - vh * 0.45)) / (vh * 0.9), 0, 1);
      const el = phoneScreens[st.project];
      if (el) $('.screen-scroll', el).style.setProperty('--s', (smooth(u) * (screenMax[st.project] || 0)).toFixed(1));
    });

    stage.classList.toggle('is-interactive', mode !== 'static' && scroll < vh * 0.35);

    raf = requestAnimationFrame(frame);
  }

  function start() {
    measure();
    first = true;
    introStart = performance.now() + 200;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  let rt;
  const remeasure = () => { clearTimeout(rt); rt = setTimeout(measure, 120); };
  window.addEventListener('resize', remeasure, { passive: true });
  mqDesk.addEventListener && mqDesk.addEventListener('change', measure);
  window.addEventListener('load', measure);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
  d.addEventListener('visibilitychange', () => {
    if (d.hidden) cancelAnimationFrame(raf);
    else { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  });
  start();

  /* ---------- Chat: los mensajes aparecen al llegar a contacto ---------- */
  const contact = $('#contacto');
  if ('IntersectionObserver' in window && contact) {
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { phone.classList.add('is-chat-play'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(contact);
  }

  /* ---------- Reveals ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const sibs = $$('[data-reveal]', el.parentElement).filter(s => !s.classList.contains('is-in'));
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 4) * 80 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
  } else {
    $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Header ---------- */
  const darkZones = [$('#contacto'), $('.site-footer')];
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    header.classList.toggle('is-hidden', y > lastY + 2 && y > 600);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;
    const hb = header.getBoundingClientRect().bottom;
    header.classList.toggle('on-dark', darkZones.some(z => { const r = z.getBoundingClientRect(); return r.top < hb && r.bottom > 0; }));

    // Proceso: la línea avanza con el scroll y enciende los pasos
    const track = $('.process-track');
    if (track) {
      const r = track.getBoundingClientRect();
      const p = reduce ? 1 : clamp((vh * 0.75 - r.top) / (r.height + vh * 0.2), 0, 1);
      track.style.setProperty('--p', p.toFixed(3));
      $$('.step', track).forEach((s, i, all) => s.classList.toggle('is-on', p >= (i + 0.5) / all.length - 0.1));
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- FAQ ---------- */
  $$('.faq-item').forEach(item => {
    const summary = $('summary', item);
    const answer = $('.faq-answer', item);
    let anim = null;
    summary.addEventListener('click', e => {
      if (reduce || !item.animate) return;
      e.preventDefault();
      if (anim) anim.cancel();
      const h0 = item.offsetHeight;
      const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
      if (item.open) {
        anim = item.animate({ height: [h0 + 'px', summary.offsetHeight + 'px'] }, { duration: 380, easing: ease });
        anim.onfinish = () => { item.open = false; anim = null; measure(); };
      } else {
        item.open = true;
        anim = item.animate({ height: [h0 + 'px', item.offsetHeight + 'px'] }, { duration: 460, easing: ease });
        answer.animate({ opacity: [0, 1], transform: ['translateY(10px)', 'none'] }, { duration: 460, delay: 60, easing: ease, fill: 'backwards' });
        anim.onfinish = () => { anim = null; measure(); };
      }
    });
  });

  /* ---------- Servicios que preseleccionan el formulario ---------- */
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    const r = d.querySelector(`input[name="necesito"][value="${a.dataset.service}"]`);
    if (r) r.checked = true;
  }));

  /* ---------- Formulario (Netlify Forms) ---------- */
  const form = $('form[name="contacto"]');
  if (form) {
    const status = $('.form-status', form);
    const submit = $('.btn--submit', form);
    const setError = (input, msg) => {
      const field = input.closest('.field');
      field.classList.toggle('is-invalid', !!msg);
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      const err = $('.field-error', field);
      if (err) err.textContent = msg || '';
    };
    const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const isPhone = v => v.replace(/[^\d]/g, '').length >= 9 && /^[+\d\s().-]+$/.test(v);
    const validate = () => {
      let bad = null;
      const name = form.elements.nombre, contactEl = form.elements.contacto;
      if (!name.value.trim()) { setError(name, 'Escribe tu nombre para saber a quién respondo.'); bad = bad || name; } else setError(name, '');
      const c = contactEl.value.trim();
      if (!c) { setError(contactEl, 'Déjame un email o un teléfono para responderte.'); bad = bad || contactEl; }
      else if (!isEmail(c) && !isPhone(c)) { setError(contactEl, 'Revisa el email o el teléfono: parece que falta algo.'); bad = bad || contactEl; }
      else setError(contactEl, '');
      return bad;
    };
    const showSuccess = preview => {
      const box = d.createElement('div');
      box.className = 'form-success';
      box.setAttribute('tabindex', '-1');
      box.innerHTML = `<h3>¡Mensaje enviado!</h3><p>Gracias. Te respondo en menos de 24 horas.${preview ? ' (Vista previa: este mensaje no se ha enviado de verdad.)' : ''}</p>`;
      form.replaceChildren(box);
      box.focus();
      measure();
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('is-error');
      const bad = validate();
      if (bad) { bad.focus(); status.textContent = 'Revisa los campos marcados.'; status.classList.add('is-error'); return; }
      if (window.RG_PREVIEW) { showSuccess(true); return; }
      submit.disabled = true;
      $('.submit-label', submit).textContent = 'Enviando…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
        .then(res => { if (!res.ok) throw new Error(res.status); showSuccess(false); })
        .catch(() => {
          submit.disabled = false;
          $('.submit-label', submit).textContent = 'Enviar';
          status.textContent = 'No se ha podido enviar. Inténtalo de nuevo o escríbeme por WhatsApp.';
          status.classList.add('is-error');
        });
    });
  }
})();
