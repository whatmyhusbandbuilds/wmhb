"use strict";
/* wmhb app: the Designs screen. Sara's workspace: the client list, the brief, the styles on the wheel, and one style opened.
   The pictures themselves are drawn by art.js from the style files in new/styles/. */

Object.assign(S, {
  dz: { row: 0, page: "list", side: "screen", open: 0, view: "angle", limits: false },   /* which client (0 = the list), which page, which wheel */
  dzDraft: {},        /* the brief as it is on screen, for each client that has been opened */
  dzPhotos: {},       /* each client's brief photos, once they have been read */
  dzArt: {}           /* each client's styles, drawn for their brief */
});
let dzMove = "";      /* how the page about to be drawn arrives: "fwd", "back" or "" */
let dzWheel = null;   /* the wheel that is on the page */

/* ---------- what the tracker says about a client's design ---------- */
const dzClient = () => { const b = S.dz.row ? eventAt(S.dz.row) : null; return b && live(b) ? b : null; };
const designOf = b => b.designs || (b.designs = {});
const DZ_WORDS = { none: "No brief yet", written: "Brief written", ready: "Styles ready to show", chosen: "Screen and board chosen" };
/** Where a client's design has got to. Ready = designs have been generated, or a style is ticked. */
function dzState(b) {
  const d = designOf(b);
  if (txt(d.screen) && txt(d.board)) return "chosen";
  if (txt(d.madeOn) || txt(d.screen) || txt(d.board)) return "ready";
  return ["names", "line2", "defaultWording", "thanksWording", "colours", "notes", "photos"].some(k => txt(d[k])) ? "written" : "none";
}
const pickOf = (b, side) => styleIndex(designOf(b)[side]);
const whose = b => withoutBrackets(b.client) + "'s";

/* ---------- the brief on screen ---------- */
/** The brief as it is being written. It starts from the tracker, with the usual wording in the two wording boxes. */
function dzDraftOf(b) {
  if (!S.dzDraft[b.row]) {
    const d = designOf(b);
    S.dzDraft[b.row] = { names: txt(d.names), line2: txt(d.line2), defaultWording: txt(d.defaultWording) || WORDING, thanksWording: txt(d.thanksWording) || THANKS, colours: colourList(d.colours), notes: txt(d.notes) };
  }
  return S.dzDraft[b.row];
}
const dzPhotoOf = row => { const box = S.dzPhotos[row]; return box && box.list.length ? box.list[0] : null; };       /* the newest photo is the one the styles use */
/** Every style, drawn for this client's brief. Drawn again only when the brief, the photo or the font changes. */
function dzArtOf(b) {
  const d = dzDraftOf(b), photo = dzPhotoOf(b.row), url = photo ? photo.url : "";
  const key = JSON.stringify([b.client, d.names, d.line2, d.defaultWording, d.thanksWording, d.colours, url, STYLES.length, document.fonts ? document.fonts.status : ""]);
  if (!S.dzArt[b.row] || S.dzArt[b.row].key !== key) S.dzArt[b.row] = { key, art: artFor(artBrief(b.client, d, url)) };
  return S.dzArt[b.row].art;
}
/** The screen that shows on the board: the ticked screen style. Nothing for the default, as the photo already shows it. */
const boardScreen = b => { const i = pickOf(b, "screen"); return i > 0 ? dzArtOf(b)[i].screens.default : null; };

