"""Anatomy of the base dog: landmarks, rig joints and the SDF body.

Design frame (used everywhere in this file): metres, +Y is the dog's forward,
+Z up, +X is the dog's RIGHT side (so *_L parts sit at negative X).  The
builder rotates the finished asset 180 degrees about Z before export so that
the glTF faces +Z in three.js.
"""
import numpy as np

from sdf_lib import (Model, Ellipsoid, Sphere, RoundCone, RoundBox, Chain, Func, vec, frame_from, rot_x,
                     smax, smin, normalize)

SIDES = (('L', -1.0), ('R', 1.0))
HO = vec(0, -0.020, -0.040)   # moves the whole head (shorter, lower neck carriage)


def hp(x, y, z):
    return vec(x, y, z) + HO


def front_leg(s):
    return dict(
        anchor=vec(s * 0.046, 0.145, 0.470),
        S=vec(s * 0.084, 0.228, 0.345),     # point of shoulder
        E=vec(s * 0.088, 0.162, 0.232),     # elbow
        C=vec(s * 0.086, 0.184, 0.072),     # carpus (wrist)
        T=vec(s * 0.087, 0.254, 0.012),     # toe tip
    )


def hind_leg(s):
    return dict(
        anchor=vec(s * 0.046, -0.125, 0.480),
        H=vec(s * 0.084, -0.145, 0.390),    # hip joint
        K=vec(s * 0.090, -0.071, 0.238),    # stifle (knee)
        J=vec(s * 0.088, -0.179, 0.108),    # hock
        P=vec(s * 0.087, -0.169, 0.036),    # paw joint (back of the paw)
        T=vec(s * 0.087, -0.097, 0.012),    # toe tip
    )


SPINE = [vec(0, -0.147, 0.420), vec(0, -0.040, 0.436), vec(0, 0.090, 0.442), vec(0, 0.180, 0.448)]
NECK = [vec(0, 0.180, 0.448), vec(0, 0.218, 0.500), hp(0, 0.262, 0.572)]
HEAD = (hp(0, 0.262, 0.572), hp(0, 0.400, 0.612))
JAW = (hp(0, 0.348, 0.583), hp(0, 0.452, 0.562))
TAIL = [vec(0, -0.222, 0.442), vec(0, -0.282, 0.468), vec(0, -0.340, 0.490),
        vec(0, -0.396, 0.508), vec(0, -0.448, 0.521), vec(0, -0.494, 0.529)]
TAIL_R = [0.046, 0.041, 0.034, 0.026, 0.018, 0.009]


def ear_joints(s):
    base = hp(s * 0.064, 0.288, 0.702)
    fold = hp(s * 0.080, 0.290, 0.730)
    tip = hp(s * 0.104, 0.295, 0.800)
    return base, fold, tip


def bone_table():
    """(name, head, tail, parent, region) in the design frame."""
    b = [('root', vec(0, 0, 0), vec(0, 0.12, 0), None, 'torso'),
         ('spine_01', SPINE[0], SPINE[1], 'root', 'torso'),
         ('spine_02', SPINE[1], SPINE[2], 'spine_01', 'torso'),
         ('spine_03', SPINE[2], SPINE[3], 'spine_02', 'torso'),
         ('neck_01', NECK[0], NECK[1], 'spine_03', 'neck'),
         ('neck_02', NECK[1], NECK[2], 'neck_01', 'neck'),
         ('head', HEAD[0], HEAD[1], 'neck_02', 'head'),
         ('jaw', JAW[0], JAW[1], 'head', 'head')]
    for side, s in SIDES:
        base, fold, tip = ear_joints(s)
        b.append(('ear_' + side, base, fold, 'head', 'head'))
        b.append(('ear_%s_tip' % side, fold, tip, 'ear_' + side, 'head'))
    parent = 'spine_01'
    for i in range(5):
        name = 'tail_%02d' % (i + 1)
        b.append((name, TAIL[i], TAIL[i + 1], parent, 'tail'))
        parent = name
    for side, s in SIDES:
        f = front_leg(s)
        reg = 'F' + side
        b += [('upperarm_' + side, f['S'], f['E'], 'spine_03', reg),
              ('forearm_' + side, f['E'], f['C'], 'upperarm_' + side, reg),
              ('paw_front_' + side, f['C'], f['T'], 'forearm_' + side, reg)]
        h = hind_leg(s)
        reg = 'H' + side
        b += [('thigh_' + side, h['H'], h['K'], 'spine_01', reg),
              ('shin_' + side, h['K'], h['J'], 'thigh_' + side, reg),
              ('hock_' + side, h['J'], h['P'], 'shin_' + side, reg),
              ('paw_hind_' + side, h['P'], h['T'], 'hock_' + side, reg)]
    return b


