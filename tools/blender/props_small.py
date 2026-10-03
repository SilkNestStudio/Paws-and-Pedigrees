"""Vehicles, signs, fences and small yard props for props.glb.

Blender frame: Z up, the prop front faces -Y (+Z in three.js).
"""
import math

import numpy as np
from mathutils import Matrix, Vector

import prop_lib as L
import sdf_lib as S
from prop_lib import Acc, trs
from props_arch import frame_cols, gable_roof, rotz, sign_panel


# ===========================================================================
# Van (front at -Y)
# ===========================================================================
def van_body_model():
    m = S.Model()
    m.add(S.RoundBox((0, 0.35, 1.18), (0.96, 1.9, 0.8), 0.42))
    m.add(S.RoundBox((0, -1.72, 0.8), (0.94, 0.58, 0.44), 0.36), 0.35)
    n = np.array([0, -0.8, 0.6])
    n = n / np.linalg.norm(n)
    o = np.array([0, -1.45, 1.35])

    def cut(P):  # region above the bonnet and in front of the windscreen plane
        return np.maximum(-((P - o) @ n), 1.22 - P[:, 2])
    m.sub(S.Func(cut, (-1.2, -2.6, 1.1), (1.2, -0.5, 2.2)), 0.12)
    for yc in (-1.42, 1.5):
        def arch(P, yc=yc):
            return np.sqrt((P[:, 1] - yc) ** 2 + (P[:, 2] - 0.4) ** 2) - 0.5
        m.sub(S.Func(arch, (-1.2, yc - 0.6, -0.2), (1.2, yc + 0.6, 1.0)), 0.06)
    m.inter(S.Plane((0, 0, 0.34), (0, 0, -1)), 0.04)
    return m


def shell(body, regions, offset=0.014, k=0.02, depth=0.045):
    """Thin decal-like piece hugging `body`: union of regions intersected with a shell between
    `depth` inside and `offset` outside the body surface (no hidden interior geometry)."""
    m = S.Model()
    for r in regions:
        m.add(r)
    m.inter(S.Func(lambda P: np.abs(body.eval(P) - (offset - depth) / 2) - (offset + depth) / 2,
                   (-9, -9, -9), (9, 9, 9)), k)
    return m


