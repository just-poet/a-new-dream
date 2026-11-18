import * as T from "three";
import {
  M,
  geo,
  mat,
  random,
  group,
  shape,
  box,
  ball,
  rod,
  batch,
  glow,
  particles,
} from "./art.js";
import { castle } from "./castle.js";

const bark = 0x604737,
  leaves = [0x395f48, 0x527a51, 0x5e8656, 0x76985a, 0x88a46b];
const golden = mat(0xffce82, 1.4);

export function atmosphere(night = false) {
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(night ? 0x292b3c : 0xbdcfbe, night ? 0.018 : 0.007);
  scene.add(
    new T.HemisphereLight(
      night ? 0xa7b8e8 : 0xe2f4ff,
      night ? 0x4c3a48 : 0x697051,
      night ? 0.75 : 2.2,
    ),
  );
  const sun = new T.DirectionalLight(
    night ? 0xced5ff : 0xffdeb2,
    night ? 1.1 : 2.5,
  );
  sun.position.set(-22, 32, -18);
  scene.add(sun);
  const fill = new T.DirectionalLight(
    night ? 0xd78c60 : 0xbfdcff,
    night ? 0.38 : 0.6,
  );
  fill.position.set(8, 8, 15);
  scene.add(fill);
  const sky = shape(
    scene,
    new T.SphereGeometry(370, 30, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new T.Color(night ? 0x10172b : 0x387fb4) },
        bottom: { value: new T.Color(night ? 0x7a655e : 0xd0e5e9) },
      },
      vertexShader:
        "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 v;uniform vec3 top,bottom;float n(vec2 p){return fract(sin(dot(p,vec2(12.989,78.233)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(n(i),n(i+vec2(1.,0.)),f.x),mix(n(i+vec2(0.,1.)),n(i+1.),f.x),f.y);}void main(){vec3 d=normalize(v);float h=max(0.,d.y);vec3 c=mix(bottom,top,pow(h,.5));vec2 u=d.xz/(.23+h);float clouds=noise(u*2.8)+.5*noise(u*7.2)+.2*noise(u*18.);c=mix(c,vec3(.99,.92,.80),smoothstep(.88,1.29,clouds)*smoothstep(.02,.15,h)*.7);float sun=pow(max(0.,dot(d,normalize(vec3(-.45,.3,-1.)))),160.);c+=sun*vec3(.95,.66,.32);gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\\n#include <colorspace_fragment>}"
          .replace(
            "#include <tonemapping_fragment>",
            "\n#include <tonemapping_fragment>",
          )
          .replaceAll("\\n", "\n"),
    }),
    0,
    0,
    0,
  );
  sky.renderOrder = -100;
  return { scene, sky, updates: [] };
}

export function water(parent, x, y, z, w, h, river = false) {
  const material = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, river: { value: river ? 1 : 0 } },
    vertexShader:
      "varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec3 p;uniform float time,river;void main(){float swell=sin(p.x*.1+p.z*.06)*2.;float w=sin(p.x*1.4+p.z*.7+swell-time*.8)+.6*sin(p.z*3.6-p.x*1.3+sin(p.z*.2)*2.-time*1.17);float fine=sin(p.x*15.+p.z*6.+time)*sin(p.z*11.-time);float distanceFade=1.-smoothstep(15.,180.,distance(cameraPosition.xz,p.xz));vec3 c=mix(vec3(.075,.30,.39),vec3(.23,.56,.59),smoothstep(-1.1,1.5,w)*(.35+.65*distanceFade));c+=vec3(.18,.15,.07)*pow(max(0.,fine),11.)*distanceFade;c+=smoothstep(1.38,1.59,w)*vec3(.10,.13,.12)*distanceFade;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
  });
  const mesh = shape(parent, new T.PlaneGeometry(w, h), material, x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  return (time) => {
    material.uniforms.time.value = time;
  };
}

