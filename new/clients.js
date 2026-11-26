"use strict";
/* wmhb app: the Clients screen. The calendar, the list, the filter, the enquiry status picker and "Add a booking". */

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
const STATUS_KEYS = [["booked", "Booked", "Deposit in. Paid, or balance to pay"], ["waiting", "Waiting on deposit", "Invoice sent, deposit not in yet"], ["enquiry", "Enquiry", "New, or waiting on their reply"]];
const TYPE_KEYS = ["Celebrations", "Weddings", "Corporate", "Markets"];
Object.assign(S, { ym: null, f: {}, acc: "status", items: [], clash: new Map(), toAnswer: 0, toChase: 0 });
STATUS_KEYS.forEach(k => S.f[k[0]] = true); TYPE_KEYS.forEach(k => S.f[k] = true);
{ const t = todayIso(); S.ym = [+t.slice(0, 4), +t.slice(5, 7) - 1]; }

/** Turns what the tracker sent into the items the calendar and the list show, and counts the menu badges. */
function build(data) {
  const items = [], today = todayIso(); let toChase = 0, toAnswer = 0;
  for (const b of data.bookings || []) {
    const name = txt(b.client), st = txt(b.status); if (!name) continue;
    if (st === "Cancelled" || txt(b.cancelled) === "Yes") continue;
    const owing = Math.max(0, num(b.owing)), received = num(b.received);
    /* Booked = deposit in. Waiting on deposit = invoice sent, deposit not in. Both come from the tracker's Status column.
       A completed booking keeps the Booked look. */
    const kind = st === "Booked" || st === "Completed" ? "booked" : st === "Waiting on deposit" ? "waiting" : received > 0 ? "booked" : "waiting";
    if (kind === "waiting" || owing > 0) toChase++;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(txt(b.date)) ? b.date : null;
    items.push({ id: "b" + b.row, booking: true, kind, live: !date || date >= today, name, short: calendarName(name), date, dateText: "",
      type: txt(b.type), group: groupOf(b.type), venue: [txt(b.venue), txt(b.suburb)].filter(Boolean).join(", "), contact: "", owing, ref: b });
  }
  for (const q of data.enquiries || []) {
    const name = txt(q.name), st = txt(q.status) || "New"; if (!name || txt(q.what)) continue;        /* anything in "What happened" is closed */
    if (st !== "New" && st !== "Waiting on response") continue;
    if (st === "New") toAnswer++;
    const venue = (/venue:\s*([^\n]+)/i.exec(txt(q.message)) || [])[1] || "";
    items.push({ id: "q" + q.row, booking: false, kind: "enquiry", live: true, status: st, name, short: calendarName(name), date: parseLoose(q.date), dateText: txt(q.date),
      type: txt(q.type), group: groupOf(q.type), venue: venue.trim(), contact: txt(q.contact), owing: 0, ref: q });
  }
  const rank = { booked: 0, waiting: 1, enquiry: 2 };
  items.sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : (a.date || "9") > (b.date || "9") ? 1 : rank[a.kind] - rank[b.kind]);
  /* Clash rule: more than one live item on a date. There is only one board. */
  const by = new Map();
  items.forEach(i => { if (i.date && i.live) by.set(i.date, (by.get(i.date) || []).concat(i)); });
  S.clash = new Map([...by].filter(e => e[1].length > 1));
  S.items = items; S.toAnswer = toAnswer; S.toChase = toChase;
}
const match = i => S.f[i.kind] && S.f[i.group];
const ymKey = () => isoOf(S.ym[0], S.ym[1], 1).slice(0, 7);
const inMonth = i => i.date && i.date.slice(0, 7) === ymKey();
const clashes = i => i.date && S.clash.has(i.date) && S.clash.get(i.date).includes(i);
const itemOf = id => S.items.find(i => i.id === id);
function badges(i) {
  const t = i.kind === "booked" ? (i.owing > 0 ? "Booked (" + money(i.owing) + " to pay)" : "Booked (paid)") : i.kind === "waiting" ? "Waiting on deposit" : i.status === "New" ? "Enquiry: new" : "Enquiry: waiting on response";
  return "<span class=\"badge " + i.kind + "\">" + esc(t) + "</span>" + (clashes(i) ? "<span class=\"badge clashb\">Clash</span>" : "");
}
/* In a sentence a name loses any note in brackets: "Jess (example)" reads as "Jess". */
const plain = i => withoutBrackets(i.name);
const said = i => plain(i) + (i.kind === "booked" ? " is booked" : i.kind === "waiting" ? " is waiting on deposit" : " has enquired");
const word = i => i.kind === "booked" ? "booked" : i.kind === "waiting" ? "waiting on deposit" : "enquiry";

