"""Buildings for props.glb: Farmhouse, KennelBlock, PantryShed, Cottage, RescueBuilding.

Blender frame: Z up, the building front (door side) faces -Y, which is +Z in three.js.
"""
import math

import numpy as np
from mathutils import Matrix, Vector

import prop_lib as L
import sdf_lib as S
from prop_lib import Acc, trs

FACING = {'-y': 0.0, '+x': 90.0, '+y': 180.0, '-x': -90.0}


def rotz(deg):
    return Matrix.Rotation(math.radians(deg), 4, 'Z')


def at(c, facing='-y'):
    """Matrix placing a part built facing -Y (wall surface at y=0) onto a wall."""
    return Matrix.Translation(Vector(c)) @ rotz(FACING[facing])


def frame_cols(*cols):
    return Matrix([tuple(c) for c in cols]).transposed().to_4x4()


# ---------------------------------------------------------------------------
# Roof: gable, ridge along X at y=0.  Rows of slightly kicked slabs read as
# chunky cartoon shingles; a deck underneath closes every gap.
# ---------------------------------------------------------------------------
def gable_roof(length, y_front, z_eave_f, z_ridge, rows, mats, ridge_mat, y_back=None, z_eave_b=None,
               thick=0.1, kick=3.5, ov=0.18, ridge_r=0.15, barge=None, barge_w=0.22, jitter=0.0, seed=0,
               deck_mat=None):
    A = Acc('roof')
    rng = np.random.default_rng(seed)
    y_back = -y_front if y_back is None else y_back
    z_eave_b = z_eave_f if z_eave_b is None else z_eave_b
    X = Vector((1, 0, 0))
    ridge = Vector((0, 0, z_ridge))
    for side, horiz, z_e in ((-1, abs(y_front), z_eave_f), (1, abs(y_back), z_eave_b)):
        rise = z_ridge - z_e
        Ls = math.hypot(horiz, rise)
        ang = math.atan2(rise, horiz)
        s = Vector((0, side * math.cos(ang), -math.sin(ang)))
        n = Vector((0, side * math.sin(ang), math.cos(ang)))
        R = frame_cols(X, s, X.cross(s))
        # deck (top surface on the roof plane)
        c = ridge + s * (Ls / 2 + 0.02) - n * (thick * 0.6)
        A.add(L.bm_box(length - 0.02, Ls + 0.04, thick * 1.2, 0.0), deck_mat or mats[0], Matrix.Translation(c) @ R)
        k = math.radians(kick)
        s2 = s * math.cos(k) + n * math.sin(k)
        n2 = n * math.cos(k) - s * math.sin(k)
        R2 = frame_cols(X, s2, X.cross(s2))
        seg = Ls / rows
        for i in range(rows):
            t_top = i * seg - (ov if i else 0.0)
            t_bot = (i + 1) * seg + (0.06 if i == rows - 1 else 0.0)
            w = t_bot - t_top
            top = ridge + s * t_top
            cc = top + s2 * (w / 2) + n2 * (thick / 2)
            Mj = Matrix.Identity(4)
            if jitter:
                Mj = Matrix.Rotation(rng.uniform(-jitter, jitter), 4, n2)
            dx = rng.uniform(-0.03, 0.03) if jitter else 0.0
            A.add(L.bm_box(length + dx, w, thick, 0.025, 1), mats[i % len(mats)],
                  Matrix.Translation(cc) @ Mj @ R2)
        if barge:
            for sx in (-1, 1):
                cb = ridge + s * (Ls / 2 + 0.03) + n * 0.06 + Vector((sx * (length / 2 + 0.03), 0, 0))
                A.add(L.bm_box(0.09, Ls + 0.08, barge_w, 0.02, 1), barge, Matrix.Translation(cb) @ R)
    A.cyl((-length / 2 - 0.04, 0, z_ridge + 0.04), (length / 2 + 0.04, 0, z_ridge + 0.04), ridge_r, ridge_mat,
          segs=10, bev=0.03)
    return A


def gable_infill(width, depth, z0, z_apex, mat):
    """Triangular attic prism: ridge along X, spanning y in [-depth/2, depth/2]."""
    A = Acc('gable')
    pts = [(-depth / 2, z0), (depth / 2, z0), (0.0, z_apex)]
    A.add(L.bm_prism(pts, width, 0.0), mat, rotz(90))
    return A


