import { playPageOpen } from "../systems/audio.js";

// A large ceremonial diya glowing behind the title.
function drawTitleDiya(t) {
  const cx = width() / 2;
  const cy = height() / 2 - 118;
  const flick = 1 + Math.sin(t * 6) * 0.08;
  const DIYA = rgb(252, 222, 90);
  // radiant halos
  drawCircle({ pos: vec2(cx, cy), radius: 90 * flick, color: DIYA, opacity: 0.05 });
  drawCircle({ pos: vec2(cx, cy), radius: 55 * flick, color: DIYA, opacity: 0.08 });
  drawCircle({ pos: vec2(cx, cy), radius: 28 * flick, color: DIYA, opacity: 0.14 });
  // lamp bowl
  drawEllipse({ pos: vec2(cx, cy + 10), radiusX: 22, radiusY: 8, color: rgb(165, 72, 46) });
  drawEllipse({ pos: vec2(cx, cy + 7), radiusX: 18, radiusY: 5, color: rgb(122, 34, 48) });
  // flame
  drawPolygon({
    pts: [vec2(cx, cy - 22 * flick), vec2(cx - 7, cy + 4), vec2(cx + 7, cy + 4)],
    color: DIYA,
  });
  drawCircle({ pos: vec2(cx, cy - 2), radius: 4, color: rgb(255, 255, 240) });
}

export function registerTitleScene() {
  scene("title", () => {
    add([rect(width(), height()), pos(0, 0), color(24, 20, 38), z(-10)]);

    // drifting embers rising past the title
    for (let i = 0; i < 18; i++) {
      const startX = (i * 151) % width();
      const ember = add([
        pos(startX, (i * 97) % height()),
        z(-5),
        { bx: startX, sp: 10 + (i % 4) * 5, ph: (i * 0.9) % 6.28, sz: 1 + (i % 3) },
      ]);
      ember.onUpdate(() => {
        ember.pos.y -= ember.sp * dt();
        if (ember.pos.y < -8) ember.pos.y = height() + 8;
        ember.pos.x = ember.bx + Math.sin(time() * 0.7 + ember.ph) * 10;
      });
      ember.onDraw(() => {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time() * 1.4 + ember.ph));
        drawCircle({ pos: vec2(0, 0), radius: ember.sz, color: rgb(252, 222, 90), opacity: 0.5 * tw });
      });
    }

    add([{ draw: () => drawTitleDiya(time()) }, z(-1)]);

    add([
      text("Anvesha", { size: 72 }),
      pos(width() / 2, height() / 2 - 20),
      anchor("center"),
      color(252, 222, 90),
    ]);

    add([
      text("The Stepwell of Anvesha", { size: 22 }),
      pos(width() / 2, height() / 2 + 34),
      anchor("center"),
      color(201, 162, 75),
    ]);

    const prompt = add([
      text("Press Space or click to begin your descent", { size: 16 }),
      pos(width() / 2, height() / 2 + 110),
      anchor("center"),
      color(246, 231, 210),
      opacity(1),
    ]);
    prompt.onUpdate(() => {
      prompt.opacity = 0.55 + 0.45 * Math.abs(Math.sin(time() * 2));
    });

    function begin() {
      playPageOpen();
      go("journey");
    }
    onKeyPress("space", begin);
    onClick(begin);
  });
}
