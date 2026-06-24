import gsap from "gsap";

export function playDescentTransition(onMidpoint) {
  const root = document.getElementById("transition-root");
  root.innerHTML = `
    <div class="transition-steps">
      <div class="step step-1"></div>
      <div class="step step-2"></div>
      <div class="step step-3"></div>
    </div>
  `;
  root.classList.add("visible");

  const tl = gsap.timeline({
    onComplete: () => {
      root.classList.remove("visible");
      root.innerHTML = "";
    },
  });

  tl.to(root, { opacity: 1, duration: 0.3 })
    .to(root.querySelector(".step-1"), { y: -40, duration: 0.5 }, "<")
    .to(root.querySelector(".step-2"), { y: -60, duration: 0.6 }, "<0.05")
    .to(root.querySelector(".step-3"), { y: -80, duration: 0.7 }, "<0.05")
    .call(() => onMidpoint())
    .to(root, { opacity: 0, duration: 0.3 });
}
