/**
 * wmhb app 2. The back end for the new wmhb app (the /new/ page).
 * It reads the new tracker, "wmhb tracker (new layout)", and nothing else.
 *
 * What it may write:
 *   - Clients and Money tabs: only the typed columns listed in CLIENT_FIELDS and MONEY_FIELDS below.
 *   - Enquiries tab: a new row from the public form, and the Status, What happened and Booking ID cells.
 * What it never does:
 *   - write to a cell that holds a formula (the grey "auto" columns),
 *   - sort, insert or delete rows on Clients, Money, Event day, Videos or Designs,
 *   - open any other spreadsheet.
 *
 * The key is NOT in this file. Run setUp once from the editor: it makes a key and keeps it in
 * Project Settings > Script properties, under KEY.
 */

var SHEET_ID = '1sWMN4SVJjF8PUWpxCbGCW6ywbYjZUQVnarJlL2ea6Gs';
var CLIENTS = 'Clients', MONEY = 'Money', ENQUIRIES = 'Enquiries', SETTINGS = 'Settings', PRICES = 'Prices';
var LAST_ROW = 504;                       // bookings live in rows 5 to 504
var ENQUIRY_STATUSES = ['New', 'Waiting on response', 'Waiting on deposit', 'Cancelled'];

/* The only columns this app may write to, and what each one accepts. */
var CLIENT_FIELDS = {
  'Client name': 'text', 'Event date': 'date', 'Phone': 'text', 'Email': 'text', 'Instagram': 'text',
  'How they found us': 'list:How they found us', 'Referred by': 'text', 'Event type': 'list:Event type',
  'Venue': 'text', 'Suburb': 'text', 'Region': 'list:Region', 'Package': 'package', 'Notes': 'text'
};
var MONEY_FIELDS = {
  'Custom price': 'num', 'Highlight reel': 'yes', 'Custom board and screen': 'yes', 'No power point': 'yes',
  'Second event': 'yes', 'Host hours': 'num', 'Extra hours': 'num', 'Extra days': 'num', 'Travel fee': 'num',
  'Discount': 'num'
};
/* The public form's event types, as the Settings tab spells them. */
var FORM_TYPES = { 'Engagement': 'Engagement party', 'Corporate': 'Brand / corporate', 'Market': 'Market / fair', 'Something else': 'Other celebration' };

/* ---------- one-off setup, run from the editor ---------- */

/** Run once. Makes the key if there isn't one, and shows it in the Execution log. Run again to see it. */
function setUp() {
  var props = PropertiesService.getScriptProperties(), key = props.getProperty('KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
    props.setProperty('KEY', key);
  }
  if (!props.getProperty('ALERT_TO')) {
    try { props.setProperty('ALERT_TO', Session.getEffectiveUser().getEmail()); } catch (x) {}
  }
  MailApp.getRemainingDailyQuota();        // asks for permission to send the new-enquiry email
  SpreadsheetApp.openById(SHEET_ID).getName();
  console.log('Your key (treat it like a password): ' + key);
  console.log('New-enquiry emails go to: ' + (props.getProperty('ALERT_TO') || 'nobody yet. Add a script property called ALERT_TO.'));
}

/** Run this to lock out an old link. It makes a new key and shows it in the Execution log. */
function newKey() {
  PropertiesService.getScriptProperties().deleteProperty('KEY');
  setUp();
}

/* ---------- the web app ---------- */

function doGet() {
  return ContentService.createTextOutput('wmhb app 2 is running.');
}

/** The page on GitHub talks to the tracker through here. Body: {k, fn, arg} as JSON text. */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.fn === 'enquire') return json_({ ok: true, result: enquire_(req.arg || {}) });
    guard_(req.k);
    var r;
    if (req.fn === 'getData') r = { data: read_() };
    else if (req.fn === 'setEnquiryStatus') r = setEnquiryStatus_(req.arg || {});
    else if (req.fn === 'addBooking') r = addBooking_(req.arg || {});
    else throw new Error('Unknown request.');
    out = { ok: true, result: r };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return json_(out);
}

function json_(out) {
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function guard_(k) {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key) throw new Error('The back end has no key yet. Run setUp in the Apps Script editor.');
  if (typeof k !== 'string' || k !== key) throw new Error('This link has been replaced. Ask for the current wmhb link.');
}

