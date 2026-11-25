/**
 * wmhb app 2: the back end for the new wmhb app (the /new/ page).
 *
 * It reads the new tracker, "wmhb tracker (new layout)", and nothing else.
 *
 * What it may write
 *   - Clients and Money tabs: only the typed columns in CLIENT_FIELDS and MONEY_FIELDS.
 *   - Enquiries tab: a new row from the public form, and the Status, What happened
 *     and Booking ID cells.
 *
 * What it never does
 *   - write to a cell that holds a formula (the grey "auto" columns),
 *   - sort, insert or delete rows on Clients, Money, Event day, Videos or Designs,
 *   - open any other spreadsheet.
 *
 * The key is NOT in this file. Run setUp once from the editor. It makes a key and
 * keeps it in Project Settings > Script properties, under KEY.
 */

const SHEET_ID = '1sWMN4SVJjF8PUWpxCbGCW6ywbYjZUQVnarJlL2ea6Gs';
const TAB = { clients: 'Clients', money: 'Money', enquiries: 'Enquiries', settings: 'Settings', prices: 'Prices' };
const LAST_BOOKING_ROW = 504;                 // bookings live in rows 5 to 504
const NEXT_BOOKING_ID_CELL = 'C29';           // on the Settings tab
const ENQUIRY_LIMIT_PER_HOUR = 15;
const LOCK_WAIT_MS = 20000;

const ENQUIRY_STATUSES = ['New', 'Waiting on response', 'Waiting on deposit', 'Cancelled'];
const ENQUIRY_HEADINGS = ['Received', 'Name', 'Instagram or phone', 'Event type', 'Event date', 'Message', 'Status', 'What happened', 'Booking ID'];

/* The only columns this app may write to, and what each one accepts. */
const CLIENT_FIELDS = {
  'Client name': 'text', 'Event date': 'date', 'Phone': 'text', 'Email': 'text', 'Instagram': 'text',
  'How they found us': 'list:How they found us', 'Referred by': 'text', 'Event type': 'list:Event type',
  'Venue': 'text', 'Suburb': 'text', 'Region': 'list:Region', 'Package': 'package', 'Notes': 'text'
};
const MONEY_FIELDS = {
  'Custom price': 'num', 'Highlight reel': 'yes', 'Custom board and screen': 'yes', 'No power point': 'yes',
  'Second event': 'yes', 'Host hours': 'num', 'Extra hours': 'num', 'Extra days': 'num', 'Travel fee': 'num',
  'Discount': 'num'
};

/* The public form's event types, as the Settings tab spells them. */
const FORM_TYPES = {
  'Engagement': 'Engagement party', 'Corporate': 'Brand / corporate',
  'Market': 'Market / fair', 'Something else': 'Other celebration'
};

/* ---------- one-off setup, run from the editor ---------- */

