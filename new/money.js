"use strict";
/* wmhb app: the Money screen. Income, expenses and profit; what is still to come; each client's payments; expenses; bonds.
   Bonds are never income. A payment is a row on the tracker's Payments tab, and an expense is a row on its Expenses tab. */

{ const t = todayIso(); Object.assign(S, { period: "all", py: +t.slice(0, 4), pm: [+t.slice(0, 4), +t.slice(5, 7) - 1], mopen: { coming: null, done: false }, xopen: false }); }
/* The expense types come from the tracker's Settings tab. These are only used if it sends none. */
const EXPENSE_TYPES = ["Equipment", "Running costs", "Marketing", "Software", "Contractor"];
const expenseTypes = () => { const fromTracker = (S.data.lists || {})["Expense type"]; return fromTracker && fromTracker.length ? fromTracker : EXPENSE_TYPES; };
/* The usual expenses on the "add an expense" sheet, and the type each one fills in. */
const USUAL = [["Fuel", "Running costs"], ["Board sticker", "Running costs"], ["Power station hire", "Running costs"], ["Advertising", "Marketing"]];

/* ---------- the period: all time, one year or one month ---------- */
const periodKey = () => S.period === "year" ? String(S.py) : isoOf(S.pm[0], S.pm[1], 1).slice(0, 7);
const inPeriod = iso => S.period === "all" ? true : !!iso && iso.indexOf(periodKey()) === 0;
const periodName = () => S.period === "year" ? String(S.py) : MONTHS[S.pm[1]] + " " + S.pm[0];

/* ---------- the sums ---------- */
function moneySums() {
  const pays = S.data.payments || [], costs = S.data.expenses || [], hire = pays.filter(p => p.what === "Hire");
  const books = (S.data.bookings || []).filter(live).map(b => ({ b, f: moneyOf(b) }));
  const all = { income: sum(hire), spent: sum(costs), held: sum(pays.filter(p => p.what === "Bond in")) - sum(pays.filter(p => p.what === "Bond back")), expected: books.reduce((s, x) => s + x.f.owing, 0) };
  all.bank = all.income - all.spent + all.held;
  const income = sum(hire.filter(p => inPeriod(p.date))), spent = sum(costs.filter(x => inPeriod(x.date)));
  const expected = S.period === "all" ? all.expected : books.reduce((s, x) => s + sum(x.f.plan.filter(p => inPeriod(p.due))), 0);
  return { all, income, spent, profit: income - spent, expected, books };
}
/** The tracker keeps its own totals on the Money tab. If the app's sums differ from them, say so rather than show a wrong number quietly. */
function totalsNote(all) {
  const r = S.data.reports; if (!r || saving) return "";
  const off = [["Income", all.income, r.income], ["Expenses", all.spent, r.expenses], ["Expected income", all.expected, r.expected], ["Bonds held", all.held, r.bondsHeld], ["Should be in the bank", all.bank, r.bank]]
    .filter(x => Math.abs(x[1] - num(x[2])) >= 0.5);
  return off.length ? "<p class=\"note\" role=\"status\">The app’s totals don’t match the tracker’s Money tab. Tell Aadil. " + esc(off.map(x => x[0] + ": the app says " + money(x[1]) + ", the tracker says " + money(num(x[2]))).join(". ")) + ".</p>" : "";
}

/* ---------- the screen ---------- */
const periodBox = "<div class=\"segbox\" id=\"m-period\"></div>";
SCREENS.money = {
  head: "h8",
  side: () => periodBox,
  html() {
    if (S.mopen.coming == null) S.mopen.coming = !phone();          /* on a laptop there is room, so Coming up starts open */
    return (phone() ? periodBox : "") + "<div id=\"m-note\" data-screen=\"money\"></div><div id=\"m-top\"></div>" +
      "<div class=\"mcols\"><div class=\"mleft\"><h3 class=\"mh\">Clients</h3><div class=\"msecs\" id=\"m-clients\"></div></div>" +
      "<div class=\"mright\"><div id=\"m-costs\"></div><div id=\"m-bonds\"></div></div></div>";
  },
  fill(first) {
    const M = moneySums();
    $("#m-note").innerHTML = totalsNote(M.all);
    drawPeriod(); drawTop(M); drawMoneyClients(M, first); drawCosts(); drawBonds(M);
  }
};

