"use strict";
/* wmhb app: the frame. The side menu, the tabs, the sheets, and talking to the tracker.
   Each screen lives in its own file beside this one (clients.js and so on). */

/* The /exec address of the new back end, the Apps Script project "wmhb app 2". It is no use to anyone without the key.
   If it is emptied, or the page address ends in ?demo, the page shows made-up sample data and saves nothing. */
const API = "https://script.google.com/macros/s/AKfycbxCelu-LC38ofC3zWNnGrJfFM3VeH4injtC13eEpnJMNVqBjcvWzCToEE-aKsUI1wIe_w/exec";
const DEMO = !API || /[?&]demo\b/.test(location.search);
/* The key comes from the page address (#k=...) and is kept on this device only. It is never written in this file. */
let KEY = (/[#&]k=([^&]+)/.exec(location.hash) || [])[1] || "";
try { if (KEY) localStorage.setItem("wmhb2.k", KEY); else KEY = localStorage.getItem("wmhb2.k") || ""; } catch (e) {}

/* ---------- small helpers ---------- */
const DAY = 864e5;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-NZ");
const txt = v => v == null ? "" : String(v).trim();
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const ms = iso => Date.parse(iso + "T00:00:00Z");
const addDays = (iso, n) => new Date(ms(iso) + n * DAY).toISOString().slice(0, 10);
const dParts = iso => { const d = new Date(ms(iso)); return { wd: WD[d.getUTCDay()], d: d.getUTCDate(), mo: MO[d.getUTCMonth()], m: d.getUTCMonth(), y: d.getUTCFullYear() }; };
const fmt = iso => { const p = dParts(iso); return p.wd + " " + p.d + " " + p.mo; };
const isoOf = (y, m, d) => y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
function todayIso() {
  const p = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(x => p[x.type] = x.value);
  return p.year + "-" + p.month + "-" + p.day;
}
const clock = t => new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" }).format(new Date(t)).replace(/\s/g, " ").toLowerCase();
const listAnd = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const phone = () => !matchMedia("(min-width:1000px)").matches;
const copy = x => JSON.parse(JSON.stringify(x));
const CHECK = "<svg aria-hidden=\"true\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\"><path d=\"M5 12l5 5L20 7\"/></svg>";
const PLUS = "<span class=\"plus\" aria-hidden=\"true\"><i></i><i class=\"v\"></i></span>";
const RULER = (() => { let p = "M0 0h500v6H0zM0 0h6v57h-6z"; for (let x = 22, k = 0; x <= 472; x += 25, k++) p += "M" + x + " 0h6v" + [23, 39, 23, 57][k % 4] + "h-6z"; return p + "M494 0h6v57h-6z"; })();
const LOGO = "<div class=\"logo\" role=\"img\" aria-label=\"wmhb\"><div>wmhb</div><svg aria-hidden=\"true\" width=\"52\" height=\"8\" viewBox=\"0 0 500 57\"><path d=\"" + RULER + "\"/></svg></div>";

/* ---------- what the app knows ---------- */
const S = { tab: "clients", data: null, readAt: 0, trouble: "", T: null, payBy: {}, payAll: {} };

/* ---------- names ---------- */
/* "Glow Studio (Mia)" is a business with its contact in brackets. */
const contactOf = name => (/\(([^)]+)\)\s*$/.exec(name) || [])[1] || "";
const withoutBrackets = name => name.replace(/\s*\([^)]*\)\s*$/, "") || name;
/** The short name under a calendar date: the contact if there is one in brackets, otherwise the first name. */
const calendarName = name => contactOf(name) || name.split(/\s+/)[0];
/** The short name on a chip: the business, or the first name. */
const chipName = name => contactOf(name) ? withoutBrackets(name) : name.split(/\s+/)[0];

/* ---------- the booking terms: read from the Prices tab, as the tracker sends it ---------- */
const firstNumber = v => { const m = /\d[\d,]*(?:\.\d+)?/.exec(String(v == null ? "" : v)); return m ? Number(m[0].replace(/,/g, "")) : null; };
const sum = (list, key) => list.reduce((s, x) => s + num(x[key || "amount"]), 0);
/**
 * No amount and no number of days is written in this app. They come from the Prices tab (tracker v3):
 *  - the packages table, headings in row 5: B Package, C For, F Bond? (Yes or No), O Balance due (days before),
 *    P Deposit (words: "30% of the total", or an amount such as "$200");
 *  - the booking terms under it: C29 the smallest deposit that marks a booking Booked, C30 the bond,
 *    C31 the invoice number the old 7-day terms run up to.
 * Columns are found by their heading and the terms by their label. The letters above are only the fallback.
 */
function readTerms(data) {
  const g = (data && data.prices) || [], cell = (r, c) => txt(g[r] && g[r][c]);
  const T = { smallestDeposit: null, bond: null, oldTo: 0, oldDays: null, packages: {} };
  const hr = g.findIndex(r => r && txt(r[1]) === "Package");
  if (hr >= 0) {
    const head = g[hr].map(txt), find = (re, spare) => { const i = head.findIndex((h, c) => c > 1 && re.test(h)); return i >= 0 ? i : spare; };
    const forCol = find(/^for$/i, 2), bondCol = find(/bond/i, 5), dueCol = find(/due/i, 14), depositCol = find(/deposit/i, 15), weeks = /week/i.test(head[dueCol] || "");
    for (let r = hr + 1; r < g.length && cell(r, 1); r++) {
      const due = firstNumber(cell(r, dueCol));
      T.packages[cell(r, 1)] = { for: cell(r, forCol), bond: /^yes$/i.test(cell(r, bondCol)), dueDays: due == null ? null : due * (weeks ? 7 : 1), deposit: cell(r, depositCol) };
    }
  }
  /* a term is in its usual row unless that row is labelled as something else; then it is looked for by its label */
  const term = (re, usual) => {
    if (!cell(usual, 1) || re.test(cell(usual, 1))) return usual;
    const at = g.findIndex((row, r) => r !== hr && re.test(cell(r, 1)) && cell(r, 2) !== "");
    return at >= 0 ? at : usual;
  };
  const depositRow = term(/deposit/i, 28), bondRow = term(/bond/i, 29), oldRow = term(/old .*terms/i, 30);
  T.smallestDeposit = firstNumber(cell(depositRow, 2)); T.bond = firstNumber(cell(bondRow, 2));
  T.oldTo = firstNumber(cell(oldRow, 2)) || 0; T.oldDays = firstNumber(cell(oldRow, 1));        /* the "7" in "Old 7-day terms" */
  return T;
}
/* Bookings up to this invoice number were taken on the first deposit, whatever the package's Deposit column says now. */
const FIRST_DEPOSIT_UP_TO = 8;
/* A deposit written as a share of the total is rounded to the nearest this many dollars. */
const DEPOSIT_ROUNDS_TO = 50;
/* The four kinds of event, the same four as the calendar's filter, and the event types on the Settings tab that belong to each.
   This list is fixed (Aadil, 26 Nov 2026). It is not worked out from the wording: an event type that is not on it has no kind.
   names = what a package's "For" column (Prices, column C) calls the kind. They are matched whole, as written in tracker v3. */
