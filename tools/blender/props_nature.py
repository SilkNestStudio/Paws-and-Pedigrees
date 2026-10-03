"""Trees, shrubs, flowers, rocks and grass for props.glb (SDF + surface nets).

Canopies are smooth unions of ellipsoid lobes plus small "puffs" placed on the
surface; each face takes the colour of its nearest lobe, so colour changes sit
in the creases between lobes.
"""
import math

import numpy as np
from mathutils import Matrix, Vector

import prop_lib as L
import sdf_lib as S
from prop_lib import Acc, trs


def ground_cut(m, z=-0.08):
    m.inter(S.Plane((0, 0, z), (0, 0, -1)))


def trunk_model(chain_pts, radii, roots, branches, root_r=(0.26, 0.09), k_root=0.32):
    m = S.Model()
    m.add(S.Chain(chain_pts, radii, 0.1))
    base = np.array(chain_pts[0]) + np.array([0, 0, 0.5])
    for a, ln in roots:
        tip = np.array([math.cos(a) * ln, math.sin(a) * ln, -0.06])
        m.add(S.RoundCone(base, tip, root_r[0], root_r[1]), k_root)
    for pts, rr in branches:
        m.add(S.Chain(pts, rr, 0.06), 0.12)
    ground_cut(m)
    return m


def canopy(A, lobes, mats, puffs=10, puff_r=(0.45, 0.65), seed=0, k=0.5, centre=None, up_bias=0.2,
           h=0.075, tris=(1900, 800, 600), pad=0.9):
    """Main mass (all lobes + some puffs) in mats[0]; highlight clumps on top in mats[1] and
    shade clumps low on the sides in mats[2] are separate meshes, so every colour change is a
    smooth intersection curve.  lobes: [(centre, radii, _)].  Returns the main model."""
    rng = np.random.default_rng(seed)
    base = S.Model()
    for c, r, _ in lobes:
        base.add(S.Ellipsoid(c, r if hasattr(r, '__len__') else (r, r, r)), k)
    main = S.Model()
    for c, r, _ in lobes:
        main.add(S.Ellipsoid(c, r if hasattr(r, '__len__') else (r, r, r)), k)
    cen = np.mean([c for c, _, _ in lobes], 0) if centre is None else np.array(centre)
    groups = {1: [], 2: []}
    for i in range(puffs):
        d = rng.normal(0, 1, 3)
        d[2] = abs(d[2]) * 0.7 + up_bias
        d /= np.linalg.norm(d)
        q = L.march_out(base, cen, d, 0.05, 12)
        r = rng.uniform(*puff_r)
        sph = S.Sphere(q - d * r * 0.5, r)
        if d[2] > 0.55:
            r *= 1.35
            sph = S.Sphere(q - d * r * 0.72, r)
            groups[1].append(sph)
        elif len(mats) > 2 and i % 2 == 0:
            groups[2].append(sph)
        else:
            main.add(sph, 0.2)
    lo, hi = bounds_of(lobes, pad)
    A.add(L.sdf_bm(main, lo, hi, h, tris[0]), mats[0], None, None)
    for gi in (1, 2):
        g = groups[gi]
        if not g:
            continue
        m = S.Model()
        for sph in g:
            m.add(sph, 0.25)
        glo = np.min([sp.c - sp.r for sp in g], 0) - 0.1
        ghi = np.max([sp.c + sp.r for sp in g], 0) + 0.1
        A.add(L.sdf_bm(m, tuple(glo), tuple(ghi), h * 0.8, tris[gi]), mats[gi], None, None)
    return main


def bounds_of(lobes, pad=0.9):
    lo = np.min([np.array(c) - (np.array(r) if hasattr(r, '__len__') else r) for c, r, _ in lobes], 0) - pad
    hi = np.max([np.array(c) + (np.array(r) if hasattr(r, '__len__') else r) for c, r, _ in lobes], 0) + pad
    return tuple(lo), tuple(hi)


