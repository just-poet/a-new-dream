import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  M,
  geo,
  mat,
  group,
  shape,
  box,
  ball,
  rod,
  random,
  batch,
  particles,
} from "./art.js";
import { human } from "./fairy-characters.js";

const tau = Math.PI * 2,
  leafGeometry = new T.SphereGeometry(1, 22, 14),
  stoneGeometry = new T.IcosahedronGeometry(1, 2);
for (let i = 0; i < leafGeometry.attributes.position.count; i++) {
  const p = leafGeometry.attributes.position,
    x = p.getX(i),
    y = p.getY(i),
    z = p.getZ(i),
    r = 1 + 0.065 * Math.sin(x * 7 + y * 5) * Math.sin(z * 6 - x * 3);
  p.setXYZ(i, x * r, y * r, z * r);
}
leafGeometry.computeVertexNormals();
let environment;
export function prepareEnvironment(renderer) {
  const pmrem = new T.PMREMGenerator(renderer);
  environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
  pmrem.dispose();
}
export function lighting(scene, night = false) {
  consolidate(scene);
  scene.environment = environment;
  scene.environmentIntensity = night ? 0.25 : 0.3;
  const sun = scene.children.find((o) => o.isDirectionalLight);
  for (const light of scene.children) {
    if (light.isHemisphereLight) light.intensity = night ? 0.85 : 0.95;
    if (light.isDirectionalLight && light !== sun)
      light.intensity = night ? 0.35 : 0.4;
  }
  if (sun) {
    sun.intensity = night ? 1.2 : 2.8;
    sun.color.set(night ? 0xb6caff : 0xffe1a6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 0.5,
      far: 110,
    });
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.018;
    sun.shadow.radius = 3;
    sun.userData.sun = true;
  }
  scene.traverse((o) => {
    if (o.isMesh && !o.material.isShaderMaterial) {
      o.receiveShadow = true;
      if (!o.isInstancedMesh) o.castShadow = true;
    }
  });
}
function consolidate(scene) {
  scene.updateMatrixWorld(true);
  const solids = new Map(),
    instances = new Map(),
    remove = [];
  scene.traverse((o) => {
    if (
      !o.isMesh ||
      o.material.isShaderMaterial ||
      o.material.transparent ||
      Array.isArray(o.material)
    )
      return;
    for (let parent = o; parent && parent !== scene; parent = parent.parent)
      if (parent.userData.dynamic) return;
    if (o.isInstancedMesh) {
      const matrix = new T.Matrix4(),
        color = new T.Color();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, matrix);
        const world = o.matrixWorld.clone().multiply(matrix);
        const key = o.geometry.uuid + "/" + Math.floor(world.elements[14] / 36);
        if (!instances.has(key))
          instances.set(key, { geometry: o.geometry, items: [] });
        if (o.instanceColor) o.getColorAt(i, color);
        else color.copy(o.material.color);
        instances.get(key).items.push([world.clone(), color.clone()]);
      }
      remove.push(o);
      return;
    }
    const key =
      o.material.uuid +
      "/" +
      Object.keys(o.geometry.attributes).sort().join(",");
    if (!solids.has(key))
      solids.set(key, { material: o.material, geometries: [] });
    const geometry = o.geometry.index
      ? o.geometry.toNonIndexed()
      : o.geometry.clone();
    geometry.applyMatrix4(o.matrixWorld);
    solids.get(key).geometries.push(geometry);
    remove.push(o);
  });
  for (const mesh of remove) mesh.removeFromParent();
  for (const { material, geometries } of solids.values()) {
    const geometry = mergeGeometries(geometries, false);
    if (geometry) {
      const mesh = new T.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
    }
    for (const g of geometries) g.dispose();
  }
  const foliage = new T.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
  });
  for (const { geometry, items } of instances.values()) {
    const mesh = new T.InstancedMesh(geometry, foliage, items.length);
    items.forEach(([matrix, color], i) => {
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
}
export function followSun(world, point) {
  const sun = world.scene.children.find((o) => o.userData.sun);
  if (sun) {
    sun.position.copy(point).add(new T.Vector3(-18, 27, 13));
    sun.target.position.copy(point);
    sun.target.updateMatrixWorld(true);
  }
}
function tube(parent, color, points, r = 0.1) {
  return shape(
    parent,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      Math.max(16, points.length * 6),
      r,
      8,
      false,
    ),
    color,
    0,
    0,
    0,
  );
}
function painted(name) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d"),
    rng = random(name === "stone" ? 125 : 621);
  c.fillStyle = name === "stone" ? "#b99a9d" : "#775366";
  c.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 4; col++) {
      const x = col * 128 + (row % 2) * 64 - 64,
        y = row * 64;
      c.fillStyle =
        name === "stone"
          ? ["#ead4b5", "#dfc4aa", "#e9ceb1", "#dbc2af"][Math.floor(rng() * 4)]
          : ["#8c645e", "#a17b65", "#926b60", "#ad866b"][Math.floor(rng() * 4)];
      c.beginPath();
      c.roundRect(x + 2, y + 2, 124, 60, 4);
      c.fill();
      c.strokeStyle = name === "stone" ? "#fff0d046" : "#d8ab7540";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 6, y + 7);
      c.lineTo(x + 119, y + 7);
      c.stroke();
      if (name !== "stone")
        for (let j = 0; j < 6; j++) {
          c.strokeStyle = j % 2 ? "#4d374824" : "#e6b78336";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(x + 4, y + 12 + j * 7);
          c.bezierCurveTo(
            x + 35,
            y + 10 + j * 7,
            x + 80,
            y + 19 + j * 7,
            x + 120,
            y + 12 + j * 7,
          );
          c.stroke();
        }
    }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}