/* ---------- the screen ---------- */
SCREENS.designs = {
  head: "h8", narrow: true,
  reset() { S.dz.row = 0; S.dz.page = "list"; },
  cls() { const c = dzMove ? " pg-" + dzMove : ""; dzMove = ""; return c; },
  /** A client's pages have their own top: a Back button, the name, and the Screen / Board slider. */
  top() {
    if (S.dz.row && !dzClient()) this.reset();              /* the booking has gone from the tracker */
    const b = dzClient(); if (!b) return null;
    const opened = S.dz.page === "open";
    return "<div class=\"head dzh\">" + barHtml() + "<div class=\"back\"><button class=\"k k-dark k-sm\" type=\"button\" data-do=\"dz-back\" data-fid=\"dz-back\">‹ " + (opened ? "All styles" : "All designs") + "</button></div>" +
      "<h1 class=\"dzn\">" + esc(opened ? styleTitle(S.dz.open) : b.client) + "</h1><p class=\"dzs\" id=\"dz-sub\">" + dzSub(b) + "</p></div>" +
      "<div class=\"dzseg\"><div class=\"wm-track seg2\" role=\"group\" aria-label=\"Design for\"><span aria-hidden=\"true\" class=\"thumb\" id=\"dz-thumb\"" + (S.dz.side === "board" ? " data-at=\"board\"" : "") + "></span>" +
      ["screen", "board"].map(side => "<button type=\"button\" data-do=\"dz-side\" data-side=\"" + side + "\" data-fid=\"dz-" + side + "\" aria-pressed=\"" + (S.dz.side === side) + "\">" + (side === "screen" ? "Screen" : "Board") + "</button>").join("") + "</div></div>";
  },
  html() {
    const b = dzClient();
    if (!b) return "<p class=\"lede dzl\" data-screen=\"designs\">Sara's design space. Tap a client to make their screens and board.</p><div class=\"dlist stg\" id=\"dz-list\"></div>";
    if (S.dz.page === "brief") return briefHtml(b);
    return "<div id=\"dz-body\" data-screen=\"designs\">" + (S.dz.page === "open" ? openedHtml(b) : stylesHtml(b)) + "</div>";
  },
  fill(first) {
    if (S.dz.row && !dzClient()) { this.reset(); go("designs"); return; }
    const b = dzClient();
    if (!b) { drawDesignList(first); return; }
    if (first) { dzLoadPhotos(b); dzLive(b); } else dzTicks(b);
  }
};
const dzSub = b => S.dz.page !== "open" ? eventLine({ b, f: moneyOf(b) }) : esc(S.dz.side === "screen" ? whose(b) + " screens" : "On " + whose(b) + " board");
/** Goes to one of a client's pages. */
function dzGo(page, move) {
  dzWheelOff(); S.dz.page = page; dzMove = move || ""; go("designs");
  const title = $("#view h1"); if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }      /* so a keyboard or a screen reader starts at the top of the new page */
}
function dzWheelOff() { if (dzWheel) { dzWheel.ref(null); dzWheel = null; } }
/** After a page is drawn: what needs the page to be there first (the wheel, and pictures sized to the page). */
function dzLive(b) {
  dzWheelOff();
  const el = $("#dz-wheel");
  if (el) { dzWheel = cfWheel("dz" + b.row + S.dz.side, STYLES.length, Math.max(0, pickOf(b, S.dz.side))); dzWheel.ref(el); }
  if (S.dz.page === "open") dzSize(); else if (S.dz.side === "board") dzBoardPictures();
  if (S.dz.page === "brief") { drawColours(b); drawPhotos(b); }
}

/* ---------- 1. the client list ---------- */
function drawDesignList(first) {
  const host = $("#dz-list"); if (!host) return;
  const list = comingEvents(), key = JSON.stringify(list.map(x => [x.b.row, x.b.client, x.b.type, x.f.date, x.b.invoice, dzState(x.b)]));
  if (host.dataset.key === key) return;
  host.dataset.key = key; if (!first) host.classList.remove("stg");        /* only the first drawing arrives row by row */
  host.innerHTML = list.map(x => {
    const state = dzState(x.b);
    return "<button class=\"dcard wm-card\" type=\"button\" data-do=\"dz-client\" data-row=\"" + x.b.row + "\" data-fid=\"dz-" + x.b.row + "\"><span class=\"top\"><span class=\"dwho\"><span class=\"n\">" + esc(x.b.client) + "</span><span class=\"s\">" + eventLine(x) + "</span></span>" +
      "<span class=\"in\">" + daysAway(x.f.date) + "</span><span class=\"chev\" aria-hidden=\"true\">›</span></span><span class=\"pl\"><span class=\"dpill " + (state === "none" ? "nobrief" : state) + "\">" + DZ_WORDS[state] + "</span></span></button>";
  }).join("") || "<p class=\"empty\">No events coming up.</p>";
}

/* ---------- 2. the brief ---------- */
const BRIEF_BOXES = [["names", "Names or title"], ["line2", "Second line"], ["defaultWording", "On the default screen"], ["thanksWording", "On the thank you screen"]];
function briefHtml(b) {
  const d = dzDraftOf(b), made = STYLES.length - 1;
  return "<div class=\"dzb\" data-screen=\"designs\" id=\"dz-brief\"><h3 class=\"dh\">The brief</h3><p class=\"dsub\">One brief for both the screen and the board.</p>" +
    BRIEF_BOXES.map(f => "<label class=\"dfl\"><span>" + f[1] + "</span><input class=\"dinp\" type=\"text\" data-key=\"" + f[0] + "\" data-fid=\"dzi-" + f[0] + "\" maxlength=\"200\" autocomplete=\"off\" value=\"" + esc(d[f[0]]) + "\"></label>").join("") +
    "<h3 class=\"dh\">Theme colours</h3><div class=\"dcols\" id=\"dz-cols\"></div>" +
    "<h3 class=\"dh\">Photos</h3><div class=\"dphotos\" id=\"dz-photos\"></div><input class=\"sr\" type=\"file\" id=\"dz-file\" accept=\"image/*\" tabindex=\"-1\" aria-hidden=\"true\">" +
    "<h3 class=\"dh\" id=\"dz-notes-h\">Notes from the chat</h3><textarea class=\"dinp dnotes\" rows=\"3\" data-key=\"notes\" data-fid=\"dzi-notes\" maxlength=\"2000\" aria-labelledby=\"dz-notes-h\">" + esc(d.notes) + "</textarea>" +
    "<button type=\"button\" class=\"k k-gold dgo\" data-do=\"dz-generate\" data-fid=\"dz-generate\">Generate designs</button><p class=\"dnote\">Makes " + made + " screen styles and " + made + " board styles.</p>" +
    "<button type=\"button\" class=\"k k-dark dskip\" data-do=\"dz-skip\" data-fid=\"dz-skip\">Skip the brief, use the wmhb default</button></div>";
}
function drawColours(b) {
  const host = $("#dz-cols"); if (!host) return;
  host.innerHTML = dzDraftOf(b).colours.map(name => "<span class=\"dcol\"><span class=\"sw" + (colourHex(name) ? "" : " unknown") + "\"" + (colourHex(name) ? " style=\"background:" + colourHex(name) + "\"" : "") + "></span>" + esc(name) + "</span>").join("") +
    "<button type=\"button\" class=\"dadd\" data-do=\"dz-colours\" data-fid=\"dz-colours\" aria-haspopup=\"dialog\" aria-label=\"Add or take away theme colours\">Add</button>";
}
function drawPhotos(b) {
  const host = $("#dz-photos"); if (!host) return;
  const box = S.dzPhotos[b.row] || { state: "ready", list: [] };
  host.innerHTML = box.list.map(p => "<span class=\"dph" + (p.saving ? " saving" : "") + "\" role=\"img\" aria-label=\"" + esc(p.saving ? "Saving " + p.name : p.name) + "\" style=\"background-image:url(" + p.url + ")\"></span>").join("") +
    (box.state === "loading" ? "<span class=\"dph loading\" role=\"status\">Loading photos…</span>" : "") +
    "<button type=\"button\" class=\"dphadd\" data-do=\"dz-photo\" data-fid=\"dz-photo\">Add a photo</button>" +
    (box.state === "failed" ? "<p class=\"dphnote\" role=\"status\">Couldn’t show their photos. <button class=\"linkbtn\" type=\"button\" data-do=\"dz-photos-again\">Try again</button></p>" : "");
}

