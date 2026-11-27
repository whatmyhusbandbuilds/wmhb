/**
 * wmhb app 2: the back end for the new wmhb app (the /new/ page).
 *
 * It reads the new tracker, "wmhb tracker (new layout) v3", and nothing else.
 *
 * What it may write
 *   - Clients, Money, Event day and Designs tabs: only the typed columns named in the
 *     lists below (CLIENT_FIELDS, MONEY_FIELDS, EVENT_FIELDS, BRIEF_FIELDS and so on).
 *   - Payments and Expenses tabs: a new row in the next empty row, and the "Removed" cell of a row
 *     (a date marks the row removed; every total skips it; no row is ever deleted).
 *   - Enquiries tab: a new row from the public form, and the Status, What happened, Booking ID,
 *     Got in touch by and Handle or number cells.
 *   - Google Drive: a brief photo, into the client's own folder inside the designs folder
 *     ("07 Client Designs", script property DESIGNS_FOLDER). The client's folder is named like the
 *     invoice folders, "005, Pearl", and is made the first time a photo is added.
 *
 * What it never does
 *   - write to a cell that holds a formula (the grey "auto" columns),
 *   - write to Received or Bond on the Money tab (a payment is a row on Payments),
 *   - sort, insert or delete rows on Clients, Money, Event day, Videos, Designs,
 *     Payments or Expenses,
 *   - open any other spreadsheet,
 *   - write anything to Google Drive outside the designs folder. The client videos folders
 *     ("06 Client Videos") are Aadil's alone: the app only links to them.
 *
 * The key is NOT in this file. Run setUp once from the editor. It makes a key and
 * keeps it in Project Settings > Script properties, under KEY.
 */

const SHEET_ID = '1uH_ZXGwWNP-M9AYiWtVUs9VqZyJ4NB7fu_d--PQtoDo';
const TAB = {
  clients: 'Clients', enquiries: 'Enquiries', money: 'Money', payments: 'Payments', expenses: 'Expenses',
  eventDay: 'Event day', videos: 'Videos', designs: 'Designs', prices: 'Prices', settings: 'Settings'
};
const LAST_BOOKING_ROW = 504;                 // bookings live in rows 5 to 504
const NEXT_INVOICE_CELL = 'C28';              // on the Settings tab
const NEXT_BOOKING_ID_CELL = 'C29';           // on the Settings tab
const REPORTS_RANGE = 'AC5:AH5';              // on the Money tab, used if the report headings can't be found
const ENQUIRY_LIMIT_PER_HOUR = 15;
const LOCK_WAIT_MS = 20000;
const PHOTO_MAX_CHARS = 4000000;              // about 3 MB once decoded
const PHOTOS_SHOWN = 12;

const ENQUIRY_STATUSES = ['New', 'Waiting on response', 'Waiting on deposit', 'Cancelled'];
/* A booking's status, as the client sheet sets it by hand. "Completed" is what the app calls Done. */
const BOOKING_STATUSES = ['Waiting on deposit', 'Booked', 'Completed', 'Cancelled'];
/* How a client got in touch. The Settings tab may hold its own list, called "Got in touch by". */
const SOURCES = ['Instagram', 'Messenger', 'WhatsApp', 'TikTok', 'Text or call', 'Email', 'Website form'];
const PACKING = ['Top board', 'Bottom board', 'Base', 'Laptop and charger', 'Camera', 'Monitor', 'Light',
  'Vintage phone', 'Speaker', 'Cable box', '10 m extension cord', 'Table message cards'];

/* Used only if the list is missing from the Settings tab. */
const SPARE_LISTS = {
  'Yes': ['Yes'],
  'Payment type': ['Hire', 'Bond in', 'Bond back'],
  'Got in touch by': SOURCES,
  'Status by hand': ['Waiting on deposit', 'Booked', 'Completed'],
  'Expense type': ['Equipment', 'Running costs', 'Marketing', 'Software', 'Contractor']
};

/* Every heading the app looks for, tab by tab. checkTracker lists any that are missing. */
const HEADINGS = {
  'Clients': ['Booking ID', 'Client name', 'Event date', 'Status', 'Next step', 'Phone', 'Email', 'Instagram', 'How they found us',
    'Referred by', 'Event type', 'Venue', 'Suburb', 'Region', 'Package', 'Cancelled', 'Notes', 'Status by hand', 'Got in touch by', 'Handle or number'],
  'Enquiries': ['Received', 'Name', 'Instagram or phone', 'Event type', 'Event date', 'Message', 'Status', 'What happened', 'Booking ID',
    'Got in touch by', 'Handle or number'],
  'Money': ['Booking ID', 'Custom price', 'Highlight reel', 'Custom board and screen', 'No power point', 'Second event', 'Host hours',
    'Extra hours', 'Extra days', 'Travel fee', 'Discount', 'Package price', 'Extras', 'Total', 'Received', 'Owing', 'Invoice no.',
    'Bond', 'Costs logged', 'Other costs', 'Profit'],
  'Payments': ['Date', 'Invoice no.', 'Client', 'Amount', 'What', 'Paid by or a note', 'Removed'],
  'Expenses': ['Date', 'What', 'Type', 'Amount', 'Invoice no.', 'Client', 'Notes', 'Removed'],
  'Event day': ['Booking ID', 'Hours', 'Power point', 'Setup time', 'Start time', 'Who is running it', 'Venue confirmed', 'Power sorted',
    'Packed', 'Packed items', 'Day notes', 'Fee paid in full', 'Bond paid', 'Board design approved', 'Start time set'],
  'Videos': ['Booking ID', 'Guest messages', 'Videos sent', 'Drive folder link', 'Link ends', 'Clips OK to share', 'OK to send offers', 'Review'],
  'Designs': ['Booking ID', 'Custom board?', 'Board design', 'Screen design', 'Canva link', 'Sticker printed', 'Names or title', 'Second line',
    'Default screen wording', 'Thank you wording', 'Theme colours', 'Brief notes', 'Photos link', 'Styles made on']
};
const REPORTS = { income: 'Income', expenses: 'Expenses', profit: 'Profit', expected: 'Expected income', bondsHeld: 'Bonds held', bank: 'Should be in the bank' };

/* The only columns this app may write to, and what each one accepts. */
const CLIENT_FIELDS = {
  'Client name': 'text', 'Event date': 'date', 'Phone': 'text', 'Email': 'text', 'Instagram': 'text',
  'How they found us': 'list:How they found us', 'Referred by': 'text', 'Event type': 'list:Event type',
  'Venue': 'text', 'Suburb': 'text', 'Region': 'list:Region', 'Package': 'package', 'Notes': 'text',
  'Got in touch by': 'list:Got in touch by', 'Handle or number': 'text'
};
/* Columns added on 27 Nov 2026. A booking still saves on a tracker that doesn't have them yet; it just leaves them out. */
const NEWER_CLIENT_FIELDS = ['Got in touch by', 'Handle or number'];
const MONEY_FIELDS = {
  'Custom price': 'num', 'Highlight reel': 'yes', 'Custom board and screen': 'yes', 'No power point': 'yes',
  'Second event': 'yes', 'Host hours': 'num', 'Extra hours': 'num', 'Extra days': 'num', 'Travel fee': 'num',
  'Discount': 'num'
};
const PAYMENT_FIELDS = { 'Date': 'date', 'Invoice no.': 'text', 'Amount': 'num', 'What': 'list:Payment type', 'Paid by or a note': 'text' };
const EXPENSE_FIELDS = { 'Date': 'date', 'What': 'text', 'Type': 'list:Expense type', 'Amount': 'num', 'Invoice no.': 'text', 'Notes': 'text' };
/* A tick by hand on Event day keeps the date it was ticked (27 Nov 2026); an older "Yes" still counts as ticked.
   Four of the seven also go green by themselves in the app, from the money, the designs and the start time. */