/** Run once. Makes the key if there isn't one and shows it in the Execution log. Run again to see it. */
function setUp() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
    props.setProperty('KEY', key);
  }
  if (!props.getProperty('ALERT_TO')) {
    try { props.setProperty('ALERT_TO', Session.getEffectiveUser().getEmail()); } catch (err) { /* set it by hand */ }
  }
  MailApp.getRemainingDailyQuota();           // asks for permission to send the new-enquiry email
  book_().getName();                          // asks for permission to open the tracker
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
  try {
    const request = JSON.parse(e.postData.contents);
    const arg = request.arg || {};
    if (request.fn === 'enquire') return json_({ ok: true, result: enquire_(arg) });

    requireKey_(request.k);
    switch (request.fn) {
      case 'getData': return json_({ ok: true, result: { data: read_() } });
      case 'setEnquiryStatus': return json_({ ok: true, result: withLock_(() => setEnquiryStatus_(arg)) });
      case 'addBooking': return json_({ ok: true, result: withLock_(() => addBooking_(arg)) });
      default: throw new Error('Unknown request.');
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function requireKey_(given) {
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key) throw new Error('The back end has no key yet. Run setUp in the Apps Script editor.');
  if (typeof given !== 'string' || given !== key) throw new Error('This link has been replaced. Ask for the current wmhb link.');
}

/** One writer at a time, so two taps can't land in the same row or take the same booking ID. */
function withLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

/* ---------- the tracker ---------- */

let book;                                     // opened once per request
const tabs = {};

function book_() {
  if (!book) book = SpreadsheetApp.openById(SHEET_ID);
  return book;
}

function tab_(name) {
  if (!tabs[name]) {
    tabs[name] = book_().getSheetByName(name);
    if (!tabs[name]) throw new Error('The "' + name + '" tab is missing from the tracker.');
  }
  return tabs[name];
}

/** Maps each heading in a row of cells to its column number (1 = column A). */
function columnsOf_(headings) {
  const col = {};
  headings.forEach((heading, i) => {
    const text = String(heading).trim();
    if (text && !(text in col)) col[text] = i + 1;
  });
  return col;
}

/** A booking tab: its sheet, its heading row (the one that starts with Booking ID) and its columns. */
function bookingTab_(name) {
  const sheet = tab_(name);
  const top = sheet.getRange(1, 1, 10, sheet.getLastColumn()).getValues();
  const at = top.findIndex(row => String(row[0]).trim() === 'Booking ID');
  if (at < 0) throw new Error('Could not find the "Booking ID" heading on the ' + name + ' tab.');
  return { sheet: sheet, name: name, headRow: at + 1, col: columnsOf_(top[at]) };
}

function enquiryTab_() {
  const sheet = tab_(TAB.enquiries);
  const col = columnsOf_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  ENQUIRY_HEADINGS.forEach(heading => {
    if (!col[heading]) throw new Error('The Enquiries tab is missing its "' + heading + '" heading.');
  });
  return { sheet: sheet, col: col };
}

/** The dropdown lists from Settings, and the packages from Prices. */
function lists_() {
  const lists = { packages: [] };

  const settings = tab_(TAB.settings).getDataRange().getValues();
  const head = settings.findIndex(row => String(row[1]).trim() === 'Event type');
  if (head >= 0) {
    const options = settings.slice(head + 1, head + 14);
    settings[head].forEach((heading, c) => {
      const name = String(heading).trim();
      if (name) lists[name] = options.map(row => String(row[c]).trim()).filter(Boolean);
    });
  }

  const prices = tab_(TAB.prices).getDataRange().getValues();
  const top = prices.findIndex(row => String(row[1]).trim() === 'Package');
  if (top >= 0) {
    const priceAt = prices[top].findIndex(heading => String(heading).trim() === 'Price');
    for (let r = top + 1; r < prices.length && String(prices[r][1]).trim(); r++) {
      const price = priceAt < 0 ? '' : prices[r][priceAt];
      lists.packages.push({ name: String(prices[r][1]).trim(), price: price !== '' && isFinite(Number(price)) ? Number(price) : null });
    }
  }
  return lists;
}

/* ---------- reading ---------- */

/** Everything the Clients screen shows. Pass the lists in if they have already been read. */
function read_(lists) {
  const timeZone = book_().getSpreadsheetTimeZone();
  const day = value => isDate_(value) ? Utilities.formatDate(value, timeZone, 'yyyy-MM-dd') : '';
  const all = lists || lists_();
  const dropdowns = Object.assign({}, all);
  delete dropdowns.packages;
  return {
    readAt: Date.now(),
    sheetId: SHEET_ID,
    bookings: readBookings_(day),
    enquiries: readEnquiries_(day),
    lists: dropdowns,
    packages: all.packages
  };
}

function readBookings_(day) {
  const clients = bookingTab_(TAB.clients), money = bookingTab_(TAB.money);
  const count = LAST_BOOKING_ROW - clients.headRow;
  const rows = clients.sheet.getRange(clients.headRow + 1, 1, count, clients.col['Notes'] || clients.sheet.getLastColumn()).getValues();

  // Only the four money columns the screen needs, not the whole tab and its reports.
  const wanted = ['Total', 'Received', 'Owing', 'Invoice no.'].filter(h => money.col[h]);
  const firstCol = Math.min.apply(null, wanted.map(h => money.col[h]));
  const lastCol = Math.max.apply(null, wanted.map(h => money.col[h]));
  const lined = wanted.length && money.headRow === clients.headRow;
  const sums = lined ? money.sheet.getRange(money.headRow + 1, firstCol, count, lastCol - firstCol + 1).getValues() : [];

  const bookings = [];
  rows.forEach((row, i) => {
    const cell = heading => clients.col[heading] ? row[clients.col[heading] - 1] : '';
    const sum = heading => lined && money.col[heading] ? sums[i][money.col[heading] - firstCol] : '';
    const client = String(cell('Client name')).trim();
    if (!client) return;
    bookings.push({
      row: clients.headRow + 1 + i,
      id: String(cell('Booking ID')),
      client: client,
      date: day(cell('Event date')),
      status: String(cell('Status')),
      nextStep: String(cell('Next step')),
      phone: String(cell('Phone')),
      email: String(cell('Email')),
      insta: String(cell('Instagram')),
      source: String(cell('How they found us')),
      type: String(cell('Event type')),
      venue: String(cell('Venue')),
      suburb: String(cell('Suburb')),
      region: String(cell('Region')),
      pkg: String(cell('Package')),
      cancelled: String(cell('Cancelled')),
      notes: String(cell('Notes')),
      total: Number(sum('Total')) || 0,
      received: Number(sum('Received')) || 0,
      owing: Number(sum('Owing')) || 0,
      invoice: String(sum('Invoice no.'))
    });
  });
  return bookings;
}

function readEnquiries_(day) {
  const tab = enquiryTab_(), last = tab.sheet.getLastRow();
  if (last < 2) return [];
  const enquiries = [];
  tab.sheet.getRange(2, 1, last - 1, tab.sheet.getLastColumn()).getValues().forEach((row, i) => {
    const cell = heading => row[tab.col[heading] - 1];
    const name = String(cell('Name')).trim();
    if (!name) return;
    const eventDate = cell('Event date');
    enquiries.push({
      row: i + 2,
      received: day(cell('Received')),
      name: name,
      contact: String(cell('Instagram or phone')),
      type: String(cell('Event type')),
      date: isDate_(eventDate) ? day(eventDate) : String(eventDate),
      message: String(cell('Message')),
      status: String(cell('Status')),
      what: String(cell('What happened')),
      bookingId: String(cell('Booking ID'))
    });
  });
  return enquiries;
}

/* ---------- the public enquiry form: no key, can only add one row to Enquiries ---------- */

function enquire_(arg) {
  if (arg.website) return 'ok';               // spam trap: people never see this field
  const enquiry = {
    'Name': tidy_(arg.name, 80), 'Instagram or phone': tidy_(arg.contact, 80), 'Event type': tidy_(arg.type, 40),
    'Event date': tidy_(arg.date, 60), 'Message': tidy_(arg.message, 600)
  };
  if (!enquiry['Name'] || !enquiry['Instagram or phone']) throw new Error('Please add your name and a way to reach you.');

  withLock_(() => {
    const tab = enquiryTab_(), sheet = tab.sheet, last = sheet.getLastRow(), now = new Date();
    if (last > 1) {
      const recent = sheet.getRange(Math.max(2, last - 29), tab.col['Received'], Math.min(30, last - 1), 1).getValues();
      const lastHour = recent.filter(r => isDate_(r[0]) && now - r[0] < 3600000).length;
      if (lastHour >= ENQUIRY_LIMIT_PER_HOUR) throw new Error('We are getting a lot of enquiries right now. Please message us on Instagram instead.');
    }
    const row = last + 1;
    // Enquiries only: this tab does not line up with the booking tabs, so adding rows at the bottom is safe.
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 50);

    // The row is new and empty, so its cells go in as one block: one write instead of seven.
    const headings = ['Received'].concat(Object.keys(enquiry), ['Status']);
    const firstCol = Math.min.apply(null, headings.map(h => tab.col[h]));
    const width = Math.max.apply(null, headings.map(h => tab.col[h])) - firstCol + 1;
    const values = new Array(width).fill(''), formats = new Array(width).fill('General');
    const place = (heading, value, format) => { values[tab.col[heading] - firstCol] = value; formats[tab.col[heading] - firstCol] = format; };
    place('Received', now, 'd mmm yyyy h:mm');
    Object.keys(enquiry).forEach(heading => place(heading, enquiry[heading], '@'));
    place('Status', 'New', 'General');
    sheet.getRange(row, firstCol, 1, width).setNumberFormats([formats]).setValues([values]);
  });

  emailAlert_(enquiry);
  return 'ok';
}