/* ---------- the public enquiry form: no key, can only add one row to Enquiries ---------- */

function enquire_(a) {
  var clip = function (v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').replace(/^[=+@\s-]+/, '').trim().slice(0, n); };
  if (a.website) return 'ok';              // spam trap: people never see this field
  var name = clip(a.name, 80), contact = clip(a.contact, 80);
  if (!name || !contact) throw new Error('Please add your name and a way to reach you.');
  var type = clip(a.type, 40), date = clip(a.date, 60), message = clip(a.message, 600);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(ENQUIRIES), col = enquiryCols_(sh), now = new Date(), last = sh.getLastRow();
    if (last > 1) {
      var recent = sh.getRange(Math.max(2, last - 29), col['Received'], Math.min(30, last - 1), 1).getValues(), n = 0;
      recent.forEach(function (r) { if (isDate_(r[0]) && now - r[0] < 3600000) n++; });
      if (n >= 15) throw new Error('We are getting a lot of enquiries right now. Please message us on Instagram instead.');
    }
    var row = last + 1;
    if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);   // Enquiries only: it does not line up with the booking tabs
    var put = function (h, v) { sh.getRange(row, col[h]).setNumberFormat('@').setValue(v); };
    sh.getRange(row, col['Received']).setValue(now).setNumberFormat('d mmm yyyy h:mm');
    put('Name', name); put('Instagram or phone', contact); put('Event type', type); put('Event date', date); put('Message', message);
    sh.getRange(row, col['Status']).setValue('New');
    alert_(name, contact, type, date, message);
    return 'ok';
  } finally {
    lock.releaseLock();
  }
}

/** Emails the business inbox about a new enquiry. If the email fails, the enquiry is still saved. */
function alert_(name, contact, type, date, message) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('ALERT_TO');
    if (!to) return;
    var lines = ['New enquiry from the wmhb page.', '', 'Name: ' + name, 'Reply to: ' + contact,
      'Event: ' + (type || 'not given'), 'Date: ' + (date || 'not given')];
    if (message) lines.push('Message: ' + message);
    lines.push('', 'It is in the wmhb app on the Clients screen, and on the Enquiries tab of the tracker.');
    MailApp.sendEmail(to, 'New enquiry: ' + [name, type, date].filter(String).join(', '), lines.join('\n'), { name: 'wmhb enquiries' });
  } catch (x) {
    console.error('Enquiry alert not sent: ' + x);
  }
}

/* ---------- enquiries: the one-tap status picker ---------- */

