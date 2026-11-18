import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  random,
  geo,
  mat,
  group,
  shape,
  box,
  ball,
  rod,
  batch,
  glow,
} from "./art.js";
const tau = Math.PI * 2,
  gold = 0xd48951,
  litWindow = mat(0xffce86, 0.65);
function spire(parent, x, y, z, r, h, tint) {
  const profile = [
    [0, 0],
    [1.14, 0],
    [1.04, 0.08],
    [0.79, 0.2],
    [0.56, 0.38],
    [0.35, 0.6],
    [0.16, 0.84],
    [0.019, 1],
  ].map(([u, v]) => new T.Vector2(u * r, v * h));
  shape(parent, new T.LatheGeometry(profile, 20), tint, x, y, z);
  shape(parent, geo.pipe, 0x76465f, x, y + 0.08, z, r * 1.12, 0.15, r * 1.12);
  ball(parent, gold, x, y + h, z, 0.093, 0.112, 0.093);
  rod(
    parent,
    0xb87756,
    [x, y + h - 0.07, z],
    [x, y + h + 0.63, z],
    0.025,
    geo.pipe,
  );
  const pennant = new T.Shape();
  pennant.moveTo(0, 0);
  pennant.quadraticCurveTo(0.4, 0.18, 0.78, 0.04);
  pennant.quadraticCurveTo(0.42, -0.17, 0, -0.24);
  pennant.closePath();
  const silk = mat(0xaa5d74).clone();
  silk.side = T.DoubleSide;
  shape(parent, new T.ShapeGeometry(pennant), silk, x, y + h + 0.59, z);
}

function archGeometry(w, h) {
  const s = new T.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w * 0.47);
  s.quadraticCurveTo(w * 0.41, h - w * 0.13, 0, h);
  s.quadraticCurveTo(-w * 0.41, h - w * 0.13, -w / 2, h - w * 0.47);
  s.closePath();
  return new T.ShapeGeometry(s, 10);
}

const frameArched = archGeometry(0.53, 1.18);
const paneArched = archGeometry(0.33, 0.93);

function windowArch(parent, x, y, z, angle = 0) {
  const frame = group(parent, x, y, z);
  frame.rotation.y = angle;
  shape(frame, frameArched, 0x674453, 0, -0.1, 0);
  shape(frame, paneArched, litWindow, 0, 0, 0.012);
  box(frame, 0x765052, 0, 0.44, 0.035, 0.037, 0.85, 0.041);
  box(frame, 0xa76f63, 0, 0.42, 0.035, 0.34, 0.046, 0.042);
  box(frame, 0xac725c, 0, -0.055, 0.054, 0.61, 0.09, 0.18);
}

function tower(parent, x, y, z, r, h, cap, tint) {
  shape(
    parent,
    new T.CylinderGeometry(r * 0.94, r, h, 20),
    tint,
    x,
    y + h / 2,
    z,
  );
  for (const [level, rim, thick] of [
    [0.08, 1.06, 0.25],
    [0.29, 1.01, 0.15],
    [0.78, 1.01, 0.16],
    [0.95, 1.14, 0.33],
    [0.99, 1.13, 0.22],
  ]) {
    shape(
      parent,
      geo.pipe,
      0x956271,
      x,
      y + h * level,
      z,
      r * rim,
      thick,
      r * rim,
    );
  }
  for (const a of [-0.84, 0, 0.84]) {
    windowArch(
      parent,
      x + Math.sin(a) * r * 0.95,
      y + h * 0.47,
      z + Math.cos(a) * r * 0.95,
      a,
    );
    if (h > 6.2)
      windowArch(
        parent,
        x + Math.sin(a) * r * 0.95,
        y + h * 0.22,
        z + Math.cos(a) * r * 0.95,
        a,
      );
  }
  spire(parent, x, y + h, z, r * 1.02, cap, 0x56385e);
}

function mergeCastleStonework(island) {
  island.updateMatrixWorld(true);
  const groups = new Map(),
    remove = [];
  const toIsland = island.matrixWorld.clone().invert();
  island.traverse((mesh) => {
    if (
      !mesh.isMesh ||
      mesh.isInstancedMesh ||
      !mesh.material.isMeshStandardMaterial
    )
      return;
    if (!groups.has(mesh.material)) groups.set(mesh.material, []);
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geometry.applyMatrix4(toIsland.clone().multiply(mesh.matrixWorld));

    groups.get(mesh.material).push(geometry);
    remove.push(mesh);
  });
  for (const mesh of remove) mesh.removeFromParent();
  for (const [material, pieces] of groups) {
    const stonework = mergeGeometries(pieces);
    island.add(new T.Mesh(stonework, material));
    for (const geometry of pieces) geometry.dispose();
  }
}