function flowers(parent, rng, count, range, start = 0) {
  const stems = [],
    petals = [],
    cores = [];
  const colors = [0xf6b1ce, 0xfbd6a6, 0xb5a2eb, 0xe4a2bc, 0xece9b8];
  for (let i = 0; i < count; i++) {
    const x = (i % 2 ? 1 : -1) * (3.2 + rng() * range[0]),
      z = start - rng() * range[1],
      h = 0.16 + rng() * 0.43;
    stems.push([x, h / 2, z, 0.018, h, 0.018, 0x568251]);
    for (let j = 0; j < 5; j++) {
      const a = j * 1.256;
      petals.push([
        x + Math.cos(a) * 0.054,
        h,
        z + Math.sin(a) * 0.054,
        0.06,
        0.026,
        0.039,
        colors[i % 5],
        0,
        -a,
        0,
      ]);
    }
    cores.push([x, h + 0.008, z, 0.025, 0.026, 0.025, 0xffcc61]);
  }
  batch(parent, geo.post, stems);
  batch(parent, geo.leaf, petals);
  batch(parent, geo.gem, cores);
}

export function scenery(world, length = 160, open = false) {
  const { scene } = world,
    rng = random(open ? 482 : 594);
  const ground = shape(
    scene,
    new T.PlaneGeometry(150, length + 150, 50, 70),
    0x6f8955,
    0,
    -0.061,
    -length / 2,
    1,
    1,
    1,
  );
  ground.rotation.x = -Math.PI / 2;
  const p = ground.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getY(i) - length / 2,
      edge = M.smoothstep(Math.abs(x), 5, 18);
    let y =
      edge *
      (0.3 + Math.sin(x * 0.2 + z * 0.12) * 1.7 + Math.cos(z * 0.09) * 1.4);
    if (open) {
      y = M.lerp(y, -2.1, M.smoothstep(x, 7.8, 14));
      const river = 1 - M.smoothstep(Math.abs(x + 18), 4.5, 6.4);
      y = M.lerp(y, -0.95, river);
    }
    p.setZ(i, y);
  }
  ground.geometry.computeVertexNormals();
  const pathPositions = [],
    pathIndices = [],
    pathColors = [];
  for (let i = 0; i <= length + 54; i++) {
    const z = 25 - i,
      offset = Math.sin(z * 0.07) * 0.16;
    for (const s of [-1, 1]) {
      pathPositions.push(offset + s * 3.23, -0.028, z);
      const c = new T.Color(i % 3 ? 0xbc9e70 : 0xb5996c);
      pathColors.push(c.r, c.g, c.b);
    }
    if (i < length + 54) {
      const j = i * 2;
      pathIndices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const path = new T.BufferGeometry();
  path.setAttribute("position", new T.Float32BufferAttribute(pathPositions, 3));
  path.setAttribute("color", new T.Float32BufferAttribute(pathColors, 3));
  path.setIndex(pathIndices);
  path.computeVertexNormals();
  scene.add(
    new T.Mesh(
      path,
      new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    ),
  );
  const trunks = [],
    crowns = [],
    bushes = [],
    stones = [];
  for (let z = 23; z > -length - 38; z -= 4.1) {
    for (const side of [-1, 1]) {
      if (open && side === 1) continue;
      if (open && z > -7) continue;
      const count = open ? 2 : 3;
      for (let row = 0; row < count; row++) {
        const x = side * (5.6 + row * 9 + rng() * 6.9),
          h = 5.0 + rng() * 6.5,
          dz = z + rng() * 6;
        trunks.push([
          x,
          h * 0.47,
          dz,
          0.17 + rng() * 0.13,
          h * 0.93,
          0.2 + rng() * 0.09,
          bark,
          0,
          rng() * 6.28,
          (rng() - 0.5) * 0.11,
        ]);
        for (let j = 0; j < 5; j++) {
          const a = j * 2.4,
            r = 0.8 + rng() * 1.8,
            size = 2.0 + rng() * 2.4;
          crowns.push([
            x + Math.sin(a) * r,
            h * (0.7 + rng() * 0.27),
            dz + Math.cos(a) * r,
            size,
            size * 0.69,
            size * 0.85,
            leaves[Math.floor(rng() * 5)],
            0,
            a,
            0.2,
          ]);
        }
      }
      for (let j = 0; j < 2; j++) {
        const x = side * (4 + rng() * 5);
        bushes.push([
          x,
          0.22,
          z,
          0.4 + rng() * 1.8,
          0.22 + rng() * 0.6,
          0.6 + rng() * 1.0,
          leaves[Math.floor(rng() * 5)],
          0,
          rng() * 6.3,
          0,
        ]);
      }
      stones.push([
        side * (3.9 + rng() * 3),
        0.13,
        z + rng() * 4,
        0.2 + rng() * 0.35,
        0.15 + rng() * 0.27,
        0.28 + rng() * 0.29,
        0xa5a295,
        0,
        rng() * 6.3,
        0.2,
      ]);
    }
  }
  batch(scene, geo.post, trunks);
  batch(scene, geo.leaf, crowns);
  batch(scene, geo.leaf, bushes);
  batch(scene, geo.gem, stones);
  flowers(scene, rng, open ? 750 : 1350, [open ? 12 : 4, length + 42], 20);
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    if (open && side > 0) continue;
    const x = side * (36 + rng() * 42),
      z = -65 - rng() * (length + 65);
    shape(
      scene,
      geo.leaf,
      [0x829b8e, 0x7a98a0, 0x9ba9a0][i % 3],
      x,
      3,
      z,
      12 + rng() * 14,
      10 + rng() * 20,
      14 + rng() * 11,
    ).rotation.y = rng() * 6.28;
  }
  const dust = particles(
    scene,
    153,
    open ? 230 : 650,
    [30, 7, length + 50, 24],
    [0xffe8ac, 0xf5c4e6, 0xe7f5bc],
  );
  world.updates.push((t) => {
    dust.material.uniforms.time.value = t;
  });
}

