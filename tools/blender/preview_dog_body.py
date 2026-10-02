"""Iteration helper: build only the SDF body and render quick views.
blender --background --python tools/blender/preview_dog_body.py
"""
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402
import sdf_lib  # noqa: E402
import dog_shape  # noqa: E402
import bl_util as U  # noqa: E402
import render_lib as R  # noqa: E402

ROOT = HERE.parents[1]
OUT = ROOT / '.browser.local' / 'blender'
h = float(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else 0.004

R.clear_scene()
t0 = time.time()
model = dog_shape.build_body()
V, Fc = sdf_lib.mesh_from_model(model, *dog_shape.BODY_BOUNDS, h)
print('surface nets', len(V), 'verts', len(Fc), 'quads', round(time.time() - t0, 1), 's')
coat = U.material('Coat', (0.16, 0.075, 0.03), 0.7)
body = U.mesh_object('DogBody', V, Fc, coat)
U.merge_close(body)
U.decimate(body, 11000)
U.relax_surface(body, model, 2, 0.5)
print('tris', U.tri_count(body), round(time.time() - t0, 1), 's')
eye_m = U.material('Eye', (0.01, 0.006, 0.004), 0.15)
for side, sg in dog_shape.SIDES:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=dog_shape.EYE_R, location=tuple(dog_shape.eye_centre(sg)))
    bpy.context.object.data.materials.append(eye_m)
    bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, location=tuple(dog_shape.NOSE_C))
bpy.context.object.scale = (1.1, 0.8, 0.75)
bpy.context.object.data.materials.append(eye_m)
bpy.ops.object.shade_smooth()

R.studio()
R.setup_render((560, 460), 24)
paths = []
for name, d in [('side', (1, 0, 0.05)), ('front', (0.0, 1, 0.12)), ('q34', (0.8, 0.9, 0.35)),
                ('back34', (-0.7, -0.8, 0.4)), ('head', (0.5, 1, 0.25)), ('top', (0.2, 0.1, 1))]:
    target = (0, 0.32, 0.58) if name == 'head' else (0, -0.02, 0.36)
    R.camera(target, d, 4.0, ortho=0.42 if name == 'head' else 1.25)
    p = OUT / ('body_%s.png' % name)
    R.render(p)
    paths.append(p)
R.compose(paths, 3, OUT / 'body_sheet.png')
print('done', round(time.time() - t0, 1), 's')
