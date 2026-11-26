"use strict";
/* wmhb app: the Videos screen. One gold folder for each client, opening their videos in Google Drive.
   It only links to the folders. Aadil makes each client's folder in "06 Client Videos" himself,
   and the app never writes to them. */

/** A link the app will open: only a web address, never anything else that may have been typed in the tracker. */
const webLink = v => /^https:\/\/[^\s"'<>]+$/i.test(txt(v)) ? txt(v) : "";
/** "Client #05": the number part of the invoice number, two digits at least. "" when there is none. */
const clientNumber = invoice => { const m = /(\d+)\s*$/.exec(txt(invoice)); return m ? "Client #" + String(Number(m[1])).padStart(2, "0") : ""; };
/** Every booking that is not cancelled, in invoice order. Bookings with no invoice number yet come last. */
function videoFolders() {
  const n = b => { const m = /(\d+)\s*$/.exec(txt(b.invoice)); return m ? Number(m[1]) : Infinity; };
  return (S.data.bookings || []).filter(live).sort((a, b) => n(a) - n(b) || a.row - b.row);
}

SCREENS.videos = {
  head: "h8", narrow: true,
  html: () => "<p class=\"lede vlede\" data-screen=\"videos\">One folder for each client. Tap a folder to open their videos in Google Drive.</p><div class=\"vgrid stg\" id=\"v-grid\"></div>",
  fill(first) { drawFolders(first); }
};
function drawFolders(first) {
  const host = $("#v-grid"); if (!host) return;
  const main = webLink(S.data.videosFolder), list = videoFolders().map(b => ({ b, link: webLink((b.videos || {}).folder) || main, number: clientNumber(b.invoice) }));
  const key = JSON.stringify(list.map(x => [x.b.row, x.b.client, x.number, x.link]));
  if (host.dataset.key === key) return;
  host.dataset.key = key; if (!first) host.classList.remove("stg");        /* only the first drawing arrives one after another */
  host.innerHTML = list.map(x => {
    const inner = "<span class=\"fold-n\">" + esc(x.b.client) + "</span>" + (x.number ? "<span class=\"fold-c\">" + x.number + "</span>" : "");
    /* no folder of its own and no main folder set yet: the tile says so and opens nothing */
    return x.link
      ? "<a class=\"fold\" href=\"" + esc(x.link) + "\" target=\"_blank\" rel=\"noopener noreferrer\" data-fid=\"v-" + x.b.row + "\" aria-label=\"" + esc(x.b.client + (x.number ? ", " + x.number.toLowerCase() : "") + ". Open in Drive, in a new tab") + "\">" + inner + "<span class=\"fold-o\" aria-hidden=\"true\">Open in Drive ↗</span></a>"
      : "<div class=\"fold nofolder\">" + inner + "<span class=\"fold-o\">No folder yet</span></div>";
  }).join("") || "<p class=\"empty\">" + ((S.data.bookings || []).some(b => txt(b.client)) ? "No live bookings." : "No bookings yet.") + "</p>";      /* cancelled bookings get no tile */
}
