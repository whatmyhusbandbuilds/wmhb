"use strict";
/* Style 2: Bold. A stand-in until Sara makes the real styles. How a style works is explained in classic.js. */
addStyle({
  name: "Bold",
  screen(kind, b) {
    const sans = "'Inter Tight',sans-serif";
    const names = ART.line(b.names, "900 12em " + sans, b.onMain, ";letter-spacing:-.05em");
    const under = (words, size, colour, gap) => words ? "<div style=\"margin-top:" + gap + "\">" + ART.caps(words, size, colour) + "</div>" : "";
    if (kind === "video") return { bg: b.main, html: ART.live + ART.under(b.names, "900 5em " + sans, b.onMain, ";letter-spacing:-.03em") };
    if (kind === "thanks") return { bg: b.main, html: ART.middle(names + under(b.thanks, "3em", b.inkOnMain, ".6em") + under(b.line2, "2.4em", b.onMain, ".5em")) };
    return { bg: b.main, html: ART.middle(ART.cam(b.onMain) + names + under(b.wording, "3em", b.inkOnMain, ".6em") + under(b.tap, "2.4em", b.onMain, ".5em")) };
  },
  board(b) {
    const sans = "'Inter Tight',sans-serif", colour = b.mainOnBoard;
    return {
      top: "<div style=\"font:900 82px " + sans + ";color:" + colour + ";letter-spacing:-.03em\">" + b.namesUpper + "</div>",
      bottom: "<div style=\"font:900 132px " + sans + ";color:" + colour + ";letter-spacing:-.03em;line-height:.95\">" + b.wordingUpper(3) + "</div>"
    };
  }
});
