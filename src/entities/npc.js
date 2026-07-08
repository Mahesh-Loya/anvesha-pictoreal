const INTERACT_RANGE = 60;

// The Custodian of Forgotten Books — a robed keeper who gently sways, faces
// the Sutradhar, and shows a floating "talk" glyph when you're close enough.
function drawCustodian(t, facing, inRange) {
  const ROBE = rgb(52, 64, 107); // indigo keeper's robe
  const ROBE_DARK = rgb(36, 44, 78);
  const SKIN = rgb(224, 178, 128);
  const HAIR = rgb(230, 230, 235); // white-haired elder
  const TRIM = rgb(201, 162, 75);
  const BOOK = rgb(122, 34, 48);

  const bob = Math.sin(t * 2) * 1.2;
  const y = -bob;

  // shadow
  drawEllipse({ pos: vec2(0, 15), radiusX: 12, radiusY: 4, color: rgb(0, 0, 0), opacity: 0.22 });
  // robe
  drawPolygon({ pts: [vec2(-9, -6 + y), vec2(9, -6 + y), vec2(13, 15 + y), vec2(-13, 15 + y)], color: ROBE });
  drawPolygon({ pts: [vec2(-11, 7 + y), vec2(11, 7 + y), vec2(13, 15 + y), vec2(-13, 15 + y)], color: ROBE_DARK, opacity: 0.6 });
  drawRect({ pos: vec2(0, 15 + y), width: 26, height: 3, color: TRIM, anchor: "center" });
  // a held book (the "forgotten books")
  drawRect({ pos: vec2(7 * facing, 4 + y), width: 8, height: 10, color: BOOK, anchor: "center", radius: 1 });
  drawRect({ pos: vec2(7 * facing, 4 + y), width: 2, height: 10, color: TRIM, anchor: "center" });
  // head + elder hair
  drawCircle({ pos: vec2(0, -13 + y), radius: 6, color: SKIN });
  drawPolygon({ pts: [vec2(-6, -12 + y), vec2(6, -12 + y), vec2(5, -19 + y), vec2(-5, -19 + y)], color: HAIR });
  // floating talk glyph when in range
  if (inRange) {
    const gy = -26 + Math.sin(t * 4) * 2;
    drawCircle({ pos: vec2(0, gy), radius: 8, color: rgb(252, 222, 90), opacity: 0.9 });
    drawRect({ pos: vec2(0, gy - 1), width: 7, height: 1.5, color: rgb(42, 31, 20), anchor: "center" });
    drawRect({ pos: vec2(0, gy + 2), width: 5, height: 1.5, color: rgb(42, 31, 20), anchor: "center" });
  }
}

export function spawnNpc(x, y) {
  const npc = add([
    pos(x, y),
    anchor("center"),
    area({ shape: new Rect(vec2(0), 22, 30) }),
    z(18),
    { facing: 1 },
    "npc",
  ]);

  npc.onDraw(() => {
    drawCustodian(time(), npc.facing, npc.isSeekerInRange());
  });

  npc.onUpdate(() => {
    const seeker = get("seeker")[0];
    if (seeker) npc.facing = seeker.pos.x > npc.pos.x ? 1 : -1;
  });

  npc.isSeekerInRange = () => {
    const seeker = get("seeker")[0];
    if (!seeker) return false;
    return seeker.pos.dist(npc.pos) <= INTERACT_RANGE;
  };

  return npc;
}
