import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

registerTitleScene();

go("title");

export default k;
