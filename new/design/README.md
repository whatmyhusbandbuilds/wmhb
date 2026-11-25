# Start here: the new wmhb app

This folder is everything Claude Code needs to build the new wmhb app. It was put together on 25 Nov 2026 from the designs Aadil approved.

## Read in this order

1. **`HANDOVER.md`**: what to build, how to work with Aadil, the ground rules, the back end, the tracker, and what every screen does.
2. **`DESIGN-KIT.md`**: the exact colours, the 3D cards, the buttons, the motion and the wheel script. Copy these as they are.
3. **`pictures/`**: a picture of every final screen. This is what the app must look like.
4. **`screens/`**: a reference page for every picture, as plain HTML and CSS. Open one to read the exact layout, spacing and inline styles of that screen.

## What is here

| Folder or file | What it holds |
|---|---|
| `HANDOVER.md` | The brief |
| `DESIGN-KIT.md` | Styles and scripts to copy |
| `pictures/*.jpg` | 27 pictures of the final design, phone size at 2x (two are laptop size) |
| `screens/*.html` | The same 27 screens as reference pages |
| `../assets/` | The pictures the app itself uses: two board photos, the default screen, five price cards |

## How to use the pictures and the reference pages

- **The pictures are the final design.** Where the wording on a picture differs from the handover, use the picture's wording. For how things behave, the handover wins. If they truly clash, ask Aadil.
- **All names and amounts are made up.** The repo is public, so the real clients are not in it. Amounts were changed too, so sums will not add up and will not match the examples in the handover. Take the layout from them, never the data.
- **The reference pages are still pictures in HTML.** They show one fixed state each and hold no script. Nothing in them can be tapped. The moving parts (the wheel, the opening sections, the tick sweep) are in the design kit.
- **Don't ship this folder's pages as the app.** Build the app in `new/index.html` (and files beside it), using the same markup patterns and the kit's CSS.
- The reference pages load their pictures from `../../assets/`, the same files the app uses.

## The screens

| File (in `pictures/` as .jpg, in `screens/` as .html) | What it shows | Handover section |
|---|---|---|
| `01-clients` | Clients | Side menu, and Clients screen |
| `02-clients-filters-open` | Clients: filter panel open | Side menu, and Clients screen |
| `03-clients-tap-an-enquiry` | Clients: tap an enquiry | Side menu, and Clients screen |
| `04-side-menu` | Side menu open | Side menu, and Clients screen |
| `05-coming-next` | A tab that is not designed yet | Side menu, and Clients screen |
| `06-clients-laptop` | Clients on a laptop | Laptop |
| `10-money` | Money | Money screen |
| `11-money-lists-open` | Money: client lists and expenses opened | Money screen |
| `12-money-by-month` | Money: by month | Money screen |
| `13-money-tap-a-client` | Money: tap a client | Money screen |
| `14-money-add-an-expense` | Money: add an expense | Money screen |
| `15-money-laptop` | Money on a laptop | Laptop |
| `20-event-day` | Event day: all closed | Event day screen |
| `21-event-day-one-open` | Event day: one event opened | Event day screen |
| `22-event-day-packing-open` | Event day: packing list opened | Event day screen |
| `30-designs-list` | Designs: client list | Designs screen |
| `31-designs-brief` | Designs: the brief | Designs screen |
| `32-designs-screen-styles` | Designs: screen styles on the wheel | Designs screen |
| `33-designs-screen-style-ticked` | Designs: a screen style ticked | Designs screen |
| `34-designs-screen-style-opened` | Designs: a screen style opened | Designs screen |
| `35-designs-board-styles` | Designs: board styles on the wheel | Designs screen |
| `36-designs-board-style-ticked` | Designs: a board style ticked | Designs screen |
| `37-designs-board-style-opened` | Designs: a board style opened, angled view | Designs screen |
| `38-designs-board-front-size-limits` | Designs: board turned to the front, size limits showing | Designs screen |
| `40-videos` | Videos | Videos screen, and Prices and packages screen |
| `41-prices` | Prices and packages | Videos screen, and Prices and packages screen |
| `42-prices-card-opened` | Prices: a card opened | Videos screen, and Prices and packages screen |

Not designed yet, so there is no picture: Partners and Settings (show the "coming next" box in `05-coming-next`), the Add a booking form, setting the Arrive and Start times on Event day, and laptop layouts for Event day, Designs, Videos and Prices. The handover says what to do for each.

## What Aadil said about the look, in his words

- "lets go with the dark theme, but can you add like a 3D texture for certain rectangles", then "looks perfect".
- No background picture and no blur behind words.
- "make sure all the spacing of each element is good".
- Buttons should not be "very sharp" or "plain".
- On the first wheel: "very sluggish and sometimes lags and gets stuck not exactly straight". The wheel in the kit is the fix. Don't swap it for the browser's own scrolling.
- "Make sure you dont do anything else i didnt ask for".