const EVENT_KINDS = [
  { names: ["Weddings"], types: ["Wedding"] },
  { names: ["Birthdays & celebrations", "Celebrations"], types: ["Engagement party", "Birthday", "Anniversary", "Baby shower", "Other celebration"] },
  { names: ["Corporate (30% deposit)", "Corporate"], types: ["Brand / corporate"] },
  { names: ["Markets & fairs", "Markets"], types: ["Expo / show", "Market / fair"] }
];
const sameWords = (a, b) => { const tidy = v => txt(v).toLowerCase().replace(/\band\b/g, "&").replace(/\s+/g, " "); return tidy(a) === tidy(b); };
const kindOfType = type => EVENT_KINDS.find(k => k.types.some(t => sameWords(t, type))) || null;
const kindOfPackage = p => EVENT_KINDS.find(k => k.names.some(n => sameWords(n, p.for))) || null;
/**
 * The deposit for one booking, or null when it can't be told (then no amount is shown).
 * It is the Deposit of the booking's package. A package with none (Custom) takes the deposit of the packages for the same kind of event.
 */
function depositOf(b, T, total) {
  const invNo = /^INV-(\d+)$/.exec(txt(b.invoice));
  if (invNo && +invNo[1] <= FIRST_DEPOSIT_UP_TO) return T.smallestDeposit;
  const read = words => {
    const share = /(\d+(?:\.\d+)?)\s*%/.exec(txt(words));
    if (share) return total > 0 ? Math.round(total * share[1] / 100 / DEPOSIT_ROUNDS_TO) * DEPOSIT_ROUNDS_TO : null;
    return firstNumber(words);
  };
  const own = T.packages[txt(b.pkg)], fromOwn = own ? read(own.deposit) : null;
  if (fromOwn != null) return fromOwn;
  const kind = kindOfType(b.type);
  if (!kind) return null;
  const same = Object.keys(T.packages).map(name => T.packages[name]).filter(p => txt(p.deposit) && kindOfPackage(p) === kind).map(p => txt(p.deposit)).filter((d, i, a) => a.indexOf(d) === i);
  return same.length === 1 ? read(same[0]) : null;
}
/** A date written inside a line of words, such as "Balance due Sat 5 Dec". near = a date it should be close to. */
function dateIn(words, near) {
  const m = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*\.?(?:\s+(\d{4}))?/.exec(txt(words)); if (!m) return null;
  const mo = MO.findIndex(x => x.toLowerCase() === m[2].toLowerCase()); if (mo < 0) return null;
  if (m[3]) return isoOf(+m[3], mo, +m[1]);
  const y = +near.slice(0, 4), tries = [y - 1, y, y + 1].map(yy => isoOf(yy, mo, +m[1]));
  return tries.sort((a, b) => Math.abs(ms(a) - ms(near)) - Math.abs(ms(b) - ms(near)))[0];
}
/**
 * What the app works out about one booking's money: what is still to pay and by when, and where the bond is at.
 * kind: booked or waiting (on deposit). next: the next amount due. plan: every amount still to come, with its due date.
 * bond: none (this package takes no bond), due, held or back.
 */
function moneyOf(b) {
  const T = S.T || readTerms(null), today = todayIso(), pkg = T.packages[txt(b.pkg)], st = txt(b.status);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(txt(b.date)) ? b.date : null;
  const total = num(b.total), received = num(b.received), owing = Math.max(0, num(b.owing));
  const kind = st === "Booked" || st === "Completed" ? "booked" : st === "Waiting on deposit" ? "waiting" : received > 0 ? "booked" : "waiting";
  const pays = S.payBy[b.invoice] || [], bondIn = sum(pays.filter(p => p.what === "Bond in")), bondBack = sum(pays.filter(p => p.what === "Bond back"));
  const said = txt(b.bond).toLowerCase();
  const bond = said === "returned" || (bondBack > 0 && bondBack >= bondIn) ? "back" : said === "held" || bondIn > bondBack ? "held" : pkg && pkg.bond ? "due" : "none";
  const invNo = /^INV-(\d+)$/.exec(txt(b.invoice));
  const dueDays = invNo && T.oldTo && T.oldDays && +invNo[1] <= T.oldTo ? T.oldDays : pkg ? pkg.dueDays : null;
  const balanceDue = date && dueDays != null ? addDays(date, -dueDays) : null;
  const written = dateIn(b.nextStep, date || today);
  let deposit = depositOf(b, T, total);
  if (deposit != null) deposit = Math.max(0, Math.min(deposit - received, owing));        /* what is left of the deposit */
  /* The tracker marks a booking Booked once the smallest deposit (Prices C29) is in, even if its own deposit is bigger.
     So a Booked booking can still have the rest of its deposit as its next step. */
  const depositNext = st !== "Completed" && (deposit == null ? kind === "waiting" : deposit > 0);
  /* A deposit is due 48 hours after its invoice is sent. The tracker has no invoice-sent date yet, so it shows with no date. */
  const next = owing <= 0 ? null : depositNext ? { what: received > 0 ? "Rest of deposit" : "Deposit", amount: deposit, due: written } : { what: "Balance", amount: owing, due: written || balanceDue };
  const plan = [];
  if (owing > 0 && depositNext && deposit) { plan.push({ amount: deposit, due: written || today }); if (owing > deposit) plan.push({ amount: owing - deposit, due: balanceDue || date }); }
  else if (owing > 0) plan.push({ amount: owing, due: written || balanceDue || date });
  return { kind, done: st === "Completed", date, total, received, owing, next, plan, balanceDue, bond, bondAmount: T.bond, bondHeld: bond === "held" ? (bondIn - bondBack > 0 ? bondIn - bondBack : num(T.bond)) : 0 };
}
const live = b => txt(b.client) && txt(b.status) !== "Cancelled" && txt(b.cancelled) !== "Yes";
/** The rows of Payments and Expenses that count: a removed row stays in the tracker, marked with the day it was removed. */
const kept = list => (list || []).filter(x => !x.removed);
/**
 * After a change on this phone, a booking's money as the tracker's formulas will work it out (it answers a moment later):
 * Received from its Hire payments, Owing, the bond, and its status (Cancelled, then the status set by hand, then the money).
 */