/** Trims what a stranger typed: no control characters, nothing a sheet could read as a formula. */
function tidy_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]+/g, ' ').replace(/^[=+@\s-]+/, '').trim().slice(0, maxLength);
}

/** Emails the business inbox about a new enquiry. If the email fails, the enquiry is still saved. */
function emailAlert_(enquiry) {
  try {
    const to = PropertiesService.getScriptProperties().getProperty('ALERT_TO');
    if (!to) return;
    const name = enquiry['Name'], type = enquiry['Event type'], date = enquiry['Event date'];
    const lines = [
      'New enquiry from the wmhb page.', '',
      'Name: ' + name,
      'Reply to: ' + enquiry['Instagram or phone'],
      'Event: ' + (type || 'not given'),
      'Date: ' + (date || 'not given')
    ];
    if (enquiry['Message']) lines.push('Message: ' + enquiry['Message']);
    lines.push('', 'It is in the wmhb app on the Clients screen, and on the Enquiries tab of the tracker.');
    MailApp.sendEmail(to, 'New enquiry: ' + [name, type, date].filter(Boolean).join(', '), lines.join('\n'), { name: 'wmhb enquiries' });
  } catch (err) {
    console.error('Enquiry alert not sent: ' + err);
  }
}

/* ---------- enquiries: the one-tap status picker ---------- */

