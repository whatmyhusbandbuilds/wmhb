"use strict";
/* wmhb app: the Clients screen, the hub: every change for a client starts here. The calendar, the list (a booking's row
   swipes left for Board, Screen and Cancel on a phone; on a laptop they show beside it), the filter, and "Add a booking".
   A client opens their sheet (client.js) from anywhere. */

/* Enquiry dates are typed by clients: "5 December 2026", "January 2027", or nothing. */
function parseLoose(t) {
  t = txt(t).replace(/^[A-Za-z]{3,9},?\s+(?=\d)/, "");
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t), y, mo, d;
  if (m) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
  else if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/.exec(t))) { d = +m[1]; mo = MO.findIndex(x => x.toLowerCase() === m[2].toLowerCase()); y = +m[3]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) { d = +m[1]; mo = +m[2] - 1; y = +m[3]; }
  else return null;
  if (mo < 0 || mo > 11 || d < 1) return null;
  const iso = isoOf(y, mo, d), back = new Date(ms(iso));
  return back.getUTCDate() === d && back.getUTCMonth() === mo ? iso : null;
}
function groupOf(type) {
  const t = txt(type).toLowerCase();
  if (/wedding/.test(t)) return "Weddings";
  if (/corporate|brand/.test(t)) return "Corporate";
  if (/market|expo|fair|\bshow\b/.test(t)) return "Markets";
  return "Celebrations";
}

/* ---------- the data ---------- */
/* The filter's three groups. Booked takes in every booking with its deposit in: Deposit received, Booked and Done. */
const STATUS_KEYS = [["booked", "Booked", "Deposit in. Paid, or balance to pay"], ["waiting", "Waiting on deposit", "Invoice sent, deposit not in yet"], ["enquiry", "Enquiry", "New, or waiting on their reply"]];
/* How urgent each stage is, for a day with more than one booking: red over yellow over green, then grey. */
const URGENT = { waiting: 0, deposit: 1, booked: 2, done: 3 };
const TYPE_KEYS = ["Celebrations", "Weddings", "Corporate", "Markets"];
Object.assign(S, { ym: null, f: {}, acc: "status", items: [], refunds: [], clash: new Map(), toAnswer: 0, toChase: 0 });
STATUS_KEYS.forEach(k => S.f[k[0]] = true); TYPE_KEYS.forEach(k => S.f[k] = true);
{ const t = todayIso(); S.ym = [+t.slice(0, 4), +t.slice(5, 7) - 1]; }

/** Turns what the tracker sent into the items the calendar and the list show, and counts the menu badges. */
function build(data) {
  const items = [], refunds = [], today = todayIso(); let toChase = 0, toAnswer = 0;
  for (const b of data.bookings || []) {
    const name = txt(b.client); if (!name) continue;
    const f = moneyOf(b), date = f.date;
    /* a cancelled booking is off the calendar; it stays at the bottom of the list while its refund is still to send */
    if (f.cancelled) { if (num(b.refund) > 0 && !txt(b.refundSent)) refunds.push({ id: "b" + b.row, name, refund: num(b.refund), ref: b }); continue; }
    /* the stage follows the hire money (moneyOf): waiting (red), deposit received (yellow), booked (green), done (grey) */
    const kind = f.stage, owing = f.owing;
    if (kind === "waiting" || owing > 0) toChase++;
    items.push({ id: "b" + b.row, booking: true, kind, fkey: kind === "waiting" ? "waiting" : "booked", live: !date || date >= today, name, short: calendarName(name), date, dateText: "",
      type: txt(b.type), group: groupOf(b.type), venue: [txt(b.venue), txt(b.suburb)].filter(Boolean).join(", "), contact: "", owing, ref: b });
  }
  for (const q of data.enquiries || []) {
    const name = txt(q.name), st = txt(q.status) || "New"; if (!name || txt(q.what)) continue;        /* anything in "What happened" is closed */
    if (st !== "New" && st !== "Waiting on response") continue;
    if (st === "New") toAnswer++;
    const venue = (/venue:\s*([^\n]+)/i.exec(txt(q.message)) || [])[1] || "";
    items.push({ id: "q" + q.row, booking: false, kind: "enquiry", fkey: "enquiry", live: true, status: st, name, short: calendarName(name), date: parseLoose(q.date), dateText: txt(q.date),
      type: txt(q.type), group: groupOf(q.type), venue: venue.trim(), contact: txt(q.contact), owing: 0, ref: q });
  }
  const rank = { booked: 0, done: 0, deposit: 1, waiting: 2, enquiry: 3 };
  items.sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : (a.date || "9") > (b.date || "9") ? 1 : rank[a.kind] - rank[b.kind]);
  /* Clash rule: more than one live item on a date. There is only one board. */
  const by = new Map();
  items.forEach(i => { if (i.date && i.live) by.set(i.date, (by.get(i.date) || []).concat(i)); });
  S.clash = new Map([...by].filter(e => e[1].length > 1));
  S.items = items; S.refunds = refunds; S.toAnswer = toAnswer; S.toChase = toChase;
}
const match = i => S.f[i.fkey] && S.f[i.group];
const ymKey = () => isoOf(S.ym[0], S.ym[1], 1).slice(0, 7);
const inMonth = i => i.date && i.date.slice(0, 7) === ymKey();
const clashes = i => i.date && S.clash.has(i.date) && S.clash.get(i.date).includes(i);
const itemOf = id => S.items.find(i => i.id === id);
/** Where a booking or an enquiry is up to, in words. */
const statusWords = i => i.kind === "booked" ? "Booked (paid)" : i.kind === "deposit" ? "Deposit received (" + money(i.owing) + " to pay)" : i.kind === "done" ? "Done" + (i.owing > 0 ? " (" + money(i.owing) + " to pay)" : "")
  : i.kind === "waiting" ? "Waiting on deposit" : i.status === "New" ? "Enquiry: new" : "Enquiry: waiting on response";
