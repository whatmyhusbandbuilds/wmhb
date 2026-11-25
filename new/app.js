"use strict";
/* wmhb app: the frame. The side menu, the tabs, the sheets, and talking to the tracker.
   Each screen lives in its own file beside this one (clients.js and so on). */

/* The /exec address of the new back end ("wmhb app 2") goes here once it is deployed.
   While it is empty the page shows made-up sample data and saves nothing. */
const API = "";
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
const S = { tab: "clients", data: null, readAt: 0, trouble: "" };

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
/* next = a tab that is not designed yet (Partners and Settings). later = a tab that is designed, and built in a later stage. */
const TABS = [
  { id: "clients", label: "Clients" },
  { id: "money", label: "Money", later: "stage 2" },
  { id: "eventday", label: "Event day", later: "stage 3" },
  { id: "videos", label: "Videos", later: "stage 5" },
  { id: "designs", label: "Designs", later: "stage 4" },
  { id: "prices", label: "Prices and packages", group: "Business", later: "stage 5" },
  { id: "partners", label: "Partners", group: "Business", next: ["Decor businesses that send you clients", "Who referred who, and the 10% fee owed"] },
  { id: "settings", label: "Settings", end: true, next: ["Aadil’s and Sara’s logins", "Email signature and templates"] }
];
/* A screen adds itself here: SCREENS.clients = { html(), fill(), right } */
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

/** The top of every screen: menu button and logo on the phone, then the title. right = a button for the right-hand side. */
function headHtml(title, right) {
  return "<div class=\"head\"><div class=\"bar ph\"><div class=\"l\"><button class=\"mbtn\" type=\"button\" data-do=\"menu-open\" aria-label=\"Open menu\" aria-expanded=\"false\" aria-controls=\"menu\"><svg aria-hidden=\"true\" width=\"26\" height=\"26\" viewBox=\"0 0 24 24\"><path d=\"M4 7h16M4 12h16M4 17h16\"/></svg></button>" + LOGO + "</div>" + (right || "") + "</div>" +
    "<div class=\"titlerow\"><h1>" + esc(title) + "</h1>" + (right ? right.replace("class=\"btn\"", "class=\"btn lp\"") : "") + "</div></div>";
}
const boxHtml = (lead, lines) => "<div class=\"next wm-card\"><p>" + esc(lead) + "</p>" + lines.map(x => "<div><i aria-hidden=\"true\"></i><span>" + esc(x) + "</span></div>").join("") + "</div>";
const footHtml = () => "<div class=\"foot\"><span id=\"fresh\" role=\"status\"></span><button class=\"linkbtn\" type=\"button\" data-do=\"refresh\">Refresh</button></div>";

/** Shows a tab. Draws the whole screen again, so its parts arrive one after another. */
function go(tab) {
  S.tab = tab;
  const t = TABS.find(x => x.id === tab), screen = SCREENS[tab], title = t.label.toLowerCase();
  let body;
  if (t.next) body = headHtml(title) + boxHtml("We design this screen next. It will have:", t.next);
  else if (!screen) body = headHtml(title) + boxHtml("This screen is designed and not built yet.", ["It gets built in " + t.later + "."]);
  else if (!S.data) body = headHtml(title, screen.right) + (S.trouble ? troubleHtml() : "<p class=\"wait wm-card\" role=\"status\"><span>Loading your bookings…</span></p>");
  else body = headHtml(title, screen.right) + troubleHtml() + screen.html() + footHtml();
  $("#view").innerHTML = "<section class=\"view wm-scroll\" aria-label=\"" + esc(t.label) + "\">" + body + "</section>";
  if (screen && S.data && !t.next) screen.fill();
  drawMenu(); stamp(); scrollTo(0, 0);
}
/** Brings the screen up to date after the data changes, without drawing it all again. */
function refresh() {
  if (S.data) build(S.data);
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
  sheetKind = kind; dlg.className = "wm-sheet" + (cls ? " " + cls : ""); dlg.innerHTML = GRAB + html;
  if (!dlg.open) { dlg.showModal(); dlg.scrollTop = 0; }
}
function hide() { if (dlg.open) dlg.close(); }
dlg.addEventListener("close", () => { sheetKind = ""; dlg.innerHTML = ""; });

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

function apply(data) { S.data = data; S.readAt = data.readAt || Date.now(); S.trouble = ""; refresh(); }
let busy = false;
async function load() {
  if (!DEMO && !KEY) { S.trouble = "This device doesn’t have the key yet. Open the full private link you were sent, then add that page to your home screen."; go(S.tab); return; }
  if (busy) return; busy = true;
  try { apply((await server("getData")).data); }
  catch (x) {
    if (S.data) toast("Couldn’t read the tracker. " + why(x));
    else { S.trouble = "Couldn’t read the tracker. " + why(x); go(S.tab); }
  }
  finally { busy = false; }
}

/**
 * Makes a change: it shows on screen straight away, then saves.
 * change(data) edits the app's copy. If the save fails the screen goes back and says so.
 * Gives back the back end's answer, or null if it didn't save.
 */
let saving = 0, newest = null, mixed = false;
async function save(fn, arg, change) {
  const before = copy(S.data);
  change(S.data); saving++; refresh();
  try {
    const res = await server(fn, arg);
    if (res && res.data) newest = res.data;
    return res || {};
  } catch (x) {
    if (saving > 1) mixed = true; else { S.data = before; refresh(); }
    say("That didn’t save. " + why(x));
    return null;
  } finally {
    saving--;
    if (!saving) {                       /* once every save has come back, show what the tracker now says */
      if (mixed) load(); else if (newest) apply(newest);
      newest = null; mixed = false;
    }
  }
}

/* ---------- messages ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg;
  try { if (t.showPopover) { if (t.matches(":popover-open")) t.hidePopover(); t.showPopover(); } } catch (e) {}
  requestAnimationFrame(() => t.classList.add("on"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("on"); setTimeout(() => { try { if (!t.classList.contains("on") && t.matches(":popover-open")) t.hidePopover(); } catch (e) {} }, 250); }, 5000);
}
/** A message about a save: inside the open sheet if it has room for one, otherwise as a toast. */
function say(msg) { const slot = dlg.open && $("#err", dlg); if (slot) slot.textContent = msg; else toast(msg); }

/* ---------- taps ---------- */
const TAPS = {
  "tab": el => { go(el.dataset.tab); if (menuOpen()) menu(false); },
  "menu-open": () => menu(true),
  "menu-close": () => menu(false),
  "close": () => hide(),
  "refresh": () => { if (!S.data) { S.trouble = ""; go(S.tab); } load(); }
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
  go(S.tab);
  load();
}
