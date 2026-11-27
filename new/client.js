"use strict";
/* wmhb app: the client sheet. Every change for a client is made here (Aadil's workflow of 27 Nov 2026), and it opens the
   same way from everywhere: the Clients calendar and list, a Money card, the bonds list and Event day.
   It works like a form (version 20): a payment typed in, the bond tick, how they got in touch, a Remove in History and an
   enquiry's status are all held until Confirm, which saves them in one go. Closing it while it holds changes asks first.
   Nothing has Undo: a payment logged by mistake is removed in History. A payment is never deleted: it is marked removed in
   the tracker, keeps its line in History, and counts for nothing. */

let sheetFor = "", held = null, histOpen = false, keyNote = "", barWas = null;
const bookingAt = row => (S.data.bookings || []).find(b => b.row === row);
const enquiryAt = row => (S.data.enquiries || []).find(q => q.row === row);
const whoOf = id => !S.data || !id ? null : id[0] === "b" ? bookingAt(+id.slice(1)) : enquiryAt(+id.slice(1));
/* A booking's three status keys, left to right, in their colours. Done (paid in full, the event over) shows on its own. */
const BOOKING_KEYS = [["waiting", "Waiting on deposit"], ["deposit", "Deposit received"], ["booked", "Booked"]];
const ENQUIRY_KEYS = [["New", "New"], ["Waiting on response", "Waiting on response"], ["Waiting on deposit", "Waiting on deposit"], ["Cancelled", "Cancelled"]];
const dayMon = iso => iso ? dParts(iso).d + " " + dParts(iso).mo : "";
/**
 * What the sheet holds until Confirm. pay = the amount typed in. bond = the bond tick as it now is (null: not touched).
 * source = {source, handle} picked (null: not touched). remove = History rows to remove ("Payments12"). status = an enquiry's
 * new status. eventDate = the date asked for when an enquiry becomes a booking. refundSent = the tick (null: not touched).
 */
const freshHeld = id => ({ id, pay: "", bond: null, source: null, remove: [], status: "", eventDate: undefined, refundSent: null, saving: false });
/** What is held, as it counts now: nothing while it is being saved (the screen already shows it). */
const holding = () => held && held.id === sheetFor && !held.saving ? held : freshHeld(sheetFor);

/* ---------- the sheet ---------- */
const openClient = row => openSheet("b" + row);
/** Opens the client sheet. keep = it is only being drawn again (or came back from a smaller sheet): what it holds stays. said = what was saved. */
function openSheet(id, keep, said) {
  const x = whoOf(id); if (!x) { hide(); return; }
  if (!keep || !held || held.id !== id) { held = freshHeld(id); histOpen = false; keyNote = ""; }
  const again = sheetKind === "client" && sheetFor === id;
  const slotSaid = again && $("#said", dlg) ? $("#said", dlg).textContent : "", slotErr = again && $("#err", dlg) ? $("#err", dlg).textContent : "";
  sheetFor = id;
  const booking = id[0] === "b", f = booking ? moneyOf(x) : null;
  const body = !booking ? enquiryHeadOf(x) + statusPart(x, false) + contactPart(x, true) + keenPart(x)
    : f.cancelled ? bookingHead(x) + cancelledPart(x) + historyPart(x) + contactPart(x, false)
    : bookingHead(x) + statusPart(x, true) + payPart(x) + bondPart(x) + historyPart(x) + contactPart(x, false) + linksPart(x);
  show("client", body + sheetFoot("<button class=\"btn big confirm\" type=\"button\" data-do=\"cs-confirm\" data-fid=\"cs-confirm\"" + (held.saving ? " disabled" : "") + ">" + (held.saving ? "Saving…" : "Confirm") + "</button>", said || slotSaid, said ? "" : slotErr));
  dlg.setAttribute("aria-label", booking ? "Client" : "Enquiry");
  if (booking && !f.cancelled) growBar(id, f);
}
SHEETS.client = {
  sync() { if (!whoOf(sheetFor)) { hide(); return; } keepFocus(() => openSheet(sheetFor, true)); },
  dirty: () => !!held && held.id === sheetFor && !held.saving && changesOf(whoOf(sheetFor)).any,
  reopen() { if (whoOf(sheetFor)) openSheet(sheetFor, true); }
};

function bookingHead(b) {
  const f = moneyOf(b), where = [txt(b.venue), txt(b.suburb)].filter(Boolean).join(", "), src = holding().source || sourceOf(b, false);
  return "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(b.client) + "</h2>" +
    "<p class=\"sub\">" + [txt(b.type), f.date ? dayOf(f.date) : "No date yet", where].filter(Boolean).map(p => "<span class=\"nw\">" + esc(p) + "</span>").join(", ") + (txt(b.invoice) ? " <span class=\"csinv\">" + esc(b.invoice) + "</span>" : "") + "</p>" +
    "<div class=\"cstag\">" + sourceTag(src, "b" + b.row) + "</div>";
}
function enquiryHeadOf(q) {
  const date = parseLoose(q.date), when = date ? dayOf(date) : txt(q.date) || "no date yet", venue = ((/venue:\s*([^\n]+)/i.exec(txt(q.message)) || [])[1] || "").trim();
  const others = date && S.clash.has(date) ? S.clash.get(date).filter(o => o.id !== "q" + q.row) : [];
  const src = (sheetFor === "q" + q.row && holding().source) || sourceOf(q, true);
  return "<div class=\"pk-k\">Enquiry</div><h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(q.name) + "</h2><p class=\"sub\">" + esc([txt(q.type), venue, when].filter(Boolean).join(", ")) + "</p>" +
    "<div class=\"cstag\">" + sourceTag(src, "q" + q.row) + "</div>" +
    (others.length ? "<div class=\"warn\">Clash: " + esc(listAnd(others.map(said))) + " on " + fmt(date) + ". With one board we can’t take " + (others.length > 1 ? "them all" : "both") + ".</div>" : "");
}
/**
 * The status keys. A booking's follow its hire money, never the bond: the key it is at is lit in its colour, the others are
 * muted. Done shows on its own, in grey. An enquiry's four keys pick its status, held until Confirm.
 */
