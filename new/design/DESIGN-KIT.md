# wmhb app: design kit for Claude Code

Written 25 Nov 2026. This goes with `HANDOVER.md` in the same folder. The handover says what each screen does. This kit holds the exact styles and scripts to copy, so the built app looks and moves like the approved designs. Copy these as they are. Do not restyle them.

Everything here is plain CSS and plain JavaScript. No framework and no animation library is needed.

## 1. Colours (dark theme, the only theme)

| Use | Value |
|---|---|
| Page background | `#121110`, with a soft yellow glow at the top (see `.wm-scroll` below) |
| Main text and icons | `#FAFAF7` |
| Text on yellow or on light keys | `#1C1B15` |
| Muted text | `#C4BFAF` |
| Hairlines and card borders | `rgba(250,250,247,0.18)` |
| Stronger borders (inputs, empty tick boxes) | `rgba(250,250,247,0.34)` |
| Tint for the current menu tab and info boxes | `rgba(250,250,247,0.14)` |
| Brand yellow | `#F1C22D`, always with `#1C1B15` text |
| Booked green | `#3A9A63` |
| Chosen-style green (Designs ticks) | `linear-gradient(180deg,#43A56E,#2B764A)` |
| Calendar cell in the month | `#2C2A23` |
| Calendar cell outside the month | `#191815` |
| Today's calendar cell | `rgba(241,194,45,0.26)` |
| Sheets and the side menu | `#1B1A16` |

The logo is the "wmhb" wordmark and ruler in yellow `#F1C22D`. Font is Inter Tight, weights 500 to 900. Page titles are lowercase, weight 900, letter-spacing -0.05em.

## 2. Spacing

One scale: 4, 8, 12, 16, 24, 32 px.

- 20 px from the screen edge to content.
- 12 px padding inside cards. 16 px inside list rows.
- 12 px between buttons and between cards in a list.
- 16 px between blocks. 24 px between sections. 32 px empty at the bottom of every page.
- Tap targets are 44 px or more. A small control (the 28 px tick circle) sits inside a 44 px button.

## 3. The 3D look: cards, sunk tracks, sheets

Give the classes below to the matching elements. A "card" is any raised rectangle (client cards, event cards, list rows, the Expected income and Should be in the bank boxes). The texture is the small noise picture inside the CSS, so keep the `url(data:...)` parts.

```css
.wm-root{background:#121110 !important}
.wm-scroll{background:radial-gradient(120% 420px at 50% 0,rgba(241,194,45,.07),transparent 70%)}
.wm-card{background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNDAiIGhlaWdodD0iMTQwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgIDAgMCAwIDAgMSAgMCAwIDAgMCAxICAwIDAgMCAwLjA5IDAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+),linear-gradient(180deg,#38352C 0,#27251F 100%) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -1px 0 rgba(0,0,0,.55),0 2px 0 rgba(0,0,0,.6),0 14px 26px rgba(0,0,0,.5)}
.wm-cell{background-image:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNDAiIGhlaWdodD0iMTQwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgIDAgMCAwIDAgMSAgMCAwIDAgMCAxICAwIDAgMCAwLjA5IDAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+),linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.16)) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 2px 0 rgba(0,0,0,.6)}
.wm-track{background:#0B0A09 !important;box-shadow:inset 0 2px 6px rgba(0,0,0,.85),0 1px 0 rgba(255,255,255,.09)}
.wm-seg[aria-pressed=true]{background-image:linear-gradient(180deg,#FFFFFF,#D9D5C8) !important;box-shadow:inset 0 1px 0 #FFFFFF,0 2px 0 rgba(0,0,0,.6),0 6px 12px rgba(0,0,0,.5)}
.wm-sheet,.wm-slide{background:#1B1A16 !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 -18px 40px rgba(0,0,0,.6)}
.wm-sheet{border-top:1px solid rgba(250,250,247,.22);animation:wmUp 380ms cubic-bezier(.32,.72,0,1) both}
.wm-scrim{animation:wmFade 260ms ease both}
.wm-slide{transition:transform 440ms cubic-bezier(.32,.72,0,1),visibility 440ms !important}
.wm-root button{transition:transform 140ms cubic-bezier(.23,1,.32,1)}
.wm-root button:active{transform:scale(.97)}
.wm-root .wm-scrim:active{transform:none}
.wm-scroll>*{animation:wmIn 460ms cubic-bezier(.23,1,.32,1) backwards}
.wm-scroll>*:nth-child(2){animation-delay:50ms}.wm-scroll>*:nth-child(3){animation-delay:95ms}.wm-scroll>*:nth-child(4){animation-delay:135ms}
.wm-scroll>*:nth-child(5){animation-delay:170ms}.wm-scroll>*:nth-child(6){animation-delay:200ms}.wm-scroll>*:nth-child(n+7){animation-delay:230ms}
.wm-bar{transform-origin:left center;animation:wmGrow 800ms cubic-bezier(.23,1,.32,1) 200ms both}
@keyframes wmUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes wmFade{from{opacity:0}to{opacity:1}}
@keyframes wmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes wmGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){.wm-root *,.wm-sheet,.wm-scrim{animation:none !important}.wm-root button:active{transform:none}.wm-slide{transition:none !important}}
@media (prefers-reduced-transparency:reduce){.wm-card{background:#22211B !important;-webkit-backdrop-filter:none;backdrop-filter:none}.wm-sheet,.wm-slide{background:#191813 !important;-webkit-backdrop-filter:none;backdrop-filter:none}}
```

