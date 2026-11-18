import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { M, group, shape, ball, box, rod, geo, mat, random } from "./art.js";

const sphere = new T.SphereGeometry(1, 40, 28),
  tau = Math.PI * 2;
const skin = new T.MeshPhysicalMaterial({
  color: 0xf5b993,
  roughness: 0.57,
  sheen: 0.35,
  sheenColor: 0xffb9a4,
});
const gold = new T.MeshStandardMaterial({
  color: 0xe8b94d,
  metalness: 0.42,
  roughness: 0.38,
});
const hairGold = new T.MeshPhysicalMaterial({
  color: 0xe9b642,
  roughness: 0.39,
  sheen: 0.75,
  sheenColor: 0xffedaa,
});
const fabric = new Map();
function combineParts(root, keep = []) {
  const protectedMeshes = new Set(keep),
    groups = [];
  root.traverse((node) => {
    if (node.isGroup) groups.push(node);
  });
  for (const parent of groups) {
    const buckets = new Map();
    for (const mesh of parent.children) {
      if (
        !mesh.isMesh ||
        protectedMeshes.has(mesh) ||
        mesh.material.transparent ||
        mesh.material.isShaderMaterial
      )
        continue;
      const key =
        mesh.material.uuid +
        "/" +
        Object.keys(mesh.geometry.attributes).sort().join(",");
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(mesh);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        const g = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
        g.applyMatrix4(mesh.matrix);
        return g;
      });
      const geometry = mergeGeometries(geometries, false);
      if (geometry) {
        const joined = new T.Mesh(geometry, meshes[0].material);
        joined.castShadow = joined.receiveShadow = true;
        parent.add(joined);
        for (const mesh of meshes) mesh.removeFromParent();
      }
      for (const g of geometries) g.dispose();
    }
  }
}
function satin(name, color) {
  if (fabric.has(name)) return fabric.get(name);
  const m = new T.MeshPhysicalMaterial({
    color,
    roughness: 0.68,
    sheen: 0.65,
    sheenRoughness: 0.7,
    sheenColor: 0xffd9e8,
  });
  fabric.set(name, m);
  return m;
}
function orb(p, c, x, y, z, sx, sy = sx, sz = sx) {
  return shape(p, sphere, c, x, y, z, sx, sy, sz);
}
function tube(p, c, points, r = 0.016) {
  return shape(
    p,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((v) => new T.Vector3(...v))),
      Math.max(20, points.length * 8),
      r,
      9,
      false,
    ),
    c,
    0,
    0,
    0,
  );
}
function lathe(p, c, profile, pleats = 0) {
  const g = new T.LatheGeometry(
    profile.map((v) => new T.Vector2(...v)),
    64,
  );
  const pos = g.attributes.position;
  if (pleats)
    for (let i = 0; i < pos.count; i++) {
      const a = Math.atan2(pos.getX(i), pos.getZ(i)),
        r = 1 + Math.sin(a * 14) * pleats * (1 - pos.getY(i) * 0.36);
      pos.setX(i, pos.getX(i) * r);
      pos.setZ(i, pos.getZ(i) * r);
    }
  g.computeVertexNormals();
  return shape(p, g, c, 0, 0, 0);
}
let shadowMap;
function shadow(parent, w, d) {
  if (!shadowMap) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d"),
      g = x.createRadialGradient(64, 64, 4, 64, 64, 63);
    g.addColorStop(0, "#17233592");
    g.addColorStop(0.4, "#17233550");
    g.addColorStop(1, "#17233500");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    shadowMap = new T.CanvasTexture(c);
  }
  const m = new T.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const o = shape(parent, new T.PlaneGeometry(w, d), m, 0, 0.014, 0);
  o.rotation.x = -Math.PI / 2;
  return o;
}
function sculptHead(parent, { male = false, gothel = false } = {}) {
  const geometry = new T.SphereGeometry(1, 64, 48),
    p = geometry.attributes.position,
    colors = [];
  const blush = new T.Color(0xe98e82),
    base = new T.Color(0xf5bc9d),
    c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      front = Math.max(0, z);
    let width = 0.287 * (male ? 1.03 : 1);
    width *= y < -0.23 ? 1 + (y + 0.23) * 0.34 : 1;
    const cheek =
      Math.exp(-(((y + 0.17) / 0.29) ** 2)) * Math.abs(x) * front * 0.038;
    p.setXYZ(i, x * width, y * (male ? 0.345 : 0.346), z * 0.246 + cheek);
    const b =
      Math.exp(-(((Math.abs(x) - 0.6) / 0.21) ** 2) - ((y + 0.17) / 0.2) ** 2) *
      front *
      0.52;
    c.copy(base).lerp(blush, b);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = skin.clone();
  material.color.set(0xffffff);
  material.vertexColors = true;
  const face = shape(parent, geometry, material, 0, 0, 0);
  face.castShadow = true;
  // Sculpted nose, cheeks and lips share a softly shaded skin palette.
  orb(parent, skin, 0, -0.025, 0.234, 0.043, 0.088, 0.048);
  orb(parent, skin, 0, -0.069, 0.267, male ? 0.056 : 0.049, 0.036, 0.041);
  for (const s of [-1, 1]) {
    orb(parent, skin, s * 0.282, -0.015, -0.013, 0.046, 0.083, 0.033);
    orb(parent, 0xe99887, s * 0.294, -0.014, 0.012, 0.019, 0.043, 0.016);
  }
  const mouth = gothel
    ? [
        [-0.08, -0.187, 0.19],
        [0, -0.177, 0.22],
        [0.08, -0.187, 0.19],
      ]
    : [
        [-0.085, -0.17, 0.19],
        [-0.041, -0.191, 0.222],
        [0.02, -0.196, 0.226],
        [0.079, -0.171, 0.194],
      ];
  tube(parent, 0x9b4c53, mouth, 0.009);
  tube(
    parent,
    0xe99a93,
    [
      [-0.055, -0.202, 0.205],
      [0, -0.217, 0.215],
      [0.052, -0.205, 0.203],
    ],
    0.014,
  );
  return face;
}
function eye(
  parent,
  x,
  { iris = 0x70a445, male = false, gothel = false } = {},
) {
  const e = group(parent, x, 0.041, 0.198);
  e.rotation.y = Math.sign(x) * 0.2;
  e.scale.y = 0.82;
  orb(e, 0xfff8ed, 0, 0, 0, 0.099, male ? 0.079 : 0.091, 0.046);
  parent.userData.eyes ??= [];
  parent.userData.eyes.push(e);
  const pupil = group(e, 0, -0.002, 0.039);
  orb(pupil, 0x63745b, 0, 0, 0, 0.05, 0.063, 0.012);
  orb(pupil, iris, 0, 0, 0.008, 0.043, 0.055, 0.01);
  for (let j = 0; j < 24; j++) {
    const a = (j * tau) / 24;
    rod(
      pupil,
      j % 3 ? 0xa2be54 : 0xc9c46c,
      [Math.cos(a) * 0.028, Math.sin(a) * 0.037, 0.017],
      [Math.cos(a) * 0.041, Math.sin(a) * 0.052, 0.014],
      0.0015,
      geo.pipe,
    );
  }
  orb(pupil, 0x11212a, 0, 0, 0.02, 0.023, 0.037, 0.008);
  orb(pupil, 0xffffff, -0.017, 0.023, 0.028, 0.014, 0.017, 0.004);
  orb(pupil, 0xffffff, 0.02, -0.024, 0.027, 0.006, 0.008, 0.004);
  const upper = [],
    lower = [];
  for (let j = 0; j <= 16; j++) {
    const a = (j * Math.PI) / 16;
    upper.push([
      Math.cos(a) * 0.1,
      Math.sin(a) * (male ? 0.079 : 0.092),
      0.017,
    ]);
    lower.push([
      Math.cos(a) * 0.099,
      -Math.sin(a) * (male ? 0.077 : 0.088),
      0.009,
    ]);
  }
  tube(e, 0x6b3840, upper, male ? 0.009 : 0.012);
  tube(e, skin, lower, 0.008);
  if (!male)
    for (let i = 0; i < 3; i++) {
      const s = Math.sign(x);
      tube(
        e,
        0x4b2d38,
        [
          [s * (0.073 + i * 0.008), 0.052 - i * 0.008, 0.026],
          [s * (0.109 + i * 0.011), 0.072 - i * 0.005, 0.023],
        ],
        0.004,
      );
    }
  return e;
}
function groom(head, male, gothel) {
  const color = gothel ? 0x292035 : male ? 0x633e2c : hairGold;
  // A shaped cap with an open facial hairline, rather than a sphere over the face.
  const positions = [],
    indices = [],
    segments = 64,
    rows = 22;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i * tau) / segments,
        front = Math.max(0, Math.cos(a)),
        phi = (j / rows) * (1.7 - front * 0.77);
      positions.push(
        Math.sin(phi) * Math.sin(a) * 0.303,
        Math.cos(phi) * 0.363,
        Math.sin(phi) * Math.cos(a) * 0.267,
      );
      if (j < rows && i < segments) {
        const k = j * (segments + 1) + i;
        indices.push(
          k,
          k + 1,
          k + segments + 1,
          k + 1,
          k + segments + 2,
          k + segments + 1,
        );
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  g.setIndex(indices);
  g.computeVertexNormals();
  shape(head, g, color, 0, 0.008, -0.008);
  if (gothel) {
    const rng = random(912);
    for (let i = 0; i < 38; i++) {
      const a = i * 2.399,
        x = Math.sin(a) * (0.26 + rng() * 0.05),
        z = Math.cos(a) * 0.23 - 0.06;
      if (z > 0.11 && Math.abs(x) < 0.22) continue;
      const points = [];
      for (let j = 0; j < 21; j++)
        points.push([
          x + Math.sin(j * 1.5 + i) * 0.026,
          0.27 - j * 0.029,
          z + Math.cos(j * 1.5 + i) * 0.023,
        ]);
      tube(head, i % 5 === 0 ? 0x443047 : 0x241d2d, points, 0.031);
    }
  } else if (male) {
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.046;
      tube(
        head,
        i % 3 ? 0x633e2c : 0x805035,
        [
          [x - 0.03, 0.19, 0.202],
          [x - 0.13, 0.31, 0.16],
          [x - 0.04, 0.365, 0.015],
          [x + 0.02, 0.24, -0.2],
        ],
        0.043,
      );
    }
    for (const s of [-1, 1])
      tube(
        head,
        0x633e2c,
        [
          [s * 0.26, 0.16, 0.07],
          [s * 0.278, 0.03, 0.006],
          [s * 0.24, -0.09, -0.01],
        ],
        0.028,
      );
  } else {
    tube(
      head,
      hairGold,
      [
        [-0.24, 0.05, 0.08],
        [-0.27, 0.23, 0.14],
        [-0.12, 0.34, 0.23],
        [0.1, 0.32, 0.24],
        [0.24, 0.19, 0.18],
      ],
      0.049,
    );
    tube(
      head,
      0xffd76b,
      [
        [-0.24, 0.07, 0.11],
        [-0.24, 0.25, 0.18],
        [-0.08, 0.346, 0.25],
        [0.12, 0.32, 0.25],
      ],
      0.011,
    );
  }
}
function longHair(rig) {
  const root = group(rig),
    points = [
      [0, 1.94, -0.12],
      [0, 1.62, -0.23],
      [0.02, 1.17, -0.23],
      [0.03, 0.64, -0.26],
      [0.03, 0.18, -0.4],
      [0.16, 0.055, -0.78],
      [0.39, 0.051, -1.12],
      [0.54, 0.054, -1.35],
    ];
  const curve = new T.CatmullRomCurve3(points.map((v) => new T.Vector3(...v))),
    positions = [],
    indices = [],
    side = new T.Vector3(1, 0, 0),
    normal = new T.Vector3();
  for (let j = 0; j <= 72; j++) {
    const t = j / 72,
      p = curve.getPoint(t),
      w = 0.255 * (1 - M.smoothstep(t, 0.66, 1) * 0.94),
      d = 0.125 * (1 - t * 0.84);
    normal.crossVectors(curve.getTangent(t), side).normalize();
    for (let i = 0; i <= 32; i++) {
      const a = (i * tau) / 32,
        groove = 1 + 0.018 * Math.sin(a * 22 + j * 0.035);
      positions.push(
        p.x + Math.cos(a) * w * groove,
        p.y + normal.y * Math.sin(a) * d,
        p.z + normal.z * Math.sin(a) * d,
      );
      if (j < 72 && i < 32) {
        const k = j * 33 + i;
        indices.push(k, k + 1, k + 33, k + 1, k + 34, k + 33);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  shape(root, g, hairGold, 0, 0, 0);
  for (let i = 0; i < 19; i++) {
    const offset = (i - 9) * 0.026,
      points2 = points.map((p, j) => [
        p[0] + offset * (1 - j / 9),
        p[1],
        p[2] - 0.13,
      ]);
    tube(
      root,
      i % 3 === 0 ? 0xffd674 : i % 3 === 1 ? 0xc78c2f : 0xf1bc43,
      points2,
      0.0045,
    );
  }
  return root;
}
function pan(p) {
  const root = group(p),
    steel = new T.MeshStandardMaterial({
      color: 0x343b50,
      metalness: 0.67,
      roughness: 0.34,
    });
  shape(
    root,
    new T.TorusGeometry(0.205, 0.024, 12, 48),
    steel,
    0,
    -0.31,
    0.035,
  );
  const disk = shape(
    root,
    geo.pipe,
    steel,
    0,
    -0.31,
    0.026,
    0.203,
    0.04,
    0.203,
  );
  disk.rotation.x = Math.PI / 2;
  box(root, steel, 0, -0.044, 0.035, 0.044, 0.31, 0.032);
  return root;
}
function gun(p) {
  const root = group(p);
  box(root, 0x61452e, 0, -0.015, 0.04, 0.06, 0.14, 0.08);
  box(root, 0x38415b, 0, 0.066, 0.19, 0.073, 0.08, 0.29);
  shape(
    root,
    new T.TorusGeometry(0.03, 0.007, 8, 20),
    gold,
    0,
    0.004,
    0.11,
  ).rotation.y = Math.PI / 2;
  return root;
}

export function human(parent, kind = "rapunzel") {
  const gothel = kind === "gothel",
    male = kind === "eugene" || kind === "bandit" || kind === "dancer",
    bandit = kind === "bandit",
    dancing = kind === "dancer";
  const root = group(parent),
    rig = group(root),
    body = group(rig, 0, 0.95, 0),
    head = group(body, 0, 0.79, 0.015),
    arms = [],
    legs = [];
  root.userData.dynamic = true;
  const feet = [];
  const contact = shadow(root, 0.88, 0.65),
    dress = satin(
      gothel ? "burgundy" : "lavender",
      gothel ? 0x741b43 : 0xb56dd3,
    ),
    cream = satin("cream", 0xffe5bf),
    teal = satin("teal", 0x247a83);
  head.scale.setScalar(male ? 0.85 : 0.87);
  sculptHead(head, { male, gothel });
  groom(head, male, gothel);
  eye(head, -0.115, {
    male,
    gothel,
    iris: male ? 0x876744 : gothel ? 0x8d944d : 0x6aab60,
  });
  eye(head, 0.115, {
    male,
    gothel,
    iris: male ? 0x876744 : gothel ? 0x8d944d : 0x6aab60,
  });
  for (const s of [-1, 1])
    tube(
      head,
      male ? 0x57372d : gothel ? 0x352131 : 0x91602f,
      [
        [s * 0.055, 0.161, 0.224],
        [s * 0.116, 0.187 + (gothel ? -0.026 : 0.008), 0.229],
        [s * 0.192, 0.165, 0.193],
      ],
      male ? 0.016 : 0.011,
    );
  if (male) {
    orb(head, 0x634333, 0, -0.248, 0.14, 0.062, 0.029, 0.013);
    if (dancing) {
      tube(
        head,
        0x372735,
        [
          [-0.09, -0.13, 0.232],
          [0, -0.145, 0.254],
          [0.09, -0.13, 0.232],
        ],
        0.02,
      );
      orb(head, 0xc34f86, 0, 0.26, 0, 0.324, 0.2, 0.271);
      tube(
        head,
        gold,
        [
          [-0.28, 0.24, 0.12],
          [0, 0.38, 0.21],
          [0.27, 0.22, 0.12],
        ],
        0.025,
      );
    }
  }
  orb(body, skin, 0, 0.545, 0, 0.087, 0.13, 0.079);
  let gown, hair;
  if (male) {
    const torso = lathe(
      body,
      dancing
        ? satin("kurta", 0xebaf39)
        : bandit
          ? satin("bandit", 0x795d8c)
          : teal,
      [
        [0.18, 0.0],
        [0.23, 0.06],
        [0.245, 0.26],
        [0.27, 0.48],
        [0.21, 0.54],
      ],
    );
    torso.scale.z = 0.64;
    for (const s of [-1, 1]) {
      const lapel = box(body, cream, s * 0.14, 0.42, 0.16, 0.095, 0.25, 0.04);
      lapel.rotation.z = s * 0.23;
    }
    for (let i = 0; i < 3; i++) {
      rod(
        body,
        0x67482e,
        [-0.07, 0.18 + i * 0.11, 0.17],
        [0.07, 0.18 + i * 0.11, 0.17],
        0.009,
        geo.pipe,
      );
      box(body, gold, 0.02, 0.18 + i * 0.11, 0.19, 0.035, 0.025, 0.018);
    }
    box(body, 0x76503e, 0, 0.025, 0.01, 0.43, 0.068, 0.27);
    box(body, gold, 0.02, 0.024, 0.16, 0.06, 0.048, 0.02);
  } else {
    gown = lathe(
      rig,
      dress,
      [
        [0.46, 0.07],
        [0.47, 0.11],
        [0.43, 0.31],
        [0.36, 0.68],
        [0.23, 0.99],
        [0.2, 1.1],
      ],
      0.025,
    );
    gown.scale.z = 0.81;
    const bodice = lathe(body, dress, [
      [0.22, 0.05],
      [0.2, 0.2],
      [0.235, 0.44],
      [0.24, 0.51],
    ]);
    bodice.scale.z = 0.66;
    const neckline = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      neckline.push([
        Math.cos(a) * 0.238,
        0.486 - Math.sin(a) * 0.063,
        Math.sin(a) * 0.163,
      ]);
    }
    tube(body, gothel ? gold : 0xf7c7de, neckline, 0.01);
    if (!gothel) {
      for (let i = 0; i < 6; i++) {
        const y = 0.1 + i * 0.052;
        rod(
          body,
          0xffe0c8,
          [-0.065, y, 0.159],
          [0.065, y + 0.051, 0.159],
          0.004,
          geo.pipe,
        );
        rod(
          body,
          0xffe0c8,
          [0.065, y, 0.161],
          [-0.065, y + 0.051, 0.161],
          0.004,
          geo.pipe,
        );
      }
      for (let j = 0; j < 11; j++) {
        const a = (j * tau) / 11;
        const motif = group(
          rig,
          Math.sin(a) * 0.444,
          0.19,
          Math.cos(a) * 0.356,
        );
        motif.rotation.y = a;
        tube(
          motif,
          0xe9aedb,
          [
            [-0.04, 0, 0],
            [0, 0.07, 0],
            [0.037, 0.025, 0],
            [0, -0.02, 0],
            [-0.04, 0, 0],
          ],
          0.0035,
        );
      }
      hair = longHair(rig);
    }
  }
  for (const s of [-1, 1]) {
    const leg = group(rig, s * 0.12, 0.95, 0),
      shin = group(leg, 0, -0.4, 0);
    orb(leg, male ? 0x795544 : skin, 0, -0.2, 0, 0.095, 0.235, 0.093);
    orb(shin, male ? 0x554039 : skin, 0, -0.2, 0, 0.079, 0.231, 0.081);
    feet.push(
      orb(shin, male ? 0x49313b : skin, 0, -0.395, 0.052, 0.086, 0.06, 0.156),
    );
    if (male)
      shape(
        shin,
        new T.CylinderGeometry(0.083, 0.079, 0.29, 24),
        0x49313b,
        0,
        -0.22,
        0,
      );
    legs.push({ leg, shin });
    const shoulder = group(body, s * 0.267, 0.44, 0);
    shoulder.rotation.z = -s * 0.05;
    orb(
      shoulder,
      male ? cream : dress,
      0,
      -0.065,
      0,
      male ? 0.098 : 0.109,
      male ? 0.145 : 0.141,
      0.108,
    );
    if (!male && !gothel)
      for (let j = 0; j < 4; j++) {
        const a = (j * Math.PI) / 2;
        tube(
          shoulder,
          0xeeb6df,
          [
            [Math.cos(a) * 0.078, 0.037, Math.sin(a) * 0.083],
            [Math.cos(a) * 0.108, -0.057, Math.sin(a) * 0.107],
            [Math.cos(a) * 0.067, -0.18, Math.sin(a) * 0.066],
          ],
          0.008,
        );
      }
    const upper = shape(
      shoulder,
      new T.CapsuleGeometry(0.056, 0.2, 8, 16),
      gothel ? dress : skin,
      0,
      -0.205,
      0,
    );
    const elbow = group(shoulder, 0, -0.34, 0);
    shape(
      elbow,
      new T.CapsuleGeometry(0.048, 0.17, 8, 16),
      skin,
      0,
      -0.12,
      0.01,
    );
    const hand = group(elbow, 0, -0.26, 0.014);
    orb(hand, skin, 0, -0.032, 0, 0.056, 0.072, 0.031);
    for (let k = 0; k < 4; k++)
      shape(
        hand,
        new T.CapsuleGeometry(0.0105, 0.038, 5, 9),
        skin,
        (k - 1.5) * 0.021,
        -0.094,
        0.005,
      );
    orb(hand, skin, -s * 0.054, -0.021, 0.01, 0.019, 0.041, 0.022).rotation.z =
      -s * 0.3;
    arms.push({ shoulder, elbow, hand });
  }
  let panProp, gunProp, ring;
  if (!male && !gothel) {
    panProp = pan(arms[0].hand);
    gunProp = gun(arms[0].hand);
    panProp.visible = gunProp.visible = false;
  }
  if (male && !bandit) {
    ring = group(arms[1].hand, 0, -0.1, 0.06);
    box(ring, 0x59354c, 0, 0, 0, 0.13, 0.05, 0.11);
    box(ring, 0x291a38, 0, 0.027, 0, 0.115, 0.018, 0.095);
    shape(
      ring,
      new T.TorusGeometry(0.035, 0.008, 12, 40),
      gold,
      0,
      0.055,
      0.003,
    );
    shape(
      ring,
      new T.OctahedronGeometry(0.023),
      new T.MeshPhysicalMaterial({
        color: 0xecfbff,
        roughness: 0.03,
        metalness: 0.2,
        clearcoat: 1,
        emissive: 0xb5e7ff,
        emissiveIntensity: 0.35,
      }),
      0,
      0.098,
      0.003,
    );
    ring.visible = false;
  }
  if (bandit) {
    orb(head, 0x493548, 0, 0.25, -0.02, 0.31, 0.12, 0.26);
    box(head, 0x392942, 0, 0.035, 0.256, 0.4, 0.058, 0.027);
  }
  root.traverse((o) => {
    if (o.isMesh && o !== contact) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  combineParts(root, feet);
  return {
    root,
    head,
    arms,
    legs,
    feet,
    weapon(name) {
      if (panProp) panProp.visible = name === "pan";
      if (gunProp) gunProp.visible = name === "gun";
    },
    pose(
      time,
      {
        walk = 0,
        attack = 0,
        seated = false,
        kneel = false,
        down = 0,
        angry = false,
        ringVisible = false,
        dance = false,
      } = {},
    ) {
      const blink = Math.max(0, 1 - Math.abs((time % 5.2) - 4.9) / 0.095);
      for (const eye of head.userData.eyes ?? [])
        eye.scale.y = 0.82 * (1 - blink * 0.94);
      const t = time * 8.2;
      contact.visible = !seated && down < 0.15;
      root.rotation.z = M.damp(
        root.rotation.z,
        down * Math.PI * 0.49,
        10,
        0.016,
      );
      rig.position.y = seated
        ? -0.07
        : kneel
          ? -0.4
          : walk
            ? Math.abs(Math.sin(t)) * 0.026
            : 0;
      body.rotation.set(seated ? -0.07 : kneel ? 0.06 : 0, 0, 0);
      head.rotation.z = angry
        ? Math.sin(time * 4) * 0.04
        : Math.sin(time * 1.6) * 0.016;
      for (const [i, { leg, shin }] of legs.entries()) {
        leg.rotation.x = seated
          ? -1.28
          : kneel
            ? i === 0
              ? -1.25
              : 0.45
            : Math.sin(t + i * Math.PI) * 0.4 * walk;
        shin.rotation.x = seated
          ? 1.23
          : kneel
            ? 1.18
            : Math.max(0, -Math.sin(t + i * Math.PI)) * 0.4 * walk;
      }
      arms.forEach(({ shoulder, elbow }, i) => {
        shoulder.rotation.set(
          seated
            ? -0.58
            : kneel
              ? -0.67
              : Math.sin(t + i * Math.PI) * 0.27 * walk,
          0,
          i ? -0.07 : 0.07,
        );
        elbow.rotation.x = seated ? -0.67 : kneel ? -1 : -0.1;
      });
      if (attack > 0) {
        arms[0].shoulder.rotation.x = -0.5 - Math.sin(attack * Math.PI) * 1.8;
        arms[0].elbow.rotation.x = -0.5;
        body.rotation.y = Math.sin(attack * Math.PI) * 0.21;
      }
      if (angry) {
        arms[1].shoulder.rotation.x = -0.6;
        arms[1].elbow.rotation.x = -0.7;
      }
      if (gown) {
        gown.scale.y = seated ? 0.62 : 1;
        gown.position.y = seated ? 0.33 : 0;
        gown.rotation.x = seated ? -0.3 : 0;
      }
      if (hair) {
        hair.scale.y = seated ? 0.69 : 1;
        hair.scale.z = seated ? 0.65 : 1;
        hair.position.y = seated ? 1.94 * (1 - 0.69) : 0;
        hair.rotation.y = Math.sin(time * 2) * 0.018 * walk;
      }
      if (ring) ring.visible = ringVisible;
      if (dance || dancing) {
        rig.position.y = Math.abs(Math.sin(time * 5.8)) * 0.13;
        body.rotation.z = Math.sin(time * 3) * 0.16;
        head.rotation.z = -Math.sin(time * 3) * 0.15;
        arms.forEach(({ shoulder, elbow }, i) => {
          shoulder.rotation.set(
            -0.28,
            Math.sin(time * 5 + i) * 0.2,
            (i ? -1 : 1) * (2.2 + Math.sin(time * 5.8 + i) * 0.28),
          );
          elbow.rotation.x = -0.67 - Math.sin(time * 5.8 + i) * 0.35;
        });
        legs.forEach(({ leg, shin }, i) => {
          leg.rotation.x = Math.sin(time * 5.8 + i * Math.PI) * 0.5;
          shin.rotation.x =
            Math.max(0, -Math.sin(time * 5.8 + i * Math.PI)) * 0.6;
        });
      }
      if (!seated && down < 0.05) {
        root.updateMatrixWorld(true);
        let minimum = Infinity;
        for (const foot of feet) {
          const bounds = new T.Box3().setFromObject(foot);
          const local = root.worldToLocal(new T.Vector3(0, bounds.min.y, 0));
          minimum = Math.min(minimum, local.y);
        }
        rig.position.y -=
          minimum -
          0.006 -
          (dance || dancing ? Math.abs(Math.sin(time * 5.8)) * 0.08 : 0);
      }
      root.updateMatrixWorld(true);
    },
  };
}

export function pigCat(parent) {
  const root = group(parent),
    rig = group(root),
    riders = group(rig, 0, 0, -0.06),
    legs = [];
  shadow(root, 1.55, 2.4);
  root.userData.dynamic = true;
  root.userData.kind = "pig-cat";
  const pink = satin("pig-fur", 0xf4b2b5),
    patch = satin("pig-patch", 0xc785ad);
  orb(rig, pink, 0, 0.9, 0, 0.53, 0.55, 0.95);
  orb(rig, 0xffd7cc, 0, 0.72, -0.56, 0.42, 0.36, 0.44);
  const head = group(rig, 0, 1.35, -0.81);
  head.rotation.y = Math.PI;
  orb(head, pink, 0, 0, 0, 0.4, 0.36, 0.32);
  for (const s of [-1, 1]) {
    const ear = shape(
      head,
      new T.ConeGeometry(0.19, 0.4, 3),
      pink,
      s * 0.29,
      0.36,
      -0.03,
    );
    ear.rotation.z = -s * 0.24;
    ear.rotation.y = Math.PI / 6;
    const inner = shape(
      head,
      new T.ConeGeometry(0.115, 0.25, 3),
      0xd9779c,
      s * 0.29,
      0.36,
      0.05,
    );
    inner.rotation.y = Math.PI / 6;
    inner.rotation.z = -s * 0.24;
    orb(head, 0xfff8ef, s * 0.177, 0.06, 0.247, 0.126, 0.136, 0.051);
    orb(head, 0x63a58e, s * 0.171, 0.058, 0.29, 0.072, 0.1, 0.021);
    orb(head, 0x293249, s * 0.17, 0.06, 0.308, 0.033, 0.077, 0.013);
    orb(head, 0xffffff, s * 0.188, 0.094, 0.32, 0.02, 0.023, 0.006);
    tube(
      head,
      0x674a65,
      [
        [s * 0.09, 0.23, 0.26],
        [s * 0.18, 0.25, 0.25],
        [s * 0.27, 0.205, 0.22],
      ],
      0.013,
    );
    for (let j = 0; j < 3; j++)
      tube(
        head,
        0x7b6383,
        [
          [s * 0.17, -0.1 + j * 0.036, 0.28],
          [s * 0.49, -0.13 + j * 0.08, 0.25],
        ],
        0.004,
      );
  }
  orb(head, 0xf3a0b0, 0, -0.105, 0.323, 0.167, 0.105, 0.075);
  for (const s of [-1, 1])
    orb(head, 0x964b76, s * 0.061, -0.105, 0.387, 0.026, 0.036, 0.012);
  tube(
    head,
    0x8e4e75,
    [
      [-0.1, -0.22, 0.26],
      [0, -0.244, 0.29],
      [0.1, -0.22, 0.26],
    ],
    0.009,
  );
  for (const x of [-0.35, 0.35])
    for (const z of [-0.59, 0.55]) {
      const leg = group(rig, x, 0.65, z);
      orb(leg, pink, 0, -0.21, 0, 0.126, 0.27, 0.13);
      orb(leg, 0xffdace, 0, -0.54, -0.025, 0.145, 0.105, 0.18);
      legs.push(leg);
    }
  const tail = [];
  for (let i = 0; i < 35; i++) {
    const a = i * 0.36;
    tail.push([
      Math.sin(a) * 0.12 * (1 - i / 45),
      1.0 + i * 0.005,
      0.88 + i * 0.012,
    ]);
  }
  tube(rig, patch, tail, 0.033);
  const saddle = orb(rig, 0x75527f, 0, 1.365, 0.08, 0.47, 0.095, 0.65);
  for (const z of [-0.45, 0.58]) orb(rig, gold, 0, 1.39, z, 0.48, 0.038, 0.045);
  for (const s of [-1, 1]) {
    tube(
      rig,
      0x72546d,
      [
        [s * 0.24, 1.52, -0.89],
        [s * 0.48, 1.07, -0.4],
        [s * 0.47, 0.92, 0.24],
      ],
      0.016,
    );
    shape(
      rig,
      new T.TorusGeometry(0.105, 0.016, 8, 24),
      gold,
      s * 0.5,
      0.7,
      0.15,
    ).rotation.y = Math.PI / 2;
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  combineParts(root);
  return {
    root,
    riders,
    riderHeight: 0.57,
    pose(time, speed = 0) {
      const n = Math.min(1, speed);
      rig.position.y = Math.abs(Math.sin(time * 11)) * 0.045 * n;
      head.rotation.z = Math.sin(time * 4) * 0.035;
      for (const [i, leg] of legs.entries())
        leg.rotation.x =
          Math.sin(time * 11 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.52 * n;
    },
  };
}

export function storyCat(parent, evil = false) {
  const root = group(parent),
    body = group(root),
    fur = evil ? 0x352b55 : 0xfff5e7;
  shadow(root, 0.9, 0.65);
  root.userData.dynamic = true;
  orb(body, fur, 0, 0.35, 0, 0.25, 0.35, 0.22);
  const head = group(body, 0, 0.82, 0.025);
  orb(head, fur, 0, 0, 0, 0.35, 0.29, 0.25);
  for (const s of [-1, 1]) {
    const ear = shape(
      head,
      new T.ConeGeometry(0.14, 0.32, 3),
      fur,
      s * 0.22,
      0.28,
      -0.015,
    );
    ear.rotation.y = Math.PI / 6;
    ear.rotation.z = -s * 0.18;
    shape(
      head,
      new T.ConeGeometry(0.08, 0.2, 3),
      evil ? 0x9b4d91 : 0xe7a5ac,
      s * 0.22,
      0.28,
      0.05,
    ).rotation.y = Math.PI / 6;
    orb(head, 0xfffae9, s * 0.14, 0.032, 0.221, 0.095, 0.108, 0.036);
    orb(
      head,
      evil ? 0xc4df43 : 0x987c4b,
      s * 0.139,
      0.03,
      0.25,
      0.061,
      0.082,
      0.014,
    );
    orb(head, 0x202037, s * 0.14, 0.03, 0.264, 0.027, 0.062, 0.009);
    orb(head, 0xffffff, s * 0.16, 0.065, 0.276, 0.015, 0.017, 0.004);
    if (evil)
      tube(
        head,
        0x191a37,
        [
          [s * 0.07, 0.19, 0.23],
          [s * 0.24, 0.24, 0.18],
        ],
        0.021,
      );
    for (let i = 0; i < 3; i++)
      tube(
        head,
        evil ? 0xb9aad4 : 0xb4a2a0,
        [
          [s * 0.14, -0.07 + i * 0.025, 0.25],
          [s * 0.39, -0.08 + i * 0.065, 0.24],
        ],
        0.004,
      );
    orb(body, fur, s * 0.12, 0.075, 0.15, 0.092, 0.075, 0.13);
  }
  orb(head, evil ? 0xb978bb : 0xe8a0b0, 0, -0.065, 0.279, 0.048, 0.034, 0.017);
  tube(
    head,
    0x986080,
    [
      [-0.1, -0.13, 0.24],
      [0, -0.155, 0.26],
      [0.1, -0.13, 0.24],
    ],
    0.009,
  );
  tube(
    body,
    fur,
    [
      [0, 0.3, -0.17],
      [0.32, 0.17, -0.22],
      [0.41, 0.4, -0.16],
      [0.31, 0.57, -0.12],
    ],
    0.044,
  );
  if (!evil) {
    orb(head, 0x39313e, 0.19, 0.15, -0.03, 0.15, 0.14, 0.14);
    const halo = shape(
      body,
      new T.TorusGeometry(0.26, 0.017, 10, 48),
      gold,
      0,
      1.34,
      0,
    );
    halo.rotation.x = Math.PI / 2;
  }
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return {
    root,
    pose(time) {
      body.rotation.z = Math.sin(time * 2) * 0.024;
      head.scale.y = 1 + Math.sin(time * 6) * 0.025;
    },
  };
}