function statusPart(x, booking) {
  if (booking) {
    const f = moneyOf(x);
    if (f.stage === "done") return "<h3 class=\"sh\">Status</h3><p class=\"csdone\"><span class=\"skey st-done\">Done</span><span>Paid in full, and the event is over.</span></p>";
    return "<h3 class=\"sh\">Status</h3><div class=\"cskeys three wm-track\" role=\"group\" aria-label=\"Status\">" + BOOKING_KEYS.map(k =>
      "<button class=\"skey" + (f.stage === k[0] ? " on st-" + k[0] : "") + "\" type=\"button\" data-do=\"cs-key\" data-key=\"" + k[0] + "\" data-fid=\"st-" + k[0] + "\" aria-pressed=\"" + (f.stage === k[0]) + "\">" + esc(k[1]) + "</button>").join("") + "</div>" +
      "<p class=\"cskeynote\" id=\"keynote\" role=\"status\">" + esc(keyNote) + "</p>" +
      (!f.date ? "<p class=\"none\">No event date yet, so the tracker says “Date needed”.</p>" : "");
  }
  const now = holding().status || txt(x.status) || "New";
  return "<h3 class=\"sh\">Status</h3><div class=\"cskeys wm-track\" role=\"group\" aria-label=\"Status\">" + ENQUIRY_KEYS.map(k =>
    "<button class=\"wm-seg\" type=\"button\" data-do=\"cs-status\" data-status=\"" + k[0] + "\" data-fid=\"st-" + k[0] + "\" aria-pressed=\"" + (now === k[0]) + "\">" + esc(k[1]) + "</button>").join("") + "</div>";
}
/**
 * The money, as bar B: what is paid, big, and what is still to go; a line filled in the status colour, with a stop at the
 * deposit and one at the total that turn green with a tick once reached. While an amount is typed it shows ahead of what
 * is paid, lighter, until Confirm. Below it, one box for what came in.
 */
function payPart(b) {
  const f = moneyOf(b), h = holding();
  return barHtml_(f, typedAmount(h.pay)) +
    (f.owing > 0 ? "<div class=\"fld paybox\"><label for=\"other\">How much came in? ($)</label><input class=\"inp wm-card\" id=\"other\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"any\" data-fid=\"other\" value=\"" + esc(h.pay) + "\"" + (held.saving ? " disabled" : "") + "></div>" : "");
}
const typedAmount = v => { const n = Math.round(num(v) * 100) / 100; return n > 0 ? n : 0; };
const pct = (part, whole) => whole > 0 ? Math.max(0, Math.min(100, part / whole * 100)) : 0;
function barHtml_(f, typed) {
  const paidW = pct(f.received, f.total), newW = Math.max(paidW, pct(f.received + typed, f.total)), dep = f.deposit != null && f.deposit > 0 && f.total > 0 && f.deposit < f.total ? f.deposit : null;
  const depAt = dep == null ? 0 : pct(dep, f.total), depOn = dep != null && f.received >= dep, totOn = f.total > 0 && f.received >= f.total;
  const stop = (cls, at, on) => "<span class=\"mstop " + cls + (on ? " on" : "") + "\" style=\"left:" + at.toFixed(2) + "%\">" + (on ? "✓" : "") + "</span>";
  const said = money(f.received) + " paid of " + money(f.total) + (dep != null ? ". Deposit " + money(dep) + (depOn ? " in" : " not in yet") : "") + ". " + (totOn ? "Paid in full." : money(f.owing) + " to go.");
  return "<div class=\"mbar2 st-" + f.stage + "\">" +
    "<div class=\"mtop\"><span class=\"mpaid\">" + money(f.received) + " <span>paid</span></span><span class=\"mgo\">" + (totOn ? "Paid in full" : f.total > 0 ? money(f.owing) + " to go" : "No total yet") + "</span></div>" +
    "<div class=\"mline\" role=\"img\" aria-label=\"" + esc(said) + "\"><span class=\"mtrack\"></span><span class=\"mfill\" style=\"width:" + paidW.toFixed(2) + "%\"></span>" +
    "<span class=\"mnew\" style=\"left:" + paidW.toFixed(2) + "%;width:" + (newW - paidW).toFixed(2) + "%\"></span>" +
    (dep != null ? stop("dep", depAt, depOn) + "<span class=\"mlab dep" + (depAt > 55 ? " end" : depAt < 14 ? " start" : "") + "\" style=\"left:" + depAt.toFixed(2) + "%\">Deposit " + money(dep) + "</span>" : "") +
    stop("full", 100, totOn) + "<span class=\"mlab full\">Total " + money(f.total) + "</span></div></div>";
}
/** The fill grows from where it was when money comes in (not with reduced motion). */
function growBar(id, f) {
  const fill = $(".mfill", dlg), w = pct(f.received, f.total);
  if (fill && barWas && barWas.id === id && Math.abs(barWas.w - w) > 0.01 && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
    fill.style.transition = "none"; fill.style.width = barWas.w.toFixed(2) + "%"; void fill.offsetWidth;
    fill.style.transition = ""; fill.style.width = w.toFixed(2) + "%";
  }
  barWas = { id, w };
}
/** The typed amount, shown ahead of what is paid as it is typed (without drawing the sheet again). */
function previewPay() {
  const b = whoOf(sheetFor); if (!b || sheetFor[0] !== "b") return;
  const f = moneyOf(b), paidW = pct(f.received, f.total), newW = Math.max(paidW, pct(f.received + typedAmount(held.pay), f.total)), el = $(".mnew", dlg);
  if (el) el.style.width = (newW - paidW).toFixed(2) + "%";
}
/**
 * The bond, as one tick box. Before the event: "Bond" and its amount, ticked once it is paid (Confirm logs Bond in). From the day after
 * the event: "Bond given back" (Confirm logs Bond back). A package with no bond has no row. The bond isn't in History.
 */