/* ---------- the screen ---------- */
SCREENS.clients = {
  right: "<button class=\"btn\" type=\"button\" data-do=\"new\">Add a booking</button>",
  html() {
    return "<div class=\"fbar ph\" data-screen=\"clients\"><button class=\"cardbtn wm-card\" type=\"button\" id=\"fopen\" data-do=\"filter-open\" data-fid=\"fopen\" aria-haspopup=\"dialog\"><svg aria-hidden=\"true\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\"><path d=\"M4 6h16M7 12h10M10 18h4\"/></svg>Filters<span class=\"ontag\" id=\"fon\" hidden>On</span></button><p class=\"fsum\" id=\"fsum\"></p></div>" +
      "<div class=\"cols\"><div class=\"panel wm-card lp\" id=\"panel\" aria-label=\"Filter the calendar\"></div>" +
      "<div class=\"cal\"><div id=\"clashes\"></div>" +
      "<div class=\"mbar\"><button type=\"button\" data-do=\"month\" data-by=\"-1\" data-fid=\"prev\" aria-label=\"Previous month\">&lt;</button><div id=\"mlabel\" aria-live=\"polite\"></div><button type=\"button\" data-do=\"month\" data-by=\"1\" data-fid=\"next\" aria-label=\"Next month\">&gt;</button></div>" +
      "<div class=\"calwrap\"><div class=\"grid\" id=\"grid\"></div></div>" +
      "<div class=\"key\"><span><i class=\"dot\" aria-hidden=\"true\"></i>Booked</span><span><i class=\"dot waiting\" aria-hidden=\"true\"></i>Waiting on deposit</span><span><i class=\"keyq wm-card\" aria-hidden=\"true\"></i>Enquiry</span><span><i class=\"bang\" aria-hidden=\"true\">!</i>Clash</span></div></div>" +
      "<div class=\"list\" id=\"list\"></div></div>";
  },
  fill() { drawFilter(); drawCal(); drawList(); }
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
    "<span class=\"tl\"><span>" + label + "</span>" + (desc ? "<span>" + desc + "</span>" : "") + "</span><span class=\"n\">" + S.items.filter(i => i.kind === k || i.group === k).length + "</span></button>";
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
  $$("[data-tick]", root).forEach(b => { b.setAttribute("aria-pressed", S.f[b.dataset.tick]); $(".n", b).textContent = S.items.filter(i => i.kind === b.dataset.tick || i.group === b.dataset.tick).length; });
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
    const its = (!out && byDay.get(iso)) || [], clash = !out && S.clash.has(iso), q = its.find(i => !i.booking);
    const cls = (out ? " out" : "") + (iso === today ? " today" : "");
    if (P) {
      const inner = "<span class=\"num " + (its.length ? its[0].kind : "") + "\">" + p.d + "</span><span class=\"nm\">" + (its.length ? esc(its[0].short) + (its.length > 1 ? " +" + (its.length - 1) : "") : "") + "</span>";
      const bang = clash ? "<span class=\"bang\" role=\"img\" aria-label=\"Clash\">!</span>" : "";
      h += "<div class=\"pc wm-cell" + cls + "\">" + (q ? "<button type=\"button\" class=\"pcb\" data-do=\"item\" data-item=\"" + q.id + "\" data-fid=\"c-" + iso + "\" aria-haspopup=\"dialog\" aria-label=\"Change the status of " + esc(q.name) + ", " + fmt(iso) + (its.length > 1 ? ". Also that day: " + esc(its.filter(i => i !== q).map(i => i.name + ", " + word(i)).join("; ")) : "") + "\">" + inner + "</button>"
        : inner + (its.length ? "<span class=\"sr\">" + esc(its.map(word).join(", ")) + "</span>" : "")) + bang + "</div>";
    } else {
      h += "<div class=\"lc" + cls + (its.length ? " has" : "") + "\"><div class=\"dn\">" + p.d + "</div>" + its.map(i => i.booking
        ? "<div class=\"pill " + i.kind + "\">" + esc(i.short) + "<span class=\"sr\">, " + word(i) + "</span></div>"
        : "<button type=\"button\" class=\"pill enquiry\" data-do=\"item\" data-item=\"" + i.id + "\" data-fid=\"c-" + i.id + "\" aria-haspopup=\"dialog\" aria-label=\"Change the status of " + esc(i.name) + ", " + fmt(iso) + "\">" + esc(i.short) + "</button>").join("") + (clash ? "<span class=\"ctag\">Clash</span>" : "") + "</div>";
    }
  }
  $("#grid").innerHTML = h;
  $("#clashes").innerHTML = [...S.clash].filter(e => e[0].slice(0, 7) === ymKey()).sort().map(([iso, its]) => {
    const q = its.find(i => !i.booking);
    return "<div class=\"clash wm-card\"><span class=\"bang\" aria-hidden=\"true\">!</span><span class=\"t\"><b>Clash on " + fmt(iso) + ".</b> " + esc(listAnd(its.map(said))) + ", on the same day.</span>" + (q ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"item\" data-item=\"" + q.id + "\" data-fid=\"x-" + iso + "\" aria-haspopup=\"dialog\">Open</button>" : "") + "</div>";
  }).join("");
}