function badges(i) {
  const t = statusWords(i);
  return "<span class=\"badge " + i.kind + "\">" + esc(t) + "</span>" + (clashes(i) ? "<span class=\"badge clashb\">Clash</span>" : "");
}
/* In a sentence a name loses any note in brackets: "Jess (example)" reads as "Jess". */
const plain = i => withoutBrackets(i.name);
const said = i => plain(i) + (i.kind === "booked" || i.kind === "done" ? " is booked" : i.kind === "deposit" ? " has paid the deposit" : i.kind === "waiting" ? " is waiting on deposit" : " has enquired");
const word = i => i.kind === "booked" ? "booked" : i.kind === "deposit" ? "deposit received" : i.kind === "done" ? "done" : i.kind === "waiting" ? "waiting on deposit" : "enquiry";

/* ---------- the screen ---------- */
SCREENS.clients = {
  right: "<button class=\"btn\" type=\"button\" data-do=\"new\">Add a booking</button>",
  html() {
    return "<div class=\"fbar ph\" data-screen=\"clients\"><button class=\"cardbtn wm-card\" type=\"button\" id=\"fopen\" data-do=\"filter-open\" data-fid=\"fopen\" aria-haspopup=\"dialog\"><svg aria-hidden=\"true\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\"><path d=\"M4 6h16M7 12h10M10 18h4\"/></svg>Filters<span class=\"ontag\" id=\"fon\" hidden>On</span></button><p class=\"fsum\" id=\"fsum\"></p></div>" +
      "<div class=\"cols\"><div class=\"panel wm-card lp\" id=\"panel\" aria-label=\"Filter the calendar\"></div>" +
      "<div class=\"cal\"><div id=\"clashes\"></div>" +
      "<div class=\"caltile\"><div class=\"mbar\"><button type=\"button\" data-do=\"month\" data-by=\"-1\" data-fid=\"prev\" aria-label=\"Previous month\">&lt;</button><div id=\"mlabel\" aria-live=\"polite\"></div><button type=\"button\" data-do=\"month\" data-by=\"1\" data-fid=\"next\" aria-label=\"Next month\">&gt;</button></div>" +
      "<div class=\"calwrap\"><div class=\"grid\" id=\"grid\"></div></div></div>" +
      "<div class=\"key\"><span><i class=\"dot waiting\" aria-hidden=\"true\"></i>Waiting on deposit</span><span><i class=\"dot deposit\" aria-hidden=\"true\"></i>Deposit received</span><span><i class=\"dot\" aria-hidden=\"true\"></i>Booked</span><span><i class=\"dot done\" aria-hidden=\"true\"></i>Done</span><span><i class=\"keyq wm-card\" aria-hidden=\"true\"></i>Enquiry</span><span><i class=\"bang\" aria-hidden=\"true\">!</i>Clash</span></div></div>" +
      "<div class=\"list\" id=\"list\"></div></div>";
  },
  fill(first) { drawFilter(); drawCal(); drawList(); if (first) swipeHint(); }
};