export function oldHouse() {
  const world = atmosphere(true),
    { scene } = world;
  scene.fog.density = 0.019;
  const timber = 0x453638,
    plaster = 0x666058;
  const boards = [];
  for (let z = 0; z < 24; z++)
    for (let x = 0; x < 9; x++)
      boards.push([
        (x - 4) * 0.72,
        0,
        (z - 11.5) * 0.3,
        0.7,
        0.13,
        0.284,
        [0x5b4a43, 0x625048, 0x55433f, 0x6d5849][(z + x * 3) % 4],
      ]);
  batch(scene, geo.box, boards);
  box(scene, 0x3e3437, 0, 3.99, -0.1, 7.6, 0.15, 7.3);
  box(scene, plaster, 0, 1.9, -3.61, 7.6, 3.9, 0.27);
  for (const s of [-1, 1]) {
    box(scene, plaster, s * 3.64, 1.9, -0.1, 0.23, 3.9, 7.1);
    box(scene, timber, s * 3.51, 0.32, -0.1, 0.14, 0.53, 7.1);
    for (const z of [-3.5, -1.25, 1.1, 3.3])
      box(scene, timber, s * 3.49, 1.98, z, 0.22, 4.03, 0.24);
  }
  for (const x of [-3.51, -1.76, 0, 1.76, 3.51])
    box(scene, timber, x, 2.04, -3.44, 0.2, 4.1, 0.24);
  box(scene, timber, 0, 3.43, -3.43, 7.3, 0.24, 0.3);
  for (const z of [-3.4, -1.28, 0.88, 3.12]) {
    box(scene, timber, 0, 3.82, z, 7.4, 0.24, 0.23);
    rod(scene, 0x5d4b41, [-3.5, 2.75, z], [-2.55, 3.8, z], 0.102);
    rod(scene, 0x5d4b41, [3.5, 2.75, z], [2.55, 3.8, z], 0.102);
  }
  const stone = 0x65616a;
  box(scene, stone, -2.31, 0.98, -3.09, 1.63, 1.84, 0.65);
  box(scene, 0x27242c, -2.31, 0.65, -2.74, 1.0, 1.05, 0.075);
  for (let i = 0; i < 12; i++) {
    const x = -2.94 + (i % 4) * 0.42,
      y = 0.2 + Math.floor(i / 4) * 0.52;
    box(scene, i % 2 ? 0x767079 : 0x69636c, x, y, -2.715, 0.39, 0.46, 0.12);
  }
  box(scene, 0x403336, -2.31, 1.91, -3.02, 1.86, 0.17, 0.89);
  box(scene, stone, -2.31, 2.79, -3.25, 1.02, 1.65, 0.29);
  for (const x of [-2.56, -2.24, -1.98])
    rod(
      scene,
      0x2b252e,
      [x, 0.29, -2.75],
      [x + 0.1, 0.57, -2.73],
      0.065,
      geo.pipe,
    );
  for (const x of [-2.48, -2.22])
    ball(scene, mat(0xdb5b30, 0.47), x, 0.33, -2.67, 0.068, 0.089, 0.063);
  const door = group(scene, 2.48, 0, -3.39);
  box(door, 0x352d32, 0, 1.16, 0, 1.28, 2.31, 0.13);
  for (const x of [-0.47, -0.24, 0, 0.24, 0.47])
    box(door, 0x54413a, x, 1.16, 0.076, 0.21, 2.2, 0.055);
  for (const y of [0.37, 1.72])
    box(door, 0x292931, 0, y, 0.121, 1.1, 0.12, 0.05);
  shape(
    door,
    new T.TorusGeometry(0.07, 0.018, 7, 21),
    0x96835d,
    0.38,
    1.0,
    0.158,
  );
  for (const s of [-1, 1]) {
    const window = group(scene, s * 3.49, 2.26, -0.7);
    window.rotation.y = (-s * Math.PI) / 2;
    box(window, timber, 0, 0, 0, 1.55, 1.73, 0.15);
    box(window, mat(0x8aacc4, 0.22), 0, 0, 0.09, 1.31, 1.49, 0.04);
    box(window, timber, 0, 0, 0.14, 0.075, 1.58, 0.089);
    box(window, timber, 0, 0, 0.14, 1.39, 0.085, 0.1);
    for (const y of [-0.55, 0.52])
      box(window, 0x716154, 0, y, 0.18, 1.63, 0.2, 0.08).rotation.z = s * 0.19;
    box(window, 0x46372f, 0, -0.95, 0.05, 1.79, 0.16, 0.35);
  }
  const beam = glow(scene, 0xc8e9ff, 1.4, 2.0, -0.6, 1.1, 5.9, 0.16);
  beam.rotation.z = 0.61;
  for (const s of [-1, 1]) {
    const web = group(scene, s * 3.42, 3.6, -3.31);
    const silk = new T.LineBasicMaterial({
      color: 0xbdbab3,
      transparent: true,
      opacity: 0.29,
    });
    const lines = [];
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 14;
      lines.push(
        new T.Vector3(),
        new T.Vector3(-s * Math.cos(a) * 0.99, -Math.sin(a) * 0.95, 0.03),
      );
    }
    const g = new T.BufferGeometry().setFromPoints(lines);
    web.add(new T.LineSegments(g, silk));
    for (let r = 0.23; r < 1; r += 0.2) {
      const arc = [];
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 14;
        arc.push(new T.Vector3(-s * Math.cos(a) * r, -Math.sin(a) * r, 0.03));
      }
      web.add(new T.Line(new T.BufferGeometry().setFromPoints(arc), silk));
    }
  }
  const bed = group(scene, -2.45, 0, 1.65);
  box(bed, 0x604640, 0, 0.38, 0, 1.24, 0.25, 2.02);
  box(bed, 0x938883, 0, 0.55, 0, 1.18, 0.18, 1.99);
  box(bed, 0x68616e, 0, 0.66, 0.19, 1.2, 0.12, 1.56);
  ball(bed, 0xbab1a0, 0, 0.72, -0.66, 0.49, 0.13, 0.32);
  for (const s of [-1, 1])
    for (const z of [-1.0, 1.0])
      rod(
        bed,
        timber,
        [s * 0.57, 0.04, z],
        [s * 0.57, 1.1, z],
        0.075,
        geo.pipe,
      );
  const chair = group(scene, 2.51, 0, 1.44);
  box(chair, timber, 0, 0.48, 0, 0.57, 0.08, 0.62);
  box(chair, timber, 0, 0.94, 0.29, 0.59, 0.83, 0.067);
  for (const x of [-0.21, 0.21])
    for (const z of [-0.24, 0.24])
      rod(chair, timber, [x, 0, z], [x, 0.49, z], 0.04, geo.pipe);
  for (let i = 0; i < 6; i++) {
    box(
      scene,
      [0x736c55, 0x645044, 0x7b6256][i % 3],
      2.94,
      0.1 + i * 0.1,
      2.7,
      0.47,
      0.08,
      0.35,
    ).rotation.y = i * 0.33;
  }
  const dust = particles(
    scene,
    382,
    170,
    [7.3, 3.7, 7.3, 3.5],
    [0xb6bfcd, 0xe0c8a4, 0x8e9ead],
  );
  world.updates.push((t) => {
    dust.material.uniforms.time.value = t;
  });
  const candle = group(scene, -3.04, 0, -1.22);
  box(candle, timber, 0, 0.63, 0, 0.6, 0.1, 0.49);
  for (const x of [-0.23, 0.23])
    for (const z of [-0.19, 0.19])
      box(candle, timber, x, 0.32, z, 0.05, 0.59, 0.05);
  for (const x of [-0.14, 0.12]) {
    shape(candle, geo.pipe, 0xbb9c7a, x, 0.83, 0, 0.042, 0.35, 0.042);
    ball(candle, golden, x, 1.04, 0, 0.028, 0.076, 0.027);
  }
  const warm = new T.PointLight(0xffa558, 3.4, 8, 1.6);
  warm.position.set(-3, 1.1, -1.22);
  scene.add(warm);
  const faceFill = new T.PointLight(0xffdfc0, 1.95, 8, 1.5);
  faceFill.position.set(0, 2.9, 3.4);
  scene.add(faceFill);
  return world;
}

