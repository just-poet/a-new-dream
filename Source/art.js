import * as T from "three";

export const { MathUtils: M } = T;
export function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const materials = new Map();
export function mat(color, glow = 0) {
  const key = color + "/" + glow;
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.79,
        emissive: glow ? color : 0,
        emissiveIntensity: glow,
      }),
    );
  return materials.get(key);
}

export const geo = {
  box: new T.BoxGeometry(1, 1, 1),
  ball: new T.SphereGeometry(1, 18, 12),
  gem: new T.IcosahedronGeometry(1, 0),
  leaf: new T.IcosahedronGeometry(1, 1),
  cone: new T.ConeGeometry(1, 1, 8),
  post: new T.CylinderGeometry(0.76, 1, 1, 10),
  pipe: new T.CylinderGeometry(1, 1, 1, 12),
  disk: new T.CircleGeometry(1, 28),
};

export function group(parent, x = 0, y = 0, z = 0) {
  const node = new T.Group();
  node.position.set(x, y, z);
  parent.add(node);
  return node;
}

export function shape(
  parent,
  geometry,
  color,
  x,
  y,
  z,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const mesh = new T.Mesh(geometry, color.isMaterial ? color : mat(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}
export const box = (p, c, ...args) => shape(p, geo.box, c, ...args);
export const ball = (p, c, ...args) => shape(p, geo.ball, c, ...args);

export function rod(parent, color, start, end, width, geometry = geo.post) {
  const a = new T.Vector3(...start),
    b = new T.Vector3(...end);
  const center = a.clone().lerp(b, 0.5);
  const direction = b.sub(a);
  const mesh = shape(
    parent,
    geometry,
    color,
    center.x,
    center.y,
    center.z,
    width,
    direction.length(),
    width,
  );
  mesh.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return mesh;
}

export function batch(parent, geometry, items) {
  const buckets = new Map();
  for (const item of items) {
    const index = Math.floor(item[2] / 32);
    if (!buckets.has(index)) buckets.set(index, []);
    buckets.get(index).push(item);
  }
  if (buckets.size <= 3) return makeBatch(parent, geometry, items);
  for (const bucket of buckets.values()) makeBatch(parent, geometry, bucket);
}

function makeBatch(parent, geometry, items) {
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
  });
  const meshes = new T.InstancedMesh(geometry, material, items.length);
  const tmp = new T.Object3D();
  const tint = new T.Color();
  items.forEach(([x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0], i) => {
    tmp.position.set(x, y, z);
    tmp.scale.set(sx, sy, sz);
    tmp.rotation.set(rx, ry, rz);
    tmp.updateMatrix();
    meshes.setMatrixAt(i, tmp.matrix);
    meshes.setColorAt(i, tint.set(color));
  });
  parent.add(meshes);
  return meshes;
}

export function glow(parent, color, x, y, z, width, height, opacity = 0.5) {
  const material = new T.ShaderMaterial({
    uniforms: {
      tint: { value: new T.Color(color) },
      alpha: { value: opacity },
    },
    vertexShader:
      "varying vec2 p; void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 p; uniform vec3 tint; uniform float alpha; void main(){float a=max(0.,1.-length(p));gl_FragColor=vec4(tint,pow(a,2.)*alpha);}",
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  return shape(
    parent,
    new T.PlaneGeometry(1, 1),
    material,
    x,
    y,
    z,
    width,
    height,
    1,
  );
}

export function particles(parent, seed, count, area, colors) {
  const rng = random(seed),
    pos = [],
    tint = [];
  for (let i = 0; i < count; i++) {
    pos.push(
      (rng() - 0.5) * area[0],
      0.15 + rng() * area[1],
      -rng() * area[2] + (area[3] ?? 0),
    );
    new T.Color(colors[i % colors.length]).toArray(tint, i * 3);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("tint", new T.Float32BufferAttribute(tint, 3));
  const mesh = new T.Points(
    geometry,
    new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader:
        "uniform float time; attribute vec3 tint; varying vec3 c; varying float a; void main(){vec3 p=position; float f=p.x*.8+p.z*1.5; p.x+=sin(time*.73+f)*.55;p.y+=sin(time*.9+f)*.27;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(113./max(1.,-mv.z),2.,14.);gl_Position=projectionMatrix*mv;c=tint;a=(.57+.43*sin(time*2.+f))*clamp((105.+mv.z)/60.,0.,1.);}",
      fragmentShader:
        "varying vec3 c;varying float a;void main(){float d=2.*length(gl_PointCoord-.5);gl_FragColor=vec4(c,pow(max(0.,1.-d),1.9)*a);}",
      blending: T.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  parent.add(mesh);
  return mesh;
}