/* ---------- the list ---------- */
function rowHtml(i) {
  const p = i.date ? dParts(i.date) : null, mon = /^([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(i.dateText);
  const when = p ? "<span>" + p.wd + "</span><span>" + p.d + " " + p.mo + "</span>" : "<span>No date</span><span>" + esc(mon ? mon[1] + " " + mon[2] : i.dateText || "yet") + "</span>";
  const body = "<span class=\"when\">" + when + "</span><span class=\"who\"><span class=\"n\">" + esc(i.name) + "</span><span class=\"s\">" + esc([i.type, i.venue].filter(Boolean).join(", ")) + "</span><span class=\"bs\">" + badges(i) + "</span></span>";
  /* a booking shows its invoice number, the reference used everywhere */
  return i.booking ? "<div class=\"row\">" + body + (txt(i.ref.invoice) ? "<span class=\"inv\">" + esc(i.ref.invoice) + "</span>" : "") + "</div>" : "<button type=\"button\" class=\"row\" data-do=\"item\" data-item=\"" + i.id + "\" data-fid=\"r-" + i.id + "\" aria-haspopup=\"dialog\">" + body + "<span class=\"chg\">Change</span></button>";
}
function drawList() {
  if (!$("#list")) return;
  const shown = S.items.filter(match), mName = MONTHS[S.ym[1]], sec = (title, rows) => "<h3 class=\"sec\">" + title + "</h3><div class=\"rows\">" + rows + "</div>";
  if (!phone()) { $("#list").innerHTML = sec("Everything that matches", shown.map(rowHtml).join("") || "<p class=\"empty\">Nothing matches these filters.</p>"); return; }
  const month = shown.filter(inMonth), enq = shown.filter(i => !i.date && !i.booking), bk = shown.filter(i => !i.date && i.booking);
  $("#list").innerHTML = sec("In " + mName, month.map(rowHtml).join("") || "<p class=\"empty\">Nothing in " + mName + (S.items.some(inMonth) ? " with these filters." : ".") + "</p>") +
    (enq.length ? sec("Enquiries with no date yet", enq.map(rowHtml).join("")) : "") + (bk.length ? sec("Bookings with no date yet", bk.map(rowHtml).join("")) : "");
}

/* ---------- enquiry status picker ---------- */
const OPTS = [
  ["New", "enquiry", "Nobody has replied yet"],
  ["Waiting on response", "enquiry", "We replied, waiting to hear back"],
  ["Waiting on deposit", "waiting", "They want to book. It moves to bookings and turns yellow."],
  ["Cancelled", "gone", "Hides it from the calendar. It stays in the tracker."]
];
function enquiryHead(i) {
  const when = i.date ? fmt(i.date) + (dParts(i.date).y !== +todayIso().slice(0, 4) ? " " + dParts(i.date).y : "") : i.dateText || "no date yet";
  return "<div class=\"pk-k\">Enquiry</div><h2 id=\"dlg-title\" tabindex=\"-1\">" + esc(i.name) + "</h2><p class=\"pk-e\">" + esc([i.type, i.venue, when].filter(Boolean).join(", ")) + "</p>" + (i.contact ? "<p class=\"pk-c\">" + esc(i.contact) + "</p>" : "");
}
let picked = "";                         /* the enquiry the picker is showing */
function openPicker(i) {
  picked = i.id;
  const others = i.date && S.clash.has(i.date) ? S.clash.get(i.date).filter(o => o.id !== i.id) : [];
  show("picker", enquiryHead(i) + (others.length ? "<div class=\"warn\">Clash: " + esc(listAnd(others.map(said))) + " on " + fmt(i.date) + ". With one board we can’t take " + (others.length > 1 ? "them all" : "both") + ".</div>" : "") +
    "<h3 class=\"pk-q\">Where is this enquiry up to?</h3>" + OPTS.map(o =>
    "<button class=\"opt wm-card\" type=\"button\" data-do=\"opt\" data-opt=\"" + o[0] + "\" data-fid=\"o-" + o[0] + "\" aria-pressed=\"" + (i.status === o[0]) + "\"><i class=\"dot " + o[1] + "\" aria-hidden=\"true\"></i><span class=\"tl\"><span>" + o[0] + "</span><span>" + o[2] + "</span></span>" + (i.status === o[0] ? "<span class=\"chk\" aria-hidden=\"true\">" + CHECK + "</span>" : "") + "</button>").join("") +
    "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big done\" type=\"button\" data-do=\"close\">Done</button>");
  dlg.setAttribute("aria-label", "Enquiry status");
}
/* If the data changes while the picker is open, it shows the enquiry as it now is, or closes if the enquiry has gone. */
SHEETS.picker = { sync() { const i = itemOf(picked), said_ = $("#err") ? $("#err").textContent : ""; if (!i) { hide(); return; } keepFocus(() => openPicker(i)); if (said_) $("#err").textContent = said_; } };
function askDate(i) {
  picked = i.id;
  show("date", enquiryHead(i) + "<div class=\"datestep\"><div class=\"fld\"><label for=\"edate\">When is the event?</label><input class=\"inp wm-card\" id=\"edate\" type=\"date\" min=\"" + todayIso() + "\"></div>" +
    "<button class=\"btn big\" type=\"button\" id=\"mk\" data-do=\"make\" disabled>Create the booking</button><button class=\"btn line\" type=\"button\" data-do=\"make\" data-skip>Don’t know yet</button></div>" +
    "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"linkbtn center\" type=\"button\" data-do=\"item\" data-item=\"" + i.id + "\">Back</button>");
  $("#edate").addEventListener("input", e => { $("#mk").disabled = !e.target.value; });
}
/** One tap: the calendar and the list change straight away, then it saves. */
async function setStatus(i, status, eventDate) {
  if (!i || status === i.status) return;
  if (status === "Waiting on deposit" && !i.date && eventDate === undefined) { askDate(i); return; }
  const closes = status === "Waiting on deposit" || status === "Cancelled", date = eventDate || i.date || "";
  const said_ = $("#err"); if (said_) said_.textContent = "";
  const saved = save("setEnquiryStatus", { row: i.ref.row, name: i.name, status, eventDate: eventDate || "" }, data => {
    const q = data.enquiries.find(x => x.row === i.ref.row); if (!q) return;
    q.status = status; q.what = status === "Waiting on deposit" ? "Moved to bookings" : status === "Cancelled" ? "Cancelled" : "";
    if (status === "Waiting on deposit") data.bookings.push({ row: -Date.now(), client: i.name, date, status: date ? "Waiting on deposit" : "Date needed", type: i.type, venue: i.venue, suburb: "", cancelled: "", total: 0, received: 0, owing: 0, invoice: "" });
  });
  if (closes) hide();
  const res = await saved;
  if (!res) {
    /* it didn't save: if the sheet closed for it, open it again where it was, with the reason in it (as Add a booking does) */
    const now = itemOf(i.id);
    if (closes && now && !dlg.open) {
      const said = $("#toast").textContent;
      if (eventDate !== undefined && !i.date) { askDate(now); if (eventDate) { $("#edate").value = eventDate; $("#mk").disabled = false; } } else openPicker(now);
      $("#err").textContent = said;
    }
    return;
  }
  toast(status === "Waiting on deposit" ? i.name + " is now a booking" + (res.invoice ? ", " + res.invoice : "") + ", waiting on deposit." : status === "Cancelled" ? i.name + "’s enquiry is cancelled." : i.name + ": " + status.toLowerCase() + ".");
}

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
/** values and problem are only given when a save failed, so nothing typed is lost. */
function openNew(values, problem) {
  if (!S.data) return;
  const fields = newFields(); form = { fields, values: values || {} };
  show("new", "<h2 id=\"dlg-title\" tabindex=\"-1\">add a booking</h2><p class=\"sub\">Goes into the next empty row of the tracker, with the next invoice number.</p>" +
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
  const pkg = (S.data.packages || []).find(p => p.name === out["Package"]), total = num(out["Custom price"]) || (pkg && pkg.price) || 0;
  const res = await save("addBooking", out, data => {
    data.bookings.push({ row: -Date.now(), client: out["Client name"], date: out["Event date"], status: "Waiting on deposit", type: out["Event type"] || "", venue: out["Venue"] || "", suburb: out["Suburb"] || "", cancelled: "", total, received: 0, owing: total, invoice: "" });
  });
  if (res) toast("Added " + out["Client name"] + (res.invoice ? " as " + res.invoice : "") + ".");
  else if (!dlg.open) { const said_ = $("#toast").textContent; openNew(out, said_); }
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
  "item": el => { const i = itemOf(el.dataset.item); if (i && !i.booking) openPicker(i); },
  "opt": el => setStatus(itemOf(picked), el.dataset.opt),
  "make": el => setStatus(itemOf(picked), "Waiting on deposit", el.dataset.skip != null ? "" : $("#edate").value),
  "new": () => openNew(),
  "yes": el => { const on = el.getAttribute("aria-pressed") !== "true"; el.setAttribute("aria-pressed", on); if (on) form.values[el.dataset.key] = "Yes"; else delete form.values[el.dataset.key]; }
});
