import { playFootstep } from "../systems/audio.js";

const SPEED = 200;

export function spawnSeeker(x, y) {
  let footstepTimer = 0;

  const seeker = add([
    rect(20, 28),
    pos(x, y),
    anchor("center"),
    area(),
    body(),
    color(252, 222, 90),
    "seeker",
  ]);

  seeker.onUpdate(() => {
    let dx = 0;
    let dy = 0;
    if (isKeyDown("left") || isKeyDown("a")) dx -= 1;
    if (isKeyDown("right") || isKeyDown("d")) dx += 1;
    if (isKeyDown("up") || isKeyDown("w")) dy -= 1;
    if (isKeyDown("down") || isKeyDown("s")) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      seeker.move((dx / len) * SPEED, (dy / len) * SPEED);
      footstepTimer -= dt();
      if (footstepTimer <= 0) {
        playFootstep();
        footstepTimer = 0.3;
      }
    }
  });

  return seeker;
}
