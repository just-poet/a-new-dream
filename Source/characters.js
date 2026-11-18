import * as T from "three";
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
  glow,
} from "./art.js";

const gold = 0xddac63,
  goldLight = 0xffd992,
  skin = 0xf2b18d;
const pearl = 0xfff0d6;
const curves = new Map();
function tube(parent, color, points, radius = 0.022) {
  const path = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  return shape(
    parent,
    new T.TubeGeometry(path, Math.max(8, points.length * 5), radius, 7, false),
    color,
    0,
    0,
    0,
  );
}
function lathe(parent, color, levels, x = 0, y = 0, z = 0) {
  const geometry = new T.LatheGeometry(
    levels.map(([r, h]) => new T.Vector2(r, h)),
    44,
  );
  return shape(parent, geometry, color, x, y, z);
}

function dressMaterial(gothel) {
  const key = gothel ? "gothel" : "rapunzel";
  if (curves.has(key)) return curves.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 512, 0);
  gradient.addColorStop(0, gothel ? "#4f1028" : "#8e47a8");
  gradient.addColorStop(0.2, gothel ? "#871b36" : "#c77ad4");
  gradient.addColorStop(0.42, gothel ? "#681a30" : "#a955bc");
  gradient.addColorStop(0.65, gothel ? "#761e36" : "#c781d3");
  gradient.addColorStop(1, gothel ? "#400e23" : "#9b50b0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 1024);
  ctx.strokeStyle = gothel ? "#b27b37" : "#edafdb";
  ctx.lineWidth = 1.7;
  for (let x = 0; x < 512; x += 64) {
    for (let y = -120; y < 1140; y += 180) {
      ctx.beginPath();
      ctx.moveTo(x + 31, y);
      ctx.bezierCurveTo(x - 14, y + 45, x + 76, y + 64, x + 32, y + 111);
      ctx.bezierCurveTo(x + 6, y + 146, x + 12, y + 67, x + 32, y + 91);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x + 32, y + 156, 9, 18, 0.23, 0, 6.28);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff09" : "#24072a10";
    ctx.fillRect((i * 37) % 512, (i * 97) % 1024, 1, 12);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.MeshStandardMaterial({
    map: texture,
    roughness: 0.67,
  });
  curves.set(key, material);
  return material;
}

function eyes(parent, x, y, z, iris, radius = 0.085, adult = false) {
  const eye = group(parent, x, y, z);
  const side = Math.sign(x);
  eye.rotation.y = side * 0.16;
  ball(
    eye,
    0xfff6e4,
    0,
    0,
    0,
    radius * 1.22,
    radius * (adult ? 0.72 : 0.99),
    radius * 0.39,
  );
  ball(
    eye,
    iris,
    -side * 0.006,
    -0.002,
    radius * 0.326,
    radius * 0.63,
    radius * 0.71,
    radius * 0.17,
  );
  ball(
    eye,
    0x18252b,
    -side * 0.006,
    -0.002,
    radius * 0.447,
    radius * 0.3,
    radius * 0.46,
    radius * 0.098,
  );
  ball(
    eye,
    0xffffff,
    -radius * 0.16,
    radius * 0.24,
    radius * 0.53,
    radius * 0.15,
    radius * 0.18,
    radius * 0.028,
  );
  ball(
    eye,
    0xffeedb,
    radius * 0.19,
    -radius * 0.2,
    radius * 0.53,
    radius * 0.064,
    radius * 0.068,
    radius * 0.017,
  );
  const lid = [];
  for (let i = 0; i <= 10; i++) {
    const a = 0.13 + (i * Math.PI * 0.94) / 10;
    lid.push([
      Math.cos(a) * radius * 1.22,
      Math.sin(a) * radius * (adult ? 0.71 : 0.99),
      radius * 0.15,
    ]);
  }
  tube(eye, 0x543137, lid, 0.009);
  for (let k = 0; k < 3; k++)
    rod(
      eye,
      0x493038,
      [side * radius * (0.83 + k * 0.12), radius * (0.45 - k * 0.2), 0.02],
      [side * radius * (1.09 + k * 0.14), radius * (0.64 - k * 0.15), 0.018],
      0.006,
      geo.pipe,
    );
  return eye;
}

function panModel(parent) {
  const pan = group(parent);
  const iron = new T.MeshStandardMaterial({
    color: 0x32323a,
    roughness: 0.54,
    metalness: 0.45,
  });
  const rim = shape(
    pan,
    new T.TorusGeometry(0.24, 0.032, 10, 38),
    iron,
    0,
    -0.43,
    0.03,
  );
  const bowl = shape(pan, geo.pipe, iron, 0, -0.43, 0.03, 0.237, 0.048, 0.237);
  bowl.rotation.x = Math.PI / 2;
  const inner = shape(pan, geo.disk, 0x1a1c25, 0, -0.43, 0.001, 0.21, 0.21, 1);
  inner.rotation.y = Math.PI;
  box(pan, iron, 0, -0.08, 0.03, 0.055, 0.39, 0.042);
  shape(pan, new T.TorusGeometry(0.027, 0.009, 7, 14), iron, 0, 0.12, 0.03);
  return pan;
}
function gunModel(parent) {
  const gun = group(parent);
  gun.rotation.x = -0.3;
  box(gun, 0x6d4d50, 0, -0.035, 0.08, 0.065, 0.19, 0.1);
  box(gun, 0x383d4a, 0, 0.056, 0.22, 0.102, 0.11, 0.37);
  shape(
    gun,
    geo.pipe,
    0x202733,
    0,
    0.06,
    0.429,
    0.029,
    0.058,
    0.029,
  ).rotation.x = Math.PI / 2;
  box(gun, gold, 0, 0.12, 0.11, 0.021, 0.028, 0.035);
  return gun;
}

export function human(parent, kind = "rapunzel") {
  const gothel = kind === "gothel",
    man = kind === "eugene",
    bandit = kind === "bandit";
  const male = man || bandit;
  const root = group(parent),
    rig = group(root),
    body = group(rig, 0, 0.96, 0);
  const complexion = gothel ? 0xe9ad93 : bandit ? 0xb77a60 : skin;
  const hair = gothel ? 0x201e29 : male ? 0x603a2e : 0xe8b84e;
  const dress = gothel ? 0x761b32 : 0xb16ac5;
  const legs = [],
    arms = [];
  let gown, train, handProp, ring;
  const shadow = shape(
    root,
    geo.disk,
    new T.MeshBasicMaterial({
      color: 0x211a30,
      opacity: 0.24,
      transparent: true,
      depthWrite: false,
    }),
    0,
    0.012,
    0,
    0.39,
    0.32,
    1,
  );
  shadow.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const leg = group(rig, side * (male ? 0.135 : 0.11), 0.94, 0);
    ball(leg, male ? 0x725448 : complexion, 0, -0.2, 0, 0.114, 0.29, 0.115);
    const shin = group(leg, 0, -0.43, 0);
    ball(shin, male ? 0x67493f : complexion, 0, -0.15, 0, 0.089, 0.25, 0.09);
    ball(shin, male ? 0x392e34 : complexion, 0, -0.4, 0.061, 0.1, 0.075, 0.175);
    if (male) shape(shin, geo.pipe, 0x45343a, 0, -0.21, 0, 0.098, 0.34, 0.1);
    legs.push({ leg, shin });
  }
  if (male) {
    ball(body, man ? 0xf2e1c5 : 0x766a6b, 0, 0.25, 0, 0.27, 0.32, 0.164);
    const vest = lathe(body, man ? 0x31666c : 0x514c5b, [
      [0.24, 0],
      [0.28, 0.18],
      [0.27, 0.44],
      [0.23, 0.54],
    ]);
    vest.scale.z = 0.68;
    for (const side of [-1, 1]) {
      box(
        body,
        man ? 0x5b8a83 : 0x716470,
        side * 0.147,
        0.32,
        0.136,
        0.12,
        0.49,
        0.042,
      ).rotation.z = -side * 0.1;
      box(
        body,
        0xc5b17f,
        side * 0.17,
        0.5,
        0.105,
        0.02,
        0.11,
        0.038,
      ).rotation.z = side * 0.19;
      tube(
        body,
        0xa28665,
        [
          [side * 0.25, 0.45, 0.1],
          [side * 0.24, 0.33, 0.153],
          [side * 0.23, 0.13, 0.145],
        ],
        0.008,
      );
    }
    for (let i = 0; i < 3; i++) {
      rod(
        body,
        0x493b37,
        [-0.077, 0.19 + i * 0.11, 0.19],
        [0.087, 0.19 + i * 0.11, 0.19],
        0.014,
        geo.pipe,
      );
      box(body, 0xad8951, 0.035, 0.19 + i * 0.11, 0.21, 0.038, 0.035, 0.013);
    }
    box(body, 0x604538, 0, 0.035, 0.024, 0.49, 0.078, 0.32);
    box(body, gold, 0.01, 0.036, 0.189, 0.085, 0.075, 0.025);
  } else {
    gown = lathe(rig, dressMaterial(gothel), [
      [0.43, 0.06],
      [0.435, 0.11],
      [0.4, 0.37],
      [0.34, 0.66],
      [0.245, 0.94],
      [0.22, 1.16],
      [0.26, 1.35],
    ]);
    gown.scale.z = 0.77;
    const bodice = lathe(body, dressMaterial(gothel), [
      [0.233, -0.015],
      [0.21, 0.16],
      [0.235, 0.34],
      [0.256, 0.46],
    ]);
    bodice.scale.z = 0.64;
    if (!gothel) {
      const panel = shape(
        body,
        geo.ball,
        0xdc9bd0,
        0,
        0.237,
        0.148,
        0.115,
        0.2,
        0.021,
      );
      for (let i = 0; i < 6; i++) {
        const y = 0.085 + i * 0.056;
        rod(
          body,
          0xf2d6b5,
          [-0.073, y, 0.172],
          [0.075, y + 0.054, 0.172],
          0.007,
          geo.pipe,
        );
        rod(
          body,
          0xf2d6b5,
          [0.073, y, 0.173],
          [-0.075, y + 0.054, 0.173],
          0.007,
          geo.pipe,
        );
      }
      for (const side of [-1, 1])
        tube(
          body,
          0xeec5dd,
          [
            [side * 0.23, 0.43, 0.041],
            [side * 0.19, 0.39, 0.134],
            [side * 0.096, 0.4, 0.158],
            [0, 0.38, 0.173],
          ],
          0.013,
        );
      shape(
        rig,
        new T.TorusGeometry(0.417, 0.012, 6, 50),
        0xe6afd6,
        0,
        0.096,
        0,
        1,
        0.77,
        1,
      ).rotation.x = Math.PI / 2;
    } else {
      tube(
        body,
        gold,
        [
          [0.245, 0.46, 0.02],
          [0.21, 0.39, 0.145],
          [0.1, 0.38, 0.161],
          [-0.12, 0.38, 0.16],
          [-0.23, 0.42, 0.1],
        ],
        0.012,
      );
      const belt = shape(
        body,
        new T.TorusGeometry(0.229, 0.023, 7, 36),
        0x82523a,
        0,
        0.0,
        0,
        1,
        0.72,
        1,
      );
      belt.rotation.x = Math.PI / 2;
      shape(
        body,
        new T.TorusGeometry(0.06, 0.012, 8, 24),
        gold,
        0.11,
        -0.006,
        0.171,
        1,
        1.34,
        1,
      );
    }
  }
  const neck = ball(body, complexion, 0, 0.55, 0, 0.084, 0.126, 0.08);
  const head = group(body, 0, 0.777, 0.025);
  ball(
    head,
    complexion,
    0,
    0,
    0,
    gothel ? 0.258 : male ? 0.252 : 0.267,
    0.322,
    0.238,
  );
  ball(head, complexion, 0, -0.164, 0.043, 0.17, 0.156, 0.182);
  ball(head, complexion, 0, -0.248, 0.07, 0.1, 0.061, 0.097);
  for (const side of [-1, 1]) {
    ball(head, complexion, side * 0.258, -0.047, 0.015, 0.04, 0.074, 0.04);
    ball(head, 0xd28979, side * 0.274, -0.047, 0.028, 0.013, 0.046, 0.023);
    ball(
      head,
      gothel ? 0xd88b8b : 0xe89b8d,
      side * 0.157,
      -0.11,
      0.188,
      0.06,
      0.027,
      0.016,
    );
    eyes(
      head,
      side * (male ? 0.108 : 0.112),
      0.024,
      0.196,
      gothel ? 0x75917c : male ? 0x875f3c : 0x649d42,
      male ? 0.064 : 0.073,
      gothel || male,
    );
    tube(
      head,
      gothel ? 0x3e2d30 : hair,
      [
        [side * 0.049, 0.154, 0.179],
        [side * 0.105, 0.175, 0.187],
        [side * 0.173, 0.15, 0.151],
      ],
      gothel ? 0.012 : 0.015,
    );
  }
  ball(head, complexion, 0, -0.058, 0.232, 0.046, 0.065, 0.061);
  ball(head, 0xe09b82, 0, -0.094, 0.263, 0.038, 0.023, 0.027);
  ball(
    head,
    gothel ? 0x953c56 : 0xb56164,
    0,
    -0.165,
    0.223,
    0.062,
    0.012,
    0.018,
  );
  ball(
    head,
    gothel ? 0xbf6a71 : 0xe59083,
    0,
    -0.181,
    0.222,
    0.054,
    0.012,
    0.013,
  );
  if (man) {
    ball(head, 0x51342e, 0, -0.225, 0.196, 0.083, 0.045, 0.019);
    ball(head, complexion, 0, -0.219, 0.213, 0.052, 0.021, 0.008);
  }
  const hairCap = ball(head, hair, 0, 0.157, -0.045, 0.278, 0.235, 0.238);
  if (gothel) {
    const rng = random(493);
    for (let i = 0; i < 58; i++) {
      const a = i * 2.399,
        r = 0.23 + rng() * 0.077;
      const x = Math.sin(a) * r,
        y = 0.15 - rng() * 0.53,
        z = -0.05 + Math.cos(a) * r * 0.68;
      if (z > 0.1 && Math.abs(x) < 0.16 && y < 0.16) continue;
      const lock = [];
      for (let j = 0; j < 15; j++)
        lock.push([
          x + 0.037 * Math.sin(j * 1.6 + i),
          y - j * 0.022,
          z + 0.03 * Math.cos(j * 1.7 + i),
        ]);
      tube(head, i % 4 ? hair : 0x35303c, lock, 0.034);
    }
    for (const s of [-1, 1])
      tube(
        head,
        hair,
        [
          [s * 0.17, 0.22, 0.15],
          [s * 0.11, 0.25, 0.2],
          [s * 0.09, 0.15, 0.23],
          [s * 0.15, 0.12, 0.19],
        ],
        0.019,
      );
  } else if (male) {
    for (let i = 0; i < 12; i++) {
      const x = (i - 5.5) * 0.043;
      const points = [
        [x, 0.22, -0.14],
        [x + 0.025, 0.31, -0.055],
        [x - 0.05, 0.31, 0.061],
        [x - 0.1, 0.22, 0.177],
        [x - 0.09, 0.11, 0.16],
      ];
      tube(head, i % 3 ? hair : 0x84583b, points, 0.044);
    }
    for (const side of [-1, 1])
      tube(
        head,
        hair,
        [
          [side * 0.23, 0.13, -0.022],
          [side * 0.256, -0.02, -0.012],
          [side * 0.23, -0.133, -0.047],
        ],
        0.034,
      );
    if (bandit) {
      box(head, 0x332c40, 0, -0.11, 0.233, 0.41, 0.094, 0.047);
      const hat = shape(
        head,
        geo.pipe,
        0x49404e,
        0,
        0.223,
        -0.045,
        0.31,
        0.097,
        0.28,
      );
      hat.rotation.z = 0.14;
      shape(head, geo.post, 0x49404e, 0, 0.32, -0.06, 0.23, 0.18, 0.23);
    }
  } else {
    const mainHair = lathe(head, 0xe7b44c, [
      [0.18, -0.77],
      [0.25, -0.57],
      [0.3, -0.25],
      [0.273, 0.15],
      [0.14, 0.31],
    ]);
    mainHair.position.z = -0.144;
    mainHair.scale.z = 0.58;
    for (let i = 0; i < 20; i++) {
      const a = (i / 19 - 0.5) * Math.PI * 1.7;
      const x = Math.sin(a) * 0.27,
        z = -0.13 - Math.cos(a) * 0.11;
      tube(
        head,
        i % 3 === 0 ? 0xffd978 : i % 3 === 1 ? 0xc99436 : 0xefbd50,
        [
          [x * 0.72, 0.27, z * 0.49],
          [x, 0.1, z],
          [x * 1.05, -0.25, z - 0.02],
          [x * 0.99, -0.57, z + 0.02],
          [x * 0.77, -0.84, z + 0.04],
        ],
        0.025,
      );
    }
    for (let i = 0; i < 5; i++) {
      tube(
        head,
        i % 2 ? 0xf7d06a : 0xf4c355,
        [
          [0.22 - i * 0.043, 0.22, -0.02],
          [0.12 - i * 0.025, 0.32, 0.04],
          [-0.1 - i * 0.025, 0.27, 0.175],
          [-0.235, 0.14 - i * 0.025, 0.15],
          [-0.25, -0.18, 0.06],
        ],
        0.038,
      );
    }
    train = group(rig, 0, 0, -0.13);
    for (let i = 0; i < 13; i++) {
      const t = (i - 6) / 6;
      tube(
        train,
        i % 3 === 0 ? 0xffd976 : i % 3 === 1 ? 0xd6a044 : 0xebbb50,
        [
          [t * 0.18, 1.67, -0.15],
          [t * 0.27, 1.15, -0.16],
          [t * 0.25, 0.61, -0.24],
          [t * 0.24, 0.16, -0.37],
          [t * 0.23, 0.07, -0.74],
          [t * 0.23 + 0.15, 0.06, -1.22],
          [t * 0.14 + 0.24, 0.062, -1.69],
        ],
        0.043,
      );
    }
  }
  for (const side of [-1, 1]) {
    const shoulder = group(body, side * 0.275, 0.415, 0);
    const upper = male
      ? man
        ? 0xf1ddc5
        : 0x5e4f5b
      : gothel
        ? 0x781d33
        : 0xdb94d3;
    ball(shoulder, upper, 0, -0.069, 0, male ? 0.1 : 0.109, 0.137, 0.115);
    if (!male && !gothel)
      for (let k = 0; k < 4; k++)
        tube(
          shoulder,
          0xf2bddf,
          [
            [
              Math.cos((k * Math.PI) / 2) * 0.083,
              0.026,
              Math.sin((k * Math.PI) / 2) * 0.085,
            ],
            [
              Math.cos((k * Math.PI) / 2) * 0.1,
              -0.085,
              Math.sin((k * Math.PI) / 2) * 0.103,
            ],
            [
              Math.cos((k * Math.PI) / 2) * 0.064,
              -0.169,
              Math.sin((k * Math.PI) / 2) * 0.067,
            ],
          ],
          0.009,
        );
    ball(
      shoulder,
      gothel ? upper : complexion,
      0,
      -0.213,
      0,
      0.069,
      0.184,
      0.069,
    );
    const elbow = group(shoulder, 0, -0.34, 0);
    ball(elbow, complexion, 0, -0.12, 0.014, 0.056, 0.164, 0.06);
    const hand = group(elbow, 0, -0.27, 0.013);
    ball(hand, complexion, 0, -0.021, 0.009, 0.06, 0.087, 0.036);
    for (let k = 0; k < 4; k++)
      ball(
        hand,
        complexion,
        (k - 1.5) * 0.024,
        -0.078,
        0.016,
        0.013,
        0.043,
        0.013,
      );
    arms.push({ shoulder, elbow, hand });
  }
  if (!male && !gothel) {
    handProp = panModel(arms[0].hand);
    handProp.position.y = -0.02;
    const gun = gunModel(arms[0].hand);
    gun.visible = false;
    handProp.userData.gun = gun;
  }
  if (man) {
    ring = group(arms[1].hand, 0.01, -0.07, 0.04);
    ring.visible = false;
    shape(ring, new T.TorusGeometry(0.056, 0.012, 8, 30), gold, 0, 0, 0.02);
    const diamond = new T.MeshPhysicalMaterial({
      color: 0xfffcf0,
      metalness: 0.18,
      roughness: 0.09,
      clearcoat: 1,
      emissive: 0xffe4ad,
      emissiveIntensity: 0.25,
    });
    shape(ring, new T.OctahedronGeometry(0.049), diamond, 0, 0.067, 0.02);
    glow(ring, 0xffdda5, 0, 0.067, 0.06, 0.41, 0.39, 0.4);
  }
  const state = {
    root,
    head,
    body,
    arms,
    legs,
    gown,
    train,
    shadow,
    ring,
    handProp,
  };
  return {
    ...state,
    weapon(name) {
      if (handProp) {
        handProp.visible = name === "pan";
        handProp.userData.gun.visible = name === "gun";
      }
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
      } = {},
    ) {
      const t = time * 8.2;
      root.rotation.z = M.lerp(root.rotation.z, down * Math.PI * 0.49, 0.15);
      rig.position.y = seated
        ? -0.09
        : kneel
          ? -0.4
          : walk
            ? Math.abs(Math.sin(t)) * 0.033
            : Math.sin(time * 1.6) * 0.007;
      body.rotation.x = seated ? -0.09 : kneel ? 0.11 : 0;
      head.rotation.z = angry
        ? Math.sin(time * 3) * 0.06
        : Math.sin(time * 1.3) * 0.022;
      for (const [i, { leg, shin }] of legs.entries()) {
        const sign = i === 0 ? 1 : -1;
        leg.rotation.x = seated
          ? -1.3
          : kneel
            ? i === 0
              ? -1.28
              : 0.42
            : Math.sin(t) * 0.41 * walk * sign;
        shin.rotation.x = seated
          ? 1.26
          : kneel
            ? i === 0
              ? 1.17
              : 1.15
            : Math.max(0, -Math.sin(t) * sign) * 0.42 * walk;
      }
      arms.forEach(({ shoulder, elbow }, i) => {
        shoulder.rotation.x = seated
          ? -0.6
          : kneel
            ? -0.74
            : Math.sin(t + (i ? Math.PI : 0)) * 0.27 * walk;
        shoulder.rotation.z = (i === 0 ? 1 : -1) * 0.083;
        elbow.rotation.x = seated ? -0.69 : kneel ? -1.0 : -0.12;
      });
      if (attack > 0) {
        arms[0].shoulder.rotation.x = -0.7 - Math.sin(attack * Math.PI) * 1.85;
        arms[0].shoulder.rotation.z = -Math.sin(attack * Math.PI) * 0.56;
        arms[0].elbow.rotation.x = -0.4;
        body.rotation.y = Math.sin(attack * Math.PI) * 0.23;
      } else body.rotation.y = 0;
      if (angry) {
        arms[0].shoulder.rotation.x = -0.73;
        arms[1].shoulder.rotation.z = -0.47;
      }
      if (gown) {
        gown.scale.y = seated ? 0.62 : 1;
        gown.scale.z = seated ? 0.94 : 0.77;
      }
      if (train) {
        train.scale.y = seated ? 0.68 : 1;
        train.rotation.z = Math.sin(time * 2.2) * 0.023 * walk;
        train.rotation.x = seated ? -0.42 : 0;
      }
      if (ring) ring.visible = ringVisible;
      shadow.visible = !seated;
    },
  };
}