def van():
    A = Acc('Van')
    body = van_body_model()
    lo, hi = (-1.05, -2.42, 0.3), (1.05, 2.4, 2.06)
    A.add(L.sdf_bm(body, lo, hi, 0.03, 1750), 'VanBody', None, None)
    # windscreen, cab side windows, rear windows
    n = Vector((0, -0.8, 0.6)).normalized()
    up = Vector((0, 0.6, 0.8))
    R = np.array(frame_cols(Vector((1, 0, 0)), n, up).to_3x3())
    ws = S.RoundBox((0, -1.27, 1.63), (0.8, 0.3, 0.3), 0.12, R)
    win = shell(body, [ws])
    A.add(L.sdf_bm(win, (-1.0, -1.75, 1.25), (1.0, -0.85, 2.0), 0.014, 250), 'Glass', None, 60.0)
    side = shell(body, [S.RoundBox((sx * 1.0, -0.95, 1.6), (0.3, 0.42, 0.26), 0.1) for sx in (-1, 1)])
    A.add(L.sdf_bm(side, (-1.05, -1.45, 1.25), (1.05, -0.45, 1.95), 0.014, 250), 'Glass', None, 60.0)
    rear = shell(body, [S.RoundBox((sx * 0.45, 2.3, 1.55), (0.3, 0.3, 0.26), 0.08) for sx in (-1, 1)])
    A.add(L.sdf_bm(rear, (-0.9, 1.9, 1.2), (0.9, 2.4, 1.9), 0.014, 200), 'Glass', None, 60.0)
    # cream roof cap and belt line
    cap = shell(body, [S.Func(lambda P: np.maximum(1.86 - P[:, 2], -0.92 - P[:, 1]), (-2, -3, 1.7), (2, 3, 2.2))],
                0.01, 0.03)
    A.add(L.sdf_bm(cap, (-1.05, -1.0, 1.7), (1.05, 2.4, 2.06), 0.015, 400), 'VanCream', None, None)
    belt = shell(body, [S.RoundBox((0, 0.0, 1.12), (1.3, 2.6, 0.065), 0.02)], 0.009, 0.01)
    A.add(L.sdf_bm(belt, (-1.05, -2.42, 0.95), (1.05, 2.4, 1.2), 0.012, 400), 'VanCream', None, 60.0)
    # wheels
    tyre = [(0, -0.13), (0.3, -0.13), (0.37, -0.12), (0.4, -0.07), (0.4, 0.07), (0.37, 0.12), (0.3, 0.13), (0, 0.13)]
    hub = [(0, 0.12), (0.21, 0.12), (0.2, 0.15), (0.13, 0.175), (0, 0.18)]
    for sx in (-1, 1):
        for yc in (-1.42, 1.5):
            M = Matrix.Translation((sx * 0.83, yc, 0.4)) @ Matrix.Rotation(sx * math.pi / 2, 4, 'Y')
            A.add(L.bm_lathe(tyre, 14), 'Tyre', M, 70.0)
            A.add(L.bm_lathe(hub, 12), 'VanCream', M, 70.0)
            A.add(L.bm_cyl(0.05, 0.04, 8), 'Chrome', M @ Matrix.Translation((0, 0, 0.18)), 50.0)
    # bumpers, grille, lights, plates
    A.box((0, -2.33, 0.48), (1.95, 0.22, 0.2), 'Chrome', bev=0.07, segs=1)
    A.box((0, 2.37, 0.48), (1.95, 0.18, 0.2), 'Chrome', bev=0.06, segs=1)
    yfront = L.march_out(body, (0, -1.6, 0.8), (0, -1, 0), 0.005)[1]
    A.box((0, yfront + 0.005, 0.78), (0.62, 0.06, 0.32), 'Metal', bev=0.05, segs=2)
    for z in (0.7, 0.78, 0.86):
        A.box((0, yfront - 0.03, z), (0.56, 0.03, 0.03), 'Chrome', bev=0.0)
    for sx in (-1, 1):
        p = L.march_out(body, (sx * 0.6, -1.6, 0.88), (0, -1, 0), 0.005)
        A.sphere((p[0], p[1] + 0.03, p[2]), 0.14, 'Headlight', u=12, v=6, scale=(1, 0.45, 1))
        rx = Matrix.Rotation(math.pi / 2, 4, 'X')
        A.add(L.bm_torus(0.145, 0.03, 10, 4), 'Chrome', Matrix.Translation((p[0], p[1] + 0.01, p[2])) @ rx, 70.0)
        q = L.march_out(body, (sx * 0.78, 1.8, 0.78), (0, 1, 0), 0.005)
        A.box((q[0], q[1] - 0.01, q[2]), (0.16, 0.05, 0.22), 'TailLight', bev=0.03)
        # mirrors and door handles
        A.cyl((sx * 0.93, -1.38, 1.3), (sx * 1.06, -1.42, 1.42), 0.025, 'Metal', segs=6)
        A.box((sx * 1.08, -1.43, 1.5), (0.06, 0.15, 0.2), 'VanBody', bev=0.025, segs=2)
        A.box((sx * 0.985, -0.55, 1.18), (0.04, 0.16, 0.04), 'Chrome', bev=0.012)
    A.box((0, -2.45, 0.48), (0.48, 0.03, 0.13), 'Plate', bev=0.01)
    A.box((0, 2.465, 0.48), (0.48, 0.03, 0.13), 'Plate', bev=0.01)
    # roof rack with a crate
    for sx in (-1, 1):
        A.cyl((sx * 0.72, -0.75, 2.14), (sx * 0.72, 2.0, 2.14), 0.03, 'Metal', segs=6)
        for y in (-0.6, 1.85):
            A.cyl((sx * 0.72, y, 1.95), (sx * 0.72, y, 2.14), 0.025, 'Metal', segs=6)
    for y in (-0.6, 0.25, 1.1, 1.85):
        A.cyl((-0.75, y, 2.14), (0.75, y, 2.14), 0.025, 'Metal', segs=6)
    A.box((-0.05, 0.9, 2.36), (0.95, 0.65, 0.4), 'WoodLight', bev=0.03)
    for y in (0.62, 1.18):
        A.box((-0.05, y, 2.36), (0.98, 0.05, 0.43), 'TimberLight', bev=0.01)
    return A