REGIONS = ['torso', 'neck', 'head', 'tail', 'FL', 'FR', 'HL', 'HR']


def toes(paw_c, s, y_front, z, r=0.0135, spread=0.0205):
    out = []
    for i, off in enumerate((-1.5, -0.5, 0.5, 1.5)):
        back = 0.007 if abs(off) > 1 else 0.0
        out.append(Sphere((paw_c[0] + off * spread * 0.66, y_front - back, z - (0.002 if abs(off) > 1 else 0)), r))
    return out


EYE_R = 0.0235
EYE_AIM = [None, None]      # filled by build_body (surface-fitted eye centres)
NOSE_C = hp(0, 0.490, 0.622)
HINGE = hp(0, 0.348, 0.586)
MOUTH_CORNER_Y = HINGE[1] + 0.044


def eye_dir(s):
    return normalize((s * 0.50, 0.82, 0.14))


def eye_centre(s):
    return EYE_AIM[0 if s < 0 else 1]


def march(model, start, direction, step=0.0015, limit=0.25):
    p = vec(start).copy()
    d = normalize(direction)
    for _ in range(int(limit / step)):
        if model.eval(p[None], cull=False)[0] > 0:
            return p
        p = p + d * step
    raise RuntimeError('surface not found')


def mouth_cavity(P, opening=0.06):
    """Thin wedge (open mouth slit) with its apex at the jaw hinge."""
    d = P - HINGE
    a_mid = -0.10
    au, al = a_mid + opening / 2, a_mid - opening / 2
    du = d[:, 2] * np.cos(au) - d[:, 1] * np.sin(au)          # above upper lip plane
    dl = -(d[:, 2] * np.cos(al) - d[:, 1] * np.sin(al))      # below lower lip plane
    back = MOUTH_CORNER_Y - P[:, 1]
    side = np.abs(P[:, 0]) - 0.060
    w = smax(smax(du, dl, 0.002), back, 0.010)
    return smax(w, side, 0.01)