const EVENT_FIELDS = {
  'Setup time': 'time', 'Start time': 'time', 'Who is running it': 'text', 'Venue confirmed': 'tick', 'Power sorted': 'tick',
  'Fee paid in full': 'tick', 'Bond paid': 'tick', 'Board design approved': 'tick', 'Start time set': 'tick'
};
const DESIGN_TICKS = { 'Sticker printed': 'tick' };     // ticked on the Event day screen, kept on the Designs tab
/* The brief, as the app names each part, and the Designs column it is kept in. */
const BRIEF_FIELDS = {
  names: 'Names or title', line2: 'Second line', defaultWording: 'Default screen wording', thanksWording: 'Thank you wording',
  colours: 'Theme colours', notes: 'Brief notes'
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
  DriveApp.getRootFolder().getName();         // asks for permission to save brief photos to Drive
  console.log('Your key (treat it like a password): ' + key);
  console.log('New-enquiry emails go to: ' + (props.getProperty('ALERT_TO') || 'nobody yet. Add a script property called ALERT_TO.'));
  console.log('Main client videos folder: ' + (props.getProperty('VIDEOS_FOLDER') ? 'set.' : 'not set yet. Add a script property called VIDEOS_FOLDER holding the folder link.'));
  console.log('Client designs folder: ' + (props.getProperty('DESIGNS_FOLDER') ? 'set.' : 'not set yet. Add a script property called DESIGNS_FOLDER holding the link to 07 Client Designs.'));
  checkTracker();
}

/** Run this to lock out an old link. It makes a new key and shows it in the Execution log. */
function newKey() {
  PropertiesService.getScriptProperties().deleteProperty('KEY');
  setUp();
}

/** Run this to see whether the tracker has every tab and heading the app needs. It changes nothing. */
function checkTracker() {
  const found = [];
  try { read_(null, found); } catch (err) { found.push(String((err && err.message) || err)); }
  if (!found.length) console.log('The tracker has every tab and heading the app needs.');
  found.forEach(line => console.log('Check: ' + line));
  return found;
}

/* ---------- the web app ---------- */

function doGet() {
  return ContentService.createTextOutput('wmhb app 2 is running.');
}

/** Reads need the key. Changes need the key and are done one at a time. */
const READS = {
  getData: () => ({ data: read_() }),
  getBriefPhotos: arg => getBriefPhotos_(arg)
};
const CHANGES = {
  setEnquiryStatus: arg => setEnquiryStatus_(arg),
  addBooking: arg => addBooking_(arg),
  addPayment: arg => addPayment_(arg),
  addExpense: arg => addExpense_(arg),
  removeEntries: arg => removeEntries_(arg),
  setBookingStatus: arg => setBookingStatus_(arg),
  setContact: arg => setContact_(arg),
  setEventDay: arg => setEventDay_(arg),
  setPacking: arg => setPacking_(arg),
  saveBrief: arg => saveBrief_(arg),
  addBriefPhoto: arg => addBriefPhoto_(arg),
  setDesignPick: arg => setDesignPick_(arg)
};
const has_ = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** The page on GitHub talks to the tracker through here. Body: {k, fn, arg} as JSON text. */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const arg = request.arg || {}, fn = String(request.fn);
    if (fn === 'enquire') return json_({ ok: true, result: enquire_(arg) });

    requireKey_(request.k);
    if (has_(READS, fn)) return json_({ ok: true, result: READS[fn](arg) });
    if (has_(CHANGES, fn)) return json_({ ok: true, result: withLock_(() => CHANGES[fn](arg)) });
    throw new Error('Unknown request.');
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
const headRows = {};                          // each tab's heading row, looked up once per request

function book_() {
  if (!book) book = SpreadsheetApp.openById(SHEET_ID);
  return book;
}

function tab_(name) {
  if (!tabs[name]) {
    tabs[name] = book_().getSheetByName(name);
    if (!tabs[name]) throw new Error('The "' + name + '" tab is missing from the tracker. Tell Aadil.');
  }
  return tabs[name];
}

/** A heading as the app reads it: tidy spaces, and no "(auto)" note on the end. */
function heading_(cell) {
  return String(cell).replace(/\s+/g, ' ').replace(/\s*\(auto[^)]*\)\s*$/i, '').trim();
}

/** Maps each heading in a row of cells to its column number (1 = column A). */
function columnsOf_(headings) {
  const col = {};
  headings.forEach((heading, i) => {
    const text = heading_(heading);
    if (text && !(text in col)) col[text] = i + 1;
  });
  return col;
}

/** A tab with a heading row: its sheet, where the headings are, and its columns. marks = headings that row must hold. */
function headed_(name, marks) {
  if (headRows[name]) return headRows[name];
  const sheet = tab_(name), width = sheet.getLastColumn();
  if (!width) throw new Error('The ' + name + ' tab is empty. Tell Aadil.');
  const top = sheet.getRange(1, 1, Math.min(10, sheet.getMaxRows()), width).getValues();
  const at = top.findIndex(row => { const row_ = row.map(heading_); return marks.every(mark => row_.includes(mark)); });
  if (at < 0) throw new Error('Could not find the "' + marks[0] + '" heading on the ' + name + ' tab. Tell Aadil.');
  headRows[name] = { sheet: sheet, name: name, headRow: at + 1, col: columnsOf_(top[at]), width: width, headings: top[at].map(heading_) };
  return headRows[name];
}

/** Clients, Money, Event day, Videos or Designs: the same row is the same booking on each. */
function bookingTab_(name) {
  return headed_(name, ['Booking ID']);
}

/** Payments or Expenses: a plain list. */
function listTab_(name) {
  return headed_(name, ['Date', 'Amount']);
}

function enquiryTab_() {
  const tab = headed_(TAB.enquiries, ['Received', 'Name']);
  HEADINGS['Enquiries'].filter(heading => !NEWER_CLIENT_FIELDS.includes(heading)).forEach(heading => {
    if (!tab.col[heading]) throw new Error('The Enquiries tab is missing its "' + heading + '" heading. Tell Aadil.');
  });
  return tab;
}

