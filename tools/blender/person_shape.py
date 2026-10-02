"""Stylized keeper/handler: landmarks, rig joints and SDF garments.

Design frame: metres, +Y forward (the person's facing), +Z up, +X is the
person's RIGHT (so *_L parts are at negative X).  The builder rotates the
asset 180 degrees about Z on write so the glTF faces +Z in three.js.
"""
import math
import numpy as np

from sdf_lib import (Model, Ellipsoid, Sphere, RoundCone, RoundBox, Chain, Func, Plane, vec,
                     frame_from, rot_x, rot_y, rot_z, smax, smin, smoothstep, normalize)

SIDES = (('L', -1.0), ('R', 1.0))
HEAD_C = vec(0, -0.004, 1.565)


def arm(s):
    return dict(base=vec(s * 0.030, -0.004, 1.330), S=vec(s * 0.196, -0.006, 1.336),
                E=vec(s * 0.268, -0.032, 1.104), W=vec(s * 0.298, -0.002, 0.884),
                T=vec(s * 0.310, 0.016, 0.725))


def leg(s):
    return dict(H=vec(s * 0.098, 0.0, 0.800), K=vec(s * 0.104, 0.014, 0.442),
                A=vec(s * 0.108, -0.022, 0.090), T=vec(s * 0.108, 0.175, 0.020))


SPINE = [vec(0, 0, 0.820), vec(0, 0, 0.960), vec(0, 0, 1.120), vec(0, 0, 1.360)]
NECK = (vec(0, 0, 1.360), vec(0, 0.008, 1.430))
HEAD = (vec(0, 0.008, 1.430), vec(0, 0.008, 1.720))


def bone_table():
    b = [('root', vec(0, 0, 0), vec(0, 0.15, 0), None, 'torso', 'x'),
         ('hips', SPINE[0], SPINE[1], 'root', 'torso', 'x'),
         ('spine', SPINE[1], SPINE[2], 'hips', 'torso', 'x'),
         ('chest', SPINE[2], SPINE[3], 'spine', 'torso', 'x'),
         ('neck', NECK[0], NECK[1], 'chest', 'head', 'x'),
         ('head', HEAD[0], HEAD[1], 'neck', 'head', 'x')]
    for side, s in SIDES:
        a = arm(s)
        r = 'A' + side
        b += [('shoulder_' + side, a['base'], a['S'], 'chest', r, 'fwd'),
              ('upperarm_' + side, a['S'], a['E'], 'shoulder_' + side, r, 'fwd'),
              ('forearm_' + side, a['E'], a['W'], 'upperarm_' + side, r, 'fwd'),
              ('hand_' + side, a['W'], a['T'], 'forearm_' + side, r, 'fwd')]
    for side, s in SIDES:
        g = leg(s)
        r = 'G' + side
        b += [('thigh_' + side, g['H'], g['K'], 'hips', r, 'x'),
              ('shin_' + side, g['K'], g['A'], 'thigh_' + side, r, 'x'),
              ('foot_' + side, g['A'], g['T'], 'shin_' + side, r, 'x')]
    return b


REGIONS = ['torso', 'head', 'AL', 'AR', 'GL', 'GR']


def chains():
    c = [('torso', [vec(0, 0, 0.62), SPINE[1], SPINE[2], vec(0, 0, 1.44)], ['hips', 'spine', 'chest'], [0.06, 0.07]),
         ('head', [vec(0, 0, 1.28), NECK[0], NECK[1], vec(0, 0.008, 1.85)], ['chest', 'neck', 'head'], [0.03, 0.03])]
    for side, s in SIDES:
        a = arm(s)
        c.append(('A' + side, [vec(0, 0, 1.33), vec(s * 0.090, 0, 1.335), a['S'], a['E'], a['W'], a['T'] + vec(0, 0, -0.05)],
                  ['chest', 'shoulder_' + side, 'upperarm_' + side, 'forearm_' + side, 'hand_' + side],
                  [0.04, 0.05, 0.035, 0.022]))
        g = leg(s)
        c.append(('G' + side, [vec(s * 0.02, 0, 0.92), g['H'], g['K'], g['A'], g['T']],
                  ['hips', 'thigh_' + side, 'shin_' + side, 'foot_' + side], [0.07, 0.05, 0.03]))
    return c


# --------------------------------------------------------------------------
# Skin (head, neck, hands, plus hidden torso/limbs for weight lookup)
# --------------------------------------------------------------------------
EYE_Z = 1.552
EYE_X = 0.050