# ===========================================================================
def tree_oak():
    A = Acc('TreeOak')
    roots = [(a, 0.95 + 0.15 * math.sin(3 * a)) for a in np.linspace(0, 2 * math.pi, 6)[:-1] + 0.3]
    branches = [
        ([(0.1, 0.05, 2.4), (1.3, 0.4, 3.9), (2.0, 0.5, 4.6)], [0.22, 0.14, 0.09]),
        ([(0.05, 0.0, 2.5), (-1.2, -0.3, 4.0), (-1.9, -0.4, 4.7)], [0.22, 0.14, 0.09]),
        ([(0.1, 0.05, 2.9), (0.3, 1.2, 4.3)], [0.18, 0.1]),
        ([(0.1, 0.0, 3.0), (0.0, -1.1, 4.4)], [0.18, 0.1]),
    ]
    t = trunk_model([(0, 0, -0.1), (0.05, 0, 1.2), (0.1, 0.05, 2.4), (0.15, 0.05, 3.4)], [0.44, 0.34, 0.3, 0.22],
                    roots, branches)
    A.add(L.sdf_bm(t, (-1.4, -1.4, -0.1), (2.4, 1.6, 5.0), 0.045, 1100), 'Bark', None, None)
    lobes = [((0.1, 0.0, 5.7), (2.5, 2.4, 2.0), 0), ((1.9, 0.4, 5.1), (1.7, 1.6, 1.4), 2),
             ((-1.8, -0.3, 5.3), (1.7, 1.7, 1.45), 2), ((0.3, 1.8, 5.2), (1.6, 1.5, 1.35), 0),
             ((-0.4, -1.8, 5.0), (1.6, 1.5, 1.35), 2), ((0.6, 0.5, 7.0), (1.6, 1.6, 1.4), 1),
             ((-1.0, 0.7, 6.6), (1.3, 1.3, 1.2), 1), ((1.3, -1.0, 6.4), (1.3, 1.3, 1.2), 0),
             ((-0.9, -1.0, 6.5), (1.2, 1.2, 1.1), 1)]
    canopy(A, lobes, ('LeafA', 'LeafB', 'LeafC'), puffs=16, seed=1, centre=(0, 0, 5.7), tris=(1500, 800, 500))
    return A


def tree_oak2():
    A = Acc('TreeOak2')
    roots = [(a, 0.8) for a in np.linspace(0, 2 * math.pi, 5)[:-1] + 0.6]
    branches = [
        ([(0.5, 0.1, 2.8), (1.3, 0.2, 4.0), (1.7, 0.3, 4.8)], [0.22, 0.15, 0.09]),
        ([(0.45, 0.1, 2.8), (-0.2, -0.1, 4.2), (-0.7, -0.2, 5.6)], [0.22, 0.15, 0.1]),
        ([(0.3, 0.05, 2.3), (-0.6, 0.7, 3.8)], [0.15, 0.08]),
    ]
    t = trunk_model([(0, 0, -0.1), (0.2, 0, 1.5), (0.5, 0.1, 2.8)], [0.38, 0.29, 0.25], roots, branches,
                    root_r=(0.22, 0.08))
    A.add(L.sdf_bm(t, (-1.1, -1.1, -0.1), (2.2, 1.4, 6.0), 0.045, 1000), 'BarkDark', None, None)
    lobes = [((-0.7, -0.1, 6.5), (1.8, 1.8, 2.0), 0), ((1.5, 0.2, 5.0), (1.9, 1.8, 1.5), 2),
             ((0.4, 0.0, 5.9), (1.5, 1.5, 1.5), 0), ((-0.6, 0.9, 5.4), (1.3, 1.3, 1.2), 2),
             ((-1.3, -1.0, 5.7), (1.2, 1.2, 1.2), 2), ((2.1, -0.8, 4.8), (1.1, 1.1, 1.0), 0),
             ((-0.5, 0.0, 7.8), (1.2, 1.2, 1.1), 1), ((0.9, 0.6, 6.4), (1.1, 1.1, 1.0), 1)]
    canopy(A, lobes, ('LeafC', 'LeafA', 'LeafC'), puffs=14, seed=2, centre=(0.1, 0, 5.9), k=0.45,
           tris=(1600, 900, 0))
    return A


