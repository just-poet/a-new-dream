import * as T from "three";
import { M, geo, mat, group, shape, box, ball, rod, glow } from "./art.js";
import { avatarClone } from "./assets.js";

const gold = new T.MeshStandardMaterial({
  color: 0xd8ae63,
  metalness: 0.68,
  roughness: 0.27,
});
const ivory = 0xf7dfb2;
const clothCache = new Map();
function cloth(name, color) {
  if (clothCache.has(name)) return clothCache.get(name);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  let n = 15831;
  for (let i = 0; i < 46000; i++) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const x = n % 512,
      y = (n >>> 11) % 512;
    ctx.fillStyle = i % 2 ? "#ffffff0c" : "#10071316";
    ctx.fillRect(x, y, 1, i % 5 ? 1 : 5);
  }
  if (name !== "vest" && name !== "pants") {
    ctx.strokeStyle = "#e3bf9639";
    ctx.lineWidth = 0.75;
    for (let x = 32; x < 512; x += 96)
      for (let y = 20; y < 512; y += 92) {
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.bezierCurveTo(x + 22, y - 5, x + 20, y + 17, x, y + 22);
        ctx.bezierCurveTo(x - 20, y + 9, x - 19, y - 4, x, y - 18);
        ctx.stroke();
      }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 8;
  const material = new T.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: name === "vest" ? 0.71 : 0.81,
  });
  clothCache.set(name, material);
  return material;
}
function tube(parent, color, points, r = 0.01) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  return shape(
    parent,
    new T.TubeGeometry(curve, points.length * 5, r, 7, false),
    color,
    0,
    0,
    0,
  );
}
function lathe(parent, color, profile) {
  const mesh = shape(
    parent,
    new T.LatheGeometry(
      profile.map((p) => new T.Vector2(...p)),
      56,
    ),
    color,
    0,
    0,
    0,
  );
  return mesh;
}
function filterClothing(mesh) {
  const source = mesh.geometry.index
    ? mesh.geometry.toNonIndexed()
    : mesh.geometry;
  const position = source.attributes.position,
    kept = [],
    groups = [];
  const p = new T.Vector3();
  for (const original of source.groups) {
    const start = kept.length;
    for (let i = original.start; i < original.start + original.count; i += 3) {
      let retain = original.materialIndex > 0;
      if (!retain) {
        for (let j = 0; j < 3; j++) {
          p.fromBufferAttribute(position, i + j).applyMatrix4(mesh.matrixWorld);
          if (
            (Math.abs(p.x) > 0.225 && p.y > 0.81) ||
            p.y > 1.435 ||
            p.y < 0.125
          )
            retain = true;
        }
      }
      if (retain) kept.push(i, i + 1, i + 2);
    }
    if (kept.length > start)
      groups.push({
        start,
        count: kept.length - start,
        materialIndex: original.materialIndex,
      });
  }
  const geometry = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const data = new attribute.array.constructor(
      kept.length * attribute.itemSize,
    );
    kept.forEach((index, i) => {
      for (let c = 0; c < attribute.itemSize; c++)
        data[i * attribute.itemSize + c] =
          attribute.array[index * attribute.itemSize + c];
    });
    geometry.setAttribute(
      name,
      new T.BufferAttribute(data, attribute.itemSize, attribute.normalized),
    );
  }
  geometry.groups = groups;
  geometry.computeBoundingSphere();
  mesh.geometry = geometry;
}
function hairMaterial() {
  if (clothCache.has("hair")) return clothCache.get("hair");
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#bb8734";
  ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 650; i++) {
    const x = i * 0.79;
    ctx.strokeStyle = ["#f2ce85", "#d9a74a", "#f7d58c", "#9c6a2c", "#eabd65"][
      i % 5
    ];
    ctx.lineWidth = 0.35 + (i % 7) * 0.16;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 5, 300, x - 4, 700, x, 1024);
    ctx.stroke();
  }
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  const material = new T.MeshPhysicalMaterial({
    map,
    roughness: 0.37,
    clearcoat: 0.38,
    clearcoatRoughness: 0.44,
    side: T.DoubleSide,
  });
  clothCache.set("hair", material);
  return material;
}
function goldenHair(parent) {
  const holder = group(parent),
    material = hairMaterial();
  for (let strand = 0; strand < 31; strand++) {
    const offset = (strand - 15) * 0.01;
    const curl = Math.sin(strand * 0.67) * 0.013;
    const path = new T.CatmullRomCurve3([
      new T.Vector3(offset * 0.7, 1.68, -0.065),
      new T.Vector3(offset, 1.49, -0.136 - curl),
      new T.Vector3(offset * 1.07, 1.03, -0.15 - curl),
      new T.Vector3(offset * 1.1, 0.5, -0.19 - curl),
      new T.Vector3(offset, 0.12, -0.37),
      new T.Vector3(offset + 0.1, 0.036, -0.7),
      new T.Vector3(
        offset * 0.56 + 0.19,
        0.028,
        -1.19 + Math.cos(strand) * 0.035,
      ),
    ]);
    const geometry = new T.TubeGeometry(
      path,
      48,
      0.011 + (strand % 3) * 0.0016,
      7,
      false,
    );
    const hair = new T.Mesh(geometry, material);
    hair.castShadow = true;
    holder.add(hair);
  }
  return holder;
}
function makePan(parent) {
  const root = group(parent),
    metal = new T.MeshStandardMaterial({
      color: 0x30323a,
      roughness: 0.38,
      metalness: 0.68,
    });
  shape(root, new T.TorusGeometry(0.19, 0.018, 9, 40), metal, 0, -0.31, 0.01);
  const disk = shape(
    root,
    geo.pipe,
    metal,
    0,
    -0.31,
    0.01,
    0.184,
    0.038,
    0.184,
  );
  disk.rotation.x = Math.PI / 2;
  box(root, metal, 0, -0.04, 0.01, 0.034, 0.23, 0.027);
  const handle = shape(
    root,
    new T.TorusGeometry(0.02, 0.006, 6, 18),
    metal,
    0,
    0.077,
    0.01,
  );
  return root;
}
function makeGun(parent) {
  const root = group(parent),
    steel = new T.MeshStandardMaterial({
      color: 0x384248,
      metalness: 0.7,
      roughness: 0.32,
    });
  box(root, 0x63493d, 0, -0.035, 0.022, 0.049, 0.116, 0.076);
  box(root, steel, 0, 0.028, 0.16, 0.062, 0.065, 0.27);
  shape(
    root,
    new T.TorusGeometry(0.028, 0.007, 7, 20),
    steel,
    0,
    -0.013,
    0.09,
  ).rotation.y = Math.PI / 2;
  return root;
}
function anchorTo(root, bone) {
  root.updateMatrixWorld(true);
  const point = root.worldToLocal(bone.getWorldPosition(new T.Vector3()));
  const anchor = group(root, point.x, point.y, point.z);
  root.updateMatrixWorld(true);
  bone.attach(anchor);
  return anchor;
}
function contactShadow(parent, w, d) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d");
  const gradient = c.createRadialGradient(64, 64, 7, 64, 64, 64);
  gradient.addColorStop(0, "#140c09a0");
  gradient.addColorStop(0.42, "#140c0950");
  gradient.addColorStop(1, "#140c0900");
  c.fillStyle = gradient;
  c.fillRect(0, 0, 128, 128);
  const mesh = new T.Mesh(
    new T.PlaneGeometry(w, d),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  parent.add(mesh);
  return mesh;
}
const xAxis = new T.Vector3(1, 0, 0),
  zAxis = new T.Vector3(0, 0, 1);
