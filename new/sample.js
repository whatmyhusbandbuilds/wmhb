"use strict";
/* wmhb app: made-up sample data. It is only used until the back end address is filled in at the top of app.js
   (or when the page address ends in ?demo). Every name, number and amount here is invented. Nothing is saved. */
let demoDb = null;
function demoServer(fn, arg) {
  const t = todayIso(), at = n => addDays(t, n), long = iso => { const p = dParts(iso); return p.d + " " + MONTHS[p.m] + " " + p.y; };
  const ref = (letters, n) => letters + "-" + String(n).padStart(4, "0");
  if (!demoDb) {
    const far = dParts(at(62));
    const bk = (row, inv, client, date, status, type, venue, suburb, pkg, total, received, more) => Object.assign({
      row, id: ref("B", row - 4), client, date, status, nextStep: "", phone: "", email: "", insta: "", source: "", referredBy: "", type, venue, suburb, region: "Auckland", pkg, cancelled: "", notes: "",
      invoice: ref("INV", inv), total, received, owing: status === "Cancelled" ? 0 : total - received, bond: "", eventDay: {}, videos: {}, designs: {}
    }, more || {});
    const eq = (row, name, contact, type, date, message, status, what, bookingId) => ({ row, received: at(-row), name, contact, type, date, message, status, what: what || "", bookingId: bookingId || "" });
    demoDb = {
      bookings: [
        bk(5, 1, "City Expo", at(-25), "Completed", "Expo", "Showgrounds", "", "Custom", 250, 250),
        bk(6, 2, "Olivia", at(-10), "Completed", "Birthday", "Golf Resort", "", "Celebration hire", 910, 910),
        bk(7, 3, "Charlotte", at(17), "Booked", "Birthday", "City Hotel", "", "Celebration hire", 1150, 240, { nextStep: "Balance due", email: "charlotte@example.com" }),
        bk(8, 4, "Tane Rewi", at(11), "Booked", "Quinceañera", "", "", "Celebration hire", 880, 240, { nextStep: "Balance due", phone: "021 555 0101" }),
        bk(9, 5, "Ruby Carter", at(24), "Waiting on deposit", "Wedding", "Valley Estate", "", "Forever", 1270, 0, { nextStep: "Get deposit" }),
        bk(10, 6, "Hannah Reid", at(108), "Waiting on deposit", "Wedding", "Waikato", "", "Forever", 1305, 0, { nextStep: "Get deposit", region: "Hamilton" }),
        bk(11, 7, "Kiri", at(20), "Cancelled", "Birthday", "", "", "Celebration hire", 450, 0, { cancelled: "Yes" }),
        bk(12, 8, "Glow Studio (Mia)", at(9), "Booked", "Corporate event", "", "", "Custom", 910, 910, { phone: "09 555 0100" })
      ],
      enquiries: [
        eq(2, "Rangi", "Instagram @sample.rangi", "Wedding", "", "", "Cancelled", "Cancelled"),
        eq(3, "Tane", "Phone 021 555 0142", "Birthday", MONTHS[far.m] + " " + far.y, "Venue: Henderson", "New"),
        eq(4, "Daniel Marsh", "Phone 022 555 0177", "Birthday", long(at(4)), "Venue: Rooftop Bar", "New"),
        eq(5, "Lani Tuala", "Phone 021 555 0190", "Wedding", long(at(10)), "Venue: Garden Venue", "Waiting on response"),
        eq(6, "Jess (example)", "Instagram, example only", "Birthday", long(at(17)), "", "New"),
        eq(7, "Hannah Reid", "Phone 021 555 0123", "Wedding", long(at(108)), "Venue: Waikato", "Waiting on deposit", "Moved to bookings", "B-0006")
      ],
      payments: [], expenses: [], reports: null, prices: [], packing: [], videosFolder: "", problems: [],
      lists: { "Event type": ["Wedding", "Engagement party", "Birthday", "Anniversary", "Baby shower", "Other celebration", "Brand / corporate", "Expo / show", "Market / fair"], "Region": ["Auckland", "Hamilton", "Waikato (other)"], "How they found us": ["Instagram", "Referral", "Repeat client"] },
      packages: [{ name: "Classic", price: 550 }, { name: "Forever", price: 795 }, { name: "Celebration hire", price: 450 }, { name: "Custom", price: null }]
    };
  }
  const db = demoDb, nextRow = () => Math.max(...db.bookings.map(b => b.row)) + 1, nextInv = () => Math.max(...db.bookings.map(b => +b.invoice.slice(4))) + 1;
  const blank = { nextStep: "Get deposit", phone: "", email: "", insta: "", source: "", referredBy: "", suburb: "", region: "", pkg: "", cancelled: "", notes: "", received: 0, bond: "", eventDay: {}, videos: {}, designs: {} };
  let id = "", invoice = "", row = 0;
  if (fn === "setEnquiryStatus") {
    const q = db.enquiries.find(x => x.row === arg.row && x.name === arg.name); if (!q) { const x = new Error("That enquiry is no longer there. Press Refresh."); x.told = true; throw x; }
    q.status = arg.status; q.what = arg.status === "Cancelled" ? "Cancelled" : ""; q.bookingId = "";
    if (arg.status === "Waiting on deposit") {
      row = nextRow(); id = ref("B", row - 4); invoice = ref("INV", nextInv());
      const date = arg.eventDate || parseLoose(q.date) || "";
      db.bookings.push(Object.assign({}, blank, { row, id, invoice, client: q.name, date, status: date ? "Waiting on deposit" : "Date needed", phone: (/^Phone\s+(.+)/.exec(q.contact) || [])[1] || "", insta: (/^Instagram\s+(.+)/.exec(q.contact) || [])[1] || "", type: q.type, venue: ((/venue:\s*([^\n]+)/i.exec(q.message) || [])[1] || "").trim(), total: 0, owing: 0 }));
      q.what = "Moved to bookings"; q.bookingId = id;
    }
  } else if (fn === "addBooking") {
    row = nextRow(); id = ref("B", row - 4); invoice = ref("INV", nextInv());
    const p = db.packages.find(x => x.name === arg["Package"]), total = num(arg["Custom price"]) || (p && p.price) || 0;
    db.bookings.push(Object.assign({}, blank, { row, id, invoice, client: arg["Client name"], date: arg["Event date"], status: "Waiting on deposit", phone: arg["Phone"] || "", email: arg["Email"] || "", insta: arg["Instagram"] || "", source: arg["How they found us"] || "", type: arg["Event type"] || "", venue: arg["Venue"] || "", suburb: arg["Suburb"] || "", region: arg["Region"] || "", pkg: arg["Package"], total, owing: total }));
  }
  /* the real back end takes a moment, and so does this one, so the screens can be checked the way they will really feel */
  return new Promise(done => setTimeout(() => done({ id, row, invoice, data: copy(Object.assign({ readAt: Date.now(), today: t }, db)) }), 350));
}
