"use strict";
/* The wmhb default: what a client gets when they don't want their own design.
   It is always first on each wheel and takes nothing from the brief.
   The default screen is a picture file. The video and thank you screens here are stand-ins until Aadil sends the real ones. */
addStyle({
  name: "wmhb default",
  screen(kind) {
    const navy = "#2F3A5F", serif = "Georgia,'Times New Roman',serif";
    if (kind === "default") return { image: "assets/default-screen.jpg" };
    if (kind === "video") return { bg: "#CED1D8", html: ART.live + ART.under("Leave a message", "italic 400 5em " + serif, navy) };
    return { bg: "#CED1D8", html: ART.middle("<div style=\"font:italic 400 12em " + serif + ";color:" + navy + "\">Thank you</div><div style=\"margin-top:1em;font:400 3.4em " + serif + ";color:" + navy + "\">for your message</div>") };
  },
  board(b) {
    return {
      top: "<div style=\"font:400 100px Georgia,'Times New Roman',serif;color:" + b.ink + "\">Leave a video<br>message</div>",
      bottom: "<div style=\"font:900 250px 'Inter Tight',sans-serif;color:" + b.ink + ";letter-spacing:-.06em\">wmhb</div>"
    };
  }
});
