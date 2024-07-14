import { Scene } from "./Scene";
import Stats from "stats.js";

(function () {
  var script = document.createElement("script");
  script.onload = function () {
    var stats = new Stats();
    document.body.appendChild(stats.dom);
    requestAnimationFrame(function loop() {
      stats.update();
      requestAnimationFrame(loop);
    });
  };
  script.src = "https://mrdoob.github.io/stats.js/build/stats.min.js";
  document.head.appendChild(script);
})();

const scene = new Scene();
scene.start();

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

setupBoundsSlider(document.querySelector("#bounds-slider")!);

function setupBoundsSlider(element: HTMLInputElement) {
  const slider = element;
  slider.addEventListener("input", () => {
    scene.setBoundary(+slider.value);
    slider.nextElementSibling!.innerHTML = slider.value;
  });
}

setupCubesSlider(document.querySelector("#cubes-slider")!);

function setupCubesSlider(element: HTMLInputElement) {
  const slider = element;
  slider.addEventListener("input", () => {
    scene.setCubes(+slider.value);
    slider.nextElementSibling!.innerHTML = slider.value;
  });
}

export { getRandomInt };