/* ---------- 3. the styles, on the wheel ---------- */
const TICK_MARK = "<span class=\"ck\"><svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"rgb(46,125,79)\" stroke-width=\"3.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></svg></span>";
/** The tick circle in the corner of a style. The green sweeps across its box when it is ticked. */
const tickCircle = (i, on, label) => "<div class=\"sweep\" aria-hidden=\"true\"></div><button type=\"button\" class=\"dtick\" aria-label=\"Choose this one\"" + (label ? " aria-describedby=\"" + label + "\"" : "") + " aria-pressed=\"" + on + "\" data-do=\"dz-tick\" data-i=\"" + i + "\" data-fid=\"dz-tick-" + i + "\"><span class=\"circle\">" + (on ? TICK_MARK : "") + "</span></button>";
function stylesHtml(b) {
  const side = S.dz.side, art = dzArtOf(b), picked = pickOf(b, side);
  const w = cfWheel("dz" + b.row + side, STYLES.length, Math.max(0, picked));
  return "<p class=\"dhint\">" + (side === "screen" ? "Swipe either way. Tap a style to open it, or tap its circle to choose it." : "Swipe either way. Each board's screen shows the screen style you ticked.") + "</p>" +
    "<div class=\"cf\" id=\"dz-wheel\">" + STYLES.map((s, i) => {
      const a = art[i], title = styleTitle(i);
      const picture = side === "screen"
        ? screenHtml(a.screens.default, 163) + "<span class=\"minis\"><span><span class=\"ml\">Video</span>" + screenHtml(a.screens.video, 77) + "</span><span><span class=\"ml\">Thank you</span>" + screenHtml(a.screens.thanks, 77) + "</span></span>"
        : "<div aria-hidden=\"true\" class=\"bcrop\"><div class=\"bshift\"><div class=\"bview bd-a\" style=\"width:214px;height:357px\">" + boardImg(b, i, "angle", 214, false) + "</div></div></div>";
      return "<div class=\"wm-card wcard" + (picked === i ? " on" : "") + "\" data-cfi=\"" + i + "\" style=\"" + cfPaint(w, i) + "\">" + tickCircle(i, picked === i, "dz-wt-" + i) +
        "<button type=\"button\" class=\"wopen\" aria-label=\"Open " + esc(title) + "\" data-do=\"dz-open\" data-i=\"" + i + "\" data-fid=\"dz-open-" + i + "\"><span class=\"wt\" id=\"dz-wt-" + i + "\">" + esc(title) + "</span>" + picture + "</button>" +
        "<div class=\"wbtns\">" + (i === 0 ? "<button type=\"button\" class=\"k k-ivory k-xs\" data-do=\"dz-default\" data-fid=\"dz-default\">Use the default</button>" : "") +
        "<button type=\"button\" class=\"k k-dark k-xs\" data-do=\"dz-save\" data-what=\"" + (side === "screen" ? "screens" : "board") + "\" data-i=\"" + i + "\" data-fid=\"dz-save-" + i + "\">" + (side === "screen" ? "Save pictures" : "Download picture") + "</button></div></div>";
    }).join("") + "</div><div class=\"dzb\"><button type=\"button\" class=\"k k-dark wide\" data-do=\"dz-edit\" data-fid=\"dz-edit\">Edit the brief</button></div>";
}