function recount(data, invoice) {
  const b = (data.bookings || []).find(x => x.invoice === invoice); if (!b || !invoice) return;
  const pays = kept(data.payments).filter(p => p.invoice === invoice), of = what => sum(pays.filter(p => p.what === what));
  b.received = of("Hire"); b.owing = txt(b.cancelled) === "Yes" ? 0 : Math.max(0, num(b.total) - b.received);
  b.bond = of("Bond back") > 0 ? "Returned" : of("Bond in") > 0 ? "Held" : "";
  const T = S.T || readTerms(data), auto = !/^\d{4}-\d{2}-\d{2}$/.test(txt(b.date)) ? "Date needed" : b.received < num(T.smallestDeposit) ? "Waiting on deposit" : b.date < todayIso() ? "Completed" : "Booked";
  b.status = txt(b.cancelled) === "Yes" ? "Cancelled" : txt(b.statusByHand) || auto;
  data.reports = null;                     /* the tracker's own totals are out of date until it answers */
}

/* ---------- how a client got in touch: Aadil's seven, each with a one-colour icon ---------- */
const SOURCE_ICON = {
  "Instagram": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="fill" cx="17.3" cy="6.7" r="1.2"/>',
  "Messenger": '<path d="M12 3.5c-4.8 0-8.5 3.5-8.5 8.1 0 2.5 1.1 4.6 2.9 6.1V21l2.9-1.6c.9.3 1.8.4 2.7.4 4.8 0 8.5-3.5 8.5-8.1S16.8 3.5 12 3.5z"/><path d="M7.5 14l3.1-3.3 2.4 2.1 3.5-3.6"/>',
  "WhatsApp": '<path d="M4.3 19.7l1.2-3.9a8.5 8.5 0 1 1 3.1 3z"/><path d="M9.2 8.2c.1 3.2 3.2 6.4 6.6 6.6l.9-1.6-1.9-1-1 .8c-1-.5-1.9-1.4-2.4-2.4l.8-1-1-1.9z"/>',
  "TikTok": '<path d="M13.5 3.5v11.3a3.7 3.7 0 1 1-3.7-3.7"/><path d="M13.5 3.5c.5 2.7 2.4 4.6 5 4.8"/>',
  "Text or call": '<path d="M7 3.7l2.8-.2 1.5 4.1-2 1.4a10.5 10.5 0 0 0 5.7 5.7l1.4-2 4.1 1.5-.2 2.8a2 2 0 0 1-2.1 1.9A16.6 16.6 0 0 1 5.1 5.8 2 2 0 0 1 7 3.7z"/>',
  "Email": '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.8 7.2L12 13l8.2-5.8"/>',
  "Website form": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.7 2.6 14.3 0 17M12 3.5c-2.6 2.7-2.6 14.3 0 17"/>'
};
const SOURCES = Object.keys(SOURCE_ICON);
const sourceIcon = (name, size) => "<svg class=\"sico\" aria-hidden=\"true\" width=\"" + (size || 16) + "\" height=\"" + (size || 16) + "\" viewBox=\"0 0 24 24\">" + (SOURCE_ICON[name] || "") + "</svg>";
/** How a booking or an enquiry got in touch: its own column, or for an enquiry with none, its contact text where that is clear. */
function sourceOf(x, enquiry) {
  if (txt(x.gotInTouch)) return { source: txt(x.gotInTouch), handle: txt(x.handle) };
  if (!enquiry) return { source: "", handle: "" };
  const c = txt(x.contact), insta = /^instagram\s+(@\S+)/i.exec(c), call = /^phone\s+([\d\s()+-]{7,})$/i.exec(c);
  return insta ? { source: "Instagram", handle: insta[1] } : call ? { source: "Text or call", handle: call[1].trim() }
    : /^[\d\s()+-]{7,}$/.test(c) ? { source: "Text or call", handle: c } : /^\S+@\S+\.\S+$/.test(c) ? { source: "Email", handle: c } : { source: "", handle: "" };
}
/** The small tag: the icon and the name. who = the client's id ("b12", "q5"): then a tap on it changes it. */
function sourceTag(src, who, inRow) {
  const inner = src.source ? sourceIcon(src.source, 14) + "<span>" + esc(src.source) + "</span>" : "<span>How they got in touch?</span>";
  if (!src.source && inRow) return "";
  /* on a list row the row itself is the button: the tag inside it opens the change, the rest of the row the client */
  if (inRow) return "<span class=\"stag\" data-src=\"" + who + "\">" + inner + "</span>";
  return who ? "<button type=\"button\" class=\"stag" + (src.source ? "" : " none") + "\" data-do=\"src-open\" data-who=\"" + who + "\" data-fid=\"src-" + who + "\" aria-haspopup=\"dialog\" aria-label=\"How they got in touch: " + esc(src.source || "not set") + ". Change it\">" + inner + "</button>"
    : src.source ? "<span class=\"stag\">" + inner + "</span>" : "";
}
/* NZ numbers for WhatsApp: 021 555 0101 is +64 21 555 0101 */
const telOf = n => txt(n).replace(/[^\d+]/g, "");
const intlOf = n => { const d = telOf(n).replace(/^\+/, ""); return /^0/.test(d) ? "64" + d.slice(1) : d; };
/**
 * Every way to reach a client, as rows: [label, what it says, [[link words, address], ...]]. A phone can be called or texted,
 * an email emailed, and a handle opens its app.
 */
