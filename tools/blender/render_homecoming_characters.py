"""Studio review of exported GLBs, not the source primitives."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for filename, x in [('homecoming_keeper', -.65), ('homecoming_companion', .55), ('homecoming_stocky', 1.5)]:
    existing = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public' / 'models' / (filename+'.glb')))
    imported = set(bpy.context.scene.objects)-existing
    for obj in imported:
        if obj.parent not in imported:
            obj.location.x += x
            obj.rotation_euler.z = -.28
            if filename != 'homecoming_keeper':
                obj.scale *= .8
        if obj.type == 'ARMATURE':
            obj.animation_data_clear()
            for b in obj.pose.bones:
                b.rotation_mode = 'XYZ'
                b.rotation_euler = (0, 0, 0)
                b.location = (0, 0, 0)
                b.scale = (1, 1, 1)
bpy.ops.mesh.primitive_plane_add(size=200)
ground = bpy.context.object
mat = bpy.data.materials.new('Studio neutral')
mat.diffuse_color = (.19, .22, .24, 1)
ground.data.materials.append(mat)
world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.25, .29, .33, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .5
for position, power, size in [((-3, 4, 5), 700, 4), ((4, 2, 3), 500, 3), ((0, -3, 4), 900, 3)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((.4, 0, .8))-light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(3.8, 6.6, 2.7))
camera = bpy.context.object
camera.rotation_euler = (Vector((.35, 0, .9))-camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.7
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1280
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(ROOT / '.browser.local' / 'homecoming-character-review.png')
bpy.ops.render.render(write_still=True)
