import * as T from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";

const models = new Map(),
  textures = new Map(),
  materials = new Map();
const base = new URL("./assets/", location.href);
const textureLoader = new T.TextureLoader();
const modelLoader = new GLTFLoader();
const blankCanvas = document.createElement("canvas");
blankCanvas.width = blankCanvas.height = 1;
blankCanvas.getContext("2d").fillRect(0, 0, 1, 1);
const blank = blankCanvas.toDataURL();

function file(name) {
  return new URL(name, base).href;
}
async function texture(name, color = true) {
  if (textures.has(name)) return textures.get(name);
  const map = await textureLoader.loadAsync(file(name));
  if (color) map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 8;
  textures.set(name, map);
  return map;
}
async function avatar(name) {
  const manager = new T.LoadingManager();
  manager.setURLModifier((url) => (/\.tga$/i.test(url) ? blank : url));
  manager.addHandler(/\.tga$/i, new T.TextureLoader(manager));
  const model = await new FBXLoader(manager).loadAsync(file(name + ".fbx"));
  const maps = await Promise.all(
    [
      "body_color",
      "body_normal",
      "head_color",
      "head_normal",
      "opacity_color",
    ].map((kind) =>
      texture(
        name + "-" + kind + (kind === "opacity_color" ? ".png" : ".jpg"),
        kind.includes("color"),
      ),
    ),
  );
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ).map((original) => {
      const opacity = original.name.includes("opacity"),
        head = original.name.includes("head");
      const material = new T.MeshStandardMaterial({
        name: original.name,
        map: maps[opacity ? 4 : head ? 2 : 0],
        normalMap: opacity ? null : maps[head ? 3 : 1],
        roughness: opacity ? 0.75 : 0.62,
        normalScale: new T.Vector2(0.35, 0.35),
        alphaTest: opacity ? 0.45 : 0,
        side: opacity ? T.DoubleSide : T.FrontSide,
      });
      return material;
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
  });
  models.set(name, model);
}
async function horse() {
  const manager = new T.LoadingManager();
  manager.setURLModifier((url) => (/\.tga$/i.test(url) ? blank : url));
  manager.addHandler(/\.tga$/i, new T.TextureLoader(manager));
  const model = await new FBXLoader(manager).loadAsync(file("horse.fbx"));
  const [color, bump, reins, reinsBump] = await Promise.all([
    texture("horse_lightbrown_saddle_color.jpg"),
    texture("horse_lightbrown_saddle_bump.jpg", false),
    texture("horse_reins_color.jpg"),
    texture("horse_reins_bump.jpg", false),
  ]);
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ).map((original) => {
      const isReins = original.name.includes("reins");
      const material = new T.MeshStandardMaterial({
        map: isReins ? reins : color,
        bumpMap: isReins ? reinsBump : bump,
        bumpScale: 0.012,
        roughness: 0.72,
        side: T.DoubleSide,
      });
      if (!isReins)
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#include <map_fragment>\nfloat lightArea=smoothstep(.05,.22,dot(diffuseColor.rgb,vec3(.299,.587,.114)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.69,.68,.61)+diffuseColor.rgb*.23,lightArea*.97);",
          );
        };
      return material;
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
  });
  models.set("horse", model);
}
async function scan(name) {
  const object = (await modelLoader.loadAsync(file(name + ".glb"))).scene;
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.material.map) mesh.material.map.anisotropy = 4;
    if (mesh.material.alphaMode === "BLEND" || mesh.material.transparent) {
      mesh.material.transparent = false;
      mesh.material.alphaTest = 0.48;
      mesh.material.depthWrite = true;
    }
    if (
      name.includes("tree") ||
      name.includes("fern") ||
      name.includes("grass") ||
      name.includes("shrub")
    )
      mesh.material.side = T.DoubleSide;
  });
  models.set(name, object);
}

export async function loadAssets(onProgress) {
  const jobs = [
    () => avatar("princess"),
    () => avatar("gothel"),
    () => avatar("eugene"),
    horse,
    () => texture("waternormals.jpg", false),
    ...[
      "island_tree_02",
      "boulder_01",
      "fern_02",
      "shrub_04",
      "grass_medium_01",
      "flower_gazania",
    ].map((name) => () => scan(name)),
    ...[
      "forest-floor",
      "castle-stone",
      "old-wood",
      "cobble",
      "grass-ground",
      "roof-slate",
    ].map((name) => async () => {
      const maps = await Promise.all(
        ["diffuse", "normal", "roughness"].map((kind) =>
          texture(name + "-" + kind + ".jpg", kind === "diffuse"),
        ),
      );
      const material = new T.MeshStandardMaterial({
        map: maps[0],
        normalMap: maps[1],
        roughnessMap: maps[2],
        roughness: 0.95,
        normalScale: new T.Vector2(0.65, 0.65),
      });
      materials.set(name, material);
    }),
  ];
  let complete = 0;
  onProgress(0, jobs.length);
  await Promise.all(
    jobs.map(async (job) => {
      await job();
      onProgress(++complete, jobs.length);
    }),
  );
}
export function loadedTexture(name) {
  return textures.get(name);
}
export function avatarClone(name) {
  return clone(models.get(name));
}
export function model(name) {
  return models.get(name);
}
export function surface(name, repeat = 1) {
  const material = materials.get(name).clone();
  for (const key of ["map", "normalMap", "roughnessMap"]) {
    const map = material[key].clone();
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.repeat.set(repeat, repeat);
    map.needsUpdate = true;
    material[key] = map;
  }
  return material;
}
export function scatter(parent, name, placements, shadows = false) {
  const source = models.get(name);
  const height = new T.Box3().setFromObject(source).getSize(new T.Vector3()).y;
  const factor =
    ({
      island_tree_02: 13,
      boulder_01: 1.8,
      fern_02: 0.9,
      shrub_04: 1.75,
      grass_medium_01: 0.51,
      flower_gazania: 0.47,
    }[name] ?? height) / Math.max(0.01, height);
  source.updateMatrixWorld(true);
  const pivot = new T.Object3D(),
    matrix = new T.Matrix4(),
    local = new T.Matrix4();
  source.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const instance = new T.InstancedMesh(
      mesh.geometry,
      mesh.material,
      placements.length,
    );
    placements.forEach(([x, y, z, scale, angle], i) => {
      pivot.position.set(x, y, z);
      pivot.rotation.set(0, angle, 0);
      pivot.scale.setScalar(scale * factor);
      pivot.updateMatrix();
      matrix.multiplyMatrices(pivot.matrix, mesh.matrixWorld);
      instance.setMatrixAt(i, matrix);
    });
    instance.castShadow = shadows;
    instance.receiveShadow = true;
    parent.add(instance);
  });
}