function bondState_(b) {
  const f = moneyOf(b);
  if (f.bond === "none" || f.cancelled) return null;
  if (!f.past) { const amount = f.bond === "held" ? f.bondHeld : num(f.bondAmount); return { after: false, was: f.bond === "held" || f.bond === "back", amount, label: "Bond " + money(amount) }; }
  if (f.bond === "due") return { after: true, none: true };
  return { after: true, was: f.bond === "back", amount: f.bondHeld, label: "Bond given back" };
}
/** The bond tick box. on = how it is ticked now. tap and fid = what a tap does and its id (it is on the client sheet and on Event day's). */
function bondTick(b, on, tap, fid) {
  const st = bondState_(b); if (!st) return "";
  if (st.none) return "<p class=\"none\">No bond was paid, so there is nothing to give back.</p>";
  const words = on ? (st.after ? "Given back" : "Paid") : st.after ? "Not given back yet" : "Not paid yet";
  return "<button class=\"tickf bondtick" + (on ? " on" : "") + "\" type=\"button\" data-do=\"" + tap + "\" data-fid=\"" + fid + "\" aria-pressed=\"" + on + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span><span class=\"bl\">" + esc(st.label) + "</span><span class=\"bs\">" + words + "</span></button>";
}
function bondPart(b) {
  const st = bondState_(b); if (!st) return "";
  const h = holding(), on = h.bond == null ? !!st.was : h.bond;
  return "<h3 class=\"sh\">Bond, held apart</h3>" + bondTick(b, on, "cs-bond", "cs-bond");
}
/** What a change to the bond tick saves: a new Bond in or Bond back row, or (unticked) its rows marked removed. null = no change. */
function bondChanges(b, on) {
  const st = bondState_(b); if (!st || st.none || on === !!st.was) return null;
  const pays = S.payBy[b.invoice] || [], rows = what => pays.filter(p => what.includes(p.what) && p.row > 0).map(p => ({ tab: "Payments", row: p.row, amount: p.amount, invoice: b.invoice, what: p.what }));
  if (on) return { payments: [{ what: st.after ? "Bond back" : "Bond in", amount: st.amount }], remove: [], words: st.after ? "bond given back" : "bond in" };
  return { payments: [], remove: rows(st.after ? ["Bond back"] : ["Bond in", "Bond back"]), words: st.after ? "bond back taken off" : "bond taken off" };
}
/** The hire payments for this client, newest first, folded away under "History (3)". The bond isn't here: it has its own tick. */
function historyPart(b) {
  const all = (S.payAll[b.invoice] || []).filter(p => p.what === "Hire").slice().sort((p, q) => (p.date || "") < (q.date || "") ? 1 : (p.date || "") > (q.date || "") ? -1 : q.row - p.row);
  if (!all.length) return "<h3 class=\"sh\">History</h3><p class=\"none\">Nothing logged yet.</p>";
  return "<button class=\"hhead\" type=\"button\" data-do=\"cs-hist\" data-fid=\"cs-hist\" aria-expanded=\"" + histOpen + "\" aria-controls=\"hist\"><span>History (" + all.length + ")</span><svg class=\"chev\" aria-hidden=\"true\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\"><path d=\"M6 9l6 6 6-6\"/></svg></button>" +
    "<div class=\"coll" + (histOpen ? " open" : "") + "\" id=\"hist\"><div><div class=\"hrows\">" + all.map(historyRow).join("") + "</div></div></div>";
}
function historyRow(p) {
  const key = "Payments" + p.row, going = holding().remove.includes(key), words = "Payment, " + money(num(p.amount)) + (p.date ? ", " + dayMon(p.date) : "");
  const end = p.removed ? "<span class=\"hgone\">Removed " + esc(dayMon(p.removed)) + "</span>"
    : going ? "<span class=\"hgone\">Will be removed</span><button class=\"linkbtn hx\" type=\"button\" data-do=\"h-keep\" data-key=\"" + key + "\" data-fid=\"hk-" + key + "\" aria-label=\"Keep " + esc(words) + "\">Keep</button>"
    : p.row > 0 ? "<button class=\"linkbtn hx\" type=\"button\" data-do=\"h-remove\" data-key=\"" + key + "\" data-fid=\"hx-" + key + "\" aria-label=\"Remove " + esc(words) + "\">Remove</button>" : "<span class=\"hgone\">Saving…</span>";
  return "<div class=\"hrow" + (p.removed || going ? " gone" : "") + "\" data-hrow=\"" + key + "\"><span class=\"hd\">" + esc(dayMon(p.date)) + "</span><span class=\"hw\">Payment</span><span class=\"hv\">" + money(num(p.amount)) + "</span>" + end + "</div>";
}
/** A cancelled booking: why, and the refund still to send. Refund sent is a tick, held until Confirm. */
function cancelledPart(b) {
  const h = holding(), sentNow = h.refundSent == null ? !!txt(b.refundSent) : h.refundSent, refund = txt(b.refund) === "" ? null : num(b.refund), sentOn = txt(b.refundSent);
  return "<h3 class=\"sh\">Status</h3><p class=\"csdone\"><span class=\"skey st-done\">Cancelled</span>" + (txt(b.cancelReason) ? "<span>" + esc(b.cancelReason) + "</span>" : "") + "</p>" +
    (refund == null ? "" : refund > 0 ? "<h3 class=\"sh\">Refund</h3><div class=\"refundbox\"><p class=\"rv\">" + (sentOn ? "Refund " + money(refund) + " sent" + (/^\d{4}-/.test(sentOn) ? " " + dayMon(sentOn) : "") : "Refund " + money(refund) + " to send") + "</p>" +
      "<button class=\"tickf\" type=\"button\" data-do=\"cs-refund\" data-fid=\"cs-refund\" aria-pressed=\"" + sentNow + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span>Refund sent</button></div>" : "<p class=\"none\">No refund to send.</p>");
}
function contactPart(x, enquiry) {
  const rows = contactRows(x, enquiry);
  return "<h3 class=\"sh\">Contact</h3>" + (rows.length ? "<div class=\"crows\">" + contactHtml(rows) + "</div>" : "<p class=\"none\">No contact details yet.</p>");
}
function linksPart(b) {
  const onEventDay = live(b) && !moneyOf(b).past;
  return "<div class=\"cslinks\">" + (onEventDay ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"cs-event\" data-row=\"" + b.row + "\" data-fid=\"cs-event\">Event day details</button>" : "") +
    "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"cs-designs\" data-row=\"" + b.row + "\" data-fid=\"cs-designs\">Designs</button></div>";
}
function keenPart(q) {
  return "<button class=\"k k-gold wide mt16\" type=\"button\" data-do=\"cs-keen\" data-who=\"q" + q.row + "\" data-fid=\"cs-keen\">Keen</button><p class=\"dnote center\">Opens Add a booking, filled in from the enquiry.</p>";
}