# ===========================================================================
def noticeboard():
    A = Acc('Noticeboard')
    rng = np.random.default_rng(7)
    for sx in (-1, 1):
        A.box((sx * 0.88, 0, 1.02), (0.14, 0.14, 2.14), 'Timber', bev=0.03, segs=2)
    A.box((0, 0.01, 1.38), (1.62, 0.08, 1.12), 'BoardWood', bev=0.02)
    A.frame((0, -0.02, 1.38), 1.68, 1.18, 0.08, 0.11, 'Timber', bev=0.02)
    A.box((0, -0.05, 1.38), (1.54, 0.03, 1.04), 'Cork', bev=0.0)
    A.box((0, 0.0, 1.99), (1.95, 0.12, 0.1), 'Timber', bev=0.02)
    roof = gable_roof(2.1, -0.34, 0.0, 0.22, 1, ('Slate',), 'SlateDark', thick=0.06, ov=0.0, ridge_r=0.05)
    A.merge(roof, Matrix.Translation((0, 0, 2.03)))
    notes = [(-0.5, 1.6, 0.34, 0.38, 'Paper'), (-0.08, 1.62, 0.3, 0.28, 'PaperYellow'),
             (0.42, 1.55, 0.38, 0.42, 'PaperBlue'), (-0.42, 1.12, 0.36, 0.3, 'PaperPink'),
             (0.12, 1.12, 0.32, 0.38, 'Paper')]
    for i, (x, z, w, h, mat) in enumerate(notes):
        a = rng.uniform(-0.12, 0.12)
        M = trs((x, -0.068, z), (0, a, 0))
        A.add(L.bm_box(w, 0.006, h), mat, M, 50.0)
        if i == 2:  # "lost dog" poster: photo block and lines
            A.add(L.bm_box(w * 0.6, 0.004, h * 0.4), 'Ink', M @ Matrix.Translation((0, -0.005, h * 0.12)), 50.0)
            lines = (-0.2, -0.3)
        else:
            lines = (0.15, 0.0, -0.15)
        for lz in lines:
            A.add(L.bm_box(w * 0.65, 0.004, 0.018), 'Ink', M @ Matrix.Translation((0, -0.005, lz * h)), 50.0)
        A.sphere((x + math.sin(a) * h * 0.42, -0.08, z + math.cos(a) * h * 0.42), 0.02, 'Pin', u=8, v=5)
    return A


# ===========================================================================
def chain(A, top, bottom, n=3):
    top, bottom = Vector(top), Vector(bottom)
    for i in range(n):
        c = top.lerp(bottom, (i + 0.5) / n)
        rot = Matrix.Rotation(math.pi / 2, 4, 'X') if i % 2 else Matrix.Rotation(math.pi / 2, 4, 'Y')
        sz = (bottom - top).length / n
        A.add(L.bm_torus(sz * 0.42, 0.012, 10, 5), 'Metal',
              Matrix.Translation(c) @ rot @ Matrix.Diagonal((0.6, 1.0, 1.0, 1.0)) if i % 2 else
              Matrix.Translation(c) @ rot @ Matrix.Diagonal((1.0, 0.6, 1.0, 1.0)), 70.0)


def post(A, x, h, w=0.24, mat='Timber'):
    A.box((x, 0, h / 2 - 0.08), (w, w, h + 0.16), mat, bev=0.04, segs=2)
    A.box((x, 0, h + 0.04), (w + 0.08, w + 0.08, 0.1), mat, bev=0.03)
    A.sphere((x, 0, h + 0.17), 0.1, mat, u=10, v=6)