function drawPeriod() {
  const box = $("#m-period"); if (!box) return;
  if (!box.firstChild) box.innerHTML = "<div class=\"segs wm-track\" role=\"group\" aria-label=\"Show money for\">" + [["all", "All time"], ["year", "Year"], ["month", "Month"]].map(p =>
    "<button class=\"wm-seg\" type=\"button\" data-do=\"period\" data-period=\"" + p[0] + "\" data-fid=\"p-" + p[0] + "\">" + p[1] + "</button>").join("") + "</div>" +
    "<div class=\"pbar\" id=\"m-pbar\"><button type=\"button\" data-do=\"pstep\" data-by=\"-1\" data-fid=\"p-prev\" aria-label=\"Earlier\">&lsaquo;</button><div id=\"m-pname\" aria-live=\"polite\"></div><button type=\"button\" data-do=\"pstep\" data-by=\"1\" data-fid=\"p-next\" aria-label=\"Later\">&rsaquo;</button></div>";
  $$("[data-period]", box).forEach(b => b.setAttribute("aria-pressed", S.period === b.dataset.period));
  $("#m-pbar").hidden = S.period === "all"; $("#m-pname").textContent = S.period === "all" ? "" : periodName();
}
function drawTop(M) {
  const expectedNote = S.period === "all" ? "Still to be paid by clients who have booked. Bonds are not counted." : "Due from booked clients in " + periodName() + ". Bonds are not counted.";
  const bank = "<div class=\"bank wm-card\"><div class=\"t\"><div>Should be in the bank</div><div>Income minus expenses, plus bonds you hold. All time. If it matches your bank balance, everything is logged.</div></div><div class=\"v\">" + money(M.all.bank) + "</div></div>";
  $("#m-top").innerHTML = phone()
    ? "<div class=\"nums\"><div><div class=\"nl\">Income</div><div class=\"nv\">" + money(M.income) + "</div><div class=\"ns\">received</div></div><div><div class=\"nl\">Expenses</div><div class=\"nv\">" + money(M.spent) + "</div><div class=\"ns\">spent</div></div><div><div class=\"nl\">Profit</div><div class=\"nv\">" + money(M.profit) + "</div><div class=\"ns\">income minus expenses</div></div></div>" +
      "<div class=\"expd wm-card\"><div class=\"nl\">Expected income</div><div class=\"nv\">" + money(M.expected) + "</div><div class=\"ns\">" + expectedNote + "</div></div>" + bank
    : "<div class=\"boxes\">" + [["Income", M.income, "Money received"], ["Expenses", M.spent, "Money spent"], ["Profit", M.profit, "Income minus expenses"], ["Expected income", M.expected, expectedNote]].map((x, n) =>
      "<div class=\"wm-card" + (n === 3 ? " strong" : "") + "\"><div class=\"nl\">" + x[0] + "</div><div class=\"nv\">" + money(x[1]) + "</div><div class=\"ns\">" + x[2] + "</div></div>").join("") + "</div>" + bank;
}