- `.wm-root` is the app frame. `.wm-scroll` is the scrolling page area.
- `.wm-track` is a sunk slot (the Screen / Board slider, the All time / Year / Month slider). `.wm-seg` is a button inside a track where the pressed one is a raised light key.
- `.wm-sheet` is a bottom sheet (`role="dialog"`). `.wm-slide` is the side menu. `.wm-scrim` is the dark layer behind them.
- `.wm-bar` is the green paid bar on a Money client card. It grows from the left once.

## 4. Buttons

Rounded, with a material feel. Three colours and two smaller sizes.

```css
.k{border:0;border-radius:16px;min-height:52px;padding:0 16px;font:800 16px 'Inter Tight',system-ui,sans-serif;letter-spacing:-.01em;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform 130ms cubic-bezier(.23,1,.32,1),box-shadow 130ms ease,filter 130ms ease}
.k:active{transform:translateY(2px) scale(.985) !important;filter:brightness(.96)}
.k-gold{color:#1d1b12 !important;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAgIDAgMCAwIDAgMCAgMCAwIDAgMCAwICAwIDAgMCAwLjEgMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWx0ZXI9InVybCgjbikiLz48L3N2Zz4=),linear-gradient(180deg,#FBE08A 0,#F1C22D 46%,#CF9C12 100%) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -2px 0 rgba(110,76,0,.35),0 3px 0 #8A6809,0 14px 24px rgba(0,0,0,.5)}
.k-gold:active{box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -1px 0 rgba(110,76,0,.35),0 1px 0 #8A6809,0 5px 10px rgba(0,0,0,.5)}
.k-ivory{color:#1d1b12 !important;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAgIDAgMCAwIDAgMCAgMCAwIDAgMCAwICAwIDAgMCAwLjEgMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWx0ZXI9InVybCgjbikiLz48L3N2Zz4=),linear-gradient(180deg,#FFFDF6 0,#DCD7C7 100%) !important;box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(0,0,0,.14),0 3px 0 #8B8676,0 14px 24px rgba(0,0,0,.5)}
.k-ivory:active{box-shadow:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(0,0,0,.14),0 1px 0 #8B8676,0 5px 10px rgba(0,0,0,.5)}
.k-dark{color:#FAFAF7 !important;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgIDAgMCAwIDAgMSAgMCAwIDAgMCAxICAwIDAgMCAwLjA5IDAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+),linear-gradient(180deg,#444136 0,#27251F 100%) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -2px 0 rgba(0,0,0,.5),0 3px 0 #090807,0 14px 24px rgba(0,0,0,.45)}
.k-dark:active{box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -1px 0 rgba(0,0,0,.5),0 1px 0 #090807,0 5px 10px rgba(0,0,0,.45)}
.thumb{position:absolute;left:4px;top:4px;bottom:4px;width:calc(50% - 6px);border-radius:12px;background:linear-gradient(180deg,#FFFFFF,#D9D5C8);box-shadow:inset 0 1px 0 #fff,0 2px 0 rgba(0,0,0,.6),0 6px 12px rgba(0,0,0,.5);transition:transform 340ms cubic-bezier(.32,.72,0,1)}
.k-sm{min-height:44px;border-radius:999px;padding:0 16px;font-size:14px}
.k-xs{min-height:44px;border-radius:12px;padding:0 8px;font-size:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -2px 0 rgba(0,0,0,.4),0 2px 0 rgba(0,0,0,.6),0 6px 12px rgba(0,0,0,.35)}
.k-ivory.k-xs{box-shadow:inset 0 1px 0 #fff,inset 0 -2px 0 rgba(0,0,0,.14),0 2px 0 #8B8676,0 6px 12px rgba(0,0,0,.35)}
```