# ---------------------------------------------------------------------------
# Wall details, built facing -Y with the wall surface at y = 0.
# ---------------------------------------------------------------------------
def window(w, h, frame='WindowFrame', glass='Glass', mull=True, sill='Stone', lintel='Timber', shutters=None,
           flowerbox=False, flowers=('FlowerPink', 'FlowerYellow', 'FlowerWhite'), seed=0, simple=False):
    A = Acc('win')
    b = 0.0 if simple else 0.025
    A.box((0, -0.02, 0), (w - 0.1, 0.04, h - 0.1), glass, bev=0.0)
    A.frame((0, -0.06, 0), w, h, 0.09, 0.1, frame, bev=0.0)
    if mull:
        A.box((0, -0.055, 0), (0.05, 0.05, h - 0.12), frame, bev=0.0)
        A.box((0, -0.0525, 0.06 * h), (w - 0.12, 0.045, 0.05), frame, bev=0.0)
    if sill:
        A.box((0, -0.1, -h / 2 - 0.05), (w + 0.24, 0.22, 0.1), sill, bev=b)
    if lintel:
        A.box((0, -0.05, h / 2 + 0.08), (w + 0.3, 0.12, 0.16), lintel, bev=b)
    if shutters:
        for sx in (-1, 1):
            cx = sx * (w / 2 + w * 0.25 + 0.03)
            A.box((cx, -0.035, 0), (w * 0.48, 0.05, h * 0.98), shutters, bev=0.015)
            for zz in (-0.3, 0.3):
                A.box((cx, -0.065, zz * h), (w * 0.4, 0.02, 0.05), shutters, bev=0.0)
    if flowerbox:
        flower_box(A, w + 0.06, (0, -0.2, -h / 2 - 0.24), flowers, seed)
    return A


def flower_box(A, w, c, flowers, seed=0):
    rng = np.random.default_rng(seed)
    cx, cy, cz = c
    A.box((cx, cy, cz), (w, 0.28, 0.24), 'TimberLight', bev=0.025)
    A.box((cx, cy, cz + 0.08), (w - 0.06, 0.22, 0.1), 'Soil', bev=0.0)
    n_leaf = max(2, int(w / 0.4))
    for i in range(n_leaf):
        x = cx + (i + 0.5 - n_leaf / 2) * (w - 0.1) / n_leaf
        A.sphere((x, cy, cz + 0.17), 0.2, 'LeafA' if i % 2 else 'LeafC', u=7, v=4, scale=(1.0, 0.75, 0.6))
    n_fl = max(3, int(w / 0.22))
    for i in range(n_fl):
        x = cx + (i + 0.5 - n_fl / 2) * (w - 0.12) / n_fl + rng.uniform(-0.03, 0.03)
        A.sphere((x, cy - rng.uniform(0.0, 0.1), cz + 0.25 + rng.uniform(0, 0.06)), 0.065,
                 flowers[i % len(flowers)], u=6, v=4)


def door(w, h, mat='DoorGreen', frame='Timber', knob='Brass', panels=True, glass_top=False, frame_bev=0.02):
    """Bottom centre at the origin."""
    A = Acc('door')
    A.add(L.bm_frame(w + 0.2, h + 0.1, 0.1, 0.1, bottom=False, bev=frame_bev), frame,
          trs((0, -0.05, (h + 0.1) / 2)), 50.0)
    A.box((0, -0.03, h / 2), (w, 0.06, h), mat, bev=0.0)
    if panels:
        rows = (0.27, 0.69) if not glass_top else (0.27,)
        for zz in rows:
            for sx in (-1, 1):
                A.box((sx * w * 0.21, -0.07, zz * h), (w * 0.32, 0.03, h * 0.34), mat, bev=0.012)
    if glass_top:
        A.box((0, -0.065, 0.72 * h), (w * 0.7, 0.03, h * 0.3), 'Glass', bev=0.0)
        A.box((0, -0.075, 0.72 * h), (0.04, 0.02, h * 0.3 + 0.02), mat, bev=0.0)
    A.sphere((w * 0.36, -0.1, h * 0.48), 0.045, knob, u=6, v=4)
    return A


def lantern(A, c, facing_y=-1):
    x, y, z = c
    d = facing_y
    A.box((x, y + d * 0.06, z + 0.1), (0.04, 0.14, 0.04), 'Metal', bev=0.0)
    A.box((x, y + d * 0.16, z + 0.2), (0.22, 0.22, 0.05), 'Metal', bev=0.015)
    A.box((x, y + d * 0.16, z + 0.04), (0.15, 0.15, 0.26), 'Lamp', bev=0.01)
    A.box((x, y + d * 0.16, z - 0.12), (0.18, 0.18, 0.05), 'Metal', bev=0.015)
    A.sphere((x, y + d * 0.16, z + 0.26), 0.04, 'Metal', u=6, v=4)


def brick_patch(A, c, n=3, seed=0):
    rng = np.random.default_rng(seed)
    x, y, z = c
    for i in range(n):
        A.box((x + (i % 2) * 0.17 + rng.uniform(-0.02, 0.02), y - 0.015, z + i * 0.16), (0.3, 0.05, 0.13),
              'Brick', bev=0.0)


def gutter(A, x0, x1, y, z, r=0.085):
    A.cyl((x0, y, z), (x1, y, z), r, 'Metal', segs=8, bev=0.0)


def downpipe(A, x, y_gutter, y_wall, z_top, z_bot=0.15, r=0.06):
    A.cyl((x, y_gutter, z_top), (x, y_wall, z_top - 0.45), r, 'Metal', segs=8)
    A.cyl((x, y_wall, z_top - 0.45), (x, y_wall, z_bot), r, 'Metal', segs=8)
    A.cyl((x, y_wall, z_bot), (x, y_wall - 0.2, z_bot - 0.08), r, 'Metal', segs=8)