/* ---------- filter: a panel on a laptop, a sheet on the phone ---------- */
const offStatus = () => STATUS_KEYS.filter(k => !S.f[k[0]]), offType = () => TYPE_KEYS.filter(k => !S.f[k]);
function filterSummary() {
  const offS = offStatus(), offT = offType(), parts = [];
  if (offS.length) parts.push("Bookings: " + (STATUS_KEYS.filter(k => S.f[k[0]]).map(k => k[1]).join(", ") || "none"));
  if (offT.length) parts.push("Event type: " + (TYPE_KEYS.filter(k => S.f[k]).join(", ") || "none"));
  return parts.length ? parts.join("; ") : "Showing everything";
}
function tickHtml(k, label, desc, dot) {
  return "<button class=\"tick\" type=\"button\" data-do=\"tick\" data-tick=\"" + k + "\" data-fid=\"t-" + k + "\" aria-pressed=\"" + S.f[k] + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span>" + (dot ? "<i class=\"dot " + (k === "booked" ? "" : k) + "\" aria-hidden=\"true\"></i>" : "") +
    "<span class=\"tl\"><span>" + label + "</span>" + (desc ? "<span>" + desc + "</span>" : "") + "</span><span class=\"n\">" + S.items.filter(i => i.fkey === k || i.group === k).length + "</span></button>";
}
const ticksS = () => STATUS_KEYS.map(k => tickHtml(k[0], k[1], k[2], true)).join(""), ticksT = () => TYPE_KEYS.map(k => tickHtml(k, k, "", false)).join("");
const filterHead = "<div class=\"f-head\"><h2 id=\"dlg-title\">filter</h2><button class=\"linkbtn\" type=\"button\" data-do=\"filter-reset\" data-fid=\"reset\">Reset</button></div>";
function drawFilter() {
  const on = offStatus().length + offType().length > 0, sum = filterSummary();
  const fon = $("#fon"); if (fon) { fon.hidden = !on; $("#fsum").textContent = sum; }
  const panel = $("#panel");
  if (!panel || phone()) return;
  if (!panel.firstChild) panel.innerHTML = filterHead.replace(" id=\"dlg-title\"", "") + "<h3 class=\"fh\">Bookings</h3>" + ticksS() + "<h3 class=\"fh\">Event type</h3>" + ticksT() + "<p class=\"fnote\"></p>";
  syncTicks(panel); $(".fnote", panel).textContent = sum;
}
/* Brings ticks that are already on screen up to date, so a tick can ease in and out. */
function syncTicks(root) {
  $$("[data-tick]", root).forEach(b => { b.setAttribute("aria-pressed", S.f[b.dataset.tick]); $(".n", b).textContent = S.items.filter(i => i.fkey === b.dataset.tick || i.group === b.dataset.tick).length; });
}
function showLabel() { const n = S.items.filter(match).length; return "Show " + n + " booking" + (n === 1 ? "" : "s") + " and enquiries"; }
const hiding = off => off.length ? "Hiding " + off.join(", ") : "All showing";
function openFilter() {
  const group = (id, title, off, mini, rows) => "<div class=\"acc\"><button class=\"acch\" type=\"button\" data-do=\"acc\" data-acc=\"" + id + "\" aria-expanded=\"" + (S.acc === id) + "\"><span class=\"t\"><span>" + title + "</span><span id=\"hid-" + id + "\">" + esc(hiding(off)) + "</span></span><span class=\"mini\">" + mini + "</span>" + PLUS + "</button>" +
    "<div class=\"coll" + (S.acc === id ? " open" : "") + "\" id=\"coll-" + id + "\"><div><div class=\"accb\">" + rows + "</div></div></div></div>";
  show("filter", filterHead + "<div class=\"accs\">" +
    group("status", "Bookings", offStatus().map(k => k[1]), "<i class=\"dot\" aria-hidden=\"true\"></i><i class=\"dot waiting\" aria-hidden=\"true\"></i><i class=\"dot enquiry\" aria-hidden=\"true\"></i>", ticksS()) +
    group("type", "Event type", offType(), "", ticksT()) + "</div>" +
    "<button class=\"btn big\" type=\"button\" data-do=\"close\" id=\"fshow\">" + showLabel() + "</button>", "filter");
  dlg.setAttribute("aria-label", "Filter the calendar");
}
/* While the filter sheet is open, a tick changes what is already there, so the tick and the opening sections can move. */
SHEETS.filter = {
  sync() {
    syncTicks(dlg);
    $$("[data-acc]", dlg).forEach(b => { const open = S.acc === b.dataset.acc; b.setAttribute("aria-expanded", open); $("#coll-" + b.dataset.acc).classList.toggle("open", open); });
    $("#hid-status").textContent = hiding(offStatus().map(k => k[1])); $("#hid-type").textContent = hiding(offType());
    $("#fshow").textContent = showLabel();
  }
};
function filterChanged() { keepFocus(() => { drawFilter(); drawCal(); drawList(); }); if (sheetKind === "filter") SHEETS.filter.sync(); }