export function realHuman(parent, kind = "rapunzel") {
  const gothel = kind === "gothel",
    male = kind === "eugene" || kind === "bandit";
  const root = group(parent),
    rig = group(root),
    model = avatarClone(male ? "eugene" : gothel ? "gothel" : "princess");
  const shadow = contactShadow(root, 0.95, 0.7);
  rig.add(model);
  model.scale.setScalar(0.01);
  model.updateMatrixWorld(true);
  const bones = new Map();
  model.traverse((obj) => {
    if (obj.isBone) bones.set(obj.name, obj);
  });
  const joints = {};
  for (const side of ["L", "R"]) {
    joints[side] = {
      arm: bones.get("Bip01_" + side + "_UpperArm"),
      forearm: bones.get("Bip01_" + side + "_Forearm"),
      hand: bones.get("Bip01_" + side + "_Hand"),
      thigh: bones.get("Bip01_" + side + "_Thigh"),
      calf: bones.get("Bip01_" + side + "_Calf"),
    };
  }
  model.traverse((mesh) => {
    if (mesh.isMesh) filterClothing(mesh);
  });
  const gownMaterial = cloth(
    gothel ? "burgundy" : "lavender",
    gothel ? "#66182a" : "#aa6aaa",
  );
  let gown, hair, pan, gun, ring;
  if (!male) {
    const profile = [];
    for (let i = 0; i <= 30; i++) {
      const h = 0.05 + (i * 0.895) / 30,
        t = i / 30;
      profile.push([0.165 + 0.205 * (1 - t) ** 1.35, h]);
    }
    gown = lathe(rig, gownMaterial, profile);
    gown.scale.z = 0.77;
    const position = gown.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i),
        z = position.getZ(i),
        h = position.getY(i),
        a = Math.atan2(z, x),
        fold =
          1 + 0.026 * Math.sin(a * 18 + h * 1.7) + 0.009 * Math.sin(a * 39);
      position.setXYZ(i, x * fold, h, z * fold);
    }
    gown.geometry.computeVertexNormals();
    const bodice = lathe(rig, gownMaterial, [
      [0.168, 0.89],
      [0.152, 1.03],
      [0.185, 1.19],
      [0.185, 1.32],
      [0.141, 1.39],
    ]);
    bodice.scale.z = 0.65;
    tube(
      rig,
      gold,
      [
        [0.14, 1.38, 0.024],
        [0.105, 1.335, 0.105],
        [0, 1.317, 0.125],
        [-0.105, 1.335, 0.105],
        [-0.14, 1.38, 0.024],
      ],
      0.0045,
    );
    if (!gothel) {
      for (let i = 0; i < 7; i++) {
        const y = 0.99 + i * 0.047;
        rod(
          rig,
          0xf3d9ba,
          [-0.055, y, 0.117],
          [0.055, y + 0.045, 0.117],
          0.004,
          geo.pipe,
        );
        rod(
          rig,
          0xf3d9ba,
          [0.055, y, 0.118],
          [-0.055, y + 0.045, 0.118],
          0.004,
          geo.pipe,
        );
      }
      hair = goldenHair(rig);
    } else {
      const head = bones.get("Bip01_Head"),
        locks = anchorTo(rig, head);
      for (let i = 0; i < 34; i++) {
        const a = i * 2.399,
          xx = Math.sin(a) * 0.1,
          zz = -0.014 + Math.cos(a) * 0.075;
        if (zz > 0.035 && Math.abs(xx) < 0.071) continue;
        const points = [];
        for (let j = 0; j < 19; j++)
          points.push([
            xx + 0.016 * Math.sin(j * 1.4 + i),
            0.14 - j * 0.019,
            zz + 0.017 * Math.cos(j * 1.52 + i),
          ]);
        tube(locks, 0x211c22, points, 0.017);
      }
    }
  } else {
    const vest = lathe(
      rig,
      cloth("vest", kind === "bandit" ? "#454044" : "#214e52"),
      [
        [0.182, 0.91],
        [0.203, 1.04],
        [0.237, 1.25],
        [0.24, 1.39],
        [0.18, 1.45],
      ],
    );
    vest.scale.z = 0.63;
    for (const side of [-1, 1]) {
      const p = shape(
        rig,
        geo.box,
        cloth("shirt", "#ded8c7"),
        side * 0.137,
        1.423,
        0.082,
        0.105,
        0.17,
        0.05,
      );
      p.rotation.z = side * 0.31;
      for (let i = 0; i < 4; i++)
        box(
          rig,
          gold,
          side * 0.062,
          1.035 + i * 0.089,
          0.158,
          0.021,
          0.027,
          0.011,
        );
    }
    box(rig, 0x41352b, 0, 0.943, 0.015, 0.377, 0.067, 0.255);
    box(rig, gold, 0.012, 0.944, 0.152, 0.061, 0.052, 0.016);
    for (const side of ["L", "R"]) {
      const thighAnchor = anchorTo(rig, joints[side].thigh);
      const leg = lathe(thighAnchor, cloth("pants", "#51453a"), [
        [0.094, -0.408],
        [0.097, -0.26],
        [0.115, -0.025],
      ]);
      leg.position.z = -0.01;
      leg.castShadow = true;
      const calfAnchor = anchorTo(rig, joints[side].calf);
      const boot = lathe(calfAnchor, mat(0x3b302d), [
        [0.079, -0.4],
        [0.077, -0.18],
        [0.09, -0.012],
      ]);
      boot.castShadow = true;
    }
    if (kind === "bandit") {
      const headAnchor = anchorTo(rig, bones.get("Bip01_Head"));
      const mask = ball(
        headAnchor,
        0x3b3034,
        0,
        0.038,
        0.083,
        0.086,
        0.035,
        0.022,
      );
    }
  }
  for (const side of ["L", "R"]) {
    const a = anchorTo(rig, joints[side].arm);
    const sleeve = ball(
      a,
      male ? cloth("shirt", "#ded8c7") : gownMaterial,
      side === "L" ? 0.021 : -0.021,
      -0.025,
      -0.008,
      male ? 0.088 : 0.091,
      male ? 0.11 : 0.095,
      0.081,
    );
    sleeve.castShadow = true;
  }
  const hand = anchorTo(rig, joints.R.hand);
  if (!male && !gothel) {
    pan = makePan(hand);
    pan.visible = false;
    gun = makeGun(hand);
    gun.visible = false;
  }
  if (kind === "eugene") {
    const holder = anchorTo(rig, joints.L.hand);
    ring = group(holder, 0, -0.04, 0.017);
    ring.visible = false;
    const casket = group(ring, 0, 0, 0);
    box(casket, 0x49313d, 0, -0.027, 0, 0.095, 0.045, 0.085);
    box(casket, 0x29202d, 0, -0.001, 0, 0.086, 0.018, 0.077);
    shape(
      ring,
      new T.TorusGeometry(0.025, 0.005, 8, 32),
      gold,
      0,
      0.015,
      0.003,
    );
    shape(
      ring,
      new T.OctahedronGeometry(0.018),
      new T.MeshPhysicalMaterial({
        color: 0xf7fbff,
        roughness: 0.02,
        metalness: 0.21,
        clearcoat: 1,
        emissive: 0xd8e6ff,
        emissiveIntensity: 0.45,
      }),
      0,
      0.042,
      0.003,
    );
    glow(ring, 0xffe3aa, 0, 0.04, 0.03, 0.18, 0.16, 0.33);
  }
  const rest = new Map(
    [...bones].map(([name, bone]) => [name, bone.quaternion.clone()]),
  );
  const restPelvis = bones.get("Bip01_Pelvis").position.clone();
  const quaternion = new T.Quaternion(),
    worldParent = new T.Quaternion(),
    actorWorld = new T.Quaternion(),
    axis = new T.Vector3();
  function turn(bone, worldAxis, angle) {
    if (!bone || !angle) return;
    bone.parent.getWorldQuaternion(worldParent);
    worldParent.invert();
    axis
      .copy(worldAxis)
      .applyQuaternion(root.getWorldQuaternion(actorWorld))
      .applyQuaternion(worldParent);
    quaternion.setFromAxisAngle(axis, angle);
    bone.quaternion.premultiply(quaternion);
    bone.updateWorldMatrix(true, false);
  }
  return {
    root,
    weapon(name) {
      if (pan) pan.visible = name === "pan";
      if (gun) gun.visible = name === "gun";
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
      shadow.visible = !seated && down < 0.2;
      for (const [name, bone] of bones) bone.quaternion.copy(rest.get(name));
      model.updateMatrixWorld(true);
      const t = time * 7.6,
        pelvis = bones.get("Bip01_Pelvis");
      pelvis.position.copy(restPelvis);
      rig.position.y = kneel
        ? -0.38
        : seated
          ? -0.045
          : Math.abs(Math.sin(t)) * 0.016 * walk;
      root.rotation.z = M.damp(
        root.rotation.z,
        down * Math.PI * 0.49,
        11,
        0.016,
      );
      turn(bones.get("Bip01_Head"), zAxis, Math.sin(time * 1.15) * 0.022);
      const left = joints.L,
        right = joints.R;
      turn(left.arm, zAxis, -0.69);
      turn(right.arm, zAxis, 0.69);
      for (const [i, joint] of [left, right].entries()) {
        const direction = i === 0 ? 1 : -1;
        turn(
          joint.thigh,
          xAxis,
          seated
            ? -1.24
            : kneel
              ? i === 0
                ? -1.17
                : 0.31
              : Math.sin(t) * 0.4 * walk * direction,
        );
        turn(
          joint.calf,
          xAxis,
          seated
            ? 1.43
            : kneel
              ? i === 0
                ? 1.18
                : 1.25
              : Math.max(0, -Math.sin(t) * direction) * 0.44 * walk,
        );
        turn(
          joint.arm,
          xAxis,
          seated
            ? -0.57
            : kneel
              ? -0.66
              : Math.sin(t) * 0.24 * walk * -direction,
        );
        turn(joint.forearm, xAxis, seated ? -0.61 : kneel ? -0.72 : -0.1);
      }
      if (attack > 0) {
        turn(right.arm, xAxis, -0.3 - Math.sin(attack * Math.PI) * 1.52);
        turn(right.forearm, xAxis, -0.42);
      }
      if (angry) turn(left.arm, xAxis, -0.61);
      if (gown) {
        gown.scale.y = seated ? 0.64 : 1;
        gown.rotation.x = seated ? -0.27 : 0;
      }
      if (hair) {
        hair.scale.set(1, seated ? 0.73 : 1, seated ? 0.7 : 1);
        hair.rotation.z = Math.sin(time * 2) * 0.013 * walk;
      }
      if (ring) ring.visible = ringVisible;
    },
  };
}

