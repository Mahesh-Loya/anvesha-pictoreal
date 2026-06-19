import kaplay from "kaplay";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

scene("boot", () => {
  add([
    text("Anvesha", { size: 48 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(252, 222, 90),
  ]);
});

go("boot");

export default k;