export function valley() {
  const world = atmosphere();
  scenery(world, 115, true);
  world.updates.push(water(world.scene, 74, -1.28, -67, 132, 210));
  world.updates.push(water(world.scene, -18, -0.32, -36, 10, 140, true));
  const palace = group(world.scene, 24, -0.8, -86);
  palace.scale.setScalar(1.46);
  castle(palace);
  const home = group(world.scene, -5, 0, 7);
  box(home, 0x857566, 0, 1.65, 0, 6.25, 3.35, 4.7);
  for (const x of [-3.02, 3.02])
    box(home, bark, x, 1.66, 2.42, 0.15, 3.4, 0.12);
  for (let i = 0; i < 10; i++) {
    const z = -2.65 + i * 0.57;
    for (const s of [-1, 1])
      box(home, 0x594741, s * 1.73, 3.73, z, 3.8, 0.17, 0.55).rotation.z =
        -s * 0.31;
  }
  box(home, 0x48362f, 0, 1.1, 2.43, 1.22, 2.2, 0.1);
  for (let i = 0; i < 6; i++)
    shape(
      world.scene,
      geo.leaf,
      0x9cad92,
      -12 - i * 3,
      0.2,
      -8 - i * 8,
      2,
      1.1,
      3,
    ).rotation.y = i;
  return world;
}
export function ambushForest() {
  const world = atmosphere();
  scenery(world, 160);
  world.updates.push(water(world.scene, 35, -1.2, -80, 25, 240, true));
  const c = group(world.scene, 3, -2, -194);
  c.scale.setScalar(1.63);
  castle(c);
  return world;
}

