// Summarise a GLB: nodes, meshes, materials, skins, morph targets, animations, bounds.
// node tools/blender/check_glb.mjs public/models/dog.glb
import { readFileSync, statSync } from 'node:fs';
const file = process.argv[2] ?? 'public/models/dog.glb';
const buf = readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const out = { file, sizeKB: Math.round(statSync(file).size / 1024) };
out.scenes = gltf.scenes?.map((s) => s.nodes.map((n) => gltf.nodes[n].name));
out.meshNodes = gltf.nodes.filter((n) => n.mesh !== undefined).map((n) => {
  const m = gltf.meshes[n.mesh];
  const prim = m.primitives;
  const tris = prim.reduce((a, p) => a + gltf.accessors[p.indices].count / 3, 0);
  const pos = gltf.accessors[prim[0].attributes.POSITION];
  return {
    node: n.name, mesh: m.name, skinned: n.skin !== undefined, tris,
    verts: pos.count, materials: prim.map((p) => gltf.materials[p.material]?.name),
    attributes: Object.keys(prim[0].attributes),
    morphs: m.extras?.targetNames ?? [], min: pos.min.map((v) => +v.toFixed(3)), max: pos.max.map((v) => +v.toFixed(3)),
  };
});
out.materials = gltf.materials?.map((m) => m.name);
out.skins = gltf.skins?.map((s) => ({ joints: s.joints.length, names: s.joints.map((j) => gltf.nodes[j].name) }));
const rigNode = gltf.nodes.find((n) => n.name === 'DogRig' || n.name === 'PersonRig');
out.rigNode = rigNode && { name: rigNode.name, rotation: rigNode.rotation, translation: rigNode.translation, scale: rigNode.scale, extrasKeys: Object.keys(rigNode.extras ?? {}), children: rigNode.children?.map((c) => gltf.nodes[c].name) };
out.animations = gltf.animations?.map((a) => {
  const sampler0 = a.samplers[a.channels[0].sampler];
  const t = gltf.accessors[sampler0.input];
  const paths = {};
  for (const c of a.channels) paths[c.target.path] = (paths[c.target.path] ?? 0) + 1;
  return { name: a.name, start: +t.min[0].toFixed(3), duration: +t.max[0].toFixed(3), channels: a.channels.length, paths };
});
console.log(JSON.stringify(out, null, 1));