- `.k` is the base. Add `.k-gold` for the one main action on a page (Generate designs, Download picture), `.k-ivory` for a strong second action (Use the default, Download the 2 sticker files), `.k-dark` for everything else.
- `.k-sm` is the pill used for Back buttons ("‹ All designs"). `.k-xs` is the small button inside a wheel card.
- `.thumb` is the sliding light key inside a two-option `.wm-track` (see the slider pattern below).

## 5. Motion

Rules that were followed, and must be kept:

- Only `transform`, `opacity`, `clip-path` and `grid-template-rows` are animated.
- Things you can tap twice (open and close, tick and untick, slider) use CSS **transitions**, so they can reverse part-way. Keyframes are only for things that appear once.
- Strong ease-out `cubic-bezier(.23,1,.32,1)` for things arriving. Drawer curve `cubic-bezier(.32,.72,0,1)` for things that slide or open.
- Nothing in the page is longer than 300 ms, except sheets, the side menu and opening sections (340 to 440 ms).
- With `prefers-reduced-motion`, slides become plain fades and the wheel jumps without a spring.

```css
@keyframes pgFwd{from{opacity:0;transform:translateX(22px)}}
@keyframes pgBack{from{opacity:0;transform:translateX(-22px)}}
@keyframes tabR{from{opacity:0;transform:translateX(18px)}}
@keyframes tabL{from{opacity:0;transform:translateX(-18px)}}
@keyframes zoomIn{from{opacity:0;transform:scale(.96)}}
@keyframes stgIn{from{opacity:0;transform:translateY(10px)}}
.stg>*{animation:stgIn 340ms cubic-bezier(.23,1,.32,1) backwards}
.stg>*:nth-child(2){animation-delay:45ms}.stg>*:nth-child(3){animation-delay:80ms}.stg>*:nth-child(4){animation-delay:110ms}.stg>*:nth-child(5){animation-delay:135ms}.stg>*:nth-child(n+6){animation-delay:155ms}
@keyframes ckPop{0%{transform:scale(.55)}65%{transform:scale(1.1)}100%{transform:scale(1)}}
.ck{animation:ckPop 280ms cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.k:hover{filter:brightness(1.05)}}
@media (prefers-reduced-motion:reduce){
@keyframes pgFwd{from{opacity:0}}@keyframes pgBack{from{opacity:0}}@keyframes tabR{from{opacity:0}}@keyframes tabL{from{opacity:0}}@keyframes zoomIn{from{opacity:0}}@keyframes stgIn{from{opacity:0}}@keyframes ckPop{from{opacity:0}}
}
```

How they are used:

| Class or keyframe | Where |
|---|---|
| `pgFwd` 280 ms | A page you went forward to (open a client, open a style). On the page wrapper. |
| `pgBack` 280 ms | A page you came back to. |
| `tabR` / `tabL` 260 ms | Switching Screen to Board slides in from the right, Board to Screen from the left. |
| `zoomIn` 320 ms, 60 ms delay | The full-size price card. |
| `.stg` on a list wrapper | Rows arrive one after another (client list, folders, price list). |
| `.ck` on a tick mark | The tick pops when it appears. |

### Slider with a sliding thumb (Screen / Board)

```html
<div class="wm-track" role="group" aria-label="Design for" style="position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;padding:4px;border-radius:16px">
  <span aria-hidden="true" class="thumb" style="transform:translateX(0)"></span>            <!-- Board: translateX(calc(100% + 4px)) -->
  <button type="button" aria-pressed="true"  style="position:relative;min-height:44px;border:0;border-radius:12px;background:transparent;color:#1C1B15;font:800 16px 'Inter Tight',sans-serif;transition:color 200ms ease">Screen</button>
  <button type="button" aria-pressed="false" style="position:relative;min-height:44px;border:0;border-radius:12px;background:transparent;color:#FAFAF7;font:800 16px 'Inter Tight',sans-serif;transition:color 200ms ease">Board</button>
</div>
```

The three-option slider on Money (All time, Year, Month) uses `.wm-track` with `.wm-seg` buttons and no thumb.

### A section that opens and closes (Money lists, Event day cards, packing list)

```html
<button type="button" aria-expanded="false"> ...heading... <span class="plus"><i></i><i class="v"></i></span></button>
<div class="coll" style="display:grid;grid-template-rows:0fr;transition:grid-template-rows 340ms cubic-bezier(.32,.72,0,1)">
  <div style="min-height:0;overflow:hidden;visibility:hidden;transition:visibility 0s linear 340ms">
    <div style="opacity:0;transition:opacity 260ms ease"> ...content... </div>
  </div>
</div>
```