export function castle(scene) {
  const island = group(scene);
  island.name = "castle-architecture";
  const rng = random(228);
  const rock = [];
  for (let i = 0; i < 49; i++) {
    const a = (i * tau) / 49;
    const size = 1.1 + rng() * 2.9;
    rock.push([
      Math.cos(a) * (9.5 + rng() * 2.7),
      0.26 + rng() * 1.08,
      Math.sin(a) * (4.3 + rng() * 2.7),
      size * 1.5,
      size * 0.62,
      size * 0.83,
      [0x453951, 0x4a3b55, 0x5d4664, 0x58425b][i % 4],
      0.17,
      a,
      0.28,
    ]);
  }
  batch(island, geo.gem, rock);
  ball(island, 0x443550, 0, 0.96, -0.31, 12.5, 1.8, 6.41);
  ball(island, 0x5e4159, 0, 1.72, -0.4, 9.53, 1.25, 4.82);
  const terraces = [
    [-0.1, 2.76, 1.2, 14.25, 1.33, 5.72],
    [0, 4.07, 0.6, 11.26, 2.39, 5.18],
    [0, 6.61, -1.66, 7.57, 3.43, 4.32],
    [0.54, 9.04, -3.31, 4.9, 3.87, 3.94],
  ];
  for (const [x, y, z, w, h, d] of terraces) {
    box(island, 0x9b6074, x, y, z, w, h, d);
    box(island, 0xbe827f, x, y + h / 2 - 0.01, z, w + 0.29, 0.21, d + 0.31);
    const facade = z + d / 2 + 0.017;
    for (let i = -Math.floor(w / 2.3); i <= Math.floor(w / 2.3); i++) {
      if (i === 0 && h < 1.5) continue;
      const window = group(island, x + i * 1.0, y - 0.16, facade);
      if (h < 2) window.scale.setScalar(0.55);
      windowArch(window, 0, 0, 0);
    }
  }
  const towers = [
    [-6.65, 2.4, 2.5, 1.06, 4.3, 2.54],
    [6.65, 2.42, 2.48, 1.1, 4.72, 2.65],
    [-4.77, 2.85, -0.42, 1.28, 6.75, 3.82],
    [4.78, 2.78, -0.6, 1.18, 7.17, 3.37],
    [-3.17, 5.12, -3.36, 0.89, 7.3, 3.29],
    [3.33, 5.06, -3.74, 0.97, 7.69, 3.9],
    [-1.08, 8.46, -4.16, 0.94, 6.4, 4.07],
    [1.24, 8.19, -5.28, 0.81, 6.35, 3.34],
    [-2.47, 3.6, 2.59, 0.68, 4.61, 2.81],
    [2.5, 3.6, 2.52, 0.66, 4.81, 2.71],
  ];
  towers.forEach((entry, i) =>
    tower(island, ...entry, i % 2 ? 0xb98185 : 0xa06d86),
  );
  const gate = shape(island, archGeometry(1.68, 2.55), 0x4e354d, 0, 2.1, 4.16);
  gate.rotation.y = 0.005;
  shape(island, archGeometry(1.16, 2.05), mat(0xff9e61, 1.38), 0, 2.24, 4.182);
  for (const x of [-0.34, 0, 0.34])
    box(island, 0x78505a, x, 3.12, 4.22, 0.061, 1.72, 0.052);
  for (let i = 0; i < 17; i++) {
    const x = (i - 8) * 0.74;
    box(island, 0xa87281, x, 3.39, 4.04, 0.27, 0.41, 0.43);
  }
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 1.68;
    const h = 0.68 + rng() * 2.08;
    shape(
      island,
      geo.cone,
      0x433951,
      x,
      1.74 + h * 0.37,
      3.8 - (i % 3) * 2.7,
      0.44,
      h,
      0.44,
    ).rotation.y = rng() * tau;
  }
  for (const x of [-6.3, -2.38, 2.37, 5.95])
    glow(island, 0xff9a64, x, 3.01, 4.21, 2.75, 1.86, 0.34);
  for (const x of [-2.4, 2.4])
    glow(island, 0xeb854e, x, 6.04, 3.43, 3.1, 3.01, 0.22);
  mergeCastleStonework(island);
}