/* ---------- clients: coming up, and completed ---------- */
function statusPill(f) {
  if (f.done) return "<span class=\"pill2 over\">Completed (" + (f.owing > 0 ? money(f.owing) + " to pay" : "paid") + ")</span>";
  if (f.kind === "waiting") return "<span class=\"pill2 waiting\">Waiting on deposit</span>";
  return "<span class=\"pill2\">Booked (" + (f.owing > 0 ? money(f.owing) + " to pay" : "paid") + ")</span>";
}
const nextLine = f => f.next ? "Next: " + f.next.what + (f.next.amount != null ? " " + money(f.next.amount) : "") + (f.next.due ? " due " + fmt(f.next.due) : "") : "";
const bondLine = f => f.bond === "none" ? "No bond" : f.bond === "back" ? "Bond: given back" : f.bond === "held" ? "Bond: holding " + money(f.bondHeld) : "Bond: not paid yet";
const paidLine = f => money(f.received) + " of " + money(f.total) + " paid";
function clientCard(x, grow) {
  const b = x.b, f = x.f, part = f.total > 0 ? Math.max(0, Math.min(100, Math.round(f.received / f.total * 100))) : 0, next = nextLine(f);
  return "<button class=\"ccard wm-card\" type=\"button\" data-do=\"client\" data-row=\"" + b.row + "\" data-fid=\"cc-" + b.row + "\" aria-haspopup=\"dialog\">" +
    "<span class=\"top\"><span><span class=\"n\">" + esc(b.client) + "</span><span class=\"s\">" + esc([txt(b.type), dayOf(f.date)].filter(Boolean).join(", ")) + "</span></span><span class=\"inv\">" + esc(b.invoice) + "</span></span>" +
    "<span class=\"track\" role=\"img\" aria-label=\"" + paidLine(f) + "\"><span class=\"bar" + (grow ? " wm-bar" : "") + "\" style=\"width:" + part + "%\"></span></span>" +
    "<span class=\"line\"><span>" + paidLine(f) + "</span>" + statusPill(f) + "</span>" +
    "<span class=\"ft\">" + (next ? "<span>" + esc(next) + "</span>" : "") + "<span class=\"bd\">" + bondLine(f) + "</span></span></button>";
}
const byDate = (a, b) => (a.f.date || "9") < (b.f.date || "9") ? -1 : (a.f.date || "9") > (b.f.date || "9") ? 1 : a.b.row - b.b.row;
function drawMoneyClients(M, grow) {
  const shown = M.books.filter(x => S.period === "all" || inPeriod(x.f.date)).sort(byDate);
  const sec = (id, title, list) => {
    const open = !!S.mopen[id], owe = list.filter(x => x.f.owing > 0).length;
    const line = list.length + " client" + (list.length === 1 ? "" : "s") + (list.length ? ", " + (owe ? owe + " still to pay" : "all paid") : "");
    return "<div class=\"msec\"><button class=\"acch\" type=\"button\" data-do=\"msec\" data-sec=\"" + id + "\" data-fid=\"ms-" + id + "\" aria-expanded=\"" + open + "\"><span class=\"t\"><span>" + title + "</span><span>" + line + "</span></span>" + PLUS + "</button>" +
      "<div class=\"coll" + (open ? " open" : "") + "\" id=\"ms-" + id + "\"><div><div class=\"mcards\">" + list.map(x => clientCard(x, grow && open)).join("") + "</div></div></div></div>";
  };
  $("#m-clients").innerHTML = sec("coming", "Coming up", shown.filter(x => !x.f.done)) + sec("done", "Completed", shown.filter(x => x.f.done));
}

/* ---------- expenses ---------- */
function drawCosts() {
  const costs = (S.data.expenses || []).filter(x => inPeriod(x.date)), n = costs.length;
  const listed = expenseTypes(), types = listed.concat(costs.map(x => txt(x.type)).filter((t, i, a) => t && !listed.includes(t) && a.indexOf(t) === i));
  const newest = costs.slice().sort((a, b) => (a.date || "") < (b.date || "") ? 1 : (a.date || "") > (b.date || "") ? -1 : b.row - a.row);
  $("#m-costs").innerHTML = "<div class=\"xhead\"><h3>Expenses</h3><button class=\"cardbtn wm-card\" type=\"button\" data-do=\"cost-new\" data-fid=\"cost-new\" aria-haspopup=\"dialog\">Add an expense</button></div><div class=\"xrows\">" +
    types.map(t => { const of = costs.filter(x => txt(x.type) === t); return "<div class=\"xrow\"><span class=\"n\">" + esc(t) + "</span><span class=\"c\">" + of.length + " item" + (of.length === 1 ? "" : "s") + "</span><span class=\"v\">" + money(sum(of)) + "</span></div>"; }).join("") +
    (n ? "<button class=\"linkbtn xall\" type=\"button\" data-do=\"cost-all\" data-fid=\"cost-all\" aria-expanded=\"" + S.xopen + "\">" + (S.xopen ? "Hide the list" : "Show all " + n) + "</button>" +
      "<div class=\"coll" + (S.xopen ? " open" : "") + "\" id=\"x-all\"><div><div>" + newest.map(x =>
        "<div class=\"xitem\"><span class=\"d\">" + (x.date ? fmt(x.date) : "") + "</span><span class=\"w\"><span>" + esc(x.what) + "</span><span>" + esc(txt(x.type) + (txt(x.invoice) ? ", for " + x.invoice : "")) + "</span></span><span class=\"v\">" + money(num(x.amount)) + "</span></div>").join("") + "</div></div></div>" : "") + "</div>";
}

