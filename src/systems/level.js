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
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        "wall",
      ],
      ">": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-down",
      ],
      "<": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
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

  return { level, seekerSpawn };
}

function hexToRgbTuple(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}
