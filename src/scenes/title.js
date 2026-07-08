import { playPageOpen } from "../systems/audio.js";

export function registerTitleScene() {
  scene("title", () => {
    // near-black backdrop so the logo's dark circle blends in seamlessly
    add([rect(width(), height()), pos(0, 0), color(6, 22, 18), z(-20)]);

    // slow radial shimmer + drifting silver motes
    add([
      z(-15),
      {
        draw() {
          const t = time();
          const cx = width() / 2;
          const cy = height() / 2 - 30;
          for (let i = 0; i < 3; i++) {
            const r = (140 + i * 70) * (1 + Math.sin(t * 0.8 + i) * 0.04);
            drawCircle({ pos: vec2(cx, cy), radius: r, color: rgb(20, 80, 70), opacity: 0.12 - i * 0.03 });
          }
        },
      },
    ]);
    for (let i = 0; i < 22; i++) {
      const sx = (i * 151) % width();
      const m = add([pos(sx, (i * 97) % height()), z(-10), { bx: sx, sp: 8 + (i % 5) * 4, ph: (i * 0.8) % 6.28, sz: 1 + (i % 3) }]);
      m.onUpdate(() => {
        m.pos.y -= m.sp * dt();
        if (m.pos.y < -8) m.pos.y = height() + 8;
        m.pos.x = m.bx + Math.sin(time() * 0.6 + m.ph) * 12;
      });
      m.onDraw(() => {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time() * 1.4 + m.ph));
        drawCircle({ pos: vec2(0, 0), radius: m.sz, color: rgb(223, 230, 226), opacity: 0.5 * tw });
      });
    }

    // the logo, gently floating + breathing
    const logo = add([
      sprite("logo"),
      pos(width() / 2, height() / 2 - 30),
      anchor("center"),
      scale(0.34),
      { base: 0.34 },
    ]);
    logo.onUpdate(() => {
      const t = time();
      logo.pos.y = height() / 2 - 30 + Math.sin(t * 1.2) * 6;
      const s = logo.base * (1 + Math.sin(t * 1.6) * 0.012);
      logo.scale = vec2(s);
    });

    const prompt = add([
      text("Press Space or tap to begin the descent", { size: 17 }),
      pos(width() / 2, height() - 70),
      anchor("center"),
      color(223, 230, 226),
      opacity(1),
    ]);
    prompt.onUpdate(() => {
      prompt.opacity = 0.5 + 0.5 * Math.abs(Math.sin(time() * 2));
    });

    function begin() {
      playPageOpen();
      go("journey");
    }
    onKeyPress("space", begin);
    onClick(begin);
  });
}