/** Throws unless the tab has that heading. */
function need_(tab, heading) {
  if (!tab.col[heading]) throw new Error('The ' + tab.name + ' tab is missing its "' + heading + '" heading. Nothing was changed. Tell Aadil.');
  return tab.col[heading];
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

/** The options for one dropdown: from Settings, or the spare list if Settings has none. */
function options_(lists, name) {
  return lists[name] && lists[name].length ? lists[name] : (SPARE_LISTS[name] || []);
}

function today_() {
  return Utilities.formatDate(new Date(), book_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

/* ---------- reading ---------- */

/**
 * Everything every screen shows, in one read. Pass the lists in if they have already been read.
 * Anything the tracker is missing is listed in problems, and the rest is still read.
 */
function read_(lists, problems) {
  const timeZone = book_().getSpreadsheetTimeZone();
  const day = value => isDate_(value) ? Utilities.formatDate(value, timeZone, 'yyyy-MM-dd') : '';
  const wrong = problems || [];
  const tryTo = (work, otherwise) => {
    try { return work(); } catch (err) { wrong.push(String((err && err.message) || err)); return otherwise; }
  };

  const all = lists || lists_();
  const dropdowns = Object.assign({}, all);
  delete dropdowns.packages;
  if (!dropdowns['Event type']) wrong.push('Could not find the dropdown lists on the Settings tab.');
  if (!all.packages.length) wrong.push('Could not find the packages on the Prices tab.');

  return {
    readAt: Date.now(),
    today: Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd'),
    bookings: readBookings_(day, wrong),
    enquiries: tryTo(() => readEnquiries_(day, wrong), []),
    payments: tryTo(() => readPayments_(day, wrong), []),
    expenses: tryTo(() => readExpenses_(day, wrong), []),
    reports: tryTo(() => readReports_(), null),
    lists: dropdowns,
    packages: all.packages,
    prices: tryTo(() => tab_(TAB.prices).getDataRange().getDisplayValues(), []),   // the Prices tab as it reads, from A1
    packing: PACKING,
    videosFolder: String(PropertiesService.getScriptProperties().getProperty('VIDEOS_FOLDER') || ''),
    problems: wrong
  };
}

/** Lists the headings a tab should have and hasn't. */
function missing_(tab, problems) {
  (HEADINGS[tab.name] || []).forEach(heading => {
    if (!tab.col[heading]) problems.push('The ' + tab.name + ' tab is missing its "' + heading + '" heading.');
  });
}

function readBookings_(day, problems) {
  const clients = bookingTab_(TAB.clients);
  missing_(clients, problems);
  need_(clients, 'Client name');
  const first = clients.headRow + 1;
  const every = clients.sheet.getRange(first, 1, Math.min(LAST_BOOKING_ROW, clients.sheet.getMaxRows()) - clients.headRow, clients.width).getValues();
  let count = 0;                              // rows to read on the other tabs: down to the last client
  every.forEach((row, i) => { if (String(row[clients.col['Client name'] - 1]).trim()) count = i + 1; });
  if (!count) return [];

  /* One of the other booking tabs, read once. display = as the cells show, which suits times. raw(i, heading) = the value
     itself, for a tick that holds the date it was ticked. */
  const side = (name, display) => {
    try {
      const tab = bookingTab_(name);
      missing_(tab, problems);
      if (tab.headRow !== clients.headRow) throw new Error('The ' + name + ' tab no longer lines up with the Clients tab, so it was not read.');
      const range = tab.sheet.getRange(first, 1, count, tab.width);
      const rows = display ? range.getDisplayValues() : range.getValues(), values = display ? range.getValues() : rows;
      return { tab: tab, cell: (i, heading) => tab.col[heading] ? rows[i][tab.col[heading] - 1] : '', raw: (i, heading) => tab.col[heading] ? values[i][tab.col[heading] - 1] : '' };
    } catch (err) {
      problems.push(String((err && err.message) || err));
      return { tab: null, cell: () => '', raw: () => '' };
    }
  };
  const money = side(TAB.money, false), eventDay = side(TAB.eventDay, true), videos = side(TAB.videos, true), designs = side(TAB.designs, false);
  const folders = links_(videos.tab, 'Drive folder link', first, count);
  const photos = links_(designs.tab, 'Photos link', first, count);
  const canva = links_(designs.tab, 'Canva link', first, count);

  const text = value => String(value == null ? '' : value).trim();
  const number = value => Number(value) || 0;
  const tick = value => isDate_(value) ? day(value) : text(value);          // "2026-11-25" when ticked by hand on a day, or an older "Yes"
  const bookings = [];
  every.slice(0, count).forEach((row, i) => {
    const cell = heading => clients.col[heading] ? row[clients.col[heading] - 1] : '';
    const client = text(cell('Client name'));
    if (!client) return;
    const made = designs.cell(i, 'Styles made on');
    bookings.push({
      row: first + i,
      id: text(cell('Booking ID')),
      client: client,
      date: day(cell('Event date')),
      status: text(cell('Status')),
      nextStep: text(cell('Next step')),
      phone: text(cell('Phone')),
      email: text(cell('Email')),
      insta: text(cell('Instagram')),
      source: text(cell('How they found us')),
      referredBy: text(cell('Referred by')),
      type: text(cell('Event type')),
      venue: text(cell('Venue')),
      suburb: text(cell('Suburb')),
      region: text(cell('Region')),
      pkg: text(cell('Package')),
      cancelled: text(cell('Cancelled')),
      notes: text(cell('Notes')),
      statusByHand: text(cell('Status by hand')),
      gotInTouch: text(cell('Got in touch by')),
      handle: text(cell('Handle or number')),

      invoice: text(money.cell(i, 'Invoice no.')),
      total: number(money.cell(i, 'Total')),
      received: number(money.cell(i, 'Received')),
      owing: number(money.cell(i, 'Owing')),
      bond: text(money.cell(i, 'Bond')),
      packagePrice: number(money.cell(i, 'Package price')),
      extras: number(money.cell(i, 'Extras')),
      costs: number(money.cell(i, 'Costs logged')),
      otherCosts: number(money.cell(i, 'Other costs')),
      profit: number(money.cell(i, 'Profit')),
      customPrice: number(money.cell(i, 'Custom price')),
      highlightReel: text(money.cell(i, 'Highlight reel')),
      customDesign: text(money.cell(i, 'Custom board and screen')),
      noPowerPoint: text(money.cell(i, 'No power point')),
      secondEvent: text(money.cell(i, 'Second event')),
      hostHours: number(money.cell(i, 'Host hours')),
      extraHours: number(money.cell(i, 'Extra hours')),
      extraDays: number(money.cell(i, 'Extra days')),
      travelFee: number(money.cell(i, 'Travel fee')),
      discount: number(money.cell(i, 'Discount')),

      eventDay: {
        hours: text(eventDay.cell(i, 'Hours')),
        powerPoint: text(eventDay.cell(i, 'Power point')),
        setupTime: text(eventDay.cell(i, 'Setup time')),
        startTime: text(eventDay.cell(i, 'Start time')),
        runningIt: text(eventDay.cell(i, 'Who is running it')),
        venueConfirmed: tick(eventDay.raw(i, 'Venue confirmed')),
        powerSorted: tick(eventDay.raw(i, 'Power sorted')),
        feePaid: tick(eventDay.raw(i, 'Fee paid in full')),
        bondPaid: tick(eventDay.raw(i, 'Bond paid')),
        designApproved: tick(eventDay.raw(i, 'Board design approved')),
        startSet: tick(eventDay.raw(i, 'Start time set')),
        packed: text(eventDay.cell(i, 'Packed')),
        packedItems: text(eventDay.cell(i, 'Packed items')),
        notes: text(eventDay.cell(i, 'Day notes'))
      },
      videos: {
        folder: folders[i] || '',
        guestMessages: text(videos.cell(i, 'Guest messages')),
        sent: text(videos.cell(i, 'Videos sent')),
        linkEnds: text(videos.cell(i, 'Link ends')),
        clipsOk: text(videos.cell(i, 'Clips OK to share')),
        offersOk: text(videos.cell(i, 'OK to send offers')),
        review: text(videos.cell(i, 'Review'))
      },
      designs: {
        customBoard: text(designs.cell(i, 'Custom board?')),
        board: text(designs.cell(i, 'Board design')),
        screen: text(designs.cell(i, 'Screen design')),
        canva: canva[i] || '',
        stickerPrinted: tick(designs.raw(i, 'Sticker printed')),
        names: text(designs.cell(i, 'Names or title')),
        line2: text(designs.cell(i, 'Second line')),
        defaultWording: text(designs.cell(i, 'Default screen wording')),
        thanksWording: text(designs.cell(i, 'Thank you wording')),
        colours: text(designs.cell(i, 'Theme colours')),
        notes: text(designs.cell(i, 'Brief notes')),
        photos: photos[i] || '',
        madeOn: isDate_(made) ? day(made) : text(made)
      }
    });
  });
  return bookings;
}

/** One column of links. A cell may show the address itself, or words with the link behind them. */
function links_(tab, heading, firstRow, count) {
  if (!tab || !tab.col[heading] || !count) return [];
  const range = tab.sheet.getRange(firstRow, tab.col[heading], count, 1);
  const shown = range.getDisplayValues().map(line => String(line[0]).trim());
  if (shown.every(words => !words || /^https?:\/\//i.test(words))) return shown;
  const rich = range.getRichTextValues();
  return shown.map((words, i) => {
    if (!words || /^https?:\/\//i.test(words)) return words;
    return (rich[i][0] && rich[i][0].getLinkUrl()) || '';
  });
}

function readEnquiries_(day, problems) {
  const tab = enquiryTab_(), last = tab.sheet.getLastRow();
  NEWER_CLIENT_FIELDS.forEach(heading => { if (!tab.col[heading] && problems) problems.push('The Enquiries tab is missing its "' + heading + '" heading.'); });
  if (last < 2) return [];
  const enquiries = [];
  tab.sheet.getRange(2, 1, last - 1, tab.width).getValues().forEach((row, i) => {
    const cell = heading => tab.col[heading] ? row[tab.col[heading] - 1] : '';
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
      bookingId: String(cell('Booking ID')),
      gotInTouch: String(cell('Got in touch by')).trim(),
      handle: String(cell('Handle or number')).trim()
    });
  });
  return enquiries;
}

/** The rows of Payments or Expenses that have something typed in them. */
function listRows_(tab) {
  const first = tab.headRow + 1, last = tab.sheet.getLastRow();
  return last < first ? [] : tab.sheet.getRange(first, 1, last - first + 1, tab.width).getValues();
}

function readPayments_(day, problems) {
  const tab = listTab_(TAB.payments);
  missing_(tab, problems);
  const payments = [];
  listRows_(tab).forEach((row, i) => {
    const cell = heading => tab.col[heading] ? row[tab.col[heading] - 1] : '';
    const amount = Number(cell('Amount')) || 0, what = String(cell('What')).trim();
    if (!amount && !what) return;
    payments.push({
      row: tab.headRow + 1 + i,
      date: day(cell('Date')),
      invoice: String(cell('Invoice no.')).trim(),
      client: String(cell('Client')).trim(),
      amount: amount,
      what: what,
      note: String(cell('Paid by or a note')).trim(),
      removed: day(cell('Removed'))
    });
  });
  return payments;
}

function readExpenses_(day, problems) {
  const tab = listTab_(TAB.expenses);
  missing_(tab, problems);
  const expenses = [];
  listRows_(tab).forEach((row, i) => {
    const cell = heading => tab.col[heading] ? row[tab.col[heading] - 1] : '';
    const amount = Number(cell('Amount')) || 0, what = String(cell('What')).trim();
    if (!amount && !what) return;
    expenses.push({
      row: tab.headRow + 1 + i,
      date: day(cell('Date')),
      what: what,
      type: String(cell('Type')).trim(),
      amount: amount,
      invoice: String(cell('Invoice no.')).trim(),
      client: String(cell('Client')).trim(),
      notes: String(cell('Notes')).trim(),
      removed: day(cell('Removed'))
    });
  });
  return expenses;
}

/** The six report numbers on the Money tab: income, expenses, profit, expected income, bonds held, should be in the bank. */
function readReports_() {
  const money = bookingTab_(TAB.money), keys = Object.keys(REPORTS), reports = {};
  const from = money.headings.indexOf(REPORTS.income);
  const at = keys.map(key => from < 0 ? -1 : money.headings.indexOf(REPORTS[key], from));
  if (at.every(index => index >= 0)) {
    const line = money.sheet.getRange(money.headRow + 1, 1, 1, money.width).getValues()[0];
    keys.forEach((key, k) => { reports[key] = Number(line[at[k]]) || 0; });
  } else {
    const line = money.sheet.getRange(REPORTS_RANGE).getValues()[0];
    keys.forEach((key, k) => { reports[key] = Number(line[k]) || 0; });
  }
  return reports;
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
    const headings = ['Received'].concat(Object.keys(enquiry), ['Status'], tab.col['Got in touch by'] ? ['Got in touch by'] : []);
    const firstCol = Math.min.apply(null, headings.map(h => tab.col[h]));
    const width = Math.max.apply(null, headings.map(h => tab.col[h])) - firstCol + 1;
    const values = new Array(width).fill(''), formats = new Array(width).fill('General');
    const place = (heading, value, format) => { values[tab.col[heading] - firstCol] = value; formats[tab.col[heading] - firstCol] = format; };
    place('Received', now, 'd mmm yyyy h:mm');
    Object.keys(enquiry).forEach(heading => place(heading, enquiry[heading], '@'));
    place('Status', 'New', 'General');
    if (tab.col['Got in touch by']) place('Got in touch by', 'Website form', 'General');
    sheet.getRange(row, firstCol, 1, width).setNumberFormats([formats]).setValues([values]);
  });

  emailAlert_(enquiry);
  return 'ok';
}

/** Trims what someone typed: no control characters, nothing a sheet could read as a formula. */
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
  const line = sheet.getRange(row, 1, 1, tab.width);
  const values = line.getValues()[0], formulas = line.getFormulas()[0];
  const cell = heading => values[tab.col[heading] - 1];

  if (String(cell('Name')).trim() !== String(arg.name).trim()) throw new Error('The enquiries have moved. Press Refresh and try again.');
  if (String(cell('What happened')).trim() === 'Moved to bookings' || String(cell('Booking ID')).trim()) {
    throw new Error('This enquiry is already booking ' + (String(cell('Booking ID')).trim() || 'on the Clients tab') + '. Change it on the Clients tab.');
  }
  ['Status', 'What happened', 'Booking ID'].forEach(heading => {
    if (formulas[tab.col[heading] - 1]) throw new Error(heading + ' on the Enquiries tab holds a formula, so nothing was changed.');
  });

  const booking = status === 'Waiting on deposit' ? newBooking_(bookingFromEnquiry_(cell, arg.eventDate, lists), lists) : { id: '', row: 0, invoice: '' };
  closeEnquiry_(tab, row, status, booking.id);
  SpreadsheetApp.flush();
  return { id: booking.id, row: booking.row, invoice: booking.invoice, data: read_(lists) };
}

/** Sets an enquiry's Status, What happened and Booking ID cells. */
function closeEnquiry_(tab, row, status, bookingId) {
  const what = status === 'Waiting on deposit' ? 'Moved to bookings' : status === 'Cancelled' ? 'Cancelled' : '';
  tab.sheet.getRange(row, tab.col['Status']).setValue(status);
  tab.sheet.getRange(row, tab.col['What happened']).setValue(what);
  tab.sheet.getRange(row, tab.col['Booking ID']).setNumberFormat('@').setValue(bookingId);
}

/**
 * The enquiry row that a booking is being made from (Keen on the client sheet), checked: still there, the same name,
 * not booked already, no formulas in the cells that close it. Gives back {tab, row, cell}.
 */
function openEnquiry_(given) {
  const tab = enquiryTab_(), row = Number(given && given.row);
  if (!(row > 1 && row <= tab.sheet.getLastRow())) throw new Error('That enquiry is no longer there. Press Refresh.');
  const line = tab.sheet.getRange(row, 1, 1, tab.width), values = line.getValues()[0], formulas = line.getFormulas()[0];
  const cell = heading => tab.col[heading] ? values[tab.col[heading] - 1] : '';
  if (String(cell('Name')).trim() !== String(given.name).trim()) throw new Error('The enquiries have moved. Press Refresh and try again.');
  if (String(cell('What happened')).trim() === 'Moved to bookings' || String(cell('Booking ID')).trim()) {
    throw new Error('This enquiry is already booking ' + (String(cell('Booking ID')).trim() || 'on the Clients tab') + '.');
  }
  ['Status', 'What happened', 'Booking ID'].forEach(heading => {
    if (formulas[tab.col[heading] - 1]) throw new Error(heading + ' on the Enquiries tab holds a formula, so nothing was changed.');
  });
  return { tab: tab, row: row, cell: cell };
}

/** How an enquiry got in touch: its own column, or worked out from its contact text where that is clear. */
function sourceOf_(cell) {
  const said = String(cell('Got in touch by') || '').trim(), handle = String(cell('Handle or number') || '').trim();
  if (said) return { source: said, handle: handle };
  const contact = String(cell('Instagram or phone') || '').trim();
  const insta = /^instagram\s+(@\S+)/i.exec(contact), phone = /^phone\s+([\d\s()+-]{7,})$/i.exec(contact);
  if (insta) return { source: 'Instagram', handle: insta[1] };
  if (phone) return { source: 'Text or call', handle: phone[1].trim() };
  if (/^[\d\s()+-]{7,}$/.test(contact)) return { source: 'Text or call', handle: contact };
  if (/^\S+@\S+\.\S+$/.test(contact)) return { source: 'Email', handle: contact };
  return { source: '', handle: '' };
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

  const from = sourceOf_(cell);                               // how they got in touch carries over to the booking
  if (from.source) fields['Got in touch by'] = from.source;
  if (from.handle) fields['Handle or number'] = from.handle;

  const received = cell('Received');
  const note = ['From the enquiry' + (isDate_(received) ? ' of ' + Utilities.formatDate(received, timeZone, 'd MMM yyyy') : '') + '.'];
  if (!fields['Event type'] && type) note.push('Event type: ' + type + '.');
  if (!date && String(wanted).trim()) note.push('Wants: ' + String(wanted).trim() + '.');
  if (message) note.push(message);
  fields['Notes'] = note.join(' ');
  return fields;
}

/* ---------- bookings ---------- */

/**
 * From the app's add-a-booking form: arg = {heading: value}, or {fields: {heading: value}, enquiry: {row, name}} for a booking
 * made from an enquiry (Keen). That enquiry is then closed as "Moved to bookings", with the new booking ID, and how they
 * got in touch carries over if the form didn't say. Call with the lock held.
 */
function addBooking_(arg) {
  const lists = lists_(), fields = Object.assign({}, arg && arg.fields ? arg.fields : arg);
  const from = arg && arg.fields && arg.enquiry ? openEnquiry_(arg.enquiry) : null;
  if (from) {
    const source = sourceOf_(from.cell);
    if (!String(fields['Got in touch by'] || '').trim() && source.source) fields['Got in touch by'] = source.source;
    if (!String(fields['Handle or number'] || '').trim() && source.handle) fields['Handle or number'] = source.handle;
  }
  const booking = newBooking_(fields, lists);
  if (from) closeEnquiry_(from.tab, from.row, 'Waiting on deposit', booking.id);
  SpreadsheetApp.flush();
  return { id: booking.id, row: booking.row, invoice: booking.invoice, data: read_(lists) };
}

/** The next number in a run such as B-0007 or INV-0007: the one Settings shows, unless that is behind the ones in use. */
function nextNumber_(prefix, used, shown) {
  const pattern = new RegExp('^' + prefix + '-(\\d{4,})$');
  let highest = 0;
  used.forEach(value => { const m = pattern.exec(String(value).trim()); if (m) highest = Math.max(highest, Number(m[1])); });
  const onSettings = pattern.exec(String(shown).trim());
  return onSettings && Number(onSettings[1]) > highest ? String(shown).trim() : prefix + '-' + ('0000' + (highest + 1)).slice(-Math.max(4, String(highest + 1).length));
}

/** Writes one booking into the first empty row, with the next booking ID and invoice number. Nothing is written until every value has passed. */
function newBooking_(fields, lists) {
  if (!String(fields['Client name'] || '').trim()) throw new Error('A booking needs a client name.');
  if (String(fields['Custom price'] == null ? '' : fields['Custom price']).trim() !== '' && !/^custom$/i.test(String(fields['Package'] || '').trim())) {
    throw new Error('A custom price is only for the Custom package.');
  }
  Object.keys(fields).forEach(heading => {
    if (!has_(CLIENT_FIELDS, heading) && !has_(MONEY_FIELDS, heading)) throw new Error('"' + heading + '" is not a column this app may change.');
  });

  const clients = bookingTab_(TAB.clients), money = bookingTab_(TAB.money);
  if (clients.headRow !== money.headRow) throw new Error('The Clients and Money tabs no longer line up. Nothing was changed.');
  NEWER_CLIENT_FIELDS.forEach(heading => { if (!clients.col[heading]) delete fields[heading]; });
  need_(clients, 'Booking ID'); need_(clients, 'Client name'); need_(money, 'Invoice no.');

  // Find the first row with no client name, and the booking IDs and invoice numbers in use.
  const firstRow = clients.headRow + 1, count = LAST_BOOKING_ROW - clients.headRow;
  const width = Math.max(clients.col['Booking ID'], clients.col['Client name']);
  const existing = clients.sheet.getRange(firstRow, 1, count, width).getValues();
  const at = existing.findIndex(line => !String(line[clients.col['Client name'] - 1]).trim());
  if (at < 0) throw new Error('The Clients tab has no empty rows left.');
  const row = firstRow + at;
  if (String(existing[at][clients.col['Booking ID'] - 1]).trim()) {
    throw new Error('Row ' + row + ' on the Clients tab has a booking ID but no name. Fix that row in the tracker first.');
  }
  const invoices = money.sheet.getRange(firstRow, money.col['Invoice no.'], count, 1).getDisplayValues().map(line => line[0]);
  if (String(invoices[at]).trim()) {
    throw new Error('Row ' + row + ' on the Money tab has an invoice number but no client. Fix that row in the tracker first.');
  }

  const settings = tab_(TAB.settings);
  const id = nextNumber_('B', existing.map(line => line[clients.col['Booking ID'] - 1]), settings.getRange(NEXT_BOOKING_ID_CELL).getDisplayValue());
  const invoice = nextNumber_('INV', invoices, settings.getRange(NEXT_INVOICE_CELL).getDisplayValue());

  // Check everything first, then write.
  const typed = (rules, more) => Object.keys(rules).filter(heading => String(fields[heading] == null ? '' : fields[heading]).trim() !== '')
    .map(heading => ({ heading: heading, type: rules[heading], text: String(fields[heading]).trim() })).concat(more);
  const onClients = checked_(clients, row, typed(CLIENT_FIELDS, [{ heading: 'Booking ID', type: 'text', text: id }]), lists);
  const onMoney = checked_(money, row, typed(MONEY_FIELDS, [{ heading: 'Invoice no.', type: 'text', text: invoice }]), lists);
  onClients.concat(onMoney).forEach(writeValue_);
  return { id: id, row: row, invoice: invoice };
}

/**
 * Checks a set of cells on one row of one tab: the heading is there, the cell holds no formula and the value is allowed.
 * items = [{heading, type, text}]. An empty text means "clear the cell". Gives back the writes, ready for writeValue_.
 */
function checked_(tab, row, items, lists) {
  const formulas = tab.sheet.getRange(row, 1, 1, tab.width).getFormulas()[0];
  return items.map(item => {
    const column = need_(tab, item.heading);
    if (formulas[column - 1]) throw new Error(item.heading + ' in row ' + row + ' of the ' + tab.name + ' tab holds a formula, so nothing was changed.');
    if (item.text !== '') checkValue_(item.heading, item.type, item.text, lists);
    return { cell: tab.sheet.getRange(row, column), type: item.type, text: item.text };
  });
}

/** Throws if the value is not allowed in that kind of column. */
function checkValue_(heading, type, text, lists) {
  if (text.charAt(0) === '=') throw new Error(heading + ' cannot start with an equals sign.');
  if (type === 'num') {
    const number = Number(text);
    if (!isFinite(number) || number < 0) throw new Error(heading + ' needs a number, zero or more.');
  } else if (type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(heading + ' needs a date.');
  } else if (type === 'time') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new Error(heading + ' needs a time.');
  } else if (type === 'yes') {
    if (!options_(lists, 'Yes').includes(text)) throw new Error(heading + ' can only be Yes or empty.');
  } else if (type === 'tick') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) && !options_(lists, 'Yes').includes(text)) throw new Error(heading + ' can only be the day it was ticked, Yes or empty.');
  } else if (type === 'package') {
    if (!lists.packages.some(p => p.name === text)) throw new Error('"' + text + '" is not a package on the Prices tab.');
  } else if (type.indexOf('list:') === 0) {
    if (!options_(lists, type.slice(5)).includes(text)) throw new Error('"' + text + '" is not an option for ' + heading + ' on the Settings tab.');
  }
}