function contactRows(x, enquiry) {
  const src = sourceOf(x, enquiry), rows = [], seen = new Set();
  const add = (label, value, links) => { const key = label + "|" + value.toLowerCase(); if (!value || seen.has(key)) return; seen.add(key); rows.push([label, value, links]); };
  const phoneOf = v => [["Call", "tel:" + telOf(v)], ["Text", "sms:" + telOf(v)]];
  const handle = src.handle, bare = handle.replace(/^@/, "");
  if (src.source === "Instagram" && handle) add("Instagram", "@" + bare, [["Open", "https://instagram.com/" + encodeURIComponent(bare)]]);
  if (src.source === "Messenger" && handle) add("Messenger", handle, [["Open", "https://m.me/" + encodeURIComponent(bare)]]);
  if (src.source === "TikTok" && handle) add("TikTok", "@" + bare, [["Open", "https://www.tiktok.com/@" + encodeURIComponent(bare)]]);
  if (src.source === "WhatsApp" && handle) add("WhatsApp", handle, [["Open", "https://wa.me/" + intlOf(handle)]]);
  if (src.source === "Text or call" && handle) add("Phone", handle, phoneOf(handle));
  if (src.source === "Email" && /@/.test(handle)) add("Email", handle, [["Email", "mailto:" + handle]]);
  if (!enquiry) {
    if (txt(x.phone)) add("Phone", txt(x.phone), phoneOf(x.phone));
    if (txt(x.email)) add("Email", txt(x.email), [["Email", "mailto:" + txt(x.email)]]);
    if (txt(x.insta)) { const n = txt(x.insta).replace(/^@/, ""); add("Instagram", "@" + n, [["Open", "https://instagram.com/" + encodeURIComponent(n)]]); }
  } else if (!rows.length && txt(x.contact)) add("Contact", txt(x.contact), []);
  return rows;
}
const contactHtml = rows => rows.map(r => "<div class=\"crow\"><span class=\"cl\">" + esc(r[0]) + "</span><span class=\"cv\">" + esc(r[1]) + "</span><span class=\"ca\">" +
  r[2].map(l => "<a class=\"cbtn\" href=\"" + esc(l[1]) + "\"" + (/^https:/.test(l[1]) ? " target=\"_blank\" rel=\"noopener\"" : "") + " aria-label=\"" + esc(l[0] + " " + r[1]) + "\">" + esc(l[0]) + "</a>").join("") + "</span></div>").join("");
/** "Birthday, Sat 12 Dec, INV-0003" and the like. The year shows only when it is not this year. */
const dayOf = iso => iso ? fmt(iso) + (dParts(iso).y !== +todayIso().slice(0, 4) ? " " + dParts(iso).y : "") : "no date yet";

/* ---------- the tabs ---------- */
const ICON = {
  clients: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
  eventday: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 3h6v3H9zM8.5 12.8l2.2 2.2 4.8-4.8"/>',
  videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
  designs: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3"/>',
  prices: '<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.4"/>',
  partners: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M15.5 14.2a4.6 4.6 0 0 1 5 5.3"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'
};
/* next = a tab that is not designed yet (Partners and Settings): it shows what it will have. Every other tab has its screen in SCREENS. */
const TABS = [
  { id: "clients", label: "Clients" },
  { id: "money", label: "Money" },
  { id: "eventday", label: "Event day" },
  { id: "videos", label: "Videos" },
  { id: "designs", label: "Designs" },
  { id: "prices", label: "Prices and packages", group: "Business" },
  { id: "partners", label: "Partners", group: "Business", next: ["Decor businesses that send you clients", "Who referred who, and the 10% fee owed"] },
  { id: "settings", label: "Settings", end: true, next: ["Aadil’s and Sara’s logins", "Email signature and templates"] }
];
/* A screen adds itself here: SCREENS.clients = { html(), fill(), right, side }.
   right = a button for the top right. side = what sits right of the title on a laptop, if not that button.
   A screen with pages of its own (Designs) may also have top() = its own top for a page, cls() = a class for the page
   being drawn, and reset() = go back to its first page, for when its tab is tapped in the menu. */
const SCREENS = {};

