"use strict";
/* wmhb app: the wheel (Designs screen styles, Designs board styles, and later the price cards).
   This is the script from the design kit, section 6, as it is. Aadil tested it more than anything else:
   do not swap it for the browser's own scrolling, scroll-snap or scroll-driven animations.
   The only change from the kit: its wheels are kept in a plain object here, as there is no component to hang them on.

   How it is used:
     const w = cfWheel(key, numberOfCards, startIndex);
     container <div class="cf">: call w.ref(element) once it is on the page, and w.ref(null) when it is taken off
     each card <div data-cfi="0">: on first paint set the five styles from cfStyle(w, i) (cfPaint below writes them)
     the open button inside a card: cfTap(w, i, open)({ currentTarget: thatButton }) */
const CF = {};
const cfLerp = (a, b, f) => a + (b - a) * f;
const CFK = [[0, 0, 1, 1, 1], [80 + 10, 42, 0.82, 1, 0.74], [2 * 80 + 2, 58, 0.66, 1, 0.5], [3 * 80, 64, 0.5, 0, 0.3]];
const cfStyle = (w, i) => {
  const n = w.n; let d = i - w.p; d -= n * Math.round(d / n);
  const a = Math.abs(d), sg = d < 0 ? -1 : 1, k = a >= 2 ? 2 : Math.floor(a), f = Math.min(1, a - k), A = CFK[k], B = CFK[k + 1];
  const x = sg * cfLerp(A[0], B[0], f), ry = -sg * cfLerp(A[1], B[1], f), sc = cfLerp(A[2], B[2], f), br = cfLerp(A[4], B[4], f);
  let op = cfLerp(A[3], B[3], f); const edge = n / 2; if (a > edge - 0.5) op = Math.min(op, Math.max(0, (edge - a) * 2));
  return { t: a < 0.0005 ? 'none' : 'translateX(' + x.toFixed(1) + 'px) perspective(760px) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')',
    o: op > 0.995 ? '1' : op.toFixed(2), f: br > 0.995 ? 'none' : 'brightness(' + br.toFixed(2) + ')', z: String(100 - Math.round(a * 20)), v: op < 0.01 ? 'hidden' : 'visible' };
};
const cfApply = (w) => { const el = w.el; if (!el) return; const ks = el.children;
  for (let j = 0; j < ks.length; j++) { const c = ks[j], ix = c.getAttribute('data-cfi'); if (ix === null) continue; const st = cfStyle(w, +ix), key = st.t + st.o + st.f + st.z; if (c.__cfk === key) continue; c.__cfk = key;
    const cs = c.style; cs.transform = st.t; cs.opacity = st.o; cs.filter = st.f; cs.zIndex = st.z; cs.visibility = st.v; } };
const cfRun = (w) => { if (w.raf || !w.el) return; let last = 0; w.el.classList.add('cf-mv');
  const tick = (now) => { w.raf = 0; if (!w.el) return;
    if (w.drag || w.wheeling) { cfApply(w); return; }
    let dt = last ? (now - last) / 1000 : 1 / 60; last = now; if (dt > 0.1) dt = 0.1;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { w.p = w.t; w.v = 0; }
    else { const om = 15, steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps; for (let q = 0; q < steps; q++) { const acc = -om * om * (w.p - w.t) - 2 * om * w.v; w.v += acc * h; w.p += w.v * h; } }
    if (Math.abs(w.p - w.t) < 0.003 && Math.abs(w.v) < 0.03) { w.p = w.t = ((Math.round(w.t) % w.n) + w.n) % w.n; w.v = 0; cfApply(w); w.el.classList.remove('cf-mv'); return; }
    cfApply(w); w.raf = requestAnimationFrame(tick); };
  w.raf = requestAnimationFrame(tick); };