def sign_uv(x0, x1, z0, z1, back=False):
    """UV callback for an XZ-plane quad.  Front: u along +X, v up (glTF v=0 at top)."""
    def fn(f, m):
        if m not in ('SignFace',) and not m.startswith('NamePlate'):
            return None
        out = []
        for lp in f.loops:
            co = lp.vert.co
            u = (co.x - x0) / (x1 - x0)
            v = (co.z - z0) / (z1 - z0)
            if f.normal.y > 0:  # back face, readable from behind
                u = 1.0 - u
            out.append((u, v))
        return out
    return fn


def sign_panel(A, x0, x1, z0, z1, y_front, depth, face='SignFace', edge='TimberLight', back=False):
    """Unbevelled board from y_front to y_front + depth.  The -Y face (and the +Y face when
    back=True) uses `face` with 0..1 UVs over exactly [x0,x1] x [z0,z1]; the rest uses `edge`."""
    def mat(f):
        if f.normal.y < -0.9:
            return face
        if f.normal.y > 0.9 and back:
            return face
        return edge
    bm = L.bm_box(x1 - x0, depth, z1 - z0, 0.0)
    A.add(bm, mat, trs(((x0 + x1) / 2, y_front + depth / 2, (z0 + z1) / 2)), 50.0, sign_uv(x0, x1, z0, z1))


def place(A, sub, c, facing='-y'):
    A.merge(sub, at(c, facing))


# ===========================================================================
def farmhouse():
    A = Acc('Farmhouse')
    hw, hd = 5.3, 3.1            # wall half extents
    A.box((0, 0, 0.2), (2 * hw + 0.3, 2 * hd + 0.3, 0.6), 'Stone', bev=0.08, segs=2)
    A.box((0, 0, 2.8), (2 * hw, 2 * hd, 4.8), 'Plaster', bev=0.1, segs=2)
    A.merge(gable_infill(2 * hw - 0.04, 2 * hd, 5.15, 8.0, 'Plaster'))
    # timber frame
    for sx in (-1, 1):
        for sy in (-1, 1):
            A.box((sx * (hw - 0.1), sy * (hd - 0.1), 2.8), (0.32, 0.32, 4.75), 'Timber', bev=0.04)
    for sy in (-1, 1):
        A.box((0, sy * (hd + 0.04), 2.95), (2 * hw - 0.2, 0.12, 0.24), 'Timber', bev=0.03)
        A.box((0, sy * (hd + 0.05), 5.05), (2 * hw + 0.1, 0.14, 0.28), 'Timber', bev=0.03)
    for sx in (-1, 1):
        A.box((sx * (hw + 0.04), 0, 2.95), (0.12, 2 * hd - 0.2, 0.24), 'Timber', bev=0.03)
        A.box((sx * (hw + 0.05), 0, 5.05), (0.14, 2 * hd + 0.1, 0.24), 'Timber', bev=0.03)
        # gable king post and struts
        A.box((sx * (hw + 0.03), 0, 6.45), (0.12, 0.2, 2.6), 'Timber', bev=0.03)
        for sy in (-1, 1):
            A.cyl((sx * (hw + 0.03), sy * 0.15, 5.2), (sx * (hw + 0.03), sy * 1.9, 6.4), 0.07, 'Timber', segs=6)
    # front braces in the upper storey
    for sx in (-1, 1):
        A.cyl((sx * (hw - 0.3), -hd - 0.04, 3.1), (sx * (hw - 1.15), -hd - 0.04, 4.9), 0.075, 'Timber', segs=6)
    # roof
    A.merge(gable_roof(11.4, -3.55, 4.95, 8.2, 7, ('Slate', 'SlateB'), 'SlateDark', ridge_r=0.17, kick=5.5,
                       barge='Timber', jitter=0.01, seed=3))
    # chimney
    cx, cy = 3.4, 0.35
    A.box((cx, cy, 7.8), (0.9, 0.9, 3.0), 'Brick', bev=0.05)
    A.box((cx, cy, 8.95), (1.0, 1.0, 0.14), 'Stone', bev=0.03)
    A.box((cx, cy, 9.35), (1.08, 1.08, 0.16), 'Stone', bev=0.04)
    for dx in (-0.2, 0.2):
        A.cyl((cx + dx, cy, 9.4), (cx + dx, cy, 9.8), 0.13, 'RoofTile', segs=10, bev=0.02, r2=0.11)
    # front door, hood, lantern, step
    fy = -hd
    place(A, door(1.15, 2.15, 'DoorGreen'), (0, fy, 0.45))
    hood = gable_roof(0.75, -0.85, 0.0, 0.42, 2, ('Slate',), 'SlateDark', thick=0.07, ov=0.08, ridge_r=0.07)
    A.merge(hood, Matrix.Translation((0, fy - 0.37, 2.75)) @ rotz(90))
    for sx in (-1, 1):
        A.cyl((sx * 0.7, fy - 0.02, 2.35), (sx * 0.7, fy - 0.62, 2.78), 0.05, 'Timber', segs=6)
    lantern(A, (0.95, fy, 2.15))
    A.box((0, fy - 0.43, 0.11), (2.0, 0.56, 0.32), 'StoneDark', bev=0.05, segs=2)
    # front windows
    for i, x in enumerate((-2.9, 2.9)):
        place(A, window(1.2, 1.4, shutters='ShutterGreen', flowerbox=True, seed=i), (x, fy, 1.75))
    for x in (-3.2, 0.0, 3.2):
        place(A, window(1.05, 1.15, sill='WindowFrame', lintel=None), (x, fy, 4.05))
    # back and sides
    for x in (-2.6, 2.6):
        place(A, window(1.1, 1.3, simple=True), (x, hd, 1.75), '+y')
        place(A, window(1.0, 1.1, lintel=None, simple=True), (x, hd, 4.05), '+y')
    place(A, window(1.0, 1.1, lintel=None, simple=True), (hw, 0, 4.05), '+x')
    place(A, window(1.0, 1.1, lintel=None, simple=True), (-hw, 0, 4.05), '-x')
    place(A, window(1.1, 1.3, simple=True), (hw, -1.3, 1.75), '+x')
    place(A, window(1.1, 1.3, simple=True), (-hw, 1.3, 1.75), '-x')
    # wear: exposed brick under the plaster
    brick_patch(A, (-4.35, fy, 3.55), 3, 1)
    brick_patch(A, (4.3, fy, 0.85), 2, 2)
    brick_patch(A, (-1.7, hd + 0.06, 3.3), 3, 3)
    # gutters + downpipe
    for sy in (-1, 1):
        gutter(A, -5.6, 5.6, sy * 3.62, 4.86)
    downpipe(A, 5.05, -3.62, -hd - 0.1, 4.8)
    return A


