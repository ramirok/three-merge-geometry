import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getRandomInt } from "./main";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const initialBoundary = 30;
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2,
  transparent: true,
  opacity: 0.5,
});

const geometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-initialBoundary, -initialBoundary, -initialBoundary),
  new THREE.Vector3(initialBoundary, -initialBoundary, -initialBoundary),
  new THREE.Vector3(initialBoundary, -initialBoundary, initialBoundary),
  new THREE.Vector3(-initialBoundary, -initialBoundary, initialBoundary),
  new THREE.Vector3(-initialBoundary, -initialBoundary, -initialBoundary),
]);

const lowerLine = new THREE.Line(geometry, lineMaterial);
const upperLine = lowerLine.clone();
upperLine.position.y = initialBoundary * 2;

const baseGeometry = new THREE.BoxGeometry();

const material = new THREE.MeshBasicMaterial({
  vertexColors: true,
});

const colorWhite = new THREE.Color(0xdb2777);
const colorBlue = new THREE.Color(0x0a0a0a);

type CubeUserData = {
  movementAxis: number;
  movementDirection: number;
  remainingDistance: number;
  speed: number;
  isWaiting: boolean;
  currentWaitTime: number;
  waitTime: number;
  totalDistance: number;
};
class Scene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer({ alpha: true });
  clock = new THREE.Clock(true);
  cubes: (THREE.BufferGeometry & {
    userData: CubeUserData;
  })[] = [];
  mesh: THREE.Mesh | undefined;
  boundaryLines = new THREE.Group().add(lowerLine, upperLine);
  boundary = initialBoundary;
  constructor() {
    this.scene.background = null;
    this.camera.position.z = 70;
    this.camera.position.x = -70;
    this.renderer.setPixelRatio(2);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    const observer = new ResizeObserver((entries) => {
      this.renderer.setSize(
        entries[0].target.clientWidth,
        entries[0].target.clientHeight
      );
      this.camera.aspect =
        entries[0].target.clientWidth / entries[0].target.clientHeight;
      this.camera.updateProjectionMatrix();
    });
    observer.observe(document.body);
    new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.add(this.boundaryLines);
  }

  setBoundary(newBounds: number) {
    const newYScale = newBounds / initialBoundary;
    this.boundary = newBounds;
    this.boundaryLines.scale.set(newYScale, newYScale, newYScale);
  }
  setCubes(size: number) {
    const totalCubes = this.cubes.length;
    if (size > totalCubes) {
      for (let i = 0; i < size - totalCubes; i++) {
        const newCube = baseGeometry
          .clone()
          .translate(
            getRandomInt(-this.boundary, this.boundary),
            getRandomInt(-this.boundary, this.boundary),
            getRandomInt(-this.boundary, this.boundary)
          ) as THREE.BoxGeometry & { userData: CubeUserData };

        newCube.userData = {
          movementAxis: getRandomInt(0, 2),
          movementDirection: Math.random() > 0.5 ? -1 : 1,
          remainingDistance: 1,
          speed: getRandomInt(1, 5),
          isWaiting: true,
          currentWaitTime: 0,
          waitTime: 0.5,
          totalDistance: 1,
        };

        this.cubes.push(newCube);
      }
    } else {
      this.cubes.splice(size);
    }

    const colors = [];
    for (let i = 0; i < this.cubes.length; i++) {
      const geometryPositionAttribute = this.cubes[i].attributes.position;
      const color = Math.random() < 0.5 ? colorWhite : colorBlue;
      for (let j = 0; j < geometryPositionAttribute.count; j += 1) {
        colors.push(color.r, color.g, color.b);
      }
    }

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(this.cubes);
    mergedGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    const mesh = new THREE.Mesh(mergedGeometry, material);
    this.mesh = mesh;
    this.scene.add(mesh);
  }
  update() {
    const delta = this.clock.getDelta();

    const mergedGeometryPositionAttribute =
      this.mesh!.geometry.attributes.position;

    for (let index = 0; index < this.cubes.length; index++) {
      const userData = this.cubes[index].userData;
      if (userData.isWaiting) {
        userData.currentWaitTime += delta;
        if (userData.currentWaitTime >= userData.waitTime) {
          userData.isWaiting = false;
          userData.currentWaitTime = 0;

          userData.movementAxis = getRandomInt(0, 2);

          const averagePosition = getPositionFromAttribute(
            mergedGeometryPositionAttribute,
            index
          );

          const spaceNegative = Math.round(
            this.boundary - averagePosition[userData.movementAxis]
          );
          const spacePositive = Math.round(
            this.boundary + averagePosition[userData.movementAxis]
          );

          if (spaceNegative < userData.totalDistance) {
            userData.movementDirection = -1;
          } else if (spacePositive < userData.totalDistance) {
            userData.movementDirection = 1;
          } else {
            userData.movementDirection = Math.random() > 0.5 ? 1 : -1;
          }

          userData.remainingDistance = userData.totalDistance;
        }
      } else {
        const move = Math.min(
          delta * userData.speed,
          userData.remainingDistance
        );

        for (let j = 0; j < baseGeometry.attributes.position.count; j++) {
          mergedGeometryPositionAttribute.array[
            index * baseGeometry.attributes.position.count * 3 +
              j * 3 +
              userData.movementAxis
          ] += move * userData.movementDirection;
        }
        userData.remainingDistance -= move;
        if (userData.remainingDistance <= 0) {
          userData.isWaiting = true;
        }
      }
    }

    mergedGeometryPositionAttribute.needsUpdate = true;
  }

  start() {
    this.setCubes(10_000);
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      this.update();
    });
  }
}

export { Scene };

function getPositionFromAttribute(
  positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  itemIndex: number
) {
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  const vertexCount = baseGeometry.attributes.position.count;

  for (let i = 0; i < vertexCount; i++) {
    sumX += positionAttribute.getX(itemIndex * vertexCount + i);
    sumY += positionAttribute.getY(itemIndex * vertexCount + i);
    sumZ += positionAttribute.getZ(itemIndex * vertexCount + i);
  }

  const averageX = sumX / vertexCount;
  const averageY = sumY / vertexCount;
  const averageZ = sumZ / vertexCount;
  return [averageX, averageY, averageZ];
}
