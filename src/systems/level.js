import { hexToRgb } from "./color.js";

const TILE_SIZE = 32;

export function buildLevel(tierConfig) {
  let seekerSpawn = null;

  const level = addLevel(tierConfig.map, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      "#": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        body({ isStatic: true }),
        color(...hexToRgb(tierConfig.palette.wall)),
        "wall",
      ],
      ">": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgb(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-down",
      ],
      "<": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgb(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-up",
      ],
    },
  });

  for (let row = 0; row < tierConfig.map.length; row++) {
    const col = tierConfig.map[row].indexOf("S");
    if (col !== -1) {
      seekerSpawn = { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    }
  }

  let npcSpawn = null;
  for (let row = 0; row < tierConfig.map.length; row++) {
    const col = tierConfig.map[row].indexOf("C");
    if (col !== -1) {
      npcSpawn = { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    }
  }

  return { level, seekerSpawn, npcSpawn };
}