/* ---------- Confirm: everything held, saved in one call ---------- */
/**
 * What the sheet holds that differs from the tracker, ready to save. any = something to save. problem = why it can't be
 * saved yet. arg = the parts for saveClient. change(data) = the same change on the app's copy. words = what was saved.
 */
function changesOf(x) {
  const out = { any: false, problem: "", arg: {}, words: [], change: null };
  if (!x || !held || held.id !== sheetFor) return out;
  const h = held, booking = sheetFor[0] === "b", arg = out.arg, edits = [], was = sourceOf(x, !booking);
  if (h.source && (h.source.source !== was.source || h.source.handle !== was.handle)) {
    arg.source = h.source; out.words.push("how they got in touch");
    edits.push(m => { m.gotInTouch = h.source.source; m.handle = h.source.handle; });
  }
  if (!booking) {
    const now = txt(x.status) || "New";
    if (h.status && h.status !== now) { arg.status = h.status; out.words.push("the status"); }
    out.any = !!(arg.source || arg.status);
    out.change = data => { const q = data.enquiries.find(r => r.row === x.row); if (!q) return; edits.forEach(e => e(q));
      if (arg.status) { q.status = arg.status; q.what = arg.status === "Waiting on deposit" ? "Moved to bookings" : arg.status === "Cancelled" ? "Cancelled" : ""; } };
    return out;
  }
  const f = moneyOf(x), pay = typedAmount(h.pay), payments = [], remove = [];
  if (txt(h.pay) !== "" && !(pay > 0)) out.problem = "Type the amount that came in, or clear the box.";
  else if (pay > f.owing) out.problem = "That’s more than the " + money(f.owing) + " still to pay.";
  if (pay > 0) { payments.push({ what: "Hire", amount: pay }); out.words.push("payment " + money(pay)); }
  const bond = h.bond == null ? null : bondChanges(x, h.bond);
  if (bond) { payments.push.apply(payments, bond.payments); remove.push.apply(remove, bond.remove); out.words.push(bond.words); }
  const gone = h.remove.map(key => (S.data.payments || []).find(r => "Payments" + r.row === key)).filter(p => p && !p.removed);
  gone.forEach(p => remove.push({ tab: "Payments", row: p.row, amount: p.amount, invoice: x.invoice, what: p.what }));
  if (gone.length) out.words.push(gone.length === 1 ? "1 payment removed" : gone.length + " payments removed");
  if (h.refundSent != null && h.refundSent !== !!txt(x.refundSent)) { arg.refundSent = h.refundSent; out.words.push(h.refundSent ? "refund sent" : "refund not sent yet"); }
  if (payments.length) arg.payments = payments;
  if (remove.length) arg.remove = remove;
  out.any = !!(arg.source || arg.payments || arg.remove || "refundSent" in arg || (txt(h.pay) !== "" && out.problem));
  out.change = data => {
    const m = data.bookings.find(r => r.row === x.row); if (!m) return;
    edits.forEach(e => e(m));
    (arg.payments || []).forEach((p, i) => data.payments.push({ row: -(Date.now() + i), date: todayIso(), invoice: x.invoice, client: x.client, amount: p.amount, what: p.what, note: "", removed: "" }));
    (arg.remove || []).forEach(e => { const r = data.payments.find(y => y.row === e.row); if (r) r.removed = todayIso(); });
    if ("refundSent" in arg) m.refundSent = arg.refundSent ? todayIso() : "";
    recount(data, x.invoice);
  };
  return out;
}
async function confirmClient() {
  const x = whoOf(sheetFor); if (!x || !held || held.saving) return;
  const id = sheetFor, booking = id[0] === "b", ch = changesOf(x);
  if (ch.problem) { say(ch.problem); return; }
  if (!ch.any) { hide(); return; }                  /* nothing changed: Confirm just closes */
  const arg = Object.assign(booking ? { kind: "booking", row: x.row, id: x.id, invoice: x.invoice } : { kind: "enquiry", row: x.row, name: x.name }, ch.arg);
  const converting = !booking && arg.status === "Waiting on deposit";
  if (converting) {
    if (!parseLoose(x.date) && held.eventDate === undefined) { askDate(x); return; }        /* no date yet: ask for it first, as before */
    arg.eventDate = held.eventDate || "";
    const date = arg.eventDate || parseLoose(x.date) || "", venue = ((/venue:\s*([^\n]+)/i.exec(txt(x.message)) || [])[1] || "").trim(), src = held.source || sourceOf(x, true), base = ch.change;
    ch.change = data => { base(data); data.bookings.push({ row: -Date.now(), client: x.name, date, status: date ? "Waiting on deposit" : "Date needed", type: x.type, venue, suburb: "", cancelled: "", total: 0, received: 0, owing: 0, invoice: "", gotInTouch: src.source, handle: src.handle }); };
  }
  held.saving = true; keyNote = "";
  if (sheetKind !== "client") openSheet(id, true); else SHEETS.client.sync();
  const res = await save("saveClient", arg, ch.change);
  if (!held || held.id !== id) return;
  held.saving = false;
  if (!res) { if (sheetKind === "client" && sheetFor === id) SHEETS.client.sync(); return; }       /* it didn't save: the sheet stays, with what it held and why */
  held = freshHeld(id);
  if (converting) { hide(); toast(x.name + " is now a booking" + (res.invoice ? ", " + res.invoice : "") + ", waiting on deposit."); return; }
  if (sheetKind === "client" && sheetFor === id && whoOf(id)) openSheet(id, true, "Saved: " + listAnd(ch.words) + ".");
}