function drawMenu() {
  const row = t => {
    const n = t.id === "clients" ? S.toAnswer : t.id === "money" ? S.toChase : 0;
    return "<button type=\"button\" class=\"m-row\" data-do=\"tab\" data-tab=\"" + t.id + "\" data-fid=\"m-" + t.id + "\"" + (S.tab === t.id ? " aria-current=\"page\"" : "") + "><svg aria-hidden=\"true\" width=\"22\" height=\"22\" viewBox=\"0 0 24 24\">" + ICON[t.id] + "</svg><span class=\"lab\">" + t.label + "</span>" +
      (n ? "<span class=\"count\">" + n + (t.id === "clients" ? " to answer" : " to chase") + "</span>" : "") + "</button>";
  };
  $("#menuList").innerHTML = "<div class=\"m-grp\">" + TABS.filter(t => !t.group && !t.end).map(row).join("") + "</div><h2 class=\"m-h\">Business</h2><div class=\"m-grp\">" + TABS.filter(t => t.group).map(row).join("") + "</div>";
  $("#menuEnd").innerHTML = "<div class=\"m-grp\">" + TABS.filter(t => t.end).map(row).join("") + "</div>";
}
function menu(open) {
  $("#menu").classList.toggle("open", open); $("#scrim").classList.toggle("on", open);
  $$("[data-do=menu-open]").forEach(b => b.setAttribute("aria-expanded", open));
  document.body.classList.toggle("lock", open); $("#main").inert = open;
  if (open) focusSoon($("#menu .xbtn")); else if (phone()) { const b = $("[data-do=menu-open]"); if (b) b.focus(); }
}
/** Moves focus to something that is only just becoming visible (the sliding menu), trying again for a few frames. */
function focusSoon(el, tries) {
  el.focus();
  if (document.activeElement !== el && (tries || 0) < 8) requestAnimationFrame(() => { if (menuOpen()) focusSoon(el, (tries || 0) + 1); });
}
const menuOpen = () => $("#menu").classList.contains("open");

/* The Refresh button: at the top of every screen on the phone, and at the top of the side menu on a laptop. */
const REFRESH_ICON = "<svg aria-hidden=\"true\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\"><path d=\"M20 12a8 8 0 1 1-2.4-5.7M20 4.5v4.6h-4.6\"/></svg>";
const REFRESH = "<button class=\"rbtn wm-card\" type=\"button\" data-do=\"refresh\" data-fid=\"refresh\" aria-label=\"Refresh\">" + REFRESH_ICON + "</button>";

/**
 * The top of every screen: menu button, logo and Refresh on the phone, then the title.
 * right = a button for the top right. side = what sits right of the title on a laptop (the same button, unless given).
 * cls = a class for a screen whose design has a different gap under the title.
 */
/** The phone's top bar: menu button, logo and Refresh. */
const barHtml = right => "<div class=\"bar ph\"><div class=\"l\"><button class=\"mbtn\" type=\"button\" data-do=\"menu-open\" aria-label=\"Open menu\" aria-expanded=\"false\" aria-controls=\"menu\"><svg aria-hidden=\"true\" width=\"26\" height=\"26\" viewBox=\"0 0 24 24\"><path d=\"M4 7h16M4 12h16M4 17h16\"/></svg></button>" + LOGO + "</div><div class=\"r\">" + REFRESH + (right || "") + "</div></div>";
function headHtml(title, right, side, cls) {
  return "<div class=\"head" + (cls ? " " + cls : "") + "\">" + barHtml(right) +
    "<div class=\"titlerow\"><h1>" + esc(title) + "</h1>" + (side != null ? side : right ? right.replace("class=\"btn\"", "class=\"btn lp\"") : "") + "</div></div>";
}
const boxHtml = (lead, lines) => "<div class=\"next wm-card\"><p>" + esc(lead) + "</p>" + lines.map(x => "<div><i aria-hidden=\"true\"></i><span>" + esc(x) + "</span></div>").join("") + "</div>";
const footHtml = () => "<p class=\"foot\" id=\"fresh\"></p>";

/** Shows a tab. Draws the whole screen again, so its parts arrive one after another. */
function go(tab) {
  S.tab = tab;
  const t = TABS.find(x => x.id === tab), screen = SCREENS[tab], title = t.label.toLowerCase();
  let body;
  if (t.next || !screen) body = headHtml(title) + (t.next ? boxHtml("We design this screen next. It will have:", t.next) : "") + (tab === "settings" && VERSION ? "<p class=\"ver\">Version " + VERSION + "</p>" : "");
  else if (!S.data) body = headHtml(title, screen.right) + (S.trouble ? troubleHtml() : "<p class=\"wait wm-card\" role=\"status\"><span>Loading your bookings…</span></p>");
  else body = (screen.top && screen.top() || headHtml(title, screen.right, !phone() && screen.side ? screen.side() : null, screen.head)) + troubleHtml() + screen.html() + footHtml();
  /* a screen with no laptop design keeps the phone layout, in a centred column */
  $("#view").innerHTML = "<section class=\"view wm-scroll" + (screen && screen.narrow ? " narrow" : "") + (screen && screen.cls && S.data ? screen.cls() : "") + "\" aria-label=\"" + esc(t.label) + "\">" + body + "</section>";
  if (screen && S.data && !t.next) screen.fill(true);
  drawMenu(); stamp(); scrollTo(0, 0);
}
/** Brings the screen up to date after the data changes, without drawing it all again. */
function refresh() {
  if (S.data) {
    S.T = readTerms(S.data); S.payBy = {}; S.payAll = {};
    (S.data.payments || []).forEach(p => { (S.payAll[p.invoice] = S.payAll[p.invoice] || []).push(p); if (!p.removed) (S.payBy[p.invoice] = S.payBy[p.invoice] || []).push(p); });      /* a removed row stays for History, and counts for nothing */
    build(S.data);
  }
  const screen = SCREENS[S.tab];
  if (screen && S.data && $("#view [data-screen=" + S.tab + "]")) keepFocus(() => { drawMenu(); screen.fill(); });
  else keepFocus(() => go(S.tab));
  stamp();
  if (dlg.open && SHEETS[sheetKind] && SHEETS[sheetKind].sync) SHEETS[sheetKind].sync();
}
function keepFocus(fn) {
  const a = document.activeElement, id = a && a.dataset && a.dataset.fid; fn();
  if (id) { const el = document.querySelector("[data-fid=\"" + id + "\"]"); if (el) el.focus(); }
}
function troubleHtml() {
  const lines = S.trouble ? [S.trouble] : (S.data && S.data.problems || []).slice(0, 4);
  if (!lines.length) return "";
  return "<p class=\"note\" role=\"status\">" + (S.trouble ? esc(S.trouble) + " <button class=\"linkbtn\" type=\"button\" data-do=\"refresh\">Try again</button>"
    : "The tracker is missing something the app needs. Tell Aadil: " + esc(lines.join(" "))) + "</p>";
}
function stamp() {
  const el = $("#fresh"); if (!el) return;
  el.textContent = DEMO ? "Sample data, made up for testing the screens. Nothing is saved." : "Read from the tracker at " + clock(S.readAt) + ".";
}

