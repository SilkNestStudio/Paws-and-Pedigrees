// Summarise props.glb: top-level nodes, triangles, measured bounds (three.js axes, metres),
// materials, attributes, and a UV orientation check for SignFace / NamePlate faces.
//   node tools/blender/check_props.mjs [public/models/props.glb] [--json]
// Bounds use accessor min/max (always present, also in meshopt files) transformed by the
// child node TRS.  The UV check decodes float data, so it is skipped for compressed buffers.
import { readFileSync, statSync } from 'node:fs';

const file = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? 'public/models/props.glb';
const asJson = process.argv.includes('--json');
const buf = readFileSync(file);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart);

function quatRotate(q, v) {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}
function apply(node, p) {
  const s = node.scale ?? [1, 1, 1];
  let v = [p[0] * s[0], p[1] * s[1], p[2] * s[2]];
  if (node.rotation) v = quatRotate(node.rotation, v);
  const t = node.translation ?? [0, 0, 0];
  return [v[0] + t[0], v[1] + t[1], v[2] + t[2]];
}
function readFloats(accIndex) {
  const acc = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  if (bv.extensions?.EXT_meshopt_compression || acc.componentType !== 5126) return null;
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const stride = bv.byteStride ?? n * 4;
  const off = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const out = [];
  for (let i = 0; i < acc.count; i++) {
    const row = [];
    for (let k = 0; k < n; k++) row.push(bin.readFloatLE(off + i * stride + k * 4));
    out.push(row);
  }
  return out;
}

const scene = gltf.scenes[gltf.scene ?? 0];
const rows = [];
const allMats = new Set();
for (const ni of scene.nodes) {
  const top = gltf.nodes[ni];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  const mats = [];
  const uvChecks = [];
  const stack = [[ni, []]];
  while (stack.length) {
    const [idx, chain] = stack.pop();
    const node = gltf.nodes[idx];
    const chainHere = [...chain, node];
    for (const c of node.children ?? []) stack.push([c, chainHere]);
    if (node.mesh === undefined) continue;
    for (const prim of gltf.meshes[node.mesh].primitives) {
      tris += gltf.accessors[prim.indices].count / 3;
      const mname = gltf.materials[prim.material]?.name;
      mats.push(mname);
      allMats.add(mname);
      const pa = gltf.accessors[prim.attributes.POSITION];
      // KHR_mesh_quantization: normalized integer min/max must be divided back to [-1, 1] / [0, 1]
      const div = pa.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[pa.componentType] : 1;
      for (let i = 0; i < 8; i++) {
        let p = [i & 1 ? pa.max[0] : pa.min[0], i & 2 ? pa.max[1] : pa.min[1], i & 4 ? pa.max[2] : pa.min[2]].map((x) => x / div);
        for (let k = chainHere.length - 1; k >= 1; k--) p = apply(chainHere[k], p);
        for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
      }
      if (mname === 'SignFace' || mname?.startsWith('NamePlate')) {
        const hasUV = prim.attributes.TEXCOORD_0 !== undefined;
        const P = readFloats(prim.attributes.POSITION);
        const N = readFloats(prim.attributes.NORMAL);
        const T = hasUV ? readFloats(prim.attributes.TEXCOORD_0) : null;
        const res = { material: mname, hasUV };
        if (P && N && T) {
          for (const facing of [1, -1]) {
            const idx2 = N.map((n, i) => (n[2] * facing > 0.9 ? i : -1)).filter((i) => i >= 0);
            if (!idx2.length) continue;
            // u should grow towards the viewer's right, v (glTF, 0 = top) should shrink upwards
            const right = facing; // viewer at +Z looks down -Z: right = +X; from behind: right = -X
            let du = 0, dv = 0;
            for (const i of idx2) for (const j of idx2) {
              du += (P[j][0] - P[i][0]) * right * (T[j][0] - T[i][0]);
              dv += (P[j][1] - P[i][1]) * (T[j][1] - T[i][1]);
            }
            const us = idx2.map((i) => T[i][0]), vs = idx2.map((i) => T[i][1]);
            res[facing > 0 ? 'front' : 'back'] = {
              verts: idx2.length, uRange: [Math.min(...us), Math.max(...us)].map((x) => +x.toFixed(3)),
              vRange: [Math.min(...vs), Math.max(...vs)].map((x) => +x.toFixed(3)),
              readable: du > 0 && dv < 0,
            };
          }
        } else if (hasUV) res.note = 'compressed: UV attribute present, values not decoded';
        uvChecks.push(res);
      }
    }
  }
  rows.push({
    node: top.name, children: (top.children ?? []).map((c) => gltf.nodes[c].name),
    topTransform: top.translation || top.rotation || top.scale ? 'NON-IDENTITY' : 'identity',
    tris, size: hi.map((h, a) => +(h - lo[a]).toFixed(2)),
    min: lo.map((x) => +x.toFixed(2)), max: hi.map((x) => +x.toFixed(2)), materials: mats, signUV: uvChecks,
  });
}
const out = { file, sizeKB: Math.round(statSync(file).size / 1024), extensionsUsed: gltf.extensionsUsed ?? [],
  nodes: rows.length, totalTris: rows.reduce((a, r) => a + r.tris, 0), materials: [...allMats].sort(), props: rows };
if (asJson) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`${out.file}  ${out.sizeKB} KB  nodes=${out.nodes}  tris=${out.totalTris}  ext=${out.extensionsUsed.join(',') || '-'}`);
  for (const r of rows) {
    console.log(`${r.node.padEnd(15)} ${String(r.tris).padStart(5)} tris  size x${r.size[0]} y${r.size[1]} z${r.size[2]}` +
      `  x[${r.min[0]},${r.max[0]}] y[${r.min[1]},${r.max[1]}] z[${r.min[2]},${r.max[2]}]  top=${r.topTransform}`);
    for (const s of r.signUV) console.log('    ' + JSON.stringify(s));
  }
  console.log('materials:', out.materials.join(', '));
}