def gate_sign():
    A = Acc('GateSign')
    for sx in (-1, 1):
        post(A, sx * 1.85, 2.65)
        A.cyl((sx * 1.73, 0, 2.05), (sx * 1.35, 0, 2.43), 0.05, 'Timber', segs=6)
    A.box((0, 0, 2.47), (4.1, 0.18, 0.2), 'Timber', bev=0.04, segs=2)
    # board: SignFace on both faces, framed
    x0, x1, z0, z1 = -1.5, 1.5, 0.95, 1.85
    sign_panel(A, x0, x1, z0, z1, -0.035, 0.07, 'SignFace', 'TimberLight', back=True)
    A.frame((0, 0, 1.4), 3.2, 1.1, 0.1, 0.13, 'Timber', bev=0.02)
    for sx in (-1, 1):
        chain(A, (sx * 1.2, 0, 2.37), (sx * 1.2, 0, 1.95), 3)
        A.cyl((sx * 1.2, 0, 1.97), (sx * 1.2, 0, 1.9), 0.03, 'Metal', segs=6)
    return A


def field_gate():
    A = Acc('FieldGate')
    rng = np.random.default_rng(2)
    for sx in (-1, 1):
        x = sx * 1.5
        for k in range(4):
            z = -0.05 + 0.25 + k * 0.49
            A.box((x + rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02), z), (0.62, 0.62, 0.47),
                  'Stone' if k % 2 == 0 else 'StoneDark', bev=0.07, segs=2,
                  rot=(0, 0, rng.uniform(-0.05, 0.05)))
        A.box((x, 0, 1.98), (0.78, 0.78, 0.16), 'Stone', bev=0.04, segs=2)
        A.box((sx * 1.58, 0, 2.62), (0.16, 0.16, 1.12), 'Timber', bev=0.03)
    # lintel board 3.0 x 0.6, SignFace on both faces
    x0, x1, z0, z1 = -1.43, 1.43, 2.52, 2.98
    sign_panel(A, x0, x1, z0, z1, -0.035, 0.07, 'SignFace', 'TimberLight', back=True)
    A.frame((0, 0, 2.75), 3.0, 0.6, 0.07, 0.12, 'Timber', bev=0.015)
    A.box((0, 0, 3.22), (3.5, 0.3, 0.07), 'SlateDark', bev=0.02)
    # five-bar gate swung open ~85 degrees into the field (+Y in Blender = -Z in three.js)
    G = Acc('gate')
    G.box((0.08, 0, 0.72), (0.11, 0.09, 1.28), 'FenceWood', bev=0.02)
    G.box((2.28, 0, 0.72), (0.09, 0.08, 1.2), 'FenceWood', bev=0.02)
    for i, z in enumerate((0.22, 0.48, 0.74, 0.99, 1.24)):
        G.box((1.18, 0, z), (2.2, 0.05 if i < 4 else 0.08, 0.1 if i < 4 else 0.12), 'FenceWood', bev=0.015)
    ln = math.hypot(2.1, 1.0)
    G.add(L.bm_box(ln, 0.045, 0.09, 0.012), 'FenceWood', trs((1.18, 0.03, 0.73), (0, -math.atan2(1.0, 2.1), 0)), 50.0)
    for z in (0.48, 0.99):
        G.box((0.3, -0.035, z), (0.45, 0.02, 0.05), 'Metal', bev=0.0)
    G.box((2.33, -0.04, 0.99), (0.12, 0.03, 0.05), 'Metal', bev=0.0)
    A.merge(G, Matrix.Translation((-1.17, 0.0, 0.0)) @ rotz(85))
    for z in (0.48, 0.99):
        A.cyl((-1.17, 0, z - 0.06), (-1.17, 0, z + 0.06), 0.03, 'Metal', segs=6)
    return A


