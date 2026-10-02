"""Studio lighting, cameras and contact-sheet assembly for preview renders."""
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions,
                 bpy.data.cameras, bpy.data.lights, bpy.data.images):
        for item in list(coll):
            if item.users == 0 or coll in (bpy.data.actions,):
                try:
                    coll.remove(item)
                except Exception:
                    pass


def studio(scene=None, ground=True, bg=(0.62, 0.66, 0.70), ground_color=(0.55, 0.57, 0.58)):
    scene = scene or bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    bgn = world.node_tree.nodes['Background']
    bgn.inputs[0].default_value = (*bg, 1)
    bgn.inputs[1].default_value = 0.35
    if ground:
        bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
        g = bpy.context.object
        g.name = 'StudioGround'
        m = bpy.data.materials.new('StudioGround')
        m.use_nodes = True
        p = m.node_tree.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (*ground_color, 1)
        p.inputs['Roughness'].default_value = 0.95
        g.data.materials.append(m)
    lights = []
    for loc, power, size, color in [((2.5, -3.0, 4.0), 380, 4.0, (1.0, 0.96, 0.9)),
                                    ((-3.5, -1.0, 2.5), 140, 4.0, (0.85, 0.9, 1.0)),
                                    ((0.5, 4.0, 3.0), 260, 3.0, (1.0, 1.0, 1.0))]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (Vector((0, 0, 0.3)) - light.location).to_track_quat('-Z', 'Y').to_euler()
        lights.append(light)
    return lights


def camera(target, direction, distance=3.0, ortho=None, lens=85):
    target = Vector(target)
    d = Vector(direction).normalized()
    bpy.ops.object.camera_add(location=target + d * distance)
    cam = bpy.context.object
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho
    else:
        cam.data.lens = lens
    cam.data.clip_start = 0.01
    bpy.context.scene.camera = cam
    return cam


def setup_render(res=(640, 520), samples=48, engine='CYCLES'):
    scene = bpy.context.scene
    scene.render.engine = engine
    if engine == 'CYCLES':
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
        scene.cycles.device = 'CPU'
        try:
            scene.cycles.denoiser = 'OPENIMAGEDENOISE'
        except Exception:
            pass
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass


def render(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def compose(paths, cols, out, labels=None):
    imgs = []
    for p in paths:
        im = bpy.data.images.load(str(p))
        w, h = im.size
        px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        imgs.append(px)
        bpy.data.images.remove(im)
    h, w = imgs[0].shape[:2]
    rows = math.ceil(len(imgs) / cols)
    sheet = np.ones((rows * h, cols * w, 4), dtype=np.float32)
    for i, px in enumerate(imgs):
        r, c = divmod(i, cols)
        # images are bottom-up in Blender; row 0 should be the top row.
        y0 = (rows - 1 - r) * h
        sheet[y0:y0 + h, c * w:(c + 1) * w] = px[:h, :w]
    out_img = bpy.data.images.new('sheet', cols * w, rows * h, alpha=True)
    out_img.pixels[:] = sheet.ravel()
    out_img.filepath_raw = str(out)
    out_img.file_format = 'PNG'
    out_img.save()
    bpy.data.images.remove(out_img)