/* ---------- 4 and 5. one style, opened ---------- */
const chosenWords = on => on ? "Chosen by the client." : "Tap the circle when the client has chosen this one.";
function openedHtml(b) {
  const i = S.dz.open, on = pickOf(b, S.dz.side) === i, edit = "<button type=\"button\" class=\"k k-dark wide mt16\" data-do=\"dz-edit\" data-fid=\"dz-edit\">Edit the brief</button>";
  const card = inner => "<div class=\"dzwrap\"><div class=\"wm-card ocard" + (on ? " on" : "") + "\" id=\"dz-ocard\">" + tickCircle(i, on, "dz-otext") + "<div class=\"otext\" id=\"dz-otext\">" + chosenWords(on) + "</div>" + inner + "</div></div>";
  if (S.dz.side === "screen") return card([["default", "Default screen"], ["video", "Video screen"], ["thanks", "Thank you screen"]].map(k => "<div class=\"olab\">" + k[1] + "</div><div class=\"oscr\" data-kind=\"" + k[0] + "\"></div>").join("")) +
    "<div class=\"dzb\"><button type=\"button\" class=\"k k-gold dbig\" data-do=\"dz-save\" data-what=\"screens\" data-i=\"" + i + "\" data-fid=\"dz-save\">Download the 3 pictures</button><p class=\"dnote\">PNG files, ready for the guestbook laptop folder.</p>" + edit + "</div>";
  return card("<div class=\"obig" + (S.dz.limits ? " limits" : "") + "\" id=\"dz-board\" data-show=\"" + S.dz.view + "\" aria-hidden=\"true\"></div>") +
    "<div class=\"dzb\"><div class=\"pair\"><button type=\"button\" class=\"k k-dark\" data-do=\"dz-turn\" data-fid=\"dz-turn\">" + turnWords() + "</button><button type=\"button\" class=\"k k-dark\" data-do=\"dz-limits\" data-fid=\"dz-limits\">" + limitWords() + "</button></div>" +
    "<p class=\"dnote left\">Top sticker: up to " + mmWords("top") + ". Bottom sticker: up to " + mmWords("bottom") + ". Wording shrinks to fit.</p>" +
    "<button type=\"button\" class=\"k k-gold dbig\" data-do=\"dz-save\" data-what=\"board\" data-i=\"" + i + "\" data-fid=\"dz-save\">Download picture</button>" +
    "<button type=\"button\" class=\"k k-ivory wide mt12\" data-do=\"dz-save\" data-what=\"stickers\" data-i=\"" + i + "\" data-fid=\"dz-stickers\">Download the 2 sticker files</button><p class=\"dnote\">Made at the exact print size, for the printer or Canva.</p>" + edit + "</div>";
}
const turnWords = () => S.dz.view === "angle" ? "Turn to the front" : "Turn to the side";
const limitWords = () => S.dz.limits ? "Hide size limits" : "Show size limits";
/** The opened style's pictures are as wide as their box, so they are drawn once the box is on the page, and again if it changes width. */
function dzSize() {
  const b = dzClient(), card = $("#dz-ocard"); if (!b || !card) return;
  const w = Math.floor(card.getBoundingClientRect().width - 27), a = dzArtOf(b)[S.dz.open];      /* the box, less its 12 px padding and 1.5 px border each side */
  $$(".oscr", card).forEach(el => { el.innerHTML = screenHtml(a.screens[el.dataset.kind], w); });
  const board = $("#dz-board");
  if (board) {
    board.style.width = w + "px"; board.style.height = Math.round(w * 5 / 3) + "px";
    board.innerHTML = ["front", "angle"].map(view => "<div class=\"bview bd-" + view.charAt(0) + "\" style=\"width:" + w + "px;height:" + Math.round(w * 5 / 3) + "px\">" + boardImg(b, S.dz.open, view, w, true) + limitsImg(view, w) + "</div>").join("");
  }
  dzBoardPictures();
}
let dzSizing = 0;
addEventListener("resize", () => { clearTimeout(dzSizing); dzSizing = setTimeout(() => { if (S.tab === "designs" && S.dz.page === "open" && S.data) dzSize(); }, 150); });
if (document.fonts) document.fonts.addEventListener("loadingdone", () => { if (S.tab === "designs" && S.data && dzClient() && (S.dz.page === "styles" || S.dz.page === "open")) dzPictures(); });
/** Draws the pictures again where they stand (a photo has arrived, or the font has). */
function dzPictures() {
  const b = dzClient(); if (!b) return;
  if (S.dz.page === "open") dzSize();
  else if (S.dz.page === "styles" && $("#dz-body")) { dzWheelOff(); $("#dz-body").innerHTML = stylesHtml(b); dzLive(b); }
}
/* ---------- the boards, as flat pictures (see art.js: a live 3D board is too heavy for a phone) ---------- */
const boardPics = new Map();           /* what each picture shows -> its address. Kept for the few boards in use, the oldest let go */
const PIC_SCALE = () => Math.min(2, Math.max(1, Math.round(devicePixelRatio || 1)));
/** What a board picture shows: the client's styles as drawn now, which style, which view, the ticked screen, and its size. */
function boardKey(b, i, view, w, print) { const art = S.dzArt[b.row]; return JSON.stringify([b.row, art ? art.key : "", i, view, w, PIC_SCALE(), print, pickOf(b, "screen")]); }
const limitsKey = (view, w) => JSON.stringify(["limits", view, w, PIC_SCALE(), STICKERS.top.h, STICKERS.bottom.h]);
/** The picture of one board, if it is drawn already. Until then the board's photo shows on its own, behind. */
function boardImg(b, i, view, w, print) {
  const key = boardKey(b, i, view, w, print), url = boardPics.get(key);
  return "<img class=\"bimg\" alt=\"\" data-pic=\"" + esc(key) + "\"" + (url ? " src=\"" + url + "\"" : " hidden") + ">";
}
function limitsImg(view, w) { const key = limitsKey(view, w), url = boardPics.get(key); return "<img class=\"lim\" alt=\"\" data-pic=\"" + esc(key) + "\"" + (url ? " src=\"" + url + "\"" : " hidden") + ">"; }
function keepPic(key, url) {
  boardPics.set(key, url);
  while (boardPics.size > 16) { const old = boardPics.keys().next().value; URL.revokeObjectURL(boardPics.get(old)); boardPics.delete(old); }
}
let picRun = 0;
/** Draws the board pictures the page is waiting for, one at a time: the one in the middle (or showing) first. */
async function dzBoardPictures() {
  const run = ++picRun, b = dzClient(); if (!b) return;
  const wanted = $$("img[data-pic]:not([src])", $("#dz-body") || document).map(img => img.dataset.pic);
  if (!wanted.length) return;
  const art = dzArtOf(b), photo = dzPhotoOf(b.row);
  let swaps = null;
  const order = key => { const k = JSON.parse(key); if (k[0] === "limits") return 5; return S.dz.page === "open" ? (k[3] === S.dz.view ? 0 : 1) : (dzWheel ? Math.abs(((k[2] - Math.round(dzWheel.t)) % STYLES.length + STYLES.length + 2) % STYLES.length - 2) : 0); };
  for (const key of [...new Set(wanted)].sort((x, y) => order(x) - order(y))) {
    if (run !== picRun) return;                                          /* the page has moved on: a newer run takes over */
    let url = boardPics.get(key);
    if (!url) {
      const k = JSON.parse(key);
      try {
        if (k[0] === "limits") url = await limitsPicture(k[1], k[2] * k[3], Math.round(k[2] * 5 / 3) * k[3]);
        else {
          if (!swaps) swaps = photo ? { [photo.url]: await asDataUrl(photo.blob) } : {};
          const i = k[2], screen = k[7] > 0 ? art[k[7]].screens.default : null;
          url = await boardPicture(art[i], k[3], screen, k[4] * k[5], Math.round(k[4] * 5 / 3) * k[5], swaps, k[6]);
        }
      } catch (x) { return; }                                           /* no internet for the font: the photo stays on its own, and it tries again next time */
      keepPic(key, url);
    }
    $$("img[data-pic]").forEach(img => { if (img.dataset.pic === key && !img.getAttribute("src")) { img.src = url; img.hidden = false; } });
  }
}
/** Brings the ticks up to date where they stand, so only a new tick pops in. */
function dzTicks(b) {
  const picked = pickOf(b, S.dz.side), set = (box, i) => {
    const on = picked === i, btn = $(".dtick", box); if (!btn || box.classList.contains("on") === on) return;
    box.classList.toggle("on", on); btn.setAttribute("aria-pressed", on); $(".circle", btn).innerHTML = on ? TICK_MARK : "";
  };
  $$("#dz-wheel .wcard").forEach(card => set(card, +card.dataset.cfi));
  const opened = $("#dz-ocard"); if (opened) { set(opened, S.dz.open); $("#dz-otext").textContent = chosenWords(picked === S.dz.open); }
}