# ===========================================================================
def fence_section():
    A = Acc('FenceSection')
    rng = np.random.default_rng(5)
    for x in (-1.5, 0.0, 1.5):
        A.cyl((x, 0, -0.08), (x, 0, 1.1), 0.085, 'FenceWood', segs=8, bev=0.03)
    for z in (0.36, 0.7, 1.0):
        rot = (0, rng.uniform(-0.012, 0.012), rng.uniform(-0.012, 0.012))
        A.box((0, 0, z), (3.0, 0.07, 0.13), 'FenceWood', bev=0.02, rot=rot)
    return A


# ===========================================================================
def tent():
    A = Acc('Tent')
    hw, hd, ze, zr = 2.0, 1.5, 2.1, 3.0
    for sx in (-1, 1):
        for sy in (-1, 1):
            A.cyl((sx * (hw - 0.05), sy * (hd - 0.05), -0.05), (sx * (hw - 0.05), sy * (hd - 0.05), ze), 0.045,
                  'TentPole', segs=8)
        A.cyl((sx * (hw - 0.05), 0, -0.05), (sx * (hw - 0.05), 0, zr + 0.12), 0.05, 'TentPole', segs=8)
        A.sphere((sx * (hw - 0.05), 0, zr + 0.2), 0.08, 'TentPole', u=8, v=6)
    # flag on the right finial
    A.cyl((hw - 0.05, 0, zr + 0.2), (hw - 0.05, 0, zr + 0.75), 0.018, 'TentPole', segs=6)
    A.prism([(0, 0), (-0.38, 0.11), (0, 0.22)], 0.015, 'TentStripeA', trs((hw - 0.05, 0, zr + 0.5)))
    stripes = 8
    sw = 2 * hw / stripes
    # canopy slopes, stripes running down the slope
    for side in (-1, 1):
        horiz = hd + 0.08
        rise = zr - ze + 0.05
        Ls = math.hypot(horiz, rise)
        ang = math.atan2(rise, horiz)
        s = Vector((0, side * math.cos(ang), -math.sin(ang)))
        n = Vector((0, side * math.sin(ang), math.cos(ang)))
        R = frame_cols(Vector((1, 0, 0)), s, Vector((1, 0, 0)).cross(s))
        for i in range(stripes):
            x = -hw + (i + 0.5) * sw
            c = Vector((x, 0, zr)) + s * (Ls / 2) + n * 0.03
            A.add(L.bm_box(sw + 0.002, Ls + 0.04, 0.035 + 0.006 * (i % 2), 0.0),
                  'TentStripeA' if i % 2 == 0 else 'TentStripeB',
                  Matrix.Translation(c) @ R, 50.0)
        # scalloped valance along this eave
        yv = side * (hd + 0.08)
        for i in range(stripes):
            x = -hw + (i + 0.5) * sw
            pts = [(sw / 2 * math.cos(a), -0.22 * math.sin(a)) for a in np.linspace(0, math.pi, 7)]
            pts = [(-sw / 2, 0.06)] + pts[::-1] + [(sw / 2, 0.06)]
            A.prism([(p[0], p[1]) for p in pts], 0.02, 'TentStripeB' if i % 2 == 0 else 'TentStripeA',
                    trs((x, yv, ze - 0.09)))
    # gable ends (x = +-hw), vertical stripes
    nseg = 6
    for sx in (-1, 1):
        for k in range(nseg):
            ya = -hd + k * (2 * hd / nseg)
            yb = ya + 2 * hd / nseg

            def zt(y):
                return zr - (zr - ze) * abs(y) / hd
            pts = [(ya, ze), (yb, ze), (yb, zt(yb)), (ya, zt(ya))]
            if ya < 0 < yb:
                pts = [(ya, ze), (yb, ze), (yb, zt(yb)), (0.0, zr), (ya, zt(ya))]
            A.prism(pts, 0.03 + 0.006 * (k % 2), 'TentStripeA' if k % 2 == 0 else 'TentStripeB',
                    Matrix.Translation((sx * (hw - 0.03), 0, 0)) @ rotz(90))
            # side wall below the gable
            A.box((sx * (hw - 0.04), (ya + yb) / 2, ze / 2 - 0.01), (0.025 + 0.006 * (k % 2), yb - ya + 0.002, ze - 0.02),
                  'TentStripeB' if k % 2 == 0 else 'TentStripeA', bev=0.0)
        # side valance
        for k in range(nseg):
            y = -hd + (k + 0.5) * (2 * hd / nseg)
            w = 2 * hd / nseg
            pts = [(w / 2 * math.cos(a), -0.2 * math.sin(a)) for a in np.linspace(0, math.pi, 7)]
            pts = [(-w / 2, 0.06)] + pts[::-1] + [(w / 2, 0.06)]
            A.prism(pts, 0.02, 'TentStripeA' if k % 2 == 0 else 'TentStripeB',
                    Matrix.Translation((sx * (hw + 0.0), y, ze - 0.02)) @ rotz(90))
    # back wall
    for i in range(stripes):
        x = -hw + (i + 0.5) * sw
        A.box((x, hd - 0.04, ze / 2 - 0.015), (sw + 0.002, 0.025 + 0.006 * (i % 2), ze - 0.03),
              'TentStripeA' if i % 2 == 0 else 'TentStripeB', bev=0.0)
    # tied-back front curtains
    for sx in (-1, 1):
        A.add(L.bm_lathe([(0, 0.0), (0.14, 0.0), (0.1, 0.9), (0.07, 1.25), (0.16, 1.7), (0.2, 2.06), (0, 2.08)], 10),
              'TentStripeB', trs((sx * (hw - 0.2), -hd + 0.08, 0.0)), 70.0)
        A.add(L.bm_torus(0.085, 0.025, 10, 5), 'TentStripeA', trs((sx * (hw - 0.2), -hd + 0.08, 1.1)), 70.0)
    return A


