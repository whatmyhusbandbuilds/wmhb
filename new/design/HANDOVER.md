# wmhb app redesign: handover for Claude Code

Updated 25 Nov 2026 (night). This is the full brief for the new wmhb app. It lives in the repo at `new/design/HANDOVER.md`, next to the design kit, the design pictures and the reference pages. Start at `new/design/README.md`.

It goes with a second doc, **`DESIGN-KIT.md`** in the same folder, which holds the exact styles and scripts to copy (colours, the 3D cards, buttons, motion, the wheel, the board picture). Read both before writing anything.

## What to build

A new version of the wmhb app, all of it in one go:

| Tab | Build now? |
|---|---|
| Clients (calendar, bookings, enquiries) | Yes |
| Money | Yes |
| Event day | Yes |
| Videos | Yes |
| Designs | Yes |
| Prices and packages | Yes |
| Partners | No. Show a "coming next" box. |
| Settings | No. Show a "coming next" box. |

The app is for Aadil and Sara: it makes things easy to understand and log. The tracker (Google Sheet) holds all the details. The two are laid out the same way, with the same tabs in the same order.

Aadil is a visual learner and is not a coder. Use plain words with him. Show him screenshots of the phone and laptop layouts as you go.

## What is already in the repo

| Path | What it is |
|---|---|
| `new/index.html` | The first build, from the morning's brief: the side menu and the Clients screen, in the old **light** theme. Every other tab shows "coming next". Its `API` address is empty because the back end has not been deployed yet. |
| `new/Code.gs` | The back end for it ("wmhb app 2"): `getData`, `setEnquiryStatus`, `addBooking` and the public `enquire`. **Its `SHEET_ID` points at the first tracker draft, which is retired.** Change it to the tracker id under "Where things live". |
| `new/assets/` | The pictures the app needs (see "Pictures the app needs"). |
| `new/design/` | This brief, the design kit, a picture of every final screen and a reference page for each. |

Keep building in `new/`. Keep what already works (the back end pattern, the calendar and enquiry logic), change the look to the dark theme, and build the rest. Don't start a second app beside it.

**Pictures and this doc.** The pictures in `new/design/pictures/` are the final design. Where the wording on a picture differs from this doc, use the picture's wording. For how things behave, this doc wins. If they truly clash, ask Aadil.

## How to work with Aadil

- **Build in stages and stop after each one** for his "go":
  1. The back end and the side menu, with Clients.
  2. Money.
  3. Event day.
  4. Designs.
  5. Videos, and Prices and packages.
  6. A laptop pass over every tab.
- After each stage, show a phone screenshot and a laptop screenshot. Build phone first: Aadil and Sara mostly use it on their phones.
- **Don't add anything he didn't ask for.** If something is missing from this doc, ask him. Don't invent a feature or a look.
- Where this doc says "not designed", keep it plain, in the same style, and show him before moving on.

## Ground rules

- The new app lives in `/new/` in the `whatmyhusbandbuilds/wmhb` repo.
- **Outside `/new/`, don't change, move or delete any file.** That includes the current app (`index.html` at the top), the public enquiry form (`book/`) and the icons. The current app stays live until Aadil and Sara decide to swap.
- **The repo is public.** Never put a client's name, a phone number, an email, an amount of money, a Google Drive link or the key into the code, a commit, a test file or a doc. All of that comes from the back end at run time. Use made-up names in tests. The pictures and reference pages in `new/design/` use made-up names and amounts for the same reason.
- The new app talks to the **new tracker** through a **new, separate Apps Script web app**. The pattern is already in `new/Code.gs` and `new/index.html`: the page POSTs `{k, fn, arg}` to the `/exec` URL, with the key taken from the page address (`#k=KEY`).
  - Never write the key into the code, a commit or a doc.
  - Treat the key like a password. Use a new key for the new back end. Aadil sets it himself in the script's properties.
