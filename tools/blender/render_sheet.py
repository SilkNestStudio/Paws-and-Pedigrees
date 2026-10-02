"""Contact sheet rendered from the exported GLB (what the game will load).

blender --background --python tools/blender/render_sheet.py -- dog
blender --background --python tools/blender/render_sheet.py -- person
Writes .browser.local/blender/<model>_sheet.png (+ individual panels).
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import render_lib as R  # noqa: E402

ROOT = HERE.parents[1]
OUT = ROOT / '.browser.local' / 'blender'
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['dog']
MODEL = args[0]
ONLY = args[1].split(',') if len(args) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public' / 'models' / (MODEL + '.glb')))
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
meshes = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name != 'Icosphere'}
for o in bpy.context.scene.objects:
    if o.name.startswith('Icosphere'):
        o.hide_render = True
print('MESHES', sorted(meshes))
print('ACTIONS', sorted(a.name for a in bpy.data.actions))
rig.animation_data_create()

R.studio()
R.setup_render((520, 440), 40)
scene = bpy.context.scene
scene.render.fps = 30

label_mat = bpy.data.materials.new('Label')
label_mat.use_nodes = True
nt = label_mat.node_tree
nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission')
em.inputs[0].default_value = (0.02, 0.02, 0.025, 1)
outn = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(em.outputs[0], outn.inputs[0])


def set_material_colors(colors):
    for mat in bpy.data.materials:
        if mat.name in colors and mat.use_nodes:
            p = mat.node_tree.nodes.get('Principled BSDF')
            if p:
                p.inputs['Base Color'].default_value = (*colors[mat.name], 1)


def find_action(name):
    for a in bpy.data.actions:
        if a.name == name or a.name.startswith(name + '_') or a.name.split('|')[-1] == name:
            return a
    return None


def pose(action, frame):
    ad = rig.animation_data
    if action is None:
        ad.action = None
        for pb in rig.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.scale = (1, 1, 1)
        scene.frame_set(1)
        return
    act = find_action(action)
    ad.action = act
    try:
        if act.slots and ad.action_slot is None:
            ad.action_slot = act.slots[0]
    except AttributeError:
        pass
    scene.frame_set(frame)


def show(visible, shapes):
    for name, obj in meshes.items():
        obj.hide_render = name not in visible
        keys = obj.data.shape_keys
        if keys:
            for kb in keys.key_blocks[1:]:
                kb.value = shapes.get(kb.name, 0.0)


def camera_for(view, target, scale):
    dirs = {'front': (0, -1, 0.10), 'side': (1, 0, 0.06), 'q34': (0.85, -0.95, 0.42),
            'back34': (-0.8, 0.9, 0.45), 'q34r': (-0.9, -0.85, 0.35), 'low': (1.0, -0.6, 0.12),
            'top': (0.15, -0.2, 1.0), 'head': (0.55, -1.0, 0.25)}
    for o in [o for o in scene.objects if o.type == 'CAMERA']:
        bpy.data.objects.remove(o, do_unlink=True)
    cam = R.camera(target, dirs[view], 6.0, ortho=scale)
    return cam


def label(cam, text):
    for o in [o for o in scene.objects if o.type == 'FONT']:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.text_add()
    t = bpy.context.object
    t.data.body = text
    t.data.materials.append(label_mat)
    s = cam.data.ortho_scale
    aspect = scene.render.resolution_y / scene.render.resolution_x
    t.parent = cam
    t.location = (-s / 2 + s * 0.035, s * aspect / 2 - s * 0.075, -1.0)
    t.rotation_euler = (0, 0, 0)
    t.data.size = s * 0.05


if MODEL == 'dog':
    base_vis = {'DogBody', 'Eyes', 'EyeShine', 'Nose', 'Mouth', 'Tongue', 'Ear_Drop'}
    set_material_colors({'Coat': (0.20, 0.10, 0.042)})
    T = (0, 0, 0.32)
    SC = 1.25
    panels = [
        ('front', None, 1, base_vis, {}, 'front', T, SC),
        ('side', None, 1, base_vis, {}, 'side', T, SC),
        ('3/4', None, 1, base_vis, {}, 'q34', T, SC),
        ('Idle', 'Idle', 30, base_vis, {}, 'q34', T, SC),
        ('Walk', 'Walk', 9, base_vis, {}, 'side', T, SC),
        ('Trot', 'Trot', 6, base_vis, {}, 'side', T, SC),
        ('Gallop', 'Gallop', 5, base_vis, {}, 'side', T, SC),
        ('Sniff', 'Sniff', 15, base_vis, {}, 'q34', T, SC),
        ('Sit', 'Sit', 1, base_vis, {}, 'q34', T, SC),
        ('Sit side', 'Sit', 1, base_vis, {}, 'side', T, SC),
        ('Down', 'Down', 1, base_vis, {}, 'q34', T, SC),
        ('Crouch', 'Crouch', 1, base_vis, {}, 'side', T, SC),
        ('Eat', 'Eat', 8, base_vis, {}, 'q34', T, SC),
        ('PlayBow', 'PlayBow', 1, base_vis, {}, 'side', T, SC),
        ('LookUp', 'LookUp', 1, base_vis, {}, 'q34', T, SC),
        ('Shake', 'Shake', 12, base_vis, {}, 'front', T, SC),
        ('short+stocky+muzzle_short', None, 1, base_vis, {'legs_short': 1, 'stocky': 1, 'muzzle_short': 1}, 'q34', T, SC),
        ('long+slim+muzzle_long, prick', None, 1, (base_vis - {'Ear_Drop'}) | {'Ear_Prick'},
         {'legs_long': 1, 'slim': 1, 'muzzle_long': 1}, 'q34', (0, 0, 0.38), 1.35),
        ('long coat (all fluff)', None, 1, base_vis | {'Fluff_Chest', 'Fluff_Tail', 'Fluff_Ears', 'Fluff_Legs', 'Fluff_Neck'},
         {}, 'q34', T, SC),
        ('long coat trot', 'Trot', 6, base_vis | {'Fluff_Chest', 'Fluff_Tail', 'Fluff_Ears', 'Fluff_Legs', 'Fluff_Neck'},
         {}, 'side', T, SC),
        ('semi ears + beard', None, 1, (base_vis - {'Ear_Drop'}) | {'Ear_Semi', 'Beard'}, {'head_wide': 0.5}, 'head',
         (0, -0.36, 0.56), 0.55),
        ('head close-up', None, 1, base_vis, {}, 'head', (0, -0.36, 0.56), 0.55),
        ('body_long+chest_deep', 'Walk', 9, base_vis, {'body_long': 1, 'chest_deep': 1}, 'side', T, SC),
        ('body_short+head_wide', 'Sit', 1, base_vis, {'body_short': 1, 'head_wide': 1}, 'q34', T, SC),
    ]
    if ONLY == ['debug']:
        ONLY = None
        panels = [(t, a, f, base_vis, {}, v, T, 1.0) for t, a, f, v in [
            ('Down side', 'Down', 1, 'side'), ('Down front', 'Down', 1, 'front'), ('Down top', 'Down', 1, 'top'),
            ('Bow q34', 'PlayBow', 1, 'q34'), ('Bow front', 'PlayBow', 1, 'front'), ('Sit back', 'Sit', 1, 'back34'),
            ('Sit low', 'Sit', 1, 'low'), ('Eat side', 'Eat', 8, 'side'), ('Walk 0', 'Walk', 0, 'side'),
            ('Walk 16', 'Walk', 16, 'side'), ('Gallop 0', 'Gallop', 0, 'side'), ('Gallop 10', 'Gallop', 10, 'side')]]
else:
    import person_panels  # noqa: E402
    panels = person_panels.panels(meshes, set_material_colors)

paths = []
default_colors = {}
for mat in bpy.data.materials:
    if mat.node_tree and mat.node_tree.nodes.get('Principled BSDF'):
        default_colors[mat.name] = tuple(mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)[:3]
for i, panel in enumerate(panels):
    title, action, frame, vis, shapes, view, target, scale = panel[:8]
    if ONLY and title not in ONLY:
        continue
    set_material_colors(panel[8] if len(panel) > 8 else default_colors)
    if callable(vis):
        vis = vis()
    show(vis, shapes)
    pose(action, frame)
    cam = camera_for(view, target, scale)
    label(cam, title)
    p = OUT / ('%s_%02d.png' % (MODEL, i))
    R.render(p)
    paths.append(p)
R.compose(paths, 4, OUT / ('%s_sheet.png' % MODEL))
print('SHEET', OUT / ('%s_sheet.png' % MODEL))
