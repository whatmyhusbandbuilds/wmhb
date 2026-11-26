"use strict";
/* wmhb app: the Event day screen. One card for every event coming up: the details, what is ready, and the packing list.
   Three ready rows tick by themselves (from Money and Designs). The rest are ticked here and saved to the tracker. */

Object.assign(S, { eopen: {}, popen: {} });        /* which cards, and which packing lists, are open */
/* The packing list comes from the back end. This copy is only used if it sends none. */
const PACKING_SPARE = ["Top board", "Bottom board", "Base", "Laptop and charger", "Camera", "Monitor", "Light", "Vintage phone", "Speaker", "Cable box", "10 m extension cord", "Table message cards"];
const packingList = () => S.data.packing && S.data.packing.length ? S.data.packing : PACKING_SPARE;
const isYes = v => /^yes$/i.test(txt(v));
const packedOf = b => { const have = txt((b.eventDay || {}).packedItems).split(/\s*,\s*/).filter(Boolean); return packingList().filter(item => have.includes(item)); };

/* ---------- times: the tracker shows them its own way ("4:30 PM", "16:30"); the app shows "4:30 pm" ---------- */
/** A shown time as "16:30", for a time box. '' when it can't be read. */
function clockOf(shown) {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(a|p)?\.?m?\.?$/i.exec(txt(shown)); if (!m) return "";
  let h = +m[1]; const min = +(m[2] || 0), half = (m[3] || "").toLowerCase();
  if (half === "p" && h < 12) h += 12; if (half === "a" && h === 12) h = 0;
  return h > 23 || min > 59 ? "" : String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}
/** "16:30" as "4:30 pm". */
const sayClock = hhmm => { const p = hhmm.split(":").map(Number); return (p[0] % 12 || 12) + ":" + String(p[1]).padStart(2, "0") + (p[0] < 12 ? " am" : " pm"); };
const timeShown = shown => { const c = clockOf(shown); return c ? sayClock(c) : txt(shown); };

/* ---------- what a card shows ---------- */
const comingEvents = () => (S.data.bookings || []).filter(live).map(b => ({ b, f: moneyOf(b) })).filter(x => !x.f.done)
  .sort((a, b) => (a.f.date || "9") < (b.f.date || "9") ? -1 : (a.f.date || "9") > (b.f.date || "9") ? 1 : a.b.row - b.b.row);
function daysAway(iso) {
  if (!iso) return "No date yet";
  const n = Math.round((ms(iso) - ms(todayIso())) / DAY);
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 ? fmt(iso) : "In " + n + " days";
}
/* The seven ticks: Aadil ticks and unticks every one himself (26 Nov 2026), and the app ticks none by itself.
   Each is [the tracker column it is kept in, the tab's name in the app's data, the app's name for it]. */
const TICKS = {
  fee: ["Fee paid in full", "eventDay", "feePaid"], bond: ["Bond paid", "eventDay", "bondPaid"], design: ["Board design approved", "eventDay", "designApproved"],
  sticker: ["Sticker printed", "designs", "stickerPrinted"], venue: ["Venue confirmed", "eventDay", "venueConfirmed"],
  start: ["Start time set", "eventDay", "startSet"], power: ["Power sorted", "eventDay", "powerSorted"]
};
/* The words of the top three go where that thing is changed. */
const GO_TO = { fee: "log a payment", bond: "log the bond", design: "see the styles picked" };
/** The seven things to have ready, in order, each ticked or not as Aadil left it. */
function readyOf(x) {
  const b = x.b, f = x.f;
  return Object.keys(TICKS).map(key => {
    const t = TICKS[key];
    return { key, label: t[0], from: key === "bond" && f.bond === "none" ? "No bond needed" : "", done: isYes((b[t[1]] || {})[t[2]]) };
  });
}
/** The details list. set = one of the three rows that can be set here. A value of '' shows as "Not set yet". */
function detailsOf(b) {
  const e = b.eventDay || {}, hours = num(e.hours);
  const power = isYes(b.noPowerPoint) ? ["No power point. Bring the power station.", true] : isYes(e.powerSorted) ? ["Power point at the venue", true] : ["Not checked yet. Needs a power point within 10 m.", false];
  return [
    { label: "Where", value: [txt(b.venue), txt(b.suburb)].filter(Boolean).join(", ") },
    { label: "Arrive", value: timeShown(e.setupTime), set: "arrive" },
    { label: "Start", value: timeShown(e.startTime), set: "start" },
    { label: "How long", value: hours ? hours + " hour" + (hours === 1 ? "" : "s") + (num(b.hostHours) > 0 ? ", with a host" : "") : txt(e.hours) },
    { label: "Power", value: power[0], dim: !power[1] },
    { label: "Running it", value: txt(e.runningIt), set: "who" },
    { label: "Contact", value: txt(b.phone) || (txt(b.insta) ? "Instagram" : txt(b.email) ? "Email" : "") }
  ];
}
/** The event type as this screen says it. A corporate event reads "Corporate", as the calendar's four event types do, so the line stays short. */
const typeShown = b => { const kind = kindOfType(b.type); return kind && kind.names.includes("Corporate") ? "Corporate" : txt(b.type); };
/** "Birthday, Sat 12 Dec, INV-0003". Each part stays whole, so a line never breaks in the middle of a date or an invoice number. */
const eventLine = x => [typeShown(x.b), x.f.date ? dayOf(x.f.date) : "", txt(x.b.invoice)].filter(Boolean).map(part => "<span class=\"nw\">" + esc(part) + "</span>").join(", ");
const leftToSort = n => n === 0 ? "All sorted" : n + " thing" + (n === 1 ? "" : "s") + " to sort";