def build_body(slit=True, sockets=True):
    m = Model()
    # ---- torso --------------------------------------------------------
    T = 'torso'
    m.add(Ellipsoid((0, 0.090, 0.352), (0.122, 0.165, 0.130)).tag(T, 'ribcage'))
    m.add(Sphere((0, 0.190, 0.336), 0.094).tag(T, 'forechest'), 0.05)
    m.add(Ellipsoid((0, 0.135, 0.430), (0.090, 0.105, 0.070)).tag(T, 'withers'), 0.05)
    m.add(Ellipsoid((0, -0.045, 0.410), (0.094, 0.125, 0.088)).tag(T, 'loin'), 0.07)
    m.add(Ellipsoid((0, -0.140, 0.412), (0.100, 0.110, 0.090)).tag(T, 'croup'), 0.05)
    m.add(Ellipsoid((0, -0.180, 0.382), (0.094, 0.080, 0.090)).tag(T, 'rump'), 0.04)
    # ---- neck & head --------------------------------------------------
    m.add(RoundCone((0, 0.160, 0.430), hp(0, 0.252, 0.566), 0.094, 0.068).tag('neck', 'neck'), 0.05)
    m.add(Ellipsoid((0, 0.212, 0.432), (0.080, 0.065, 0.085)).tag('neck', 'throat'), 0.04)
    H = 'head'
    m.add(Ellipsoid(hp(0, 0.305, 0.646), (0.106, 0.097, 0.095)).tag(H, 'cranium'), 0.026)
    m.add(Ellipsoid(hp(0, 0.350, 0.672), (0.080, 0.050, 0.050)).tag(H, 'brow'), 0.03)
    for side, s in SIDES:
        m.add(Sphere(hp(s * 0.054, 0.362, 0.598), 0.046).tag(H, 'cheek'), 0.03)
    m.add(RoundBox(hp(0, 0.425, 0.620), (0.037, 0.062, 0.027), 0.024, rot_x(-0.09)).tag(H, 'bridge'), 0.03)
    for side, s in SIDES:
        m.add(Ellipsoid(hp(s * 0.025, 0.449, 0.598), (0.033, 0.043, 0.030)).tag(H, 'whiskerpad'), 0.016)
    m.add(Ellipsoid(hp(0, 0.420, 0.566), (0.031, 0.050, 0.020)).tag(H, 'chin'), 0.018)
    # ---- legs ---------------------------------------------------------
    for side, s in SIDES:
        f = front_leg(s)
        reg = 'F' + side
        scap_dir = f['S'] - f['anchor']
        m.add(Ellipsoid(f['anchor'] * 0.45 + f['S'] * 0.55 + vec(s * 0.004, 0, 0), (0.040, 0.092, 0.066),
                        frame_from(scap_dir, (0, 1, 0))).tag(reg, 'scapula'), 0.04)
        m.add(RoundCone(f['S'], f['E'], 0.064, 0.048).tag(reg, 'upperarm'), 0.035)
        m.add(Sphere(f['E'] + vec(0, -0.010, 0.004), 0.038).tag(reg, 'elbow'), 0.02)
        mid = f['E'] * 0.55 + f['C'] * 0.45 + vec(0, 0.002, 0)
        m.add(Chain([f['E'], mid, f['C']], [0.043, 0.036, 0.0315], 0.0).tag(reg, 'forearm'), 0.02)
        m.add(Sphere(f['C'] + vec(0, -0.002, 0), 0.031).tag(reg, 'carpus'), 0.012)
        pc = vec(f['C'][0], 0.214, 0.028)
        m.add(RoundCone(f['C'], pc + vec(0, -0.010, 0.010), 0.030, 0.030).tag(reg, 'pastern'), 0.012)
        m.add(Ellipsoid(pc, (0.040, 0.050, 0.030)).tag(reg, 'paw'), 0.014)
        for t in toes(pc, s, 0.250, 0.019, r=0.0172, spread=0.0255):
            m.add(t.tag(reg, 'toe'), 0.007)
        h = hind_leg(s)
        reg = 'H' + side
        fem = h['K'] - h['H']
        m.add(Ellipsoid(h['H'] + fem * 0.30 + vec(s * 0.004, -0.022, 0.004), (0.060, 0.130, 0.098),
                        frame_from(fem, (0, 1, 0))).tag(reg, 'ham'), 0.045)
        m.add(RoundCone(h['H'], h['K'], 0.062, 0.046).tag(reg, 'thigh'), 0.03)
        m.add(Sphere(h['K'] + vec(0, 0.004, 0), 0.040).tag(reg, 'stifle'), 0.02)
        tib = h['J'] - h['K']
        m.add(RoundCone(h['K'], h['J'], 0.044, 0.028).tag(reg, 'shin'), 0.02)
        m.add(Ellipsoid(h['K'] + tib * 0.33 + vec(0, -0.017, 0.004), (0.036, 0.060, 0.040),
                        frame_from(tib, (0, 1, 0))).tag(reg, 'gaskin'), 0.025)
        m.add(Sphere(h['J'] + vec(0, -0.012, 0.006), 0.025).tag(reg, 'hockpoint'), 0.012)
        pc = vec(h['P'][0], -0.141, 0.027)
        m.add(RoundCone(h['J'], h['P'] + vec(0, 0.004, 0.0), 0.028, 0.029).tag(reg, 'metatarsus'), 0.012)
        m.add(Ellipsoid(pc, (0.038, 0.048, 0.029)).tag(reg, 'paw'), 0.014)
        for t in toes(pc, s, -0.110, 0.018, r=0.0165, spread=0.0245):
            m.add(t.tag(reg, 'toe'), 0.007)
    # ---- tail ---------------------------------------------------------
    m.add(Chain(TAIL, TAIL_R, 0.0).tag('tail', 'tail'), 0.035)
    # ---- carve the face ----------------------------------------------
    if sockets:
        for i, (side, s) in enumerate(SIDES):
            surf = march(m, hp(s * 0.051, 0.30, 0.650), (0, 1, 0))
            EYE_AIM[i] = surf - eye_dir(s) * EYE_R * 0.50
        for side, s in SIDES:
            m.sub(Sphere(eye_centre(s), EYE_R + 0.0022), 0.007)
    if slit:
        m.sub(Func(mouth_cavity, HO + vec(-0.08, 0.36, 0.52), HO + vec(0.08, 0.52, 0.64)), 0.0)
    # Flatten the soles so paws stand on the ground plane.
    m.inter(Func(lambda P: 0.0005 - P[:, 2], (-1, -1, -1), (1, 1, 1)), 0.006)
    return m


