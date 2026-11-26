"use strict";
/* wmhb app: the Prices and packages screen. The five price cards on the wheel, a list of their names,
   and one card opened at full size, with a button to save it. The cards are pictures in new/assets/. */

const PRICE_CARDS = ["Wedding packages", "Free with every booking", "Birthdays and celebrations", "Corporate packages", "Markets and fairs"];
const cardFile = i => "assets/price-" + (i + 1) + ".jpg";
Object.assign(S, { pc: { open: -1 } });          /* which card is open, or -1 for the list */
let pcMove = "", pcWheel = null;

SCREENS.prices = {
  head: "h8", narrow: true,
  reset() { S.pc.open = -1; },
  cls() { const c = pcMove ? " pg-" + pcMove : ""; pcMove = ""; return c; },
  /** An opened card has its own top: a Back button and the card's name. */
  top() {
    if (S.pc.open < 0) return null;
    return "<div class=\"head dzh\">" + barHtml() + "<div class=\"back\"><button class=\"k k-dark k-sm\" type=\"button\" data-do=\"pc-back\" data-fid=\"pc-back\">‹ All cards</button></div><h1 class=\"pcn\">" + esc(PRICE_CARDS[S.pc.open]) + "</h1></div>";
  },
  html() {
    if (S.pc.open >= 0) {
      const i = S.pc.open;
      return "<div class=\"pcbig\" data-screen=\"prices\"><img src=\"" + cardFile(i) + "\" width=\"1080\" height=\"1350\" alt=\"The " + esc(PRICE_CARDS[i].toLowerCase()) + " price card\"></div>" +
        "<div class=\"dzb\"><button type=\"button\" class=\"k k-gold dbig\" data-do=\"pc-save\" data-fid=\"pc-save\">Download picture</button></div>";
    }
    const w = cfWheel("prices", PRICE_CARDS.length, 0);
    return "<p class=\"lede vlede\" data-screen=\"prices\">Your " + PRICE_CARDS.length + " price cards. Swipe either way, or tap one to see it full size.</p>" +
      "<div class=\"cf\" id=\"pc-wheel\">" + PRICE_CARDS.map((name, i) => "<button type=\"button\" class=\"pcard\" data-cfi=\"" + i + "\" data-do=\"pc-open\" data-i=\"" + i + "\" data-fid=\"pc-card-" + i + "\" aria-label=\"Open " + esc(name) + "\" style=\"" + cfPaint(w, i) + "\"><span aria-hidden=\"true\" class=\"pcpic\" style=\"background-image:url(" + cardFile(i) + ")\"></span></button>").join("") + "</div>" +
      "<div class=\"plist stg\">" + PRICE_CARDS.map((name, i) => "<button type=\"button\" class=\"k k-dark prow2\" data-do=\"pc-row\" data-i=\"" + i + "\" data-fid=\"pc-row-" + i + "\"><span class=\"pnum\" aria-hidden=\"true\">" + (i + 1) + "</span><span class=\"pname\">" + esc(name) + "</span><span aria-hidden=\"true\" class=\"pchev\">›</span></button>").join("") + "</div>";
  },
  fill(first) {
    if (!first) return;                            /* nothing here comes from the tracker */
    if (pcWheel) { pcWheel.ref(null); pcWheel = null; }
    const el = $("#pc-wheel"); if (el) { pcWheel = cfWheel("prices", PRICE_CARDS.length, 0); pcWheel.ref(el); }
  }
};
/** Opens one card full size. The wheel keeps that card in the middle for when you come back. */
function openCard(i) {
  const w = cfWheel("prices", PRICE_CARDS.length, 0);
  if (pcWheel) { pcWheel.ref(null); pcWheel = null; }
  w.p = w.t = i; w.v = 0;
  S.pc.open = i; pcMove = "fwd"; go("prices");
  const title = $("#view h1"); if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }
}
/** Download picture: the card's own picture file, to the phone's share sheet or the laptop's downloads. */
async function saveCard(el) {
  const i = S.pc.open; if (i < 0 || el.disabled) return;
  const words = el.textContent; el.disabled = true; el.textContent = "Getting the picture…";
  try {
    const res = await fetch(cardFile(i)); if (!res.ok) throw new Error("");
    const files = [{ name: "wmhb price card " + (i + 1) + ", " + PRICE_CARDS[i] + ".jpg", blob: await res.blob() }];
    const how = await handOver(files);
    if (how === "saved") toast("Saved the picture to your downloads.");
    else if (how === "blocked") {
      dzReady = files;
      show("dzready", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">picture ready</h2><p class=\"sub\">" + esc(PRICE_CARDS[i]) + "</p>" +
        "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big save\" type=\"button\" data-do=\"dz-hand\">Save the picture</button><button class=\"btn line cancel\" type=\"button\" data-do=\"close\">Cancel</button>");
    }
  } catch (x) {
    toast("Couldn’t get the picture. Check your internet and try again.");
  } finally { el.disabled = false; el.textContent = words; }
}
Object.assign(TAPS, {
  "pc-open": el => { if (!pcWheel) return; const i = +el.dataset.i; cfTap(pcWheel, i, () => openCard(i))({ currentTarget: el }); },
  "pc-row": el => openCard(+el.dataset.i),
  "pc-back": () => { S.pc.open = -1; pcMove = "back"; go("prices"); const title = $("#view h1"); if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); } },
  "pc-save": el => saveCard(el)
});
