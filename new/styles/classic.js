"use strict";
/* Style 1: Classic. A stand-in until Sara makes the real styles.

   HOW A STYLE WORKS (the same for every file in this folder)
   A style is a name and two layouts, written as HTML and CSS. To add a style: copy a file, change it,
   and add its line to index.html. The order of those lines is the order on the wheel.

   Both layouts are handed the client's brief as "b", ready to drop in:
     words    b.names, b.line2, b.wording (default screen), b.thanks (thank you screen), b.tap ("Tap to start")
              b.stack (the names one under the other), b.dots (the second line as 19 . 12 . 2026 when it is a date)
              b.wordingLines(n), b.wordingLower(n), b.wordingUpper(n): the wording over n lines
     colours  b.main, b.paper, b.accent from the theme colours, b.ink for dark wording, b.night for the Night background,
              and colours already checked to be readable on a background:
                on the main colour   b.onMain, b.inkOnMain
                on the paper         b.accentOnPaper, b.mainOnPaper
                on the night         b.onNight, b.accentOnNight
                on the white board   b.accentOnBoard, b.mainOnBoard
              (any other colour a style wants can be checked with readOn(background, colour, ...) from art.js)
     photo    b.photo fills the box it is put in

   screen(kind, b) gives one screen: kind is "default", "video" or "thanks". It returns the background and the HTML.
     Sizes are in em, and 100em is the width of the screen, so it looks the same small on the wheel and full size as a PNG.
   board(b) gives the two stickers, top and bottom. Sizes are in px, and about 1.33 px is 1 mm on the board (MM in art.js).
     Each sticker is centred in its zone and shrinks as a whole if it is too big for it.

   Helpers from art.js: ART.cam (camera icon), ART.live (where the live camera shows), ART.middle (things centred, one under
   the other), ART.caps (small spaced capitals), ART.line (one line that shrinks to fit), ART.under (the line under the camera). */
addStyle({
  name: "Classic",
  screen(kind, b) {
    const serif = "Georgia,'Times New Roman',serif", gold = b.accentOnPaper;
    const frame = "<div style=\"position:absolute;inset:4% 2.5%;border:.25em solid " + b.accent + "\"></div>";
    const names = ART.line(b.names, "italic 400 11em " + serif, gold, ";margin:.25em 0");
    if (kind === "video") return { bg: b.paper, html: frame + ART.live + ART.under(b.names, "italic 400 5em " + serif, gold) };
    if (kind === "thanks") return { bg: b.paper, html: frame + ART.middle(ART.caps(b.thanks, "2.8em", b.ink) + names + ART.caps(b.line2, "2.4em", b.ink)) };
    return { bg: b.paper, html: frame + ART.middle(ART.cam(gold) + ART.caps(b.wording, "2.8em", b.ink) + names + ART.caps(b.tap, "2.4em", b.ink)) };
  },
  board(b) {
    const gold = b.accentOnBoard;
    return {
      top: "<div style=\"font:italic 400 108px Georgia,'Times New Roman',serif;color:" + gold + "\">" + b.names + "</div>" +
        (b.line2 ? "<div style=\"width:180px;height:6px;margin:18px 0;background:" + gold + "\"></div><div style=\"font:700 30px 'Inter Tight',sans-serif;color:" + b.ink + ";letter-spacing:.2em;text-transform:uppercase\">" + b.dots + "</div>" : ""),
      bottom: "<div style=\"font:italic 400 104px Georgia,'Times New Roman',serif;color:" + gold + "\">" + b.wordingLower(2) + "</div>"
    };
  }
});