BODY_BOUNDS = ((-0.17, -0.58, -0.01), (0.17, 0.53, 0.74))


# --------------------------------------------------------------------------
# Skinning chains: (region, polyline points, bones per segment, joint widths)
# --------------------------------------------------------------------------
def chains():
    c = [('torso', [vec(0, -0.32, 0.42), SPINE[1], SPINE[2], vec(0, 0.32, 0.43)],
          ['spine_01', 'spine_02', 'spine_03'], [0.065, 0.065]),
         ('neck', [vec(0, 0.08, 0.40), NECK[0], NECK[1], NECK[2], HEAD[1]],
          ['spine_03', 'neck_01', 'neck_02', 'head'], [0.05, 0.035, 0.03]),
         ('head', [NECK[1], NECK[2], HEAD[1] + vec(0, 0.2, 0)], ['neck_02', 'head'], [0.03]),
         ('tail', [SPINE[0] + vec(0, -0.02, 0)] + TAIL,
          ['spine_01', 'tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05'], [0.03, 0.022, 0.02, 0.018, 0.015])]
    for side, s in SIDES:
        f = front_leg(s)
        c.append(('F' + side, [f['anchor'], f['S'], f['E'], f['C'], f['T']],
                  ['spine_03', 'upperarm_' + side, 'forearm_' + side, 'paw_front_' + side], [0.05, 0.032, 0.018]))
        h = hind_leg(s)
        c.append(('H' + side, [h['anchor'], h['H'], h['K'], h['J'], h['P'], h['T']],
                  ['spine_01', 'thigh_' + side, 'shin_' + side, 'hock_' + side, 'paw_hind_' + side],
                  [0.055, 0.034, 0.02, 0.012]))
    return c


def jaw_mask(P):
    d = P - HINGE
    a = -0.10
    mid = d[:, 2] * np.cos(a) - d[:, 1] * np.sin(a)
    from sdf_lib import smoothstep
    return smoothstep(0.003, -0.003, mid) * smoothstep(HINGE[1] - 0.012, HINGE[1] + 0.03, P[:, 1]) \
        * smoothstep(HINGE[2] - 0.075, HINGE[2] - 0.05, P[:, 2])


# --------------------------------------------------------------------------
# Breed morphs: displacement fields defined for any point in space, driven by
# region weights.  Used for the body, accessories and rig joints alike.
# --------------------------------------------------------------------------
MORPHS = ['legs_long', 'legs_short', 'body_long', 'body_short', 'chest_deep',
          'muzzle_long', 'muzzle_short', 'head_wide', 'stocky', 'slim']