# ===========================================================================
def kennel_block():
    A = Acc('KennelBlock')
    hw, hd = 7.5, 2.25
    A.box((0, 0, 0.4), (2 * hw, 2 * hd, 1.0), 'Brick', bev=0.06, segs=2)
    A.box((0, 0, 1.95), (2 * hw - 0.04, 2 * hd - 0.04, 2.2), 'BoardWood', bev=0.06, segs=1)
    A.box((0, 0, 0.92), (2 * hw + 0.06, 2 * hd + 0.06, 0.1), 'Stone', bev=0.03)
    A.merge(gable_infill(2 * hw - 0.08, 2 * hd - 0.08, 3.0, 4.28, 'BoardWood'))
    A.merge(gable_roof(15.6, -3.0, 2.95, 4.5, 4, ('Slate', 'SlateB'), 'SlateDark', y_back=2.55,
                       z_eave_b=4.5 - 2.55 * (1.55 / 3.0), ridge_r=0.15, barge='Timber', jitter=0.01, seed=5))
    # cupola + weathervane
    A.box((0, 0, 4.75), (0.8, 0.8, 0.7), 'BoardWood', bev=0.04)
    for sy in (-1, 1):
        for k in range(3):
            A.box((0, sy * 0.41, 4.6 + k * 0.14), (0.62, 0.04, 0.05), 'Timber', bev=0.0)
    A.merge(gable_roof(1.0, -0.6, 0.0, 0.42, 1, ('Slate',), 'SlateDark', thick=0.07, ov=0.0, ridge_r=0.06),
            Matrix.Translation((0, 0, 5.05)))
    A.cyl((0, 0, 5.4), (0, 0, 6.05), 0.02, 'Metal', segs=6)
    A.box((0, 0, 5.92), (0.7, 0.03, 0.04), 'Metal', bev=0.0)
    A.prism([(0.35, 0.86), (0.48, 0.92), (0.35, 0.98)], 0.03, 'Metal', trs((0, 0, 5.0)))
    A.box((-0.36, 0, 5.92), (0.12, 0.03, 0.14), 'Metal', bev=0.0)
    fy = -hd
    bay = 2 * hw / 6
    for k in range(7):
        x = -hw + k * bay
        x = max(-hw + 0.11, min(hw - 0.11, x))
        A.box((x, fy - 0.04, 1.95), (0.22, 0.14, 2.2), 'Timber', bev=0.03)
    for i in range(6):
        xc = -hw + bay * (i + 0.5)
        place(A, door(0.95, 1.9, 'DoorGreen', panels=False, frame_bev=0.0), (xc, fy, 0.0))
        A.box((xc, fy - 0.075, 1.0), (0.95, 0.04, 0.05), 'Timber', bev=0.0)  # stable-door split
        A.box((xc, fy - 0.075, 0.28), (0.36, 0.03, 0.4), 'Metal', bev=0.0)   # dog flap
        for sx in (-1, 1):
            A.box((xc + sx * 0.82, fy - 0.03, 2.1), (0.05, 0.04, 1.9), 'Timber', bev=0.0)
        # name plate
        A.frame((xc, fy - 0.04, 2.33), 0.9, 0.32, 0.05, 0.08, 'Timber', bev=0.0)
        sign_panel(A, xc - 0.4, xc + 0.4, 2.22, 2.44, fy - 0.06, 0.05, 'NamePlate%d' % (i + 1), 'Timber')
    # back windows
    for x in (-5.0, 0.0, 5.0):
        place(A, window(1.0, 0.7, mull=False, lintel=None, sill='Stone', simple=True), (x, hd - 0.02, 2.2), '+y')
    for sx, fc in ((1, '+x'), (-1, '-x')):
        place(A, window(0.9, 0.8, lintel=None, frame='Timber', shutters='DoorGreen', simple=True),
              (sx * (hw - 0.02), 0, 2.1), fc)
        for yb in (-1.85, -1.3, 1.3, 1.85):
            A.box((sx * (hw + 0.0), yb, 2.0), (0.075, 0.1, 2.06), 'Timber', bev=0.0)
        A.box((sx * (hw + 0.0), 0, 3.08), (0.08, 2 * hd - 0.1, 0.14), 'Timber', bev=0.0)
    gutter(A, -7.8, 7.8, -3.06, 2.86, 0.08)
    downpipe(A, -7.2, -3.06, fy - 0.1, 2.8)
    # ---- runs: y from fy to fy - 3.4 -----------------------------------
    run_d = 3.4
    yc = fy - run_d / 2
    yf = fy - run_d + 0.06
    A.box((0, yc, 0.02), (2 * hw, run_d, 0.14), 'Concrete', bev=0.03)
    bar_sp = 0.26
    for k in range(7):
        x = max(-hw + 0.11, min(hw - 0.11, -hw + k * bay))
        A.box((x, yc, 0.33), (0.22, run_d, 0.5), 'Brick', bev=0.03)
        A.box((x, yc, 0.6), (0.28, run_d + 0.04, 0.06), 'Stone', bev=0.0)
        A.box((x, yf, 0.95), (0.1, 0.1, 1.9), 'RunMetal', bev=0.0)
        A.box((x, yc - 0.03, 1.85), (0.07, run_d - 0.06, 0.07), 'RunMetal', bev=0.0)
        nb = int((run_d - 0.2) / bar_sp)
        for j in range(nb):
            y = fy - 0.15 - j * (run_d - 0.25) / (nb - 1)
            A.box((x, y, 1.24), (0.035, 0.035, 1.22), 'RunMetal', open_z=True)
    for i in range(6):
        xa = max(-hw + 0.11, -hw + i * bay) + 0.05
        xb = min(hw - 0.11, -hw + (i + 1) * bay) - 0.05
        xc = (xa + xb) / 2
        for z in (0.16, 1.85):
            A.box((xc, yf, z), (xb - xa, 0.06, 0.06), 'RunMetal', bev=0.0)
        gw = 1.0
        for x0, x1 in ((xa, xc - gw / 2 - 0.03), (xc + gw / 2 + 0.03, xb)):
            n = max(2, int((x1 - x0) / bar_sp))
            for j in range(n):
                x = x0 + (j + 0.5) * (x1 - x0) / n
                A.box((x, yf, 1.0), (0.035, 0.035, 1.66), 'RunMetal', open_z=True)
        # gate
        A.frame((xc, yf - 0.02, 0.98), gw, 1.55, 0.05, 0.05, 'Metal', bev=0.0)
        for j in range(3):
            x = xc - gw / 2 + (j + 1) * gw / 4
            A.box((x, yf - 0.02, 0.98), (0.03, 0.03, 1.45), 'Metal', open_z=True)
        A.box((xc + gw / 2 - 0.04, yf - 0.06, 1.0), (0.12, 0.04, 0.06), 'Brass', bev=0.0)
        for z in (0.4, 1.55):
            A.box((xc - gw / 2 - 0.03, yf - 0.02, z), (0.05, 0.064, 0.12), 'Metal', bev=0.0)
    return A