# ===========================================================================
def bench():
    A = Acc('Bench')
    for y in (-0.16, 0.0, 0.16):
        A.box((0, y, 0.46), (1.8, 0.13, 0.05), 'TimberLight', bev=0.015, segs=2)
    for z in (0.66, 0.86):
        A.box((0, 0.27 + (z - 0.66) * 0.2, z), (1.8, 0.05, 0.14), 'TimberLight', bev=0.015, segs=2,
              rot=(math.radians(-12), 0, 0))
    for sx in (-1, 1):
        x = sx * 0.72
        A.box((x, -0.2, 0.22), (0.08, 0.08, 0.46), 'Timber', bev=0.015)
        A.add(L.bm_box(0.08, 0.08, 0.98, 0.015), 'Timber', trs((x, 0.24, 0.47), (math.radians(-10), 0, 0)), 50.0)
        A.box((x, 0.02, 0.41), (0.07, 0.5, 0.07), 'Timber', bev=0.015)
        A.box((x, 0.02, 0.13), (0.06, 0.46, 0.05), 'Timber', bev=0.01)
        A.box((sx * 0.86, -0.0, 0.68), (0.09, 0.52, 0.05), 'Timber', bev=0.015, segs=2)
        A.box((sx * 0.86, -0.2, 0.57), (0.06, 0.06, 0.22), 'Timber', bev=0.01)
    return A