/* ---------- the screen ---------- */
SCREENS.eventday = {
  head: "h8", narrow: true,
  html: () => "<p class=\"lede\" data-screen=\"eventday\">Every event coming up. Tap one to open its details.</p><div class=\"ecards\" id=\"e-cards\"></div>",
  fill() { drawEvents(); }
};
const box = done => "<span class=\"box\" aria-hidden=\"true\">" + (done ? "<span class=\"ck\">" + CHECK + "</span>" : "") + "</span>";
function detailRows(b) {
  return detailsOf(b).map(d => {
    const inner = "<span class=\"l\">" + d.label + "</span><span class=\"v" + (!d.value || d.dim ? " unset" : "") + "\">" + esc(d.value || "Not set yet") + "</span>";
    return d.set ? "<button class=\"drow\" type=\"button\" data-do=\"ev-set\" data-what=\"" + d.set + "\" data-row=\"" + b.row + "\" data-fid=\"es-" + d.set + "-" + b.row + "\" aria-haspopup=\"dialog\">" + inner + "<span class=\"chg\">" + (d.value ? "Change" : "Set") + "</span></button>"
      : "<div class=\"drow\">" + inner + "</div>";
  }).join("");
}
function eventCard(x) {
  const b = x.b, row = b.row, open = !!S.eopen[row], packOpen = !!S.popen[row], ready = readyOf(x), done = ready.filter(r => r.done).length, packed = packedOf(b);
  return "<div class=\"ecard wm-card\" data-ecard=\"" + row + "\"><button class=\"ehead\" type=\"button\" data-do=\"ev-open\" data-row=\"" + row + "\" data-fid=\"eh-" + row + "\" aria-expanded=\"" + open + "\">" +
    "<span class=\"top\"><span><span class=\"n\">" + esc(b.client) + "</span><span class=\"s\">" + eventLine(x) + "</span></span><span class=\"in\">" + daysAway(x.f.date) + "</span>" + PLUS + "</span>" +
    "<span class=\"bars\" role=\"img\" aria-label=\"" + done + " of " + ready.length + " ready\">" + ready.map(r => "<i" + (r.done ? " class=\"on\"" : "") + "></i>").join("") + "</span><span class=\"cnt\">" + done + " of " + ready.length + " ready</span></button>" +
    "<div class=\"coll" + (open ? " open" : "") + "\" id=\"ev-" + row + "\"><div><div class=\"ebody\">" +
    "<div class=\"shead\"><h3>The details</h3></div><div class=\"drows\">" + detailRows(b) + "</div>" +
    "<div class=\"shead\"><h3>Ready?</h3><span class=\"left\">" + leftToSort(ready.length - done) + "</span></div><div class=\"rrows\">" + ready.map(r => readyRow(r, row)).join("") + "</div>" +
    "<button class=\"phead\" type=\"button\" data-do=\"ev-pack\" data-row=\"" + row + "\" data-fid=\"ep-" + row + "\" aria-expanded=\"" + packOpen + "\"><span><span>Packing list</span><span class=\"pcnt\">" + packed.length + " of " + packingList().length + " packed</span></span><span class=\"plus sm\" aria-hidden=\"true\"><i></i><i class=\"v\"></i></span></button>" +
    "<div class=\"coll" + (packOpen ? " open" : "") + "\" id=\"ep-" + row + "\"><div><div class=\"prows\">" + packingList().map((item, n) =>
      "<button class=\"rrow" + (packed.includes(item) ? " on" : "") + "\" type=\"button\" data-do=\"ev-item\" data-item=\"" + n + "\" data-row=\"" + row + "\" data-fid=\"ei-" + n + "-" + row + "\" aria-pressed=\"" + packed.includes(item) + "\">" + box(packed.includes(item)) + "<span class=\"lab\">" + esc(item) + "</span></button>").join("") + "</div></div></div>" +
    "</div></div></div></div>";
}
/**
 * One of the seven: red until it is ticked, then green, swept across from its box (as a tick on the Designs wheel).
 * The top three: the box ticks it, and the words go where that thing is changed. The rest: the whole row ticks it.
 */