# ===========================================================================
def pantry_shed():
    A = Acc('PantryShed')
    hw = 1.35
    y0, y1 = -1.35, 1.85           # walls (front at y0)
    yc, dep = (y0 + y1) / 2, y1 - y0
    A.box((0, yc, 0.02), (2 * hw + 0.2, dep + 0.2, 0.16), 'Concrete', bev=0.03)
    A.box((0, yc, 1.05), (2 * hw - 0.06, dep - 0.06, 1.9), 'Timber', bev=0.0)
    # lapped siding: boards tilt out at the bottom
    nb = 7
    bh = 1.85 / nb
    for i in range(nb):
        z = 0.1 + (i + 0.5) * bh
        for sy, yy in ((-1, y0), (1, y1)):
            A.box((0, yy + sy * 0.01, z), (2 * hw + 0.02, 0.05, bh + 0.04), 'ShedWood', bev=0.0,
                  rot=(sy * math.radians(5), 0, 0))
        for sx in (-1, 1):
            A.box((sx * (hw + 0.01), yc, z), (0.05, dep + 0.02, bh + 0.04), 'ShedWood', bev=0.0,
                  rot=(0, -sx * math.radians(5), 0))
    for sx in (-1, 1):
        for yy in (y0, y1):
            A.box((sx * (hw + 0.02), yy, 1.02), (0.13, 0.13, 1.95), 'Timber', bev=0.02)
    # gable infill (front/back gables): ridge along Y
    A.add(L.bm_prism([(-hw, 1.94), (hw, 1.94), (0.0, 2.38)], dep, 0.0), 'ShedWood', trs((0, yc, 0)))
    roof = gable_roof(4.0, -1.5, 1.97, 2.56, 3, ('Slate', 'SlateB'), 'SlateDark', thick=0.08, ov=0.12,
                      ridge_r=0.08, barge='Timber', barge_w=0.16)
    A.merge(roof, Matrix.Translation((0, 0.0, 0)) @ rotz(90))
    # door
    place(A, door(0.9, 1.75, 'TimberLight', panels=False), (0, y0 - 0.04, 0.1))
    A.cyl((-0.38, y0 - 0.12, 0.3), (0.38, y0 - 0.12, 1.65), 0.035, 'Timber', segs=4)
    for z in (0.3, 1.65):
        A.box((0, y0 - 0.12, z), (0.86, 0.04, 0.12), 'Timber', bev=0.0)
    for z in (0.3, 1.65):
        A.box((-0.3, y0 - 0.15, z), (0.32, 0.02, 0.05), 'Metal', bev=0.0)
    # side window
    place(A, window(0.6, 0.55, mull=True, lintel=None, sill='Timber'), (hw + 0.04, 0.6, 1.4), '+x')
    # sacks and a barrel under the front overhang
    sack = sack_bm()
    for (x, y, r, s) in ((0.86, -1.73, 0.3, 1.0), (1.2, -1.62, -0.5, 0.86)):
        b = sack.copy()
        A.add(b, 'Sack', trs((x, y, 0.0), (0, 0, r), (s, s, s)), None)
    sack.free()
    A.add(L.bm_lathe([(0, 0.0), (0.24, 0.0), (0.29, 0.25), (0.3, 0.4), (0.29, 0.55), (0.24, 0.8), (0, 0.8)], 16),
          'TimberLight', trs((-0.92, -1.7, 0.0)), 70.0)
    for z in (0.15, 0.65):
        A.add(L.bm_lathe([(0, z - 0.03), (0.285, z - 0.03), (0.285, z + 0.03), (0, z + 0.03)], 16), 'Metal',
              trs((-0.92, -1.7, 0.0)), 70.0)
    A.add(L.bm_cyl(0.255, 0.04, 16), 'Timber', trs((-0.92, -1.7, 0.8)), 50.0)
    return A