/* ---------- saving ---------- */
/** Ticks a style on one wheel, or unticks it (index -1). Kept in the tracker as the style's name. */
function dzPick(row, side, index) {
  const b = eventAt(row); if (!b) return;
  const name = index < 0 ? "" : styleTitle(index);
  saveLatest("pick" + row + side, "setDesignPick", { row, id: b.id, [side]: name }, name,
    () => { const now = eventAt(row); return now ? txt(designOf(now)[side]) : ""; },
    v => { const now = eventAt(row); if (now) designOf(now)[side] = v; });
}
/**
 * The typed brief boxes whose save failed, as "row|key". While the tracker still doesn't have what was typed, they hold
 * the app's reload to a newer version (app.js, busyTyping), on any tab, and they are tried again when fresh data comes
 * in or the phone is back online (dzRetry). Only failed saves count: a brief changed elsewhere (on the laptop) since
 * this phone first showed it also differs from what is on screen here, and must not be written over.
 */
const dzFailed = new Set();
/** Saves one part of the brief once it has been changed. */
async function dzSaveBrief(row, key) {
  const b = eventAt(row), d = S.dzDraft[row]; if (!b || !d) return;
  const value = key === "colours" ? d.colours.join(", ") : d[key];
  const saved = await saveLatest("brief" + row + key, "saveBrief", { row, id: b.id, brief: { [key]: value } }, value,
    () => { const now = eventAt(row); return now ? txt(designOf(now)[key]) : ""; },
    v => {
      const now = eventAt(row); if (now) designOf(now)[key] = v;
      /* v differs from what is on screen only when a save has failed. Colour chips go back. Typed words stay in their box,
         so nothing typed is lost: the app says it didn't save, and tries again when the brief is left, designs are generated,
         fresh data comes in or the phone is back online (dzRetry). */
      if (key === "colours" && d.colours.join(", ") !== v) { d.colours = colourList(v); if (S.dz.row === row) { drawColours(b); syncPalette(); } }
    });
  if (saved === true) dzFailed.delete(row + "|" + key);
  else if (saved === false && BRIEF_TEXT.includes(key)) dzFailed.add(row + "|" + key);        /* colour chips go back when they fail, so only typed words wait */
}
/** The typed boxes of the brief, the parts a failed save keeps on screen. */
const BRIEF_TEXT = ["names", "line2", "defaultWording", "thanksWording", "notes"];
/** The typed parts of the brief that the tracker doesn't have yet (a save failed). The usual wording, left as it came, doesn't count. */
const dzUnsaved = b => { const d = S.dzDraft[b.row], t = designOf(b); return d ? BRIEF_TEXT.filter(k => d[k] !== txt(t[k]) && !(!txt(t[k]) && d[k] === (k === "defaultWording" ? WORDING : k === "thanksWording" ? THANKS : ""))) : []; };
/** The failed boxes that are still waiting: the tracker doesn't have what was typed. Boxes it now has, or whose booking is gone, drop out. */
function dzWaiting() {
  return [...dzFailed].filter(k => { const [row, key] = k.split("|"), b = S.data && eventAt(+row); if (b && dzUnsaved(b).includes(key)) return true; dzFailed.delete(k); return false; });
}
/** Tries the waiting boxes again: fresh data has come in, or the phone is back online. Once they land, the app can reload (app.js). */
function dzRetry() { if (S.data) dzWaiting().forEach(k => { const [row, key] = k.split("|"); dzSaveBrief(+row, key); }); }
document.addEventListener("change", e => {
  const el = e.target, b = S.tab === "designs" && S.data ? dzClient() : null; if (!b) return;
  if (el.id === "dz-file") { const file = el.files && el.files[0]; el.value = ""; if (file) dzAddPhoto(b.row, file); return; }
  if (!el.matches || !el.matches("#dz-brief [data-key]")) return;
  const d = dzDraftOf(b), key = el.dataset.key, value = key === "notes" ? el.value.trim() : el.value.replace(/\s+/g, " ").trim();
  if (d[key] === value) return;
  d[key] = value; dzSaveBrief(b.row, key);
});
/** Reads the boxes into the brief, in case one is still being typed in. */
function dzReadBoxes(b) {
  const d = dzDraftOf(b);
  $$("#dz-brief [data-key]").forEach(el => { d[el.dataset.key] = el.dataset.key === "notes" ? el.value.trim() : el.value.replace(/\s+/g, " ").trim(); });
  return d;
}
/** Generate designs: saves the whole brief, notes the day, and goes to the styles. */
async function dzGenerate() {
  const b = dzClient(); if (!b) return;
  const row = b.row, d = dzReadBoxes(b), brief = { names: d.names, line2: d.line2, defaultWording: d.defaultWording, thanksWording: d.thanksWording, colours: d.colours.join(", "), notes: d.notes };
  const saved = save("saveBrief", { row, id: b.id, brief, generated: true }, data => { const now = data.bookings.find(x => x.row === row); if (now) Object.assign(designOf(now), brief, { madeOn: todayIso() }); });
  dzGo("styles", "fwd");
  const ok = !!(await saved), now = eventAt(row);
  BRIEF_TEXT.forEach(key => { if (ok) dzFailed.delete(row + "|" + key); else if (now && dzUnsaved(now).includes(key)) dzFailed.add(row + "|" + key); });
  if (!ok && S.tab === "designs" && S.dz.row === row && S.dz.page !== "brief") dzGo("brief", "back");      /* it didn't save: back to the brief, which still holds what was typed */
}