/* ---------- how they got in touch: picked on its own small sheet, then held on the client sheet until Confirm ---------- */
let srcFor = "", srcPick = "", srcBack = "";
const HANDLE_HINT = { "Instagram": "@their handle", "Messenger": "Their name on Messenger", "WhatsApp": "Their number", "TikTok": "@their handle", "Text or call": "Their number", "Email": "Their email", "Website form": "How to reach them" };
function openSource(id) {
  const x = whoOf(id); if (!x) return;
  srcBack = sheetKind === "client" && sheetFor === id ? id : "";
  const now = srcBack && held && held.id === id && held.source ? held.source : sourceOf(x, id[0] === "q");
  srcFor = id; srcPick = now.source;
  show("source", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">how they got in touch</h2><p class=\"sub\">" + esc(id[0] === "b" ? x.client : x.name) + "</p>" +
    "<div class=\"srcs\" role=\"group\" aria-label=\"How they got in touch\">" + SOURCES.map(n => "<button class=\"chip srcchip\" type=\"button\" data-do=\"src-pick\" data-src=\"" + esc(n) + "\" aria-pressed=\"" + (srcPick === n) + "\">" + sourceIcon(n, 18) + "<span>" + esc(n) + "</span></button>").join("") + "</div>" +
    "<div class=\"fld\" style=\"margin-top:14px\"><label for=\"src-handle\">Handle or number, if you have it</label><input class=\"inp wm-card\" id=\"src-handle\" type=\"text\" autocomplete=\"off\" maxlength=\"80\" placeholder=\"" + esc(HANDLE_HINT[srcPick] || "") + "\" value=\"" + esc(now.handle) + "\"></div>" +
    sheetFoot("<button class=\"btn big save\" type=\"button\" data-do=\"src-save\" data-fid=\"src-save\">" + (srcBack ? "Done" : "Save") + "</button><button class=\"btn line cancel\" type=\"button\" data-do=\"src-back\">" + (srcBack ? "Back" : "Cancel") + "</button>"));
  dlg.setAttribute("aria-label", "How they got in touch");
}
/** From the client sheet: the pick goes back to it, held until Confirm. From anywhere else (Event day): it saves straight away. */
async function saveSource() {
  const id = srcFor, x = whoOf(id); if (!x) return;
  if (!srcPick) { $("#err", dlg).textContent = "Pick how they got in touch."; return; }
  const pick = { source: srcPick, handle: $("#src-handle", dlg).value.trim() };
  if (srcBack) { if (!held || held.id !== id) held = freshHeld(id); held.source = pick; openSheet(id, true); return; }
  const enquiry = id[0] === "q";
  const arg = Object.assign({ kind: enquiry ? "enquiry" : "booking", row: x.row, source: pick }, enquiry ? { name: x.name } : { id: x.id, invoice: x.invoice });
  const btn = $("[data-do=src-save]", dlg); if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
  const res = await save("saveClient", arg, data => { const y = (enquiry ? data.enquiries : data.bookings).find(r => r.row === x.row); if (y) { y.gotInTouch = pick.source; y.handle = pick.handle; } });
  if (sheetKind !== "source") return;
  if (res) { hide(); toast("Got in touch by " + pick.source + (pick.handle ? ", " + pick.handle : "") + "."); }
  else if (btn) { btn.disabled = false; btn.textContent = "Save"; }
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

/* ---------- Board and Screen: that client on the Designs tab, on that side ---------- */
function designsFor(row, side) {
  const b = eventAt(row); if (!b) return;
  hide(); S.backTo = null; S.dz.row = b.row; S.dz.side = side;
  const state = dzState(b); dzGo(state === "ready" || state === "chosen" ? "styles" : "brief", "fwd");
}

/* ---------- taps ---------- */
const KEY_ORDER = { waiting: 0, deposit: 1, booked: 2 };
Object.assign(TAPS, {
  "client": el => openClient(+el.dataset.row),
  "cs-confirm": () => confirmClient(),
  /* a booking's status keys: a higher one asks how much came in; a lower one changes nothing, and says why */
  "cs-key": el => {
    const b = whoOf(sheetFor); if (!b || sheetFor[0] !== "b" || !held || held.saving) return;
    const f = moneyOf(b), key = el.dataset.key;
    if (key === f.stage) keyNote = "";
    else if (KEY_ORDER[key] > KEY_ORDER[f.stage]) {
      keyNote = ""; held.pay = ""; SHEETS.client.sync();
      const box = $("#other", dlg); if (box) { box.focus({ preventScroll: true }); box.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); }
      return;
    } else keyNote = f.stage === "booked" ? "Payments say it’s paid in full. Remove a payment in History to change this." : "Payments say the deposit is in. Remove a payment in History to change this.";
    const note = $("#keynote", dlg); if (note) note.textContent = keyNote;
  },
  "cs-status": el => {
    if (!held || held.saving || sheetFor[0] !== "q") return;
    const q = whoOf(sheetFor), now = txt(q.status) || "New";
    held.status = el.dataset.status === now ? "" : el.dataset.status; held.eventDate = undefined;
    $$("[data-do=cs-status]", dlg).forEach(k => k.setAttribute("aria-pressed", k.dataset.status === (held.status || now)));
  },
  "cs-bond": () => {
    const b = whoOf(sheetFor), st = b && bondState_(b); if (!st || st.none || !held || held.saving) return;
    const on = !(held.bond == null ? !!st.was : held.bond);
    held.bond = on === !!st.was ? null : on; SHEETS.client.sync();
  },
  "cs-refund": el => {
    const b = whoOf(sheetFor); if (!b || !held || held.saving) return;
    const on = el.getAttribute("aria-pressed") !== "true";
    held.refundSent = on === !!txt(b.refundSent) ? null : on; el.setAttribute("aria-pressed", on);
  },
  "cs-hist": el => { histOpen = !histOpen; el.setAttribute("aria-expanded", histOpen); $("#hist", dlg).classList.toggle("open", histOpen); },
  "h-remove": el => { if (!held || held.saving) return; held.remove = held.remove.concat(el.dataset.key); SHEETS.client.sync(); const back = $("[data-fid=\"hk-" + el.dataset.key + "\"]", dlg); if (back) back.focus(); },
  "h-keep": el => { if (!held || held.saving) return; held.remove = held.remove.filter(k => k !== el.dataset.key); SHEETS.client.sync(); const back = $("[data-fid=\"hx-" + el.dataset.key + "\"]", dlg); if (back) back.focus(); },
  "src-open": el => openSource(el.dataset.who),
  "src-pick": el => { srcPick = el.dataset.src; $$(".srcchip", dlg).forEach(c => c.setAttribute("aria-pressed", c === el)); $("#src-handle", dlg).placeholder = HANDLE_HINT[srcPick] || ""; },
  "src-save": () => saveSource(),
  "src-back": () => { if (srcBack) openSheet(srcBack, true); else hide(); },
  "cs-keen": el => { const q = whoOf(el.dataset.who); if (q) keen(q); },
  "cs-event": el => {                                  /* that client's card on Event day, open */
    const row = +el.dataset.row; hide(); S.eopen[row] = true; go("eventday");
    const card = $("[data-ecard=\"" + row + "\"]"); if (card) { card.scrollIntoView({ block: "start" }); $(".ehead", card).focus({ preventScroll: true }); }
  },
  "cs-designs": el => { hide(); TAPS["dz-client"]({ dataset: { row: el.dataset.row } }); },
  /* the round buttons behind a booking row swiped left (or beside it on a laptop) */
  "q-board": el => designsFor(+el.dataset.who.slice(1), "board"),
  "q-screen": el => designsFor(+el.dataset.who.slice(1), "screen"),
  "q-cancel": el => openCancel(+el.dataset.who.slice(1))
});
/* the amount box: held as it is typed, and shown ahead of what is paid */
dlg.addEventListener("input", e => {
  if (sheetKind !== "client" || !held || e.target.id !== "other") return;
  held.pay = e.target.value; previewPay();
  const err = $("#err", dlg); if (err && err.textContent) err.textContent = "";
});

