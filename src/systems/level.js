import { hexToRgb } from "./color.js";

const TILE_SIZE = 32;

export function buildLevel(tierConfig) {
  let pageCursor = 0;

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
      "p": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          circle(8),
          area(),
          color(252, 222, 90),
          "page-marker",
          { pageData },
        ];
      },
      "h": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          circle(8),
          area(),
          color(252, 222, 90),
          opacity(0),
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