function readyRow(r, row) {
  const at = " data-key=\"" + r.key + "\" data-row=\"" + row + "\"", from = r.from ? "<span class=\"from\">" + r.from + "</span>" : "", sweep = "<span class=\"rsweep\" aria-hidden=\"true\"></span>";
  if (GO_TO[r.key]) return "<div class=\"rrow rbox" + (r.done ? " on" : "") + "\"" + at + ">" + sweep +
    "<button class=\"rtick\" type=\"button\" data-do=\"ev-tick\"" + at + " data-fid=\"et-" + r.key + "-" + row + "\" aria-pressed=\"" + r.done + "\" aria-label=\"" + r.label + "\">" + box(r.done) + "</button>" +
    "<button class=\"rgo\" type=\"button\" data-do=\"ev-go\"" + at + " data-fid=\"eg-" + r.key + "-" + row + "\" aria-label=\"" + r.label + ": " + GO_TO[r.key] + "\"><span class=\"lab\">" + r.label + "</span>" + from + "</button></div>";
  return "<button class=\"rrow rbox" + (r.done ? " on" : "") + "\" type=\"button\" data-do=\"ev-tick\"" + at + " data-fid=\"et-" + r.key + "-" + row + "\" aria-pressed=\"" + r.done + "\">" + sweep + box(r.done) + "<span class=\"lab\">" + r.label + "</span>" + from + "</button>";
}
/** A tick row that is already on screen: turns it on or off in place, so only a new tick pops in. */
function setRow(el, done) {
  if (el.classList.contains("on") === done) return;
  el.classList.toggle("on", done);
  const tick = el.hasAttribute("aria-pressed") ? el : $("[aria-pressed]", el); if (tick) tick.setAttribute("aria-pressed", done);
  $(".box", el).innerHTML = done ? "<span class=\"ck\">" + CHECK + "</span>" : "";
}
function drawEvents() {
  const host = $("#e-cards"); if (!host) return;
  const list = comingEvents(), key = list.map(x => x.b.row).join(",") + "|" + packingList().length;
  if (host.dataset.key !== key) {          /* the first time, or the events themselves have changed: draw the cards */
    host.dataset.key = key;
    host.innerHTML = list.map(eventCard).join("") || "<p class=\"empty\">No events coming up.</p>";
    return;
  }
  list.forEach(x => {                        /* otherwise bring each card up to date where it stands */
    const b = x.b, card = $("[data-ecard=\"" + b.row + "\"]", host), ready = readyOf(x), done = ready.filter(r => r.done).length, packed = packedOf(b);
    $(".n", card).textContent = b.client; $(".s", card).innerHTML = eventLine(x); $(".in", card).textContent = daysAway(x.f.date);
    $$(".bars i", card).forEach((bar, n) => bar.classList.toggle("on", ready[n].done));
    $(".bars", card).setAttribute("aria-label", done + " of " + ready.length + " ready"); $(".cnt", card).textContent = done + " of " + ready.length + " ready";
    $(".drows", card).innerHTML = detailRows(b);
    $(".left", card).textContent = leftToSort(ready.length - done);
    ready.forEach(r => { const el = $(".rrows [data-key=" + r.key + "]", card); setRow(el, r.done); const from = $(".from", el); if (from) from.textContent = r.from; });
    $(".pcnt", card).textContent = packed.length + " of " + packingList().length + " packed";
    $$(".prows .rrow", card).forEach((el, n) => setRow(el, packed.includes(packingList()[n])));
  });
}

/* ---------- saving ---------- */
const eventAt = row => (S.data.bookings || []).find(b => b.row === row);
/** Saves one Event day detail or tick. where = "eventDay" or "designs", name = the app's name for it, shown = how it reads on screen. */
function setEventField(row, field, where, name, value, shown) {
  const b = eventAt(row); if (!b) return;
  saveLatest("ev" + row + field, "setEventDay", { row, id: b.id, field, value }, shown,
    () => { const now = eventAt(row); return now ? txt((now[where] || {})[name]) : ""; },
    v => { const now = eventAt(row); if (now) { now[where] = now[where] || {}; now[where][name] = v; } });
}