/** arg = {row, name, status, eventDate}. Waiting on deposit also creates the booking. */
function setEnquiryStatus_(arg) {
  var status = String(arg.status || '').trim(), row = Number(arg.row);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var lists = lists_(), allowed = lists['Enquiry status'] && lists['Enquiry status'].length ? lists['Enquiry status'] : ENQUIRY_STATUSES;
    if (allowed.indexOf(status) < 0 || ENQUIRY_STATUSES.indexOf(status) < 0) throw new Error('"' + status + '" is not an enquiry status on the Settings tab.');
    var sh = sheet_(ENQUIRIES), col = enquiryCols_(sh);
    if (!(row > 1 && row <= sh.getLastRow())) throw new Error('That enquiry is no longer there. Press Refresh.');
    var v = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0], get = function (h) { return v[col[h] - 1]; };
    if (String(get('Name')).trim() !== String(arg.name).trim()) throw new Error('The enquiries have moved. Press Refresh and try again.');
    if (String(get('What happened')).trim() === 'Moved to bookings') throw new Error('This enquiry is already booking ' + String(get('Booking ID')).trim() + '. Change it on the Clients tab.');
    ['Status', 'What happened', 'Booking ID'].forEach(function (h) {
      if (sh.getRange(row, col[h]).getFormula()) throw new Error(h + ' on the Enquiries tab holds a formula, so nothing was changed.');
    });
    var id = '', bookingRow = 0;
    if (status === 'Waiting on deposit') {
      var contact = String(get('Instagram or phone')).trim(), message = String(get('Message')).trim(), fields = { 'Client name': String(get('Name')).trim() };
      var phone = /^phone\s+(.+)$/i.exec(contact), insta = /^instagram\s+(.+)$/i.exec(contact);
      if (phone) fields['Phone'] = phone[1]; else if (insta) fields['Instagram'] = insta[1];
      else if (/^[\d\s()+-]{7,}$/.test(contact)) fields['Phone'] = contact; else fields['Instagram'] = contact;
      var type = String(get('Event type')).trim(); type = FORM_TYPES[type] || type;
      if ((lists['Event type'] || []).indexOf(type) >= 0) fields['Event type'] = type;
      var tz = SpreadsheetApp.openById(SHEET_ID).getSpreadsheetTimeZone(), when = get('Event date');
      var asked = String(arg.eventDate || '').trim();
      if (asked && !/^\d{4}-\d{2}-\d{2}$/.test(asked)) throw new Error('The event date needs to be a date.');
      var date = asked || (isDate_(when) ? Utilities.formatDate(when, tz, 'yyyy-MM-dd') : looseDate_(when));
      if (date) fields['Event date'] = date;
      var venue = /venue:\s*([^\n]+)/i.exec(message);
      if (venue) fields['Venue'] = venue[1].trim();
      var got = get('Received'), note = ['From the enquiry' + (isDate_(got) ? ' of ' + Utilities.formatDate(got, tz, 'd MMM yyyy') : '') + '.'];
      if (!fields['Event type'] && type) note.push('Event type: ' + type + '.');
      if (!date && String(when).trim()) note.push('Wants: ' + String(when).trim() + '.');
      if (message) note.push(message);
      fields['Notes'] = note.join(' ').replace(/^=+/, '');
      var made = newBooking_(fields, lists);
      id = made.id; bookingRow = made.row;
    }
    sh.getRange(row, col['Status']).setValue(status);
    var what = sh.getRange(row, col['What happened']), bid = sh.getRange(row, col['Booking ID']);
    if (status === 'Waiting on deposit') { what.setValue('Moved to bookings'); bid.setNumberFormat('@').setValue(id); }
    else if (status === 'Cancelled') what.setValue('Cancelled');
    else { what.clearContent(); bid.clearContent(); }
    SpreadsheetApp.flush();
    return { id: id, row: bookingRow, data: read_() };
  } finally {
    lock.releaseLock();
  }
}

function enquiryCols_(sh) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], col = {};
  head.forEach(function (h, i) { h = String(h).trim(); if (h && !(h in col)) col[h] = i + 1; });
  ['Received', 'Name', 'Instagram or phone', 'Event type', 'Event date', 'Message', 'Status', 'What happened', 'Booking ID'].forEach(function (h) {
    if (!col[h]) throw new Error('The Enquiries tab is missing its "' + h + '" heading.');
  });
  return col;
}

/* ---------- bookings ---------- */

/** fields = {heading: value}, from the app's add-a-booking form. */
function addBooking_(fields) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var made = newBooking_(fields, lists_());
    SpreadsheetApp.flush();
    return { id: made.id, row: made.row, data: read_() };
  } finally {
    lock.releaseLock();
  }
}

