"""Report visible coplanar overlapping faces from different mesh islands (z-fighting risk).

blender --background --python tools/blender/check_coplanar.py [-- path.glb]

Two faces count as a hit when they lie in the same plane with the same facing, belong to
different islands, sample points of one fall inside the other, and the shared spot is not
buried inside another solid (a short ray along the normal does not first hit a back face).
"""
import sys
from collections import defaultdict
from pathlib import Path

import bmesh
import bpy
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = Path(args[0]) if args else ROOT / 'public' / 'models' / 'props.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB))


def inside2d(p, poly):
    x, y = p
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


total = 0
for o in sorted([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: o.name):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.faces.ensure_lookup_table()
    bm.normal_update()
    tree = BVHTree.FromBMesh(bm)
    comp, cid = {}, 0
    for f in bm.faces:
        if f in comp:
            continue
        stack = [f]
        comp[f] = cid
        while stack:
            g = stack.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h not in comp:
                        comp[h] = cid
                        stack.append(h)
        cid += 1
    groups = defaultdict(list)
    for f in bm.faces:
        if f.calc_area() < 2e-5:
            continue
        n = f.normal
        groups[(round(n.x * 100), round(n.y * 100), round(n.z * 100), round(n.dot(f.verts[0].co) * 500))].append(f)
    hits = []
    for fs in groups.values():
        if len(fs) < 2:
            continue
        n = fs[0].normal
        a = n.orthogonal().normalized()
        b = n.cross(a)
        polys = [[(v.co.dot(a), v.co.dot(b)) for v in f.verts] for f in fs]
        for i in range(len(fs)):
            for j in range(len(fs)):
                if i == j or comp[fs[i]] == comp[fs[j]]:
                    continue
                f = fs[i]
                c = f.calc_center_median()
                samples = [c] + [c.lerp(v.co, 0.7) for v in f.verts]
                for s in samples:
                    if not inside2d((s.dot(a), s.dot(b)), polys[j]):
                        continue
                    hit = tree.ray_cast(s + n * 0.0005, n, 0.5)
                    if hit[0] is not None and hit[1].dot(n) > 0:
                        continue  # buried inside another solid
                    hits.append(tuple(round(x, 2) for x in s))
                    break
    uniq = sorted(set(hits))
    total += len(uniq)
    print('COPLANAR %-20s %3d' % (o.name, len(uniq)), uniq[:8])
    bm.free()
print('COPLANAR TOTAL', total)
