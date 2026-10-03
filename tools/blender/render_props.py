"""Contact sheet for props.glb (renders the exported GLB, i.e. what the game loads).

blender --background --python tools/blender/render_props.py
blender --background --python tools/blender/render_props.py -- Farmhouse,Van      (only these panels)
blender --background --python tools/blender/render_props.py -- yard                (yard panel only, large)
blender --background --python tools/blender/render_props.py -- @partial Farmhouse  (use props_partial.glb)

Writes .browser.local/blender/props_sheet.png, props_yard.png and props_NN.png panels.
SignFace gets a test texture ("WILLOW KENNELS" + an arrow) so UV orientation can be checked.
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import render_lib as R  # noqa: E402

ROOT = HERE.parents[1]
OUT = ROOT / '.browser.local' / 'blender'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
GLB = ROOT / 'public' / 'models' / 'props.glb'
if args and args[0] == '@partial':
    GLB = OUT / 'props_partial.glb'
    args = args[1:]
ONLY = set(args[0].split(',')) if args else None
PANEL = (480, 400)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def emission_mat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (*color, 1)
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs[0], o.inputs[0])
    return m


def flat_mat(name, color, rough=0.95):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    return m


# ---------------------------------------------------------------------------
# 1. sign test texture
# ---------------------------------------------------------------------------
def make_sign_texture(path):
    R.setup_render((1000, 300), 8)
    scene.render.film_transparent = False
    world = bpy.data.worlds.new('W')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.86, 0.79, 0.62, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    scene.view_settings.view_transform = 'Standard'
    bpy.ops.object.text_add()
    t = bpy.context.object
    t.data.body = 'WILLOW KENNELS'
    t.data.align_x = 'CENTER'
    t.data.align_y = 'CENTER'
    t.data.size = 1.0
    t.data.materials.append(emission_mat('Txt', (0.18, 0.08, 0.04)))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-4.2, 0, 0))
    arrow = bpy.context.object
    arrow.scale = (0.5, 0.5, 1)
    arrow.rotation_euler = (0, 0, math.radians(45))
    arrow.data.materials.append(emission_mat('Arr', (0.75, 0.15, 0.1)))
    cam = R.camera((0, 0, 0), (0, 0, 1), 5, ortho=10.0)
    R.render(path)
    for o in (t, arrow, cam):
        bpy.data.objects.remove(o, do_unlink=True)
    scene.view_settings.view_transform = 'AgX'


SIGN_TEX = OUT / 'props_signtex.png'
make_sign_texture(SIGN_TEX)

# ---------------------------------------------------------------------------
# 2. import props
# ---------------------------------------------------------------------------
bpy.ops.import_scene.gltf(filepath=str(GLB))
props = {o.name: o for o in scene.objects if o.parent is None and o.type == 'EMPTY'}
print('PROPS', sorted(props))

img = bpy.data.images.load(str(SIGN_TEX))
sm = bpy.data.materials.get('SignFace')
if sm:
    nt = sm.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
for i in range(1, 7):
    m = bpy.data.materials.get('NamePlate%d' % i)
    if m and i == 1:
        nt = m.node_tree
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])


def meshes_of(root):
    out = []
    stack = [root]
    while stack:
        o = stack.pop()
        if o.type == 'MESH':
            out.append(o)
        stack.extend(o.children)
    return out


def world_bbox(objs):
    pts = []
    for o in objs:
        M = o.matrix_world
        V = np.array([tuple(M @ v.co) for v in o.data.vertices])
        pts.append(V)
    P = np.concatenate(pts)
    return P.min(0), P.max(0)


# ---------------------------------------------------------------------------
# 3. lighting / ground
# ---------------------------------------------------------------------------
world = bpy.data.worlds.new('Sky')
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.62, 0.74, 0.88, 1)
bg.inputs[1].default_value = 0.9
bpy.ops.object.light_add(type='SUN')
sun = bpy.context.object
sun.data.energy = 3.6
sun.data.angle = math.radians(6)
sun.data.color = (1.0, 0.95, 0.86)
sun.rotation_euler = (Vector((0, 0, 0)) - Vector((-0.55, -0.9, 1.15))).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
ground = bpy.context.object
ground.data.materials.append(flat_mat('Ground', (0.36, 0.48, 0.24)))

label_mat = emission_mat('Label', (0.02, 0.02, 0.025))
R.setup_render(PANEL, 24)
scene.view_settings.view_transform = 'AgX'


def clear_cams():
    for o in [o for o in scene.objects if o.type in ('CAMERA', 'FONT')]:
        bpy.data.objects.remove(o, do_unlink=True)


def label(cam, text):
    bpy.ops.object.text_add()
    t = bpy.context.object
    t.data.body = text
    t.data.materials.append(label_mat)
    s = cam.data.ortho_scale if cam.data.type == 'ORTHO' else 2 * math.tan(cam.data.angle / 2)
    aspect = scene.render.resolution_y / scene.render.resolution_x
    t.parent = cam
    t.location = (-s / 2 + s * 0.035, s * aspect / 2 - s * 0.085, -1.0)
    t.data.size = s * 0.06


def fit_camera(lo, hi, direction=(0.75, -1.0, 0.62)):
    d = Vector(direction).normalized()
    c = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    size = Vector(hi) - Vector(lo)
    cam = R.camera(c, d, max(size) * 3 + 5, ortho=1.0)
    bpy.context.view_layer.update()
    M = cam.matrix_world.to_3x3()
    right, up = M.col[0], M.col[1]
    xs, ys = [], []
    for i in range(8):
        p = Vector((lo[0] if i & 1 else hi[0], lo[1] if i & 2 else hi[1], lo[2] if i & 4 else hi[2])) - c
        xs.append(p.dot(right))
        ys.append(p.dot(up))
    aspect = PANEL[0] / PANEL[1]
    w = max(xs) - min(xs)
    h = max(ys) - min(ys)
    cam.data.ortho_scale = max(w, h * aspect) * 1.18
    cam.data.shift_y = -0.03
    cam.data.clip_end = 1000
    return cam


# ---------------------------------------------------------------------------
# 4. panels
# ---------------------------------------------------------------------------
order = ['Farmhouse', 'KennelBlock', 'PantryShed', 'Van', 'Noticeboard', 'GateSign', 'FieldGate', 'FenceSection',
         'HedgeSection', 'TreeOak', 'TreeOak2', 'TreeApple', 'TreePine', 'Bush', 'FlowerClump', 'Rock',
         'TallGrassClump', 'Cottage', 'RescueBuilding', 'Tent', 'Bench', 'Dummy', 'ScentBox', 'FoodBowl',
         'WaterBowl', 'Bales']
order = [n for n in order if n in props] + sorted(set(props) - set(order))
all_meshes = {n: meshes_of(props[n]) for n in props}
paths = []
render_panels = not (ONLY and ONLY == {'yard'})
for i, name in enumerate(order):
    if not render_panels or (ONLY and name not in ONLY):
        continue
    for n, ms in all_meshes.items():
        for o in ms:
            o.hide_render = n != name
    lo, hi = world_bbox(all_meshes[name])
    ground.location.z = min(0.0, lo[2] - 0.002)
    clear_cams()
    cam = fit_camera(lo, hi)
    size = hi - lo
    label(cam, '%s  %.1f x %.1f x %.1f m' % (name, size[0], size[1], size[2]))
    p = OUT / ('props_%02d.png' % i)
    R.render(p)
    paths.append(p)

# ---------------------------------------------------------------------------
# 5. yard composition (farmhouse, kennels, shed, van, trees, fences) with characters for scale
# ---------------------------------------------------------------------------
YARD = [
    ('Farmhouse', (0, 9, 0), 0), ('KennelBlock', (15.5, 3.5, 0), 90), ('PantryShed', (-9.5, 7.5, 0), -20),
    ('Van', (-6.2, -1.0, 0), -35), ('TreeOak', (-14, 14, 0), 0), ('TreeOak2', (9, 17, 0), 40),
    ('TreeApple', (-11, -4, 0), 0), ('TreePine', (-16, 4, 0), 0), ('TreePine', (24, 12, 0), 30),
    ('HedgeSection', (-3.5, 15.5, 0), 0), ('HedgeSection', (1.5, 15.5, 0), 0),
    ('Bush', (5.4, 5.8, 0), 0), ('Bush', (-5.6, 5.6, 0), 50), ('FlowerClump', (-2.0, 4.9, 0), 0),
    ('FlowerClump', (2.2, 5.0, 0), 70), ('Rock', (6, -3, 0), 20), ('TallGrassClump', (-9, -7, 0), 0),
    ('TallGrassClump', (8.5, -7.5, 0), 0), ('Noticeboard', (4.5, 4.4, 0), -10), ('Bench', (-3.3, 4.6, 0), 0),
    ('Bales', (-8.0, 4.0, 0), 25), ('ScentBox', (3.0, -1.5, 0), 15), ('FoodBowl', (9.5, 0.3, 0), 0),
    ('WaterBowl', (9.5, -0.6, 0), 0),
]
for k in range(9):
    YARD.append(('FenceSection', (-13.5 + 3.0 * k, -9.5, 0), 0))
YARD.append(('GateSign', (15.5, -9.5, 0), 0))
for k in range(4):
    YARD.append(('FenceSection', (-15.0, -8.0 + 3.0 * k, 0), 90))

if not ONLY or 'yard' in ONLY:
    for ms in all_meshes.values():
        for o in ms:
            o.hide_render = True
    copies = []
    for name, loc, rot in YARD:
        if name not in props:
            continue
        for o in all_meshes[name]:
            c = o.copy()
            c.parent = None
            c.matrix_world = (__import__('mathutils').Matrix.Translation(loc) @
                              __import__('mathutils').Matrix.Rotation(math.radians(rot), 4, 'Z') @ o.matrix_world)
            c.hide_render = False
            scene.collection.objects.link(c)
            copies.append(c)
    # characters for scale
    # (the shipped person/dog GLBs are meshopt-compressed, which Blender cannot import: use the .blend)
    for blend, loc, rot in ((ROOT / 'art' / 'blender' / 'person.blend', (1.2, 1.0, 0), 200),
                            (ROOT / 'art' / 'blender' / 'dog.blend', (2.4, 0.2, 0), 140)):
        if blend.exists():
            with bpy.data.libraries.load(str(blend), link=False) as (src, dst):
                dst.objects = [n for n in src.objects]
            new = [o for o in dst.objects if o is not None and o.type in ('MESH', 'ARMATURE')]
            for o in new:
                scene.collection.objects.link(o)
                if o.type == 'ARMATURE':
                    o.animation_data_clear()
                    for pb in o.pose.bones:
                        pb.location = (0, 0, 0)
                        pb.rotation_quaternion = (1, 0, 0, 0)
                        pb.rotation_euler = (0, 0, 0)
            for o in new:
                if o.type == 'MESH' and o.name.split('.')[0] in ('Hair_Long', 'Cap_Flat', 'Coat_Long', 'Ear_Prick',
                                                                  'Ear_Semi', 'Fluff_Chest', 'Fluff_Neck',
                                                                  'Fluff_Tail', 'Fluff_Legs', 'Fluff_Ears', 'Beard',
                                                                  'Icosphere'):
                    o.hide_render = True
            for o in new:
                if o.parent is None:
                    o.location = loc
                    o.rotation_euler = (0, 0, math.radians(rot))
    coat = bpy.data.materials.get('Coat')
    if coat:
        coat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.20, 0.10, 0.042, 1)
    ground.location.z = 0
    clear_cams()
    cam = R.camera((3.0, 3.5, 1.5), (0.62, -1.0, 0.62), 42, lens=32)
    cam.data.clip_end = 1000
    big = (1440, 900)
    R.setup_render(big, 48)
    R.render(OUT / 'props_yard.png')
    R.setup_render(PANEL, 24)
    label(cam, 'yard')
    p = OUT / 'props_yard_panel.png'
    R.render(p)
    paths.append(p)

if paths and (not ONLY or len(paths) > 1):
    R.compose(paths, 5, OUT / 'props_sheet.png')
    print('SHEET', OUT / 'props_sheet.png')
