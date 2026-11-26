"use strict";
/* Style 3: Photo. A stand-in until Sara makes the real styles. How a style works is explained in classic.js.
   It uses the client's newest brief photo. Until there is one it shows a soft stand-in in their colours. */
addStyle({
  name: "Photo",
  screen(kind, b) {
    const serif = "Georgia,'Times New Roman',serif";
    const picture = "<div style=\"position:absolute;left:0;top:0;bottom:0;width:44%;overflow:hidden\">" + b.photo + "</div>";
    const beside = html => ART.middle(html, ";left:44%;padding:0 5%");
    const names = ART.line(b.names, "italic 400 8.5em " + serif, b.ink, ";margin:.3em 0");
    if (kind === "video") return { bg: b.ink, html: ART.live + ART.under(b.names, "italic 400 5em " + serif, b.paper) };
    if (kind === "thanks") return { bg: b.paper, html: picture + beside(ART.caps(b.thanks, "2.4em", b.accentOnPaper) + names + ART.caps(b.line2, "2.2em", b.ink)) };
    return { bg: b.paper, html: picture + beside(ART.caps(b.wording, "2.4em", b.accentOnPaper) + names + ART.caps(b.tap, "2.2em", b.ink)) };
  },
  board(b) {
    return {
      top: "<div style=\"font:italic 400 104px Georgia,'Times New Roman',serif;color:" + b.ink + "\">" + b.names + "</div>",
      bottom: "<div style=\"position:relative;width:340px;height:340px;border-radius:50%;overflow:hidden;font-size:8px\">" + b.photoPlain + "</div><div style=\"height:30px\"></div>" +
        "<div style=\"font:700 34px 'Inter Tight',sans-serif;color:" + b.accentOnBoard + ";letter-spacing:.2em;text-transform:uppercase\">" + b.wording + "</div>"
    };
  }
});