/* ---------- photos ---------- */
const photoBlob = (data, mime) => { const bin = atob(data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new Blob([bytes], { type: mime }); };
/** Reads a client's brief photos from their Drive folder, the first time their pages are opened (or again, when asked). */
function dzLoadPhotos(b, again) {
  const link = txt(designOf(b).photos), had = S.dzPhotos[b.row];
  if (had && !again && (had.read || had.state === "loading" || !link)) return;
  const box = S.dzPhotos[b.row] = { state: link ? "loading" : "ready", read: false, list: had ? had.list.filter(p => p.fresh) : [] };
  if (!link) return;
  const row = b.row;
  server("getBriefPhotos", { row, id: b.id }).then(res => {
    (res.photos || []).forEach(p => {
      if (box.list.some(x => x.id === p.id)) return;
      try { const blob = photoBlob(p.data, p.mime); box.list.push({ id: p.id, name: p.name, blob, url: URL.createObjectURL(blob) }); }
      catch (x) { /* a photo that can't be read is left out; the rest still show */ }
    });
    box.state = "ready"; box.read = true;
  }).catch(() => { box.state = "failed"; }).then(() => dzPhotosChanged(row));
}
function dzPhotosChanged(row) {
  if (S.tab !== "designs" || S.dz.row !== row || !S.data) return;
  const b = dzClient(); if (!b) return;
  if (S.dz.page === "brief") drawPhotos(b); else dzPictures();
}
/** A photo small enough to send: at most 1600 px on its long side, as a JPG. */
async function smallPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url), k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = canvasOf(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((yes, no) => c.toBlob(blob => blob ? yes(blob) : no(new Error("")), "image/jpeg", 0.86));
  } finally { URL.revokeObjectURL(url); }
}
/** Add a photo: it shows straight away, then saves to the client's Drive folder. If that fails it is taken away again, with the reason. */
async function dzAddPhoto(row, file) {
  const b = eventAt(row); if (!b) return;
  let blob;
  try { blob = await smallPhoto(file); } catch (x) { toast("That file is not a picture the app can use. Try a JPG or a PNG."); return; }
  const box = S.dzPhotos[row] || (S.dzPhotos[row] = { state: "ready", list: [] });
  const name = (file.name || "Brief photo").replace(/\.[^.]*$/, "") + ".jpg", item = { id: "", name, blob, url: URL.createObjectURL(blob), saving: true, fresh: true };
  box.list.unshift(item); dzPhotosChanged(row);
  try {
    const res = await server("addBriefPhoto", { row, id: b.id, name, mime: "image/jpeg", data: (await asDataUrl(blob)).split(",")[1] });
    item.saving = false; item.id = res.photo ? res.photo.id : "";
    const now = eventAt(row); if (now && res.folder) designOf(now).photos = res.folder;
  } catch (x) {
    /* take it off the list on screen now, which may have been read again while it was saving */
    const list = (S.dzPhotos[row] || box).list, at = list.indexOf(item);
    if (at >= 0) list.splice(at, 1);
    URL.revokeObjectURL(item.url);
    toast("That photo didn’t save. " + why(x));
  }
  dzPhotosChanged(row);
}

