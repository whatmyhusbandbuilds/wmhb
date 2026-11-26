"use strict";
/* wmhb app: the pictures on the Designs tab.
   A style (one small file each in new/styles/) says how a client's screens and board stickers are laid out.
   This file gets the brief ready for a style, shrinks wording that is too long, puts the pieces on the page,
   and turns them into PNG files in the browser. */

/* ---------- sizes ---------- */
const SCREEN_PX = [1920, 1080];                  /* a screen picture for the guestbook laptop: still to be confirmed by Aadil */
const PRINT_DPI = 150;                           /* sticker files: the file type is still to be confirmed by Aadil */
const PLANE = [1800, 3000];                      /* the board plane, which matches the front photo */
/* The inside of the board's frame, measured on the front photo, in board-plane px. Aadil (26 Nov 2026): it is 700 mm wide.
   So the frame is the ruler for the stickers: 1 mm on the board is FRAME.w / 700 px on the plane. */
const FRAME = { x: 447, y: 453, w: 930, h: 2124, mm: 700 };
const MM = FRAME.w / FRAME.mm;
const STICKER_X = FRAME.x + FRAME.w / 2;         /* both stickers are centred across the board: 650 mm wide leaves 25 mm each side */
/* The stickers (Aadil, 26 Nov 2026). The top one carries the "leave a message" line, the bottom one the names.
   w and h: the biggest each can be, in mm. gap: how far its limit stays from the frame's inside edge, in mm.
   start: where the vinyl starts, in mm from that same edge. The top sticker's first row sits 50 mm down from the top
   of the frame and the wording builds down; the bottom sticker's last row sits 50 mm up from the bottom and builds up. */
const STICKERS = {
  top: { w: 650, h: 200, from: "top", gap: 40, start: 50 },
  bottom: { w: 650, h: 430, from: "bottom", gap: 10, start: 50 }
};
Object.keys(STICKERS).forEach(which => {
  const z = STICKERS[which];
  z.y = z.from === "top" ? FRAME.y + z.gap * MM : FRAME.y + FRAME.h - (z.gap + z.h) * MM;   /* where its limit starts down the plane (px) */
});
const BOARD_PX = [1080, 1800];                   /* the two board photos */
/* The design kit's matrices (section 8): the sticker plane seen at an angle, and the board's screen in each view. */
const M_ANGLE = [0.99661988, 0.096063979, 0, 8.2348335e-05, 0.013639357, 1.0535973, 0, 1.3101167e-05, 0, 0, 1, 0, 30.728791, -18.569045, 0, 1];
const M_SCREEN = {
  front: [1.00625, -7.4283635e-12, 0, 1.6853822e-14, 2.3846637e-11, 1.0083333, 0, -1.1664955e-13, 0, 0, 1, 0, 578, 826, 0, 1],
  angle: [0.93127765, 0.074073562, 0, 6.9137168e-05, -3.496263e-11, 0.98333333, 0, -9.8250757e-14, 0, 0, 1, 0, 608, 859, 0, 1]
};
const zoneBox = which => { const z = STICKERS[which]; return { x: STICKER_X - z.w * MM / 2, y: z.y, w: z.w * MM, h: z.h * MM }; };
const mmWords = which => STICKERS[which].w + " × " + STICKERS[which].h + " mm";

/* ---------- the styles ---------- */
const STYLES = [];                               /* in the order their files load: the wmhb default first, then Style 1, 2, 3… */
/** A style file calls this once. new/styles/classic.js explains what a style holds. */
function addStyle(style) { STYLES.push(style); }
/** The name a style is shown and saved by: "wmhb default", "Style 4: Arch". */
const styleTitle = i => i === 0 ? STYLES[0].name : "Style " + i + ": " + STYLES[i].name;
const styleIndex = name => STYLES.findIndex((s, i) => styleTitle(i) === txt(name));

