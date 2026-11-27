"use strict";
/* wmhb app: the client sheet. Every change for a client is made here (Aadil's workflow of 27 Nov 2026), and it opens the
   same way from everywhere: the Clients calendar and list, a Money card, the bonds list and Event day.
   It holds the name and the event, how they got in touch, the status, the money (log a payment, the bond, the history),
   the contact details and links to Event day and Designs. An enquiry has a Keen button instead of money.
   Every change shows a message with Undo for about 8 seconds. A payment or an expense is never deleted: it is marked
   removed in the tracker, keeps its line in History, and counts for nothing. */

let sheetFor = "", sheetPart = "", withBond = false, asking = "";   /* who the sheet is for ("b12" or "q5"), the one part shown, the bond tick, the History row asking to be removed */
const bookingAt = row => (S.data.bookings || []).find(b => b.row === row);
const enquiryAt = row => (S.data.enquiries || []).find(q => q.row === row);
const whoOf = id => !S.data || !id ? null : id[0] === "b" ? bookingAt(+id.slice(1)) : enquiryAt(+id.slice(1));
const BOOKING_KEYS = [["Waiting on deposit", "Waiting on deposit"], ["Booked", "Booked"], ["Completed", "Done"], ["Cancelled", "Cancelled"]];
const ENQUIRY_KEYS = [["New", "New"], ["Waiting on response", "Waiting on response"], ["Waiting on deposit", "Waiting on deposit"], ["Cancelled", "Cancelled"]];
const WHAT = { "Hire": "Payment", "Bond in": "Bond in", "Bond back": "Bond back" };
const dayMon = iso => iso ? dParts(iso).d + " " + dParts(iso).mo : "";
/** "Bond in, $250, 18 Nov": one line of History, as it reads in a question or a message. */
const entryWords = p => (WHAT[p.what] || p.what) + ", " + money(num(p.amount)) + (p.date ? ", " + dayMon(p.date) : "");

/* ---------- the sheet ---------- */
const openClient = (row, part) => openSheet("b" + row, part);
/**
 * Opens the client sheet. part = only one part of it, ready to use (a quick button on a swiped row):
 * "pay" (log a payment), "deposit" (the deposit, filled in), "bond", or "status".
 */
function openSheet(id, part, keep) {
  const x = whoOf(id); if (!x) { hide(); return; }
  if (sheetFor !== id) withBond = false;
  if (sheetFor !== id || !keep) asking = "";                 /* a Remove asking to be confirmed is forgotten once the sheet is opened afresh */
  sheetFor = id; sheetPart = part || "";
  const booking = id[0] === "b", typed = keep && $("#other", dlg) ? $("#other", dlg).value : "", said_ = keep && $("#err", dlg) ? $("#err", dlg).textContent : "";
  const head = booking ? bookingHead(x) : enquiryHeadOf(x);
  const parts = booking ? { status: statusPart(x, true), pay: payPart(x, typed, part === "deposit"), bond: bondPart(x), history: historyPart(x), contact: contactPart(x, false), links: linksPart(x) }
    : { status: statusPart(x, false), contact: contactPart(x, true), keen: keenPart(x) };
  const shown = part === "deposit" ? ["pay"] : part ? [part] : Object.keys(parts);
  show("client", head + shown.map(k => parts[k] || "").join("") +
    "<p class=\"err\" id=\"err\" role=\"alert\">" + esc(said_) + "</p><button class=\"btn big done\" type=\"button\" data-do=\"close\">Done</button>");
  dlg.setAttribute("aria-label", booking ? "Client" : "Enquiry");
  if ((part === "pay" || part === "deposit") && !keep) { const box = $("#other", dlg); if (box) box.focus({ preventScroll: true }); }
}
SHEETS.client = { sync() { if (!whoOf(sheetFor)) { hide(); return; } keepFocus(() => openSheet(sheetFor, sheetPart, true)); } };

