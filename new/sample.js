"use strict";
/* wmhb app: made-up sample data. It is only used until the back end address is filled in at the top of app.js
   (or when the page address ends in ?demo). Every name, number and amount here is invented. Nothing is saved.
   It answers the same calls as the real back end, in the same shape, so the screens can be built and checked against it. */
let demoDb = null;
function demoServer(fn, arg) {
  const t = todayIso(), at = n => addDays(t, n), long = iso => { const p = dParts(iso); return p.d + " " + MONTHS[p.m] + " " + p.y; };
  const ref = (letters, n) => letters + "-" + String(n).padStart(4, "0");
  const told = msg => { const x = new Error(msg); x.told = true; return x; };
  if (!demoDb) {
    const far = dParts(at(62));
    const bk = (row, inv, client, date, type, venue, pkg, price, more) => Object.assign({
      row, id: ref("B", row - 4), invoice: ref("INV", inv), client, date, type, venue, suburb: "", region: "Auckland", pkg, customPrice: price, cancelled: "", notes: "",
      phone: "", email: "", insta: "", source: "", referredBy: "", eventDay: {}, videos: {}, designs: {}
    }, more || {});
    const eq = (row, name, contact, type, date, message, status, what, bookingId) => ({ row, received: at(-row), name, contact, type, date, message, status, what: what || "", bookingId: bookingId || "" });
    const pay = (days, inv, amount, what) => ({ date: at(days), invoice: ref("INV", inv), amount, what, note: "" });
    const cost = (days, what, type, amount, inv) => ({ date: at(days), what, type, amount, invoice: inv ? ref("INV", inv) : "", notes: "" });
    demoDb = {
      bookings: [
        bk(5, 1, "City Expo", at(-25), "Expo / show", "Showgrounds", "Market hire", 250),
        bk(6, 2, "Olivia", at(-10), "Birthday", "Golf Resort", "Celebration hire", 910),
        bk(7, 3, "Charlotte", at(17), "Birthday", "City Hotel", "Celebration hire", 1150, { email: "charlotte@example.com" }),
        bk(8, 4, "Tane Rewi", at(11), "Birthday", "", "Celebration hire", 910, { phone: "021 555 0101" }),
        bk(9, 5, "Ruby Carter", at(24), "Wedding", "Valley Estate", "Forever", 1270),
        bk(10, 6, "Hannah Reid", at(108), "Wedding", "Waikato", "Forever", 1305, { region: "Hamilton" }),
        bk(11, 7, "Mele", at(150), "Engagement party", "", "Celebration hire", 990),
        bk(12, 8, "Glow Studio (Mia)", at(9), "Brand / corporate", "", "Corporate hire", 910, { phone: "09 555 0100" }),
        bk(13, 9, "Kiri", at(20), "Birthday", "", "Celebration hire", 450, { cancelled: "Yes" })
      ],
      enquiries: [
        eq(2, "Rangi", "Instagram @sample.rangi", "Wedding", "", "", "Cancelled", "Cancelled"),
        eq(3, "Tane", "Phone 021 555 0142", "Birthday", MONTHS[far.m] + " " + far.y, "Venue: Henderson", "New"),
        eq(4, "Daniel Marsh", "Phone 022 555 0177", "Birthday", long(at(4)), "Venue: Rooftop Bar", "New"),
        eq(5, "Lani Tuala", "Phone 021 555 0190", "Wedding", long(at(10)), "Venue: Garden Venue", "Waiting on response"),
        eq(6, "Jess", "Instagram, example only", "Birthday", long(at(17)), "", "New"),
        eq(7, "Hannah Reid", "Phone 021 555 0123", "Wedding", long(at(108)), "Venue: Waikato", "Waiting on deposit", "Moved to bookings", "B-0006")
      ],
      payments: [
        pay(-45, 5, 240, "Hire"), pay(-40, 2, 240, "Hire"), pay(-36, 1, 250, "Hire"), pay(-30, 4, 240, "Hire"),
        pay(-20, 2, 670, "Hire"), pay(-20, 2, 250, "Bond in"), pay(-12, 3, 240, "Hire"), pay(-9, 4, 670, "Hire"), pay(-9, 4, 250, "Bond in"),
        pay(-8, 2, 250, "Bond back"), pay(-7, 6, 240, "Hire"), pay(-5, 5, 1030, "Hire")
      ],
      expenses: [
        cost(-60, "Cable box", "Equipment", 250), cost(-52, "Monitor arm", "Equipment", 95), cost(-38, "Host for the day", "Contractor", 240),
        cost(-31, "Speaker", "Equipment", 240), cost(-23, "Advertising", "Marketing", 155), cost(-16, "Vintage phone", "Equipment", 180),
        cost(-10, "Board sticker, A2", "Running costs", 150, 2), cost(-5, "Website hosting", "Software", 45), cost(-5, "Cloud storage", "Software", 50),
        cost(-4, "Light easel", "Equipment", 445)
      ],
      lists: {
        "Event type": ["Wedding", "Engagement party", "Birthday", "Anniversary", "Baby shower", "Other celebration", "Brand / corporate", "Expo / show", "Market / fair"],
        "Region": ["Auckland", "Hamilton", "Waikato (other)"], "How they found us": ["Instagram", "Referral", "Repeat client"], "Yes": ["Yes"],
        "Expense type": ["Equipment", "Running costs", "Marketing", "Software", "Contractor"], "Payment type": ["Hire", "Bond in", "Bond back"]
      },
      /* name, who it is for, price, hours, takes a bond, days before the event the balance is due, deposit */
      packs: [["Classic", "Weddings", 550, 3, "Yes", 28, "30% of the total"], ["Forever", "Weddings", 795, 6, "Yes", 28, "30% of the total"],
        ["Celebration hire", "Birthdays & celebrations", 450, 3, "Yes", 14, "$200"], ["Corporate hire", "Corporate", 900, 4, "Yes", 28, "30% of the total"],
        ["Market hire", "Markets & fairs", 250, 4, "No", 14, "$150"], ["Custom", "Anything", "", "", "Yes", 14, ""]],
      terms: [["Booking terms", ""], ["Smallest deposit that marks Booked", "$150"], ["Refundable bond", "$250"], ["Old 7-day terms up to invoice no.", "5"]]
    };
  }
  const db = demoDb, of = (rows, inv, what) => rows.filter(p => p.invoice === inv && (!what || p.what === what)).reduce((s, p) => s + p.amount, 0);
  const next = list => Math.max(0, ...list) + 1;

  /* ---------- the calls ---------- */
  let id = "", invoice = "", row = 0;
  const blank = { phone: "", email: "", insta: "", source: "", referredBy: "", suburb: "", region: "", pkg: "", customPrice: 0, cancelled: "", notes: "", eventDay: {}, videos: {}, designs: {} };
  const book = fields => { row = next(db.bookings.map(b => b.row)); id = ref("B", row - 4); invoice = ref("INV", next(db.bookings.map(b => +b.invoice.slice(4)))); db.bookings.push(Object.assign({}, blank, { row, id, invoice }, fields)); };
  if (fn === "setEnquiryStatus") {
    const q = db.enquiries.find(x => x.row === arg.row && x.name === arg.name); if (!q) throw told("That enquiry is no longer there. Press Refresh.");
    q.status = arg.status; q.what = arg.status === "Cancelled" ? "Cancelled" : ""; q.bookingId = "";
    if (arg.status === "Waiting on deposit") {
      book({ client: q.name, date: arg.eventDate || parseLoose(q.date) || "", phone: (/^Phone\s+(.+)/.exec(q.contact) || [])[1] || "", insta: (/^Instagram\s+(.+)/.exec(q.contact) || [])[1] || "", type: q.type, venue: ((/venue:\s*([^\n]+)/i.exec(q.message) || [])[1] || "").trim() });
      q.what = "Moved to bookings"; q.bookingId = id;
    }
  } else if (fn === "addBooking") {
    book({ client: arg["Client name"], date: arg["Event date"], phone: arg["Phone"] || "", email: arg["Email"] || "", insta: arg["Instagram"] || "", source: arg["How they found us"] || "", type: arg["Event type"] || "", venue: arg["Venue"] || "", suburb: arg["Suburb"] || "", region: arg["Region"] || "", pkg: arg["Package"], customPrice: num(arg["Custom price"]) });
  } else if (fn === "addPayment") {
    if (!db.bookings.some(b => b.invoice === arg.invoice)) throw told("No booking has the invoice number " + arg.invoice + ". Press Refresh and try again.");
    arg.payments.forEach(p => db.payments.push({ date: t, invoice: arg.invoice, amount: num(p.amount), what: p.what, note: p.note || "" }));
  } else if (fn === "addExpense") {
    db.expenses.push({ date: t, what: arg.what, type: arg.type, amount: num(arg.amount), invoice: arg.invoice || "", notes: arg.notes || "" });
  }

  /* ---------- what the tracker's formulas would work out ---------- */
  const price = b => num(b.customPrice) || num((db.packs.find(p => p[0] === b.pkg) || [])[2]);
  const least = Number(db.terms[1][1].replace(/[^\d.]/g, ""));          /* the smallest deposit that marks a booking Booked */
  const bookings = db.bookings.map(b => {
    const total = price(b), received = of(db.payments, b.invoice, "Hire"), cancelled = b.cancelled === "Yes";
    const status = cancelled ? "Cancelled" : !b.date ? "Date needed" : received < least ? "Waiting on deposit" : b.date < t ? "Completed" : "Booked";
    const owing = cancelled ? 0 : total - received;
    return Object.assign({}, b, {
      status, total, received, owing, nextStep: status === "Waiting on deposit" ? "Get deposit" : status === "Booked" && owing > 0 ? "Balance due" : "",
      bond: of(db.payments, b.invoice, "Bond back") ? "Returned" : of(db.payments, b.invoice, "Bond in") ? "Held" : "", costs: of(db.expenses, b.invoice)
    });
  });
  const who = inv => (db.bookings.find(b => b.invoice === inv) || {}).client || "";
  const income = db.payments.filter(p => p.what === "Hire").reduce((s, p) => s + p.amount, 0), spent = db.expenses.reduce((s, x) => s + x.amount, 0);
  const held = db.payments.reduce((s, p) => s + (p.what === "Bond in" ? p.amount : p.what === "Bond back" ? -p.amount : 0), 0);
  /* the Prices tab as it reads in tracker v3: packages with headings in row 5 (columns B to P), booking terms in rows 28 to 31 */
  const prices = Array.from({ length: 31 }, () => Array(16).fill(""));
  ["Package", "For", "Price", "Hours", "Bond?", "Extra hour price", "Highlight reel", "Custom board", "No power point needed", "Second event", "Host", "Extra hour", "Extra day", "Balance due (days before)", "Deposit"].forEach((h, i) => { prices[4][1 + i] = h; });
  db.packs.forEach((p, i) => { p.slice(0, 5).forEach((v, c) => { prices[5 + i][1 + c] = c === 2 && v !== "" ? "$" + v : String(v); }); prices[5 + i][14] = String(p[5]); prices[5 + i][15] = p[6]; });
  db.terms.forEach((line, i) => { prices[27 + i][1] = line[0]; prices[27 + i][2] = line[1]; });

  const data = {
    readAt: Date.now(), today: t, bookings, enquiries: db.enquiries,
    payments: db.payments.map((p, i) => Object.assign({ row: 5 + i, client: who(p.invoice) }, p)),
    expenses: db.expenses.map((x, i) => Object.assign({ row: 5 + i, client: who(x.invoice) }, x)),
    reports: { income, expenses: spent, profit: income - spent, expected: bookings.reduce((s, b) => s + b.owing, 0), bondsHeld: held, bank: income - spent + held },
    lists: db.lists, packages: db.packs.map(p => ({ name: p[0], price: p[2] === "" ? null : p[2] })), prices, packing: [], videosFolder: "", problems: []
  };
  /* the real back end takes a moment, and so does this one, so the screens can be checked the way they will really feel */
  return new Promise(done => setTimeout(() => done({ id, row, invoice, data: copy(data) }), 350));
}