/** Writes one booking into the first empty row. Call it with the lock held. Nothing is written until every value has passed. */
function newBooking_(fields, lists) {
  if (!String(fields['Client name'] || '').trim()) throw new Error('A booking needs a client name.');
  Object.keys(fields).forEach(function (h) { if (!CLIENT_FIELDS[h] && !MONEY_FIELDS[h]) throw new Error('"' + h + '" is not a column this app may change.'); });
  var cl = sheet_(CLIENTS), cm = headers_(cl), mo = sheet_(MONEY), mm = headers_(mo);
  if (cm.row !== mm.row) throw new Error('The Clients and Money tabs no longer line up. Nothing was changed.');
  var first = cm.row + 1, count = LAST_ROW - cm.row;
  var block = cl.getRange(first, 1, count, cl.getLastColumn()).getValues(), nameAt = cm.col['Client name'] - 1, idAt = cm.col['Booking ID'] - 1;
  var row = 0, max = 0;
  for (var i = 0; i < block.length; i++) {
    var m = /^B-(\d{4})$/.exec(String(block[i][idAt]).trim());
    if (m) max = Math.max(max, +m[1]);
    if (!row && !String(block[i][nameAt]).trim()) row = first + i;
  }
  if (!row) throw new Error('The Clients tab has no empty rows left.');
  if (String(block[row - first][idAt]).trim()) throw new Error('Row ' + row + ' on the Clients tab has a booking ID but no name. Fix that row in the tracker first.');
  var next = String(sheet_(SETTINGS).getRange('C29').getDisplayValue()).trim(), nm = /^B-(\d{4})$/.exec(next);
  var id = nm && +nm[1] > max ? next : 'B-' + ('0000' + (max + 1)).slice(-4);
  var idCell = cl.getRange(row, cm.col['Booking ID']);
  if (idCell.getFormula()) throw new Error('Booking ID in row ' + row + ' holds a formula, so nothing was changed.');
  var jobs = [];
  [[cl, cm, CLIENT_FIELDS], [mo, mm, MONEY_FIELDS]].forEach(function (t) {
    Object.keys(t[2]).forEach(function (h) {
      var s = fields[h] == null ? '' : String(fields[h]).trim();
      if (s === '') return;
      check_(t[0], t[1], lists, row, h, t[2][h], s);
      jobs.push([t[0], t[1], h, t[2][h], s]);
    });
  });
  idCell.setNumberFormat('@').setValue(id);
  jobs.forEach(function (j) { write_(j[0], j[1], row, j[2], j[3], j[4]); });
  return { id: id, row: row };
}

function check_(sh, map, lists, row, h, type, s) {
  var col = map.col[h];
  if (!col) throw new Error('The ' + sh.getName() + ' tab is missing its "' + h + '" heading.');
  if (sh.getRange(row, col).getFormula()) throw new Error(h + ' in row ' + row + ' holds a formula, so nothing was changed.');
  if (/^=/.test(s)) throw new Error(h + ' cannot start with an equals sign.');
  if (type === 'num') {
    var n = Number(s);
    if (!isFinite(n) || n < 0) throw new Error(h + ' needs a number, zero or more.');
  } else if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(h + ' needs a date.');
  } else if (type === 'yes') {
    if (s !== 'Yes') throw new Error(h + ' can only be Yes or empty.');
  } else if (type === 'package') {
    if (lists.packages.map(function (p) { return p.name; }).indexOf(s) < 0) throw new Error('"' + s + '" is not a package on the Prices tab.');
  } else if (type.indexOf('list:') === 0) {
    var allowed = lists[type.slice(5)] || [];
    if (allowed.indexOf(s) < 0) throw new Error('"' + s + '" is not an option for ' + h + ' on the Settings tab.');
  }
}

function write_(sh, map, row, h, type, s) {
  var cell = sh.getRange(row, map.col[h]);
  if (type === 'num') cell.setValue(Math.round(Number(s) * 100) / 100);
  else if (type === 'date') {
    var p = s.split('-'), plain = /^(general|0\.?#*)$/i.test(cell.getNumberFormat());
    cell.setValue(serial_(+p[0], +p[1], +p[2]));
    if (plain) cell.setNumberFormat('ddd d mmm yyyy');
  } else if (type === 'text') cell.setNumberFormat('@').setValue(s);
  else cell.setValue(s);
}

/* ---------- reading ---------- */

function sheet_(name) {
  var s = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!s) throw new Error('The "' + name + '" tab is missing from the tracker.');
  return s;
}

/** Finds the heading row (the one that starts with Booking ID) and where each heading sits. */
function headers_(sh) {
  var top = sh.getRange(1, 1, 10, sh.getLastColumn()).getValues();
  for (var r = 0; r < top.length; r++) {
    if (String(top[r][0]).trim() === 'Booking ID') {
      var col = {};
      top[r].forEach(function (h, i) { h = String(h).trim(); if (h && !(h in col)) col[h] = i + 1; });
      return { row: r + 1, col: col };
    }
  }
  throw new Error('Could not find the "Booking ID" heading on the ' + sh.getName() + ' tab.');
}