def sack_bm():
    m = S.Model()
    m.add(S.Ellipsoid((0, 0, 0.3), (0.25, 0.21, 0.31)))
    m.add(S.Ellipsoid((0, 0, 0.16), (0.27, 0.23, 0.17)), 0.08)
    m.add(S.RoundCone((0, 0, 0.5), (0.02, 0.0, 0.66), 0.09, 0.05), 0.06)
    m.add(S.Ellipsoid((0.03, 0, 0.7), (0.09, 0.07, 0.05)), 0.03)
    m.inter(S.Plane((0, 0, 0.0), (0, 0, -1)))
    return L.sdf_bm(m, (-0.32, -0.28, -0.02), (0.32, 0.28, 0.78), 0.022, 500)


# ===========================================================================
def cottage():
    A = Acc('Cottage')
    hw, hd = 3.75, 2.4
    A.box((0, 0, 0.12), (2 * hw + 0.24, 2 * hd + 0.24, 0.44), 'Stone', bev=0.07, segs=2)
    A.box((0, 0, 1.65), (2 * hw, 2 * hd, 2.8), 'Whitewash', bev=0.14, segs=2)
    A.merge(gable_infill(2 * hw - 0.06, 2 * hd - 0.02, 3.0, 5.5, 'Whitewash'))
    A.merge(gable_roof(8.1, -2.72, 2.85, 5.85, 8, ('RoofTile', 'RoofTileB'), 'RoofTileDark', ridge_r=0.16, kick=6,
                       barge='Timber', jitter=0.015, seed=8))
    # chimney (stone)
    cx = -2.9
    A.box((cx, 0.2, 5.4), (0.8, 0.8, 2.2), 'Stone', bev=0.06, segs=2)
    A.box((cx, 0.2, 6.55), (0.95, 0.95, 0.14), 'StoneDark', bev=0.03)
    A.cyl((cx, 0.2, 6.6), (cx, 0.2, 6.95), 0.13, 'RoofTile', segs=10, bev=0.02, r2=0.11)
    fy = -hd
    place(A, door(1.0, 2.0, 'DoorBlue', glass_top=True), (0, fy, 0.3))
    hood = gable_roof(0.7, -0.75, 0.0, 0.4, 2, ('RoofTile',), 'RoofTileDark', thick=0.07, ov=0.08, ridge_r=0.07)
    A.merge(hood, Matrix.Translation((0, fy - 0.34, 2.5)) @ rotz(90))
    for sx in (-1, 1):
        A.cyl((sx * 0.6, fy - 0.02, 2.15), (sx * 0.6, fy - 0.55, 2.53), 0.045, 'Timber', segs=6)
    A.box((0, fy - 0.33, 0.07), (1.6, 0.4, 0.24), 'StoneDark', bev=0.05, segs=2)
    roses(A, fy)
    for i, x in enumerate((-2.25, 2.25)):
        place(A, window(1.1, 1.1, shutters='ShutterBlue', flowerbox=True, sill='Stone', seed=10 + i,
                        flowers=('FlowerPink', 'FlowerLilac', 'FlowerWhite')), (x, fy, 1.7))
    for x in (-2.0, 2.0):
        place(A, window(1.0, 1.0, simple=True), (x, hd, 1.7), '+y')
    for sx, fc in ((1, '+x'), (-1, '-x')):
        # round attic window
        M = at((sx * hw, 0, 4.0), fc)
        rx = Matrix.Rotation(math.pi / 2, 4, 'X')
        A.add(L.bm_torus(0.32, 0.07, 16, 6), 'Timber', M @ Matrix.Translation((0, -0.02, 0)) @ rx, 50.0)
        A.add(L.bm_cyl(0.3, 0.05, 16), 'Glass', M @ rx, 50.0)
        A.add(L.bm_box(0.05, 0.05, 0.62), 'Timber', M @ Matrix.Translation((0, -0.04, 0)), 50.0)
        A.add(L.bm_box(0.62, 0.05, 0.05), 'Timber', M @ Matrix.Translation((0, -0.04, 0)), 50.0)
    place(A, window(0.9, 1.0, simple=True), (hw, 0.8, 1.7), '+x')
    gutter(A, -4.1, 4.1, -2.78, 2.78, 0.07)
    gutter(A, -4.1, 4.1, 2.78, 2.78, 0.07)
    downpipe(A, 3.55, -2.78, fy - 0.1, 2.72)
    return A


