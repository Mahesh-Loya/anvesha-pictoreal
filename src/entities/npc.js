const INTERACT_RANGE = 60;

export function spawnNpc(x, y) {
  const npc = add([
    rect(20, 28),
    pos(x, y),
    anchor("center"),
    area(),
    color(201, 162, 75),
    "npc",
  ]);

  let bobT = 0;
  npc.onUpdate(() => {
    bobT += dt();
    npc.pos.y += Math.sin(bobT * 3) * 0.15;

    const seeker = get("seeker")[0];
    if (seeker) {
      const facingRight = seeker.pos.x > npc.pos.x;
      npc.flipX = facingRight;
    }
  });

  npc.isSeekerInRange = () => {
    const seeker = get("seeker")[0];
    if (!seeker) return false;
    return seeker.pos.dist(npc.pos) <= INTERACT_RANGE;
  };

  return npc;
}
