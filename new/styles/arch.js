"use strict";
/* Style 4: Arch. A stand-in until Sara makes the real styles. How a style works is explained in classic.js. */
addStyle({
  name: "Arch",
  screen(kind, b) {
    const serif = "Georgia,'Times New Roman',serif";
    const arch = "<div style=\"position:absolute;left:30%;right:30%;top:9%;bottom:0;border-radius:20em 20em 0 0;background:" + b.main + "\"></div>";
    /* the names, one under the other, kept inside the arch */
    const names = "<div data-box style=\"width:34em\">" + ART.line(b.stack, "400 8em " + serif, b.onMain, ";line-height:1") + "</div>";
    const corners = (first, last) => "<div style=\"position:absolute;left:3%;top:8%;width:24%;text-align:left\">" + ART.caps(first, "2.2em", b.ink) + "</div>" +
      "<div style=\"position:absolute;right:3%;bottom:8%;width:24%;text-align:right\">" + ART.caps(last, "2.2em", b.ink) + "</div>";
    if (kind === "video") return { bg: b.paper, html: ART.live + ART.under(b.names, "400 5em " + serif, b.mainOnPaper) };
    if (kind === "thanks") return { bg: b.paper, html: arch + ART.middle(names) + corners(b.thanks, b.line2) };
    return { bg: b.paper, html: arch + ART.middle(ART.cam(b.onMain) + names) + corners(b.wording, b.tap) };
  },
  board(b) {
    const small = "font:700 40px 'Inter Tight',sans-serif;color:" + b.ink + ";letter-spacing:.2em;text-transform:uppercase";
    return {
      top: "<div style=\"" + small + "\">" + b.wording + "</div>" +
        (b.line2 ? "<div style=\"width:140px;height:6px;margin:22px 0;background:" + b.mainOnBoard + "\"></div><div style=\"" + small + ";font-size:30px\">" + b.dots + "</div>" : ""),
      bottom: "<div style=\"width:400px;height:460px;border-radius:200px 200px 0 0;background:" + b.mainOnBoard + ";display:flex;align-items:center;justify-content:center\">" +
        "<div data-box style=\"width:340px\"><div data-fit style=\"font:400 84px Georgia,'Times New Roman',serif;color:" + readOn(b.mainOnBoard, b.paper) + "\">" + b.stack + "</div></div></div>"
    };
  }
});