def build_skin():
    m = Model()
    H = 'head'
    m.add(Ellipsoid(HEAD_C, (0.124, 0.128, 0.142)).tag(H, 'cranium'))
    m.add(Ellipsoid((0, 0.020, 1.482), (0.106, 0.100, 0.086)).tag(H, 'jaw'), 0.05)
    for side, s in SIDES:
        m.add(Sphere((s * 0.058, 0.060, 1.492), 0.052).tag(H, 'cheek'), 0.035)
        m.add(Ellipsoid((s * 0.124, -0.012, 1.528), (0.021, 0.034, 0.046), rot_y(s * 0.25)).tag(H, 'ear'), 0.012)
    m.add(Ellipsoid((0, 0.122, 1.512), (0.021, 0.024, 0.029), rot_x(0.25)).tag(H, 'nose'), 0.016)
    m.add(Sphere((0, 0.066, 1.420), 0.038).tag(H, 'chin'), 0.035)
    m.add(RoundCone((0, -0.004, 1.32), (0, 0.004, 1.46), 0.060, 0.056).tag(H, 'neck'), 0.03)
    T = 'torso'
    m.add(Ellipsoid((0, 0, 1.170), (0.166, 0.108, 0.170)).tag(T, 'chest'), 0.04)
    m.add(Ellipsoid((0, 0, 0.980), (0.142, 0.095, 0.120)).tag(T, 'waist'), 0.05)
    m.add(Ellipsoid((0, -0.005, 0.850), (0.158, 0.104, 0.100)).tag(T, 'pelvis'), 0.05)
    for side, s in SIDES:
        a = arm(s)
        r = 'A' + side
        m.add(Sphere(a['S'] + vec(-s * 0.012, 0, -0.01), 0.064).tag(r, 'deltoid'), 0.04)
        m.add(RoundCone(a['S'], a['E'], 0.054, 0.046).tag(r, 'upperarm'), 0.02)
        m.add(RoundCone(a['E'], a['W'], 0.045, 0.036).tag(r, 'forearm'), 0.015)
        hd = normalize(a['T'] - a['W'])
        fr = frame_from(hd, (0, 1, 0))          # local x = palm normal, z = forward
        c = a['W'] + hd * 0.070
        m.add(Ellipsoid(c, (0.031, 0.076, 0.058), fr).tag(r, 'mitten'), 0.018)
        m.add(RoundCone(a['W'] + hd * 0.032 + vec(0, 0.038, 0),
                        a['W'] + hd * 0.080 + vec(0, 0.068, 0), 0.019, 0.016).tag(r, 'thumb'), 0.012)
        g = leg(s)
        r = 'G' + side
        m.add(RoundCone(g['H'], g['K'], 0.080, 0.058).tag(r, 'thigh'), 0.04)
        m.add(RoundCone(g['K'], g['A'], 0.058, 0.042).tag(r, 'shin'), 0.02)
        m.add(Ellipsoid((s * 0.108, 0.06, 0.04), (0.045, 0.10, 0.04)).tag(r, 'foot'), 0.02)
    return m


SKIN_BOUNDS = ((-0.44, -0.17, -0.01), (0.44, 0.21, 1.72))


def visible_skin_mask(P):
    """Keep only skin that can show through clothes: head, neck, hands."""
    head = P[:, 2] > 1.345
    hands = (P[:, 2] < 0.895) & (np.abs(P[:, 0]) > 0.20)
    return head | hands


# --------------------------------------------------------------------------
# Garments
# --------------------------------------------------------------------------
def v_opening(depth_z, top_z=1.44, half=0.075):
    """V-shaped cut at the front of a garment (neck down to depth_z)."""
    def f(P):
        t = np.clip((P[:, 2] - depth_z) / (top_z - depth_z), 0, 1)
        w = half * t + 0.004
        side = np.abs(P[:, 0]) - w
        below = depth_z - P[:, 2]
        front = 0.02 - P[:, 1]
        return smax(smax(side, below, 0.01), front, 0.0)
    return Func(f, (-0.2, 0.0, depth_z - 0.05), (0.2, 0.3, 1.6))


def collar_ring(z, ry, r, open_front=0.0):
    pts = []
    for i in range(0, 25):
        a = math.pi * (0.5 + open_front) + i / 24 * (2 * math.pi * (1 - open_front))
        pts.append((math.cos(a) * ry, math.sin(a) * ry * 0.95, z))
    return Chain(pts, [r] * len(pts), 0.0)


def neck_hole(r, zc=1.45):
    return Func(lambda P: np.linalg.norm((P - vec(0, 0.002, zc)) / vec(1.0, 1.0, 1.6), axis=1) - r,
                (-0.12, -0.12, zc - 0.14), (0.12, 0.12, zc + 0.14))


