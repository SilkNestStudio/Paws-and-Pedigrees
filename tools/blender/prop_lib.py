"""Hard-surface and SDF helpers for the static environment props (build_props.py).

Every prop is accumulated into one `Acc` (vertex/face/material lists) from many
small parts, then written as a single Blender mesh with one material slot per
distinct material name.

Part kinds
  * bevelled boxes, cylinders, prisms, frames, lathes, tori (bmesh), and
  * soft organic shapes from the character SDF toolkit (sdf_lib + surface nets).

Shading: each hard part has edges sharper than `sharp` degrees split before it
is merged, so flat faces stay flat and bevels/chamfers shade smoothly; SDF parts
are fully smooth.  Blender frame: Z up, the prop FRONT faces -Y (the default glTF
+Y-up export turns that into +Z in three.js).
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

import bl_util as U
import sdf_lib as S

# ---------------------------------------------------------------------------
# Palette.  Hex colours are sRGB; Blender/glTF want linear factors.
# name: (hex, roughness, extra)
# ---------------------------------------------------------------------------
PALETTE = {
    # building shell
    'Plaster': ('#efe0c2', 0.9), 'Whitewash': ('#f5f1e7', 0.9), 'RescueWall': ('#f1e6cf', 0.9),
    'Timber': ('#5e4130', 0.8), 'TimberLight': ('#8c6545', 0.8), 'ShedWood': ('#9a6f48', 0.85),
    'FenceWood': ('#9c7b58', 0.9), 'WoodLight': ('#c79a68', 0.8), 'BoardWood': ('#a1714a', 0.85),
    'Stone': ('#ab9f8c', 0.95), 'StoneDark': ('#8a7f70', 0.95), 'Brick': ('#b4613f', 0.9),
    'Concrete': ('#c9c1b3', 0.95),
    'Slate': ('#5c6c80', 0.7), 'SlateB': ('#66768a', 0.7), 'SlateDark': ('#475466', 0.7),
    'RoofTile': ('#a9563b', 0.8), 'RoofTileB': ('#b4623f', 0.8),
    'RoofTileDark': ('#8b4431', 0.8),
    'Glass': ('#3f6075', 0.15), 'WindowFrame': ('#f4efe3', 0.6), 'Lamp': ('#ffd98a', 0.4, {'emit': '#ffcf70'}),
    'DoorGreen': ('#41705a', 0.6), 'DoorBlue': ('#4f79a6', 0.6), 'ShutterGreen': ('#5d8a6a', 0.7),
    'ShutterBlue': ('#7299bf', 0.7), 'RescueTeal': ('#3b8a87', 0.6),
    'Metal': ('#4b4f55', 0.45, {'metal': 0.6}), 'Brass': ('#c79a3c', 0.35, {'metal': 0.8}),
    'RunMetal': ('#76837d', 0.5, {'metal': 0.4}),
    'SignFace': ('#efe3c6', 0.8), 'Soil': ('#6b4a33', 1.0),
    # plants
    'LeafA': ('#6c9c3b', 0.85), 'LeafB': ('#87b14b', 0.85), 'LeafC': ('#558338', 0.85),
    'AppleLeafA': ('#7aab45', 0.85), 'AppleLeafB': ('#92bf55', 0.85),
    'PineA': ('#3f6f4f', 0.85), 'PineB': ('#4f8459', 0.85),
    'HedgeA': ('#5f8f3a', 0.85), 'HedgeB': ('#74a446', 0.85),
    'Bark': ('#7a5638', 0.95), 'BarkDark': ('#5e412b', 0.95),
    'Apple': ('#d33b2e', 0.45), 'AppleYellow': ('#e9c74a', 0.45),
    'GrassGold': ('#c8b45e', 0.9), 'GrassGreen': ('#93a94c', 0.9),
    'FlowerPink': ('#e8566e', 0.7), 'FlowerYellow': ('#f4cf47', 0.7), 'FlowerWhite': ('#f4f1ea', 0.7),
    'FlowerLilac': ('#9d84d2', 0.7), 'FlowerCentre': ('#e3a23a', 0.7),
    'RoseRed': ('#c93649', 0.6), 'RosePink': ('#ea8da2', 0.6),
    'Rock': ('#948c80', 0.95), 'Moss': ('#7c9c45', 0.95),
    'Hay': ('#e2bf62', 0.95), 'HayDark': ('#c9a24a', 0.95), 'Twine': ('#8a6a3c', 0.9),
    'Sack': ('#d8c59c', 0.95),
    # van
    'VanBody': ('#5d7ea6', 0.45), 'VanCream': ('#f0e7d0', 0.5), 'Tyre': ('#2f2c2b', 0.8),
    'Chrome': ('#cfcfca', 0.25, {'metal': 0.9}), 'Headlight': ('#fff4cf', 0.2, {'emit': '#5a5442'}),
    'TailLight': ('#d4402f', 0.3), 'Plate': ('#f3ecd8', 0.6),
    # notice board
    'Cork': ('#c28c55', 0.95), 'Paper': ('#f8f4ea', 0.9), 'PaperYellow': ('#f5e6a2', 0.9),
    'PaperBlue': ('#cde0f0', 0.9), 'PaperPink': ('#f4cfd3', 0.9), 'Pin': ('#d4483b', 0.4),
    'Ink': ('#4a4640', 0.9),
    # fete / yard
    'TentStripeA': ('#d84a40', 0.8), 'TentStripeB': ('#f6efe0', 0.8), 'TentPole': ('#ece4d4', 0.7),
    'BowlBody': ('#c8473c', 0.4), 'WaterBowlBody': ('#4f87c6', 0.4), 'Water': ('#8ccbea', 0.05),
    'DummyCanvas': ('#e8dcbf', 0.95), 'DummyBand': ('#ea7529', 0.8), 'DummyRope': ('#b99b6a', 0.95),
}
for _i in range(1, 7):
    PALETTE['NamePlate%d' % _i] = ('#ecdfc1', 0.8)


def srgb(hexcol):
    h = hexcol.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


_MATS = {}


def get_mat(name):
    if name in _MATS:
        return _MATS[name]
    spec = PALETTE[name]
    hexcol, rough = spec[0], spec[1]
    extra = spec[2] if len(spec) > 2 else {}
    emit = srgb(extra['emit']) if 'emit' in extra else None
    m = U.material(name, srgb(hexcol), rough, extra.get('metal', 0.0), emission=emit, spec=0.35)
    _MATS[name] = m
    return m


# ---------------------------------------------------------------------------
# Matrices
# ---------------------------------------------------------------------------
def trs(loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    m = Matrix.Translation(Vector(loc)) @ Euler(rot, 'XYZ').to_matrix().to_4x4()
    if scale is not None:
        m = m @ Matrix.Diagonal((*scale, 1.0))
    return m


def look_z(p0, p1):
    """Matrix taking local +Z (centred, unit length) onto the segment p0->p1."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4(), d.length