export function horse(parent) {
  const root = group(parent),
    rig = group(root);
  const ivory = 0xe8e8d8,
    mane = 0xd4cca6,
    leather = 0x574435;
  const shadow = shape(
    root,
    geo.disk,
    new T.MeshBasicMaterial({
      color: 0x172b2c,
      opacity: 0.22,
      transparent: true,
      depthWrite: false,
    }),
    0,
    0.018,
    0,
    0.58,
    1.18,
    1,
  );
  shadow.rotation.x = -Math.PI / 2;
  ball(rig, ivory, 0, 1.3, 0.13, 0.43, 0.48, 0.88);
  ball(rig, ivory, 0, 1.37, -0.5, 0.35, 0.44, 0.41);
  const neck = ball(rig, ivory, 0, 1.87, -0.72, 0.25, 0.67, 0.25);
  neck.rotation.x = 0.35;
  ball(rig, ivory, 0, 2.31, -0.98, 0.253, 0.35, 0.34);
  const nose = ball(rig, 0xc0bcae, 0, 2.15, -1.3, 0.24, 0.18, 0.23);
  nose.rotation.x = 0.12;
  for (const s of [-1, 1]) {
    ball(rig, 0x8d8582, s * 0.13, 2.14, -1.46, 0.054, 0.038, 0.025);
    ball(rig, 0xfaf6e4, s * 0.212, 2.39, -1.1, 0.068, 0.095, 0.046);
    ball(rig, 0x3b3b35, s * 0.243, 2.39, -1.128, 0.03, 0.053, 0.021);
    ball(rig, 0xffffff, s * 0.251, 2.414, -1.143, 0.01, 0.019, 0.009);
    const ear = ball(rig, ivory, s * 0.145, 2.7, -0.91, 0.079, 0.236, 0.072);
    ear.rotation.z = -s * 0.21;
    ear.rotation.x = -0.12;
    const inner = ball(
      rig,
      0xcfaea6,
      s * 0.146,
      2.72,
      -0.966,
      0.044,
      0.157,
      0.014,
    );
    inner.rotation.z = -s * 0.21;
    tube(
      rig,
      leather,
      [
        [s * 0.246, 2.47, -1.07],
        [s * 0.261, 2.27, -1.3],
        [s * 0.17, 2.04, -1.34],
        [0, 2.0, -1.29],
      ],
      0.023,
    );
    tube(
      rig,
      leather,
      [
        [s * 0.19, 2.02, -1.2],
        [s * 0.32, 1.99, -0.72],
        [s * 0.37, 1.8, -0.13],
      ],
      0.012,
    );
  }
  for (let i = 0; i < 14; i++) {
    const y = 1.66 + i * 0.079,
      z = -0.47 - i * 0.046;
    tube(
      rig,
      i % 3 ? mane : 0xeee2b9,
      [
        [0, y, z + 0.06],
        [0.07, y + 0.13, z + 0.12],
        [0.2, y - 0.01, z + 0.13],
        [0.23, y - 0.2, z + 0.14],
      ],
      0.035,
    );
  }
  for (let i = 0; i < 8; i++)
    tube(
      rig,
      i % 2 ? mane : 0xc4b38c,
      [
        [0, 1.48, 0.89],
        [(i - 3.5) * 0.027, 1.19, 1.09],
        [(i - 3.5) * 0.034, 0.6, 1.2],
        [(i - 3.5) * 0.03, 0.35, 1.03],
      ],
      0.038,
    );
  const pad = ball(rig, 0x876247, 0, 1.69, 0.06, 0.48, 0.13, 0.56);
  ball(rig, leather, 0, 1.8, 0.14, 0.32, 0.084, 0.44);
  for (const z of [-0.38, 0.6]) ball(rig, leather, 0, 1.81, z, 0.34, 0.16, 0.1);
  for (const s of [-1, 1]) {
    box(rig, leather, s * 0.43, 1.25, 0.15, 0.08, 0.8, 0.13);
    const stirrup = shape(
      rig,
      new T.TorusGeometry(0.097, 0.017, 7, 20),
      0xb5a267,
      s * 0.46,
      0.92,
      0.15,
      1,
      1.4,
      1,
    );
    stirrup.rotation.y = Math.PI / 2;
  }
  tube(
    rig,
    leather,
    [
      [-0.4, 1.6, -0.4],
      [-0.38, 1.15, -0.61],
      [0, 0.99, -0.75],
      [0.38, 1.15, -0.61],
      [0.4, 1.6, -0.4],
    ],
    0.049,
  );
  ball(rig, gold, 0, 1.05, -0.76, 0.08, 0.09, 0.025);
  const legs = [];
  for (const x of [-0.27, 0.27])
    for (const z of [-0.53, 0.65]) {
      const top = group(rig, x, 1.24, z);
      ball(top, ivory, 0, -0.24, 0, 0.123, 0.31, 0.13);
      const knee = group(top, 0, -0.48, 0);
      ball(knee, ivory, 0, -0.18, 0.01, 0.067, 0.25, 0.072);
      ball(knee, 0x786e65, 0, -0.44, -0.026, 0.089, 0.083, 0.132);
      legs.push({ top, knee });
    }
  const riders = group(rig, 0, 0, 0);
  return {
    root,
    riders,
    pose(t, speed = 0) {
      const phase = t * (speed > 0 ? 9.8 : 2);
      rig.position.y = speed
        ? Math.abs(Math.sin(phase)) * 0.068
        : Math.sin(phase) * 0.009;
      rig.rotation.x = Math.sin(phase) * 0.018 * speed;
      legs.forEach(({ top, knee }, i) => {
        const p = phase + (i === 0 || i === 3 ? 0 : Math.PI);
        top.rotation.x = Math.sin(p) * 0.57 * speed;
        knee.rotation.x = Math.max(0, -Math.sin(p)) * 0.7 * speed;
      });
    },
  };
}