/* ---------- colours ---------- */
/* The theme colours Sara can pick. The tracker keeps their names. The first three are the design's. */
const PALETTE = [
  ["Sage", "#8A9A7B"], ["Cream", "#F6F0E4"], ["Gold", "#B8975A"], ["White", "#FFFFFF"], ["Champagne", "#E9DCC3"], ["Blush", "#E8C7C3"],
  ["Dusty pink", "#D4A5A5"], ["Terracotta", "#C4704F"], ["Rust", "#A9502F"], ["Burgundy", "#6E2233"], ["Mustard", "#D4A72C"], ["Olive", "#6B6B3A"],
  ["Forest", "#2F4A3A"], ["Dusty blue", "#8FA6B8"], ["Navy", "#1F2D4D"], ["Lilac", "#B9A7D1"], ["Charcoal", "#3A3A38"], ["Black", "#1D1D1B"]
];
const INK = "#2B2B26", NIGHT = "#141412", LIGHT = "#FFFDF8", BOARD_WHITE = "#EFEDE6";      /* dark wording, the Night style, light wording, the board itself */
const colourHex = name => { const p = PALETTE.find(c => sameWords(c[0], name)); return p ? p[1] : ""; };
const colourList = text => txt(text).split(/\s*,\s*/).filter(Boolean);
/** How light a colour is, 0 (black) to 1 (white). */
function light(hex) {
  const ch = n => { const v = parseInt(hex.slice(n, n + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}
const contrast = (a, b) => { const x = light(a), y = light(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** The first of the wanted colours that can be read on that background. Failing those, dark or light. */
const readOn = (bg, ...wanted) => wanted.find(c => contrast(c, bg) >= 2) || (light(bg) > 0.4 ? INK : LIGHT);
/**
 * What each theme colour is used for. The lightest becomes the paper (the background), the next two the main colour and the accent.
 * With no colours picked, the design's own three are used.
 */
function colourRoles(names) {
  const hexes = names.map(colourHex).filter(Boolean);
  const paper = hexes.filter(h => light(h) > 0.6).sort((a, b) => light(b) - light(a))[0];
  const rest = hexes.filter(h => h !== paper);
  return { paper: paper || colourHex("Cream"), main: rest[0] || colourHex("Sage"), accent: rest[1] || rest[0] || colourHex("Gold") };
}

/* ---------- the brief, made ready for a style ---------- */
const WORDING = "Leave us a video message", THANKS = "Thank you for your message";
/** "19 December 2026" as "19 . 12 . 2026". Anything that is not a date stays as typed. */
function dotted(line) {
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], t = txt(line);
  let m, d, mo, y;
  if ((m = /^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/.exec(t))) { d = +m[1]; mo = MONTHS.indexOf(m[2].toLowerCase()) + 1; y = m[3]; }
  else if ((m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(t))) { d = +m[1]; mo = +m[2]; y = m[3]; }
  return d && mo >= 1 && mo <= 12 && d <= 31 ? String(d).padStart(2, "0") + " . " + String(mo).padStart(2, "0") + " . " + y : t;
}
/** Words spread over that many lines, as evenly as they go. */
function spread(text, lines) {
  const words = txt(text).split(/\s+/).filter(Boolean), out = [];
  let left = words.join(" ").length;
  for (let n = Math.min(lines, words.length); n >= 1; n--) {
    const aim = left / n; let line = words.shift();
    while (n > 1 && words.length >= n && Math.abs(line.length + 1 + words[0].length - aim) <= Math.abs(line.length - aim)) line += " " + words.shift();
    if (n === 1) line = [line].concat(words.splice(0)).join(" ");
    out.push(line); left -= line.length + 1;
  }
  return out;
}
/** "Ruby & James" as Ruby / & / James, one under the other. A single name stays on one line. */
function stacked(names) {
  const m = /^(.+?)\s+(&|and|\+)\s+(.+)$/i.exec(txt(names));
  return m ? [m[1], m[2] === "+" ? "+" : m[2].toLowerCase() === "and" ? "and" : "&", m[3]] : spread(names, 3);
}
const br = lines => lines.map(esc).join("<br>");
/**
 * The brief as a style is given it. Every word is already safe to drop into HTML.
 * client = the booking's name, used when the brief has no names yet. photo = the address of their photo, or "".
 */
function artBrief(client, draft, photo) {
  const roles = colourRoles(draft.colours || []), names = txt(draft.names) || withoutBrackets(client), wording = txt(draft.defaultWording) || WORDING;
  const picture = more => photo
    ? "<div style=\"position:absolute;inset:0;background:url(" + photo + ") center/cover no-repeat\"></div>"
    : "<div style=\"position:absolute;inset:0;background:linear-gradient(140deg," + roles.main + "," + roles.accent + ")\"></div><div style=\"position:absolute;left:50%;top:54%;width:22em;height:22em;margin:-11em 0 0 -11em;border-radius:50%;background:rgba(255,253,248,.35)\"></div>" + more;
  return {
    names: esc(names), namesUpper: esc(names.toUpperCase()), stack: br(stacked(names)),
    line2: esc(txt(draft.line2)), dots: esc(dotted(draft.line2)),
    wording: esc(wording), wordingLines: n => br(spread(wording, n)), wordingLower: n => br(spread(wording.toLowerCase(), n)), wordingUpper: n => br(spread(wording.toUpperCase(), n)),
    thanks: esc(txt(draft.thanksWording) || THANKS), tap: "Tap to start",
    main: roles.main, paper: roles.paper, accent: roles.accent, ink: INK, night: NIGHT,
    onMain: readOn(roles.main, roles.paper), inkOnMain: readOn(roles.main, INK, roles.paper), accentOnPaper: readOn(roles.paper, roles.accent, INK), mainOnPaper: readOn(roles.paper, roles.main, INK),
    accentOnNight: readOn(NIGHT, roles.accent, roles.paper), onNight: readOn(NIGHT, roles.paper),
    accentOnBoard: readOn(BOARD_WHITE, roles.accent, roles.main, INK), mainOnBoard: readOn(BOARD_WHITE, roles.main, roles.accent, INK),
    /* their photo, filling whatever box it is put in. Without one, a soft stand-in in their colours. */
    photo: picture("<div style=\"position:absolute;left:0;right:0;bottom:1.5em;text-align:center;font:600 2.6em 'Inter Tight',sans-serif;color:rgba(255,253,248,.9)\">their photo</div>"),
    photoPlain: picture("")
  };
}

/* ---------- parts the styles share ---------- */
const ART = {
  /** The little camera at the top of a default screen. */
  cam: colour => "<div style=\"color:" + colour + "\"><svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" style=\"font-size:7em;display:block;margin:0 auto .3em\"><rect x=\"3\" y=\"7\" width=\"12\" height=\"10\" rx=\"2\"/><path d=\"M15 11l6-3v8l-6-3z\"/></svg></div>",
  /** Where the live camera shows on a video screen. */
  live: "<div style=\"position:absolute;left:14%;right:14%;top:12%;bottom:24%;border-radius:1.5em;background:linear-gradient(160deg,#5b5a55,#2f2e2b);display:flex;align-items:center;justify-content:center;color:rgba(255,253,248,.75);font:600 3em 'Inter Tight',sans-serif\"><span style=\"display:inline-block;width:.7em;height:.7em;margin-right:.5em;border-radius:50%;background:#D8553F\"></span>live camera</div>",
  /** The line under the live camera on a video screen. font = a CSS font, such as "italic 400 5em Georgia,'Times New Roman',serif". */
  under: (words, font, colour, more) => "<div data-box style=\"position:absolute;left:4%;right:4%;bottom:7%;text-align:center\"><div data-fit style=\"font:" + font + ";color:" + colour + (more || "") + "\">" + words + "</div></div>",
  /** Small spaced capitals. Nothing at all when there are no words. */
  caps: (words, size, colour, more) => words ? "<div style=\"font:700 " + size + " 'Inter Tight',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:" + colour + (more || "") + "\">" + words + "</div>" : "",
  /** Things one under the other in the middle of a screen. side = the space kept clear each side. */
  middle: (html, more) => "<div data-box style=\"position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 8%" + (more || "") + "\"><div data-fitbox style=\"display:flex;flex-direction:column;align-items:center;max-width:100%\">" + html + "</div></div>",
  /** One line that shrinks to stay on one line. */
  line: (words, font, colour, more) => "<div data-fit style=\"font:" + font + ";color:" + colour + (more || "") + "\">" + words + "</div>"
};

/* ---------- fitting: wording shrinks, it never spills ---------- */
let fitHost = null;
/**
 * Lays a piece out off the page at full size and shrinks what is too big for its box.
 * Gives back the HTML with the new sizes written in, so it looks the same at any size afterwards.
 * [data-fit] is one line (or lines split with <br>) that must fit across its [data-box]. [data-fitbox] is a block that must fit inside its parent.
 */
/*
 * Nothing that goes into a picture may use a CSS transform. Safari ignores transforms inside a picture made from HTML
 * (shot() below), so a sticker shrunk with one came out at full size and cut off on the iPhone. So: a screen shrinks
 * by its font size (everything in a screen is in em), and a sticker is laid out at its natural size and shrunk and
 * placed when it is drawn onto the canvas (fitSticker below).
 */
function layOut(html, w, h, rootStyle) {
  if (!fitHost) {
    fitHost = document.createElement("div"); fitHost.setAttribute("aria-hidden", "true");
    fitHost.style.cssText = "position:absolute;left:-30000px;top:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(fitHost);
  }
  fitHost.innerHTML = "<div style=\"position:relative;box-sizing:border-box;width:" + w + "px;height:" + h + "px;overflow:hidden;" + rootStyle + "\">" + html + "</div>";
  const root = fitHost.firstChild;
  $$("[data-fit]", root).forEach(el => {
    el.style.whiteSpace = "nowrap";
    const range = document.createRange(); range.selectNodeContents(el);
    const wide = range.getBoundingClientRect().width, avail = inside(el.closest("[data-box]") || root)[0];
    if (wide > avail && wide > 0) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / wide * 0.99 / parseFloat(getComputedStyle(el.parentElement).fontSize)).toFixed(4) + "em";
  });
  return root;
}
/** The room inside a box, less its padding. */
const inside = el => { const cs = getComputedStyle(el); return [el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)]; };
/** A screen, with anything too big for it shrunk by its font size. Gives back the HTML with the sizes written in. */
function fitted(html, w, h, rootStyle, room) {
  const root = layOut(html, w, h, rootStyle);
  $$("[data-fitbox]", root).forEach(el => {
    const r = el.getBoundingClientRect(), box = inside(el.parentElement), s = Math.min(1, box[0] * room / r.width, box[1] * room / r.height);
    if (s < 1) el.style.fontSize = s.toFixed(4) + "em";
  });
  const out = root.innerHTML; fitHost.innerHTML = "";
  return out;
}
/** What a sticker's wording inherits from its zone, inside a picture as on the page. */
const STICKER_TEXT = "line-height:1.05;font-size:16px;text-align:center;";
/**
 * A sticker, laid out at its natural size: { html, w, h } is the sticker itself, and x, y and s say where it goes in its
 * zone (zone px) and how much it shrinks to fit (1 = not at all). It shrinks towards its starting line, and its first
 * (or last) row of letters sits on the 50 mm line.
 */
function fitSticker(html, which) {
  const z = zoneBox(which), st = STICKERS[which], root = layOut(zoneInner(html), z.w, z.h, zoneCss(which));
  const el = root.firstChild, r = el.getBoundingClientRect(), box = inside(root);
  const s = Math.min(1, box[0] * 0.96 / r.width, box[1] * 0.96 / r.height), gap = inkGap(el, st.from) * s, pad = (st.start - st.gap) * MM;
  const out = { html: el.outerHTML, w: r.width, h: r.height, s, x: (z.w - r.width * s) / 2, y: st.from === "top" ? pad - gap : z.h - pad - r.height * s + gap };
  fitHost.innerHTML = "";
  return out;
}
/** A sticker drawn on its own, at its natural size times k times its shrink. Draw it at (x, y) in the zone, s times its size. */
const stickerShot = (st, k, swaps) => { const W = Math.ceil(st.w), H = Math.ceil(st.h); return shot("<div style=\"" + STICKER_TEXT + "\">" + st.html + "</div>", W, H, Math.max(1, Math.ceil(W * st.s * k)), Math.max(1, Math.ceil(H * st.s * k)), swaps); };
const ZONE_STYLE = "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.05;font-size:16px;";
/** A sticker's box: its wording starts at the vinyl's starting line and builds away from the frame edge it is measured from. */
const zoneCss = which => { const z = STICKERS[which], pad = ((z.start - z.gap) * MM).toFixed(2) + "px;"; return ZONE_STYLE + (z.from === "top" ? "justify-content:flex-start;padding-top:" : "justify-content:flex-end;padding-bottom:") + pad; };
let inkCanvas = null;
/**
 * How far the ink of a sticker's first row (top sticker) or last row (bottom sticker) is from the edge of its box, in px.
 * A line of words has a little space above and below its letters; this is that space, so the letters themselves meet the line.
 * Shapes and photos have none.
 */
function inkGap(box, from) {
  const all = [box].concat($$("*", box)).filter(el => el.tagName !== "BR" && el.getClientRects().length);      /* a line break has a box of its own: not a row */
  let edge = null, pick = null;
  all.forEach(el => { const r = el.getBoundingClientRect(), y = from === "top" ? r.top : r.bottom; if (edge === null || (from === "top" ? y < edge - 0.5 : y > edge + 0.5)) { edge = y; pick = el; } else if (Math.abs(y - edge) <= 0.5) pick = el; });
  const texts = pick ? Array.from(pick.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()) : [];
  if (!texts.length) return 0;
  const cs = getComputedStyle(pick), t = cs.textTransform;
  let words = (from === "top" ? texts[0] : texts[texts.length - 1]).textContent.trim();
  words = t === "uppercase" ? words.toUpperCase() : t === "lowercase" ? words.toLowerCase() : words;
  const ctx = (inkCanvas || (inkCanvas = document.createElement("canvas"))).getContext("2d");
  ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  const m = ctx.measureText(words), A = m.fontBoundingBoxAscent, D = m.fontBoundingBoxDescent;
  if (!(A > 0) || !(D >= 0) || !(m.actualBoundingBoxAscent >= 0)) return 0;
  const line = parseFloat(cs.lineHeight) || A + D, half = (line - A - D) / 2;
  return Math.max(0, from === "top" ? half + A - m.actualBoundingBoxAscent : half + D - m.actualBoundingBoxDescent);
}
const zoneInner = html => "<div data-fitbox style=\"display:flex;flex-direction:column;align-items:center;white-space:nowrap;flex-shrink:0\">" + html + "</div>";

/**
 * Every style drawn for one brief: for each style its three screens and its two stickers, fitted.
 * A screen is { bg, html } (sizes in em, 100em = the screen's width) or { image } for a ready-made picture.
 */
function artFor(brief) {
  return STYLES.map(style => {
    const screens = {};
    ["default", "video", "thanks"].forEach(kind => {
      const s = style.screen(kind, brief);
      screens[kind] = s.image ? { image: s.image } : { bg: s.bg, html: fitted(s.html, 1000, 562.5, "font-size:10px;line-height:1.1;", 0.96) };
    });
    const stickers = style.board(brief);
    return { screens, top: fitSticker(stickers.top, "top"), bottom: fitSticker(stickers.bottom, "bottom") };
  });
}

/* ---------- on the page ---------- */
const screenHigh = w => Math.round(w * 9 / 16);
/** One screen, w px wide. */
function screenHtml(piece, w) {
  const size = "width:" + w + "px;height:" + screenHigh(w) + "px;";
  return piece.image ? "<div aria-hidden=\"true\" class=\"scr\" style=\"" + size + "background:url(" + piece.image + ") center/cover\"></div>"
    : "<div aria-hidden=\"true\" class=\"scr\" style=\"" + size + "background:" + piece.bg + ";font-size:" + (w / 100).toFixed(2) + "px\">" + piece.html + "</div>";
}
/* A board is never laid out live on the page. Seen at an angle it needs 3D, and an iPhone holds every 3D layer at its full,
   unscaled size: six boards on the wheel, each a 1800 x 3000 px plane, were far more than a phone allows a page, and it
   closed the page. So every board on the page is a flat picture, drawn once at the size it shows (boardPicture below). */

/* ---------- PNG files, made in the browser ---------- */
const FONT_SHEET = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800;900&display=swap";
const asDataUrl = blob => new Promise((yes, no) => { const r = new FileReader(); r.onload = () => yes(r.result); r.onerror = () => no(r.error); r.readAsDataURL(blob); });
let fontRules = null;
/**
 * The app's font, carried inside each picture: a picture drawn from HTML can't reach out for it. Fetched once.
 * The font is one file for every weight, so each set of letters is carried once, for weights 500 to 900. Only the
 * basic set goes into every picture; the extra letters (such as ā in a Māori name) only when the wording has them.
 * Carrying the whole sheet into every picture made each one almost 1 MB, and a phone kept them.
 */
function fontCss() {
  if (!fontRules) fontRules = (async () => {
    const sheet = await (await fetch(FONT_SHEET)).text(), out = {};
    for (const set of ["latin", "latin-ext"]) {
      const m = new RegExp("/\\*\\s*" + set + "\\s*\\*/\\s*@font-face\\s*\\{([^}]*)\\}").exec(sheet); if (!m) continue;
      const url = /url\((https:[^)]+)\)/.exec(m[1]), range = /unicode-range:\s*([^;]+);/.exec(m[1]); if (!url) continue;
      out[set] = "@font-face{font-family:'Inter Tight';font-style:normal;font-weight:500 900;src:url(" + await asDataUrl(await (await fetch(url[1])).blob()) + ") format('woff2');" + (range ? "unicode-range:" + range[1] + ";" : "") + "}";
    }
    if (!out.latin) throw new Error("");
    return out;
  })().catch(x => { fontRules = null; throw x; });
  return fontRules;
}
/** The font a piece of HTML needs inside its picture. */
const fontFor = async html => { const f = await fontCss(); return f.latin + (f["latin-ext"] && /[\u0100-\u024F\u1E00-\u1EFF]/.test(html) ? f["latin-ext"] : ""); };
const loadImage = src => new Promise((yes, no) => { const img = new Image(); img.onload = () => yes(img); img.onerror = () => no(new Error("")); img.src = src; });
const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const pngOf = canvas => new Promise((yes, no) => canvas.toBlob(blob => blob ? yes(blob) : no(new Error("")), "image/png"));
/**
 * Draws a piece of HTML, w × h px as laid out, onto a canvas outW × outH px.
 * swaps = pictures inside it: each on-page address is swapped for the picture itself.
 */
async function shot(html, w, h, outW, outH, swaps) {
  const box = document.createElement("div");
  box.setAttribute("style", "position:relative;width:" + w + "px;height:" + h + "px;overflow:hidden;font-family:'Inter Tight',system-ui,sans-serif;font-weight:500;line-height:normal");
  if (/[;"\s]transform\s*:/.test(html)) throw new Error("A picture can't use a CSS transform: Safari ignores it.");
  let inner = "<style>*{box-sizing:border-box}" + await fontFor(html) + "</style>" + html;        /* the page's own sizing rule, so a piece measures the same in the file as on the page */
  for (const from of Object.keys(swaps || {})) inner = inner.split(from).join(swaps[from]);
  box.innerHTML = inner;
  const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + outW + "\" height=\"" + outH + "\" viewBox=\"0 0 " + w + " " + h + "\"><foreignObject x=\"0\" y=\"0\" width=\"" + w + "\" height=\"" + h + "\">" + new XMLSerializer().serializeToString(box) + "</foreignObject></svg>";
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), canvas = canvasOf(outW, outH), ctx = canvas.getContext("2d");
  /* Safari can draw the first pass before the font inside the picture is ready, so there it is drawn twice */
  const passes = /apple/i.test(navigator.vendor || "") ? 2 : 1;
  for (let n = 0; n < passes; n++) {
    const img = await loadImage(src); if (img.decode) await img.decode().catch(() => {});
    if (n) await new Promise(done => setTimeout(done, 120));
    ctx.clearRect(0, 0, outW, outH); ctx.drawImage(img, 0, 0, outW, outH);
    img.src = "";                                      /* lets the phone drop the decoded picture straight away */
  }
  return canvas;
}
/** Where a point of a flat piece lands once a CSS matrix3d has moved it. */
const through = (m, x, y) => { const w = m[3] * x + m[7] * y + m[15]; return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]; };
/**
 * Draws a flat picture (sw × sh in its own units) onto a canvas as if seen at an angle.
 * place(x, y) says where each point lands. It is done in small triangles, each one a plain stretch.
 */
function warp(ctx, picture, sw, sh, place) {
  const N = 14, tri = (s, d) => {
    const den = s[0][0] * (s[1][1] - s[2][1]) + s[1][0] * (s[2][1] - s[0][1]) + s[2][0] * (s[0][1] - s[1][1]);
    const fit = k => [(d[0][k] * (s[1][1] - s[2][1]) + d[1][k] * (s[2][1] - s[0][1]) + d[2][k] * (s[0][1] - s[1][1])) / den,
      (d[0][k] * (s[2][0] - s[1][0]) + d[1][k] * (s[0][0] - s[2][0]) + d[2][k] * (s[1][0] - s[0][0])) / den,
      (d[0][k] * (s[1][0] * s[2][1] - s[2][0] * s[1][1]) + d[1][k] * (s[2][0] * s[0][1] - s[0][0] * s[2][1]) + d[2][k] * (s[0][0] * s[1][1] - s[1][0] * s[0][1])) / den];
    const X = fit(0), Y = fit(1), cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3;
    ctx.save(); ctx.beginPath();
    d.forEach((p, n) => { const dx = p[0] - cx, dy = p[1] - cy, len = Math.hypot(dx, dy) || 1, x = p[0] + dx / len * 0.6, y = p[1] + dy / len * 0.6; if (n) ctx.lineTo(x, y); else ctx.moveTo(x, y); });   /* a hair wider, so no seams show */
    ctx.closePath(); ctx.clip();
    ctx.transform(X[0], Y[0], X[1], Y[1], X[2], Y[2]); ctx.drawImage(picture, 0, 0, sw, sh); ctx.restore();
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = sw * i / N, x1 = sw * (i + 1) / N, y0 = sh * j / N, y1 = sh * (j + 1) / N;
    tri([[x0, y0], [x1, y0], [x0, y1]], [place(x0, y0), place(x1, y0), place(x0, y1)]);
    tri([[x1, y0], [x1, y1], [x0, y1]], [place(x1, y0), place(x1, y1), place(x0, y1)]);
  }
}
/** One screen as a PNG. swaps: see shot(). */
async function screenPng(piece, swaps) {
  const W = SCREEN_PX[0], H = SCREEN_PX[1];
  if (piece.image) { const c = canvasOf(W, H); c.getContext("2d").drawImage(await loadImage(piece.image), 0, 0, W, H); return pngOf(c); }
  return pngOf(await shot("<div style=\"position:absolute;inset:0;overflow:hidden;line-height:1.1;background:" + piece.bg + ";font-size:" + (W / 100) + "px\">" + piece.html + "</div>", W, H, W, H, swaps));
}
/** One sticker as a PNG at its print size, on a see-through background. */
async function stickerPng(art, which, swaps) {
  const z = zoneBox(which), st = art[which], px = mm => Math.round(mm / 25.4 * PRINT_DPI), canvas = canvasOf(px(STICKERS[which].w), px(STICKERS[which].h)), q = canvas.width / z.w;
  const flat = await stickerShot(st, q, swaps);
  canvas.getContext("2d").drawImage(flat, st.x * q, st.y * q, Math.ceil(st.w) * st.s * q, Math.ceil(st.h) * st.s * q); freeCanvas(flat);
  try { return await pngOf(canvas); } finally { freeCanvas(canvas); }
}
const freeCanvas = c => { if (c) { c.width = 0; c.height = 0; } };          /* gives a canvas's memory back straight away (phones keep it otherwise) */
const boardPhotos = {};
const boardPhoto = view => boardPhotos[view] || (boardPhotos[view] = loadImage("assets/board-" + view + ".jpg").catch(x => { delete boardPhotos[view]; throw x; }));
/** Where a point of a sticker's zone lands on a picture of the board, k = the picture's px per plane px. */
const onPlane = (view, which, k) => { const z = zoneBox(which); return (x, y) => (view === "angle" ? through(M_ANGLE, z.x + x, z.y + y) : [z.x + x, z.y + y]).map(v => v * k); };
/**
 * One view of the board as a flat picture, outW x outH px: the photo, the ticked screen style on its screen, and the stickers.
 * print = the stickers pick up the board's shading (the opened board and the download). The small boards on the wheel don't (design).
 */
async function boardCanvas(art, view, screen, outW, outH, swaps, print) {
  const k = outW / PLANE[0], fine = Math.min(2, k * 1.6), canvas = canvasOf(outW, outH), ctx = canvas.getContext("2d");
  ctx.drawImage(await boardPhoto(view), 0, 0, outW, outH);
  if (screen && !screen.image) {
    const sw = Math.max(96, Math.ceil(640 * fine)), flat = await shot("<div style=\"position:absolute;inset:0;overflow:hidden;line-height:1.1;background:" + screen.bg + ";font-size:6.4px\">" + screen.html + "</div>", 640, 360, sw, Math.ceil(sw * 9 / 16), swaps);
    warp(ctx, flat, 640, 360, (x, y) => through(M_SCREEN[view], x, y).map(v => v * k)); freeCanvas(flat);
  }
  const ink = canvasOf(outW, outH), ictx = ink.getContext("2d");
  for (const which of ["top", "bottom"]) {
    const st = art[which], flat = await stickerShot(st, fine, swaps), place = onPlane(view, which, k);
    warp(ictx, flat, Math.ceil(st.w) * st.s, Math.ceil(st.h) * st.s, (x, y) => place(st.x + x, st.y + y)); freeCanvas(flat);
  }
  if (print) ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(ink, 0, 0); ctx.globalCompositeOperation = "source-over"; freeCanvas(ink);
  return canvas;
}
/** The two sticker limits on one view of the board, on a see-through picture, for "Show size limits". */
async function limitsCanvas(view, outW, outH) {
  const k = outW / PLANE[0], fine = Math.min(2, k * 1.6), canvas = canvasOf(outW, outH), ctx = canvas.getContext("2d");
  for (const which of ["top", "bottom"]) {
    const z = zoneBox(which), flat = await shot("<div style=\"position:absolute;inset:0;border:5px dashed #C8452F\"><span style=\"position:absolute;left:8px;top:6px;padding:2px 8px;background:#C8452F;color:#fffdf8;font:800 26px 'Inter Tight',sans-serif;white-space:nowrap\">max " + mmWords(which) + "</span></div>", z.w, z.h, Math.ceil(z.w * fine), Math.ceil(z.h * fine));
    warp(ctx, flat, z.w, z.h, onPlane(view, which, k)); freeCanvas(flat);
  }
  return canvas;
}
/** A picture for the page, as an address it can show. Boards are JPG (nothing see-through), limits PNG. */
async function pictureUrl(canvas, type) {
  try { return URL.createObjectURL(await new Promise((yes, no) => canvas.toBlob(blob => blob ? yes(blob) : no(new Error("")), type, 0.9))); }
  finally { freeCanvas(canvas); }
}
const boardPicture = (art, view, screen, w, h, swaps, print) => boardCanvas(art, view, screen, w, h, swaps, print).then(c => pictureUrl(c, "image/jpeg"));
const limitsPicture = (view, w, h) => limitsCanvas(view, w, h).then(c => pictureUrl(c, "image/png"));
/** The board as a PNG, the size of the board photo: the photo, the screen on it, and the stickers printed onto it. */
async function boardPng(art, view, screen, swaps) {
  const canvas = await boardCanvas(art, view, screen, BOARD_PX[0], BOARD_PX[1], swaps, true);
  try { return await pngOf(canvas); } finally { freeCanvas(canvas); }
}
/**
 * Hands finished files to the person. On a phone the share sheet opens, with "Save image" in it. On a laptop they download.
 * Gives back "shared", "saved", "stopped" (they closed the share sheet) or "blocked" (the phone wants a fresh tap first).
 */
async function handOver(files) {
  const list = files.map(f => new File([f.blob], f.name, { type: f.blob.type || "image/png" }));
  if (matchMedia("(pointer:coarse)").matches && navigator.canShare && navigator.canShare({ files: list })) {
    try { await navigator.share({ files: list }); return "shared"; }
    catch (x) { return x && x.name === "AbortError" ? "stopped" : "blocked"; }
  }
  for (const f of files) {
    const a = document.createElement("a"), url = URL.createObjectURL(f.blob);
    a.href = url; a.download = f.name; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    await new Promise(done => setTimeout(done, 350));
  }
  return "saved";
}
