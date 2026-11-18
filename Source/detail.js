import * as T from "three";
import { Water } from "three/addons/objects/Water.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  geo,
  mat,
  group,
  shape,
  box,
  ball,
  rod,
  random,
  batch,
} from "./art.js";
import { surface, scatter, loadedTexture } from "./assets.js";

let environment;
export function prepareEnvironment(renderer) {
  const pmrem = new T.PMREMGenerator(renderer);
  environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
}
export function lighting(scene, night = false) {
  scene.environment = environment;
  scene.environmentIntensity = night ? 0.23 : 0.29;
  for (const light of scene.children)
    if (light.isHemisphereLight) light.intensity = night ? 0.64 : 0.76;
  const sun = scene.children.find((n) => n.isDirectionalLight);
  if (sun) {
    sun.castShadow = true;
    sun.intensity = night ? 0.85 : 3.6;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 0.2;
    sun.shadow.camera.far = 110;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    sun.shadow.radius = 2;
    sun.userData.sun = true;
  }
  scene.traverse((o) => {
    if (o.isMesh && !o.material.isShaderMaterial) {
      o.receiveShadow = true;
      if (!o.isInstancedMesh) o.castShadow = true;
    }
  });
}
export function followSun(world, position) {
  const light = world.scene.children.find((n) => n.userData.sun);
  if (!light) return;
  light.position.copy(position).add(new T.Vector3(-24, 34, 20));
  light.target.position.copy(position);
  light.target.updateMatrixWorld(true);
}
export function ocean(world, x, y, z, width, length) {
  const normal = loadedTexture("waternormals.jpg");
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  const sea = new Water(new T.PlaneGeometry(width, length), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normal,
    sunDirection: new T.Vector3(-0.6, 0.7, 0.4).normalize(),
    sunColor: 0xffe2b1,
    waterColor: 0x174b4b,
    distortionScale: 2.4,
    fog: false,
    alpha: 1,
  });
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(x, y, z);
  sea.material.uniforms.size.value = 4;
  world.scene.add(sea);
  world.updates.push((t) => {
    sea.material.uniforms.time.value = t * 0.38;
  });
  return sea;
}
function terrainHeight(x, z, open) {
  const verge = T.MathUtils.smoothstep(Math.abs(x), 3.3, 10);
  let y =
    verge *
    (0.35 +
      Math.sin(z * 0.047 + x * 0.11) * 0.61 +
      Math.cos(x * 0.075 - z * 0.036) * 0.76);
  if (open && x > 6)
    y = T.MathUtils.lerp(y, -3.6, T.MathUtils.smoothstep(x, 7, 16));
  const river =
    1 -
    T.MathUtils.smoothstep(
      Math.abs(x + 17 + Math.sin(z * 0.032) * 2.2),
      3.2,
      5.9,
    );
  return T.MathUtils.lerp(y, -1.36, river) - 0.06;
}
export function countryside(world, length = 160, open = false) {
  const scene = world.scene,
    rng = random(open ? 7481 : 9271);
  const groundMaterial = surface("grass-ground", 35);
  groundMaterial.color.set(0xaab48f);
  const ground = new T.Mesh(
    new T.PlaneGeometry(240, length + 220, 110, 150),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.06, -length * 0.5);
  const attr = ground.geometry.attributes.position;
  for (let i = 0; i < attr.count; i++) {
    const x = attr.getX(i),
      z = -attr.getY(i) - length * 0.5;
    const verge = T.MathUtils.smoothstep(Math.abs(x), 3.3, 9);
    let y =
      verge *
      (0.45 +
        Math.sin(z * 0.047 + x * 0.11) * 1.8 +
        Math.cos(x * 0.075 - z * 0.036) * 2.15);
    if (open && x > 6)
      y = T.MathUtils.lerp(y, -3.6, T.MathUtils.smoothstep(x, 7, 16));
    const river =
      1 -
      T.MathUtils.smoothstep(
        Math.abs(x + 17 + Math.sin(z * 0.032) * 2.2),
        3.2,
        5.9,
      );
    y = T.MathUtils.lerp(y, -1.36, river);
    attr.setZ(i, y);
  }
  for (let i = 0; i < attr.count; i++) {
    const x = attr.getX(i),
      z = -attr.getY(i) - length * 0.5;
    attr.setZ(i, terrainHeight(x, z, open) + 0.06);
  }
  ground.geometry.computeVertexNormals();
  ground.receiveShadow = true;
  scene.add(ground);
  const roadMaterial = surface("forest-floor", 1);
  roadMaterial.color.set(0xc2aa8b);
  for (const tex of [
    roadMaterial.map,
    roadMaterial.normalMap,
    roadMaterial.roughnessMap,
  ])
    tex.repeat.set(1, (length + 80) / 6);
  const path = new T.Mesh(new T.PlaneGeometry(6.5, length + 80), roadMaterial);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, -0.025, -length / 2 + 8);
  path.receiveShadow = true;
  scene.add(path);
  const nearTrees = [],
    farTrees = [],
    ferns = [],
    shrubs = [],
    grass = [],
    stones = [];
  for (let z = 21; z > -length - 54; z -= 8.5) {
    for (const side of [-1, 1]) {
      if (open && side === 1) continue;
      nearTrees.push([
        side * (6.6 + rng() * 3.4),
        -0.21,
        z + rng() * 5.5,
        0.7 + rng() * 0.37,
        rng() * 6.28,
      ]);
      farTrees.push([
        side * (18 + rng() * 16),
        -0.5,
        z + rng() * 8,
        0.7 + rng() * 0.57,
        rng() * 6.28,
      ]);
    }
  }
  for (let i = 0; i < (open ? 190 : 280); i++) {
    const x = (i % 2 ? -1 : 1) * (3.55 + rng() * (open ? 6.8 : 10.5)),
      z = 19 - rng() * (length + 63);
    if (open && x > 9) continue;
    ferns.push([x, 0.015, z, 0.42 + rng() * 0.46, rng() * 6.28]);
    if (i % 4 === 0)
      shrubs.push([x, 0.03, z, 0.4 + rng() * 0.71, rng() * 6.28]);
  }
  for (let i = 0; i < (open ? 270 : 420); i++) {
    const x = (i % 2 ? -1 : 1) * (3.35 + rng() * 12),
      z = 18 - rng() * (length + 57);
    if (open && x > 8.8) continue;
    grass.push([x, -0.02, z, 0.35 + rng() * 0.45, rng() * 6.28]);
  }
  for (let i = 0; i < 27; i++) {
    const side = i % 2 ? -1 : 1,
      x = side * (3.65 + rng() * 4.5),
      z = 18 - rng() * (length + 42);
    if (open && x > 8) continue;
    stones.push([x, -0.12, z, 0.2 + rng() * 0.48, rng() * 6.28]);
  }
  for (const placements of [nearTrees, farTrees, ferns, shrubs, grass, stones])
    for (const p of placements) p[1] = terrainHeight(p[0], p[2], open) - 0.025;
  scatter(scene, "island_tree_02", nearTrees, true);
  scatter(scene, "island_tree_02", farTrees, false);
  scatter(scene, "fern_02", ferns);
  scatter(scene, "shrub_04", shrubs);
  scatter(scene, "grass_medium_01", grass);
  scatter(scene, "boulder_01", stones);
  const hills = [];
  for (let i = 0; i < 32; i++) {
    const side = i % 2 ? -1 : 1;
    if (open && side === 1) continue;
    const x = side * (45 + rng() * 48),
      z = -40 - rng() * (length + 120),
      r = 12 + rng() * 22;
    hills.push([
      x,
      -6,
      z,
      r,
      9 + rng() * 22,
      r * 1.1,
      [0x6e8375, 0x7e8e80, 0x778d8a, 0x8b9990][i % 4],
      0.15,
      rng() * 6.28,
      0.12,
    ]);
  }
  const hillMesh = batch(scene, geo.leaf, hills);
  if (hillMesh) {
    hillMesh.material = surface("forest-floor", 8);
    hillMesh.material.color.set(0x85967c);
    hillMesh.receiveShadow = true;
  }
  if (open) ocean(world, 88, -1.05, -70, 158, 320);
  const riverGeometry = new T.BufferGeometry(),
    pos = [],
    uv = [],
    index = [];
  for (let i = 0; i <= 120; i++) {
    const z = 36 - (i * (length + 110)) / 120,
      x = -17 - Math.sin(z * 0.032) * 2.2;
    for (const side of [-1, 1]) {
      pos.push(x + side * 3.4, -0.8, z);
      uv.push(side < 0 ? 0 : 1, i / 10);
    }
    if (i < 120) {
      const j = i * 2;
      index.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  riverGeometry.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  riverGeometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  riverGeometry.setIndex(index);
  riverGeometry.computeVertexNormals();
  const riverMat = new T.MeshPhysicalMaterial({
    color: 0x357b75,
    roughness: 0.19,
    metalness: 0.32,
    normalMap: loadedTexture("waternormals.jpg"),
    normalScale: new T.Vector2(0.18, 0.18),
    side: T.DoubleSide,
  });
  const river = new T.Mesh(riverGeometry, riverMat);
  scene.add(river);
}
export function textureRoom(world) {
  const floor = surface("old-wood", 4.7),
    wall = surface("castle-stone", 2.0);
  wall.color.set(0x989183);
  world.scene.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      mesh.isInstancedMesh ||
      !mesh.material.isMeshStandardMaterial
    )
      return;
    const box3 = new T.Box3().setFromObject(mesh),
      size = box3.getSize(new T.Vector3());
    if (size.y > 2 && size.x > 2 && size.z < 0.5) {
      mesh.material = wall;
      mesh.receiveShadow = true;
    } else if (size.x > 5 && size.y < 0.4) {
      mesh.material = floor;
      mesh.receiveShadow = true;
    }
  });
  const floorPlane = new T.Mesh(new T.PlaneGeometry(7.1, 7.1), floor);
  floorPlane.rotation.x = -Math.PI / 2;
  floorPlane.position.set(0, 0.079, -0.1);
  floorPlane.receiveShadow = true;
  world.scene.add(floorPlane);
  const debris = [];
  const rng = random(487);
  for (let i = 0; i < 34; i++)
    debris.push([
      (i % 2 ? -1 : 1) * (2.5 + rng() * 0.7),
      0.02,
      -2.9 + rng() * 5.7,
      0.05 + rng() * 0.08,
      rng() * 6.28,
    ]);
  scatter(world.scene, "boulder_01", debris);
}
export function texturePalaces(scene) {
  const masonry = surface("castle-stone", 3.7);
  masonry.color.set(0xd8cdc0);
  const roofing = surface("roof-slate", 3.1);
  roofing.color.set(0x73818b);
  scene.traverse((group) => {
    if (group.name !== "castle-architecture") return;
    group.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        !mesh.geometry.attributes.uv ||
        !mesh.material.color ||
        mesh.material.emissive?.getHex()
      )
        return;
      const hsl = {};
      mesh.material.color.getHSL(hsl);
      mesh.material =
        hsl.h > 0.6 && hsl.h < 0.89 && hsl.l < 0.16 ? roofing : masonry;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  });
}
export function textureCastle(world) {
  const roofing = surface("roof-slate", 3.2);
  roofing.color.set(0x575e6c);
  const masonry = surface("castle-stone", 4.8);
  masonry.color.set(0xc5b5a2);
  const stone = surface("cobble", 5);
  stone.color.set(0xd6c4a7);
  world.scene.traverse((mesh) => {
    if (!mesh.isMesh || mesh.material.isShaderMaterial || !mesh.material.color)
      return;
    const color = mesh.material.color,
      hsl = {};
    color.getHSL(hsl);
    if (
      mesh.geometry.attributes.uv &&
      hsl.h > 0.67 &&
      hsl.h < 0.91 &&
      hsl.l < 0.22
    ) {
      mesh.material = roofing;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return;
    }
    if (
      mesh.geometry.attributes.uv &&
      hsl.s < 0.4 &&
      hsl.l > 0.13 &&
      !mesh.material.emissiveIntensity
    ) {
      const bounds = new T.Box3().setFromObject(mesh),
        size = bounds.getSize(new T.Vector3());
      mesh.material = size.y > 0.4 ? masonry : stone;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
    }
  });
  const road = world.scene.children.find(
    (o) => o.isMesh && o.geometry.attributes.position?.count === 842,
  );
  if (road) {
    road.geometry.setAttribute(
      "uv",
      new T.Float32BufferAttribute(
        Array.from({ length: 421 }, (_, i) => [0, i / 12, 1, i / 12]).flat(),
        2,
      ),
    );
    road.material = stone;
    road.receiveShadow = true;
  }
  const terrace = new T.Mesh(new T.CircleGeometry(5.99, 96), stone);
  terrace.rotation.x = -Math.PI / 2;
  terrace.position.set(0, 23.157, -25);
  terrace.receiveShadow = true;
  world.scene.add(terrace);
  const rocks = [];
  for (let i = 0; i < 48; i++) {
    const a = (i * 6.283) / 48;
    rocks.push([
      Math.cos(a) * 16,
      -0.5,
      -30 + Math.sin(a) * 25,
      0.7 + (i % 4) * 0.22,
      a,
    ]);
  }
  scatter(world.scene, "boulder_01", rocks);
  texturePalaces(world.scene);
  coastalVillage(world);
  terraceGarden(world);
}
function coastalVillage(world) {
  const scene = world.scene,
    rng = random(918);
  const land = shape(
    scene,
    geo.leaf,
    surface("forest-floor", 7),
    -17,
    4.1,
    -91,
    64,
    15.1,
    48,
  );
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 14; i++) {
      const x = -48 + i * 4.2 + row * 2.1,
        z = -63 - row * 11 + Math.sin(i * 0.52) * 4,
        y = 16.9 + row * 1.45;
      const house = group(scene, x, y, z),
        w = 1.4 + rng() * 1.5,
        h = 2.2 + rng() * 2.9,
        d = 1.6 + rng();
      box(
        house,
        [0xcab8a0, 0xd4bea5, 0xafaaa0, 0xbfa68b][i % 4],
        0,
        h / 2,
        0,
        w,
        h,
        d,
      );
      for (const side of [-1, 1]) {
        const roof = box(
          house,
          [0x77564d, 0x5a6971, 0x6a595b][i % 3],
          side * w * 0.26,
          h + 0.45,
          0,
          w * 0.66,
          0.13,
          d + 0.48,
        );
        roof.rotation.z = -side * 0.58;
      }
      for (const xx of [-0.31, 0.31]) {
        box(house, 0x504747, xx, h * 0.64, d / 2 + 0.015, 0.21, 0.44, 0.03);
        box(
          house,
          0xb99973,
          xx,
          h * 0.64 + 0.03,
          d / 2 + 0.032,
          0.12,
          0.28,
          0.02,
        );
      }
    }
  }
  const geometry = new T.PlaneGeometry(340, 150, 120, 65);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getY(i);
    const edge = Math.sin((z / 150 + 0.5) * Math.PI);
    const y =
      (16 +
        18 * Math.sin(x * 0.028 + 1.7) ** 2 +
        15 * Math.sin(x * 0.063 + 2.0) ** 2) *
      Math.max(0, edge);
    p.setZ(i, y);
  }
  geometry.computeVertexNormals();
  const terrain = new T.Mesh(geometry, surface("grass-ground", 28));
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(-15, -2, -190);
  terrain.receiveShadow = true;
  scene.add(terrain);
  const distantTrees = [];
  for (let i = 0; i < 36; i++)
    distantTrees.push([
      -56 + rng() * 92,
      18.7,
      -93 - rng() * 33,
      0.5 + rng() * 0.4,
      rng() * 6.28,
    ]);
  scatter(scene, "island_tree_02", distantTrees);
}
function terraceGarden(world) {
  const scene = world.scene;
  const leaves = [],
    roses = [];
  for (let i = 0; i < 100; i++) {
    const a = (i * 6.283) / 100;
    const x = Math.cos(a) * 5.57,
      z = -25 + Math.sin(a) * 5.57;
    if (z > -21.8 && Math.abs(x) < 2.4) continue;
    leaves.push([
      x,
      23.58 + (i % 3) * 0.11,
      z,
      0.17,
      0.12,
      0.14,
      0x50664d,
      0,
      a,
      0.3,
    ]);
    if (i % 2 === 0)
      roses.push([
        x,
        23.74 + (i % 3) * 0.11,
        z,
        0.09,
        0.08,
        0.09,
        [0xb46a75, 0xd4939b, 0xe3b6b4][i % 3],
        0,
        a,
        0.2,
      ]);
  }
  const blossoms = roses.map((p) => [
    p[0],
    23.72,
    p[2],
    0.72,
    Math.atan2(p[0], p[2] + 25),
  ]);
  scatter(scene, "flower_gazania", blossoms);
  const ferns = [
    [-4.1, 23.25, -27.3, 0.7, 0.4],
    [4.1, 23.25, -27.3, 0.7, -0.4],
  ];
  for (const x of [-4, 4])
    for (const z of [-27, -22.5]) {
      scatter(scene, "flower_gazania", [[x, 23.74, z, 1.1, 0.4]]);
      ferns.push([x, 23.74, z, 0.42, 0.7]);
    }
  scatter(scene, "fern_02", ferns);
  const trellis = group(scene, -1.4, 23.2, -29.2);
  for (const side of [-1, 1]) {
    rod(
      trellis,
      0x78594a,
      [side * 1.7, 0, 0],
      [side * 1.7, 2.8, 0],
      0.055,
      geo.pipe,
    );
    box(trellis, 0xa48c6a, side * 1.7, 2.83, 0, 0.16, 0.1, 0.17);
  }
  shape(
    trellis,
    new T.TorusGeometry(1.7, 0.055, 8, 40, Math.PI),
    0x78594a,
    0,
    2.3,
    0,
  );
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI) / 27,
      x = Math.cos(a) * 1.73,
      y = 2.3 + Math.sin(a) * 1.7;
    scatter(trellis, "flower_gazania", [[x, y - 0.18, 0, 0.55, a]]);
  }
  const lanternMaterial = new T.MeshStandardMaterial({
    color: 0xffd19b,
    emissive: 0xffaf55,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  for (const a of [1.1, 2.2, 3.2, 4.3, 5.1]) {
    const x = Math.cos(a) * 5.3,
      z = -25 + Math.sin(a) * 5.3;
    box(scene, 0x544b46, x, 23.77, z, 0.12, 1.2, 0.12);
    box(scene, lanternMaterial, x, 24.48, z, 0.19, 0.29, 0.19);
    box(scene, 0x725c45, x, 24.66, z, 0.26, 0.07, 0.26);
  }
}