/** The dropdown lists from Settings, and the packages from Prices. */
function lists_() {
  var out = { packages: [] }, v = sheet_(SETTINGS).getDataRange().getValues(), r, c, i;
  for (r = 0; r < Math.min(v.length, 12); r++) {
    if (String(v[r][1]).trim() !== 'Event type') continue;
    for (c = 1; c < v[r].length; c++) {
      var h = String(v[r][c]).trim();
      if (!h) continue;
      out[h] = [];
      for (i = r + 1; i < Math.min(v.length, r + 14); i++) { var x = String(v[i][c]).trim(); if (x) out[h].push(x); }
    }
    break;
  }
  var p = sheet_(PRICES).getDataRange().getValues();
  for (r = 0; r < p.length; r++) {
    if (String(p[r][1]).trim() !== 'Package') continue;
    var priceAt = p[r].map(function (h) { return String(h).trim(); }).indexOf('Price');
    for (i = r + 1; i < p.length && String(p[i][1]).trim(); i++) {
      out.packages.push({ name: String(p[i][1]).trim(), price: priceAt >= 0 && p[i][priceAt] !== '' && isFinite(Number(p[i][priceAt])) ? Number(p[i][priceAt]) : null });
    }
    break;
  }
  return out;
}

/** Everything the Clients screen shows. */
function read_() {
  var ss = SpreadsheetApp.openById(SHEET_ID), tz = ss.getSpreadsheetTimeZone();
  var cl = sheet_(CLIENTS), cm = headers_(cl), mo = sheet_(MONEY), mm = headers_(mo);
  var count = LAST_ROW - cm.row;
  var cv = cl.getRange(cm.row + 1, 1, count, cl.getLastColumn()).getValues();
  var mv = cm.row === mm.row ? mo.getRange(mm.row + 1, 1, count, mo.getLastColumn()).getValues() : [];
  var day = function (v) { return isDate_(v) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : ''; };
  var bookings = [];
  cv.forEach(function (r, i) {
    var c = function (h) { var n = cm.col[h]; return n ? r[n - 1] : ''; }, m = function (h) { var n = mm.col[h]; return n && mv[i] ? mv[i][n - 1] : ''; };
    if (!String(c('Client name')).trim()) return;
    bookings.push({
      row: cm.row + 1 + i, id: String(c('Booking ID')), client: String(c('Client name')), date: day(c('Event date')), status: String(c('Status')), nextStep: String(c('Next step')),
      phone: String(c('Phone')), email: String(c('Email')), insta: String(c('Instagram')), source: String(c('How they found us')), type: String(c('Event type')),
      venue: String(c('Venue')), suburb: String(c('Suburb')), region: String(c('Region')), pkg: String(c('Package')), cancelled: String(c('Cancelled')), notes: String(c('Notes')),
      total: Number(m('Total')) || 0, received: Number(m('Received')) || 0, owing: Number(m('Owing')) || 0, invoice: String(m('Invoice no.'))
    });
  });
  var enquiries = [], sh = sheet_(ENQUIRIES), col = enquiryCols_(sh);
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().forEach(function (r, i) {
      var g = function (h) { return r[col[h] - 1]; };
      if (!String(g('Name')).trim()) return;
      enquiries.push({ row: i + 2, received: day(g('Received')), name: String(g('Name')), contact: String(g('Instagram or phone')), type: String(g('Event type')),
        date: isDate_(g('Event date')) ? day(g('Event date')) : String(g('Event date')), message: String(g('Message')),
        status: String(g('Status')), what: String(g('What happened')), bookingId: String(g('Booking ID')) });
    });
  }
  var lists = lists_(), packages = lists.packages;
  delete lists.packages;
  return { readAt: new Date().getTime(), sheetId: ss.getId(), bookings: bookings, enquiries: enquiries, lists: lists, packages: packages };
}

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

function serial_(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5);
}

/** Reads a typed date such as "5 December 2026". A month on its own ("January 2027") is not a full date, so it gives ''. */
function looseDate_(t) {
  var MO = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  t = String(t == null ? '' : t).trim().replace(/^[A-Za-z]{3,9},?\s+(?=\d)/, '');
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t), y, mo, d;
  if (m) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
  else if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/.exec(t))) { d = +m[1]; mo = MO.indexOf(m[2].toLowerCase()); y = +m[3]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) { d = +m[1]; mo = +m[2] - 1; y = +m[3]; }
  else return '';
  var back = new Date(Date.UTC(y, mo, d));
  if (mo < 0 || mo > 11 || back.getUTCDate() !== d || back.getUTCMonth() !== mo) return '';
  return y + '-' + ('0' + (mo + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
}