/* ---------- bonds, held apart ---------- */
function bondState(f) {
  if (f.bond === "back") return ["back", "Given back"];
  if (f.bond === "held") return ["held", "Holding " + money(f.bondHeld) + (f.date ? ". Give back after " + fmt(f.date) : "")];
  return ["due", "Not paid yet" + (f.balanceDue ? ". Due " + fmt(f.balanceDue) : "")];
}
function drawBonds(M) {
  const list = M.books.filter(x => x.f.bond !== "none").sort(byDate);
  $("#m-bonds").innerHTML = "<div class=\"bhead\"><h3>Bonds, held apart</h3><p>Not your money, so never counted as income. Holding " + money(M.all.held) + " now.</p></div><div class=\"brows\">" +
    list.map(x => { const st = bondState(x.f); return "<button class=\"brow\" type=\"button\" data-do=\"client\" data-row=\"" + x.b.row + "\" data-fid=\"br-" + x.b.row + "\" aria-haspopup=\"dialog\"><i class=\"" + st[0] + "\" aria-hidden=\"true\"></i><span class=\"t\"><span>" + esc(x.b.client) + "</span><span class=\"" + st[0] + "\">" + esc(st[1]) + "</span></span><span class=\"inv\">" + esc(x.b.invoice) + "</span></button>"; }).join("") + "</div>";
}

/* ---------- the client sheet: payments so far, record a payment, the bond ---------- */
let payFor = 0, withBond = false;      /* the booking the sheet is showing, and whether "includes the bond" is ticked */
const bookingAt = row => (S.data.bookings || []).find(b => b.row === row);
function openClient(row, keep) {
  const b = bookingAt(row); if (!b) { hide(); return; }
  if (payFor !== row) withBond = false;
  payFor = row;
  const f = moneyOf(b), hire = (S.payBy[b.invoice] || []).filter(p => p.what === "Hire"), bond = f.bondAmount, canBond = f.bond === "due" && bond > 0;
  if (!canBond) withBond = false;
  const typed = keep && $("#other") ? $("#other").value : "", said_ = keep && $("#err") ? $("#err").textContent : "";
  const st = bondState(f);
  show("client", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">" + esc(b.client) + "</h2><p class=\"sub\">" + esc([b.invoice, txt(b.type), dayOf(f.date)].filter(Boolean).join(", ")) + "</p>" +
    "<div class=\"tot\"><div><div>Total</div><div>" + money(f.total) + "</div></div><div><div>Received</div><div>" + money(f.received) + "</div></div><div><div>To pay</div><div>" + money(f.owing) + "</div></div></div>" +
    "<h3 class=\"sh first\">Payments so far</h3>" + (hire.length ? hire.map(p => "<div class=\"prow\"><span>" + (p.date ? fmt(p.date) : "") + "</span><span>" + money(num(p.amount)) + "</span></div>").join("") : "<p class=\"none\">None yet.</p>") +
    (f.owing > 0 ? "<h3 class=\"sh\">Record a payment</h3>" +
      (canBond ? "<button class=\"tickf\" type=\"button\" data-do=\"pay-bond\" data-fid=\"pay-bond\" aria-pressed=\"" + withBond + "\"><span class=\"box\" aria-hidden=\"true\">" + CHECK + "</span>This payment includes the " + money(bond) + " bond</button>" : "") +
      "<button class=\"paybtn wm-card\" type=\"button\" data-do=\"pay-rest\" data-fid=\"pay-rest\"><span>Rest of the fee received</span><span>" + money(f.owing) + "</span></button>" +
      "<div class=\"other\"><div class=\"fld\"><label for=\"other\">Another amount ($)</label><input class=\"inp wm-card\" id=\"other\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"any\" data-fid=\"other\" value=\"" + esc(typed) + "\"></div><button class=\"cardbtn wm-card\" type=\"button\" data-do=\"pay-other\" data-fid=\"pay-other\">Received</button></div>" : "") +
    (f.bond !== "none" ? "<h3 class=\"sh\">Bond, held apart</h3><div class=\"bondbox wm-card\"><span>" + esc(st[1]) + ".</span>" +
      (f.bond === "due" && bond > 0 ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"bond-in\" data-fid=\"bond-in\">Bond received</button>" : f.bond === "held" ? "<button class=\"cardbtn wm-card\" type=\"button\" data-do=\"bond-back\" data-fid=\"bond-back\">Bond given back</button>" : "") + "</div>" : "") +
    "<p class=\"err\" id=\"err\" role=\"alert\">" + esc(said_) + "</p><button class=\"btn big done\" type=\"button\" data-do=\"close\">Done</button>");
  dlg.setAttribute("aria-label", "Payments");
}
SHEETS.client = { sync() { keepFocus(() => openClient(payFor, true)); } };