/* ---------- calendar ---------- */
function drawCal() {
  if (!$("#grid")) return;
  const P = phone(), [y, m] = S.ym, today = todayIso(), first = new Date(Date.UTC(y, m, 1)), lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), cells = Math.ceil((lead + days) / 7) * 7, start = addDays(isoOf(y, m, 1), -lead);
  $("#mlabel").textContent = MONTHS[m] + " " + y;
  const byDay = new Map();                       /* one pass over the items, instead of one per day cell */
  S.items.forEach(i => { if (inMonth(i) && match(i)) byDay.set(i.date, (byDay.get(i.date) || []).concat(i)); });
  let h = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => "<div class=\"dow\" aria-hidden=\"true\">" + d + "</div>").join("");
  for (let c = 0; c < cells; c++) {
    const iso = addDays(start, c), p = dParts(iso), out = p.m !== m;
    const its = (!out && byDay.get(iso)) || [], clash = !out && S.clash.has(iso);
    /* the whole tile takes the colour of its booking, the most urgent one if there are more; a day with only enquiries keeps the dashed look */
    const bk = its.filter(i => i.booking).sort((a, b) => URGENT[a.kind] - URGENT[b.kind])[0], tone = bk ? " st-" + bk.kind : its.length ? " st-enquiry" : "";
    const cls = (out ? " out" : "") + (iso === today ? " today" : "") + (!out && iso < today ? " past" : "") + tone;      /* days already gone are dulled, with whatever is on them */
    if (P) {
      const first = bk || its[0];
      const inner = "<span class=\"num\">" + p.d + "</span><span class=\"nm\">" + (its.length ? esc(first.short) + (its.length > 1 ? " +" + (its.length - 1) : "") : "") + "</span>";
      const bang = clash ? "<span class=\"bang\" role=\"img\" aria-label=\"Clash\">!</span>" : "";
      /* more than one thing on a day: the day opens a sheet with all of them (the day alone used to reach only the first enquiry) */
      if (its.length > 1) h += "<div class=\"pc wm-cell" + cls + "\"><button type=\"button\" class=\"pcb\" data-do=\"day\" data-day=\"" + iso + "\" data-fid=\"c-" + iso + "\" aria-haspopup=\"dialog\" aria-label=\"" + its.length + " things on " + fmt(iso) + ": " + esc(its.map(i => i.name + ", " + word(i)).join("; ")) + "\">" + inner + "</button>" + bang + "</div>";
      else h += "<div class=\"pc wm-cell" + cls + "\">" + (its.length ? "<button type=\"button\" class=\"pcb\" data-do=\"item\" data-item=\"" + its[0].id + "\" data-fid=\"c-" + iso + "\" aria-haspopup=\"dialog\" aria-label=\"Open " + esc(its[0].name) + ", " + word(its[0]) + ", " + fmt(iso) + "\">" + inner + "</button>" : inner) + bang + "</div>";      /* anyone on the day opens their sheet: booked, waiting or an enquiry */
    } else {
      h += "<div class=\"lc" + cls + (its.length ? " has" : "") + "\"><div class=\"dn\">" + p.d + "</div>" + its.slice().sort((a, b) => (a.booking ? URGENT[a.kind] : 9) - (b.booking ? URGENT[b.kind] : 9)).map(i =>
        "<button type=\"button\" class=\"pill " + i.kind + (i.booking && its.filter(o => o.booking).length > 1 ? " multi" : "") + "\" data-do=\"item\" data-item=\"" + i.id + "\" data-fid=\"c-" + i.id + "\" aria-haspopup=\"dialog\" aria-label=\"Open " + esc(i.name) + ", " + word(i) + ", " + fmt(iso) + "\">" + esc(i.short) + "</button>").join("") + (clash ? "<span class=\"ctag\">Clash</span>" : "") + "</div>";
    }
  }
  $("#grid").innerHTML = h;
  $("#clashes").innerHTML = [...S.clash].filter(e => e[0].slice(0, 7) === ymKey()).sort().map(([iso, its]) => {
    const q = its.find(i => !i.booking);
    return "<div class=\"clash wm-card\"><span class=\"bang\" aria-hidden=\"true\">!</span><span class=\"t\"><b>Clash on " + fmt(iso) + ".</b> " + esc(listAnd(its.map(said))) + ", on the same day.</span>" + (q ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"item\" data-item=\"" + q.id + "\" data-fid=\"x-" + iso + "\" aria-haspopup=\"dialog\">Open</button>" : "") + "</div>";
  }).join("");
}

/* ---------- the list ---------- */
/* The round buttons behind a booking's row swiped left (look B, with Aadil's third Cancel button): [tap, words, icon]. */
const QUICK_ICON = {
  board: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><rect x="8.6" y="8.2" width="6.8" height="5.2" rx=".9"/><path d="M9.2 5.3h5.6M9.2 16.4h5.6M10.4 18.7h3.2"/>',
  screen: '<rect x="2.5" y="4.5" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 17v3.5"/><path d="M5.6 14l3.6-3.6 2.8 2.8 2-2 4.4 3.4"/><circle cx="16.3" cy="8" r="1.3"/>',
  cancel: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.5h17M8 3v4M16 3v4M9.6 12.6l4.8 4.8M14.4 12.6l-4.8 4.8"/>'
};
const QUICK = [["q-board", "Board", "board"], ["q-screen", "Screen", "screen"], ["q-cancel", "Cancel", "cancel"]];
/** The three round buttons for one booking. hidden = behind a row that isn't open yet, so not in the tab order. */
const quickHtml = (i, hidden) => QUICK.map(a => "<button type=\"button\" class=\"qbtn\" data-do=\"" + a[0] + "\" data-who=\"" + i.id + "\" data-fid=\"" + a[0] + "-" + i.id + "\"" + (hidden ? " tabindex=\"-1\"" : "") +
  " aria-label=\"" + a[1] + ", " + esc(i.name) + "\"><span class=\"qc wm-qc" + (a[2] === "cancel" ? " red" : "") + "\" aria-hidden=\"true\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\">" + QUICK_ICON[a[2]] + "</svg></span><span class=\"ql\" aria-hidden=\"true\">" + a[1] + "</span></button>").join("");