def roses(A, fy):
    rng = np.random.default_rng(21)
    m = S.Model()
    pts = []
    for t in np.linspace(0, 1, 26):
        a = math.pi * t
        x = -0.9 * math.cos(a)
        z = 0.25 + 2.5 * math.sin(a) ** 0.6 if 0.02 < t < 0.98 else 0.25
        pts.append((x * (1.0 + 0.05 * math.sin(7 * t)), fy - 0.16, z))
    first = True
    for p in pts:
        r = rng.uniform(0.16, 0.25)
        m.add(S.Sphere(p, r), 0.0 if first else 0.14)
        first = False
    for sx in (-1, 1):
        m.add(S.Ellipsoid((sx * 0.92, fy - 0.2, 0.3), (0.3, 0.22, 0.38)), 0.12)
    m.inter(S.Plane((0, fy + 0.02, 0), (0, 1, 0)), 0.05)
    A.add(L.sdf_bm(m, (-1.3, fy - 0.55, -0.1), (1.3, fy + 0.1, 3.0), 0.035, 600), 'LeafC', None, None)
    for i in range(15):
        p = pts[(i * 5) % len(pts)]
        off = rng.normal(0, 0.13, 3)
        q = L.march_out(m, (p[0] + off[0], fy - 0.05, p[2] + off[2]), (0, -1, 0), 0.01, 1.0)
        A.sphere((q[0], q[1] + 0.025, q[2]), rng.uniform(0.065, 0.09), 'RoseRed' if i % 3 else 'RosePink', u=7, v=4,
                 scale=(1, 0.8, 1))