/* ---------- sheets: one <dialog>, a bottom sheet on the phone and a centred box on a laptop ---------- */
const dlg = $("#dlg");
const SHEETS = {};                    /* a sheet may add { sync() } here, to keep itself up to date while it is open */
let sheetKind = "";
const GRAB = "<div class=\"grab\" aria-hidden=\"true\"></div>";
function show(kind, html, cls) {
  sheetKind = kind; dlg.className = "wm-sheet" + (cls ? " " + cls : "") + (dlg.open && dlg.classList.contains("held") ? " held" : "");
  const t = $("#toast"); if (t.parentNode === dlg) $("#app").appendChild(t);              /* the message survives the sheet being drawn again */
  dlg.innerHTML = GRAB + html;      /* a sheet that has been swiped and sprung back doesn't slide in again when it is redrawn */
  if (!dlg.open) { lockPage(); dlg.showModal(); dlg.scrollTop = 0; }
  placeToast();
}
function hide() { if (dlg.open) { const t = $("#toast"); if (t.parentNode === dlg) $("#app").appendChild(t); dlg.close(); unlockPage(); placeToast(); } }        /* the page is let go at once: what is tapped next may scroll it */
dlg.addEventListener("close", () => { const t = $("#toast"); if (t.parentNode === dlg) { $("#app").appendChild(t); placeToast(true); } sheetKind = ""; dlg.innerHTML = ""; dlg.removeAttribute("style"); unlockPage(); });   /* Escape closes it without hide(); a message showing in it moves to the page */
/* While a sheet is open the page behind it never moves: it is held where it was, and put back exactly there when the sheet
   closes. (The sheet's own scrolling stays inside it: overscroll-behavior in app.css.) */
let pageAt = null;
function lockPage() {
  if (pageAt !== null) return;
  const root = document.documentElement, bar = innerWidth - root.clientWidth;      /* a laptop's scroll bar goes while it is held: the page keeps its width */
  pageAt = scrollY; root.classList.add("held"); if (bar > 0) root.style.paddingRight = bar + "px";
}
function unlockPage() {
  if (pageAt === null) return;
  const root = document.documentElement, y = pageAt; pageAt = null;
  root.classList.remove("held"); root.style.paddingRight = ""; scrollTo(0, y);
}
/** Where the page is scrolled to, even while a sheet holds it. */
const pageY = () => pageAt === null ? scrollY : pageAt;

/* ---------- swipe a sheet down to close it (phone; the laptop's centred box stays as it is) ----------
   Drag the grab bar, or drag anywhere on the sheet when its content is at the top: it follows the finger 1:1. Dragging up
   past its open position resists. Let go after more than a quarter of its height, or with a quick flick down, and it slides
   off the bottom at the finger's speed and closes; otherwise it springs back up. With reduced motion it fades. */
const drag = { armed: false, on: false, outside: false, grab: false, leaving: false, start: 0, last: 0, at: 0, v: 0, dy: 0, h: 0 };
const pull = d => -40 * (1 - 1 / (d / 90 + 1));                       /* past the open position: a rubber band, at most 40 px */
dlg.addEventListener("touchstart", e => {
  if (!dlg.open || !phone() || e.touches.length !== 1 || drag.leaving) return;
  const t = e.touches[0], r = dlg.getBoundingClientRect();
  drag.outside = t.clientY < r.top;                                     /* on the dark layer above the sheet */
  drag.grab = t.clientY - r.top < 26 || !!(e.target.closest && e.target.closest(".grab"));    /* the grab bar, or the strip it sits in */
  drag.armed = !drag.outside && (drag.grab || dlg.scrollTop <= 0);
  drag.on = false; drag.start = drag.last = t.clientY; drag.at = e.timeStamp; drag.v = 0; drag.dy = 0; drag.h = r.height;
}, { passive: true });
dlg.addEventListener("touchmove", e => {
  if (!dlg.open) return;
  if (drag.outside) { if (e.cancelable) e.preventDefault(); return; }  /* a drag on the dark layer never scrolls the page */
  if (!drag.armed || e.touches.length !== 1) return;
  const y = e.touches[0].clientY, dy = y - drag.start;
  if (!drag.on) {
    if (Math.abs(dy) < 6) return;
    if (dy < 0 && !drag.grab) { drag.armed = false; return; }           /* up on the content: it scrolls as usual */
    drag.on = true; dlg.classList.add("held");
  }
  if (e.cancelable) e.preventDefault();
  if (e.timeStamp > drag.at) drag.v = (y - drag.last) / (e.timeStamp - drag.at);
  drag.last = y; drag.at = e.timeStamp; drag.dy = dy;
  dlg.style.transition = "none"; dlg.style.transform = "translateY(" + (dy >= 0 ? dy : pull(-dy)) + "px)";
}, { passive: false });
const dragEnd = e => {
  const was = drag.on; drag.on = false; drag.armed = false; drag.outside = false;
  if (!was || !dlg.open) return;
  const v = e.timeStamp - drag.at > 100 ? 0 : drag.v;                  /* the finger stopped before it let go: no flick */
  if (drag.dy > drag.h * 0.25 || (v > 0.5 && drag.dy > 10)) closeSheetDown(v);
  else { dlg.style.transition = matchMedia("(prefers-reduced-motion:reduce)").matches ? "none" : "transform 380ms cubic-bezier(.32,.72,0,1)"; dlg.style.transform = "translateY(0)"; }      /* back up */
};
dlg.addEventListener("touchend", dragEnd); dlg.addEventListener("touchcancel", dragEnd);
/** Slides an open sheet off the bottom, the way it came in, at the finger's speed (px per ms), then closes it. */
function closeSheetDown(v) {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) {
    dlg.style.transition = "opacity 200ms ease"; dlg.style.opacity = "0"; drag.leaving = true;
    setTimeout(() => { drag.leaving = false; hide(); }, 210); return;
  }
  const from = Math.max(0, drag.dy), to = dlg.getBoundingClientRect().height + 40, fast = v > 0.3;
  const ms = fast ? Math.max(120, Math.min(360, (to - from) / v)) : 280;
  dlg.style.transition = "transform " + ms + "ms " + (fast ? "linear" : "cubic-bezier(.32,.72,0,1)"); dlg.style.transform = "translateY(" + to + "px)"; drag.leaving = true;
  setTimeout(() => { drag.leaving = false; hide(); }, ms + 20);
}

