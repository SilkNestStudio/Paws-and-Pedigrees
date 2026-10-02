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
HO = vec(0, -0.012, -0.026)   # moves the whole head (shorter, lower neck carriage)


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
    m.add(Ellipsoid((0, 0.090, 0.352), (0.118, 0.165, 0.130)).tag(T, 'ribcage'))
    m.add(Sphere((0, 0.190, 0.336), 0.094).tag(T, 'forechest'), 0.05)
    m.add(Ellipsoid((0, 0.135, 0.430), (0.090, 0.105, 0.070)).tag(T, 'withers'), 0.05)
    m.add(Ellipsoid((0, -0.045, 0.410), (0.094, 0.125, 0.088)).tag(T, 'loin'), 0.07)
    m.add(Ellipsoid((0, -0.140, 0.412), (0.100, 0.110, 0.090)).tag(T, 'croup'), 0.05)
    m.add(Ellipsoid((0, -0.180, 0.382), (0.094, 0.080, 0.090)).tag(T, 'rump'), 0.04)
    # ---- neck & head --------------------------------------------------
    m.add(RoundCone((0, 0.160, 0.430), hp(0, 0.252, 0.566), 0.092, 0.062).tag('neck', 'neck'), 0.05)
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
        m.add(RoundCone(f['S'], f['E'], 0.060, 0.045).tag(reg, 'upperarm'), 0.035)
        m.add(Sphere(f['E'] + vec(0, -0.010, 0.004), 0.035).tag(reg, 'elbow'), 0.02)
        mid = f['E'] * 0.55 + f['C'] * 0.45 + vec(0, 0.002, 0)
        m.add(Chain([f['E'], mid, f['C']], [0.040, 0.034, 0.030], 0.0).tag(reg, 'forearm'), 0.02)
        m.add(Sphere(f['C'] + vec(0, -0.002, 0), 0.0285).tag(reg, 'carpus'), 0.012)
        pc = vec(f['C'][0], 0.214, 0.028)
        m.add(RoundCone(f['C'], pc + vec(0, -0.010, 0.010), 0.0275, 0.027).tag(reg, 'pastern'), 0.012)
        m.add(Ellipsoid(pc, (0.036, 0.046, 0.028)).tag(reg, 'paw'), 0.014)
        for t in toes(pc, s, 0.247, 0.018, r=0.0158, spread=0.0235):
            m.add(t.tag(reg, 'toe'), 0.007)
        h = hind_leg(s)
        reg = 'H' + side
        fem = h['K'] - h['H']
        m.add(Ellipsoid(h['H'] + fem * 0.30 + vec(s * 0.004, -0.022, 0.004), (0.055, 0.125, 0.092),
                        frame_from(fem, (0, 1, 0))).tag(reg, 'ham'), 0.045)
        m.add(RoundCone(h['H'], h['K'], 0.058, 0.042).tag(reg, 'thigh'), 0.03)
        m.add(Sphere(h['K'] + vec(0, 0.004, 0), 0.036).tag(reg, 'stifle'), 0.02)
        tib = h['J'] - h['K']
        m.add(RoundCone(h['K'], h['J'], 0.040, 0.025).tag(reg, 'shin'), 0.02)
        m.add(Ellipsoid(h['K'] + tib * 0.33 + vec(0, -0.017, 0.004), (0.032, 0.058, 0.036),
                        frame_from(tib, (0, 1, 0))).tag(reg, 'gaskin'), 0.025)
        m.add(Sphere(h['J'] + vec(0, -0.012, 0.006), 0.022).tag(reg, 'hockpoint'), 0.012)
        pc = vec(h['P'][0], -0.141, 0.027)
        m.add(RoundCone(h['J'], h['P'] + vec(0, 0.004, 0.0), 0.025, 0.025).tag(reg, 'metatarsus'), 0.012)
        m.add(Ellipsoid(pc, (0.034, 0.044, 0.027)).tag(reg, 'paw'), 0.014)
        for t in toes(pc, s, -0.111, 0.017, r=0.015, spread=0.022):
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