def tree_apple():
    A = Acc('TreeApple')
    roots = [(a, 0.45) for a in np.linspace(0, 2 * math.pi, 5)[:-1] + 0.2]
    branches = [
        ([(0.15, 0.05, 1.25), (0.8, 0.2, 2.0)], [0.12, 0.07]),
        ([(0.12, 0.05, 1.25), (-0.7, -0.2, 2.0)], [0.12, 0.07]),
        ([(0.15, 0.05, 1.3), (0.1, 0.7, 2.1)], [0.1, 0.06]),
        ([(0.15, 0.05, 1.3), (0.2, -0.1, 2.4)], [0.12, 0.07]),
    ]
    t = trunk_model([(0, 0, -0.1), (0.08, 0, 0.7), (0.15, 0.05, 1.3)], [0.2, 0.16, 0.14], roots, branches,
                    root_r=(0.13, 0.05), k_root=0.18)
    A.add(L.sdf_bm(t, (-0.7, -0.7, -0.1), (1.0, 0.9, 2.6), 0.03, 700), 'Bark', None, None)
    lobes = [((0, 0, 2.75), (1.75, 1.7, 1.2), 0), ((1.1, 0.3, 2.45), (0.9, 0.9, 0.85), 1),
             ((-1.0, -0.4, 2.5), (0.95, 0.95, 0.85), 0), ((0.2, 1.1, 2.5), (0.9, 0.9, 0.85), 1),
             ((-0.3, -1.1, 2.45), (0.9, 0.9, 0.85), 0), ((0.3, 0.2, 3.45), (0.95, 0.95, 0.6), 1)]
    m = canopy(A, lobes, ('AppleLeafA', 'AppleLeafB'), puffs=10, puff_r=(0.32, 0.45), seed=3, k=0.35,
               centre=(0, 0, 2.7), h=0.05, tris=(1350, 600, 0), pad=0.6)
    rng = np.random.default_rng(13)
    for i in range(10):
        a = 2 * math.pi * i / 10 + rng.uniform(-0.2, 0.2)
        d = np.array([math.cos(a), math.sin(a), rng.uniform(-0.55, 0.45)])
        q = L.march_out(m, (0, 0, 2.6), d, 0.02, 4)
        dn = d / np.linalg.norm(d)
        c = q - dn * 0.03
        A.sphere(tuple(c), 0.1, 'Apple' if i % 5 not in (1, 3) else 'AppleYellow', u=8, v=6, scale=(1, 1, 0.92))
    return A


def tree_pine():
    A = Acc('TreePine')
    t = S.Model()
    t.add(S.RoundCone((0, 0, -0.1), (0, 0, 1.6), 0.24, 0.15))
    t.add(S.RoundCone((0, 0, 0.25), (0.35, 0.1, -0.06), 0.14, 0.05), 0.15)
    t.add(S.RoundCone((0, 0, 0.25), (-0.25, 0.28, -0.06), 0.14, 0.05), 0.15)
    t.add(S.RoundCone((0, 0, 0.25), (-0.1, -0.35, -0.06), 0.14, 0.05), 0.15)
    ground_cut(t)
    A.add(L.sdf_bm(t, (-0.6, -0.6, -0.1), (0.6, 0.6, 1.8), 0.03, 500), 'BarkDark', None, None)
    m = S.Model()
    tiers = [(0.9, 2.6, 1.75, 0.45), (1.9, 3.6, 1.45, 0.38), (2.9, 4.6, 1.12, 0.28), (3.9, 5.5, 0.78, 0.12)]
    prims, mats = [], []
    for i, (a, b, ra, rb) in enumerate(tiers):
        cone = L.capped_cone_sdf(a, b, ra, rb, wave=(7 + i, 0.13 - 0.02 * i))
        p = S.Func(lambda P, c=cone: c.eval(P) - 0.09, cone.lo - 0.1, cone.hi + 0.1)
        m.add(p, 0.1)
        prims.append(p)
        mats.append('PineA' if i % 2 == 0 else 'PineB')
    tip = S.RoundCone((0, 0, 5.2), (0, 0, 6.0), 0.28, 0.04)
    m.add(tip, 0.1)
    prims.append(tip)
    mats.append('PineB')
    A.add(L.sdf_bm(m, (-2.1, -2.1, 0.7), (2.1, 2.1, 6.15), 0.05, 2600), L.LobeMat(prims, mats), None, None)
    return A