function writeValue_(write) {
  const cell = write.cell, text = write.text;
  if (text === '') {
    cell.clearContent();                          // keeps the cell's dropdown and its look
  } else if (write.type === 'num') {
    cell.setValue(Math.round(Number(text) * 100) / 100);
  } else if (write.type === 'date' || (write.type === 'tick' && /^\d{4}-\d{2}-\d{2}$/.test(text))) {
    const parts = text.split('-').map(Number);
    const unformatted = /^(general|0\.?#*)$/i.test(cell.getNumberFormat());
    cell.setValue(serial_(parts[0], parts[1], parts[2]));
    if (unformatted) cell.setNumberFormat('ddd d mmm yyyy');
  } else if (write.type === 'time') {
    const parts = text.split(':').map(Number), format = cell.getNumberFormat();
    if (format === '@') {
      cell.setValue((parts[0] % 12 || 12) + ':' + ('0' + parts[1]).slice(-2) + (parts[0] < 12 ? ' am' : ' pm'));
    } else {
      cell.setValue((parts[0] * 60 + parts[1]) / 1440);      // a sheet keeps a time as a part of a day
      if (/^(general|0\.?#*)$/i.test(format)) cell.setNumberFormat('h:mm am/pm');
    }
  } else if (write.type === 'text') {
    cell.setNumberFormat('@').setValue(text);     // plain text, so a phone number keeps its leading 0
  } else {
    cell.setValue(text);
  }
}

/** arg = {row, id}. Checks that row still holds that booking, and gives back the row number. */
function bookingRow_(arg) {
  const clients = bookingTab_(TAB.clients), row = Number(arg.row);
  if (!(row > clients.headRow && row <= LAST_BOOKING_ROW && row === Math.floor(row))) throw new Error('That booking is no longer there. Press Refresh.');
  const id = String(clients.sheet.getRange(row, need_(clients, 'Booking ID')).getDisplayValue()).trim();
  if (!id || id !== String(arg.id == null ? '' : arg.id).trim()) throw new Error('The bookings have moved. Press Refresh and try again.');
  return row;
}

/** One of the other booking tabs, checked to line up with Clients. */
function sideTab_(name) {
  const tab = bookingTab_(name);
  if (tab.headRow !== bookingTab_(TAB.clients).headRow) throw new Error('The ' + name + ' and Clients tabs no longer line up. Nothing was changed.');
  return tab;
}

/* ---------- money: payments and expenses ---------- */

/** Adds rows to Payments or Expenses, straight after the last row that has anything typed in it. lines = [{heading: text}]. */
function addRows_(tab, rules, lines, lists) {
  const typed = Object.keys(rules);
  typed.forEach(heading => need_(tab, heading));
  const first = tab.headRow + 1, most = tab.sheet.getMaxRows();
  let last = tab.headRow;
  if (most >= first) {
    tab.sheet.getRange(first, 1, most - tab.headRow, tab.width).getValues().forEach((line, i) => {
      if (typed.some(heading => String(line[tab.col[heading] - 1]).trim() !== '')) last = first + i;
    });
  }
  if (last + lines.length > most) throw new Error('The ' + tab.name + ' tab has no empty rows left. Add more rows at the bottom of it in the tracker, then try again.');

  let writes = [];
  lines.forEach((line, i) => {
    const items = typed.filter(heading => String(line[heading] == null ? '' : line[heading]).trim() !== '')
      .map(heading => ({ heading: heading, type: rules[heading], text: String(line[heading]).trim() }));
    writes = writes.concat(checked_(tab, last + 1 + i, items, lists));
  });
  writes.forEach(writeValue_);
  return last + 1;
}

/** Throws unless that invoice number belongs to a booking. */
function needInvoice_(invoice) {
  if (!/^INV-\d{4,}$/.test(invoice)) throw new Error('"' + invoice + '" is not an invoice number.');
  const money = bookingTab_(TAB.money), first = money.headRow + 1;
  const inUse = money.sheet.getRange(first, need_(money, 'Invoice no.'), LAST_BOOKING_ROW - money.headRow, 1).getDisplayValues();
  if (!inUse.some(line => String(line[0]).trim() === invoice)) throw new Error('No booking has the invoice number ' + invoice + '. Press Refresh and try again.');
}

function amount_(value, label) {
  const amount = Number(value);
  if (!isFinite(amount) || amount <= 0) throw new Error(label + ' needs an amount above zero.');
  return String(Math.round(amount * 100) / 100);
}

/**
 * arg = {invoice, payments: [{what, amount, note}]}. What is Hire, Bond in or Bond back.
 * A transfer that covers the hire and the bond comes as two payments, so it goes in as two rows. Dated today.
 */
function addPayment_(arg) {
  const lists = lists_(), invoice = String(arg.invoice || '').trim(), today = today_();
  const payments = Array.isArray(arg.payments) ? arg.payments : [];
  if (!payments.length || payments.length > 3) throw new Error('There is no payment to save.');
  needInvoice_(invoice);
  const lines = payments.map(payment => ({
    'Date': today, 'Invoice no.': invoice, 'Amount': amount_(payment.amount, 'A payment'),
    'What': String(payment.what || '').trim(), 'Paid by or a note': tidy_(payment.note, 200)
  }));
  lines.forEach(line => { if (!line['What']) throw new Error('A payment needs to be Hire, Bond in or Bond back.'); });
  const row = addRows_(listTab_(TAB.payments), PAYMENT_FIELDS, lines, lists);
  SpreadsheetApp.flush();
  return { row: row, rows: lines.map((line, i) => row + i), data: read_(lists) };
}

/** arg = {what, amount, type, invoice, notes}. The invoice number is only for a cost that was for one client. Dated today. */
function addExpense_(arg) {
  const lists = lists_(), invoice = String(arg.invoice || '').trim();
  const what = tidy_(arg.what, 120);
  if (!what) throw new Error('An expense needs a few words on what it was.');
  if (invoice) needInvoice_(invoice);
  const line = {
    'Date': today_(), 'What': what, 'Type': String(arg.type || '').trim(), 'Amount': amount_(arg.amount, 'An expense'),
    'Invoice no.': invoice, 'Notes': tidy_(arg.notes, 300)
  };
  if (!line['Type']) throw new Error('An expense needs a type.');
  const row = addRows_(listTab_(TAB.expenses), EXPENSE_FIELDS, [line], lists);
  SpreadsheetApp.flush();
  return { row: row, rows: [row], data: read_(lists) };
}

/**
 * Marks rows of Payments or Expenses removed, with today's date in their "Removed" cell, or (restore) clears it again.
 * Nothing is deleted. arg = {entries: [{tab: 'Payments' or 'Expenses', row, amount, invoice, what}], restore}.
 * Each entry says what the row holds, so a row that has changed since the app read it is never touched.
 */
function removeEntries_(arg) {
  const entries = Array.isArray(arg.entries) ? arg.entries : [];
  if (!entries.length || entries.length > 3) throw new Error('There is nothing to remove.');
  const lists = lists_(), stamp = arg.restore ? '' : today_();
  let writes = [];
  entries.forEach(entry => {
    const name = entry.tab === 'Payments' ? TAB.payments : entry.tab === 'Expenses' ? TAB.expenses : '';
    if (!name) throw new Error('Only payments and expenses can be removed.');
    const tab = listTab_(name), row = Number(entry.row);
    need_(tab, 'Removed');
    if (!(row > tab.headRow && row <= tab.sheet.getLastRow() && row === Math.floor(row))) throw new Error('That entry is no longer there. Press Refresh.');
    const line = tab.sheet.getRange(row, 1, 1, tab.width).getValues()[0], cell = heading => tab.col[heading] ? line[tab.col[heading] - 1] : '';
    const same = Math.abs((Number(cell('Amount')) || 0) - (Number(entry.amount) || 0)) < 0.005 &&
      String(cell('Invoice no.')).trim() === String(entry.invoice || '').trim() && String(cell('What')).trim() === String(entry.what || '').trim();
    if (!same) throw new Error('The ' + name + ' tab has changed since the app read it. Press Refresh and try again.');
    writes = writes.concat(checked_(tab, row, [{ heading: 'Removed', type: 'date', text: stamp }], lists));
  });
  writes.forEach(writeValue_);
  SpreadsheetApp.flush();
  return { data: read_(lists) };
}

/* ---------- a booking's status, set by hand on the client sheet ---------- */

/**
 * arg = {row, id, status} or {row, id, restore: {byHand, cancelled}} (Undo).
 * Cancelled ticks the Cancelled column. Any other status goes in "Status by hand", which the tracker's Status formula
 * uses first; if the formula gives that status anyway, "Status by hand" is left empty, so it keeps following the money.
 * Gives back what the two cells held before, for Undo.
 */
function setBookingStatus_(arg) {
  const row = bookingRow_(arg), clients = bookingTab_(TAB.clients), lists = lists_();
  need_(clients, 'Status'); need_(clients, 'Status by hand'); need_(clients, 'Cancelled');
  const shown = heading => String(clients.sheet.getRange(row, clients.col[heading]).getDisplayValue()).trim();
  const before = { byHand: shown('Status by hand'), cancelled: shown('Cancelled') };
  const write = (byHand, cancelled) => checked_(clients, row, [
    { heading: 'Status by hand', type: 'list:Status by hand', text: byHand },
    { heading: 'Cancelled', type: 'yes', text: cancelled }
  ], lists).forEach(writeValue_);
  if (arg.restore) {
    write(String(arg.restore.byHand || '').trim(), String(arg.restore.cancelled || '').trim());
  } else {
    const status = String(arg.status || '').trim();
    if (!BOOKING_STATUSES.includes(status)) throw new Error('"' + status + '" is not a booking status.');
    if (status === 'Cancelled') write('', options_(lists, 'Yes')[0]);
    else {
      write('', '');
      SpreadsheetApp.flush();
      if (shown('Status') !== status) write(status, '');
    }
  }
  SpreadsheetApp.flush();
  return { before: before, status: shown('Status'), data: read_(lists) };
}

/* ---------- how a client got in touch ---------- */

/**
 * arg = {kind: 'booking', row, id, source, handle} or {kind: 'enquiry', row, name, source, handle}.
 * source is one of the "Got in touch by" options (or empty); handle is a handle or number, and may be empty.
 */
function setContact_(arg) {
  const lists = lists_(), source = String(arg.source || '').trim(), handle = tidy_(arg.handle, 80);
  const items = [{ heading: 'Got in touch by', type: 'list:Got in touch by', text: source }, { heading: 'Handle or number', type: 'text', text: handle }];
  if (arg.kind === 'enquiry') {
    const tab = enquiryTab_(), row = Number(arg.row);
    if (!(row > 1 && row <= tab.sheet.getLastRow())) throw new Error('That enquiry is no longer there. Press Refresh.');
    if (String(tab.sheet.getRange(row, tab.col['Name']).getValue()).trim() !== String(arg.name).trim()) throw new Error('The enquiries have moved. Press Refresh and try again.');
    checked_(tab, row, items, lists).forEach(writeValue_);
  } else {
    checked_(bookingTab_(TAB.clients), bookingRow_(arg), items, lists).forEach(writeValue_);
  }
  return { saved: true };
}

/* ---------- event day ---------- */

/**
 * arg = {row, id, field, value}. Saves one detail or tick for a booking.
 * field is Setup time, Start time (value "16:30"), Who is running it, or one of the ticks (value: the day it was
 * ticked, "2026-11-25", or "Yes"):
 * Fee paid in full, Bond paid, Board design approved, Venue confirmed, Start time set, Power sorted, and
 * Sticker printed (kept on the Designs tab). An empty value clears it.
 */
function setEventDay_(arg) {
  const row = bookingRow_(arg), field = String(arg.field || '');
  const onDesigns = has_(DESIGN_TICKS, field);
  if (!onDesigns && !has_(EVENT_FIELDS, field)) throw new Error('"' + field + '" is not a column this app may change.');
  const type = onDesigns ? DESIGN_TICKS[field] : EVENT_FIELDS[field];
  const value = type === 'text' ? tidy_(arg.value, 80) : String(arg.value == null ? '' : arg.value).trim();
  checked_(sideTab_(onDesigns ? TAB.designs : TAB.eventDay), row, [{ heading: field, type: type, text: value }], lists_()).forEach(writeValue_);
  return { saved: true };
}

/** arg = {row, id, items: [the ticked packing items]}. Packed turns to Yes once every item is ticked. */
function setPacking_(arg) {
  const row = bookingRow_(arg), given = Array.isArray(arg.items) ? arg.items.map(String) : [];
  given.forEach(item => { if (!PACKING.includes(item)) throw new Error('"' + item + '" is not on the packing list.'); });
  const ticked = PACKING.filter(item => given.includes(item));
  const lists = lists_();
  checked_(sideTab_(TAB.eventDay), row, [
    { heading: 'Packed items', type: 'text', text: ticked.join(', ') },
    { heading: 'Packed', type: 'yes', text: ticked.length === PACKING.length ? options_(lists, 'Yes')[0] : '' }
  ], lists).forEach(writeValue_);
  return { saved: true };
}

/* ---------- designs ---------- */

/**
 * arg = {row, id, brief: {names, line2, defaultWording, thanksWording, colours, notes}, generated}.
 * Only the parts of the brief that are sent are saved. generated = true also stamps today in "Styles made on".
 */
function saveBrief_(arg) {
  const row = bookingRow_(arg), brief = arg.brief || {};
  const items = Object.keys(BRIEF_FIELDS).filter(key => has_(brief, key)).map(key => {
    const value = Array.isArray(brief[key]) ? brief[key].join(', ') : brief[key];
    // the notes keep their line breaks; everything else is one line
    const text = key === 'notes' ? String(value == null ? '' : value).split(/\r?\n/).map(line => tidy_(line, 500)).join('\n').trim().slice(0, 2000) : tidy_(value, 200);
    return { heading: BRIEF_FIELDS[key], type: 'text', text: text };
  });
  if (arg.generated) items.push({ heading: 'Styles made on', type: 'date', text: today_() });
  if (!items.length) throw new Error('There is nothing in the brief to save.');
  checked_(sideTab_(TAB.designs), row, items, lists_()).forEach(writeValue_);
  return { saved: true };
}

/** A ticked style is kept as its name: "wmhb default", "Style 4: Arch", or empty when nothing is ticked. */
function styleName_(value) {
  const name = tidy_(value, 60);
  if (name && name !== 'wmhb default' && !/^Style \d{1,2}: \S.*$/.test(name)) throw new Error('"' + name + '" is not a style name.');
  return name;
}

/** arg = {row, id, screen, board}. Saves the ticked screen style, the ticked board style, or both. */
function setDesignPick_(arg) {
  const row = bookingRow_(arg), items = [];
  if (has_(arg, 'screen')) items.push({ heading: 'Screen design', type: 'text', text: styleName_(arg.screen) });
  if (has_(arg, 'board')) items.push({ heading: 'Board design', type: 'text', text: styleName_(arg.board) });
  if (!items.length) throw new Error('There is no style to save.');
  checked_(sideTab_(TAB.designs), row, items, lists_()).forEach(writeValue_);
  return { saved: true };
}

/** The ID inside a Drive folder link, or '' if it isn't one. */
function folderId_(link) {
  const match = /\/folders\/([-\w]{20,})/.exec(String(link)) || /[?&]id=([-\w]{20,})/.exec(String(link));
  return match ? match[1] : '';
}

/** The designs folder, "07 Client Designs", from the script property DESIGNS_FOLDER. */
function designsFolder_() {
  const id = folderId_(PropertiesService.getScriptProperties().getProperty('DESIGNS_FOLDER') || '');
  if (!id) throw new Error('The designs folder isn’t set up yet. Tell Aadil: add a script property called DESIGNS_FOLDER holding the link to 07 Client Designs.');
  try { return DriveApp.getFolderById(id); } catch (err) { throw new Error('Couldn’t open the designs folder. Tell Aadil to check DESIGNS_FOLDER in the script properties.'); }
}

/** True when the folder sits directly inside the designs folder. */
function inDesigns_(folder, designs) {
  const parents = folder.getParents();
  while (parents.hasNext()) if (parents.next().getId() === designs.getId()) return true;
  return false;
}

/**
 * arg = {row, id, name, mime, data}. data is the picture as base64 text.
 * Saves it in the client's own folder inside the designs folder, named like the invoice folders: "005, Pearl"
 * (the last three digits of the invoice number, a comma, the client's name). The folder is made the first time,
 * and its link is kept in Designs > Photos link. A link there to a folder anywhere else is never written to.
 */
function addBriefPhoto_(arg) {
  const row = bookingRow_(arg), mime = String(arg.mime || ''), data = String(arg.data || '');
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error('That file is not a picture the app can use. Try a JPG or a PNG.');
  if (!data) throw new Error('The picture arrived empty. Try again.');
  if (data.length > PHOTO_MAX_CHARS) throw new Error('That picture is too big. Try a smaller one.');

  const clients = bookingTab_(TAB.clients), money = sideTab_(TAB.money), designs = sideTab_(TAB.designs);
  const client = tidy_(clients.sheet.getRange(row, need_(clients, 'Client name')).getDisplayValue(), 80).replace(/[\\/]/g, ' ');
  const invoice = String(money.sheet.getRange(row, need_(money, 'Invoice no.')).getDisplayValue()).trim();
  const number = /^INV-(\d+)$/.exec(invoice);
  if (!number) throw new Error('This booking has no invoice number yet, so its designs folder can’t be named. Add it on the Money tab, then try again.');
  const name = number[1].slice(-3) + ', ' + client;
  const linkCell = checked_(designs, row, [{ heading: 'Photos link', type: 'text', text: 'https://drive.google.com' }], lists_())[0];

  const top = designsFolder_();
  let folder = null;
  const linked = folderId_(links_(designs, 'Photos link', row, 1)[0] || '');
  if (linked) { try { const f = DriveApp.getFolderById(linked); if (inDesigns_(f, top)) folder = f; } catch (err) { /* gone: find or make it below */ } }
  if (!folder) { const same = top.getFoldersByName(name); folder = same.hasNext() ? same.next() : top.createFolder(name); }

  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(data), mime, tidy_(arg.name, 80).replace(/[\\/]/g, ' ') || 'Brief photo'));
  if (folderId_(links_(designs, 'Photos link', row, 1)[0] || '') !== folder.getId()) { linkCell.text = folder.getUrl(); writeValue_(linkCell); }
  return { photo: { id: file.getId(), name: file.getName() }, folder: folder.getUrl() };
}

/** arg = {row, id}. The client's brief photos, newest first, for the app to show and to use in the styles. */
function getBriefPhotos_(arg) {
  const row = bookingRow_(arg), designs = sideTab_(TAB.designs);
  const id = folderId_(links_(designs, 'Photos link', row, 1)[0] || '');
  if (!id) return { photos: [] };
  const files = DriveApp.getFolderById(id).getFiles(), pictures = [];
  while (files.hasNext()) {
    const file = files.next();
    if (/^image\/(jpeg|png|webp)$/.test(String(file.getMimeType()))) pictures.push({ file: file, made: file.getDateCreated().getTime() });
  }
  pictures.sort((a, b) => b.made - a.made);
  return {
    photos: pictures.slice(0, PHOTOS_SHOWN).map(one => {
      const blob = one.file.getBlob();
      return { id: one.file.getId(), name: one.file.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
    })
  };
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
