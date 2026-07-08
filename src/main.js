import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";
import { registerTierScene } from "./scenes/tier.js";
import { registerJourneyScene } from "./scenes/journey.js";
import { registerEndingScene } from "./scenes/ending.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [13, 43, 38], // Pictoreal deep teal
  global: true,
});

setGravity(0);

// Brand logo (the mandala-eye) — used on the title screen and as a faint
// rotating watermark behind the journey map.
loadSprite("logo", "/pictoreal-logo.png");

registerTitleScene();
registerTierScene();
registerJourneyScene();
registerEndingScene();

go("title");

export default k;