/** arg = {row, name, status, eventDate}. Waiting on deposit also creates the booking. Call with the lock held. */
function setEnquiryStatus_(arg) {
  const status = String(arg.status || '').trim(), row = Number(arg.row);
  const lists = lists_();
  const onSettings = lists['Enquiry status'] && lists['Enquiry status'].length ? lists['Enquiry status'] : ENQUIRY_STATUSES;
  if (!ENQUIRY_STATUSES.includes(status) || !onSettings.includes(status)) throw new Error('"' + status + '" is not an enquiry status on the Settings tab.');

  const tab = enquiryTab_(), sheet = tab.sheet;
  if (!(row > 1 && row <= sheet.getLastRow())) throw new Error('That enquiry is no longer there. Press Refresh.');
  const line = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  const values = line.getValues()[0], formulas = line.getFormulas()[0];
  const cell = heading => values[tab.col[heading] - 1];

  if (String(cell('Name')).trim() !== String(arg.name).trim()) throw new Error('The enquiries have moved. Press Refresh and try again.');
  if (String(cell('What happened')).trim() === 'Moved to bookings') {
    throw new Error('This enquiry is already booking ' + String(cell('Booking ID')).trim() + '. Change it on the Clients tab.');
  }
  ['Status', 'What happened', 'Booking ID'].forEach(heading => {
    if (formulas[tab.col[heading] - 1]) throw new Error(heading + ' on the Enquiries tab holds a formula, so nothing was changed.');
  });

  const booking = status === 'Waiting on deposit' ? newBooking_(bookingFromEnquiry_(cell, arg.eventDate, lists), lists) : { id: '', row: 0 };

  const what = status === 'Waiting on deposit' ? 'Moved to bookings' : status === 'Cancelled' ? 'Cancelled' : '';
  sheet.getRange(row, tab.col['Status']).setValue(status);
  sheet.getRange(row, tab.col['What happened']).setValue(what);
  sheet.getRange(row, tab.col['Booking ID']).setNumberFormat('@').setValue(booking.id);
  SpreadsheetApp.flush();
  return { id: booking.id, row: booking.row, data: read_(lists) };
}