function rowHtml(i) {
  const p = i.date ? dParts(i.date) : null, mon = /^([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(i.dateText);
  const when = p ? "<span>" + p.wd + "</span><span>" + p.d + " " + p.mo + "</span>" : "<span>No date</span><span>" + esc(mon ? mon[1] + " " + mon[2] : i.dateText || "yet") + "</span>";
  /* how they got in touch shows only on the client sheet, not in the list */
  const body = "<span class=\"when\">" + when + "</span><span class=\"who\"><span class=\"n\">" + esc(i.name) + "</span><span class=\"s\">" + esc([i.type, i.venue].filter(Boolean).join(", ")) + "</span><span class=\"bs\">" + badges(i) + "</span></span>";
  /* a booking shows its invoice number, the reference used everywhere. Tapping a row opens the client. */
  const row = "<button type=\"button\" class=\"row\" data-do=\"item\" data-item=\"" + i.id + "\" data-fid=\"r-" + i.id + "\" aria-haspopup=\"dialog\">" + body + (i.booking && txt(i.ref.invoice) ? "<span class=\"inv\">" + esc(i.ref.invoice) + "</span>" : "") + "</button>";
  if (!i.booking) return row;                                         /* an enquiry's row doesn't swipe: its sheet has Keen and the status */
  if (!phone()) return "<div class=\"lrow\">" + row + "<div class=\"lacts\" role=\"group\" aria-label=\"" + esc(i.name) + "\">" + quickHtml(i, false) + "</div></div>";      /* a laptop: the same buttons beside the row, when the pointer is on it */
  return "<div class=\"srow\" data-sid=\"" + i.id + "\"><div class=\"sacts\" aria-hidden=\"true\">" + quickHtml(i, true) + "</div>" + row + "</div>";
}
/** A cancelled booking whose refund is still to send: at the bottom of the list until Refund sent is ticked on its sheet. */
const refundRow = r => { const p = /^\d{4}-\d{2}-\d{2}$/.test(txt(r.ref.date)) ? dParts(r.ref.date) : null; return "<button type=\"button\" class=\"row\" data-do=\"item\" data-item=\"" + r.id + "\" data-fid=\"r-" + r.id + "\" aria-haspopup=\"dialog\"><span class=\"when\">" + (p ? "<span>" + p.wd + "</span><span>" + p.d + " " + p.mo + "</span>" : "<span>No date</span>") + "</span><span class=\"who\"><span class=\"n\">" + esc(r.name) + "</span>" +
  "<span class=\"s\">" + esc(txt(r.ref.cancelReason)) + "</span><span class=\"bs\"><span class=\"badge refund\">Refund " + money(r.refund) + " to send</span></span></span>" + (txt(r.ref.invoice) ? "<span class=\"inv\">" + esc(r.ref.invoice) + "</span>" : "") + "</button>"; };
function drawList() {
  if (!$("#list")) return;
  const shown = S.items.filter(match), mName = MONTHS[S.ym[1]], sec = (title, rows) => "<h3 class=\"sec\">" + title + "</h3><div class=\"rows\">" + rows + "</div>";
  const refunds = S.refunds.length ? sec("Refunds to send", S.refunds.map(refundRow).join("")) : "";
  if (!phone()) { $("#list").innerHTML = sec("Everything that matches", shown.map(rowHtml).join("") || "<p class=\"empty\">Nothing matches these filters.</p>") + refunds; return; }
  const month = shown.filter(inMonth), enq = shown.filter(i => !i.date && !i.booking), bk = shown.filter(i => !i.date && i.booking);
  $("#list").innerHTML = sec("In " + mName, month.map(rowHtml).join("") || "<p class=\"empty\">Nothing in " + mName + (S.items.some(inMonth) ? " with these filters." : ".") + "</p>") +
    (enq.length ? sec("Enquiries with no date yet", enq.map(rowHtml).join("")) : "") + (bk.length ? sec("Bookings with no date yet", bk.map(rowHtml).join("")) : "") + refunds;
}

/* ---------- the day's list, and the date step when an enquiry becomes a booking ---------- */
let picked = "";                         /* the enquiry the date step is for */
/** A day with more than one thing on it: everything on it, each row opening that client's sheet. */
function openDay(iso) {
  const its = S.items.filter(i => i.date === iso && match(i)); if (!its.length) return;
  show("day", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(fmt(iso)) + "</h2><p class=\"sub\">" + its.length + " on this day" + (S.clash.has(iso) ? ", a clash" : "") + "</p>" +
    its.map(i => "<button class=\"dayrow\" type=\"button\" data-do=\"day-change\" data-item=\"" + i.id + "\" data-fid=\"dc-" + i.id + "\" aria-haspopup=\"dialog\" aria-label=\"Open " + esc(i.name) + ", " + esc(statusWords(i)) + "\"><span class=\"dot " + i.kind + "\" aria-hidden=\"true\"></span><span class=\"tl\"><span>" + esc(i.name) + "</span><span>" + esc(statusWords(i)) + "</span></span>" +
      "<span class=\"dgo\" aria-hidden=\"true\">Open</span></button>").join("") +
    "<button class=\"btn big done\" type=\"button\" data-do=\"close\">Done</button>");
}
/** Confirm on an enquiry moved to Waiting on deposit, with no event date yet: the date first, then it saves (client.js). */
function askDate(q) {
  picked = "q" + q.row;
  show("date", enquiryHeadOf(q) + "<div class=\"datestep\"><div class=\"fld\"><label for=\"edate\">When is the event?</label><input class=\"inp wm-card\" id=\"edate\" type=\"date\" min=\"" + todayIso() + "\"></div>" +
    "<button class=\"btn big\" type=\"button\" id=\"mk\" data-do=\"make\" disabled>Create the booking</button><button class=\"btn line\" type=\"button\" data-do=\"make\" data-skip>Don’t know yet</button></div>" +
    "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"linkbtn center\" type=\"button\" data-do=\"date-back\">Back</button>");
  $("#edate").addEventListener("input", e => { $("#mk").disabled = !e.target.value; });
}
SHEETS.date = { dirty: () => !!held && held.id === picked && changesOf(whoOf(picked)).any, reopen() { const q = whoOf(picked); if (q) askDate(q); } };

/* ---------- add a booking (not designed yet: a plain sheet, in the style of the Money sheets) ---------- */
function newFields() {
  const L = S.data.lists || {}, f = (key, kind, label, o) => Object.assign({ key, kind, label }, o || {});
  return {
    main: [
      f("Client name", "text", "Client name", { wide: true }),
      f("Event date", "date", "Event date"), f("Event type", "pick", "Event type", { options: L["Event type"] || [], blank: "Choose" }),
      f("Venue", "text", "Venue"), f("Suburb", "text", "Suburb"),
      f("Region", "pick", "Region", { options: L["Region"] || [], blank: "Choose" }),
      f("Package", "pick", "Package", { options: (S.data.packages || []).map(p => p.name), blank: "Choose" }),
      f("Custom price", "num", "Custom price ($)", { only: "Custom" }),
      f("Phone", "text", "Phone", { type: "tel" }), f("Email", "text", "Email", { type: "email" }), f("Instagram", "text", "Instagram"),
      f("How they found us", "pick", "How they found us", { options: L["How they found us"] || [], blank: "Not sure" })
    ],
    ticks: [
      f("Highlight reel", "yes", "Highlight reel"), f("Custom board and screen", "yes", "Custom board and screen"),
      f("No power point", "yes", "No power point"), f("Second event", "yes", "Second event")
    ],
    extras: [
      f("Host hours", "num", "Host hours"), f("Extra hours", "num", "Extra hours"), f("Extra days", "num", "Extra days"),
      f("Travel fee", "num", "Travel fee ($)"), f("Discount", "num", "Discount ($)")
    ],
    notes: [f("Notes", "long", "Notes", { wide: true })]
  };
}
let form = null;
function control(f) {
  const id = "f-" + f.key.replace(/\W+/g, "-"), v = form.values[f.key] || "";
  if (f.kind === "yes") return "<button class=\"tickf\" type=\"button\" data-do=\"yes\" data-key=\"" + esc(f.key) + "\" aria-pressed=\"" + (v === "Yes") + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span>" + esc(f.label) + "</button>";
  const lab = "<label for=\"" + id + "\">" + esc(f.label) + "</label>", hint = f.hint ? "<small>" + esc(f.hint) + "</small>" : "", at = " class=\"inp" + (f.kind === "pick" ? "" : " wm-card") + "\" id=\"" + id + "\" data-key=\"" + esc(f.key) + "\"";
  const c = f.kind === "pick" ? "<select" + at + "><option value=\"\">" + esc(f.blank) + "</option>" + f.options.map(o => "<option" + (o === v ? " selected" : "") + ">" + esc(o) + "</option>").join("") + "</select>"
    : f.kind === "date" ? "<input" + at + " type=\"date\" value=\"" + esc(v) + "\">"
    : f.kind === "num" ? "<input" + at + " type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"any\" value=\"" + esc(v) + "\">"
    : f.kind === "long" ? "<textarea" + at.replace("class=\"inp", "class=\"inp long") + " rows=\"3\" maxlength=\"1000\">" + esc(v) + "</textarea>"
    : "<input" + at + " type=\"" + (f.type || "text") + "\" autocomplete=\"off\" value=\"" + esc(v) + "\">";
  /* only = a box that is only for one package (Custom price): it shows once that package is picked */
  return "<div class=\"fld" + (f.wide ? " wide" : "") + "\"" + (f.only ? " data-only=\"" + esc(f.only) + "\"" + (sameWords(form.values["Package"], f.only) ? "" : " hidden") : "") + ">" + lab + c + hint + "</div>";
}
/** values: filled in (from an enquiry, or after a save failed, so nothing typed is lost). enquiry = {row, name} when Keen made it. */
function openNew(values, problem, enquiry) {
  if (!S.data) return;
  const fields = newFields(); form = { fields, values: values || {}, enquiry: enquiry || null };
  show("new", "<h2 id=\"dlg-title\" tabindex=\"-1\">add a booking</h2><p class=\"sub\">" + (enquiry ? "Filled in from " + esc(enquiry.name) + "’s enquiry, which closes once this saves. " : "") + "Goes into the next empty row of the tracker, with the next invoice number.</p>" +
    "<form id=\"frm\" novalidate><div class=\"fields lp2\" style=\"margin-top:16px\">" + fields.main.map(control).join("") + "</div>" +
    "<h3 class=\"fh\">Extras</h3><div class=\"ticks\">" + fields.ticks.map(control).join("") + "</div>" +
    "<div class=\"fields two\" style=\"margin-top:12px\">" + fields.extras.map(control).join("") + "</div>" +
    "<div class=\"fields\" style=\"margin-top:12px\">" + fields.notes.map(control).join("") + "</div>" +
    "<p class=\"err\" id=\"err\" role=\"alert\">" + esc(problem || "") + "</p><button class=\"btn big save\" type=\"submit\">Save booking</button></form><button class=\"btn line cancel\" type=\"button\" data-do=\"close\">Cancel</button>", "wide");
  dlg.setAttribute("aria-label", "Add a booking");
}
dlg.addEventListener("submit", async e => {
  e.preventDefault(); if (!form || sheetKind !== "new") return;
  const out = Object.assign({}, form.values);
  $$("[data-key]", dlg).forEach(el => { if (el.tagName !== "BUTTON") { const v = el.value.trim(); if (v !== "") out[el.dataset.key] = v; else delete out[el.dataset.key]; } });
  if (!out["Client name"] || !out["Event date"] || !out["Package"]) { $("#err").textContent = "A new booking needs a client name, an event date and a package."; return; }
  if (!sameWords(out["Package"], "Custom")) delete out["Custom price"];          /* a custom price is only for the Custom package */
  hide();
  const pkg = (S.data.packages || []).find(p => p.name === out["Package"]), total = num(out["Custom price"]) || (pkg && pkg.price) || 0, from = form.enquiry;
  const res = await save("addBooking", from ? { fields: out, enquiry: from } : out, data => {
    data.bookings.push({ row: -Date.now(), client: out["Client name"], date: out["Event date"], status: "Waiting on deposit", type: out["Event type"] || "", venue: out["Venue"] || "", suburb: out["Suburb"] || "", cancelled: "", total, received: 0, owing: total, invoice: "", gotInTouch: out["Got in touch by"] || "", handle: out["Handle or number"] || "" });
    const q = from && data.enquiries.find(x => x.row === from.row); if (q) { q.status = "Waiting on deposit"; q.what = "Moved to bookings"; }
  });
  if (res) toast("Added " + out["Client name"] + (res.invoice ? " as " + res.invoice : "") + (from ? ". The enquiry is closed." : "."));
  else if (!dlg.open) { const said_ = $("#toast").textContent; openNew(out, said_, from); }
});

/* the Custom price box shows only while the Custom package is picked */
dlg.addEventListener("change", e => {
  if (sheetKind !== "new" || !e.target.matches("[data-key=Package]")) return;
  $$("[data-only]", dlg).forEach(box => { box.hidden = !sameWords(e.target.value, box.dataset.only); });
});

/* ---------- taps ---------- */
Object.assign(TAPS, {
  "filter-open": () => openFilter(),
  "filter-reset": () => { Object.keys(S.f).forEach(k => S.f[k] = true); filterChanged(); },
  "acc": el => { S.acc = S.acc === el.dataset.acc ? "" : el.dataset.acc; SHEETS.filter.sync(); },
  "tick": el => { S.f[el.dataset.tick] = !S.f[el.dataset.tick]; filterChanged(); },
  "month": el => { const n = S.ym[0] * 12 + S.ym[1] + +el.dataset.by; S.ym = [Math.floor(n / 12), n % 12]; keepFocus(() => { drawCal(); drawList(); }); },
  "item": (el, e) => {
    const sr = el.closest(".srow");
    if (sr && (sr.dataset.dragged || sr.classList.contains("open"))) { if (!sr.dataset.dragged) setOpen(sr, false); return; }      /* a tap on an open row closes it */
    openSheet(el.dataset.item);
  },
  "day": el => openDay(el.dataset.day),
  "day-change": el => openSheet(el.dataset.item),
  "make": el => { if (!held || held.id !== picked) return; held.eventDate = el.dataset.skip != null ? "" : $("#edate").value; sheetFor = picked; confirmClient(); },
  "date-back": () => openSheet(picked, true),
  "new": () => openNew(),
  "yes": el => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); if (on) form.values[el.dataset.key] = "Yes"; else delete form.values[el.dataset.key]; }
});

