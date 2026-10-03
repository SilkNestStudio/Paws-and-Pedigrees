"""Build the static environment props -> public/models/props.glb (+ art/blender/props.blend)

Run from the repository root:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" --background --python tools/blender/build_props.py
  ... build_props.py -- Farmhouse,Van      (only these; writes .browser.local/blender/props_partial.glb)

Each prop is a top-level empty named exactly as listed in PROPS (identity transform, origin on
the ground at the footprint centre, front facing +Z in three.js) with one child mesh
"<Name>_Mesh" (identity transform, one material slot per colour).  Keeping the transform-free
empty on top means meshopt/quantization can add a dequantization transform to the child mesh
without moving the node the game positions.
"""
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402

import prop_lib as L  # noqa: E402
import props_arch as PA  # noqa: E402
import props_nature as PN  # noqa: E402
import props_small as PS  # noqa: E402

ROOT = HERE.parents[1]
OUT_GLB = ROOT / 'public' / 'models' / 'props.glb'
OUT_BLEND = ROOT / 'art' / 'blender' / 'props.blend'
T0 = time.time()

PROPS = [
    ('Farmhouse', PA.farmhouse), ('KennelBlock', PA.kennel_block), ('PantryShed', PA.pantry_shed),
    ('Van', PS.van), ('Noticeboard', PS.noticeboard), ('GateSign', PS.gate_sign), ('FieldGate', PS.field_gate),
    ('FenceSection', PS.fence_section), ('HedgeSection', PN.hedge), ('TreeOak', PN.tree_oak),
    ('TreeOak2', PN.tree_oak2), ('TreeApple', PN.tree_apple), ('TreePine', PN.tree_pine), ('Bush', PN.bush),
    ('FlowerClump', PN.flower_clump), ('Rock', PN.rock), ('TallGrassClump', PN.tall_grass),
    ('Cottage', PA.cottage), ('RescueBuilding', PA.rescue_building), ('Tent', PS.tent), ('Bench', PS.bench),
    ('Dummy', PS.dummy), ('ScentBox', PS.scent_box),
    ('FoodBowl', lambda: PS.bowl('FoodBowl', 'BowlBody')),
    ('WaterBowl', lambda: PS.bowl('WaterBowl', 'WaterBowlBody', water=True)),
    ('Bales', PS.bales),
]


def log(*a):
    print('[props %5.1fs]' % (time.time() - T0), *a, flush=True)


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only = set(args[0].split(',')) if args else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    L._MATS.clear()
    coll = bpy.data.collections.new('Props')
    bpy.context.scene.collection.children.link(coll)
    empties, report = [], []
    for name, fn in PROPS:
        if only and name not in only:
            continue
        acc = fn()
        acc.name = name
        mesh_obj = acc.build()
        mesh_obj.name = name + '_Mesh'
        mesh_obj.data.name = name
        empty = bpy.data.objects.new(name, None)
        empty.empty_display_size = 0.5
        for o in (empty, mesh_obj):
            for c in o.users_collection:
                c.objects.unlink(o)
            coll.objects.link(o)
        mesh_obj.parent = empty
        empties.append(empty)
        V = L.U.verts_np(mesh_obj)
        lo, hi = V.min(0), V.max(0)
        tris = sum(len(p.vertices) - 2 for p in mesh_obj.data.polygons)
        mats = [m.name for m in mesh_obj.data.materials]
        report.append((name, tris, lo, hi, mats))
        log('%-15s %5d tris  x[%6.2f %6.2f] y[%6.2f %6.2f] z[%6.2f %6.2f]' %
            (name, tris, lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]))

    out = OUT_GLB if not only else ROOT / '.browser.local' / 'blender' / 'props_partial.glb'
    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(
        filepath=str(out), export_format='GLB', use_selection=False, export_yup=True, export_apply=False,
        export_animations=False, export_skins=False, export_morph=False, export_texcoords=True,
        export_normals=True, export_materials='EXPORT', export_extras=False, export_cameras=False,
        export_lights=False)
    log('exported', out, out.stat().st_size // 1024, 'KB')
    if not only:
        # spread the props out for editing convenience (the GLB is written with all at the origin)
        x = 0.0
        for e in empties:
            V = L.U.verts_np(e.children[0])
            w = V[:, 0].max() - V[:, 0].min()
            e.location = (x + w / 2, 0, 0)
            x += w + 2.0
        OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
        log('saved', OUT_BLEND)
    total = sum(r[1] for r in report)
    log('total triangles', total)


if __name__ == '__main__':
    main()