const maps = new Map();
function surface(kind, repeat = 1) {
  if (!maps.has(kind)) maps.set(kind, painted(kind));
  const map = maps.get(kind).clone();
  map.repeat.set(repeat, repeat);
  map.needsUpdate = true;
  return new T.MeshStandardMaterial({ map, roughness: 0.86 });
}
export function ocean(world, x, y, z, width, length) {
  const g = new T.PlaneGeometry(width, length, 64, 64);
  g.rotateX(-Math.PI / 2);
  const material = new T.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec3 p;uniform float time;void main(){vec3 q=position;q.y+=sin(q.x*.18+time)*.07+sin(q.z*.29+time*.7)*.04;p=(modelMatrix*vec4(q,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}",
    fragmentShader:
      "varying vec3 p;uniform float time;void main(){float a=sin(p.x*.62+p.z*.4+sin(p.z*.09)*2.-time*.9);float b=sin(p.z*1.4-p.x*.4-time*.6);vec3 c=mix(vec3(.035,.36,.48),vec3(.16,.70,.72),.5+.25*a+.12*b);float sparkle=pow(max(0.,sin(p.x*3.4+time)*sin(p.z*4.7-time*.7)),22.);c+=sparkle*vec3(.45,.37,.18);float far=smoothstep(10.,210.,distance(cameraPosition.xz,p.xz));c=mix(c,vec3(.41,.76,.82),far*.48);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
  });
  const sea = shape(world.scene, g, material, x, y, z);
  world.updates.push((t) => (material.uniforms.time.value = t));
  return sea;
}
export function terrainHeight(x, z, open = false) {
  const edge = M.smoothstep(Math.abs(x), 3.35, 9);
  let y =
    edge *
    (0.65 +
      Math.sin(x * 0.15 + z * 0.047) * 0.62 +
      Math.cos(x * 0.08 - z * 0.059) * 0.45);
  const river =
    1 - M.smoothstep(Math.abs(x + 17 + Math.sin(z * 0.035) * 2), 3.0, 5.0);
  y = M.lerp(y, -1.3, river);
  if (open && x > 8) y = M.lerp(y, -3, M.smoothstep(x, 9, 18));
  return y;
}
function tree(scene, x, y, z, scale, seed = 1, autumn = false) {
  const rng = random(seed),
    root = group(scene, x, y, z),
    canopies = [];
  root.scale.setScalar(scale);
  root.rotation.y = rng() * tau;
  tube(
    root,
    0x79514e,
    [
      [0, 0, 0],
      [0.16, 2, 0.05],
      [-0.21, 4.4, 0],
      [0.19, 6.9, -0.12],
    ],
    0.35,
  );
  tube(
    root,
    0x9d6c58,
    [
      [0.02, 0.1, 0.29],
      [0.16, 2, 0.28],
      [-0.15, 4.1, 0.24],
      [0.05, 5.9, 0.04],
    ],
    0.065,
  );
  for (let i = 0; i < 5; i++) {
    const a = (i * tau) / 5 + 0.3,
      b = [
        Math.cos(a) * (1.4 + rng() * 0.9),
        4.8 + rng() * 2.1,
        Math.sin(a) * 1.8,
      ];
    tube(
      root,
      0x79514e,
      [[0, 2.1 + i * 0.37, 0], [b[0] * 0.65, b[1] - 0.7, b[2] * 0.65], b],
      0.13,
    );
    for (let j = 0; j < 3; j++)
      canopies.push([
        b[0] + (rng() - 0.5) * 1.4,
        b[1] + 0.5 + rng() * 0.8,
        b[2] + (rng() - 0.5) * 1.3,
        1.65 + rng() * 0.7,
        1.04 + rng() * 0.5,
        1.4 + rng() * 0.7,
        autumn
          ? [0xa7bd5c, 0xd0ca6d, 0xa8b958][j]
          : [0x4a905c, 0x70a765, 0x91b873][j],
        0,
        rng() * tau,
        0,
      ]);
  }
  canopies.push([0, 7.4, 0, 2.1, 1.2, 1.9, 0x8ab46c, 0, 0, 0]);
  batch(root, leafGeometry, canopies);
  for (let i = 0; i < 5; i++) {
    const a = (i * tau) / 5;
    tube(
      root,
      0x79514e,
      [
        [0, 0.3, 0],
        [Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5],
        [Math.cos(a) * 0.9, 0.02, Math.sin(a) * 0.9],
      ],
      0.13,
    );
  }
  return root;
}
function flowerData(rng, x, y, z, scale, leaves, blossoms) {
  leaves.push([
    x,
    y + 0.12 * scale,
    z,
    0.038 * scale,
    0.14 * scale,
    0.034 * scale,
    0x5c9e65,
    0,
    rng() * tau,
    0.2,
  ]);
  const color = [0xeeb9d8, 0xf5d36e, 0xc0b2f0, 0xf0dfbb][Math.floor(rng() * 4)];
  for (let j = 0; j < 5; j++) {
    const a = (j * tau) / 5;
    blossoms.push([
      x + Math.cos(a) * 0.046 * scale,
      y + 0.26 * scale,
      z + Math.sin(a) * 0.046 * scale,
      0.046 * scale,
      0.024 * scale,
      0.035 * scale,
      color,
      0,
      a,
      0,
    ]);
  }
  blossoms.push([
    x,
    y + 0.272 * scale,
    z,
    0.027 * scale,
    0.023 * scale,
    0.027 * scale,
    0xf5c060,
    0,
    0,
    0,
  ]);
}
function plants(scene, items, seed = 17) {
  const rng = random(seed),
    leaves = [],
    flowers = [],
    grass = [];
  for (const [x, y, z, s] of items) {
    for (let i = 0; i < 6; i++) {
      const a = i * 2.399,
        rr = 0.12 + rng() * 0.18;
      leaves.push([
        x + Math.cos(a) * rr * s,
        y + 0.12 * s,
        z + Math.sin(a) * rr * s,
        0.09 * s,
        0.035 * s,
        0.25 * s,
        [0x70a276, 0x85af73, 0x99bd78][i % 3],
        -0.4,
        a,
        0.2,
      ]);
    }
    if (rng() > 0.33) flowerData(rng, x, y, z, s * 1.15, grass, flowers);
  }
  batch(scene, leafGeometry, leaves);
  batch(scene, geo.pipe, grass);
  batch(scene, leafGeometry, flowers);
}
function shrubs(scene, x, y, z, s = 1) {
  const data = [];
  for (let i = 0; i < 7; i++)
    data.push([
      x + Math.sin(i * 2.399) * s * 0.35,
      y + 0.34 * s + (i % 2) * s * 0.19,
      z + Math.cos(i * 2.399) * s * 0.34,
      s * 0.45,
      s * 0.35,
      s * 0.43,
      [0x57956d, 0x79a777, 0x8bb47a][i % 3],
      0,
      i,
      0,
    ]);
  batch(scene, leafGeometry, data);
}
function meadowGrass(scene, length, open) {
  const rng = random(195),
    positions = [],
    indices = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399,
      w = 0.025 + rng() * 0.016,
      h = 0.16 + rng() * 0.2,
      k = positions.length / 3;
    const x = Math.sin(a) * 0.11,
      z = Math.cos(a) * 0.11,
      dx = Math.cos(a) * w,
      dz = Math.sin(a) * w;
    positions.push(
      x - dx,
      0,
      z - dz,
      x + dx,
      0,
      z + dz,
      x + 0.045 * Math.sin(a),
      h,
      z + 0.075 * Math.cos(a),
    );
    indices.push(k, k + 1, k + 2);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    side: T.DoubleSide,
    roughness: 0.95,
  });
  const items = [];
  for (let z = 23; z > -length - 40; z -= 0.85)
    for (const side of [-1, 1])
      for (let xx = 3.5; xx < 17; xx += 1.0) {
        const x = side * (xx + rng() * 0.7),
          zz = z + rng() * 0.8;
        if (open && (x > 10 || Math.hypot(x - 4.8, zz + 1.2) < 2.0)) continue;
        if (!open && Math.hypot(x + 4.4, zz + 39) < 1.8) continue;
        items.push([
          x,
          terrainHeight(x, zz, open) + 0.012,
          zz,
          0.65 + rng() * 0.6,
          0.65 + rng() * 0.65,
          0.65 + rng() * 0.6,
          [0x78a566, 0x90b574, 0x6c9a67, 0xa5c17c][Math.floor(rng() * 4)],
          0,
          rng() * tau,
          0,
        ]);
      }
  const chunks = new Map();
  for (const item of items) {
    const key = Math.floor(item[2] / 36);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(item);
  }
  const o = new T.Object3D(),
    c = new T.Color();
  for (const items of chunks.values()) {
    const mesh = new T.InstancedMesh(geometry, material, items.length);
    items.forEach(([x, y, z, sx, sy, sz, color, rx, ry, rz], i) => {
      o.position.set(x, y, z);
      o.scale.set(sx, sy, sz);
      o.rotation.set(rx, ry, rz);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.setHex(color));
    });
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}
function clouds(scene) {
  const rng = random(51),
    data = [];
  for (let i = 0; i < 18; i++) {
    const a = (i * tau) / 18,
      r = 180;
    for (let j = 0; j < 5; j++)
      data.push([
        Math.sin(a) * r + j * 5,
        33 + (i % 3) * 7 + (j % 2) * 2,
        Math.cos(a) * r,
        9 + (j % 2) * 3,
        3 + (j % 3),
        5,
        0xffefd9,
        0,
        a,
        0,
      ]);
  }
  const cloud = batch(scene, leafGeometry, data);
  scene.userData.clouds = cloud;
}
function mountains(scene) {
  const g = new T.PlaneGeometry(440, 200, 120, 70),
    p = g.attributes.position,
    colors = [],
    c = new T.Color();
  g.rotateX(-Math.PI / 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const h =
      Math.max(0, Math.sin(((z + 100) / 200) * Math.PI)) *
      (22 + 18 * Math.sin(x * 0.037) ** 2 + 9 * Math.sin(x * 0.08 + 0.6) ** 2);
    p.setY(i, h - 6);
    c.setHSL(0.44 + h * 0.001, 0.2, 0.38 + h * 0.003);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  shape(
    scene,
    g,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    0,
    0,
    -245,
  );
}
function cottage(scene, x, y, z, s = 1, color = 0xf4d5a3) {
  const root = group(scene, x, y, z);
  root.scale.setScalar(s);
  box(root, color, 0, 1.35, 0, 2.7, 2.7, 2.5);
  box(root, 0x87585e, 0, 0.1, 0, 2.9, 0.2, 2.7);
  for (const side of [-1, 1]) {
    const roof = box(root, 0x70668b, side * 0.83, 2.95, 0, 1.9, 0.18, 3.0);
    roof.rotation.z = -side * 0.59;
    box(root, 0x87585e, side * 1.2, 1.3, 1.27, 0.11, 2.5, 0.1);
  }
  box(root, 0x765365, 0, 0.84, 1.28, 0.61, 1.68, 0.09);
  shape(root, new T.TorusGeometry(0.17, 0.022, 8, 30), 0xf3d28b, 0, 1.17, 1.35);
  for (const side of [-1, 1]) {
    box(root, 0x6d668b, side * 0.87, 1.65, 1.3, 0.54, 0.73, 0.08);
    box(root, 0xffdf9b, side * 0.87, 1.65, 1.35, 0.39, 0.59, 0.018);
    box(root, 0x8d5c6b, side * 0.87, 1.65, 1.38, 0.035, 0.6, 0.035);
    box(root, 0x8d5c6b, side * 0.87, 1.65, 1.38, 0.41, 0.035, 0.035);
    box(root, 0x855968, side * 0.87, 1.17, 1.4, 0.7, 0.18, 0.3);
    shrubs(root, side * 0.87, 1.26, 1.4, 0.36);
  }
  box(root, 0xa57b79, -0.74, 3.22, -0.52, 0.42, 1.23, 0.46);
  return root;
}
export function countryside(world, length = 160, open = false) {
  const scene = world.scene,
    rng = random(open ? 473 : 620);
  const g = new T.PlaneGeometry(230, length + 210, 130, 180);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -length / 2);
  const p = g.attributes.position,
    colors = [],
    color = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      h = terrainHeight(x, z, open);
    p.setY(i, h);
    const tint =
      0.5 +
      0.2 * Math.sin(x * 0.22 + z * 0.16) +
      0.12 * Math.sin(x * 0.71 - z * 0.49);
    color.setHSL(0.25 + tint * 0.03, 0.34, 0.11 + tint * 0.055);
    colors.push(color.r, color.g, color.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const ground = shape(
    scene,
    g,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    0,
    0,
    0,
  );
  ground.receiveShadow = true;
  const pathG = new T.PlaneGeometry(6.7, length + 95, 18, 180);
  pathG.rotateX(-Math.PI / 2);
  pathG.translate(0, 0.018, -length / 2 + 12);
  const q = pathG.attributes.position,
    pc = [];
  for (let i = 0; i < q.count; i++) {
    const x = q.getX(i),
      z = q.getZ(i);
    q.setY(i, terrainHeight(x, z, open) + 0.02);
    color.setHSL(0.09, 0.29, 0.37 + 0.025 * Math.sin(z * 1.1 + x * 3));
    pc.push(color.r, color.g, color.b);
  }
  pathG.setAttribute("color", new T.Float32BufferAttribute(pc, 3));
  pathG.computeVertexNormals();
  shape(
    scene,
    pathG,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
    0,
    0,
    0,
  ).receiveShadow = true;
  const rocks = [],
    plantItems = [],
    grass = [],
    stones = [];
  for (let z = 20; z > -length - 50; z -= 9.5)
    for (const side of [-1, 1]) {
      if (open && side > 0) continue;
      const x = side * (6.5 + rng() * 4.6),
        zz = z + rng() * 4;
      tree(
        scene,
        x,
        terrainHeight(x, zz, open) - 0.04,
        zz,
        0.85 + rng() * 0.33,
        Math.floor(rng() * 10000),
      );
      if (!open || side < 0) {
        const xx = side * (18 + rng() * 16),
          zz2 = z + rng() * 7;
        tree(
          scene,
          xx,
          terrainHeight(xx, zz2, open) - 0.05,
          zz2,
          0.9 + rng() * 0.6,
          Math.floor(rng() * 10000),
        );
      }
    }
  for (let i = 0; i < 800; i++) {
    const x = (i % 2 ? -1 : 1) * (3.65 + rng() * 22),
      z = 24 - rng() * (length + 70);
    if (open && (x > 10 || Math.hypot(x - 4.8, z + 1.2) < 2.0)) continue;
    if (!open && Math.hypot(x + 4.4, z + 39) < 2.2) continue;
    const y = terrainHeight(x, z, open),
      s = 0.6 + rng() * 0.8;
    plantItems.push([x, y + 0.01, z, s]);
    if (i % 9 === 0) shrubs(scene, x, y, z, 0.6 + rng() * 0.7);
    if (i % 8 === 0)
      rocks.push([
        x,
        y + 0.2,
        z,
        0.24 + rng() * 0.34,
        0.23 + rng() * 0.3,
        0.24 + rng() * 0.37,
        [0x9298a0, 0xa3a5a4, 0xa6b1aa][i % 3],
        0,
        rng() * tau,
        0,
      ]);
  }
  // Wildflowers and grass follow exactly the same height field as the ground.
  plants(scene, plantItems);
  batch(scene, stoneGeometry, rocks);
  meadowGrass(scene, length, open);
  for (let i = 0; i < 70; i++) {
    const z = 16 - rng() * (length + 60),
      side = i % 2 ? -1 : 1,
      x = side * (2.9 + rng() * 0.31);
    stones.push([
      x,
      0.042,
      z,
      0.14 + rng() * 0.13,
      0.07,
      0.11 + rng() * 0.17,
      0xd0b7a3,
      0,
      rng() * tau,
      0,
    ]);
  }
  batch(scene, stoneGeometry, stones);
  if (open) ocean(world, 99, -0.9, -75, 180, 360);
  const riverG = new T.BufferGeometry(),
    pos = [],
    uv = [],
    ind = [];
  for (let i = 0; i <= 130; i++) {
    const z = 40 - (i * (length + 130)) / 130,
      x = -17 - Math.sin(z * 0.035) * 2;
    for (const side of [-1, 1]) {
      pos.push(x + side * 2.6, -0.88, z);
      uv.push(side < 0 ? 0 : 1, i / 10);
    }
    if (i < 130) {
      const k = i * 2;
      ind.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  riverG.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  riverG.setIndex(ind);
  riverG.computeVertexNormals();
  shape(
    scene,
    riverG,
    new T.MeshPhysicalMaterial({
      color: 0x54b5ba,
      roughness: 0.2,
      metalness: 0.22,
      clearcoat: 1,
    }),
    0,
    0,
    0,
  );
  for (let z = -10; z > -length - 30; z -= 28) {
    const x = -17 - Math.sin(z * 0.035) * 2;
    shrubs(scene, x - 3.3, terrainHeight(x - 3.3, z, open), z, 1.6);
  }
  // Small inhabited details keep the route from feeling like an empty corridor.
  for (const z of [-18, -85, -137]) {
    const x = -4.2;
    const sign = group(scene, x, terrainHeight(x, z, open), z);
    box(sign, 0x896259, 0, 0.63, 0, 0.11, 1.26, 0.11);
    box(sign, 0xe7cf9d, 0, 1.12, 0, 0.91, 0.4, 0.09);
    box(sign, 0xaf7c8c, 0.03, 1.12, 0.06, 0.55, 0.032, 0.01);
  }
  for (const [x, z] of [
    [4.8, -14],
    [-5.1, -74],
    [5.7, -114],
  ]) {
    const y = terrainHeight(x, z, open);
    tube(
      scene,
      0x92705c,
      [
        [x, y + 0.1, z - 0.65],
        [x + 0.1, y + 0.12, z],
        [x, y + 0.15, z + 0.7],
      ],
      0.18,
    );
    for (const j of [-1, 1])
      shape(
        scene,
        geo.disk,
        0xd7b58a,
        x,
        y + 0.14,
        z + j * 0.71,
        0.15,
        0.15,
        0.15,
      ).rotation.y = j > 0 ? 0 : Math.PI;
  }
  mountains(scene);
  clouds(scene);
  const dust = particles(
    scene,
    787,
    190,
    [40, 6, length + 45, 17],
    [0xffdf9d, 0xe8f2ad, 0xf8d5d8],
  );
  world.updates.push((t) => (dust.material.uniforms.time.value = t));
  if (!open) {
    const dancer = human(scene, "dancer");
    dancer.root.position.set(-4.4, terrainHeight(-4.4, -39, false), -39);
    dancer.root.rotation.y = 0.35;
    dancer.root.scale.setScalar(1.28);
    world.dancer = dancer;
    const matStage = surface("wood", 1);
    const stage = shape(
      scene,
      new T.CylinderGeometry(1.6, 1.7, 0.12, 32),
      matStage,
      -4.4,
      terrainHeight(-4.4, -39, false) - 0.06,
      -39,
    );
    stage.receiveShadow = true;
    world.updates.push((t) => dancer.pose(t, { dance: true }));
  } else {
    for (const [x, z, s] of [
      [-7, 13, 1],
      [-25, -39, 0.7],
      [-31, -69, 0.8],
    ])
      cottage(scene, x, terrainHeight(x, z, true), z, s);
  }
}
export function textureRoom(world) {
  const wood = surface("wood", 2),
    wall = new T.MeshStandardMaterial({ color: 0x8b7e96, roughness: 1 }),
    stone = surface("stone", 2);
  world.scene.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      !mesh.geometry.attributes.uv ||
      !mesh.material.color ||
      mesh.material.emissive?.getHex()
    )
      return;
    const size = new T.Box3().setFromObject(mesh).getSize(new T.Vector3());
    if (size.x > 5 && size.y < 0.3) mesh.material = wood;
    else if (size.y > 2 && size.x > 2 && size.z < 0.4) mesh.material = wall;
    else if (size.x < 1.9 && size.y < 0.6 && size.z > 0.4 && size.z < 1.3)
      mesh.material = wood;
  });
  const floor = shape(
    world.scene,
    new T.PlaneGeometry(7.1, 7.1),
    wood,
    0,
    0.078,
    -0.1,
  );
  floor.rotation.x = -Math.PI / 2;
  // A cluttered, fully furnished old cottage: shelves, books, jars and hearth tools.
  const shelf = group(world.scene, -3.35, 0, -0.3);
  for (const h of [0.7, 1.35, 2.0]) {
    box(shelf, 0x60455d, 0, h, 0, 0.5, 0.075, 1.65);
    for (let i = 0; i < 6; i++) {
      const z = -0.65 + i * 0.22;
      if (i % 2)
        shape(
          shelf,
          new T.CylinderGeometry(0.075, 0.082, 0.18, 16),
          [0xa0b9aa, 0xae829e, 0xd4b47b][i % 3],
          0,
          h + 0.14,
          z,
        );
      else
        box(
          shelf,
          [0x7d6d9b, 0xa57186, 0xc19b71][i % 3],
          0.06,
          h + 0.19,
          z,
          0.21,
          0.3,
          0.15,
        );
    }
  }
  const rug = shape(
    world.scene,
    new T.PlaneGeometry(2.0, 2.7),
    0x786a8d,
    0.15,
    0.084,
    0.15,
  );
  rug.rotation.x = -Math.PI / 2;
  for (let j = 0; j < 4; j++) {
    const border = shape(
      world.scene,
      new T.RingGeometry(0.36 + j * 0.16, 0.369 + j * 0.16, 64),
      0xc29b9f,
      0.15,
      0.085,
      0.15,
    );
    border.rotation.x = -Math.PI / 2;
    border.scale.y = 1.45;
  }
  for (const x of [2.6, 3.1]) {
    box(world.scene, 0x775865, x, 0.15, -2.8, 0.38, 0.28, 0.32);
    box(world.scene, 0xc9ac80, x, 0.3, -2.8, 0.41, 0.03, 0.35);
  }
}
export function texturePalaces(scene) {
  scene.traverse((root) => {
    if (root.name !== "castle-architecture" || root.userData.palette) return;
    root.userData.palette = true;
    root.traverse((mesh) => {
      if (
        !mesh.isMesh ||
        !mesh.material.color ||
        mesh.material.emissive?.getHex()
      )
        return;
      const c = mesh.material.color,
        h = {};
      c.getHSL(h);
      const m = mesh.material.clone();
      m.color.setHex(h.l < 0.13 ? 0x76628f : 0xf0cdb1);
      m.roughness = 0.77;
      mesh.material = m;
    });
  });
}
function townHeight(x, z) {
  return -2 + Math.max(0, 1 - ((x + 10) / 75) ** 2 - ((z + 85) / 68) ** 2) * 17;
}
export function textureCastle(world) {
  const scene = world.scene,
    stone = surface("stone", 3),
    wall = new T.MeshStandardMaterial({ color: 0xf1cfad, roughness: 0.81 });
  scene.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      mesh.material.isShaderMaterial ||
      !mesh.material.color ||
      mesh.material.emissive?.getHex()
    )
      return;
    const h = {};
    mesh.material.color.getHSL(h);
    if (mesh.geometry.attributes.uv && h.s < 0.42 && h.l > 0.18)
      mesh.material = wall;
  });
  const road = scene.children.find(
    (o) => o.isMesh && o.geometry.attributes.position?.count === 842,
  );
  if (road) {
    road.geometry.setAttribute(
      "uv",
      new T.Float32BufferAttribute(
        Array.from({ length: 421 }, (_, i) => [0, i / 10, 1, i / 10]).flat(),
        2,
      ),
    );
    road.material = stone;
    road.receiveShadow = true;
  }
  const terrace = shape(
    scene,
    new T.CircleGeometry(5.99, 96),
    stone,
    0,
    23.16,
    -25,
  );
  terrace.rotation.x = -Math.PI / 2;
  const ground = new T.PlaneGeometry(180, 160, 110, 100);
  ground.rotateX(-Math.PI / 2);
  ground.translate(-10, 0, -85);
  const p = ground.attributes.position,
    colors = [],
    c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = townHeight(x, z);
    p.setY(i, y);
    c.setHSL(0.27, 0.28, 0.36 + y * 0.004);
    colors.push(c.r, c.g, c.b);
  }
  ground.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  shape(
    scene,
    ground,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    0,
    0,
    0,
  );
  const rng = random(744);
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 17; i++) {
      const x = -51 + i * 5.0 + (row % 2) * 2.5,
        z = -64 - row * 9.5 + Math.sin(i * 0.6) * 2;
      if (Math.abs(x) < 15 && z > -86) continue;
      cottage(
        scene,
        x,
        townHeight(x, z) - 0.15,
        z,
        0.68 + rng() * 0.4,
        [0xf4d5a3, 0xe9bfad, 0xdcc2cf, 0xf0dbb6][i % 4],
      );
    }
  for (let i = 0; i < 34; i++) {
    const x = -65 + rng() * 120,
      z = -62 - rng() * 74;
    if (Math.abs(x) < 17 && z > -95) continue;
    tree(
      scene,
      x,
      townHeight(x, z) - 0.05,
      z,
      0.5 + rng() * 0.28,
      Math.floor(rng() * 10000),
    );
  }
  // Grounded terrace planters, rose vines, seats and lamps.
  const plantItems = [];
  for (let i = 0; i < 62; i++) {
    const a = (i * tau) / 62,
      x = Math.cos(a) * 5.55,
      z = -25 + Math.sin(a) * 5.55;
    if (z > -21.5 && Math.abs(x) < 2.3) continue;
    plantItems.push([x, 23.18, z, 0.9]);
  }
  plants(scene, plantItems, 552);
  for (const x of [-4, 4])
    for (const z of [-27, -22.5]) {
      shrubs(scene, x, 23.69, z, 0.63);
      plants(scene, [[x, 23.72, z, 0.9]], 96);
    }
  const arch = group(scene, 0, 23.18, -28.9);
  const archCurve = new T.CatmullRomCurve3(
    [
      [-1.8, 0, 0],
      [-1.8, 2.7, 0],
      [-1.1, 3.7, 0],
      [0, 4, 0],
      [1.1, 3.7, 0],
      [1.8, 2.7, 0],
      [1.8, 0, 0],
    ].map((p) => new T.Vector3(...p)),
  );
  shape(
    arch,
    new T.TubeGeometry(archCurve, 100, 0.065, 10, false),
    0x8d666b,
    0,
    0,
    0,
  );
  const roseMaterial = new T.MeshStandardMaterial({
    color: 0xf3b0cc,
    roughness: 0.59,
  });
  for (let i = 0; i < 28; i++) {
    const point = archCurve.getPointAt(0.19 + (i / 27) * 0.62);
    const flower = group(arch, point.x, point.y, point.z + 0.03);
    for (let j = 0; j < 6; j++) {
      const k = (j * tau) / 6;
      ball(
        flower,
        roseMaterial,
        Math.cos(k) * 0.067,
        Math.sin(k) * 0.067,
        0,
        0.073,
        0.061,
        0.038,
      );
    }
    ball(flower, 0xffd195, 0, 0, 0.035, 0.04, 0.04, 0.02);
    ball(flower, 0x72a072, 0.1, -0.08, -0.025, 0.1, 0.035, 0.045).rotation.z =
      0.7;
  }
  for (const s of [-1, 1]) {
    const bench = group(scene, s * 4.8, 23.18, -25);
    bench.rotation.y = (-s * Math.PI) / 2;
    box(bench, 0x9c6e79, 0, 0.45, 0, 1.75, 0.11, 0.48);
    box(bench, 0xb9848f, 0, 0.82, -0.2, 1.78, 0.55, 0.07);
    for (const x of [-0.67, 0.67])
      for (const z of [-0.17, 0.17])
        box(bench, 0x7a5b72, x, 0.23, z, 0.075, 0.46, 0.075);
  }
  for (const a of [1.0, 2.1, 3.2, 4.35, 5.15]) {
    const x = Math.cos(a) * 5.45,
      z = -25 + Math.sin(a) * 5.45;
    rod(scene, 0x73596a, [x, 23.18, z], [x, 24.66, z], 0.055, geo.pipe);
    box(scene, mat(0xffd99b, 0.65), x, 24.77, z, 0.22, 0.32, 0.22);
    box(scene, 0x866277, x, 24.98, z, 0.32, 0.09, 0.32);
  }
  texturePalaces(scene);
  clouds(scene);
  mountains(scene);
  world.decorateRamp = () => {
    for (let i = 0; i < 80; i++) {
      const u = i / 80;
      if (u < 0.16 || u > 0.95) continue;
      const p = world.curve.getPointAt(u);
      const radial = new T.Vector3(p.x, 0, p.z + 25).normalize();
      const inside = p.clone().addScaledVector(radial, -2.1),
        anchor = new T.Vector3(radial.x * 4.4, p.y - 1.7, -25 + radial.z * 4.4);
      rod(
        scene,
        wall,
        [inside.x, inside.y - 0.15, inside.z],
        [anchor.x, anchor.y, anchor.z],
        0.2,
        geo.pipe,
      );
    }
  };
}