/* ---------- a row swiped left: quick buttons (phone) ----------
   It follows the finger 1:1, once the drag is clearly sideways (10 px), so scrolling up and down still works. Let go past
   half the buttons, or with a quick flick, and it stays open; otherwise it slides back. One row is open at a time: a touch
   anywhere else, or scrolling, closes it. With reduced motion it opens and closes without sliding. */
let swOpen = null, sw = null;
const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
function setOpen(row, open) {
  if (open && swOpen && swOpen !== row) setOpen(swOpen, false);
  row.classList.toggle("open", open);
  const acts = $(".sacts", row); acts.setAttribute("aria-hidden", !open); $$(".qbtn", row).forEach(b => { b.tabIndex = open ? 0 : -1; });
  swOpen = open ? row : swOpen === row ? null : swOpen;
}
document.addEventListener("touchstart", e => {
  const row = e.target.closest && e.target.closest(".srow");
  if (swOpen && swOpen !== row) setOpen(swOpen, false);                 /* a touch anywhere else closes the open row */
  sw = null;
  if (!row || !phone() || e.touches.length !== 1 || e.target.closest(".sacts")) return;
  const t = e.touches[0], w = $(".sacts", row).offsetWidth;          /* the three round buttons and their gaps (app.css) */
  sw = { row, x: t.clientX, y: t.clientY, last: t.clientX, at: e.timeStamp, v: 0, w, base: row.classList.contains("open") ? -w : 0, now: 0, on: false, off: false };
}, { passive: true });
document.addEventListener("touchmove", e => {
  if (!sw || sw.off || e.touches.length !== 1) return;
  const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
  if (!sw.on) {
    if (Math.abs(dy) >= 10 && Math.abs(dy) >= Math.abs(dx)) { sw.off = true; return; }      /* up or down: a scroll */
    if (Math.abs(dx) < 10) return;
    sw.on = true; sw.row.classList.add("drag");
  }
  if (e.cancelable) e.preventDefault();
  if (e.timeStamp > sw.at) sw.v = (t.clientX - sw.last) / (e.timeStamp - sw.at);
  sw.last = t.clientX; sw.at = e.timeStamp;
  let x = sw.base + dx;
  if (x > 0) x = x / 4; else if (x < -sw.w) x = -sw.w + (x + sw.w) / 4;      /* past either end it resists */
  sw.now = x; $(".row", sw.row).style.transform = "translateX(" + x + "px)";
}, { passive: false });
const swipeEnd = e => {
  const d = sw; sw = null;
  if (!d || !d.on) return;
  const v = e.timeStamp - d.at > 100 ? 0 : d.v, open = v < -0.5 ? true : v > 0.5 ? false : d.now < -d.w / 2;
  d.row.classList.remove("drag"); $(".row", d.row).style.transform = "";
  setOpen(d.row, open);
  d.row.dataset.dragged = "1"; setTimeout(() => { delete d.row.dataset.dragged; }, 350);       /* the tap that ends a drag doesn't open the client */
};
document.addEventListener("touchend", swipeEnd); document.addEventListener("touchcancel", swipeEnd);
addEventListener("scroll", () => { if (swOpen && !sw) setOpen(swOpen, false); }, { passive: true });
/** The first time Clients opens on a device, one row shows its buttons briefly and slides back, so Sara knows rows swipe. */
function swipeHint() {
  if (!phone()) return;
  let seen = true; try { seen = localStorage.getItem("wmhb2.swipeHint") === "1"; if (!seen) localStorage.setItem("wmhb2.swipeHint", "1"); } catch (e) { seen = true; }
  if (seen) return;
  setTimeout(() => {
    const row = $("#list .srow"); if (!row || swOpen || dlg.open) return;
    row.classList.add("hint"); setTimeout(() => row.classList.remove("hint"), 1700);
  }, 700);
}