/* ---------- Cancel or change the date: Cancel behind a booking's row opens it ----------
   Cancel the booking: a reason, and the refund worked out line by line. Confirm ticks Cancelled and keeps the reason and the
   refund; it writes no refund payment. Change the date: a month that shows the days already taken, warning of a clash.
   Both are held until Confirm, and closing with a reason typed or a date picked asks first. */
let cx = null;                             /* {row, mode: "cancel" or "date", reason, date, ym: [year, month], saving} */
function openCancel(row, keep) {
  const b = bookingAt(row); if (!b) { hide(); return; }
  if (!keep || !cx || cx.row !== row) { const base = moneyOf(b).date || todayIso(); cx = { row, mode: "", reason: "", date: "", ym: [+base.slice(0, 4), +base.slice(5, 7) - 1], saving: false }; }
  const f = moneyOf(b), again = sheetKind === "cancel", slotErr = again && $("#err", dlg) ? $("#err", dlg).textContent : "";
  const opt = (mode, title, words) => "<button class=\"opt cxopt\" type=\"button\" data-do=\"cx-mode\" data-mode=\"" + mode + "\" data-fid=\"cx-" + mode + "\" aria-pressed=\"" + (cx.mode === mode) + "\"><span class=\"tl\"><span>" + title + "</span><span>" + words + "</span></span>" + (cx.mode === mode ? "<span class=\"chk\" aria-hidden=\"true\">" + CHECK + "</span>" : "") + "</button>";
  show("cancel", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">cancel or change the date</h2><p class=\"sub\">" + esc([b.client, f.date ? dayOf(f.date) : "No date yet", txt(b.invoice)].filter(Boolean).join(", ")) + "</p>" +
    "<div class=\"cxopts\" role=\"group\" aria-label=\"What to do\">" + opt("cancel", "Cancel the booking", "Works out the refund") + opt("date", "Change the date", "Moves the booking to another day") + "</div>" +
    (cx.mode === "cancel" ? cancelPane(b) : cx.mode === "date" ? datePane(b) : "") +
    sheetFoot("<button class=\"btn big confirm\" type=\"button\" data-do=\"cx-confirm\" data-fid=\"cx-confirm\"" + (cx.saving ? " disabled" : "") + ">" + (cx.saving ? "Saving…" : "Confirm") + "</button>", "", slotErr));
  dlg.setAttribute("aria-label", "Cancel or change the date");
}
SHEETS.cancel = {
  sync() { if (cx && bookingAt(cx.row)) keepFocus(() => openCancel(cx.row, true)); else hide(); },
  dirty() { const b = cx && bookingAt(cx.row); return !!b && !cx.saving && (cx.mode === "cancel" ? !!cx.reason.trim() : cx.mode === "date" ? !!cx.date && cx.date !== b.date : false); },
  reopen() { if (cx && bookingAt(cx.row)) openCancel(cx.row, true); }
};
/**
 * The refund if the booking is cancelled today: the hire paid so far, less the deposit (it isn't refunded), plus the bond if
 * it was paid. From the balance due date on, the hire money is kept unless the date is rebooked, so the refund is the bond only.
 */