- Open: `grid-template-rows:1fr`, inner `visibility:visible` with `transition-delay:0s`, content `opacity:1`.
- Closed: `0fr`, `visibility:hidden` delayed by 340 ms (so closed content cannot be tabbed to), `opacity:0`.
- The plus is a 28 px circle with a 1.5 px border and two 2 px bars. The second bar is `rotate(90deg)` when closed and `rotate(0deg)` when open, `transition:transform 300ms cubic-bezier(.32,.72,0,1)`, so the plus turns into a minus.

### Tick circle and the green sweep (Designs style cards)

- The tick is a 44 x 44 button at `right:4px;top:4px` of the card, holding a 28 px circle. That puts the circle exactly 12 px from the top and right edges.
- Unticked: circle `border:2px solid rgba(255,253,248,.85)`, `background:rgba(0,0,0,.28)`. Ticked: `background:rgb(255,253,248)` with the border the same colour, and a green tick (`stroke:rgb(46,125,79)`, width 3.6) inside a `.ck` span. The circle's background eases over 180 ms.
- Behind the card content sits a green layer (`position:absolute;inset:0;border-radius:inherit;pointer-events:none`, the chosen-style gradient). It is revealed with
  `clip-path: circle(150% at calc(100% - 26px) 26px)` when ticked and `circle(0% at calc(100% - 26px) 26px)` when not,
  `transition: clip-path 480ms cubic-bezier(.23,1,.32,1)` going on and `220ms` going off. The green fills the box, not the pictures inside it.
- Only one style can be ticked per wheel. Ticking the ticked one again unticks it.

## 6. The wheel (Designs screen styles, Designs board styles, price cards)

This is the part Aadil tested most. The first version used the browser's own scrolling and felt sluggish and stopped crooked. **Do not use native scrolling, scroll-snap or scroll-driven animations for it.** Use the script below as it is.

What it does:

- One copy of each card. All cards sit in the same grid cell and the script sets `transform`, `opacity`, `filter`, `z-index` and `visibility` on each.
- You see the middle card and two each side. It loops forever by arithmetic.
- Drag follows the finger 1:1. A flick carries on with the finger's speed and can travel up to 3 cards.
- It settles with a critically damped spring (no bounce) and always lands exactly centred.
- It can be grabbed again mid-move with no jump.
- Click or tap a side card: it comes round to the middle. Click the middle card: it opens.
- A drag never opens a card (clicks are swallowed for 350 ms after a drag).
- Trackpad or shift + mouse wheel: about 180 px of travel per card, at most 3 cards per swipe, and the long tail of a swipe is ignored once it has settled. Up and down scrolling is left alone.
- Keyboard focus on a side card brings it round.
- Works when the page is zoomed (it measures its own scale).

```css
.cf{position:relative;display:grid;justify-items:center;align-items:center;padding:16px 0 24px;overflow:hidden;touch-action:pan-y;-webkit-user-select:none;user-select:none;cursor:grab}
@supports (overflow:clip){.cf{overflow-x:clip;overflow-y:visible}}
.cf>*{grid-area:1/1;width:190px}
.cf.cf-mv{cursor:grabbing}
.cf.cf-mv>*{will-change:transform,opacity,filter}
```

```js
// Lives inside a component. `this.__cf` just needs to be an object that outlives re-renders.
const CF = this.__cf || (this.__cf = {});
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
```

How to wire it:

```js
const w = cfWheel('S', 6, startIndex);            // key, number of cards, which card starts in the middle
// container:  <div class="cf">  -> call w.ref(element) once it exists, and w.ref(null) when it is removed
// each card:  <div data-cfi="0" style="...">  -> on first paint set the five styles from cfStyle(w, i):
//             transform: t, opacity: o, filter: f, z-index: z, visibility: v
// open button inside a card:  onclick = cfTap(w, i, () => openStyle(i))
```

- If the framework re-renders the cards, write the same five values from `cfStyle(w, i)` in the render, so a re-render never fights the script.
- Card width is 190 px. The step between cards is 80 px. Keep both, the look depends on them.
- The small board pictures on the board wheel must **not** use `mix-blend-mode`. It made every frame about four times heavier to draw. The big opened board keeps it.

## 7. Folder tiles and the price list (Videos, Prices)