/* ---------- theme colours (not designed: a plain sheet, like the Money sheets) ---------- */
function openPalette() {
  const b = dzClient(); if (!b) return;
  const d = dzDraftOf(b), f = moneyOf(b);
  show("dzcol", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">theme colours</h2><p class=\"sub\">" + esc([b.client, f.date ? dayOf(f.date) : ""].filter(Boolean).join(", ")) + "</p>" +
    "<p class=\"palhint\">Tap the colours for this client. The lightest becomes the background.</p><div class=\"pal\">" +
    PALETTE.map(c => "<button class=\"palc\" type=\"button\" data-do=\"dz-colour\" data-name=\"" + c[0] + "\" aria-pressed=\"" + d.colours.some(n => sameWords(n, c[0])) + "\"><span class=\"sw\" style=\"background:" + c[1] + "\"></span><span>" + c[0] + "</span></button>").join("") +
    "</div><p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big save\" type=\"button\" data-do=\"close\">Done</button>");
  dlg.setAttribute("aria-label", "Theme colours");
}
function syncPalette() {
  const b = dzClient(); if (!b || sheetKind !== "dzcol") return;
  $$(".palc", dlg).forEach(el => el.setAttribute("aria-pressed", dzDraftOf(b).colours.some(n => sameWords(n, el.dataset.name))));
}