/** Records payments for one booking. They show straight away, then save as rows on the Payments tab, dated today. */
async function pay(b, items, done) {
  const hire = sum(items.filter(p => p.what === "Hire")), slot = $("#err"); if (slot) slot.textContent = "";
  const res = await save("addPayment", { invoice: b.invoice, payments: items }, data => {
    const mine = data.bookings.find(x => x.row === b.row), today = todayIso();
    items.forEach((p, i) => data.payments.push({ row: -(Date.now() + i), date: today, invoice: b.invoice, client: b.client, amount: p.amount, what: p.what, note: "" }));
    mine.received = num(mine.received) + hire; mine.owing = Math.max(0, num(mine.owing) - hire);
    if (hire > 0 && txt(mine.status) === "Waiting on deposit") mine.status = "Booked";
    if (items.some(p => p.what === "Bond in")) mine.bond = "Held";
    if (items.some(p => p.what === "Bond back")) mine.bond = "Returned";
    data.reports = null;                 /* the tracker's own totals are out of date until it answers */
  });
  if (res) toast(done);
}
function payHire(amount) {
  const b = bookingAt(payFor); if (!b) return;
  const f = moneyOf(b), items = [{ what: "Hire", amount }], bond = withBond && f.bond === "due" ? f.bondAmount : 0;
  if (bond) items.push({ what: "Bond in", amount: bond });
  withBond = false;
  pay(b, items, "Recorded " + money(amount) + " from " + b.client + (bond ? ", and the " + money(bond) + " bond." : "."));
}

/* ---------- add an expense ---------- */
let cost = null;
const comingUp = () => (S.data.bookings || []).filter(live).map(b => ({ b, f: moneyOf(b) })).filter(x => !x.f.done && txt(x.b.invoice)).sort(byDate);
const chips = (group, list, picked) => "<div class=\"chips\">" + list.map(x => "<button class=\"chip\" type=\"button\" data-do=\"cost-pick\" data-group=\"" + group + "\" data-value=\"" + esc(x[0]) + "\" aria-pressed=\"" + (picked === x[0]) + "\">" + esc(x[1]) + "</button>").join("") + "</div>";
/** values and problem are only given when a save failed, so nothing typed is lost. */
function openCost(values, problem) {
  cost = Object.assign({ usual: "", what: "", amount: "", type: "", invoice: "" }, values || {});
  show("cost", "<h2 id=\"dlg-title\" tabindex=\"-1\" class=\"tight\">add an expense</h2><p class=\"sub\">Dated today. Pick a usual one, or type your own.</p>" +
    "<h3 class=\"sh mid\">Usual ones</h3>" + chips("usual", USUAL.map(u => [u[0], u[0]]), cost.usual) +
    "<form id=\"costfrm\" novalidate><div class=\"two\"><div class=\"fld\"><label for=\"c-what\">What was it</label><input class=\"inp wm-card\" id=\"c-what\" type=\"text\" autocomplete=\"off\" value=\"" + esc(cost.what) + "\"></div>" +
    "<div class=\"fld\"><label for=\"c-amount\">Amount ($)</label><input class=\"inp wm-card\" id=\"c-amount\" type=\"number\" inputmode=\"decimal\" min=\"0\" step=\"any\" value=\"" + esc(cost.amount) + "\"></div></div>" +
    "<h3 class=\"sh mid\">Type</h3>" + chips("type", expenseTypes().map(t => [t, t]), cost.type) +
    "<h3 class=\"sh mid\">Was it for one client?</h3>" + chips("invoice", [["", "No client"]].concat(comingUp().map(x => [x.b.invoice, chipName(x.b.client) + ", " + x.b.invoice])), cost.invoice) +
    "<p class=\"err\" id=\"err\" role=\"alert\">" + esc(problem || "") + "</p><button class=\"btn big save\" type=\"submit\">Save expense</button></form><button class=\"btn line cancel\" type=\"button\" data-do=\"close\">Cancel</button>");
  dlg.setAttribute("aria-label", "Add an expense");
}
dlg.addEventListener("submit", async e => {
  if (sheetKind !== "cost") return;
  e.preventDefault();
  const what = $("#c-what").value.trim(), amount = num($("#c-amount").value), out = { what, amount, type: cost.type, invoice: cost.invoice };
  if (!what || !(amount > 0) || !cost.type) { $("#err").textContent = "An expense needs what it was, an amount and a type."; return; }
  const kept = Object.assign({}, cost, { what, amount: $("#c-amount").value });
  hide();
  const res = await save("addExpense", out, data => {
    const b = data.bookings.find(x => x.invoice === out.invoice);
    data.expenses.push({ row: -Date.now(), date: todayIso(), what, type: out.type, amount, invoice: out.invoice, client: b ? b.client : "", notes: "" });
    data.reports = null;
  });
  if (res) toast("Saved: " + what + ", " + money(amount) + ".");
  else if (!dlg.open) openCost(kept, $("#toast").textContent);
});