const cfGo = (w, i) => { let d = i - w.p; d -= w.n * Math.round(d / w.n); w.t = Math.round(w.p + d); w.wheeling = false; cfRun(w); };
const cfAttach = (w, el) => {
  if (!el) { if (w.raf) cancelAnimationFrame(w.raf); w.raf = 0; w.el = null; w.drag = false; w.wheeling = false; w.p = w.t = ((Math.round(w.t) % w.n) + w.n) % w.n; w.v = 0; return; }
  if (w.el === el) return; w.el = el; cfApply(w); if (el.__cfOn) return; el.__cfOn = 1;
  const PX = 80 + 10, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const scale = () => { const r = el.getBoundingClientRect(); return el.offsetWidth ? (r.width / el.offsetWidth) || 1 : 1; };
  let id = null, sx = 0, sy = 0, sp = 0, sc = 1, moved = false, hist = [];
  w.start = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; sc = scale(); moved = false; hist = []; };
  el.addEventListener('pointerdown', (e) => w.start(e));
  el.addEventListener('pointermove', (e) => { if (id === null || e.pointerId !== id) return;
    if (!moved) { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; if (Math.abs(dy) > Math.abs(dx)) { id = null; return; }
      moved = true; w.drag = true; w.wheeling = false; w.v = 0; sp = w.p; sx = e.clientX; try { el.setPointerCapture(id); } catch (err) {} }
    w.p = sp - (e.clientX - sx) / sc / PX; hist.push([e.timeStamp, e.clientX]); if (hist.length > 5) hist.shift(); cfRun(w); });
  const end = (e) => { if (id === null || e.pointerId !== id) return; id = null; if (!moved) return; moved = false; w.drag = false; w.block = performance.now();
    let v = 0; if (hist.length > 1) { const a = hist[0], b = hist[hist.length - 1], dt = (b[0] - a[0]) / 1000; if (dt > 0.004 && e.timeStamp - b[0] < 90) v = -((b[1] - a[1]) / sc / PX) / dt; }
    v = clamp(v, -14, 14); let t = Math.round(w.p + clamp(v * 0.22, -3, 3)); if (t === Math.round(sp) && Math.abs(v) > 1.5) t += v > 0 ? 1 : -1; w.t = t; w.v = v; cfRun(w); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => { if (performance.now() - w.block < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
  el.addEventListener('dragstart', (e) => e.preventDefault());
  let wt = 0, lock = false, lastAbs = 0, lastT = 0, peak = 0, axis = 'x', gp = 0;
  el.addEventListener('wheel', (e) => { let dx = e.deltaX; const dy = e.deltaY, gap = e.timeStamp - lastT; lastT = e.timeStamp;
    if (e.shiftKey && !dx) dx = dy;
    if (gap > 140) { axis = (e.shiftKey || Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y'; peak = 0; gp = w.p; if (lock) lock = false; }
    if (axis !== 'x' || !dx) return; e.preventDefault(); e.stopPropagation(); if (e.deltaMode === 1) dx *= 32;
    const ab = Math.abs(dx); if (lock) { if (ab > lastAbs + 2) { lock = false; peak = 0; gp = w.p; } else { lastAbs = ab; return; } }
    lastAbs = ab; if (ab > peak) peak = ab; clearTimeout(wt);
    const settle = () => { w.wheeling = false; let t = Math.round(w.p); if (t === Math.round(gp) && Math.abs(w.p - gp) > 0.18) t += w.p > gp ? 1 : -1; w.t = t; cfRun(w); };
    w.wheeling = true; w.drag = false; w.v = 0; w.p += dx / 180;
    if (Math.abs(w.p - gp) >= 3) { w.p = gp + (w.p > gp ? 3 : -3); lock = true; cfRun(w); settle(); }
    else if (peak > 14 && ab < 3) { lock = true; cfRun(w); settle(); }
    else { cfRun(w); wt = setTimeout(settle, 90); } }, { passive: false });
  el.addEventListener('focusin', (e) => { const c = e.target && e.target.closest && e.target.closest('[data-cfi]'); let fv = false; try { fv = e.target.matches(':focus-visible'); } catch (err) {} if (c && fv) cfGo(w, +c.getAttribute('data-cfi')); });
};
const cfWheel = (key, n, start) => { let w = CF[key]; if (!w) { w = CF[key] = { n: n, p: start, t: start, v: 0, el: null, raf: 0, drag: false, wheeling: false, block: 0, start: null };
  w.ref = (el) => cfAttach(w, el); w.ensure = (e) => { const el = e.currentTarget; if (el && w.el !== el) { cfAttach(w, el); if (e.type === 'pointerdown' && w.start) w.start(e.nativeEvent || e); } }; } return w; };
const cfTap = (w, i, open) => (e) => { const el = e && e.currentTarget && e.currentTarget.closest && e.currentTarget.closest('.cf'); if (el && w.el !== el) cfAttach(w, el);
  if (performance.now() - w.block < 350) return; let d = i - w.p; d -= w.n * Math.round(d / w.n); if (Math.abs(d) < 0.35) return open(); cfGo(w, i); };

/** The five styles a card needs when it is first drawn, as a style attribute. */
const cfPaint = (w, i) => { const s = cfStyle(w, i); return "transform:" + s.t + ";opacity:" + s.o + ";filter:" + s.f + ";z-index:" + s.z + ";visibility:" + s.v; };