/** Turns an enquiry row into the fields of a new booking. cell(heading) gives the enquiry's values. */
function bookingFromEnquiry_(cell, askedDate, lists) {
  const timeZone = book_().getSpreadsheetTimeZone();
  const fields = { 'Client name': String(cell('Name')).trim() };

  const contact = String(cell('Instagram or phone')).trim();
  const phone = /^phone\s+(.+)$/i.exec(contact), insta = /^instagram\s+(.+)$/i.exec(contact);
  if (phone) fields['Phone'] = phone[1];
  else if (insta) fields['Instagram'] = insta[1];
  else if (/^[\d\s()+-]{7,}$/.test(contact)) fields['Phone'] = contact;
  else fields['Instagram'] = contact;

  const typed = String(cell('Event type')).trim(), type = FORM_TYPES[typed] || typed;
  if ((lists['Event type'] || []).includes(type)) fields['Event type'] = type;

  const asked = String(askedDate || '').trim(), wanted = cell('Event date');
  if (asked && !/^\d{4}-\d{2}-\d{2}$/.test(asked)) throw new Error('The event date needs to be a date.');
  const date = asked || (isDate_(wanted) ? Utilities.formatDate(wanted, timeZone, 'yyyy-MM-dd') : looseDate_(wanted));
  if (date) fields['Event date'] = date;

  const message = String(cell('Message')).trim(), venue = /venue:\s*([^\n]+)/i.exec(message);
  if (venue) fields['Venue'] = venue[1].trim();

  const received = cell('Received');
  const note = ['From the enquiry' + (isDate_(received) ? ' of ' + Utilities.formatDate(received, timeZone, 'd MMM yyyy') : '') + '.'];
  if (!fields['Event type'] && type) note.push('Event type: ' + type + '.');
  if (!date && String(wanted).trim()) note.push('Wants: ' + String(wanted).trim() + '.');
  if (message) note.push(message);
  fields['Notes'] = note.join(' ');
  return fields;
}

/* ---------- bookings ---------- */

/** fields = {heading: value}, from the app's add-a-booking form. Call with the lock held. */
function addBooking_(fields) {
  const lists = lists_(), booking = newBooking_(fields, lists);
  SpreadsheetApp.flush();
  return { id: booking.id, row: booking.row, data: read_(lists) };
}

/** Writes one booking into the first empty row. Nothing is written until every value has passed. */
function newBooking_(fields, lists) {
  if (!String(fields['Client name'] || '').trim()) throw new Error('A booking needs a client name.');
  Object.keys(fields).forEach(heading => {
    if (!CLIENT_FIELDS[heading] && !MONEY_FIELDS[heading]) throw new Error('"' + heading + '" is not a column this app may change.');
  });

  const clients = bookingTab_(TAB.clients), money = bookingTab_(TAB.money);
  if (clients.headRow !== money.headRow) throw new Error('The Clients and Money tabs no longer line up. Nothing was changed.');
  ['Booking ID', 'Client name'].forEach(heading => {
    if (!clients.col[heading]) throw new Error('The Clients tab is missing its "' + heading + '" heading.');
  });

  // Find the first row with no client name, and the highest booking ID so far.
  const firstRow = clients.headRow + 1;
  const width = Math.max(clients.col['Booking ID'], clients.col['Client name']);
  const existing = clients.sheet.getRange(firstRow, 1, LAST_BOOKING_ROW - clients.headRow, width).getValues();
  let row = 0, highest = 0;
  existing.forEach((line, i) => {
    const id = /^B-(\d{4})$/.exec(String(line[clients.col['Booking ID'] - 1]).trim());
    if (id) highest = Math.max(highest, Number(id[1]));
    if (!row && !String(line[clients.col['Client name'] - 1]).trim()) row = firstRow + i;
  });
  if (!row) throw new Error('The Clients tab has no empty rows left.');
  if (String(existing[row - firstRow][clients.col['Booking ID'] - 1]).trim()) {
    throw new Error('Row ' + row + ' on the Clients tab has a booking ID but no name. Fix that row in the tracker first.');
  }

  // Use the next ID shown on Settings, unless it is behind the IDs already in use.
  const shown = String(tab_(TAB.settings).getRange(NEXT_BOOKING_ID_CELL).getDisplayValue()).trim();
  const shownNumber = /^B-(\d{4})$/.exec(shown);
  const id = shownNumber && Number(shownNumber[1]) > highest ? shown : 'B-' + ('0000' + (highest + 1)).slice(-4);

  // Check everything first. One read of the row's formulas per tab covers every cell.
  const writes = [];
  [[clients, CLIENT_FIELDS], [money, MONEY_FIELDS]].forEach(pair => {
    const tab = pair[0], rules = pair[1];
    const formulas = tab.sheet.getRange(row, 1, 1, tab.sheet.getLastColumn()).getFormulas()[0];
    const guard = heading => {
      if (!tab.col[heading]) throw new Error('The ' + tab.name + ' tab is missing its "' + heading + '" heading.');
      if (formulas[tab.col[heading] - 1]) throw new Error(heading + ' in row ' + row + ' holds a formula, so nothing was changed.');
    };
    if (tab === clients) guard('Booking ID');
    Object.keys(rules).forEach(heading => {
      const text = fields[heading] == null ? '' : String(fields[heading]).trim();
      if (!text) return;
      guard(heading);
      checkValue_(heading, rules[heading], text, lists);
      writes.push({ cell: tab.sheet.getRange(row, tab.col[heading]), type: rules[heading], text: text });
    });
  });

  clients.sheet.getRange(row, clients.col['Booking ID']).setNumberFormat('@').setValue(id);
  writes.forEach(writeValue_);
  return { id: id, row: row };
}