def build_shirt():
    m = Model()
    m.add(Ellipsoid((0, 0.004, 1.172), (0.148, 0.108, 0.168)))
    for side, s in SIDES:
        m.add(RoundBox((s * 0.044, 0.066, 1.366), (0.036, 0.010, 0.032), 0.006, rot_z(-s * 0.55) @ rot_x(-0.35)), 0.006)
    m.add(collar_ring(1.356, 0.068, 0.015, 0.12), 0.01)
    m.inter(Func(lambda P: 1.02 - P[:, 2], (-1, -1, -1), (1, 1, 3)), 0.01)
    m.sub(neck_hole(0.063, 1.46), 0.006)
    return m


def jacket_torso(m, grow=0.0):
    m.add(Ellipsoid((0, 0, 1.166), (0.186 + grow, 0.130 + grow, 0.190 + grow)))
    m.add(Ellipsoid((0, 0, 0.985), (0.166 + grow, 0.120 + grow, 0.13 + grow)), 0.06)
    m.add(RoundCone((0, -0.004, 0.95), (0, -0.004, 0.78), 0.172 + grow, 0.192 + grow,
                    scale=(1.0, 1.0, 0.74), up=(0, 1, 0)), 0.05)
    for side, s in SIDES:
        a = arm(s)
        m.add(Sphere(a['S'] + vec(-s * 0.018, 0, -0.022), 0.070 + grow), 0.05)
        m.add(RoundCone(a['S'], a['E'], 0.066 + grow, 0.058 + grow), 0.02)
        cuff = a['W'] + normalize(a['W'] - a['E']) * 0.012
        m.add(RoundCone(a['E'], cuff, 0.058 + grow, 0.052 + grow), 0.015)


def build_jacket():
    m = Model()
    jacket_torso(m)
    for side, s in SIDES:
        a = arm(s)
        d = normalize(a['W'] - a['E'])
        m.add(RoundCone(a['W'] - d * 0.038, a['W'] + d * 0.010, 0.056, 0.056), 0.008)   # cuff band
        m.add(RoundBox((s * 0.100, 0.118, 0.865), (0.060, 0.014, 0.055), 0.010, rot_z(-s * 0.10)), 0.006)
        m.add(RoundBox((s * 0.100, 0.128, 0.918), (0.064, 0.012, 0.015), 0.006, rot_z(-s * 0.10)), 0.004)
        m.add(RoundBox((s * 0.074, 0.056, 1.356), (0.064, 0.020, 0.054), 0.015,
                       rot_z(-s * 0.85) @ rot_x(-0.55)), 0.01)
    m.add(collar_ring(1.368, 0.092, 0.028, 0.10), 0.015)
    m.inter(Func(lambda P: 0.776 - P[:, 2], (-1, -1, -1), (1, 1, 3)), 0.008)
    m.sub(v_opening(1.095, half=0.09), 0.008)
    m.sub(neck_hole(0.078, 1.49), 0.008)
    return m


def build_coat_long():
    m = Model()
    jacket_torso(m, grow=0.020)
    m.add(RoundCone((0, -0.01, 0.80), (0, -0.02, 0.40), 0.19, 0.225, scale=(1.0, 1.0, 0.72), up=(0, 1, 0)), 0.05)
    for side, s in SIDES:
        m.add(RoundBox((s * 0.112, 0.155, 0.70), (0.064, 0.012, 0.064), 0.010, rot_z(-s * 0.12)), 0.006)
        m.add(RoundBox((s * 0.090, 0.078, 1.335), (0.064, 0.020, 0.095), 0.014, rot_z(-s * 0.75) @ rot_x(-0.45)), 0.01)
    m.inter(Func(lambda P: 0.40 - P[:, 2], (-1, -1, -1), (1, 1, 3)), 0.01)
    m.sub(v_opening(1.000, half=0.10), 0.008)
    m.sub(RoundBox((0, 0.22, 0.52), (0.026, 0.13, 0.30), 0.01), 0.01)
    m.sub(neck_hole(0.086, 1.49), 0.008)
    return m