export function divineCat(parent) {
  const root = group(parent),
    white = 0xfff2df,
    dark = 0x4a3a38;
  ball(root, white, 0, 0.49, 0, 0.3, 0.42, 0.25);
  ball(root, white, 0, 0.98, 0.01, 0.405, 0.31, 0.276);
  ball(root, dark, 0.22, 1.13, -0.07, 0.21, 0.2, 0.2);
  for (const s of [-1, 1]) {
    const ear = shape(
      root,
      new T.ConeGeometry(0.13, 0.36, 3),
      white,
      s * 0.26,
      1.31,
      0,
    );
    ear.rotation.z = -s * 0.18;
    ear.rotation.y = Math.PI / 6;
    const inner = shape(
      root,
      new T.ConeGeometry(0.074, 0.22, 3),
      0xdba9a2,
      s * 0.26,
      1.32,
      0.075,
    );
    inner.rotation.y = Math.PI / 6;
    inner.rotation.z = -s * 0.18;
    ball(root, 0x987357, s * 0.164, 1.006, 0.252, 0.101, 0.104, 0.037);
    ball(root, 0x211d21, s * 0.164, 1.01, 0.283, 0.079, 0.084, 0.026);
    ball(root, 0xfff7ed, s * 0.185, 1.044, 0.305, 0.025, 0.025, 0.007);
    ball(root, white, s * 0.12, 0.884, 0.24, 0.145, 0.079, 0.063);
    for (let j = 0; j < 3; j++)
      rod(
        root,
        0xb0a395,
        [s * 0.15, 0.86 + j * 0.03, 0.28],
        [s * 0.44, 0.84 + j * 0.053, 0.26],
        0.005,
        geo.pipe,
      );
    ball(root, white, s * 0.137, 0.2, 0.14, 0.106, 0.15, 0.13);
  }
  ball(root, 0xd98794, 0, 0.91, 0.308, 0.071, 0.047, 0.033);
  tube(
    root,
    0x8c5662,
    [
      [-0.17, 0.832, 0.284],
      [-0.09, 0.807, 0.305],
      [0, 0.817, 0.32],
      [0.09, 0.807, 0.306],
      [0.17, 0.832, 0.284],
    ],
    0.011,
  );
  tube(
    root,
    dark,
    [
      [0, 0.47, -0.22],
      [0.27, 0.36, -0.28],
      [0.46, 0.47, -0.23],
      [0.49, 0.76, -0.15],
    ],
    0.05,
  );
  const halo = shape(
    root,
    new T.TorusGeometry(0.34, 0.022, 8, 45),
    mat(0xffda89, 1.4),
    0,
    1.63,
    0,
  );
  halo.rotation.x = Math.PI / 2;
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const wing = ball(
        root,
        0xffe7c4,
        s * (0.31 + i * 0.092),
        0.69 + i * 0.063,
        -0.04,
        0.22 - i * 0.017,
        0.085,
        0.058,
      );
      wing.rotation.z = s * (0.55 + i * 0.13);
    }
  return {
    root,
    pose(t) {
      root.position.y = 1.24 + Math.sin(t * 1.7) * 0.18;
      halo.rotation.z = Math.sin(t) * 0.05;
    },
  };
}
