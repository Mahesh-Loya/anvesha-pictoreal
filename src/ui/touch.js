// On-screen controls for touch devices: a left-thumb virtual joystick that
// drives movement and a right-thumb "open" button that fires the same action
// as pressing E. Camera-look on touch is handled by the existing drag handlers
// on the canvas (pointer events already cover touch). Desktop is untouched.

// forward/right in -1..1, polled every frame by the game loop
export const touchMove = { f: 0, r: 0 };

export function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches
  );
}

// Builds the joystick + action buttons. Callbacks:
//   onInteract() — open the gate / open the nearest page (the E action)
//   onCamera()   — cycle the camera preset (the V action)
export function initTouchControls({ onInteract, onCamera }) {
  if (!isTouchDevice()) return;
  document.body.classList.add("touch");

  const root = document.createElement("div");
  root.id = "touch-controls";
  root.innerHTML = `
    <div id="joy-base"><div id="joy-knob"></div></div>
    <div id="touch-actions">
      <button id="touch-cam" title="Camera">🎥</button>
      <button id="touch-act" title="Open">✦</button>
    </div>
  `;
  document.body.appendChild(root);

  const base = root.querySelector("#joy-base");
  const knob = root.querySelector("#joy-knob");
  const R = 46; // px travel radius
  let joyId = null; // active pointer id

  const setKnob = (dx, dy) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const reset = () => {
    joyId = null;
    touchMove.f = 0;
    touchMove.r = 0;
    setKnob(0, 0);
    base.classList.remove("active");
  };

  base.addEventListener("pointerdown", (e) => {
    joyId = e.pointerId;
    base.setPointerCapture(e.pointerId);
    base.classList.add("active");
    move(e);
    e.preventDefault();
  });
  const move = (e) => {
    if (joyId !== e.pointerId) return;
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    setKnob(dx, dy);
    touchMove.r = dx / R;   // right
    touchMove.f = -dy / R;  // up = forward
    e.preventDefault();
  };
  base.addEventListener("pointermove", move);
  base.addEventListener("pointerup", reset);
  base.addEventListener("pointercancel", reset);
  base.addEventListener("lostpointercapture", reset);

  const act = root.querySelector("#touch-act");
  const cam = root.querySelector("#touch-cam");
  const tap = (el, fn) => {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  };
  tap(act, () => onInteract?.());
  tap(cam, () => onCamera?.());
}