# ===========================================================================
def rescue_building():
    A = Acc('RescueBuilding')
    hw, hd = 10.8, 3.2
    A.box((0, 0, 0.35), (2 * hw + 0.2, 2 * hd + 0.2, 0.9), 'Brick', bev=0.06, segs=2)
    A.box((0, 0, 2.15), (2 * hw, 2 * hd, 2.8), 'RescueWall', bev=0.1, segs=2)
    A.box((0, 0, 0.82), (2 * hw + 0.26, 2 * hd + 0.26, 0.1), 'Stone', bev=0.03)
    A.box((0, 0, 3.32), (2 * hw + 0.16, 2 * hd + 0.16, 0.18), 'WindowFrame', bev=0.04)
    A.merge(gable_infill(2 * hw - 0.06, 2 * hd - 0.02, 3.4, 4.82, 'RescueWall'))
    A.merge(gable_roof(22.3, -3.55, 3.45, 5.0, 4, ('Slate', 'SlateB'), 'SlateDark', ridge_r=0.14,
                       barge='WindowFrame', barge_w=0.2, jitter=0.008, seed=11))
    fy = -hd
    # civic false front with a stepped top
    pf = fy - 0.3                         # front plane of the false front
    py = pf + 0.25
    A.box((0, py, 2.95), (8.0, 0.5, 4.4), 'RescueWall', bev=0.08, segs=2)
    A.box((0, py, 5.2), (8.2, 0.62, 0.14), 'WindowFrame', bev=0.04)
    A.box((0, py, 5.5), (2.6, 0.5, 0.6), 'RescueWall', bev=0.06)
    A.box((0, py, 5.86), (2.8, 0.62, 0.12), 'WindowFrame', bev=0.04)
    for sx in (-1, 1):   # plinth on either side of the doors
        A.box((sx * 2.62, py, 0.35), (2.86, 0.6, 0.9), 'Brick', bev=0.05, segs=2)
    # paw print in the stepped top
    pz = 5.45
    A.sphere((0, pf - 0.02, pz - 0.04), 0.13, 'RescueTeal', u=10, v=6, scale=(1.15, 0.25, 0.9))
    for dx, dz in ((-0.2, 0.1), (-0.07, 0.17), (0.07, 0.17), (0.2, 0.1)):
        A.sphere((dx, pf - 0.02, pz + dz), 0.055, 'RescueTeal', u=8, v=5, scale=(1, 0.3, 1.2))
    # sign 7.0 x 1.6
    sx0, sx1, sz0, sz1 = -3.5, 3.5, 3.15, 4.75
    A.frame((0, pf - 0.06, (sz0 + sz1) / 2), 7.24, 1.84, 0.12, 0.12, 'RescueTeal', bev=0.03)
    sign_panel(A, sx0, sx1, sz0, sz1, pf - 0.08, 0.08, 'SignFace', 'TimberLight')
    # entrance: landing, glass double doors, canopy
    A.box((0, pf - 0.2, 0.13), (3.4, 0.42, 0.36), 'StoneDark', bev=0.05, segs=2)
    dz0 = 0.31
    A.frame((0, pf - 0.05, dz0 + 1.2), 2.2, 2.4, 0.1, 0.1, 'RescueTeal', bev=0.02)
    A.box((0, pf - 0.02, dz0 + 1.2), (2.05, 0.04, 2.25), 'Glass', bev=0.0)
    A.box((0, pf - 0.06, dz0 + 1.2), (0.08, 0.06, 2.25), 'RescueTeal', bev=0.0)
    A.box((0, pf - 0.06, dz0 + 0.12), (2.05, 0.06, 0.2), 'RescueTeal', bev=0.0)
    for sx in (-1, 1):
        A.cyl((sx * 0.18, pf - 0.12, dz0 + 1.05), (sx * 0.62, pf - 0.12, dz0 + 1.05), 0.025, 'Chrome', segs=6)
    A.box((0, pf - 0.23, 2.86), (3.0, 0.46, 0.12), 'RescueTeal', bev=0.04, segs=2)
    for sx in (-1, 1):
        A.cyl((sx * 1.3, pf - 0.02, 2.45), (sx * 1.3, pf - 0.42, 2.82), 0.04, 'Metal', segs=6)
        lantern(A, (sx * 1.55, pf, 2.0))
    # planters with shrubs either side of the door
    shrub = shrub_bm()
    for sx in (-1, 1):
        A.box((sx * 4.55, fy - 0.3, 0.3), (0.9, 0.5, 0.6), 'Brick', bev=0.04)
        A.box((sx * 4.55, fy - 0.3, 0.58), (0.8, 0.4, 0.06), 'Soil', bev=0.0)
        A.add(shrub.copy(), 'LeafA', trs((sx * 4.55, fy - 0.3, 0.55)), None)
    shrub.free()
    # windows: 3 each side on the front, 5 at the back, one per gable end
    for x in (5.9, 7.9, 9.9):
        for s in (-1, 1):
            place(A, window(1.5, 1.45, frame='RescueTeal', sill='WindowFrame', lintel=None), (s * x, fy, 2.0))
    for x in (-8.0, -4.0, 0.0, 4.0, 8.0):
        place(A, window(1.3, 1.2, frame='RescueTeal', sill='WindowFrame', lintel=None, simple=True), (x, hd, 2.05), '+y')
    for sx, fc in ((1, '+x'), (-1, '-x')):
        place(A, window(1.2, 1.2, frame='RescueTeal', sill='WindowFrame', lintel=None), (sx * hw, 0, 2.05), fc)
    gutter(A, -11.15, -4.15, -3.6, 3.36, 0.08)
    gutter(A, 4.15, 11.15, -3.6, 3.36, 0.08)
    gutter(A, -11.15, 11.15, 3.6, 3.36, 0.08)
    for sx in (-1, 1):
        downpipe(A, sx * 10.5, -3.6, fy - 0.1, 3.3)
    return A


def shrub_bm():
    m = S.Model()
    rng = np.random.default_rng(4)
    m.add(S.Ellipsoid((0, 0, 0.3), (0.38, 0.26, 0.3)))
    for i in range(5):
        a = 2 * math.pi * i / 5
        m.add(S.Sphere((0.24 * math.cos(a), 0.12 * math.sin(a), 0.32 + rng.uniform(0, 0.15)), 0.17), 0.08)
    m.inter(S.Plane((0, 0, 0.02), (0, 0, -1)))
    return L.sdf_bm(m, (-0.5, -0.4, -0.02), (0.5, 0.4, 0.75), 0.03, 500)