# ===========================================================================
def dummy():
    """Held item: origin at the canvas body's centre, long axis X."""
    A = Acc('Dummy')
    r, half = 0.046, 0.2
    prof = [(0, -half)]
    for a in np.linspace(math.pi / 2, 0, 5)[1:]:
        prof.append((r * math.cos(a), -half + r - r * math.sin(a)))
    for a in np.linspace(0, math.pi / 2, 5)[:-1]:
        prof.append((r * math.cos(a), half - r + r * math.sin(a)))
    prof.append((0, half))
    toX = Matrix.Rotation(math.pi / 2, 4, 'Y')
    A.add(L.bm_lathe(prof, 16), 'DummyCanvas', toX, 70.0)
    A.add(L.bm_lathe([(0, -0.03), (r + 0.004, -0.03), (r + 0.004, 0.03), (0, 0.03)], 16), 'DummyBand',
          toX, 70.0)
    # stitched end caps (thin bands) and rope toggle on +X
    for x in (-half + 0.035, half - 0.035):
        A.add(L.bm_lathe([(0, -0.004), (r + 0.002, -0.004), (r + 0.002, 0.004), (0, 0.004)], 16), 'DummyRope',
              Matrix.Translation((x, 0, 0)) @ toX, 70.0)
    A.cyl((half - 0.01, 0, 0), (half + 0.04, 0, 0), 0.009, 'DummyRope', segs=6)
    A.sphere((half + 0.045, 0, 0), 0.016, 'DummyRope', u=8, v=6)
    A.add(L.bm_torus(0.035, 0.008, 14, 5), 'DummyRope',
          Matrix.Translation((half + 0.09, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'), 70.0)
    return A


def scent_box():
    A = Acc('ScentBox')
    w, d, h = 0.6, 0.42, 0.32
    A.box((0, 0, h / 2), (w, d, h), 'WoodLight', bev=0.02, segs=2)
    A.box((0, 0, h + 0.003), (w - 0.07, d - 0.07, 0.02), 'Timber', bev=0.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            A.box((sx * (w / 2 - 0.005), sy * (d / 2 - 0.005), (h + 0.045) / 2), (0.05, 0.05, h + 0.045),
                  'TimberLight', bev=0.01)
    # slotted lid: rim + slats with gaps
    for sy in (-1, 1):
        A.box((0, sy * (d / 2 - 0.03), h + 0.025), (w + 0.01, 0.06, 0.03), 'TimberLight', bev=0.008)
    for sx in (-1, 1):
        A.box((sx * (w / 2 - 0.03), 0, h + 0.024), (0.06, d - 0.12, 0.028), 'TimberLight', bev=0.008)
    n = 5
    for i in range(n):
        x = -w / 2 + 0.08 + i * (w - 0.16) / (n - 1)
        A.box((x, 0, h + 0.025), (0.055, d - 0.1, 0.025), 'WoodLight', bev=0.006)
    for sx in (-1, 1):
        A.sphere((sx * (w / 2 + 0.005), 0, h * 0.7), 0.05, 'Timber', u=10, v=6, scale=(0.25, 1.3, 0.55))
    A.sphere((0, -d / 2 - 0.003, h * 0.5), 0.05, 'Timber', u=10, v=6, scale=(1, 0.15, 1))
    return A


def bowl(name, mat, water=False):
    A = Acc(name)
    prof = [(0, 0.0), (0.27, 0.0), (0.3, 0.02), (0.3, 0.05), (0.255, 0.15), (0.24, 0.17), (0.225, 0.177),
            (0.21, 0.168), (0.195, 0.06), (0.18, 0.045), (0, 0.045)]
    A.add(L.bm_lathe(prof, 32), mat, None, 55.0)
    if water:
        A.add(L.bm_cyl(0.203, 0.012, 32), 'Water', trs((0, 0, 0.128)), 50.0)
    return A


def bales():
    A = Acc('Bales')
    rng = np.random.default_rng(9)
    for (x, y, z, rz) in ((0.0, 0.0, 0.21, 0.0), (0.07, 0.04, 0.63, math.radians(9))):
        M = trs((x, y, z), (0, 0, rz))
        A.add(L.bm_box(1.0, 0.5, 0.42, 0.07, 3), 'Hay', M, 50.0)
        for bx in (-0.25, 0.25):
            A.add(L.bm_frame(0.515, 0.435, 0.012, 0.03), 'Twine', M @ Matrix.Translation((bx, 0, 0)) @ rotz(90), 50.0)
        for i in range(5):
            sx = 1 if i % 2 else -1
            p0 = Vector((sx * 0.48, rng.uniform(-0.18, 0.18), rng.uniform(-0.15, 0.15)))
            d = Vector((sx, rng.uniform(-0.6, 0.6), rng.uniform(-0.3, 0.6))).normalized()
            pts = [p0, p0 + d * 0.06, p0 + d * 0.12]
            A.add(L.bm_tube(pts, [0.012, 0.008, 0.0], 4, 0.5), 'HayDark', M, None)
    return A