def build_trousers():
    m = Model()
    m.add(Ellipsoid((0, -0.004, 0.858), (0.160, 0.106, 0.11)))
    for side, s in SIDES:
        g = leg(s)
        m.add(RoundCone(g['H'] + vec(-s * 0.006, 0.0, 0.0), g['K'], 0.086, 0.072), 0.04)
        m.add(Sphere(g['K'] + vec(0, 0.006, 0), 0.068), 0.02)
        m.add(RoundCone(g['K'], g['A'] + vec(0, 0.01, 0.04), 0.068, 0.060), 0.02)
    m.inter(Func(lambda P: 0.14 - P[:, 2], (-1, -1, -1), (1, 1, 3)), 0.01)
    m.inter(Func(lambda P: P[:, 2] - 0.97, (-1, -1, -1), (1, 1, 3)), 0.01)
    return m


def build_boots():
    m = Model()
    for side, s in SIDES:
        x = s * 0.108
        m.add(Ellipsoid((x, 0.080, 0.050), (0.062, 0.112, 0.054)), 0.03)
        m.add(Ellipsoid((x, -0.030, 0.060), (0.058, 0.066, 0.060)), 0.03)
        m.add(RoundCone((x, -0.018, 0.070), (x, -0.016, 0.200), 0.072, 0.074), 0.03)
        m.add(RoundBox((x, 0.040, 0.017), (0.066, 0.160, 0.017), 0.012), 0.006)
        m.add(RoundCone((x, -0.016, 0.196), (x, -0.016, 0.206), 0.079, 0.079), 0.006)
        m.sub(RoundCone((x, -0.016, 0.16), (x, -0.016, 0.30), 0.062, 0.062), 0.004)   # open shaft
    m.inter(Func(lambda P: -P[:, 2], (-1, -1, -1), (1, 1, 3)), 0.004)
    return m


def hairline(P):
    """Negative where hair must not grow: the face, ears and below the nape."""
    face = Ellipsoid((0, 0.118, 1.462), (0.150, 0.140, 0.172), rot_x(0.12)).eval(P)
    ears = np.minimum(Ellipsoid((0.124, -0.012, 1.528), (0.034, 0.046, 0.056)).eval(P),
                      Ellipsoid((-0.124, -0.012, 1.528), (0.034, 0.046, 0.056)).eval(P))
    nape = P[:, 2] - (1.445 + 0.25 * np.maximum(P[:, 1], 0))
    return np.minimum(np.minimum(face, ears), nape)


def build_hair_short():
    m = Model()
    m.add(Ellipsoid(HEAD_C + vec(0, -0.012, 0.016), (0.136, 0.140, 0.152)))
    m.sub(Func(hairline, (-0.3, -0.3, 1.2), (0.3, 0.3, 1.9)), 0.014)
    # Side-swept fringe and a soft crown.
    m.add(RoundCone((-0.075, 0.075, 1.680), (0.070, 0.118, 1.625), 0.040, 0.020), 0.03)
    m.add(RoundCone((-0.10, 0.04, 1.66), (-0.13, 0.06, 1.58), 0.030, 0.016), 0.025)
    m.add(Ellipsoid(HEAD_C + vec(0.02, -0.03, 0.128), (0.09, 0.10, 0.04)), 0.03)
    return m


def build_hair_long():
    m = Model()
    m.add(Ellipsoid(HEAD_C + vec(0, -0.010, 0.012), (0.132, 0.136, 0.148)))
    m.sub(Func(hairline, (-0.3, -0.3, 1.2), (0.3, 0.3, 1.9)), 0.012)
    for side, s in SIDES:
        m.add(RoundCone((s * 0.06, 0.10, 1.66), (s * 0.130, -0.05, 1.55), 0.026, 0.026), 0.03)
    m.add(Sphere((0, -0.150, 1.500), 0.060), 0.025)
    m.add(Ellipsoid((0, -0.136, 1.548), (0.050, 0.028, 0.022)), 0.012)
    return m


def build_cap():
    m = Model()
    m.add(Ellipsoid(HEAD_C + vec(0, 0.020, 0.118), (0.156, 0.182, 0.076), rot_x(-0.14)))
    m.add(RoundCone(HEAD_C + vec(0, -0.115, 0.078), HEAD_C + vec(0, 0.07, 0.088), 0.142, 0.150,
                    scale=(1.0, 1.0, 0.42), up=(0, 0, 1)), 0.03)
    m.add(Ellipsoid(HEAD_C + vec(0, 0.160, 0.048), (0.112, 0.068, 0.013), rot_x(-0.32)), 0.012)
    m.sub(Ellipsoid(HEAD_C + vec(0, -0.012, 0.016), (0.140, 0.144, 0.158)), 0.004)
    return m


def eye_specs():
    out = []
    for side, s in SIDES:
        out.append((side, s, vec(s * EYE_X, 0.111, EYE_Z), normalize((s * 0.28, 1.0, 0.04))))
    return out