function refundOf(b) {
  const f = moneyOf(b), late = !!f.balanceDue && todayIso() >= f.balanceDue;
  const kept = late ? f.received : Math.min(f.received, f.deposit || 0), bond = f.bond === "held" ? f.bondHeld : 0;
  return { paid: f.received, kept, bond, late, due: f.balanceDue, total: Math.max(0, f.received - kept) + bond };
}
function cancelPane(b) {
  const r = refundOf(b), line = (words, amount, cls) => "<div class=\"rl" + (cls ? " " + cls : "") + "\"><span>" + words + "</span><span>" + amount + "</span></div>";
  return "<div class=\"fld cxfld\"><label for=\"cx-reason\">Reason for cancelling</label><textarea class=\"inp long wm-card\" id=\"cx-reason\" rows=\"3\" maxlength=\"300\" data-fid=\"cx-reason\">" + esc(cx.reason) + "</textarea></div>" +
    "<h3 class=\"sh\">The refund</h3><div class=\"rlines\">" + line("Hire paid so far", money(r.paid)) +
    (r.late ? line("Kept: it’s past the balance due date", r.kept ? "−" + money(r.kept) : money(0)) : line("Minus the deposit (non-refundable)", r.kept ? "−" + money(r.kept) : money(0))) +
    (r.bond ? line("Plus the bond", money(r.bond)) : "") + line("Refund", money(r.total), "sum") + "</div>" +
    (r.late ? "<p class=\"cxnote\">It’s on or after the balance due date" + (r.due ? " (" + fmt(r.due) + ")" : "") + ", so the balance is kept unless the date is rebooked. The refund is the bond only.</p>" : "") +
    "<p class=\"cxnote\">Confirm marks the booking cancelled. The refund isn’t sent or logged by the app: it stays on the Clients list until you tick Refund sent on their sheet.</p>";
}
function datePane(b) {
  const [y, m] = cx.ym, today = todayIso(), lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const taken = new Map();
  (S.data.bookings || []).forEach(o => { if (o.row !== b.row && live(o) && /^\d{4}-\d{2}-\d{2}$/.test(txt(o.date))) taken.set(o.date, (taken.get(o.date) || []).concat(o.client)); });
  let grid = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => "<span class=\"cxdow\" aria-hidden=\"true\">" + d + "</span>").join("") + "<span></span>".repeat(lead);
  for (let d = 1; d <= days; d++) {
    const iso = isoOf(y, m, d), who = taken.get(iso), sel = cx.date === iso, now = b.date === iso;
    grid += "<button class=\"cxd" + (who ? " taken" : "") + (now ? " now" : "") + "\" type=\"button\" data-do=\"cx-day\" data-day=\"" + iso + "\" data-fid=\"cxd-" + iso + "\" aria-pressed=\"" + sel + "\"" + (iso < today ? " disabled" : "") +
      " aria-label=\"" + esc(fmt(iso) + (who ? ", taken by " + listAnd(who) : "") + (now ? ", its date now" : "")) + "\">" + d + "</button>";
  }
  const clash = cx.date && taken.get(cx.date), wedding = (kindOfType(b.type) || { names: [] }).names.includes("Weddings");
  return "<h3 class=\"sh\">The new date</h3><div class=\"cxcal\"><div class=\"cxmon\"><button type=\"button\" data-do=\"cx-month\" data-by=\"-1\" data-fid=\"cx-prev\" aria-label=\"Previous month\">&lsaquo;</button><div aria-live=\"polite\">" + MONTHS[m] + " " + y + "</div>" +
    "<button type=\"button\" data-do=\"cx-month\" data-by=\"1\" data-fid=\"cx-next\" aria-label=\"Next month\">&rsaquo;</button></div><div class=\"cxgrid\">" + grid + "</div>" +
    "<p class=\"cxkey\"><span><i class=\"taken\" aria-hidden=\"true\"></i>Taken</span>" + (b.date ? "<span><i class=\"now\" aria-hidden=\"true\"></i>Its date now</span>" : "") + "</p></div>" +
    (cx.date ? "<p class=\"cxpick\">New date: <b>" + esc(dayOf(cx.date)) + "</b></p>" : "<p class=\"none\">Pick the new day.</p>") +
    (clash ? "<div class=\"warn\">Clash: " + esc(listAnd(clash)) + " " + (clash.length > 1 ? "are" : "is") + " already booked on " + fmt(cx.date) + ". With one board we can’t take both.</div>" : "") +
    (wedding ? "<p class=\"cxnote\">Weddings get one free date change, with at least 3 months’ notice.</p>" : "");
}
async function confirmCancel() {
  const b = cx && bookingAt(cx.row); if (!b || cx.saving) return;
  const id = "b" + b.row, row = b.row, err = $("#err", dlg);
  if (!cx.mode) { err.textContent = "Pick Cancel the booking or Change the date."; return; }
  let arg = { kind: "booking", row, id: b.id, invoice: b.invoice }, change, said;
  if (cx.mode === "cancel") {
    const reason = cx.reason.trim(), refund = refundOf(b).total;
    if (!reason) { err.textContent = "Write the reason for cancelling."; const box = $("#cx-reason", dlg); if (box) box.focus(); return; }
    arg.cancel = { reason, refund };
    change = data => { const m = data.bookings.find(x => x.row === row); if (!m) return; m.cancelled = "Yes"; m.cancelReason = reason; m.refund = refund; m.refundSent = ""; recount(data, m.invoice); };
    said = "Saved: cancelled. " + (refund > 0 ? "Refund " + money(refund) + " to send." : "No refund to send.");
  } else {
    if (!cx.date || cx.date === b.date) { err.textContent = "Pick the new day."; return; }
    const date = cx.date;
    arg.date = date;
    change = data => { const m = data.bookings.find(x => x.row === row); if (!m) return; m.date = date; recount(data, m.invoice); };
    said = "Saved: the new date, " + dayOf(date) + ".";
  }
  cx.saving = true; SHEETS.cancel.sync();
  const res = await save("saveClient", arg, change);
  if (!cx || cx.row !== row) return;
  cx.saving = false;
  if (!res) { if (sheetKind === "cancel") SHEETS.cancel.sync(); return; }          /* it didn't save: the sheet stays, with what was typed and why */
  cx = null;
  if (sheetKind === "cancel") openSheet(id, false, said);                             /* the client sheet, now showing the refund or the new date */
}
Object.assign(TAPS, {
  "cx-mode": el => { if (!cx || cx.saving) return; cx.mode = el.dataset.mode; SHEETS.cancel.sync(); const focus = cx.mode === "cancel" ? $("#cx-reason", dlg) : null; if (focus) focus.focus({ preventScroll: true }); },
  "cx-month": el => { if (!cx) return; const n = cx.ym[0] * 12 + cx.ym[1] + +el.dataset.by; cx.ym = [Math.floor(n / 12), n % 12]; SHEETS.cancel.sync(); },
  "cx-day": el => { if (!cx || cx.saving) return; cx.date = el.dataset.day; SHEETS.cancel.sync(); },
  "cx-confirm": () => confirmCancel()
});
dlg.addEventListener("input", e => { if (sheetKind === "cancel" && cx && e.target.id === "cx-reason") { cx.reason = e.target.value; const err = $("#err", dlg); if (err) err.textContent = ""; } });