# ---------------------------------------------------------------------------
# bmesh generators (all centred on the origin)
# ---------------------------------------------------------------------------
def bevel(bm, edges, w, segs=1):
    edges = list(edges)
    if w <= 0 or not edges:
        return
    verts = list({v for e in edges for v in e.verts})
    bmesh.ops.bevel(bm, geom=edges + verts, offset=w, offset_type='OFFSET', segments=segs,
                    profile=0.5, affect='EDGES', clamp_overlap=True)


def bm_box(sx, sy, sz, bev=0.0, segs=1, open_z=False):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z *= sz
    if open_z:  # bars: no end caps (hidden in rails)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.normal.z) > 0.9], context='FACES_ONLY')
    elif bev > 0:
        bevel(bm, bm.edges, min(bev, 0.49 * min(sx, sy, sz)), segs)
    return bm


def bm_cyl(r, h, segs=12, bev=0.0, bsegs=1, r2=None, caps=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    if bev > 0 and caps:
        ring = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        bevel(bm, ring, bev, bsegs)
    return bm


def bm_sphere(r, u=12, v=8, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    for vt in bm.verts:
        vt.co.x *= scale[0]
        vt.co.y *= scale[1]
        vt.co.z *= scale[2]
    return bm


def bm_prism(pts, depth, bev=0.0, segs=1):
    """Polygon (x, z) pairs extruded along Y (centred)."""
    bm = bmesh.new()
    n = len(pts)
    fr = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    bk = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    bm.faces.new(fr)
    bm.faces.new(bk[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((fr[i], bk[i], bk[j], fr[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        bevel(bm, bm.edges, bev, segs)
    return bm


def bm_frame(w, h, bar, depth, bottom=True, bev=0.0):
    """Rectangular picture frame in the XZ plane (outer w x h), extruded along Y."""
    bm = bmesh.new()
    x0, x1, z0, z1 = -w / 2, w / 2, -h / 2, h / 2
    ix0, ix1, iz0, iz1 = x0 + bar, x1 - bar, z0 + (bar if bottom else 0), z1 - bar
    outer = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    inner = [(ix0, iz0), (ix1, iz0), (ix1, iz1), (ix0, iz1)]
    if not bottom:
        # Door frame: two jambs and a head, each a bevelled box.
        for cx, cz, sx, sz in ((x0 + bar / 2, 0.0, bar, h), (x1 - bar / 2, 0.0, bar, h),
                               (0.0, z1 - bar / 2, w - 2 * bar + 0.002, bar)):
            part = bm_box(sx, depth, sz, bev, 1)
            bmesh.ops.translate(part, verts=part.verts, vec=(cx, 0, cz))
            me = bpy.data.meshes.new('_frame_part')
            part.to_mesh(me)
            part.free()
            bm.from_mesh(me)
            bpy.data.meshes.remove(me)
        return bm
    for y, rev in ((-depth / 2, False), (depth / 2, True)):
        o = [bm.verts.new((x, y, z)) for x, z in outer]
        i = [bm.verts.new((x, y, z)) for x, z in inner]
        for k in range(4):
            q = (o[k], o[(k + 1) % 4], i[(k + 1) % 4], i[k])
            bm.faces.new(q[::-1] if rev else q)
    vs = list(bm.verts)
    of, ifr, ob, ib = vs[0:4], vs[4:8], vs[8:12], vs[12:16]
    for k in range(4):
        j = (k + 1) % 4
        bm.faces.new((of[k], ob[k], ob[j], of[j]))
        bm.faces.new((ifr[k], ifr[j], ib[j], ib[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        outer_edges = [e for e in bm.edges if all(abs(abs(v.co.x) - w / 2) < 1e-6 or abs(abs(v.co.z) - h / 2) < 1e-6
                                                  for v in e.verts)]
        bevel(bm, outer_edges, bev, 1)
    return bm


def bm_prism_concave(pts, depth, bev=0.0):
    """Concave polygon prism: caps are triangulated so normals are reliable."""
    bm = bmesh.new()
    n = len(pts)
    fr = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    bk = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    f1 = bm.faces.new(fr)
    f2 = bm.faces.new(bk[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((fr[i], bk[i], bk[j], fr[j]))
    bmesh.ops.triangulate(bm, faces=[f1, f2])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        side = [e for e in bm.edges if abs(abs(e.verts[0].co.y) - depth / 2) < 1e-6 and
                abs(abs(e.verts[1].co.y) - depth / 2) < 1e-6 and len(e.link_faces) == 2 and
                e.calc_face_angle(0) > 0.5]
        bevel(bm, side, bev, 1)
    return bm


def bm_lathe(prof, segs=24):
    """Closed profile of (r, z) revolved around Z; r == 0 points become poles."""
    bm = bmesh.new()
    rings = []
    for r, z in prof:
        if r < 1e-7:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * j / segs), r * math.sin(2 * math.pi * j / segs), z))
                          for j in range(segs)])
    for a, b in zip(rings[:-1], rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for j in range(segs):
            k = (j + 1) % segs
            if len(a) == 1:
                bm.faces.new((a[0], b[j], b[k]))
            elif len(b) == 1:
                bm.faces.new((a[j], a[k], b[0]))
            else:
                bm.faces.new((a[j], a[k], b[k], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_torus(R, r, u=12, v=6):
    bm = bmesh.new()
    rings = []
    for i in range(u):
        a = 2 * math.pi * i / u
        c = Vector((math.cos(a), math.sin(a), 0))
        rings.append([bm.verts.new(c * (R + r * math.cos(2 * math.pi * j / v)) + Vector((0, 0, r * math.sin(2 * math.pi * j / v))))
                      for j in range(v)])
    for i in range(u):
        a, b = rings[i], rings[(i + 1) % u]
        for j in range(v):
            k = (j + 1) % v
            bm.faces.new((a[j], b[j], b[k], a[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_scallop_disc(r, lobes=5, n=20, depth=0.25, thick=0.01, cup=0.0):
    """Flat flower head: scalloped disc with a little thickness."""
    bm = bmesh.new()
    top_c = bm.verts.new((0, 0, thick / 2))
    bot_c = bm.verts.new((0, 0, -thick / 2))
    top, bot = [], []
    for j in range(n):
        a = 2 * math.pi * j / n
        rr = r * (1 - depth + depth * abs(math.cos(lobes * a / 2)))
        z = cup * rr / r
        top.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z + thick / 2)))
        bot.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z - thick / 2)))
    for j in range(n):
        k = (j + 1) % n
        bm.faces.new((top_c, top[j], top[k]))
        bm.faces.new((bot_c, bot[k], bot[j]))
        bm.faces.new((top[j], bot[j], bot[k], top[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_tube(pts, radii, sides=4, flat=1.0, cap_tip=True):
    """Swept tube through points; cross-section an ellipse flattened by `flat`."""
    bm = bmesh.new()
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(Vector((0, 0, 1)))
        if side.length < 1e-4:
            side = Vector((1, 0, 0))
        side.normalize()
        nrm = side.cross(t).normalized()
        r = radii[i]
        if r < 1e-6:
            rings.append([bm.verts.new(p)])
            continue
        rings.append([bm.verts.new(p + side * r * math.cos(2 * math.pi * j / sides) +
                                   nrm * r * flat * math.sin(2 * math.pi * j / sides)) for j in range(sides)])
    for a, b in zip(rings[:-1], rings[1:]):
        for j in range(sides):
            k = (j + 1) % sides
            if len(b) == 1:
                bm.faces.new((a[j], a[k], b[0]))
            elif len(a) == 1:
                bm.faces.new((a[0], b[k], b[j]))
            else:
                bm.faces.new((a[j], a[k], b[k], b[j]))
    if len(rings[0]) > 1:
        bm.faces.new(rings[0][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_quad(x0, x1, z0, z1, y, facing=-1):
    """Single quad in the XZ plane at depth y, normal towards `facing` * Y."""
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))]
    bm.faces.new(vs if facing < 0 else vs[::-1])
    return bm


def sdf_bm(model, lo, hi, h, tris, relax=1):
    V, Fc = S.mesh_from_model(model, lo, hi, h)
    obj = U.mesh_object('_tmp', V, Fc, None)
    U.merge_close(obj)
    U.decimate(obj, tris, symmetric=False)
    if relax:
        U.relax_surface(obj, model, relax, 0.4)
    U.triangulate(obj)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    me = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(me)
    return bm


# ---------------------------------------------------------------------------
# Accumulator
# ---------------------------------------------------------------------------
class Acc:
    def __init__(self, name):
        self.name = name
        self.V, self.F, self.FM = [], [], []
        self.FUV = {}

    def add(self, bm, mat, M=None, sharp=50.0, uv=None):
        if M is not None:
            bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
            if M.determinant() < 0:
                bmesh.ops.reverse_faces(bm, faces=bm.faces)
        bm.normal_update()
        if hasattr(mat, 'assign'):
            C = np.array([tuple(f.calc_center_median()) for f in bm.faces])
            faces_mat = list(mat.assign(C))
        elif callable(mat):
            faces_mat = [mat(f) for f in bm.faces]
        elif isinstance(mat, (list, tuple)):
            faces_mat = [mat[f.material_index] for f in bm.faces]
        else:
            faces_mat = [mat] * len(bm.faces)
        # Remember face materials through the edge split via a layer.
        lay = bm.faces.layers.int.new('m')
        for f, i in zip(bm.faces, range(len(faces_mat))):
            f[lay] = i
        if sharp is not None:
            thr = math.radians(sharp)
            es = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0.0) > thr]
            if es:
                bmesh.ops.split_edges(bm, edges=es)
        bm.verts.index_update()
        base = len(self.V)
        self.V.extend(tuple(v.co) for v in bm.verts)
        for f in bm.faces:
            m = faces_mat[f[lay]]
            fi = len(self.F)
            self.F.append([v.index + base for v in f.verts])
            self.FM.append(m)
            if uv is not None:
                u = uv(f, m)
                if u is not None:
                    self.FUV[fi] = u
        bm.free()

    # convenience wrappers -------------------------------------------------
    def box(self, c, size, mat, bev=0.04, segs=1, rot=(0, 0, 0), sharp=50.0, open_z=False):
        self.add(bm_box(*size, bev=bev, segs=segs, open_z=open_z), mat, trs(c, rot), sharp)

    def cyl(self, p0, p1, r, mat, segs=12, bev=0.0, r2=None, caps=True, sharp=50.0, bsegs=1):
        M, L = look_z(p0, p1)
        self.add(bm_cyl(r, L, segs, bev, bsegs, r2, caps), mat, M, sharp)

    def sphere(self, c, r, mat, u=12, v=8, scale=(1, 1, 1), rot=(0, 0, 0)):
        self.add(bm_sphere(r, u, v, scale), mat, trs(c, rot), None)

    def prism(self, pts, depth, mat, M, bev=0.0, segs=1, sharp=50.0):
        self.add(bm_prism(pts, depth, bev, segs), mat, M, sharp)

    def frame(self, c, w, h, bar, depth, mat, rot=(0, 0, 0), bottom=True, bev=0.0):
        self.add(bm_frame(w, h, bar, depth, bottom, bev), mat, trs(c, rot), 50.0)

    def lathe(self, prof, mat, M=None, segs=24, sharp=50.0):
        self.add(bm_lathe(prof, segs), mat, M or Matrix.Identity(4), sharp)

    def merge(self, other, M=None):
        M = M or Matrix.Identity(4)
        base = len(self.V)
        self.V.extend(tuple(M @ Vector(v)) for v in other.V)
        flip = M.determinant() < 0
        for fi, f in enumerate(other.F):
            nf = [i + base for i in f]
            if flip:
                nf = nf[::-1]
            self.F.append(nf)
            self.FM.append(other.FM[fi])
            if fi in other.FUV:
                uvs = other.FUV[fi]
                self.FUV[len(self.F) - 1] = uvs[::-1] if flip else uvs

    def tris(self):
        return sum(len(f) - 2 for f in self.F)

    def build(self):
        names = list(dict.fromkeys(self.FM))
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.V, [], self.F)
        for n in names:
            me.materials.append(get_mat(n))
        me.polygons.foreach_set('material_index', [names.index(n) for n in self.FM])
        me.polygons.foreach_set('use_smooth', [True] * len(self.F))
        if self.FUV:
            uvl = me.uv_layers.new(name='UVMap')
            for fi, uvs in self.FUV.items():
                for k, li in enumerate(me.polygons[fi].loop_indices):
                    uvl.data[li].uv = uvs[k]
        me.validate(clean_customdata=False)
        me.update()
        obj = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# ---------------------------------------------------------------------------
# SDF helpers for organic props
# ---------------------------------------------------------------------------
class LobeMat:
    """Face material = material of the closest lobe primitive (face centroid)."""

    def __init__(self, prims, mats):
        self.prims, self.mats = prims, mats

    def assign(self, C):
        D = np.stack([p.eval(C) for p in self.prims], 1)
        return [self.mats[i] for i in np.argmin(D, 1)]


def capped_cone_sdf(a_z, b_z, ra, rb, centre=(0, 0), wave=None):
    """Exact capped cone (iq) around a vertical axis; optional angular radius wave."""
    h = (b_z - a_z) / 2.0
    cz = (a_z + b_z) / 2.0

    def fn(P):
        x = P[:, 0] - centre[0]
        y = P[:, 1] - centre[1]
        qx = np.sqrt(x * x + y * y)
        if wave is not None:
            n, amp = wave
            ang = np.arctan2(y, x)
            qx = qx - amp * np.cos(n * ang) * np.clip((cz + h - P[:, 2]) / (2 * h), 0, 1)
        qy = P[:, 2] - cz
        k1x, k1y = rb, h
        k2x, k2y = rb - ra, 2 * h
        cax = qx - np.minimum(qx, np.where(qy < 0, ra, rb))
        cay = np.abs(qy) - h
        dot = k2x * k2x + k2y * k2y
        t = np.clip(((k1x - qx) * k2x + (k1y - qy) * k2y) / dot, 0, 1)
        cbx = qx - k1x + k2x * t
        cby = qy - k1y + k2y * t
        s = np.where((cbx < 0) & (cay < 0), -1.0, 1.0)
        return s * np.sqrt(np.minimum(cax * cax + cay * cay, cbx * cbx + cby * cby))
    r = max(ra, rb) + (wave[1] if wave else 0) + 0.05
    return S.Func(fn, (centre[0] - r, centre[1] - r, a_z - 0.05), (centre[0] + r, centre[1] + r, b_z + 0.05))


def march_out(model, origin, direction, step=0.02, max_d=8.0):
    """First surface point travelling from inside `origin` along `direction`."""
    o = np.asarray(origin, float)
    d = np.asarray(direction, float)
    d = d / np.linalg.norm(d)
    t = 0.0
    while t < max_d:
        p = o + d * t
        if model.eval(p[None], cull=False)[0] > 0:
            return p
        t += step
    return o + d * max_d
