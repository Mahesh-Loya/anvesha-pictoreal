import { playPageOpen } from "../systems/audio.js";

export function registerTitleScene() {
  scene("title", () => {
    add([
      rect(width(), height()),
      pos(0, 0),
      color(20, 18, 30),
    ]);

    add([
      text("Anvesha", { size: 64 }),
      pos(width() / 2, height() / 2 - 60),
      anchor("center"),
      color(252, 222, 90),
    ]);

    add([
      text("The Stepwell of Anvesha", { size: 22 }),
      pos(width() / 2, height() / 2 - 10),
      anchor("center"),
      color(201, 162, 75),
    ]);

    const prompt = add([
      text("Press Space or click to begin the Anvesha", { size: 16 }),
      pos(width() / 2, height() / 2 + 60),
      anchor("center"),
      color(246, 231, 210),
      opacity(1),
    ]);

    prompt.onUpdate(() => {
      prompt.opacity = 0.6 + 0.4 * Math.abs(Math.sin(time() * 2));
    });

    function begin() {
      playPageOpen();
      go("tier", "surface");
    }

    onKeyPress("space", begin);
    onClick(begin);
  });
}