STOP_Y = HO[1] + 0.372


def _chain_axis(P, region):
    from sdf_lib import project_polyline
    for reg, pts, bones, widths in chains():
        if reg == region:
            return project_polyline(P, pts[1:] if region[0] in 'FH' else pts)[1]
    raise KeyError(region)


def morph_delta(name, P, Rw):
    from sdf_lib import smoothstep
    r = {k: Rw[:, i] for i, k in enumerate(REGIONS)}
    front = r['FL'] + r['FR']
    hind = r['HL'] + r['HR']
    leg = front + hind
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    D = np.zeros_like(P)
    if name in ('legs_long', 'legs_short'):
        delta = 0.10 if name == 'legs_long' else -0.115
        band = smoothstep(0.035, 0.30, z)
        D[:, 2] = delta * (leg * band + (1 - leg))
    elif name in ('body_long', 'body_short'):
        delta = 0.10 if name == 'body_long' else -0.075
        t = smoothstep(-0.11, 0.13, y) - 0.5
        D[:, 1] = delta * (r['torso'] * t + (front + r['neck'] + r['head']) * 0.5 - (hind + r['tail']) * 0.5)
    elif name == 'chest_deep':
        bell = smoothstep(-0.14, 0.0, y) * (1 - smoothstep(0.24, 0.34, y))
        low = smoothstep(0.42, 0.25, z)
        D[:, 2] = -0.05 * r['torso'] * bell * low
        D[:, 0] = 0.12 * x * r['torso'] * bell * low
        D[:, 1] = 0.012 * r['torso'] * smoothstep(0.12, 0.26, y) * low
    elif name in ('muzzle_long', 'muzzle_short'):
        hd = r['head']
        if name == 'muzzle_long':
            f = smoothstep(STOP_Y - 0.01, STOP_Y + 0.07, y)
            D[:, 1] = 0.055 * hd * f
            D[:, 2] = -0.010 * hd * f
            D[:, 0] = -0.10 * x * hd * f
        else:
            f = smoothstep(STOP_Y - 0.01, STOP_Y + 0.10, y)
            D[:, 1] = -0.050 * hd * f
            D[:, 2] = 0.008 * hd * f
            D[:, 0] = 0.14 * x * hd * f
    elif name == 'head_wide':
        D[:, 0] = x * (0.22 * r['head'] + 0.10 * r['neck'])
        D[:, 2] = -0.02 * (z - (HO[2] + 0.64)) * r['head']
    elif name in ('stocky', 'slim'):
        st = name == 'stocky'
        sx, sz = (1.20, 1.10) if st else (0.86, 0.93)
        sl, sn, sh, stl = (1.24, 1.16, 1.05, 1.18) if st else (0.80, 0.88, 0.97, 0.85)
        zc = np.interp(y, [-0.25, -0.05, 0.10, 0.30], [0.40, 0.41, 0.36, 0.34])
        tr = r['torso']
        D[:, 0] += (sx - 1) * x * tr
        D[:, 2] += (sz - 1) * (z - zc) * tr
        ground = smoothstep(0.0, 0.07, z)
        for reg in ('FL', 'FR', 'HL', 'HR'):
            w = r[reg]
            if not np.any(w > 1e-4):
                continue
            Q = _chain_axis(P, reg)
            off = (P - Q) * (sl - 1)
            off[:, 2] *= ground
            D += off * w[:, None]
            attach_x = (front_leg if reg[0] == 'F' else hind_leg)(-1 if reg[1] == 'L' else 1)['S' if reg[0] == 'F' else 'H'][0]
            D[:, 0] += (sx - 1) * attach_x * w
        Q = _chain_axis(P, 'neck')
        D += (P - Q) * (sn - 1) * r['neck'][:, None]
        Q = _chain_axis(P, 'tail')
        D += (P - Q) * (stl - 1) * r['tail'][:, None]
        hc = HO + vec(0, 0.33, 0.62)
        D += (P - hc) * (sh - 1) * r['head'][:, None]
    return D