def bush():
    A = Acc('Bush')
    lobes = [((0, 0, 0.55), (0.56, 0.55, 0.5), 0), ((0, 0, 0.18), (0.55, 0.5, 0.26), 0),
             ((0.42, 0.15, 0.42), 0.4, 2), ((-0.4, -0.1, 0.45), 0.42, 2),
             ((0.1, 0.42, 0.4), 0.37, 0), ((-0.05, -0.42, 0.4), 0.37, 2), ((0.12, -0.05, 0.85), 0.38, 1)]
    m = canopy(A, [(c, r, i) for c, r, i in lobes], ('LeafA', 'LeafB', 'LeafC'), puffs=9, puff_r=(0.16, 0.24),
               seed=4, k=0.18, centre=(0, 0, 0.55), up_bias=0.1, h=0.03, tris=(700, 350, 250), pad=0.3)
    A.V = [(x * 0.82, y * 0.82, z * 0.85) for x, y, z in A.V]
    return A


def flower_clump():
    A = Acc('FlowerClump')
    rng = np.random.default_rng(8)
    for i in range(7):
        a = 2 * math.pi * i / 7 + rng.uniform(-0.2, 0.2)
        d = Vector((math.cos(a), math.sin(a), 0))
        c = d * 0.13 + Vector((0, 0, 0.06))
        R = Vector((1, 0, 0)).rotation_difference(d).to_matrix().to_4x4() @ Matrix.Rotation(-0.45, 4, 'Y')
        A.add(L.bm_sphere(0.15, 8, 4, (1.0, 0.38, 0.14)), 'LeafA' if i % 2 else 'LeafC', Matrix.Translation(c) @ R, None)
    cols = ('FlowerPink', 'FlowerYellow', 'FlowerWhite', 'FlowerLilac')
    for i in range(9):
        a = 2 * math.pi * i / 9 + rng.uniform(-0.25, 0.25)
        rr = rng.uniform(0.04, 0.2)
        top = Vector((math.cos(a) * rr * 1.2, math.sin(a) * rr * 1.2, rng.uniform(0.28, 0.46)))
        base = Vector((math.cos(a) * rr * 0.3, math.sin(a) * rr * 0.3, 0.0))
        mid = base.lerp(top, 0.5) + Vector((0, 0, 0.02))
        A.add(L.bm_tube([base, mid, top], [0.009, 0.008, 0.007], 4), 'LeafC', None, 50.0)
        tilt = (top - base).normalized().lerp(Vector((0, 0, 1)), 0.5).normalized()
        R = Vector((0, 0, 1)).rotation_difference(tilt).to_matrix().to_4x4()
        A.add(L.bm_scallop_disc(rng.uniform(0.055, 0.07), 5, 15, 0.3, 0.014, 0.2), cols[i % 4],
              Matrix.Translation(top) @ R, None)
        A.sphere(tuple(top + tilt * 0.012), 0.02, 'FlowerCentre', u=6, v=4)
    return A


