import { playFootstep } from "../systems/audio.js";
import { isAnyOverlayOpen } from "../ui/overlays.js";

const SPEED = 190;

// Draws the Sutradhar in the object's local space (origin at the figure's
// center). `pose` is one of: "idle" | "walk" | "talk" | "read" | "cheer".
// Colors are built here (not at module scope) because Kaplay's rgb() only
// exists after kaplay() has initialized. Exported so the journey-map avatar
// reuses the exact same character.
export function drawSutradhar(t, pose, facing) {
  const SKIN = rgb(224, 178, 128);
  const ROBE = rgb(217, 122, 43); // saffron
  const ROBE_DARK = rgb(165, 72, 46); // terracotta shade
  const SASH = rgb(122, 34, 48); // deep maroon
  const TRIM = rgb(201, 162, 75); // antique gold
  const HAIR = rgb(42, 31, 20);
  const DIYA = rgb(252, 222, 90); // bright diya gold
  const fx = facing;

  const walking = pose === "walk";
  const stride = walking ? Math.sin(t * 12) : 0;
  let bob = walking ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2) * 0.6;
  let jump = 0;
  if (pose === "cheer") jump = Math.abs(Math.sin(t * 6)) * 9;
  const y = -bob - jump;
  const flick = 1 + Math.sin(t * 18) * 0.12;

  // where the diya (and the reaching arm) sits, per pose
  let lamp;
  if (pose === "cheer") lamp = vec2(0, -26 + y);
  else if (pose === "talk") lamp = vec2(fx * 11, -8 + y + Math.sin(t * 5) * 3);
  else if (pose === "read") lamp = vec2(fx * 5, -6 + y);
  else lamp = vec2(fx * 12, 2 + y); // idle / walk

  // ground shadow (doesn't bob)
  drawEllipse({ pos: vec2(0, 15), radiusX: 12, radiusY: 4, color: rgb(0, 0, 0), opacity: 0.22 });

  // robe
  drawPolygon({ pts: [vec2(-8, -6 + y), vec2(8, -6 + y), vec2(12, 14 + y), vec2(-12, 14 + y)], color: ROBE });
  drawPolygon({ pts: [vec2(-10, 6 + y), vec2(10, 6 + y), vec2(12, 14 + y), vec2(-12, 14 + y)], color: ROBE_DARK, opacity: 0.55 });
  drawRect({ pos: vec2(0, 14 + y), width: 24, height: 3, color: TRIM, anchor: "center" });
  // feet
  drawEllipse({ pos: vec2(-4 + stride * 2, 16 + y), radiusX: 3, radiusY: 2, color: HAIR });
  drawEllipse({ pos: vec2(4 - stride * 2, 16 + y), radiusX: 3, radiusY: 2, color: HAIR });
  // sash
  drawPolygon({ pts: [vec2(-8, -4 + y), vec2(8, -2 + y), vec2(7, 2 + y), vec2(-9, 0 + y)], color: SASH });
  // head + hair
  drawCircle({ pos: vec2(0, -13 + y), radius: 6, color: SKIN });
  drawPolygon({ pts: [vec2(-6, -13 + y), vec2(6, -13 + y), vec2(5, -18 + y), vec2(-5, -18 + y)], color: HAIR });

  // arms — a second arm for read/cheer, mirrored
  const shoulderY = -2 + y;
  drawLine({ p1: vec2(6 * fx, shoulderY), p2: lamp, width: 3, color: ROBE });
  if (pose === "cheer") {
    drawLine({ p1: vec2(-6 * fx, shoulderY), p2: vec2(-lamp.x, lamp.y + 2), width: 3, color: ROBE });
    // little celebration sparks
    for (let i = 0; i < 5; i++) {
      const a = t * 3 + i * 1.3;
      drawCircle({ pos: vec2(Math.cos(a) * 20, -26 + y + Math.sin(a) * 12), radius: 1.6, color: DIYA, opacity: 0.8 });
    }
  } else if (pose === "read") {
    drawLine({ p1: vec2(-6 * fx, shoulderY), p2: vec2(lamp.x - fx * 3, lamp.y + 3), width: 3, color: ROBE });
  }

  // the diya + glow (rides on `lamp`)
  drawCircle({ pos: lamp, radius: 16 * flick, color: DIYA, opacity: 0.10 });
  drawCircle({ pos: lamp, radius: 9 * flick, color: DIYA, opacity: 0.18 });
  drawEllipse({ pos: vec2(lamp.x, lamp.y + 2), radiusX: 4, radiusY: 2, color: ROBE_DARK });
  drawPolygon({ pts: [vec2(lamp.x, lamp.y - 6), vec2(lamp.x - 2.2, lamp.y - 1), vec2(lamp.x + 2.2, lamp.y - 1)], color: DIYA });
  drawCircle({ pos: vec2(lamp.x, lamp.y - 2), radius: 1.6, color: rgb(255, 255, 240) });
}

export function spawnSutradhar(x, y) {
  let footstepTimer = 0;

  const hero = add([
    pos(x, y),
    anchor("center"),
    area({ shape: new Rect(vec2(0), 18, 30) }),
    body(),
    z(20),
    { facing: 1, moving: false },
    "seeker", // internal tag kept for NPC/interaction/lantern queries
  ]);

  hero.onDraw(() => {
    drawSutradhar(time(), hero.moving ? "walk" : "idle", hero.facing);
  });

  hero.onUpdate(() => {
    if (isAnyOverlayOpen()) {
      hero.moving = false;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (isKeyDown("left") || isKeyDown("a")) dx -= 1;
    if (isKeyDown("right") || isKeyDown("d")) dx += 1;
    if (isKeyDown("up") || isKeyDown("w")) dy -= 1;
    if (isKeyDown("down") || isKeyDown("s")) dy += 1;

    hero.moving = dx !== 0 || dy !== 0;
    if (hero.moving) {
      if (dx !== 0) hero.facing = dx > 0 ? 1 : -1;
      const len = Math.sqrt(dx * dx + dy * dy);
      hero.move((dx / len) * SPEED, (dy / len) * SPEED);
      footstepTimer -= dt();
      if (footstepTimer <= 0) {
        playFootstep();
        footstepTimer = 0.3;
      }
    }
  });

  return hero;
}