function bookingHead(b) {
  const f = moneyOf(b), where = [txt(b.venue), txt(b.suburb)].filter(Boolean).join(", ");
  return "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(b.client) + "</h2>" +
    "<p class=\"sub\">" + [txt(b.type), f.date ? dayOf(f.date) : "No date yet", where].filter(Boolean).map(p => "<span class=\"nw\">" + esc(p) + "</span>").join(", ") + (txt(b.invoice) ? " <span class=\"csinv\">" + esc(b.invoice) + "</span>" : "") + "</p>" +
    "<div class=\"cstag\">" + sourceTag(sourceOf(b, false), "b" + b.row) + "</div>";
}
function enquiryHeadOf(q) {
  const date = parseLoose(q.date), when = date ? dayOf(date) : txt(q.date) || "no date yet", venue = ((/venue:\s*([^\n]+)/i.exec(txt(q.message)) || [])[1] || "").trim();
  const others = date && S.clash.has(date) ? S.clash.get(date).filter(o => o.id !== "q" + q.row) : [];
  return "<div class=\"pk-k\">Enquiry</div><h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(q.name) + "</h2><p class=\"sub\">" + esc([txt(q.type), venue, when].filter(Boolean).join(", ")) + "</p>" +
    "<div class=\"cstag\">" + sourceTag(sourceOf(q, true), "q" + q.row) + "</div>" +
    (others.length ? "<div class=\"warn\">Clash: " + esc(listAnd(others.map(said))) + " on " + fmt(date) + ". With one board we can’t take " + (others.length > 1 ? "them all" : "both") + ".</div>" : "");
}
/** The status, as a row of keys. Tapping one saves it. */
function statusPart(x, booking) {
  const keys = booking ? BOOKING_KEYS : ENQUIRY_KEYS, now = booking ? txt(x.status) : txt(x.status) || "New";
  return "<h3 class=\"sh\">Status</h3><div class=\"cskeys wm-track\" role=\"group\" aria-label=\"Status\">" + keys.map(k =>
    "<button class=\"wm-seg\" type=\"button\" data-do=\"cs-status\" data-status=\"" + k[0] + "\" data-fid=\"st-" + k[0] + "\" aria-pressed=\"" + (now === k[0]) + "\">" + esc(k[1]) + "</button>").join("") + "</div>" +
    (booking && now === "Date needed" ? "<p class=\"none\">No event date yet, so the tracker says “Date needed”.</p>" : "");
}
function payPart(b, typed, deposit) {
  const f = moneyOf(b), bond = f.bondAmount, canBond = f.bond === "due" && bond > 0;
  if (!canBond) withBond = false;
  const fill = typed || (deposit && f.next && f.next.amount ? String(f.next.amount) : "");
  return "<h3 class=\"sh\">Money</h3><div class=\"tot\"><div><div>Total</div><div>" + money(f.total) + "</div></div><div><div>Received</div><div>" + money(f.received) + "</div></div><div><div>To pay</div><div>" + money(f.owing) + "</div></div></div>" +
    (f.owing > 0 ? "<h3 class=\"sh mid\">" + (deposit ? "Log the deposit" : "Log a payment") + "</h3>" +
      (canBond ? "<button class=\"tickf\" type=\"button\" data-do=\"pay-bond\" data-fid=\"pay-bond\" aria-pressed=\"" + withBond + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span>This payment includes the " + money(bond) + " bond</button>" : "") +
      (deposit ? "" : "<button class=\"paybtn wm-card\" type=\"button\" data-do=\"pay-rest\" data-fid=\"pay-rest\"><span>Rest of the fee received</span><span>" + money(f.owing) + "</span></button>") +
      "<div class=\"other\"><div class=\"fld\"><label for=\"other\">" + (deposit ? "Deposit received ($)" : "Another amount ($)") + "</label><input class=\"inp wm-card\" id=\"other\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"any\" data-fid=\"other\" value=\"" + esc(fill) + "\"></div><button class=\"cardbtn wm-card\" type=\"button\" data-do=\"pay-other\" data-fid=\"pay-other\">Received</button></div>"
      : "<p class=\"none\">Paid in full.</p>");
}
function bondPart(b) {
  const f = moneyOf(b), st = bondState(f);
  if (f.bond === "none") return "<h3 class=\"sh\">Bond</h3><p class=\"none\">No bond needed.</p>";
  return "<h3 class=\"sh\">Bond, held apart</h3><div class=\"bondbox wm-card\"><span>" + esc(st[1]) + ".</span>" +
    (f.bond === "due" && f.bondAmount > 0 ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"bond-in\" data-fid=\"bond-in\">Bond in</button>"
      : f.bond === "held" ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"bond-back\" data-fid=\"bond-back\">Bond back</button>" : "") + "</div>";
}
/** Every payment and bond for this client, newest first. A removed one stays, greyed, with the day it was removed. */
function historyPart(b) {
  const all = (S.payAll[b.invoice] || []).slice().sort((p, q) => (p.date || "") < (q.date || "") ? 1 : (p.date || "") > (q.date || "") ? -1 : q.row - p.row);
  return "<h3 class=\"sh\">History</h3>" + (all.length ? "<div class=\"hrows\">" + all.map(p => historyRow(p, "Payments")).join("") + "</div>" : "<p class=\"none\">Nothing logged yet.</p>");
}
function historyRow(p, tab) {
  const key = tab + p.row, words = tab === "Payments" ? WHAT[p.what] || p.what : p.what;
  if (asking === key) return "<div class=\"hrow ask\" data-hrow=\"" + key + "\"><span class=\"hq\">Remove " + esc(tab === "Payments" ? entryWords(p) : p.what + ", " + money(num(p.amount)) + (p.date ? ", " + dayMon(p.date) : "")) + "?</span>" +
    "<span class=\"ha\"><button class=\"cardbtn wm-card hyes\" type=\"button\" data-do=\"h-yes\" data-key=\"" + key + "\" data-fid=\"hy-" + key + "\">Remove</button><button class=\"linkbtn\" type=\"button\" data-do=\"h-no\" data-fid=\"hn-" + key + "\">Keep</button></span></div>";
  return "<div class=\"hrow" + (p.removed ? " gone" : "") + "\" data-hrow=\"" + key + "\"><span class=\"hd\">" + esc(dayMon(p.date)) + "</span><span class=\"hw\">" + esc(words) + (tab === "Expenses" && txt(p.type) ? "<small>" + esc(p.type) + "</small>" : "") + "</span><span class=\"hv\">" + money(num(p.amount)) + "</span>" +
    (p.removed ? "<span class=\"hgone\">Removed " + esc(dayMon(p.removed)) + "</span>"
      : p.row > 0 ? "<button class=\"linkbtn hx\" type=\"button\" data-do=\"h-remove\" data-key=\"" + key + "\" data-fid=\"hx-" + key + "\" aria-label=\"Remove " + esc(words + ", " + money(num(p.amount)) + (p.date ? ", " + dayMon(p.date) : "")) + "\">Remove</button>" : "<span class=\"hgone\">Saving…</span>") + "</div>";
}
function contactPart(x, enquiry) {
  const rows = contactRows(x, enquiry);
  return "<h3 class=\"sh\">Contact</h3>" + (rows.length ? "<div class=\"crows\">" + contactHtml(rows) + "</div>" : "<p class=\"none\">No contact details yet.</p>");
}
function linksPart(b) {
  const onEventDay = live(b) && !moneyOf(b).done;
  return "<div class=\"cslinks\">" + (onEventDay ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"cs-event\" data-row=\"" + b.row + "\" data-fid=\"cs-event\">Event day details</button>" : "") +
    "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"cs-designs\" data-row=\"" + b.row + "\" data-fid=\"cs-designs\">Designs</button></div>";
}
function keenPart(q) {
  return "<button class=\"k k-gold wide mt16\" type=\"button\" data-do=\"cs-keen\" data-who=\"q" + q.row + "\" data-fid=\"cs-keen\">Keen</button><p class=\"dnote center\">Opens Add a booking, filled in from the enquiry.</p>";
}

/* ---------- changes, each with Undo ---------- */
/** Logs payments for one booking (Hire, Bond in or Bond back): they show at once, then go in as rows on Payments, dated today. */
async function logPayments(b, items, done) {
  const slot = $("#err", dlg); if (slot) slot.textContent = "";
  const res = await save("addPayment", { invoice: b.invoice, payments: items }, data => {
    items.forEach((p, i) => data.payments.push({ row: -(Date.now() + i), date: todayIso(), invoice: b.invoice, client: b.client, amount: p.amount, what: p.what, note: "", removed: "" }));
    recount(data, b.invoice);
  });
  if (!res) return;
  const entries = (res.rows || []).map((row, i) => ({ tab: "Payments", row, amount: items[i].amount, invoice: b.invoice, what: items[i].what }));
  toast(done, entries.length ? () => removeEntries(entries, "Undone: " + listAnd(items.map(p => (WHAT[p.what] || p.what).toLowerCase() + " " + money(p.amount))) + " taken off.") : null);
}
function payHire(amount) {
  const b = whoOf(sheetFor); if (!b || sheetFor[0] !== "b") return;
  const f = moneyOf(b), items = [{ what: "Hire", amount }], bond = withBond && f.bond === "due" ? f.bondAmount : 0;
  if (bond) items.push({ what: "Bond in", amount: bond });
  withBond = false;
  logPayments(b, items, "Payment in, " + money(amount) + (bond ? ", and the " + money(bond) + " bond," : ",") + " logged.");
}
/**
 * Marks rows removed (or, restore, back again): Undo after a payment or an expense, and Remove in History.
 * entries = [{tab, row, amount, invoice, what}]. done = the message once it is saved. undo = Undo for that message.
 */
async function removeEntries(entries, done, restore, undo) {
  const slot = $("#err", dlg); if (slot) slot.textContent = "";
  const res = await save("removeEntries", { entries, restore: !!restore }, data => {
    entries.forEach(e => { const x = (e.tab === "Payments" ? data.payments : data.expenses).find(r => r.row === e.row); if (x) x.removed = restore ? "" : todayIso(); });
    entries.forEach(e => { if (e.invoice) recount(data, e.invoice); });
    data.reports = null;
  });
  if (res) toast(done, undo || null);
  return !!res;
}
/** History's Remove, once it is confirmed. Undo puts the row back. */
function removeLine(key) {
  const tab = key.indexOf("Payments") === 0 ? "Payments" : "Expenses", row = +key.slice(tab.length);
  const p = (tab === "Payments" ? S.data.payments : S.data.expenses).find(r => r.row === row); asking = "";
  if (!p) return;
  const entry = { tab, row, amount: p.amount, invoice: p.invoice || "", what: p.what }, words = tab === "Payments" ? entryWords(p) : p.what + ", " + money(num(p.amount));
  removeEntries([entry], "Removed: " + words + ".", false, () => removeEntries([entry], "Put back: " + words + ".", true));
}
/** A booking's status by hand. Undo puts back exactly what the tracker held before. */
async function setBookingStatus(b, status) {
  if (txt(b.status) === status) return;
  const row = b.row, id = b.id, name = b.client, before = { byHand: txt(b.statusByHand), cancelled: txt(b.cancelled) };
  const res = await save("setBookingStatus", { row, id, status }, data => {
    const m = data.bookings.find(x => x.row === row); if (!m) return;
    if (status === "Cancelled") { m.cancelled = "Yes"; m.statusByHand = ""; } else { m.cancelled = ""; m.statusByHand = status; }
    recount(data, m.invoice);
  });
  if (!res) return;
  const was = res.before || before;
  toast(name + ": " + (status === "Completed" ? "done" : status.toLowerCase()) + ".", async () => {
    const back = await save("setBookingStatus", { row, id, restore: was }, data => { const m = data.bookings.find(x => x.row === row); if (m) { m.statusByHand = was.byHand; m.cancelled = was.cancelled; recount(data, m.invoice); } });
    if (back) toast(name + ": status put back.");
  });
}

/* ---------- how they got in touch: change it ---------- */
let srcFor = "", srcPick = "", srcBack = "";
const HANDLE_HINT = { "Instagram": "@their handle", "Messenger": "Their name on Messenger", "WhatsApp": "Their number", "TikTok": "@their handle", "Text or call": "Their number", "Email": "Their email", "Website form": "How to reach them" };
function openSource(id) {
  const x = whoOf(id); if (!x) return;
  const now = sourceOf(x, id[0] === "q");
  srcBack = sheetKind === "client" && sheetFor === id ? id : "";
  srcFor = id; srcPick = now.source;
  show("source", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">how they got in touch</h2><p class=\"sub\">" + esc(id[0] === "b" ? x.client : x.name) + "</p>" +
    "<div class=\"srcs\" role=\"group\" aria-label=\"How they got in touch\">" + SOURCES.map(n => "<button class=\"chip srcchip\" type=\"button\" data-do=\"src-pick\" data-src=\"" + esc(n) + "\" aria-pressed=\"" + (srcPick === n) + "\">" + sourceIcon(n, 18) + "<span>" + esc(n) + "</span></button>").join("") + "</div>" +
    "<div class=\"fld\" style=\"margin-top:14px\"><label for=\"src-handle\">Handle or number, if you have it</label><input class=\"inp wm-card\" id=\"src-handle\" type=\"text\" autocomplete=\"off\" maxlength=\"80\" placeholder=\"" + esc(HANDLE_HINT[srcPick] || "") + "\" value=\"" + esc(now.handle) + "\"></div>" +
    "<p class=\"err\" id=\"err\" role=\"alert\"></p><button class=\"btn big save\" type=\"button\" data-do=\"src-save\" data-fid=\"src-save\">Save</button>" +
    "<button class=\"btn line cancel\" type=\"button\" data-do=\"src-back\">" + (srcBack ? "Back" : "Cancel") + "</button>");
  dlg.setAttribute("aria-label", "How they got in touch");
}
async function saveSource() {
  const id = srcFor, x = whoOf(id); if (!x) return;
  if (!srcPick) { $("#err", dlg).textContent = "Pick how they got in touch."; return; }
  const handle = $("#src-handle", dlg).value.trim(), enquiry = id[0] === "q", was = sourceOf(x, enquiry), stored = { source: txt(x.gotInTouch), handle: txt(x.handle) };
  const arg = enquiry ? { kind: "enquiry", row: x.row, name: x.name } : { kind: "booking", row: x.row, id: x.id };
  const set = v => data => { const y = (enquiry ? data.enquiries : data.bookings).find(r => r.row === x.row); if (y) { y.gotInTouch = v.source; y.handle = v.handle; } };
  if (srcBack) openSheet(srcBack); else hide();
  const pick = srcPick, res = await save("setContact", Object.assign({ source: pick, handle }, arg), set({ source: pick, handle }));
  if (!res) return;
  toast("Got in touch by " + pick + (handle ? ", " + handle : "") + ".", async () => {
    const back = await save("setContact", Object.assign({ source: stored.source, handle: stored.handle }, arg), set(stored));
    if (back) toast("Put back: " + (was.source || "not set") + ".");
  });
}

/* ---------- Keen: the Add a booking form, filled in from the enquiry (stage 7 adds the booking email to it later) ---------- */
const FORM_KINDS = { "Engagement": "Engagement party", "Corporate": "Brand / corporate", "Market": "Market / fair", "Something else": "Other celebration" };
function keen(q) {
  const L = S.data.lists || {}, src = sourceOf(q, true), date = parseLoose(q.date), type = FORM_KINDS[txt(q.type)] || txt(q.type);
  const venue = ((/venue:\s*([^\n]+)/i.exec(txt(q.message)) || [])[1] || "").trim(), message = txt(q.message);
  const values = { "Client name": q.name };
  if (date) values["Event date"] = date;
  if ((L["Event type"] || []).includes(type)) values["Event type"] = type;
  if (venue) values["Venue"] = venue;
  if (src.source === "Text or call" || src.source === "WhatsApp") values["Phone"] = src.handle;
  if (src.source === "Email") values["Email"] = src.handle;
  if (src.source === "Instagram") values["Instagram"] = src.handle;
  if (src.source) values["Got in touch by"] = src.source;          /* not boxes on the form: they go with it, so the source carries over */
  if (src.handle) values["Handle or number"] = src.handle;
  values["Notes"] = ["From the enquiry" + (q.received ? " of " + dayOf(q.received) : "") + ".", !date && txt(q.date) ? "Wants: " + txt(q.date) + "." : "", message].filter(Boolean).join(" ");
  openNew(values, "", { row: q.row, name: q.name });
}

/* ---------- taps ---------- */
Object.assign(TAPS, {
  "client": el => openClient(+el.dataset.row),
  "cs-status": el => {
    const x = whoOf(sheetFor); if (!x) return;
    if (sheetFor[0] === "b") setBookingStatus(x, el.dataset.status); else setEnquiryStatus(x, el.dataset.status);
  },
  "pay-bond": el => { withBond = !withBond; el.setAttribute("aria-pressed", withBond); },
  "pay-rest": () => { const b = whoOf(sheetFor); if (b && sheetFor[0] === "b") payHire(moneyOf(b).owing); },
  "pay-other": () => {
    const b = whoOf(sheetFor); if (!b || sheetFor[0] !== "b") return;
    const amount = Math.round(num($("#other", dlg).value) * 100) / 100, owing = moneyOf(b).owing;
    if (!(amount > 0)) { $("#err", dlg).textContent = "Type the amount that came in."; return; }
    if (amount > owing) { $("#err", dlg).textContent = "That’s more than the " + money(owing) + " still to pay."; return; }
    $("#other", dlg).value = ""; payHire(amount);
  },
  "bond-in": () => { const b = whoOf(sheetFor); if (b && sheetFor[0] === "b") { const a = moneyOf(b).bondAmount; logPayments(b, [{ what: "Bond in", amount: a }], "Bond in, " + money(a) + ", logged."); } },
  "bond-back": () => { const b = whoOf(sheetFor); if (b && sheetFor[0] === "b") { const a = moneyOf(b).bondHeld; logPayments(b, [{ what: "Bond back", amount: a }], "Bond back, " + money(a) + ", logged."); } },
  "h-remove": el => { asking = el.dataset.key; SHEETS.client.sync(); const yes = $("[data-do=h-yes]", dlg); if (yes) yes.focus(); },
  "h-no": () => { const key = asking; asking = ""; SHEETS.client.sync(); const back = $("[data-fid=\"hx-" + key + "\"]", dlg); if (back) back.focus(); },
  "h-yes": el => removeLine(el.dataset.key),
  "src-open": el => openSource(el.dataset.who),
  "src-pick": el => { srcPick = el.dataset.src; $$(".srcchip", dlg).forEach(c => c.setAttribute("aria-pressed", c === el)); $("#src-handle", dlg).placeholder = HANDLE_HINT[srcPick] || ""; },
  "src-save": () => saveSource(),
  "src-back": () => { if (srcBack) openSheet(srcBack); else hide(); },
  "cs-keen": el => { const q = whoOf(el.dataset.who); if (q) keen(q); },
  "cs-event": el => {                                  /* that client's card on Event day, open */
    const row = +el.dataset.row; hide(); S.eopen[row] = true; go("eventday");
    const card = $("[data-ecard=\"" + row + "\"]"); if (card) { card.scrollIntoView({ block: "start" }); $(".ehead", card).focus({ preventScroll: true }); }
  },
  "cs-designs": el => { hide(); TAPS["dz-client"]({ dataset: { row: el.dataset.row } }); },
  /* the quick buttons behind a swiped row on the Clients list */
  "q-pay": el => openSheet(el.dataset.who, "pay"),
  "q-deposit": el => openSheet(el.dataset.who, "deposit"),
  "q-bond": el => openSheet(el.dataset.who, "bond"),
  "q-status": el => openSheet(el.dataset.who, "status"),
  "q-more": el => openSheet(el.dataset.who),
  "q-keen": el => { const q = whoOf(el.dataset.who); if (q) keen(q); }
});