export function castleWorld() {
  const world = atmosphere(),
    { scene } = world;
  scene.fog.density = 0.0035;
  world.updates.push(water(scene, 0, -1.5, -30, 400, 400));
  const island = group(scene, 0, 0, -24);
  ball(island, 0x6c8580, 0, -0.5, 0, 23, 3, 28);
  const palace = group(scene, 0, 0, -51);
  palace.scale.setScalar(1.36);
  castle(palace);
  const mainTower = group(scene, 0, 0, -25);
  shape(mainTower, geo.pipe, 0xbea4a3, 0, 10.5, 0, 4.5, 21, 4.5);
  for (const y of [3, 8, 13, 18, 21.7])
    shape(mainTower, geo.pipe, 0xcab2a4, 0, y, 0, 4.73, 0.26, 4.73);
  for (let j = 0; j < 11; j++) {
    const a = (j * 6.283) / 11;
    for (const y of [5, 10, 15, 19.3]) {
      const w = group(mainTower, Math.sin(a) * 4.52, y, Math.cos(a) * 4.52);
      w.rotation.y = a;
      box(w, 0x795a76, 0, 0, 0, 0.49, 1.34, 0.06);
      box(w, mat(0xffcc86, 0.35), 0, 0, 0.04, 0.31, 1.11, 0.04);
      box(w, 0xc5a67c, 0, 0, 0.07, 0.035, 1.1, 0.025);
    }
  }
  const pathPoints = [
    new T.Vector3(0, 2.2, 34),
    new T.Vector3(0, 2.2, 15),
    new T.Vector3(0, 2.2, 3),
    new T.Vector3(4.5, 2.8, -8),
    new T.Vector3(8.0, 3.4, -18),
  ];
  for (let i = 0; i <= 54; i++) {
    const a = (i / 54) * Math.PI * 3.5;
    const r = 8.3;
    pathPoints.push(
      new T.Vector3(
        Math.cos(a) * r,
        3.9 + (i / 54) * 18.6,
        -25 - Math.sin(a) * r,
      ),
    );
  }
  pathPoints.push(new T.Vector3(1.9, 23.1, -20), new T.Vector3(0, 23.3, -24.8));
  const curve = new T.CatmullRomCurve3(pathPoints);
  const points = [],
    indices = [],
    t = new T.Vector3(),
    p = new T.Vector3(),
    normal = new T.Vector3();
  const steps = 420,
    rails = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    normal.set(-t.z, 0, t.x).normalize();
    for (const s of [-1, 1])
      points.push(
        p.x + normal.x * s * 2.25,
        p.y - 0.04,
        p.z + normal.z * s * 2.25,
      );
    if (i < steps) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    if (i % 4 === 0 && u < 0.955)
      for (const s of [-1, 1])
        rails.push([
          p.x + normal.x * s * 2.2,
          p.y + 0.34,
          p.z + normal.z * s * 2.2,
          0.25,
          0.74,
          0.25,
          0xc7b1a1,
          0,
          Math.atan2(t.x, t.z),
          0,
        ]);
    if (i % 18 === 0 && u < 0.24) {
      shape(
        scene,
        geo.pipe,
        0xa99793,
        p.x,
        p.y * 0.5 - 1.2,
        p.z,
        0.4,
        p.y + 2.0,
        0.4,
      );
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const roadMat = mat(0xd3bea3).clone();
  roadMat.side = T.DoubleSide;
  scene.add(new T.Mesh(g, roadMat));
  batch(scene, geo.box, rails);
  for (const s of [-1, 1]) {
    const path = [];
    for (let i = 0; i <= 198; i++) {
      const u = i / 210;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      normal.set(-t.z, 0, t.x).normalize();
      path.push(
        new T.Vector3(
          p.x + normal.x * s * 2.2,
          p.y + 0.72,
          p.z + normal.z * s * 2.2,
        ),
      );
    }
    shape(
      scene,
      new T.TubeGeometry(new T.CatmullRomCurve3(path), 420, 0.065, 6, false),
      0xd9bb96,
      0,
      0,
      0,
    );
  }
  shape(scene, geo.pipe, 0xd7bda4, 0, 22.97, -25, 6.1, 0.35, 6.1);
  for (let i = 0; i < 32; i++) {
    const a = (i * 6.283) / 32;
    box(
      scene,
      0xcab19b,
      Math.cos(a) * 5.85,
      23.51,
      -25 + Math.sin(a) * 5.85,
      0.32,
      0.94,
      0.32,
    ).rotation.y = -a;
  }
  for (const [x, z] of [
    [-4, -27],
    [4, -27],
    [-4, -22.5],
    [4, -22.5],
  ]) {
    const pot = shape(scene, geo.post, 0xb47c75, x, 23.5, z, 0.35, 0.57, 0.35);
    pot.rotation.z = Math.PI;
    for (let j = 0; j < 11; j++) {
      const a = j * 2.399;
      ball(
        scene,
        [0xe6a7c4, 0xe9c7eb, 0xffd7a2][j % 3],
        x + Math.cos(a) * 0.25,
        23.88 + Math.sin(j) * 0.14,
        z + Math.sin(a) * 0.25,
        0.12,
        0.11,
        0.12,
      );
    }
  }
  const petals = particles(
    scene,
    193,
    340,
    [21, 11, 30, -14],
    [0xffcce8, 0xffe3a8, 0xffe7cf],
  );
  world.updates.push((t) => {
    petals.material.uniforms.time.value = t;
  });
  return { ...world, curve, length: curve.getLength() };
}
