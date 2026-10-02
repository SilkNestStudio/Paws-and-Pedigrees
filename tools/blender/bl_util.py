"""Blender helpers shared by the character builders."""
import bpy
import bmesh
import numpy as np
from mathutils import Vector


def material(name, color, roughness=0.6, metallic=0.0, emission=None, spec=0.5):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    p = mat.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    try:
        p.inputs['Specular IOR Level'].default_value = spec
    except KeyError:
        pass
    if emission is not None:
        p.inputs['Emission Color'].default_value = (*emission, 1)
        p.inputs['Emission Strength'].default_value = 1.0
    return mat


def mesh_object(name, V, Fc, mat=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in np.asarray(V, dtype=float)], [], [tuple(int(i) for i in f) for f in Fc])
    me.validate(clean_customdata=False)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    if mat is not None:
        me.materials.append(mat)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return obj


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj, mod):
    activate(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def merge_close(obj, dist=1e-5):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(obj.data)
    bm.free()


def decimate(obj, target_tris, symmetric=True):
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris <= target_tris:
        return
    mod = obj.modifiers.new('decimate', 'DECIMATE')
    mod.ratio = target_tris / tris
    mod.use_collapse_triangulate = True
    if symmetric:
        mod.use_symmetry = True
        mod.symmetry_axis = 'X'
    apply_modifier(obj, mod)


def triangulate(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()


def verts_np(obj):
    V = np.zeros(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get('co', V)
    return V.reshape(-1, 3)


def set_verts(obj, V):
    obj.data.vertices.foreach_set('co', np.asarray(V, dtype=float).ravel())
    obj.data.update()


def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def laplacian_smooth_values(obj, values, iterations=2, factor=0.5):
    """Smooth per-vertex arrays (N,K) over mesh edges."""
    n = len(obj.data.vertices)
    E = np.zeros(len(obj.data.edges) * 2, dtype=np.int64)
    obj.data.edges.foreach_get('vertices', E)
    E = E.reshape(-1, 2)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    vals = np.array(values, dtype=float)
    for _ in range(iterations):
        acc = np.zeros_like(vals)
        np.add.at(acc, E[:, 0], vals[E[:, 1]])
        np.add.at(acc, E[:, 1], vals[E[:, 0]])
        avg = acc / np.maximum(deg, 1)[:, None]
        vals = vals + factor * (avg - vals)
    return vals


def relax_surface(obj, model, iterations=3, factor=0.5):
    """Tangential relaxation + reprojection to even out triangle sizes."""
    from sdf_lib import project_to_surface
    V = verts_np(obj)
    for _ in range(iterations):
        S = laplacian_smooth_values(obj, V, 1, factor)
        V = project_to_surface(model, S, iters=2, step=1.0)
    set_verts(obj, V)