/** Throws if the value is not allowed in that kind of column. */
function checkValue_(heading, type, text, lists) {
  if (text.charAt(0) === '=') throw new Error(heading + ' cannot start with an equals sign.');
  if (type === 'num') {
    const number = Number(text);
    if (!isFinite(number) || number < 0) throw new Error(heading + ' needs a number, zero or more.');
  } else if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(heading + ' needs a date.');
  } else if (type === 'yes') {
    if (text !== 'Yes') throw new Error(heading + ' can only be Yes or empty.');
  } else if (type === 'package') {
    if (!lists.packages.some(p => p.name === text)) throw new Error('"' + text + '" is not a package on the Prices tab.');
  } else if (type.indexOf('list:') === 0) {
    if (!(lists[type.slice(5)] || []).includes(text)) throw new Error('"' + text + '" is not an option for ' + heading + ' on the Settings tab.');
  }
}

function writeValue_(write) {
  const cell = write.cell, text = write.text;
  if (write.type === 'num') {
    cell.setValue(Math.round(Number(text) * 100) / 100);
  } else if (write.type === 'date') {
    const parts = text.split('-').map(Number);
    const unformatted = /^(general|0\.?#*)$/i.test(cell.getNumberFormat());
    cell.setValue(serial_(parts[0], parts[1], parts[2]));
    if (unformatted) cell.setNumberFormat('ddd d mmm yyyy');
  } else if (write.type === 'text') {
    cell.setNumberFormat('@').setValue(text);     // plain text, so a phone number keeps its leading 0
  } else {
    cell.setValue(text);
  }
}

/* ---------- dates ---------- */

function isDate_(value) {
  return Object.prototype.toString.call(value) === '[object Date]';
}

/** The number a sheet stores for a date. */
function serial_(year, month, day) {
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 864e5);
}

/** Reads a typed date such as "5 December 2026". A month on its own ("January 2027") is not a full date, so it gives ''. */
function looseDate_(typed) {
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const text = String(typed == null ? '' : typed).trim().replace(/^[A-Za-z]{3,9},?\s+(?=\d)/, '');   // drops a leading "Sat "
  let year, month, day, m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text))) { year = +m[1]; month = +m[2] - 1; day = +m[3]; }
  else if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})$/.exec(text))) { day = +m[1]; month = MONTHS.indexOf(m[2].toLowerCase()); year = +m[3]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text))) { day = +m[1]; month = +m[2] - 1; year = +m[3]; }
  else return '';
  const check = new Date(Date.UTC(year, month, day));
  if (month < 0 || month > 11 || check.getUTCDate() !== day || check.getUTCMonth() !== month) return '';
  return year + '-' + ('0' + (month + 1)).slice(-2) + '-' + ('0' + day).slice(-2);
}