export function realHorse(parent) {
  const root = group(parent),
    rig = group(root),
    model = avatarClone("horse");
  contactShadow(root, 1.7, 2.4);
  rig.add(model);
  model.scale.setScalar(0.0105);
  model.rotation.y = Math.PI;
  model.updateMatrixWorld(true);
  const bones = new Map();
  model.traverse((o) => {
    if (o.isBone) bones.set(o.name, o);
  });
  const rest = new Map(
    [...bones].map(([name, bone]) => [name, bone.quaternion.clone()]),
  );
  const riders = group(rig, 0, 0, -0.12);
  const q = new T.Quaternion(),
    parentWorld = new T.Quaternion(),
    axis = new T.Vector3();
  function turn(bone, angle) {
    if (!bone) return;
    bone.parent.getWorldQuaternion(parentWorld).invert();
    axis.set(1, 0, 0).applyQuaternion(parentWorld);
    q.setFromAxisAngle(axis, angle);
    bone.quaternion.premultiply(q);
  }
  return {
    root,
    riders,
    riderHeight: 0.66,
    pose(time, speed = 0) {
      for (const [name, bone] of bones) bone.quaternion.copy(rest.get(name));
      model.updateMatrixWorld(true);
      rig.position.y = Math.abs(Math.sin(time * 8.3)) * 0.035 * speed;
      for (const [i, name] of [
        "horse_L_UpperArm",
        "horse_R_UpperArm",
        "horse_L_Thigh",
        "horse_R_Thigh",
      ].entries())
        turn(
          bones.get(name),
          Math.sin(time * 8.3 + (i % 3 === 0 ? 0 : Math.PI)) * 0.4 * speed,
        );
      turn(bones.get("horse_Head"), Math.sin(time * 1.4) * 0.018);
    },
  };
}