/* ---------- talking to the tracker ---------- */
async function server(fn, arg) {
  if (DEMO) return demoServer(fn, arg);
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ k: KEY, fn, arg }), credentials: "omit", redirect: "follow" });
  if (!res.ok) throw new Error("");
  const j = await res.json();
  if (!j.ok) { const x = new Error(j.error || ""); x.told = true; throw x; }
  return typeof j.result === "string" ? JSON.parse(j.result) : j.result;
}
/** Why something failed, in plain words. The back end's own reasons are kept. A dropped connection gets the usual line. */
const why = x => x && x.told && x.message ? x.message.replace(/^Error:\s*/, "") : "Check your internet and try again.";

function apply(data) {
  S.data = data; S.readAt = data.readAt || Date.now(); S.trouble = ""; refresh();
  if (typeof dzFresh === "function") setTimeout(dzFresh, 0);           /* fresh data: the brief follows the tracker, and words that didn't save are tried again (designs.js) */
}
let busy = false;
/** Reads everything from the tracker again. asked = someone pressed Refresh, so say when it is done. */
async function load(asked) {
  if (!DEMO && !KEY) { S.trouble = "This device doesn’t have the key yet. Open the full private link you were sent, then add that page to your home screen."; go(S.tab); return; }
  if (saving) { mixed = true; wanted = wanted || !!asked; return; }        /* a change is still saving: read the tracker once it has landed */
  if (busy) return; busy = true; $("#app").classList.add("reading");
  try {
    const data = (await server("getData")).data;
    if (saving) { mixed = true; wanted = wanted || !!asked; return; }      /* something changed while this was being read, so it is already out of date */
    apply(data);
    if (asked) toast(DEMO ? "Up to date." : "Up to date. Read from the tracker at " + clock(S.readAt) + ".");
  } catch (x) {
    if (S.data) toast("Couldn’t read the tracker. " + why(x));
    else { S.trouble = "Couldn’t read the tracker. " + why(x); go(S.tab); }
  }
  finally { busy = false; $("#app").classList.remove("reading"); }
}

/**
 * Makes a change: it shows on screen straight away, then saves.
 * change(data) edits the app's copy. If the save fails the screen goes back and says so.
 * Gives back the back end's answer, or null if it didn't save.
 */
let saving = 0, answers = 0, newest = null, mixed = false, wanted = false;
async function save(fn, arg, change) {
  const before = copy(S.data);
  change(S.data); saving++; answers++; refresh();
  try {
    const res = await server(fn, arg);
    if (res && res.data) newest = res.data;
    return res || {};
  } catch (x) {
    if (saving > 1) mixed = true; else { S.data = before; refresh(); }
    say("That didn’t save. " + why(x));
    return null;
  } finally {
    saving--; answers--; settle();
  }
}
/** Once every save has come back, show what the tracker now says. */
function settle() {
  if (saving) return;
  setTimeout(reloadSoon, 0);
  const again = mixed, data = newest, asked = wanted;
  newest = null; mixed = false; wanted = false;
  if (again) load(asked); else if (data) apply(data);
}
/**
 * For things that are tapped quickly, such as ticks: the change shows at once and saves behind the scenes.
 * Saves for the same thing go one at a time, and only the newest is sent, so a late answer can't undo a newer tap.
 * value = what to show. get() reads what the screen shows now. set(value) shows a value.
 * If a save fails the screen goes back to what was last saved, and says so.
 */
const lanes = {};
async function saveLatest(key, fn, arg, value, get, set) {
  const lane = lanes[key] || (lanes[key] = { busy: false, next: null, saved: undefined });
  if (!lane.busy) lane.saved = get();
  set(value); refresh();
  if (lane.busy) { lane.next = { arg, value }; return; }
  lane.busy = true; saving++;
  let job = { arg, value }, failed = null;
  while (job) {
    lane.next = null;
    try { await server(fn, job.arg); lane.saved = job.value; if (newest || answers) mixed = true; }      /* an answer read before this landed would undo it: read the tracker again instead */
    catch (x) { failed = x; break; }
    job = lane.next;
  }
  lane.busy = false; lane.next = null; saving--;
  if (failed) { set(lane.saved); refresh(); say("That didn’t save. " + why(failed)); }
  settle();
  return !failed;                       /* true once the newest value has saved; a tap that joined a save already on its way gives back nothing */
}

/* ---------- messages ---------- */
let toastTimer, toastUndo = null;
/**
 * A message at the bottom. undo = what Undo does: then the message has an Undo button and stays about 8 seconds.
 * While a sheet is open the message sits inside it, because everything outside an open sheet can't be tapped.
 */
