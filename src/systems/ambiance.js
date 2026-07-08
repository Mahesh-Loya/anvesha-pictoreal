import { hexToRgb } from "./color.js";

// Floating light motes that drift up through the scene — screen-anchored
// (fixed) so they read as ambient atmosphere regardless of camera movement.
const MOTE_COUNT = 26;

export function setupAmbiance(seeker, tierConfig) {
  const tint = rgb(...hexToRgb(tierConfig.palette.wall));

  for (let i = 0; i < MOTE_COUNT; i++) {
    // Deterministic-ish spread without Math.random (varies by index).
    const startX = (i * 137) % width();
    const startY = (i * 89) % height();
    const size = 1 + (i % 3);
    const speed = 8 + (i % 5) * 4;
    const swayAmp = 6 + (i % 4) * 4;
    const phase = (i * 0.7) % (Math.PI * 2);

    const mote = add([
      pos(startX, startY),
      fixed(),
      z(60),
      {
        baseX: startX,
        size,
        speed,
        swayAmp,
        phase,
      },
    ]);

    mote.onUpdate(() => {
      mote.pos.y -= mote.speed * dt();
      if (mote.pos.y < -10) {
        mote.pos.y = height() + 10;
        mote.baseX = (mote.baseX + 213) % width();
      }
      mote.pos.x = mote.baseX + Math.sin(time() * 0.6 + mote.phase) * mote.swayAmp;
    });

    mote.onDraw(() => {
      const tw = 0.5 + 0.5 * Math.abs(Math.sin(time() * 1.5 + mote.phase));
      drawCircle({ pos: vec2(0, 0), radius: mote.size * 2.4, color: tint, opacity: 0.06 * tw });
      drawCircle({ pos: vec2(0, 0), radius: mote.size, color: rgb(252, 222, 90), opacity: 0.5 * tw });
    });
  }
}