```css
.fold{position:relative;display:flex;flex-direction:column;min-height:112px;padding:16px;box-sizing:border-box;border-radius:4px 16px 16px 16px;text-decoration:none;color:#1d1b12;font-family:'Inter Tight',system-ui,sans-serif;
background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAgIDAgMCAwIDAgMCAgMCAwIDAgMCAwICAwIDAgMCAwLjEgMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWx0ZXI9InVybCgjbikiLz48L3N2Zz4=),linear-gradient(180deg,#FBE08A 0,#F1C22D 42%,#D2A015 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -2px 0 rgba(110,76,0,.35),0 3px 0 #8A6809,0 14px 24px rgba(0,0,0,.5);
transition:transform 130ms cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.fold::before{content:"";position:absolute;left:0;top:-13px;width:48%;height:14px;border-radius:10px 12px 0 0;background:linear-gradient(180deg,#E9BE3A,#D8A81C);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
.fold:active{transform:translateY(2px) scale(.985)}
.fold::before{transition:transform 180ms cubic-bezier(.23,1,.32,1)}
@media (hover:hover) and (pointer:fine){.fold:hover::before{transform:translateY(-3px)}}
.fold-n{font-size:17px;font-weight:800;line-height:1.15;letter-spacing:-.01em}.fold-c{margin-top:4px;font-size:13px;font-weight:700;opacity:.72}.fold-o{margin-top:auto;padding-top:12px;font-size:12px;font-weight:800;opacity:.8}
.pnum{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#F1C22D;color:#1d1b12;font-size:14px;font-weight:900;flex-shrink:0}
```

- A folder is `<a class="fold" href="DRIVE LINK" target="_blank" rel="noopener">` with `.fold-n` (client name), `.fold-c` ("Client #05") and `.fold-o` ("Open in Drive ↗"). Two columns, `gap:30px 16px`, `padding:32px 20px 0`.
- A price list row is a `.k.k-dark` button with a `.pnum` number, the card name and a `›`.

## 8. The board picture (Designs, board styles)

Two photos of the real board are used: a **front** view and an **angled** view, both 1800 x 3000 px originals shown at 3:5. Aadil supplied them. See "Pictures the app needs" in the handover for where the files are.

Stickers and the screen are drawn in HTML on top of the photo, so wording changes straight away.

- **Sticker plane.** Lay the sticker artwork out on a 1800 x 3000 px plane that matches the front photo. Scale the plane to the picture width (`scale(width / 1800)`, `transform-origin:0 0`).
  - Front view: just the scale.
  - Angled view: the scale, then `matrix3d(0.99661988,0.096063979,0,8.2348335e-05,0.013639357,1.0535973,0,1.3101167e-05,0,0,1,0,30.728791,-18.569045,0,1)`.
  - On the big opened board the plane uses `mix-blend-mode:multiply` so the print picks up the board's shading. On the small wheel pictures it does not (see the wheel notes).
- **Scale.** The board is 1 m wide and is 1200 px wide on the plane, so 1 mm = 1.2 px.
- **Sticker limits (to be confirmed by Aadil, see the handover).** Top sticker up to 650 x 200 mm. Bottom sticker up to 650 x 450 mm. Both are centred on x = 912 px. The top zone starts at y = 516 px and the bottom zone at y = 2022 px. Wording must shrink to fit its zone. "Show size limits" draws a dashed red outline of each zone with a small label ("max 650 × 200 mm").
- **Screen.** The screen sits on its own 1800 x 3000 px plane with only `scale(width / 1800)` on it. Do not put the sticker plane's angled matrix on it. Draw the ticked screen style as a 640 x 360 px box on that plane and map it onto the board's screen:
  - front view: `matrix3d(1.00625,-7.4283635e-12,0,1.6853822e-14,2.3846637e-11,1.0083333,0,-1.1664955e-13,0,0,1,0,578,826,0,1)`
  - angled view: `matrix3d(0.93127765,0.074073562,0,6.9137168e-05,-3.496263e-11,0.98333333,0,-9.8250757e-14,0,0,1,0,608,859,0,1)`
  - both with `transform-origin:0 0`. If no screen style is ticked, or the wmhb default is ticked, draw nothing there: the photo already shows the default screen.
- **Turning.** Both views are stacked. The one showing is `opacity:1; transform:none`. The hidden one is `opacity:0` and turned a little: `perspective(900px) rotateY(-14deg) scale(.96)` for the front view, `perspective(900px) rotateY(14deg) scale(.96)` for the angled view. "Turn to the front" and "Turn to the side" swap them, with `transition: opacity 380ms, transform 380ms` on the drawer curve, so the board seems to turn.