function toast(msg, undo) {
  const t = $("#toast"); toastUndo = undo || null;
  t.innerHTML = "<span>" + esc(msg) + "</span>" + (undo ? "<button class=\"tundo\" type=\"button\" data-do=\"undo\" data-fid=\"undo\">Undo</button>" : "");
  t.classList.toggle("hasundo", !!undo);
  placeToast(true);
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 8000 : 5000);
}
function hideToast() {
  const t = $("#toast"); toastUndo = null; t.classList.remove("on", "hasundo");
  setTimeout(() => { try { if (!t.classList.contains("on") && t.matches(":popover-open")) t.hidePopover(); } catch (e) {} }, 250);
}
/** Puts the message where it can be tapped: in the open sheet, or on the page. again = show it (again) where it now is. */
function placeToast(again) {
  const t = $("#toast"), home = dlg.open ? dlg : $("#app"), was = t.classList.contains("on");
  if (t.parentNode !== home) home.appendChild(t);           /* moving it closes it, so it opens again below */
  if (!again && !was) return;
  try { if (t.showPopover) { if (t.matches(":popover-open")) t.hidePopover(); t.showPopover(); } } catch (e) {}
}
/** A message about a save: inside the open sheet if it has room for one, otherwise as a toast. */
function say(msg) { const slot = dlg.open && $("#err", dlg); if (slot) slot.textContent = msg; else toast(msg); }

/* ---------- taps ---------- */
const TAPS = {
  "tab": el => { const screen = SCREENS[el.dataset.tab]; if (screen && screen.reset) screen.reset(); S.backTo = null; go(el.dataset.tab); if (menuOpen()) menu(false); },      /* a tab chosen from the menu forgets any way back */
  "menu-open": () => menu(true),
  "menu-close": () => menu(false),
  "close": () => hide(),
  "undo": () => { const u = toastUndo; hideToast(); if (u) u(); },
  "refresh": () => { if (!S.data) { S.trouble = ""; go(S.tab); } load(true); }
};
document.addEventListener("click", e => {
  if (e.target === dlg) {                /* a tap on the dark layer around the sheet closes it */
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) hide();
    return;
  }
  const el = e.target.closest("[data-do]");
  if (el && TAPS[el.dataset.do]) TAPS[el.dataset.do](el, e);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !dlg.open && menuOpen()) menu(false); });
matchMedia("(min-width:1000px)").addEventListener("change", () => {
  $("#menu").classList.remove("open"); $("#scrim").classList.remove("on"); document.body.classList.remove("lock"); $("#main").inert = false;
  hide(); go(S.tab);
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.data && !DEMO && !dlg.open && !saving && Date.now() - S.readAt > 120000) load(); });

/* ---------- start ---------- */
function start() {
  $$(".ruler").forEach(el => el.setAttribute("d", RULER));
  if (/[?&]fresh=/.test(location.search)) { try { history.replaceState(null, "", location.pathname + withoutFresh(location.search) + location.hash); } catch (e) {} }
  go(S.tab);
  load();
  checkVersion();
}

/* ---------- staying up to date ----------
   A phone can keep an old copy of the app. Its version is the ?v= number index.html loads app.js with. When the app
   opens or comes back to the front, it reads index.html afresh; if that names a newer version, the app reloads itself
   once, at a fresh address so the old copy can't be used again. It waits while a sheet is open, while anything is
   being typed or saved, and while part of a brief hasn't saved, so nothing typed is lost. */
const VERSION = (/[?&]v=(\d+)/.exec((document.currentScript || {}).src || "") || [])[1] || "";
let newer = "", checking = false;
/** The page address's ?… part without the fresh=… marker the reload adds. */
const withoutFresh = search => search.replace(/([?&])fresh=\d*(&|$)/, (all, before, after) => after ? before : "").replace(/^&/, "?").replace(/^\?$/, "");      /* a lone "?" left over goes too */
async function checkVersion() {
  if (!VERSION || checking) return;
  checking = true;
  try {
    const res = await fetch("index.html?check=" + Date.now(), { cache: "no-store" });
    const m = res.ok ? /app\.js\?v=(\d+)/.exec(await res.text()) : null;
    if (m && +m[1] > +VERSION) { newer = m[1]; reloadSoon(); }
  } catch (x) { /* no internet: try again next time */ }
  finally { checking = false; }
}
const busyTyping = () => {
  const a = document.activeElement;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return true;
  return typeof dzWaiting === "function" && !!S.data && dzWaiting().length > 0;      /* brief words that didn't save, whatever tab is open */
};
function reloadSoon() {
  if (!newer || dlg.open || saving || busyTyping()) return;           /* tried again when the sheet closes, the typing stops or a save lands */
  let tried = {}; try { tried = JSON.parse(sessionStorage.getItem("wmhb2.fresh") || "{}"); } catch (e) {}
  if (tried[newer]) return;                                            /* once only for each version, so it can never go round in circles */
  tried[newer] = 1; try { sessionStorage.setItem("wmhb2.fresh", JSON.stringify(tried)); } catch (e) {}
  const search = withoutFresh(location.search);
  location.replace(location.pathname + (search ? search + "&" : "?") + "fresh=" + newer + location.hash);
}
dlg.addEventListener("close", () => setTimeout(reloadSoon, 0));
addEventListener("online", () => { if (typeof dzWaiting === "function" && S.data && dzWaiting().length) load(); });    /* back online: read the tracker afresh, which tries brief words that didn't save again (designs.js) */
document.addEventListener("focusout", () => setTimeout(reloadSoon, 400));
/* Phone: the pinned top bar gets its hairline once the page has scrolled under it, and fades to about half while the page
   scrolls down, so it hides less of it. Scrolling up a little, or reaching the top, brings it back (app.css). */
let barFrom = 0;
const markScrolled = () => {
  const root = document.documentElement, y = Math.max(0, scrollY);
  root.classList.toggle("scrolled", y > 0);
  if (root.classList.contains("held")) return;                            /* a sheet is open: the page isn't really moving */
  if (y <= 0) { root.classList.remove("dimbar"); barFrom = 0; return; }
  if (y > barFrom + 12 && y > 60) { root.classList.add("dimbar"); barFrom = y; }
  else if (y < barFrom - 24) { root.classList.remove("dimbar"); barFrom = y; }
  else if (root.classList.contains("dimbar") ? y > barFrom : y < barFrom) barFrom = y;      /* keep measuring from the turn */
};
addEventListener("scroll", markScrolled, { passive: true }); markScrolled();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkVersion(); });
