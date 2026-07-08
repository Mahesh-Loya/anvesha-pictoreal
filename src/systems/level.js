import { hexToRgb } from "./color.js";

const TILE_SIZE = 32;
// Lazy color getters — rgb() only exists after kaplay() has initialized, so
// these must not run at module load time.
const GOLD = () => rgb(201, 162, 75);
const DIYA = () => rgb(252, 222, 90);

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const shade = (rgbArr, f) => rgb(clamp255(rgbArr[0] * f), clamp255(rgbArr[1] * f), clamp255(rgbArr[2] * f));

// Carved-stone wall tile drawn in the tile's local space (0..TILE).
function wallComp(wallRgb) {
  return {
    draw() {
      drawRect({ pos: vec2(0, 0), width: TILE_SIZE, height: TILE_SIZE, color: shade(wallRgb, 0.68) });
      drawRect({ pos: vec2(3, 3), width: TILE_SIZE - 6, height: TILE_SIZE - 6, color: shade(wallRgb, 1.0), radius: 2 });
      // top-edge highlight for a lit, carved look
      drawRect({ pos: vec2(3, 3), width: TILE_SIZE - 6, height: 4, color: shade(wallRgb, 1.25), opacity: 0.5, radius: 2 });
      // corner rivets
      for (const [cx, cy] of [[6, 6], [26, 6], [6, 26], [26, 26]]) {
        drawCircle({ pos: vec2(cx, cy), radius: 1.4, color: GOLD(), opacity: 0.7 });
      }
    },
  };
}

// Descending/ascending stone steps for the stairs.
function stairComp(wallRgb, down) {
  return {
    draw() {
      for (let i = 0; i < 4; i++) {
        const f = down ? 0.9 - i * 0.16 : 0.4 + i * 0.16;
        drawRect({ pos: vec2(2, 2 + i * 7), width: TILE_SIZE - 4, height: 6, color: shade(wallRgb, f) });
      }
      const t = time();
      const gy = down ? 22 + Math.sin(t * 3) * 2 : 8 - Math.sin(t * 3) * 2;
      const dir = down ? 1 : -1;
      drawTriangle({
        p1: vec2(16, gy + 4 * dir),
        p2: vec2(11, gy - 4 * dir),
        p3: vec2(21, gy - 4 * dir),
        color: DIYA(),
        opacity: 0.85,
      });
    },
  };
}

// A page marker: a glowing framed artifact that bobs and pulses. Reads its
// own `.opacity` so the lantern can fade hidden markers in by proximity.
function markerComp() {
  return {
    draw() {
      const o = this.opacity ?? 1;
      if (o <= 0.01) return;
      const t = time();
      const bob = Math.sin(t * 2.5) * 2;
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 2));
      const cx = 16;
      const cy = 16 + bob;
      // glow halo
      drawCircle({ pos: vec2(cx, cy), radius: 16, color: DIYA(), opacity: 0.12 * pulse * o });
      drawCircle({ pos: vec2(cx, cy), radius: 10, color: DIYA(), opacity: 0.18 * pulse * o });
      // framed "page" artifact
      drawRect({ pos: vec2(cx, cy), width: 15, height: 19, color: GOLD(), anchor: "center", radius: 2, opacity: o });
      drawRect({ pos: vec2(cx, cy), width: 11, height: 15, color: rgb(246, 231, 210), anchor: "center", opacity: o });
      // a couple of ink "lines" so it reads as a page
      drawRect({ pos: vec2(cx, cy - 3), width: 7, height: 1.4, color: rgb(122, 34, 48), anchor: "center", opacity: o });
      drawRect({ pos: vec2(cx, cy + 1), width: 7, height: 1.4, color: rgb(52, 64, 107), anchor: "center", opacity: o });
    },
  };
}

export function buildLevel(tierConfig) {
  let pageCursor = 0;
  const wallRgb = hexToRgb(tierConfig.palette.wall);

  const level = addLevel(tierConfig.map, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      "#": () => [
        area({ shape: new Rect(vec2(0), TILE_SIZE, TILE_SIZE) }),
        body({ isStatic: true }),
        wallComp(wallRgb),
        "wall",
      ],
      ">": () => [
        area({ shape: new Rect(vec2(0), TILE_SIZE, TILE_SIZE) }),
        stairComp(wallRgb, true),
        "stairs-down",
      ],
      "<": () => [
        area({ shape: new Rect(vec2(0), TILE_SIZE, TILE_SIZE) }),
        stairComp(wallRgb, false),
        "stairs-up",
      ],
      "p": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          area({ shape: new Rect(vec2(0), TILE_SIZE, TILE_SIZE) }),
          opacity(1),
          markerComp(),
          "page-marker",
          { pageData },
        ];
      },
      "h": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          area({ shape: new Rect(vec2(0), TILE_SIZE, TILE_SIZE) }),
          opacity(0),
          markerComp(),
          "page-marker",
          "hidden-marker",
          { pageData },
        ];
      },
    },
  });

  let seekerSpawn = null;
  let npcSpawn = null;
  for (let row = 0; row < tierConfig.map.length; row++) {
    const sCol = tierConfig.map[row].indexOf("S");
    if (sCol !== -1) seekerSpawn = { x: sCol * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    const cCol = tierConfig.map[row].indexOf("C");
    if (cCol !== -1) npcSpawn = { x: cCol * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  return { level, seekerSpawn, npcSpawn };
}
