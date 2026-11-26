"use strict";
/* Style 5: Night. A stand-in until Sara makes the real styles. How a style works is explained in classic.js. */
addStyle({
  name: "Night",
  screen(kind, b) {
    const serif = "Georgia,'Times New Roman',serif", gold = b.accentOnNight;
    const rule = "<div style=\"width:14em;height:.25em;margin:1.4em auto;background:" + gold + "\"></div>";
    const names = ART.line(b.names, "400 10em " + serif, b.onNight);
    const last = words => words ? "<div style=\"margin-top:1.2em\">" + ART.caps(words, "2.4em", gold) + "</div>" : "";
    if (kind === "video") return { bg: b.night, html: ART.live + ART.under(b.names, "400 5em " + serif, gold) };
    if (kind === "thanks") return { bg: b.night, html: ART.middle(ART.caps(b.thanks, "2.8em", gold) + rule + names + last(b.line2)) };
    return { bg: b.night, html: ART.middle(ART.cam(gold) + ART.caps(b.wording, "2.8em", gold) + rule + names + last(b.tap)) };
  },
  board(b) {
    const dark = "#1d1d1b", gold = b.accentOnBoard;
    return {
      top: "<div style=\"font:700 44px 'Inter Tight',sans-serif;color:" + gold + ";letter-spacing:.2em;text-transform:uppercase\">" + b.wording + "</div><div style=\"width:220px;height:6px;margin:24px 0 0;background:" + gold + "\"></div>",
      bottom: "<div style=\"font:400 112px Georgia,'Times New Roman',serif;color:" + dark + "\">" + b.names + "</div>" +
        (b.line2 ? "<div style=\"height:22px\"></div><div style=\"font:400 60px Georgia,'Times New Roman',serif;color:" + dark + "\">" + b.line2 + "</div>" : "")
    };
  }
});