/* ---------- the small sheets: arrive time, start time, who is running it (not designed yet: plain, like the Money sheets) ---------- */
const SETS = {
  arrive: { title: "arrive time", ask: "When do you arrive to set up?", field: "Setup time", name: "setupTime", time: true },
  start: { title: "start time", ask: "When does the event start?", field: "Start time", name: "startTime", time: true },
  who: { title: "who is running it", ask: "Who is running it", field: "Who is running it", name: "runningIt" }
};
const RUNNERS = ["Aadil", "Sara", "Aadil and Sara"];
let setting = null;
function openEventSet(row, what) {
  const b = eventAt(row), s = SETS[what]; if (!b || !s) return;
  const now = txt((b.eventDay || {})[s.name]);
  setting = { row, what };
  show("evset", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + s.title + "</h2><p class=\"sub\">" + esc([b.client, moneyOf(b).date ? dayOf(moneyOf(b).date) : ""].filter(Boolean).join(", ")) + "</p>" +
    "<form id=\"evfrm\" novalidate>" + (s.time ? "" : "<h3 class=\"sh mid\">Usual ones</h3><div class=\"chips\">" + RUNNERS.map(r => "<button class=\"chip\" type=\"button\" data-do=\"ev-runner\" data-value=\"" + r + "\" aria-pressed=\"" + (now === r) + "\">" + r + "</button>").join("") + "</div>") +
    "<div class=\"fld\" style=\"margin-top:14px\"><label for=\"ev-value\">" + s.ask + "</label><input class=\"inp wm-card\" id=\"ev-value\" " + (s.time ? "type=\"time\" value=\"" + clockOf(now) + "\"" : "type=\"text\" autocomplete=\"off\" value=\"" + esc(now) + "\"") + "></div>" +
    "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big save\" type=\"submit\">Save</button></form>" +
    (now ? "<button class=\"btn line cancel\" type=\"button\" data-do=\"ev-clear\">" + (s.time ? "Clear the time" : "Clear the name") + "</button>" : "") +
    "<button class=\"btn line cancel\" type=\"button\" data-do=\"close\">Cancel</button>");
  dlg.setAttribute("aria-label", s.ask);
}
function saveEventSet(value) {
  const s = SETS[setting.what], row = setting.row;
  hide();
  setEventField(row, s.field, "eventDay", s.name, value, s.time && value ? sayClock(value) : value);
}
dlg.addEventListener("submit", e => {
  if (sheetKind !== "evset") return;
  e.preventDefault();
  saveEventSet($("#ev-value").value.trim());
});

/* ---------- taps ---------- */
const openClose = (el, box, open) => { el.setAttribute("aria-expanded", open); box.classList.toggle("open", open); };
Object.assign(TAPS, {
  "ev-open": el => { const row = +el.dataset.row; openClose(el, $("#ev-" + row), S.eopen[row] = !S.eopen[row]); },
  "ev-pack": el => { const row = +el.dataset.row; openClose(el, $("#ep-" + row), S.popen[row] = !S.popen[row]); },
  "ev-tick": el => { const t = TICKS[el.dataset.key], on = el.getAttribute("aria-pressed") !== "true"; setEventField(+el.dataset.row, t[0], t[1], t[2], on ? "Yes" : "", on ? "Yes" : ""); },
  "ev-item": el => {
    const row = +el.dataset.row, b = eventAt(row); if (!b) return;
    const item = packingList()[+el.dataset.item], had = packedOf(b), items = packingList().filter(i => i === item ? !had.includes(i) : had.includes(i));
    saveLatest("pack" + row, "setPacking", { row, id: b.id, items }, items,
      () => { const now = eventAt(row); return now ? packedOf(now) : []; },
      list => { const now = eventAt(row); if (now) { now.eventDay = now.eventDay || {}; now.eventDay.packedItems = list.join(", "); now.eventDay.packed = list.length === packingList().length ? "Yes" : ""; } });
  },
  /* Event day stays on Event day: the payment sheet, or the styles picked, open on top of it, and closing them leaves the
     same card open at the same place */
  "ev-go": el => {
    const row = +el.dataset.row;
    if (el.dataset.key === "design") openDesignPeek(row); else openClient(row);
  },
  "ev-set": el => openEventSet(+el.dataset.row, el.dataset.what),
  "ev-runner": el => { $("#ev-value").value = el.dataset.value; $$(".chip", dlg).forEach(c => c.setAttribute("aria-pressed", c === el)); },
  "ev-clear": () => saveEventSet("")
});