/* ---------- pictures to keep ---------- */
const fileSafe = text => txt(text).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
let dzReady = null;      /* files that are made and waiting for a fresh tap (some phones only open the share sheet straight after a tap) */
/** Makes the PNG files for a style and hands them over. what = "screens", "board" or "stickers". */
async function dzSave(el) {
  const b = dzClient(); if (!b || el.disabled) return;
  const what = el.dataset.what, i = +el.dataset.i, a = dzArtOf(b)[i], words = el.textContent, many = what !== "board";
  const stem = fileSafe([b.invoice, withoutBrackets(b.client)].filter(Boolean).join(" ")) + ", ";
  el.disabled = true; el.textContent = many ? "Making the pictures…" : "Making the picture…";
  try {
    const photo = dzPhotoOf(b.row), swaps = photo ? { [photo.url]: await asDataUrl(photo.blob) } : {};
    let files;
    if (what === "screens") files = [["default", "default screen"], ["video", "video screen"], ["thanks", "thank you screen"]].map(k => ({ name: stem + k[1] + ".png", make: () => screenPng(a.screens[k[0]], swaps) }));
    else if (what === "stickers") files = ["top", "bottom"].map(which => ({ name: stem + which + " sticker " + STICKERS[which].w + " x " + STICKERS[which].h + " mm.png", make: () => stickerPng(a, which, swaps) }));
    else { const view = S.dz.page === "open" ? S.dz.view : "angle"; files = [{ name: stem + "board.png", make: () => boardPng(a, view, boardScreen(b), swaps) }]; }
    for (const f of files) f.blob = await f.make();
    const how = await handOver(files);
    if (how === "saved") toast(files.length > 1 ? "Saved " + files.length + " pictures to your downloads." : "Saved the picture to your downloads.");
    else if (how === "blocked") {
      dzReady = files;
      show("dzready", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + (files.length > 1 ? "pictures ready" : "picture ready") + "</h2><p class=\"sub\">" + esc(withoutBrackets(b.client) + ", " + styleTitle(i)) + "</p>" +
        "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big save\" type=\"button\" data-do=\"dz-hand\">" + (files.length > 1 ? "Save the " + files.length + " pictures" : "Save the picture") + "</button><button class=\"btn line cancel\" type=\"button\" data-do=\"close\">Cancel</button>");
    }
  } catch (x) {
    toast((many ? "Couldn’t make the pictures. " : "Couldn’t make the picture. ") + "Check your internet and try again.");
  } finally { el.disabled = false; el.textContent = words; }
}

/* ---------- taps ---------- */
Object.assign(TAPS, {
  "dz-client": el => { const b = eventAt(+el.dataset.row); if (!b) return; S.dz.row = b.row; S.dz.side = "screen"; const state = dzState(b); dzGo(state === "ready" || state === "chosen" ? "styles" : "brief", "fwd"); },      /* each client starts on Screen */
  "dz-back": () => {
    if (S.dz.page === "open") { dzGo("styles", "back"); return; }
    const b = dzClient(); if (b && S.dz.page === "brief") dzUnsaved(b).forEach(key => dzSaveBrief(b.row, key));       /* one more try for anything that didn't save */
    S.dz.row = 0; dzGo("list", "back");
  },
  "dz-edit": () => dzGo("brief", "fwd"),
  "dz-side": el => {
    const side = el.dataset.side, b = dzClient(); if (!b || side === S.dz.side) return;
    S.dz.side = side;
    $$("[data-do=dz-side]").forEach(btn => btn.setAttribute("aria-pressed", btn.dataset.side === side));
    const thumb = $("#dz-thumb"); if (side === "board") thumb.dataset.at = "board"; else delete thumb.dataset.at;
    const body = $("#dz-body"); if (!body) return;                          /* on the brief the slider only chooses which wheel comes next */
    dzWheelOff(); $("#dz-sub").innerHTML = dzSub(b);
    body.classList.remove("tab-r", "tab-l"); void body.offsetWidth; body.classList.add(side === "board" ? "tab-r" : "tab-l");
    body.innerHTML = S.dz.page === "open" ? openedHtml(b) : stylesHtml(b); dzLive(b);
  },
  "dz-generate": () => dzGenerate(),
  "dz-skip": () => { const b = dzClient(); if (!b) return; dzPick(b.row, "screen", 0); dzPick(b.row, "board", 0); dzGo("styles", "fwd"); },
  "dz-colours": () => openPalette(),
  "dz-colour": el => {
    const b = dzClient(); if (!b) return;
    const d = dzDraftOf(b), name = el.dataset.name, had = d.colours.some(n => sameWords(n, name));
    d.colours = had ? d.colours.filter(n => !sameWords(n, name)) : d.colours.concat([name]);
    el.setAttribute("aria-pressed", !had); drawColours(b); dzSaveBrief(b.row, "colours");
  },
  "dz-photo": () => { const pick = $("#dz-file"); if (pick) pick.click(); },
  "dz-photos-again": () => { const b = dzClient(); if (b) { dzLoadPhotos(b, true); drawPhotos(b); } },
  "dz-open": el => { if (!dzWheel) return; const i = +el.dataset.i; cfTap(dzWheel, i, () => { S.dz.open = i; S.dz.view = "angle"; S.dz.limits = false; dzGo("open", "fwd"); })({ currentTarget: el }); },
  "dz-tick": el => { const b = dzClient(); if (!b) return; const i = +el.dataset.i; dzPick(b.row, S.dz.side, pickOf(b, S.dz.side) === i ? -1 : i); },
  "dz-default": () => { const b = dzClient(); if (b) dzPick(b.row, S.dz.side, 0); },
  "dz-turn": el => { S.dz.view = S.dz.view === "angle" ? "front" : "angle"; $("#dz-board").dataset.show = S.dz.view; el.textContent = turnWords(); },
  "dz-limits": el => { S.dz.limits = !S.dz.limits; $("#dz-board").classList.toggle("limits", S.dz.limits); el.textContent = limitWords(); },
  "dz-save": el => dzSave(el),
  "dz-hand": async () => { const files = dzReady; if (!files) return; const how = await handOver(files); if (how === "blocked") say("The pictures didn’t save. Try again."); else { dzReady = null; hide(); } }
});
