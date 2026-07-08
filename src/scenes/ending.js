import { isJourneyComplete, getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { playCompletionSwell } from "../systems/audio.js";
import { openJournal } from "../ui/journal.js";
import { magazine } from "../content/magazine.config.js";
import gsap from "gsap";

export function registerEndingScene() {
  scene("ending", () => {
    // The lantern overlay is left display:block by a dim final tier and isn't
    // a tier scene here, so hide it explicitly or it darkens the ending.
    const lantern = document.getElementById("lantern-overlay");
    if (lantern) lantern.style.display = "none";

    add([rect(width(), height()), pos(0, 0), color(20, 18, 30)]);

    if (isJourneyComplete()) {
      playCompletionSwell();
      triggerCompletionBloom();

      add([
        text("The Wellspring", { size: 40 }),
        pos(width() / 2, height() / 2 - 80),
        anchor("center"),
        color(252, 222, 90),
      ]);
      add([
        text(magazine.sutradhar.closingComplete, { size: 18, align: "center" }),
        pos(width() / 2, height() / 2 - 10),
        anchor("center"),
        color(246, 231, 210),
      ]);
      add([
        text("Press Space to view the completed artwork", { size: 14 }),
        pos(width() / 2, height() / 2 + 90),
        anchor("center"),
        color(201, 162, 75),
      ]);
      onKeyPress("space", () => openJournal({ animateThread: true }));
    } else {
      add([
        text("The Wellspring waits.", { size: 32 }),
        pos(width() / 2, height() / 2 - 40),
        anchor("center"),
        color(252, 222, 90),
      ]);
      add([
        text(
          `You have surfaced ${getSurfacedCount()} of ${getTotalFragments()} fragments.\n${magazine.sutradhar.closingIncomplete}`,
          { size: 16, align: "center" }
        ),
        pos(width() / 2, height() / 2 + 10),
        anchor("center"),
        color(246, 231, 210),
      ]);
      add([
        text("Press Space to return and keep seeking", { size: 14 }),
        pos(width() / 2, height() / 2 + 90),
        anchor("center"),
        color(201, 162, 75),
      ]);
      onKeyPress("space", () => go("journey"));
    }
  });
}

function triggerCompletionBloom() {
  const transitionRoot = document.getElementById("transition-root");
  const burst = document.createElement("div");
  burst.id = "completion-bloom";
  transitionRoot.appendChild(burst);
  transitionRoot.classList.add("visible");

  gsap.fromTo(
    burst,
    { opacity: 0, scale: 0.3 },
    {
      opacity: 1,
      scale: 1,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(burst, {
          opacity: 0,
          duration: 1,
          delay: 0.4,
          onComplete: () => {
            burst.remove();
            transitionRoot.classList.remove("visible");
          },
        });
      },
    }
  );
}