- **Don't touch the current Apps Script project or the current tracker.** The current app and the public enquiry form keep using them until the swap.
- The back end writes only to the typed columns (black headings) and never touches formulas (grey headings). It checks dropdown values against the Settings and Prices tabs.
- **Never sort, insert or delete rows or columns.** The per-booking tabs line up by row number. If a column this doc names is missing, stop and tell Aadil.
- The new tracker holds a copy of the real data from 25 Nov 2026. Test with made-up bookings and enquiries and delete them afterwards (clear the typed cells, don't delete the row).
- Aadil checks with Sara before anything client-facing changes.

## Where things live

| Part | Where |
|---|---|
| Page | GitHub Pages, repo `whatmyhusbandbuilds/wmhb` |
| Current back end (leave alone) | Apps Script project "wmhb app" in the business Google account: a standalone web app that runs as Aadil, with access set to Anyone |
| New tracker (the new app uses this) | Google Sheet "wmhb tracker (new layout) v3", id `1uH_ZXGwWNP-M9AYiWtVUs9VqZyJ4NB7fu_d--PQtoDo`, in the same Drive folder as the current one. It replaced v1 and v2 on 25 Nov 2026. v3 adds the Event day and Designs columns the new screens need. |
| Current tracker (leave alone) | Google Sheet "wmhb business tracker" |

**Getting the back end into Apps Script.** Claude Code on the web can't sign in to Aadil's Google account. Keep the full back end in the repo at `new/Code.gs`, for a **new** Apps Script project called "wmhb app 2" (it holds no key and no client data, so it is safe there). When it is ready, tell Aadil. He takes it back to his Claude chat, which puts it into the new Apps Script project through his browser and walks him through Deploy (execute as him, access Anyone). For later changes he redeploys: **Deploy > Manage deployments > edit > New version**, which keeps the same web-app URL.

## Back end calls

Keep the pattern in `new/Code.gs`: one POST of `{k, fn, arg}`. Four calls exist already. Suggested full set (keep them few):

| Call | What it does |
|---|---|
| `getData` (exists) | Extend it so one read returns everything every tab needs. The app loads once and then feels instant. |
| `setEnquiryStatus` (exists) | Sets an enquiry's status. "Waiting on deposit" also creates the booking. |
| `addBooking` (exists) | Adds a booking (see "Adding a booking"). |
| `addPayment` | Adds a row to Payments (Hire, Bond in or Bond back). |
| `addExpense` | Adds a row to Expenses. |
| `setEventDay` | Saves one Event day field or tick for a booking. |
| `setPacking` | Saves which packing items are ticked for a booking. |
| `saveBrief` | Saves the design brief for a booking. |
| `addBriefPhoto` | Saves one brief photo to the client's Drive folder. |
| `setDesignPick` | Saves which screen style or board style is ticked. |
| `enquire` (exists) | Public, no key. Same as the current one: adds a row to Enquiries with Status "New", spam trap, 15 an hour limit. |

- Every change shows on screen straight away, then saves. If the save fails, put the screen back and say so in plain words ("That didn't save. Check your internet and try again.").
- Show a simple loading state on first open. Never a blank screen.

## New tracker layout

Tabs, in the same order as the app menu: Clients, Enquiries, Money, Payments, Expenses, Event day, Videos, Designs, Prices, Partners, Settings, How it works. Payments and Expenses are the detail behind the app's Money tab.

- Payments and Expenses are plain lists: headers in row 4, one row per payment or expense from row 5, added in the next empty row.
- On Clients, Money, Event day, Videos and Designs: headers are in **row 4**, data is in **rows 5 to 504**, and **the same row number is the same booking** on every one of these tabs.
- Find columns by their header text, not by letter.
- "auto" columns are formulas. Never write to them.

| Tab | Columns (auto = formula) |
|---|---|
| Clients | Booking ID, Client name, Event date, Status (auto), Next step (auto), Phone, Email, Instagram, How they found us, Referred by, Event type, Venue, Suburb, Region, Package, Cancelled, Notes |
| Enquiries | **Headers in row 1, data from row 2.** Received, Name, Instagram or phone, Event type, Event date, Message, Status, What happened, Booking ID |
| Money | Booking ID (auto), Client (auto), Event date (auto), Package (auto), Custom price, Highlight reel, Custom board and screen, No power point, Second event, Host hours, Extra hours, Extra days, Travel fee, Discount, Package price (auto), Extras (auto), Total (auto), Received (auto, from Payments), Owing (auto), Invoice no., Bond (auto, from Payments: Held or Returned), Costs logged (auto, from Expenses), Other costs, Profit (auto). Reports start at column AC: Income AC5, Expenses AD5, Profit AE5, Expected income AF5, Bonds held AG5, Should be in the bank AH5. |
| Payments | Date, Invoice no., Client (auto), Amount, What (Hire, Bond in or Bond back), Paid by or a note |
| Expenses | Date, What, Type (Equipment, Running costs, Marketing, Software, Contractor), Amount, Invoice no. (only if for one client), Client (auto), Notes |
| Event day | Booking ID (auto), Client (auto), Event date (auto), Venue (auto), Suburb (auto), Hours (auto), Power point (auto), Setup time, Start time, Who is running it, Venue confirmed, Power sorted, Packed, Packed items, Day notes |
| Videos | Booking ID (auto), Client (auto), Event date (auto), Guest messages, Videos sent, Drive folder link, Link ends, Clips OK to share, OK to send offers, Review |
| Designs | Booking ID (auto), Client (auto), Event date (auto), Custom board? (auto), Board design, Screen design, Canva link, Sticker printed, Names or title, Second line, Default screen wording, Thank you wording, Theme colours, Brief notes, Photos link, Styles made on |
| Prices | Packages (B5:P15), extras (B18:D25), booking terms (B28:C31) |
| Partners | Partner, Contact, Fee %, Clients referred (auto), Fee owed (auto), Fee paid, Still to pay (auto), Notes |
| Settings | Dropdown lists in B4:K17 (Event type, Region, How they found us, Bond, Review, Permission, Yes, Enquiry status, What happened, Design status) plus Expense type (L) and Payment type (M), next invoice number (C28), next booking ID (C29) |

### The columns added for the new screens

These typed columns were added to the tracker (v3) on 25 Nov 2026 for the Event day and Designs screens. They are already there. Find them by header text. If one is missing, stop and tell Aadil.

| Tab | Typed column | Holds |
|---|---|---|
| Event day | Start time | When the event starts. ("Setup time" is when Aadil arrives.) |
| Event day | Venue confirmed | Yes or blank (dropdown from the Yes list on Settings) |
| Event day | Power sorted | Yes or blank (same dropdown) |
| Event day | Packed items | The ticked packing items, as a comma list |
| Designs | Names or title | Brief: first line, for example "Ruby & James" |
| Designs | Second line | Brief: second line, for example the date |
| Designs | Default screen wording | Brief |
| Designs | Thank you wording | Brief |
| Designs | Theme colours | Brief: colour names, comma list |
| Designs | Brief notes | Brief: "Notes from the chat" |
| Designs | Photos link | The Drive folder that holds this client's brief photos |
| Designs | Styles made on | Date "Generate designs" was last tapped |

The ticked styles go in **Designs > Screen design** and **Designs > Board design**: plain text holding the style name ("Style 4: Arch", "wmhb default"), or blank when nothing is ticked. These two columns have no dropdown any more. The "Design status" list on Settings is no longer used.

**Values the app reads**
- Clients > Status is one of: Booked, Waiting on deposit, Completed, Cancelled, Date needed.
- Money > Owing is the amount still to pay. 0 with status Booked means "Booked (paid)".
- Invoice numbers are INV-0000.

**Money rules**
- **Never write to Received or Bond on the Money tab.** To record a payment, add a row to Payments with What = Hire. A client can pay in any number of part payments.
- A transfer that covers hire and the bond goes in as **two rows**: one Hire, one Bond in.
- Giving a bond back is a Payments row with What = Bond back. It is never an expense.
- Bonds are never income. Income = sum of Hire rows. Expected income = sum of Owing.
- An expense is a row on Expenses. The invoice number is optional and links the cost to one booking.
- Should be in the bank = income minus expenses plus bonds held. The app shows it so Aadil can compare it with his bank balance.
- **Invoice number is the reference Aadil uses.** Show the INV number next to the client's name everywhere. The Booking ID stays hidden in the tracker. Give every new booking the next invoice number (Settings C28) when it is created, so a payment can always be matched to it.

**Adding a booking**
1. Find the first row from 5 down where Clients > Client name is empty.
2. Write the Booking ID from Settings!C29 (format B-0000) and the client details on Clients.
3. Write the extras and the invoice number on the same row of Money.

**Booking IDs.** Only bookings get an ID. An enquiry gets one in its Booking ID column only when it moves to Waiting on deposit.

## Look and feel

**Dark theme, and only dark.** Aadil found the light theme too bright and plain, tried a picture background and glass and took them out, and called the dark theme with a 3D texture on the rectangles "perfect". So:

- no background picture,
- no blur behind words,
- raised, lightly textured cards, sunk slider tracks, rounded material buttons,
- the logo in yellow.

All the values and the CSS are in the design kit, sections 1 to 4. The spacing scale is in section 2. Follow it exactly: Aadil notices uneven spacing.

### Booking colours (calendar, lists and badges)

| Status | Look |
|---|---|
| Booked (deposit in) | Green fill `#3A9A63`, white text |
| Waiting on deposit (invoice sent, deposit not in) | Yellow fill `#F1C22D`, ink text `#1C1B15`, 2 px ink border |
| Enquiry (New or Waiting on response) | Faint fill `rgba(250,250,247,0.10)`, 2 px **dashed** light border, light text |
| Clash | Small circle with a "!" |

- Closed enquiries (Moved to bookings or Cancelled) never show.
- Event types (Celebrations, Weddings, Corporate, Markets) get **no colour**.
- The colours always come with words.

## Motion

Aadil asked for motion so the app doesn't feel boring, then found the first wheel sluggish. So: motion is short, and it must never get in the way.

Everything is in the design kit, sections 5 and 6: the rules, the keyframes, the opening sections, the sliding thumb, the tick sweep and the wheel script. Use them as they are.

## Side menu

### Phone

- A three-line menu button (44 x 44) sits at the top left, before the logo.
- Tapping it slides a panel in from the left (`.wm-slide` in the kit, 440 ms).
  - Width: 86% of the screen, max 340 px.
- The rest of the screen gets a dark overlay (`.wm-scrim`).
- The panel closes on its X button, on a tap on the overlay, or when a tab is chosen.

### Laptop

The same list stays open all the time as a 248 px sidebar on the left.

### Tabs, in this order

1. Clients
2. Money
3. Event day
4. Videos
5. Designs
6. A small "Business" heading, then Prices and packages
7. Partners
8. Settings, pinned to the bottom under a divider

### Tab rows

- Each row has a simple line icon (1.8 px stroke) and a 17 px label.
- The current tab gets the tint background, a 4 px light bar on its left and bold text.

### Count badges

Small outlined pills. Only two tabs have one:

- **Clients:** "N to answer", where N is the number of enquiries with status New.
- **Money:** "N to chase", where N is bookings waiting on deposit plus bookings with a balance still to pay.

### Coming next (Partners and Settings only)

Show the tab's title and a dashed box: "We design this screen next. It will have:".

| Tab | It will have |
|---|---|
| Partners | Decor businesses that send clients; who referred who, and the 10% fee owed |
| Settings | Aadil's and Sara's logins; email signature and templates |

## Clients screen, phone

Top to bottom:

1. **Header:** menu button and logo on the left, an "Add a booking" button on the right. Underneath, the title **clients**.
2. **Filters button.** When any filter is changed from the default:
   - it shows a small "On" tag;
   - next to it, a one-line summary such as "Bookings: Booked, Enquiry". Otherwise the summary says "Showing everything".
3. **Clash box** for each clashing date in the month shown.
   - Text: "**Clash on Sat 12 Dec.** Charlotte is booked and Jess has enquired, on the same day."
   - An "Open" button opens the enquiry's status picker when an enquiry is involved.
4. **Month bar:** previous and next buttons, with the month and year.
5. **Month grid,** Monday to Sunday.
   - Each cell has the day number and a pill with the short name, coloured by the table above.
   - If there's more than one item on a day, show "Name +1" and a "!" in the top-right corner.
   - Today's cell and the cells outside the month use the colours in the kit.
   - An enquiry's cell is a button that opens the status picker.
6. **Key:** Booked (green), Waiting on deposit (yellow), Enquiry (dashed), Clash (!).
7. **List, "In December":** one row per item.
   - The date sits on the left: the short weekday small, the day and month bold.
   - Then the name, and a second line with the event type and venue.
   - Then a status badge in the same colours as the calendar.
   - Rows with a clash get a small "Clash" tag.
   - Enquiry rows have a "Change" link that opens the status picker.
   - Badge wording:
     - "Booked (paid)"
     - "Booked ($570 to pay)", using the real amount left to pay
     - "Waiting on deposit"
     - "Enquiry: new"
     - "Enquiry: waiting on response"
   - **The money only shows in this list, never on the calendar.**
8. **"Enquiries with no date yet":** enquiries whose event date is empty or only a month (for example "Jan 2027").

**"Add a booking" is not designed.** At the swap the current app's form goes away, so the new app needs its own. Make a plain bottom sheet with the typed Clients columns (client name, event date, event type, venue, suburb, region, package, phone, email, Instagram, how they found us) and the Money extras, using the dropdown lists from Settings and Prices. Show Aadil before going further.

### Filter panel (Aadil picked "Option 1: Sections")

The panel is a bottom sheet on the phone.

- **Header:** "filter", with a "Reset" button.
- **Two groups,** like an accordion, with only one open at a time.
  - **Bookings:** Booked, Waiting on deposit, Enquiry. Each row has its colour swatch and a count.
  - **Event type:** Celebrations, Weddings, Corporate, Markets. These rows have a count and no colour.
- Each closed group shows one line, either "All showing" or "Hiding Weddings, Markets".
- Each tick row is a 44 px tap target with a tick box.
- **Bottom button:** "Show N bookings and enquiries".

**Filter logic**
- An item shows only if its status is ticked **and** its event type is ticked.
- Everything is ticked by default.

### Enquiry status picker

A bottom sheet that opens when you tap any enquiry. It shows:

1. The name.
2. The event and date, for example "Wedding, Garden Venue, Sat 5 Dec".
3. The contact, for example "Phone 021 000 000".
4. If anything else is on the same date, a clash box: "Clash: Charlotte is booked on Sat 12 Dec. With one board we can't take both."
5. Four options, each with its swatch and a short line. The current one is outlined.

| Option | Line under it |
|---|---|
| New | Nobody has replied yet |
| Waiting on response | We replied, waiting to hear back |
| Waiting on deposit | They want to book. It becomes a booking and turns yellow. |
| Cancelled | Hides it from the calendar. It stays in the tracker, greyed out. |

Choosing an option writes to the tracker straight away and updates the calendar.

Sara talks to clients on Instagram, Messenger, Facebook, texts and calls. This picker is how she tells Aadil where each enquiry is at, so keep it to one tap.

### Enquiries: what each status does

- **"What happened" column.** Filled in once an enquiry is closed: "Moved to bookings" or "Cancelled". In the tracker closed enquiries are greyed out and stay for the record. In the app they don't show.
- **Setting an enquiry to Waiting on deposit creates the booking.** The app adds a new booking with the enquiry's name, contact, event type, event date and venue, waiting on deposit. It sets the enquiry's Status to Waiting on deposit and "What happened" to "Moved to bookings". From then on it shows as a yellow booking, not as an enquiry.
- **Setting an enquiry to Cancelled** sets "What happened" to "Cancelled". If they come back later, set the status again and clear "What happened".

### Clash rule

A date clashes when more than one live item falls on it, counting bookings and open enquiries (New or Waiting on response). There's only one guestbook board.

## Money screen, phone

Aadil's words: business expenses, income, profit, then expected income. A payment moves from expected income to income once it lands. The $250 bond is not theirs, so it is held apart and never counted.

Top to bottom:

1. **Header** and the title **money**.
2. **Period slider:** All time, Year, Month (a sunk track with three keys). On Year or Month a bar appears underneath with previous and next buttons and the period name ("2026", "November 2026").
3. **Three numbers in a row:** Income ("received"), Expenses ("spent"), Profit ("income minus expenses"). They follow the period.
4. **Expected income** card, large number.
   - All time: "Still to be paid by clients who have booked. Bonds are not counted."
   - Year or Month: "Due from booked clients in November 2026. Bonds are not counted." It counts amounts whose due date falls in the period.
5. **Should be in the bank** card: "Income minus expenses, plus bonds you hold. All time. If it matches your bank balance, everything is logged." **This one is always all time**, whatever the slider says.
6. **Clients.** Two sections that open and close (kit, section 5). Both start closed, so Aadil can reach the expenses without scrolling past every client.
   - **Coming up**, with a line such as "6 clients, 4 still to pay".
   - **Completed**, with a line such as "2 clients, all paid".
   - On Year or Month they only list clients whose event date is in the period.
   - Each client card shows:
     - name, and "INV-0003" on the right;
     - event type and date ("Birthday, Sat 12 Dec");
     - a paid bar (green, grows from the left) with "$150 of $720 paid";
     - a status pill: "Waiting on deposit" (yellow), "Booked ($570 to pay)" or "Booked (paid)" (green), "Completed (paid)" (outlined);
     - when money is due, "Next: Deposit $150, due Wed 25 Nov" or "Next: Balance $570, due Sat 5 Dec". Take the wording and dates from Clients > Next step and the booking terms on the Prices tab. Never hard-code an amount or a number of days;
     - a bond line: "Bond: not paid yet", "Bond: holding $250", "Bond: given back" or "No bond".
   - Tapping a card opens the client sheet below.
7. **Expenses**, with an "Add an expense" button beside the heading.
   - One row per type with the count and total: "Equipment, 5 items, $755". Types: Equipment, Running costs, Marketing, Software, Contractor.
   - "Show all 10" opens the full list, newest first: date, what it was, the type (plus ", for INV-0002" when it was for one client) and the amount. The link then reads "Hide the list".
8. **Bonds, held apart.** "Not your money, so never counted as income. Holding $250 now." Then one row per client with the INV number:
   - "Given back"
   - "Not paid yet. Due Fri 27 Nov"
   - "Holding $250. Give back after Sun 6 Dec"

### Client sheet (tap a client)

A bottom sheet:

1. Name, then "INV-0003, Birthday, Sat 12 Dec".
2. Three numbers: Total, Received, To pay.
3. **Payments so far:** date and amount for each.
4. **Record a payment:**
   - a tick box, "This payment includes the $250 bond";
   - a big button, "Rest of the fee received $570". One tap adds a Hire payment for the amount still to pay, dated today. If the box is ticked it also adds a Bond in row;
   - "Another amount": type any amount, for a part payment.
5. **Bond, held apart:** the bond's state and one button for the next step: "Bond received" when it is not paid, "Bond given back" while it is held.
6. "Done".

### Add an expense sheet

1. "add an expense", then "Dated today. Pick a usual one, or type your own."
2. **Usual ones** (chips that fill in the fields): Fuel, Board sticker, Power station hire, Advertising.
3. **What was it** and **Amount**.
4. **Type:** Equipment, Running costs, Marketing, Software, Contractor.
5. **Was it for one client?** "No client", then the coming-up clients as "Charlotte, INV-0003".
6. "Save expense" and "Cancel".

Not in this build: recurring expenses (for example a monthly software cost). Aadil hasn't decided how they work.

## Event day screen, phone

1. **Header**, the title **event day**, then "Every event coming up. Tap one to open its details."
2. **One card per coming event,** soonest first. All start closed. Tap a card to open it. More than one can be open.
   - Closed card: name, "Corporate, Fri 4 Dec, INV-0008", "In 9 days" on the right, a plus that turns into a minus, a row of 7 small bars (one per ready item, filled when done) and "0 of 7 ready".
   - Cards open and close with the opening-section pattern in the kit.
3. **Inside an open card:**
   - **The details**, a two-column list:

     | Row | Shows |
     |---|---|
     | Where | Venue and suburb |
     | Arrive | Event day > Setup time, or "Not set yet" |
     | Start | Event day > Start time, or "Not set yet" |
     | How long | Hours, with ", with a host" when host hours are booked |
     | Power | See the rule below |
     | Running it | Event day > Who is running it |
     | Contact | The client's phone number, or "Instagram" or "Email" when there is no number |

   - **Power rule:** if the booking has the "No power point" extra: "No power point. Bring the power station." If "Power sorted" is ticked: "Power point at the venue". Otherwise: "Not checked yet. Needs a power point within 10 m."
   - **Ready?** with "7 things to sort" on the right (the number left). Seven rows with a tick box:

     | Row | How it gets ticked |
     |---|---|
     | Fee paid in full | By itself, when Money > Owing is 0. Small label "from Money". |
     | Bond paid | By itself, when a Bond in payment exists. Small label "from Money". |
     | Board design approved | By itself, when a screen style **and** a board style are ticked on the Designs tab. Small label "from Designs". |
     | Sticker printed | Tapped here. Saves to Designs > Sticker printed. |
     | Venue confirmed | Tapped here. |
     | Start time set | By itself, when Start has a time. |
     | Power sorted | Tapped here. |

     Rows that tick by themselves can't be tapped. The tick pops in (`.ck` in the kit).
   - **Packing list**, its own section with its own plus, closed at first, with "0 of 12 packed". Twelve tick rows: Top board, Bottom board, Base, Laptop and charger, Camera, Monitor, Light, Vintage phone, Speaker, Cable box, 10 m extension cord, Table message cards. When all twelve are ticked, write Yes to Event day > Packed.
4. **Setting Arrive, Start and Running it is not designed.** Make each of those rows open a small bottom sheet to set it, in the same style as the Money sheets, and show Aadil.

The design logging for a booking lives here on Event day. The Designs tab is Sara's workspace, not a log.

## Designs screen, phone

**What it is for.** Sara talks to each client herself about their design. She loves that part and it stays hers: there is no form for clients. She types what she learned into the app, taps Generate, and the app makes the screens and the board for her to show the client. wmhb is on the free Canva plan, so the app makes the pictures itself.

Each client has **three screens** (default, video, thank you) and **one board** with two vinyl stickers (top and bottom).

### 1. Client list

- Title **designs**, then "Sara's design space. Tap a client to make their screens and board."
- One card per coming booking, soonest first: name, "Wedding, Sat 19 Dec, INV-0005", "In 24 days", a chevron, and one pill:
  - "No brief yet" (dashed outline)
  - "Brief written" (outline)
  - "Styles ready to show" (yellow)
  - "Screen and board chosen" (green)
- Tapping a client opens the brief until designs have been generated for them ("No brief yet" and "Brief written"). After that it opens the styles.

### Every client page

- A Back button (a pill, "‹ All designs"), the client's name, then "Wedding, Sat 19 Dec, INV-0005".
- **A Screen / Board slider straight under that, on every client page, the brief included** (kit, section 5).

### 2. The brief

"The brief", then "One brief for both the screen and the board."

- Names or title
- Second line
- On the default screen (wording)
- On the thank you screen (wording)
- Theme colours: chips, with "Add"
- Photos: thumbnails, with "Add a photo". Save each photo to the client's Drive folder through the back end, in a folder called "Design photos", and keep that folder's link in Designs > Photos link.
- Notes from the chat
- **"Generate designs"** (gold), with "Makes 5 screen styles and 5 board styles." underneath
- "Skip the brief, use the wmhb default" (dark)

### 3. The styles (the wheel)

- Hint on Screen: "Swipe either way. Tap a style to open it, or tap its circle to choose it."
- Hint on Board: "Swipe either way. Each board's screen shows the screen style you ticked."
- **The wheel** (kit, section 6). Six cards on each wheel: **wmhb default** first, then Style 1 to Style 5.
- A **screen card** has: the title, a tick circle top right, the default screen as the main picture, the video and thank you screens small underneath with the labels "Video" and "Thank you", then the buttons. The default card has "Use the default" (ivory) and "Save pictures". The others have "Save pictures".
- A **board card** has: the title, the tick circle, the angled board picture, then "Use the default" (default card only) and "Download picture".
- **The whole card opens the style.** There is no separate "open" button.
- **The tick circle** chooses the style: the box turns green (kit, section 5), not the pictures. One tick per wheel.
- **Every board picture shows the ticked screen style on the board's screen.** If no screen style is ticked, it shows the wmhb default screen.
- "Edit the brief" (dark) under the wheel.
- "Use the default" on a card ticks the wmhb default on that wheel. "Skip the brief, use the wmhb default" on the brief ticks it on both wheels and goes to the styles.

### 4. A screen style, opened

- Back button "‹ All styles". Going back returns to the wheel. There is no "Change style" button.
- Title "Style 4: Arch", then "Ruby Carter's screens". The Screen / Board slider.
- A box with the tick circle. Not ticked: "Tap the circle when the client has chosen this one." Ticked: the box is green and reads "Chosen by the client."
- The three screens, full width, each with a small label: "Default screen", "Video screen", "Thank you screen".
- **"Download the 3 pictures"** (gold), with "PNG files, ready for the guestbook laptop folder."
- "Edit the brief" (dark).

### 5. A board style, opened

- Back button "‹ All styles", title "Style 1: Classic", then "On Ruby Carter's board". The slider.
- The tick box, as above.
- The big board picture (kit, section 8). It opens on the angled view.
- Two buttons side by side: "Turn to the front" / "Turn to the side", and "Show size limits" / "Hide size limits".
- "Top sticker: up to 650 × 200 mm. Bottom sticker: up to 650 × 450 mm. Wording shrinks to fit."
- **"Download picture"** (gold).
- "Download the 2 sticker files" (ivory), with "Made at the exact print size, for the printer or Canva."
- "Edit the brief" (dark).

### How the pictures are made

- Each style is an HTML and CSS layout that takes the brief (names, second line, wording, colours, photo). The app draws it on the page and turns it into a PNG in the browser for the downloads.
- **Keep each style in its own small file**, as data, so a new style can be added without touching the rest of the app. The five styles in the design (Classic, Bold, Photo, Arch, Night) are stand-ins made by Claude. Sara will make the real ones later and they will replace these.
- Screens are 16:9. Ask Aadil what pixel size the guestbook laptop needs. Assume 1920 x 1080 until he says.
- Wording must shrink to fit the sticker zones. Never let it spill outside a zone.
- Call the program that runs on the guestbook laptop "the guestbook software". Don't name anyone as its author.

## Videos screen, phone

- Title **videos**, then "One folder for each client. Tap a folder to open their videos in Google Drive."
- A two-column grid of gold folder tiles (kit, section 7), one per booking, in invoice order. Each shows:
  - the client's name;
  - "Client #05": the number part of the invoice number, two digits. Aadil wants "Client #" here, not "INV";
  - "Open in Drive ↗".
- Each tile is a link to Videos > Drive folder link and opens in a new tab.
- If a booking has no folder link yet, the tile opens the main client videos folder. The back end supplies that link (it is not in the repo).

## Prices and packages screen, phone

- Title **prices and packages**, then "Your 5 price cards. Swipe either way, or tap one to see it full size."
- **The wheel** with the five price cards (kit, section 6). The cards are pictures at 4:5.
- Under it, a list of the five names, each a row with its number: Wedding packages, Free with every booking, Birthdays and celebrations, Corporate packages, Markets and fairs.
- Tapping the middle card or a row opens the card full size: Back button "‹ All cards", the card's name, the card at full width.

## Laptop

- The sidebar is always open (248 px).
- **Clients** (designed): the title with "Add a booking", then three columns: the filter panel, always open (about 250 px); the calendar with the clash boxes, month bar, grid and key; the list "Everything that matches". The list wraps under the calendar when there isn't room. The status picker is a centred dialog.
- **Money** (designed): the title on the left with the period slider on the right (360 px wide). Then one row of four boxes: Income, Expenses, Profit, Expected income. Then "Should be in the bank" as one full-width bar. Then two columns: Clients on the left, Expenses and Bonds on the right. The sheets become centred dialogs, 460 px wide.
- **Event day, Designs, Videos, Prices: not designed for laptop.** Keep the phone layout in a centred column no wider than 560 px beside the sidebar, with sheets as centred dialogs. Show Aadil in stage 6.

## Pictures the app needs

| File | What |
|---|---|
| `board-front.jpg`, `board-angle.jpg` | The two photos of the board (3:5) |
| `default-screen.jpg` | The wmhb default screen ("Leave a message", 16:9) |
| `price-1.jpg` to `price-5.jpg` | The five price cards (4:5) |

They are in the repo at `new/assets/`. The board photos are 1080 x 1800 px and the price cards 1080 x 1350 px. `default-screen.jpg` is only 640 x 360 px, cut from the board photo: ask Aadil for the full-size file before launch.

## Accessibility

- 44 px tap targets throughout.
- Real `<button>` and `<a>` elements. Labels on icon-only buttons ("Open menu", "Close menu", "Choose this one").
- `aria-expanded` on the menu button and on everything that opens and closes.
- `aria-current="page"` on the current tab. `aria-pressed` on sliders, filter ticks and tick circles.
- Closed sections must not be reachable with the Tab key (the kit's pattern does this).
- Reduced motion is respected (kit, section 5).

## Still open: ask Aadil, don't guess

1. **Sticker sizes.** He typed "65mm wide and 20mm tall" and "65mm wide and 450mm high". The design assumes he meant 650 × 200 mm and 650 × 450 mm. Confirm before building the limits.
2. **Where each sticker sits on the board.** The design centres both. Confirm the top and bottom positions.
3. **The wmhb default screens.** The default screen file in the repo is a small crop, so the full-size file is needed. The default video screen and thank you screen in the design are stand-ins: ask for the real files.
4. **The pixel size of the screen pictures** the guestbook laptop needs.
5. **The sticker files.** Which file type does the printer take, and does Sara still want to finish them in Canva?
6. **A new client's Drive folder.** Should the app make it, or does Aadil?
7. **"Download picture" on the price cards.** Not in the design. Ask if he wants it.
8. **Recurring expenses.** Not decided.

## Swap-over plan

1. While testing, real logging carries on in the current app and tracker.
2. On swap day, Claude (chat) copies the latest bookings and enquiries from the current tracker into the new one again.
3. The enquiry form's `/exec` URL changes to the new back end, and the new page becomes the main one.
4. The old tracker, app and Apps Script are kept, untouched, as a backup.

## Decisions so far (25 Nov 2026)

1. Setting an enquiry to Waiting on deposit **creates the booking**.
2. Closed enquiries are **greyed out in the tracker** with a "What happened" column.
3. The app and the tracker share the **same tabs in the same order**.
4. Invoice numbers stay **INV-0000**. Floral styling is removed. Enquiries don't get a booking ID until they move to Waiting on deposit.
5. **Dark theme with a 3D texture.** No background picture, no blur behind words.
6. **Event day:** every event is a card that opens and closes. Design and sticker progress is ticked there.
7. **Designs is Sara's workspace:** brief, generate, wheel, tick. No client form. No Canva step needed to make the pictures.
8. **Launch with the stand-in styles.** Real presets come later, once they have designed for more clients.
9. **The wheel** is driven by script, not by the browser's scrolling (see the kit).
10. **Tracker v3** holds the columns for the Event day ticks, the packing list and the design brief.

## Design notes

- A picture of every final screen is in `new/design/pictures/`, and a reference page for each (plain HTML and CSS you can open and read) is in `new/design/screens/`. `README.md` lists them.
- The clickable originals are on a private Claude design canvas that Claude Code cannot open. Aadil can open it if a question comes up.
- The pictures and pages use made-up names and amounts. **Use the real tracker data in the app, and made-up names in the repo.**
