import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";
import { registerTierScene } from "./scenes/tier.js";
import { registerJourneyScene } from "./scenes/journey.js";
import { registerEndingScene } from "./scenes/ending.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

registerTitleScene();
registerTierScene();
registerJourneyScene();
registerEndingScene();

go("title");

export default k;