/* ---------- taps ---------- */
Object.assign(TAPS, {
  "period": el => { S.period = el.dataset.period; keepFocus(() => SCREENS.money.fill()); },
  "pstep": el => {
    if (S.period === "year") S.py += +el.dataset.by;
    else { const n = S.pm[0] * 12 + S.pm[1] + +el.dataset.by; S.pm = [Math.floor(n / 12), n % 12]; }
    keepFocus(() => SCREENS.money.fill());
  },
  "msec": el => {
    const id = el.dataset.sec, open = S.mopen[id] = !S.mopen[id], box = $("#ms-" + id);
    el.setAttribute("aria-expanded", open); box.classList.toggle("open", open);
    if (open) $$(".bar", box).forEach(bar => { bar.classList.remove("wm-bar"); void bar.offsetWidth; bar.classList.add("wm-bar"); });   /* the paid bars grow as the section opens */
  },
  "cost-all": el => { S.xopen = !S.xopen; el.setAttribute("aria-expanded", S.xopen); el.textContent = S.xopen ? "Hide the list" : "Show all " + $$("#x-all .xitem").length; $("#x-all").classList.toggle("open", S.xopen); },
  "client": el => openClient(+el.dataset.row),
  "pay-bond": el => { withBond = !withBond; el.setAttribute("aria-pressed", withBond); },
  "pay-rest": () => { const b = bookingAt(payFor); if (b) payHire(moneyOf(b).owing); },
  "pay-other": () => {
    const b = bookingAt(payFor), amount = Math.round(num($("#other").value) * 100) / 100; if (!b) return;
    const owing = moneyOf(b).owing;
    if (!(amount > 0)) { $("#err").textContent = "Type the amount that came in."; return; }
    if (amount > owing) { $("#err").textContent = "That’s more than the " + money(owing) + " still to pay."; return; }
    $("#other").value = ""; payHire(amount);
  },
  "bond-in": () => { const b = bookingAt(payFor); if (b) pay(b, [{ what: "Bond in", amount: moneyOf(b).bondAmount }], "Bond received from " + b.client + "."); },
  "bond-back": () => { const b = bookingAt(payFor); if (b) pay(b, [{ what: "Bond back", amount: moneyOf(b).bondHeld }], "Bond given back to " + b.client + "."); },
  "cost-new": () => openCost(),
  "cost-pick": el => {
    const group = el.dataset.group, value = el.dataset.value;
    cost[group] = value;
    if (group === "usual") { const u = USUAL.find(x => x[0] === value); cost.type = u[1]; $("#c-what").value = u[0]; $("#c-amount").focus(); }
    $$(".chip", dlg).forEach(c => c.setAttribute("aria-pressed", cost[c.dataset.group] === c.dataset.value));
  }
});