def rock():
    A = Acc('Rock')
    m = S.Model()
    m.add(S.Ellipsoid((0, 0, 0.26), (0.55, 0.45, 0.44)))
    m.add(S.Sphere((0.22, 0.1, 0.42), 0.3), 0.15)
    m.add(S.Ellipsoid((-0.28, -0.12, 0.2), (0.33, 0.3, 0.26)), 0.15)
    m.add(S.Ellipsoid((0.1, -0.28, 0.15), (0.3, 0.22, 0.2)), 0.12)
    m.inter(S.Plane((0, 0, -0.06), (0, 0, -1)))
    A.add(L.sdf_bm(m, (-0.75, -0.65, -0.08), (0.75, 0.65, 0.8), 0.02, 800), 'Rock', None, None)
    moss = S.Model()
    moss.add(S.Func(lambda P: (0.5 + 0.07 * np.sin(6 * P[:, 0]) * np.cos(5 * P[:, 1]) + 0.04 * np.sin(11 * P[:, 1]))
                    - P[:, 2], (-1, -1, 0.3), (1, 1, 1)))
    moss.inter(S.Func(lambda P: m.eval(P) - 0.022, (-1, -1, -1), (1, 1, 1)), 0.02)
    A.add(L.sdf_bm(moss, (-0.7, -0.6, 0.3), (0.7, 0.6, 0.8), 0.012, 550), 'Moss', None, None)
    return A


def tall_grass():
    A = Acc('TallGrassClump')
    rng = np.random.default_rng(12)
    n = 28
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.15, 0.15)
        out = Vector((math.cos(a), math.sin(a), 0))
        r0 = rng.uniform(0.02, 0.28)
        base = out * r0 + Vector((0, 0, -0.03))
        h = rng.uniform(0.85, 1.25) * (1.0 - 0.25 * r0 / 0.28)
        lean = rng.uniform(0.12, 0.35) + r0 * 0.5
        pts, radii = [], []
        for k in range(6):
            t = k / 5
            pts.append(base + out * (lean * t * t) + Vector((0, 0, h * t)))
            radii.append(0.045 * (1 - t) ** 0.8 if k < 5 else 0.0)
        # twist the blade so it faces sideways a bit: offset the lean direction
        A.add(L.bm_tube(pts, radii, 4, 0.32), 'GrassGold' if i % 3 else 'GrassGreen', None, 60.0)
    return A


def hedge():
    A = Acc('HedgeSection')
    rng = np.random.default_rng(15)
    m = S.Model()
    m.add(S.RoundBox((0, 0, 0.68), (2.45, 0.72, 0.73), 0.5))
    tops = []
    for x in np.linspace(-2.05, 2.05, 8):
        c = (x + rng.uniform(-0.1, 0.1), rng.uniform(-0.25, 0.25), 1.17 + rng.uniform(-0.05, 0.08))
        m.add(S.Sphere(c, rng.uniform(0.42, 0.52)), 0.22)
        tops.append(c)
    for sy in (-1, 1):
        for x in np.linspace(-2.0, 2.0, 7):
            m.add(S.Sphere((x + rng.uniform(-0.12, 0.12), sy * 0.62, rng.uniform(0.42, 0.95)),
                           rng.uniform(0.32, 0.4)), 0.2)
    ground_cut(m, -0.05)
    A.add(L.sdf_bm(m, (-2.6, -1.1, -0.06), (2.6, 1.1, 1.95), 0.045, 1700), 'HedgeA', None, None)
    hi = S.Model()
    for i, c in enumerate(tops[::2]):
        d = np.array([rng.uniform(-0.3, 0.3), (1 if i % 2 else -1) * rng.uniform(0.2, 0.6), 1.0])
        d /= np.linalg.norm(d)
        q = L.march_out(m, (c[0], 0, 0.9), d, 0.02, 2)
        r = rng.uniform(0.42, 0.55)
        hi.add(S.Sphere(q - d * r * 0.72, r), 0.2)
    A.add(L.sdf_bm(hi, (-2.6, -1.1, 0.9), (2.6, 1.1, 2.0), 0.035, 700), 'HedgeB', None, None)
    return A
