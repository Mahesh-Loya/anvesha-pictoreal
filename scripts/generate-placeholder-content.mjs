import { mkdirSync, writeFileSync } from "node:fs";
import { magazine } from "../src/content/magazine.config.js";

mkdirSync("public/pages", { recursive: true });
mkdirSync("public/art", { recursive: true });

const MOTIF_COLORS = ["#C9A24B", "#F6E7D2", "#2A1F14"];

function motifSvg(seed, tint, label) {
  const shapes = [];
  for (let i = 0; i < 12; i++) {
    const x = (seed * 37 + i * 53) % 480;
    const y = (seed * 71 + i * 29) % 640;
    const kind = i % 3;
    if (kind === 0) {
      shapes.push(`<circle cx="${x}" cy="${y}" r="6" fill="${MOTIF_COLORS[i % 3]}" />`);
    } else if (kind === 1) {
      shapes.push(`<polygon points="${x},${y} ${x + 14},${y} ${x + 7},${y - 14}" fill="${MOTIF_COLORS[(i + 1) % 3]}" />`);
    } else {
      shapes.push(`<rect x="${x}" y="${y}" width="10" height="10" fill="${MOTIF_COLORS[(i + 2) % 3]}" />`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <rect width="480" height="640" fill="${tint}" />
  ${shapes.join("\n  ")}
  <text x="240" y="600" font-family="Georgia, serif" font-size="20" fill="#F6E7D2" text-anchor="middle">${label}</text>
</svg>`;
}

let seed = 1;
for (const tier of magazine.tiers) {
  for (const page of tier.pages) {
    writeFileSync(`public${page.surfaceImage}`, motifSvg(seed++, tier.palette.wall, page.title));
    if (page.hiddenImage) {
      writeFileSync(`public${page.hiddenImage}`, motifSvg(seed++, tier.palette.bg, `${page.title} (hidden)`));
    }
  }
}

const { rows, cols } = magazine.fragments;
const fragW = 480 / cols;
const fragH = 640 / rows;
const fragments = [];
let i = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const hue = (i * 360) / (rows * cols);
    fragments.push(
      `<rect x="${c * fragW}" y="${r * fragH}" width="${fragW}" height="${fragH}" fill="hsl(${hue}, 55%, 45%)" stroke="#F6E7D2" stroke-width="2" />`
    );
    i++;
  }
}
writeFileSync(
  `public${magazine.fragments.image}`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">${fragments.join("\n")}</svg>`
);

console.log(`Generated ${seed - 1} page image(s) and 1 final artwork.`);
