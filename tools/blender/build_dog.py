"""Build the stylized, rigged and animated base dog -> public/models/dog.glb

Run from the repository root:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" --background --python tools/blender/build_dog.py

Pipeline: analytic SDF anatomy (dog_shape.py) -> surface nets -> decimate and
relax on the exact surface -> procedural skin weights and breed morphs ->
armature -> keyed clips solved with planted-foot IK -> glTF export.
Everything is authored in a "design frame" (+Y forward) and converted to the
Blender frame (+Y back, so the export faces +Z in three.js) when the Blender
data is written.
"""
import json
import math
import sys
import time
from bisect import bisect_right
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector, Quaternion  # noqa: E402

import sdf_lib as S  # noqa: E402
from sdf_lib import vec, smoothstep, normalize  # noqa: E402
import dog_shape as D  # noqa: E402
import bl_util as U  # noqa: E402

ROOT = HERE.parents[1]
OUT_GLB = ROOT / 'public' / 'models' / 'dog.glb'
OUT_BLEND = ROOT / 'art' / 'blender' / 'dog.blend'
FPS = 30
FLIP = np.array([-1.0, -1.0, 1.0])
RM = Matrix.Rotation(math.pi, 4, 'Z')
RM_INV = RM.inverted()
T0 = time.time()


def log(*a):
    print('[dog %5.1fs]' % (time.time() - T0), *a, flush=True)


# ==========================================================================
# Geometry
# ==========================================================================
def materials():
    return dict(
        Coat=U.material('Coat', (0.16, 0.075, 0.03), 0.72),
        Eye=U.material('Eye', (0.010, 0.006, 0.004), 0.06, spec=0.9),
        EyeShine=U.material('EyeShine', (1.0, 1.0, 1.0), 0.3, emission=(1.0, 1.0, 1.0)),
        Nose=U.material('Nose', (0.016, 0.012, 0.012), 0.30, spec=0.7),
        Mouth=U.material('Mouth', (0.10, 0.022, 0.03), 0.55),
        Tongue=U.material('Tongue', (0.70, 0.20, 0.24), 0.42),
    )


def sdf_object(name, model, lo, hi, h, mat, target_tris, relax=1):
    V, Fc = S.mesh_from_model(model, lo, hi, h)
    obj = U.mesh_object(name, V, Fc, mat)
    U.merge_close(obj)
    U.decimate(obj, target_tris)
    if relax:
        U.relax_surface(obj, model, relax, 0.4)
    U.triangulate(obj)
    obj.data.validate(clean_customdata=False)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def ellipsoid_mesh(c, radii, frame, seg=28, rings=18):
    """UV ellipsoid with its poles on local Z (outward winding)."""
    V = [(0.0, 0.0, 1.0)]
    for i in range(1, rings):
        th = math.pi * i / rings
        for j in range(seg):
            ph = 2 * math.pi * j / seg
            V.append((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
    V.append((0.0, 0.0, -1.0))
    top, bot = 0, len(V) - 1
    ring = lambda i, j: 1 + (i * seg) + (j % seg)  # noqa: E731
    Fc = []
    for j in range(seg):
        Fc.append((top, ring(0, j), ring(0, j + 1)))
        Fc.append((bot, ring(rings - 2, j + 1), ring(rings - 2, j)))
    for i in range(rings - 2):
        for j in range(seg):
            Fc.append((ring(i, j), ring(i + 1, j), ring(i + 1, j + 1), ring(i, j + 1)))
    V = np.array(V) * vec(radii)
    V = V @ np.asarray(frame).T + vec(c)
    return V, Fc


def frame_for(forward, up=(0, 0, 1)):
    """Columns x, y(=forward), z."""
    return S.frame_from(forward, up)


def build_eyes(mats):
    Vs, Fs, Vh, Fh = [], [], [], []
    for side, s in D.SIDES:
        c = D.eye_centre(s)
        fwd = D.eye_dir(s)
        R = frame_for(fwd)
        V, Fc = ellipsoid_mesh(c, (D.EYE_R, D.EYE_R, D.EYE_R * 1.04), R)
        Fs += [tuple(i + sum(len(v) for v in Vs) for i in f) for f in Fc]
        Vs.append(V)
        # Catch lights: same world offset on both eyes (key light up-left).
        for off, r in (((0.30, 0.0, 0.62), 0.0064), ((-0.42, 0.0, -0.40), 0.0028)):
            d = normalize(fwd + vec(off))
            p = c + d * (D.EYE_R * 0.985)
            V, Fc = ellipsoid_mesh(p, (r, r * 0.30, r), frame_for(d, (0, 0, 1) if abs(d[2]) < 0.9 else (0, 1, 0)), 14, 8)
            Fh += [tuple(i + sum(len(v) for v in Vh) for i in f) for f in Fc]
            Vh.append(V)
    eyes = U.mesh_object('Eyes', np.concatenate(Vs), Fs, mats['Eye'])
    shine = U.mesh_object('EyeShine', np.concatenate(Vh), Fh, mats['EyeShine'])
    U.triangulate(eyes)
    U.triangulate(shine)
    return eyes, shine


def build_nose(mats, body_model):
    surf = D.march(body_model, D.HO + vec(0, 0.43, 0.624), (0, 1, 0))
    c = surf + vec(0, -0.007, 0.001)
    D.NOSE_C = c
    m = S.Model()
    m.add(S.Ellipsoid(c, (0.0265, 0.0185, 0.0165)))
    m.add(S.Ellipsoid(c + vec(0, -0.001, -0.008), (0.015, 0.016, 0.013)), 0.01)
    for side, s in D.SIDES:
        m.sub(S.Ellipsoid(c + vec(s * 0.0105, 0.0165, -0.0025), (0.0060, 0.0075, 0.0040),
                          S.rot_y(s * 0.5)), 0.003)
    m.sub(S.RoundCone(c + vec(0, 0.0185, -0.004), c + vec(0, 0.012, -0.024), 0.0016, 0.0016), 0.002)
    return sdf_object('Nose', m, c - 0.03, c + 0.03, 0.0009, mats['Nose'], 900)


def build_mouth(mats, nosock_model):
    """Dark lining for the open lip slit, plus a tongue on the jaw floor."""
    cav = D.mouth_cavity

    def lining(P):
        body = nosock_model.eval(P)
        c = cav(P)
        shell = S.smax(body - 0.0012, c - 0.0035, 0.002)
        return S.smax(shell, -(c + 0.0008), 0.0)

    m = S.Model()
    lo = D.HO + vec(-0.075, 0.36, 0.53)
    hi = D.HO + vec(0.075, 0.52, 0.64)
    m.add(S.Func(lining, lo, hi))
    mouth = sdf_object('Mouth', m, lo, hi, 0.0011, mats['Mouth'], 1800, relax=0)
    # Tongue rests on the lower lip plane inside the slit.
    a = -0.10 - 0.03
    d = vec(0, math.cos(a), math.sin(a))
    up = vec(0, -math.sin(a), math.cos(a))
    c = D.HINGE + d * 0.085 - up * 0.0045
    t = S.Model()
    t.add(S.Ellipsoid(c, (0.024, 0.052, 0.0075), S.frame_from(d, up)))
    t.sub(S.RoundCone(c + up * 0.008 + d * -0.04, c + up * 0.008 + d * 0.06, 0.0035, 0.0035), 0.004)
    tongue = sdf_object('Tongue', t, c - 0.07, c + 0.07, 0.0012, mats['Tongue'], 600)
    return mouth, tongue


# ---- ears -----------------------------------------------------------------
def ear_frame(s):
    base, fold, tip = D.ear_joints(s)
    u = normalize(tip - base)
    face = normalize(vec(s * 0.38, 1.0, 0.0))
    return base, fold, tip, u, face


def ear_model(kind):
    m = S.Model()
    for side, s in D.SIDES:
        base, fold, tip, u, face = ear_frame(s)
        b0 = base - u * 0.014
        if kind == 'prick':
            m.add(S.RoundCone(b0, tip + u * 0.010, 0.037, 0.0065, scale=(1.0, 1.0, 0.30), up=face), 0.01)
            m.sub(S.RoundCone(b0 + u * 0.026 + face * 0.0105, tip - u * 0.006 + face * 0.0060, 0.027, 0.003,
                              scale=(1.0, 1.0, 0.30), up=face), 0.004)
        elif kind == 'semi':
            mid = b0 + u * 0.070
            m.add(S.RoundCone(b0, mid, 0.037, 0.024, scale=(1.0, 1.0, 0.30), up=face), 0.01)
            m.sub(S.RoundCone(b0 + u * 0.026 + face * 0.0105, mid + face * 0.007, 0.027, 0.018,
                              scale=(1.0, 1.0, 0.30), up=face), 0.004)
            tdir = normalize(vec(s * 0.10, 0.85, -0.55))
            m.add(S.RoundCone(mid - tdir * 0.004, mid + tdir * 0.046, 0.024, 0.0065, scale=(1.0, 1.0, 0.30), up=u), 0.012)
        else:  # drop
            fd = D.HO + vec(s * 0.103, 0.278, 0.690)
            m.add(S.RoundCone(b0, fd, 0.026, 0.024, scale=(1.0, 1.0, 0.55), up=face), 0.012)
            hang = normalize(vec(s * 0.22, 0.16, -1.0))
            m.add(S.RoundCone(fd + hang * 0.004 + vec(s * 0.006, 0, 0), fd + hang * 0.118 + vec(s * 0.006, 0, 0),
                              0.045, 0.027, scale=(1.0, 1.0, 0.21), up=vec(s, 0, 0)), 0.014)
    return m


def ear_weights(P, kind):
    """Returns dict bone -> weights for both ears of one ear mesh."""
    W = {}
    for side, s in D.SIDES:
        base, fold, tip, u, face = ear_frame(s)
        mine = (P[:, 0] * s) > 0
        if kind in ('prick', 'semi'):
            proj = (P - base) @ u
            lf = float(np.linalg.norm(fold - base))
            wt = smoothstep(lf - 0.012, lf + 0.014, proj)
        else:
            fd_z = D.HO[2] + 0.690
            wt = smoothstep(fd_z - 0.006, fd_z - 0.032, P[:, 2])
        W['ear_%s_tip' % side] = np.where(mine, wt, 0.0)
        W['ear_' + side] = np.where(mine, 1 - wt, 0.0)
    return W


# ---- fluff -------------------------------------------------------------
def poisson_pick(P, spacing, seed):
    rng = np.random.default_rng(seed)
    order = rng.permutation(len(P))
    chosen = []
    for i in order:
        if all(np.linalg.norm(P[i] - P[j]) >= spacing for j in chosen):
            chosen.append(i)
    return chosen


def tuft_set(Vb, Nb, idx, comb, length, r1, depth=0.012, normal_mix=0.40, seed=0, jitter=0.12, tip=0.0035):
    """Tapered locks growing from body vertices idx along a combed direction."""
    rng = np.random.default_rng(seed)
    tufts = []
    for i in idx:
        p, n = Vb[i], Nb[i]
        c = comb(p) if callable(comb) else vec(comb)
        d = normalize(normalize(c) * (1 - normal_mix) + n * normal_mix + rng.normal(0, jitter * 0.3, 3))
        L = (length(p) if callable(length) else length) * (1 + rng.uniform(-jitter, jitter) * 0.6)
        root = p - n * depth
        tufts.append((S.RoundCone(root, p + d * L, r1, tip), i))
    return tufts


def fluff_object(name, tufts, mat, target, h=0.0022, k=0.0075):
    m = S.Model()
    for prim, _ in tufts:
        m.add(prim, k)
    lo = np.min([p.bbox()[0] for p, _ in tufts], 0) - 0.01
    hi = np.max([p.bbox()[1] for p, _ in tufts], 0) + 0.01
    obj = sdf_object(name, m, lo, hi, h, mat, target, relax=1)
    V = U.verts_np(obj)
    Dm = np.stack([p.eval(V) for p, _ in tufts], 1)
    Dm -= Dm.min(1, keepdims=True)
    A = np.exp(-Dm / 0.004)
    A /= A.sum(1, keepdims=True)
    roots = np.array([i for _, i in tufts])
    return obj, A, roots


# ==========================================================================
# Weights and morphs
# ==========================================================================
BONES = [b[0] for b in D.bone_table()]


def body_weights(P, Rw):
    W = np.zeros((len(P), len(BONES)))
    r = {k: Rw[:, i] for i, k in enumerate(D.REGIONS)}
    for region, pts, bones, widths in D.chains():
        cw = S.chain_weights(P, pts, widths)
        for i, b in enumerate(bones):
            W[:, BONES.index(b)] += r[region] * cw[:, i]
    jw = D.jaw_mask(P)
    hi, ji = BONES.index('head'), BONES.index('jaw')
    W[:, ji] = W[:, hi] * jw
    W[:, hi] *= 1 - jw
    return W


def limit_normalize(W, keep=4, floor=0.01):
    W = W.copy()
    W[W < floor] = 0
    if W.shape[1] > keep:
        order = np.argsort(-W, axis=1)
        mask = np.zeros_like(W, dtype=bool)
        np.put_along_axis(mask, order[:, :keep], True, axis=1)
        W[~mask] = 0
    s = W.sum(1, keepdims=True)
    return W / np.maximum(s, 1e-9)


def assign_groups(obj, W):
    for j, b in enumerate(BONES):
        col = W[:, j]
        nz = np.nonzero(col > 0)[0]
        vg = obj.vertex_groups.new(name=b)
        for i in nz:
            vg.add([int(i)], float(col[i]), 'REPLACE')


def weights_dict_to_matrix(n, Wd):
    W = np.zeros((n, len(BONES)))
    for b, w in Wd.items():
        W[:, BONES.index(b)] = w
    return W


def add_shape_keys(obj, deltas):
    """deltas: dict morph -> (N,3) design-frame displacement."""
    obj.shape_key_add(name='Basis', from_mix=False)
    base = U.verts_np(obj)
    for name in D.MORPHS:
        kb = obj.shape_key_add(name=name, from_mix=False)
        kb.data.foreach_set('co', (base + deltas[name]).ravel())
        kb.slider_min, kb.slider_max = 0.0, 1.0
    obj.data.shape_keys.use_relative = True


def flip_mesh_data(obj):
    """Design frame -> Blender frame for vertices and every shape key."""
    if obj.data.shape_keys:
        for kb in obj.data.shape_keys.key_blocks:
            co = np.zeros(len(kb.data) * 3)
            kb.data.foreach_get('co', co)
            kb.data.foreach_set('co', (co.reshape(-1, 3) * FLIP).ravel())
    V = U.verts_np(obj) * FLIP
    U.set_verts(obj, V)


# ==========================================================================
# Rig
# ==========================================================================
def build_rig():
    arm = bpy.data.armatures.new('DogRig')
    rig = bpy.data.objects.new('DogRig', arm)
    bpy.context.scene.collection.objects.link(rig)
    U.activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    tails = {}
    for name, head, tail, parent, region in D.bone_table():
        eb = arm.edit_bones.new(name)
        eb.head = Vector(tuple(head * FLIP))
        eb.tail = Vector(tuple(tail * FLIP))
        d = normalize(tail - head)
        if name.startswith('ear'):
            hint = vec(0, 1, 0)
        else:
            hint = np.cross(vec(1, 0, 0), d)
        eb.align_roll(Vector(tuple(hint * FLIP)))
        if parent:
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = bool(np.allclose(tails[parent], head))
        tails[name] = tail
    arm.edit_bones['root'].use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.display_type = 'STICK'
    return rig


# ==========================================================================
# Animation (design-frame maths, local channels written to the rig)
# ==========================================================================
def curve(s, keys):
    ts = [k[0] for k in keys]
    vs = [k[1] for k in keys]
    i = max(0, min(len(ts) - 2, bisect_right(ts, s) - 1))
    t0, t1 = ts[i], ts[i + 1]
    u = min(1.0, max(0.0, (s - t0) / (t1 - t0)))

    def m(j):
        if j == 0:
            return (vs[1] - vs[0]) / (ts[1] - ts[0])
        if j == len(ts) - 1:
            return (vs[-1] - vs[-2]) / (ts[-1] - ts[-2])
        return 0.5 * ((vs[j + 1] - vs[j]) / (ts[j + 1] - ts[j]) + (vs[j] - vs[j - 1]) / (ts[j] - ts[j - 1]))
    dt = t1 - t0
    h00, h10 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u
    h01, h11 = -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    return h00 * vs[i] + h10 * dt * m(i) + h01 * vs[i + 1] + h11 * dt * m(i + 1)


def qrot(pitch=0.0, yaw=0.0, roll=0.0):
    return (Quaternion((0, 0, 1), yaw) @ Quaternion((1, 0, 0), pitch) @ Quaternion((0, 1, 0), roll))


def bone_matrix(head, tail, lat):
    y = (tail - head).normalized()
    x = (lat - y * lat.dot(y)).normalized()
    z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = head
    return m


def two_bone(a, c, l1, l2, hint):
    d = c - a
    dist = d.length
    u = d / max(dist, 1e-9)
    dc = min(max(dist, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
    along = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc)
    h = math.sqrt(max(l1 * l1 - along * along, 0.0))
    perp = hint - u * hint.dot(u)
    perp.normalize()
    return a + u * along + perp * h, a + u * dc


class Poser:
    LEGS = ('FL', 'FR', 'HL', 'HR')

    def __init__(self, rig, body_V, body_W):
        self.rig = rig
        self.rest = {b.name: RM_INV @ b.matrix_local for b in rig.data.bones}
        self.rest_inv = {k: v.inverted() for k, v in self.rest.items()}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
        self.order = [b[0] for b in D.bone_table()]
        self.Vb = np.c_[body_V, np.ones(len(body_V))]
        self.Wb = body_W
        self.joint = {}
        for side, s in D.SIDES:
            f, h = D.front_leg(s), D.hind_leg(s)
            self.joint['F' + side] = {k: Vector(v) for k, v in f.items()}
            self.joint['H' + side] = {k: Vector(v) for k, v in h.items()}

    # -- pose solve -------------------------------------------------------
    def solve(self, p):
        rest, rinv = self.rest, self.rest_inv
        M = {'root': rest['root']}
        pel = p.get('pelvis', {})
        h0 = rest['spine_01'].translation
        rot = (Matrix.Rotation(pel.get('yaw', 0), 4, 'Z') @ Matrix.Rotation(pel.get('pitch', 0), 4, 'X')
               @ Matrix.Rotation(pel.get('roll', 0), 4, 'Y'))
        off = Vector((pel.get('dx', 0), pel.get('dy', 0), pel.get('dz', 0)))
        M['spine_01'] = Matrix.Translation(h0 + off) @ rot @ Matrix.Translation(-h0) @ rest['spine_01']
        rots = p.get('rot', {})
        legs_bones = set()
        for leg in self.LEGS:
            side = leg[1]
            if leg[0] == 'F':
                legs_bones |= {'upperarm_' + side, 'forearm_' + side, 'paw_front_' + side}
            else:
                legs_bones |= {'thigh_' + side, 'shin_' + side, 'hock_' + side, 'paw_hind_' + side}
        for b in self.order:
            if b in M or b in legs_bones:
                continue
            par = self.parent[b]
            pr = rots.get(b, (0, 0, 0))
            M[b] = M[par] @ rinv[par] @ rest[b] @ qrot(*pr).to_matrix().to_4x4()
        legs = p.get('legs', {})
        for leg in self.LEGS:
            self._leg(M, leg, legs.get(leg, {}))
        return M

    def _leg(self, M, leg, t):
        side = leg[1]
        J = self.joint[leg]
        X = Vector((1, 0, 0))
        if leg[0] == 'F':
            body = M['spine_03'] @ self.rest_inv['spine_03']
            S_ = body @ J['S']
            lat = (body.to_3x3() @ X).normalized()
            back = (Vector((0, -1, -0.25)).normalized() + body.to_3x3() @ Vector((0, -0.5, 0))).normalized()
            l1 = (J['E'] - J['S']).length
            l2 = (J['C'] - J['E']).length
            lp = (J['T'] - J['C']).length
            dpaw = Matrix.Rotation(t.get('f', 0.0), 3, 'X') @ (J['T'] - J['C']).normalized()
            if 'carpus' in t:
                C = Vector(t['carpus'])
            else:
                toe = Vector(t.get('toe', J['T']))
                C = toe - dpaw * lp
            E, C2 = two_bone(S_, C, l1, l2, back)
            M['upperarm_' + side] = bone_matrix(S_, E, lat)
            M['forearm_' + side] = bone_matrix(E, C2, lat)
            M['paw_front_' + side] = bone_matrix(C2, C2 + dpaw * lp, lat)
        else:
            body = M['spine_01'] @ self.rest_inv['spine_01']
            H = body @ J['H']
            lat = (body.to_3x3() @ X).normalized()
            fwd = body.to_3x3() @ Vector((0, 1, 0))
            if 'splay' in t:
                fwd = (fwd + lat * t['splay'] * (1 if side == 'R' else -1)).normalized()
            l1 = (J['K'] - J['H']).length
            l2 = (J['J'] - J['K']).length
            lh = (J['P'] - J['J']).length
            lp = (J['T'] - J['P']).length
            dh = Matrix.Rotation(t.get('h', 0.0), 3, 'X') @ (J['P'] - J['J']).normalized()
            dp = Matrix.Rotation(t.get('f', 0.0), 3, 'X') @ (J['T'] - J['P']).normalized()
            if 'hock' in t:
                Jt = Vector(t['hock'])
            else:
                toe = Vector(t.get('toe', J['T']))
                Jt = toe - dp * lp - dh * lh
            K, J2 = two_bone(H, Jt, l1, l2, fwd)
            P2 = J2 + dh * lh
            M['thigh_' + side] = bone_matrix(H, K, lat)
            M['shin_' + side] = bone_matrix(K, J2, lat)
            M['hock_' + side] = bone_matrix(J2, P2, lat)
            M['paw_hind_' + side] = bone_matrix(P2, P2 + dp * lp, lat)

    # -- helpers ------------------------------------------------------------
    def local(self, M):
        out = {}
        for b in self.order:
            par = self.parent[b]
            if par is None:
                L = self.rest_inv[b] @ M[b]
            else:
                L = (self.rest_inv[par] @ self.rest[b]).inverted() @ M[par].inverted() @ M[b]
            out[b] = L
        return out

    def point(self, M, bone, p):
        return M[bone] @ self.rest_inv[bone] @ Vector(p)

    def skin(self, M):
        A = np.array([np.array(M[b] @ self.rest_inv[b]) for b in BONES])
        return np.einsum('nb,bij,nj->ni', self.Wb, A, self.Vb)[:, :3]

    def head_pitch(self, M):
        y = M['head'].to_3x3() @ Vector((0, 1, 0))
        return math.atan2(y.z, math.hypot(y.x, y.y))

    def rest_toe(self, leg):
        return Vector(self.joint[leg]['T'])


def gait_foot(phi, duty, E, lift, front):
    if phi < duty:
        s = phi / duty
        heel = float(smoothstep(0.62, 1.0, s))
        return E * (0.5 - s), 0.0, (-0.55 if front else -0.40) * heel, -0.30 * heel
    s = (phi - duty) / (1 - duty)
    e = s * s * (3 - 2 * s)
    y = E * (-0.5 + e)
    z = lift * math.sin(math.pi * min(1.0, s * 1.08)) ** 0.85
    if front:
        f = curve(s, [(0, -0.55), (0.30, -1.55), (0.62, -0.85), (0.86, 0.12), (1.0, 0.0)])
        h = 0.0
    else:
        f = curve(s, [(0, -0.40), (0.35, -0.85), (0.75, -0.15), (1.0, 0.0)])
        h = curve(s, [(0, -0.30), (0.35, -0.55), (0.80, 0.08), (1.0, 0.0)])
    return y, z, f, h


def gait_legs(poser, u, duty, E, lifts, offsets, centre=None, spread=0.0):
    legs = {}
    for leg in Poser.LEGS:
        front = leg[0] == 'F'
        phi = (u + offsets[leg]) % 1.0
        y, z, f, h = gait_foot(phi, duty, E, lifts[0] if front else lifts[1], front)
        t = poser.rest_toe(leg)
        cy = (centre or {}).get(leg[0], 0.0)
        sx = spread * (1 if leg[1] == 'R' else -1)
        legs[leg] = dict(toe=Vector((t.x + sx, t.y + y + cy, t.z + z)), f=f, h=h)
    return legs


def standing_legs(poser, spread=0.0, fy=0.0, hy=0.0):
    out = {}
    for leg in Poser.LEGS:
        t = poser.rest_toe(leg)
        sx = spread * (1 if leg[1] == 'R' else -1)
        out[leg] = dict(toe=Vector((t.x + sx, t.y + (fy if leg[0] == 'F' else hy), t.z)))
    return out


TAU = 2 * math.pi


def build_clips(poser):
    clips = {}
    W, R_ = 'legs', 'rot'

    def neck_to_nose(base, target_z, head_abs, n1_share=0.62):
        """Find neck flexion so the nose tip reaches target_z."""
        lo, hi = -1.6, 0.6
        for _ in range(40):
            mid = 0.5 * (lo + hi)
            p = base_copy(base)
            r = p.setdefault('rot', {})
            r['neck_01'] = (mid * n1_share, 0, 0)
            r['neck_02'] = (mid * (1 - n1_share), 0, 0)
            M = poser.solve(p)
            hp = poser.head_pitch(M)
            hpitch = r.get('head', (0, 0, 0))[0] + (head_abs - hp)
            r['head'] = (hpitch,) + tuple(r.get('head', (0, 0, 0))[1:])
            M = poser.solve(p)
            z = poser.point(M, 'head', D.NOSE_C).z
            if z > target_z:
                hi = mid
            else:
                lo = mid
        return mid, hpitch

    def set_head_abs(p, head_abs):
        M = poser.solve(p)
        r = p.setdefault('rot', {})
        cur = r.get('head', (0, 0, 0))
        r['head'] = (cur[0] + head_abs - poser.head_pitch(M), cur[1], cur[2])

    # ---------------- Idle ------------------------------------------------
    def idle(u):
        b = math.sin(TAU * 2 * u)
        p = {'pelvis': dict(dx=0.006 * math.sin(TAU * u), dz=-0.002 + 0.0015 * b,
                            roll=0.012 * math.sin(TAU * u)),
             R_: {'spine_02': (0.006 * b, 0, 0), 'spine_03': (0.008 * b, 0, 0),
                  'neck_01': (0.03 * math.sin(TAU * u + 1.0), 0.05 * math.sin(TAU * u + 0.4), 0),
                  'head': (0.02 * math.sin(TAU * 2 * u + 0.5), 0.06 * math.sin(TAU * u + 0.9), 0.03 * math.sin(TAU * u)),
                  'tail_01': (0.02 * b, 0, 0)},
             W: standing_legs(poser)}
        return p
    clips['Idle'] = (90, idle, True)

    # ---------------- Walk ------------------------------------------------
    walk_off = {'HL': 0.0, 'FL': 0.25, 'HR': 0.5, 'FR': 0.75}

    def walk(u):
        c2 = math.cos(TAU * 2 * u)
        sw = math.sin(TAU * u)
        return {'pelvis': dict(dz=-0.004 + 0.005 * c2, roll=0.02 * sw, yaw=0.025 * sw),
                R_: {'spine_02': (0, -0.03 * sw, 0), 'spine_03': (0.01 * c2, -0.03 * sw, 0),
                     'neck_01': (-0.04 + 0.025 * math.cos(TAU * 2 * u + 0.6), 0.04 * sw, 0),
                     'head': (0.02 - 0.02 * math.cos(TAU * 2 * u + 0.6), 0.03 * sw, 0),
                     'tail_01': (0, 0.07 * math.sin(TAU * u + 1.5), 0)},
                W: gait_legs(poser, u, 0.64, 0.22, (0.045, 0.040), walk_off)}
    clips['Walk'] = (32, walk, True)

    # ---------------- Trot ------------------------------------------------
    trot_off = {'HL': 0.0, 'FR': 0.0, 'HR': 0.5, 'FL': 0.5}

    def trot(u):
        duty = 0.42
        bob = -math.cos(TAU * 2 * (u - duty / 2))
        return {'pelvis': dict(dz=-0.006 + 0.010 * bob, pitch=0.012 * math.sin(TAU * 2 * u), roll=0.025 * math.sin(TAU * u)),
                R_: {'spine_03': (0.01 * bob, 0, 0),
                     'neck_01': (-0.10 - 0.02 * bob, 0, 0), 'neck_02': (-0.02, 0, 0),
                     'head': (0.10 + 0.03 * bob, 0, 0),
                     'tail_01': (0, 0.05 * math.sin(TAU * u), 0)},
                W: gait_legs(poser, u, duty, 0.30, (0.075, 0.062), trot_off)}
    clips['Trot'] = (20, trot, True)

    # ---------------- Gallop (rotary) -----------------------------------
    gal_off = {'HL': 0.0, 'HR': 0.08, 'FR': 0.40, 'FL': 0.48}

    def gallop(u):
        flex = 0.20 * math.cos(TAU * (u - 0.35))
        pitch = 0.07 * math.sin(TAU * (u - 0.12))
        dz = -0.010 + 0.022 * math.cos(TAU * (u - 0.86))
        return {'pelvis': dict(dz=dz, dy=0.02 * math.cos(TAU * (u - 0.35)), pitch=pitch - 0.55 * flex),
                R_: {'spine_02': (0.55 * flex, 0, 0), 'spine_03': (0.55 * flex, 0, 0),
                     'neck_01': (-0.12 - 0.5 * flex - pitch, 0, 0), 'neck_02': (-0.08, 0, 0),
                     'head': (0.14 - 0.3 * flex, 0, 0),
                     'tail_01': (-0.25 * flex, 0, 0), 'tail_02': (-0.15 * flex, 0, 0)},
                W: gait_legs(poser, u, 0.30, 0.44, (0.11, 0.09), gal_off, centre={'F': 0.02, 'H': -0.01})}
    clips['Gallop'] = (16, gallop, True)

    # ---------------- Sniff -----------------------------------------------
    sniff_base = {'pelvis': dict(dz=-0.022, pitch=-0.05), R_: {'spine_03': (-0.05, 0, 0), 'head': (0, 0, 0)},
                  W: standing_legs(poser)}
    n_mid, h_p = neck_to_nose(sniff_base, 0.052, -1.05)

    def sniff(u):
        s1 = math.sin(TAU * u)
        p = {'pelvis': dict(dz=-0.022 + 0.003 * math.cos(TAU * 2 * u), pitch=-0.05, yaw=0.03 * s1),
             R_: {'spine_03': (-0.05, -0.03 * s1, 0),
                  'neck_01': (n_mid * 0.62, 0.16 * s1, 0), 'neck_02': (n_mid * 0.38, 0.06 * s1, 0),
                  'head': (h_p + 0.05 * math.sin(TAU * 6 * u), 0.08 * math.sin(TAU * u + 0.5), 0),
                  'jaw': (-0.015 - 0.015 * math.sin(TAU * 6 * u), 0, 0)},
             W: gait_legs(poser, u, 0.72, 0.10, (0.025, 0.022), walk_off)}
        return p
    clips['Sniff'] = (60, sniff, True)

    # ---------------- Sit / LookUp ---------------------------------------
    sit = solve_sit(poser)

    def sit_clip(u):
        p = base_copy(sit)
        b = math.sin(TAU * 2 * u)
        r = p[R_]
        r['spine_03'] = (r['spine_03'][0] + 0.010 * b, 0, 0)
        r['neck_01'] = (r['neck_01'][0] + 0.02 * math.sin(TAU * u), 0.05 * math.sin(TAU * u + 0.7), 0)
        r['head'] = (r['head'][0], 0.04 * math.sin(TAU * u + 1.3), 0.04 * math.sin(TAU * u))
        return p
    clips['Sit'] = (60, sit_clip, True)

    look = base_copy(sit)
    look[R_]['neck_01'] = (look[R_]['neck_01'][0] + 0.30, 0, 0)
    look[R_]['neck_02'] = (look[R_]['neck_02'][0] + 0.18, 0, 0)
    set_head_abs(look, 0.62)

    def lookup(u):
        p = base_copy(look)
        r = p[R_]
        bounce = math.sin(TAU * 2 * u)
        p['pelvis']['dz'] += 0.002 * bounce
        r['spine_03'] = (r['spine_03'][0] + 0.012 * bounce, 0, 0)
        r['head'] = (r['head'][0] + 0.03 * math.sin(TAU * 2 * u + 0.4), 0, 0.10 * math.sin(TAU * u))
        r['neck_02'] = (r['neck_02'][0], 0.04 * math.sin(TAU * u + 0.3), 0)
        return p
    clips['LookUp'] = (60, lookup, True)

    # ---------------- Down -------------------------------------------------
    down = solve_down(poser)

    def down_clip(u):
        p = base_copy(down)
        b = math.sin(TAU * 1.5 * u) if False else math.sin(TAU * 2 * u)
        r = p[R_]
        r['spine_02'] = (r['spine_02'][0] + 0.006 * b, 0, 0)
        r['spine_03'] = (r['spine_03'][0] + 0.010 * b, 0, 0)
        r['neck_01'] = (r['neck_01'][0], 0.06 * math.sin(TAU * u), 0)
        r['head'] = (r['head'][0] + 0.02 * math.sin(TAU * u + 1), 0.03 * math.sin(TAU * u + 0.5), 0)
        return p
    clips['Down'] = (60, down_clip, True)

    # ---------------- Crouch (stalk) ------------------------------------
    crouch = {'pelvis': dict(dz=-0.085, pitch=-0.02), R_: {'spine_02': (-0.02, 0, 0), 'spine_03': (-0.05, 0, 0),
                                                           'neck_01': (-0.42, 0, 0), 'neck_02': (-0.06, 0, 0),
                                                           'tail_01': (0.25, 0, 0), 'tail_02': (0.1, 0, 0)},
              W: standing_legs(poser, spread=0.012, fy=0.03, hy=-0.035)}
    set_head_abs(crouch, -0.06)

    def crouch_clip(u):
        p = base_copy(crouch)
        b = math.sin(TAU * 2 * u)
        p['pelvis']['dz'] += 0.0025 * b
        p['pelvis']['dx'] = 0.003 * math.sin(TAU * u)
        r = p[R_]
        r['spine_03'] = (r['spine_03'][0] + 0.008 * b, 0, 0)
        r['head'] = (r['head'][0], 0.03 * math.sin(TAU * u + 0.5), 0)
        return p
    clips['Crouch'] = (60, crouch_clip, True)

    # ---------------- Eat ---------------------------------------------------
    eat_base = {'pelvis': dict(dz=-0.02, pitch=-0.07), R_: {'spine_03': (-0.08, 0, 0)},
                W: standing_legs(poser, spread=0.008, fy=-0.01)}
    e_mid, e_h = neck_to_nose(eat_base, 0.10, -0.55)

    def eat(u):
        chew = 0.5 - 0.5 * math.cos(TAU * 3 * u)
        bob = math.sin(TAU * 3 * u)
        return {'pelvis': dict(dz=-0.02, pitch=-0.07),
                R_: {'spine_03': (-0.08, 0, 0),
                     'neck_01': (e_mid * 0.62 + 0.03 * bob, 0.03 * math.sin(TAU * u), 0),
                     'neck_02': (e_mid * 0.38, 0, 0),
                     'head': (e_h + 0.06 * bob, 0.04 * math.sin(TAU * u + 0.6), 0.03 * math.sin(TAU * 1.5 * u)),
                     'jaw': (-0.02 - 0.20 * chew, 0, 0)},
                W: standing_legs(poser, spread=0.008, fy=-0.01)}
    clips['Eat'] = (48, eat, True)

    # ---------------- PlayBow --------------------------------------------
    bow = solve_bow(poser)

    def bow_clip(u):
        p = base_copy(bow)
        b = math.sin(TAU * 2 * u)
        p['pelvis']['dz'] += 0.008 * b
        p['pelvis']['pitch'] += 0.02 * b
        r = p[R_]
        r['head'] = (r['head'][0] - 0.02 * b, 0.05 * math.sin(TAU * u), 0.12 * math.sin(TAU * u + 0.3))
        return p
    clips['PlayBow'] = (40, bow_clip, True)

    # ---------------- Shake (one shot) --------------------------------
    def shake(u):
        env = math.sin(math.pi * u) ** 0.8
        w = TAU * 5.0
        ph = lambda lag: math.sin(w * u - lag)  # noqa: E731
        legs = standing_legs(poser, spread=0.018)
        return {'pelvis': dict(roll=0.22 * env * ph(1.2), dz=-0.012 * env, dx=0.008 * env * ph(1.6)),
                R_: {'spine_02': (0, 0, 0.10 * env * ph(0.9)), 'spine_03': (0, 0, 0.12 * env * ph(0.6)),
                     'neck_01': (0.05 * env, 0, 0.16 * env * ph(0.3)), 'neck_02': (0, 0, 0.14 * env * ph(0.1)),
                     'head': (0.04 * env, 0, 0.30 * env * ph(-0.2)),
                     'jaw': (-0.08 * env, 0, 0),
                     'ear_L': (0, 0.3 * env * ph(-0.6), 0), 'ear_R': (0, -0.3 * env * ph(-0.6), 0),
                     'tail_01': (0, 0.25 * env * ph(1.6), 0), 'tail_02': (0, 0.25 * env * ph(2.0), 0)},
                W: legs}
    clips['Shake'] = (36, shake, False)
    return clips


def base_copy(p):
    out = {}
    for k, v in p.items():
        if isinstance(v, dict):
            out[k] = {kk: (dict(vv) if isinstance(vv, dict) else (Vector(vv) if isinstance(vv, Vector) else vv))
                      for kk, vv in v.items()}
        else:
            out[k] = v
    return out


def lowest(poser, M, bones=None, thresh=0.5):
    V = poser.skin(M)
    if bones:
        idx = [BONES.index(b) for b in bones]
        mask = poser.Wb[:, idx].sum(1) > thresh
        V = V[mask]
    return float(V[:, 2].min())


TORSO_BONES = ['spine_01', 'spine_02', 'spine_03', 'neck_01', 'tail_01']
TAIL_BONES = ['tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05']


def lowest_by_bone(poser, M):
    V = poser.skin(M)
    dom = np.argmax(poser.Wb, 1)
    i = int(np.argmin(V[:, 2]))
    return float(V[i, 2]), BONES[dom[i]]


def rest_tail_on_ground(poser, p, clearance=0.006, curl=0.10):
    """Pick the lowest tail carriage whose vertices stay above the ground."""
    r = p.setdefault('rot', {})
    for t1 in np.linspace(0.9, -1.4, 47):
        r['tail_01'] = (float(t1), 0, 0)
        for i, b in enumerate(TAIL_BONES[1:]):
            r[b] = (-curl * (i + 1) / 4, 0, 0)
        if lowest(poser, poser.solve(p), TAIL_BONES, 0.3) >= clearance:
            return float(t1)
    return float(t1)


def solve_sit(poser):
    best = None
    for theta in np.linspace(0.45, 1.05, 25):
        p = {'pelvis': dict(pitch=float(theta), dy=-0.035),
             'rot': {'spine_02': (-0.10, 0, 0), 'spine_03': (-0.14, 0, 0),
                     'neck_01': (-0.30, 0, 0), 'neck_02': (-0.10, 0, 0),
                     }}
        p['legs'] = {}
        for _ in range(3):
            M = poser.solve(p)
            dz = p['pelvis'].get('dz', 0) - lowest(poser, M, ['spine_01', 'thigh_L', 'thigh_R'], 0.6) + 0.004
            p['pelvis']['dz'] = dz
            M = poser.solve(p)
            for side, s in D.SIDES:
                Hp = poser.point(M, 'spine_01', poser.joint['H' + side]['H'])
                J = poser.joint['H' + side]
                dh = Matrix.Rotation(1.42, 3, 'X') @ (J['P'] - J['J']).normalized()
                p['legs']['H' + side] = dict(hock=Vector((J['J'].x * 1.08, Hp.y - 0.015, 0.031)), h=1.42, f=0.22)
                t = poser.rest_toe('F' + side)
                p['legs']['F' + side] = dict(toe=Vector((t.x, t.y - 0.03, t.z)))
        M = poser.solve(p)
        fl = poser.joint['FL']
        S_ = poser.point(M, 'spine_03', fl['S'])
        lp = (fl['T'] - fl['C']).length
        C = Vector(p['legs']['FL']['toe']) - (fl['T'] - fl['C']).normalized() * lp
        ratio = (C - S_).length / ((fl['E'] - fl['S']).length + (fl['C'] - fl['E']).length)
        score = abs(ratio - 0.975)
        if best is None or score < best[0]:
            best = (score, theta, base_copy(p), ratio)
    score, theta, p, ratio = best
    rest_tail_on_ground(poser, p, curl=0.25)
    M = poser.solve(p)
    r = p['rot']
    r['head'] = (r.get('head', (0, 0, 0))[0] + (-0.05 - poser.head_pitch(M)), 0, 0)
    print('SIT pitch %.3f dz %.3f front-leg reach %.3f' % (theta, p['pelvis']['dz'], ratio))
    return p


def elbows_down(poser, M, p, reach=1.0, f=0.45, ez=0.042, cz=0.034):
    """Front legs folded with elbows and forearms resting on the ground."""
    for side, s in D.SIDES:
        fj = poser.joint['F' + side]
        S_ = poser.point(M, 'spine_03', fj['S'])
        l1 = (fj['E'] - fj['S']).length
        l2 = (fj['C'] - fj['E']).length
        drop = max(0.0, min(l1 * 0.98, S_.z - ez))
        back = math.sqrt(max(l1 * l1 - drop * drop, 0.0))
        E = Vector((fj['E'].x * 1.04, S_.y - back * 0.9, S_.z - drop))
        C = E + Vector((0, l2 * reach, 0))
        C.z = cz
        p['legs']['F' + side] = dict(carpus=C, f=f)


def front_leg_low(poser, M, names=('upperarm_', 'forearm_')):
    V = poser.skin(M)
    idx = [BONES.index(n + sd) for n in names for sd in 'LR']
    mask = poser.Wb[:, idx].sum(1) > 0.5
    return float(V[mask, 2].min())


def solve_down(poser):
    p = {'pelvis': dict(pitch=0.03, dy=-0.03),
         'rot': {'spine_02': (0.0, 0, 0), 'spine_03': (0.02, 0, 0), 'neck_01': (0.18, 0, 0), 'neck_02': (0.05, 0, 0)},
         'legs': {}}
    for _ in range(5):
        M = poser.solve(p)
        elbows_down(poser, M, p)
        for side, s in D.SIDES:
            hj = poser.joint['H' + side]
            Hp = poser.point(M, 'spine_01', hj['H'])
            p['legs']['H' + side] = dict(hock=Vector((hj['J'].x * 1.16, Hp.y - 0.03, 0.031)), h=1.45, f=0.22, splay=0.18)
        M = poser.solve(p)
        low = lowest(poser, M, ['spine_02', 'spine_03'], 0.5)
        p['pelvis']['dz'] = p['pelvis'].get('dz', 0) - low + 0.003
    for _ in range(3):
        M = poser.solve(p)
        elbows_down(poser, M, p)
        fl = front_leg_low(poser, poser.solve(p))
        if fl < 0.002:
            p['pelvis']['dz'] += 0.002 - fl
    fix_leg_ground(poser, p, Poser.LEGS)
    rest_tail_on_ground(poser, p, curl=0.15)
    M = poser.solve(p)
    r = p['rot']
    r['head'] = (-0.02 - poser.head_pitch(M) + 0.0, 0, 0)
    print('DOWN dz %.3f front low %.4f' % (p['pelvis']['dz'], front_leg_low(poser, poser.solve(p))))
    return p


def solve_bow(poser):
    p = {'pelvis': dict(pitch=-0.36, dz=0.0), 'rot': {'spine_02': (-0.12, 0, 0), 'spine_03': (-0.12, 0, 0),
                                                     'neck_01': (0.60, 0, 0), 'neck_02': (0.15, 0, 0),
                                                     'tail_01': (-0.35, 0, 0)},
         'legs': {}}
    fj = poser.joint['FL']
    for _ in range(12):
        M = poser.solve(p)
        S_ = poser.point(M, 'spine_03', fj['S'])
        # Bend at the loin until the shoulders sit one upper-arm length above the ground.
        p['rot']['spine_02'] = (p['rot']['spine_02'][0] - (S_.z - 0.150) * 1.5, 0, 0)
    for _ in range(4):
        M = poser.solve(p)
        elbows_down(poser, M, p, reach=1.0)
        for side, s in D.SIDES:
            t = poser.rest_toe('H' + side)
            p['legs']['H' + side] = dict(toe=Vector((t.x, t.y - 0.03, t.z)))
        M = poser.solve(p)
        low = min(front_leg_low(poser, M), lowest(poser, M, ['spine_03'], 0.5))
        if low < 0.002:
            p['pelvis']['dz'] += 0.002 - low
    fix_leg_ground(poser, p, ('FL', 'FR'))
    M = poser.solve(p)
    r = p['rot']
    r['head'] = (0.0 + (0.12 - poser.head_pitch(M)), 0, 0)
    print('BOW chest low %.3f front low %.4f' % (lowest(poser, M, ['spine_03'], 0.5), front_leg_low(poser, M)))
    return p


def iter_fcurves(action):
    try:
        return list(action.fcurves)
    except AttributeError:
        out = []
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    out += list(bag.fcurves)
        return out


def fix_leg_ground(poser, p, legs, clearance=0.002, iters=4):
    """Raise carpus/hock targets until that leg's skin clears the ground."""
    for _ in range(iters):
        M = poser.solve(p)
        V = poser.skin(M)
        moved = False
        for leg in legs:
            side = leg[1]
            names = (['upperarm_', 'forearm_', 'paw_front_'] if leg[0] == 'F' else ['thigh_', 'shin_', 'hock_', 'paw_hind_'])
            idx = [BONES.index(n + side) for n in names]
            mask = poser.Wb[:, idx].sum(1) > 0.5
            low = float(V[mask, 2].min())
            if low < clearance:
                t = p['legs'][leg]
                key = 'carpus' if 'carpus' in t else ('hock' if 'hock' in t else 'toe')
                v = Vector(t[key])
                v.z += clearance - low
                t[key] = v
                moved = True
        if not moved:
            return


def key_clips(rig, poser, clips):
    scene = bpy.context.scene
    scene.render.fps = FPS
    rig.animation_data_create()
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    report = {}
    for name, (n, fn, loop) in clips.items():
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        rig.animation_data.action = action
        prev = {}
        lows = []
        for fr in range(n + 1):
            u = (fr % n) / n if loop else fr / n
            p = fn(u)
            M = poser.solve(p)
            L = poser.local(M)
            if fr % 2 == 0:
                lows.append(lowest_by_bone(poser, M))
            for b in BONES:
                pb = rig.pose.bones[b]
                q = L[b].to_quaternion()
                if b in prev and prev[b].dot(q) < 0:
                    q.negate()
                prev[b] = q
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=fr, group=b)
                if b == 'spine_01':
                    pb.location = L[b].translation
                    pb.keyframe_insert('location', frame=fr, group=b)
        for fc in iter_fcurves(action):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
        action.frame_range = (0, n)
        action.use_frame_range = True
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, action)
        track.mute = True
        rig.animation_data.action = None
        lo = min(lows)
        report[name] = (n, round(lo[0], 4), lo[1])
        log('clip', name, n, 'frames, lowest vertex z', round(lo[0], 4), lo[1])
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return report


# ==========================================================================
# Main
# ==========================================================================
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials()

    # ---- body --------------------------------------------------------
    model = D.build_body()
    nosock = D.build_body(slit=False, sockets=False)
    body = sdf_object('DogBody', model, *D.BODY_BOUNDS, 0.0032, mats['Coat'], 10400, relax=2)
    Vb = U.verts_np(body)
    log('body', len(Vb), 'verts', U.tri_count(body), 'tris')
    prims = model.prims('add')
    Rw = S.region_weights(prims, Vb, D.REGIONS, 0.008)
    Rw = U.laplacian_smooth_values(body, Rw, 4, 0.5)
    Rw /= Rw.sum(1, keepdims=True)
    Nb = model.gradient(Vb)
    Nb /= np.linalg.norm(Nb, axis=1, keepdims=True)
    Wb = limit_normalize(body_weights(Vb, Rw))
    morph_b = {m: D.morph_delta(m, Vb, Rw) for m in D.MORPHS}

    objs = {'DogBody': (body, Wb, morph_b)}

    def region_at(P):
        return S.region_weights(prims, P, D.REGIONS, 0.008)

    def rigid_morph(anchor, n):
        A = np.asarray(anchor)[None]
        ra = region_at(A)
        return {m: np.repeat(D.morph_delta(m, A, ra), n, 0) for m in D.MORPHS}

    # ---- face ----------------------------------------------------------
    eyes, shine = build_eyes(mats)
    for obj in (eyes, shine):
        V = U.verts_np(obj)
        Wd = {}
        W = weights_dict_to_matrix(len(V), {'head': np.ones(len(V))})
        dm = {m: np.zeros_like(V) for m in D.MORPHS}
        for side, s in D.SIDES:
            mask = (V[:, 0] * s) > 0
            rm = rigid_morph(D.eye_centre(s), 1)
            for m in D.MORPHS:
                dm[m][mask] = rm[m][0]
        objs[obj.name] = (obj, W, dm)
    nose = build_nose(mats, nosock)
    Vn = U.verts_np(nose)
    objs['Nose'] = (nose, weights_dict_to_matrix(len(Vn), {'head': np.ones(len(Vn))}), rigid_morph(D.NOSE_C, len(Vn)))
    mouth, tongue = build_mouth(mats, nosock)
    for obj in (mouth, tongue):
        V = U.verts_np(obj)
        jw = D.jaw_mask(V)
        if obj is tongue:
            jw = np.ones(len(V))
        W = weights_dict_to_matrix(len(V), {'head': 1 - jw, 'jaw': jw})
        ra = region_at(V)
        ra[:] = 0
        ra[:, D.REGIONS.index('head')] = 1
        objs[obj.name] = (obj, limit_normalize(W), {m: D.morph_delta(m, V, ra) for m in D.MORPHS})
    log('face parts done')

    # ---- ears ----------------------------------------------------------
    for kind, name in (('prick', 'Ear_Prick'), ('drop', 'Ear_Drop'), ('semi', 'Ear_Semi')):
        m = ear_model(kind)
        lo = D.HO + vec(-0.17, 0.20, 0.50)
        hi = D.HO + vec(0.17, 0.38, 0.86)
        obj = sdf_object(name, m, lo, hi, 0.0016, mats['Coat'], 1400, relax=1)
        V = U.verts_np(obj)
        W = weights_dict_to_matrix(len(V), ear_weights(V, kind))
        dm = {mm: np.zeros_like(V) for mm in D.MORPHS}
        for side, s in D.SIDES:
            mask = (V[:, 0] * s) > 0
            rm = rigid_morph(D.ear_joints(s)[0], 1)
            for mm in D.MORPHS:
                dm[mm][mask] = rm[mm][0]
        objs[name] = (obj, limit_normalize(W), dm)
    log('ears done')

    # ---- fluff ---------------------------------------------------------
    r = {k: Rw[:, i] for i, k in enumerate(D.REGIONS)}
    x, y, z = Vb[:, 0], Vb[:, 1], Vb[:, 2]

    def fluff(name, tufts, target):
        obj, A, roots = fluff_object(name, tufts, mats['Coat'], target)
        W = limit_normalize(A @ Wb[roots])
        dm = {m: A @ morph_b[m][roots] for m in D.MORPHS}
        objs[name] = (obj, W, dm)
        log(name, len(tufts), 'tufts', U.tri_count(obj), 'tris')

    chest_idx = np.nonzero((r['torso'] + r['neck'] > 0.6) & (y > 0.15) & (z > 0.22) & (z < 0.47)
                           & (np.abs(x) < 0.085) & (Nb[:, 1] > 0.25))[0]
    pick = [chest_idx[i] for i in poisson_pick(Vb[chest_idx], 0.020, 1)]
    fluff('Fluff_Chest', tuft_set(Vb, Nb, pick, (0, 0.30, -1.0), lambda p: 0.045 + 0.30 * max(0, 0.40 - p[2]),
                                  0.021, normal_mix=0.32, seed=2), 2600)

    neck_idx = np.nonzero((r['neck'] > 0.55) & (z > 0.40))[0]
    pick = [neck_idx[i] for i in poisson_pick(Vb[neck_idx], 0.022, 3)]
    fluff('Fluff_Neck', tuft_set(Vb, Nb, pick, (0, -0.65, -0.75), 0.042, 0.018, normal_mix=0.55, seed=4), 2600)

    sx_tail, _, _ = S.project_polyline(Vb, D.TAIL)
    tail_idx = np.nonzero((r['tail'] > 0.6) & (sx_tail > 0.03) & (Nb[:, 2] < 0.6))[0]
    pick = [tail_idx[i] for i in poisson_pick(Vb[tail_idx], 0.017, 5)]
    tlen = lambda p: 0.035 + 0.055 * float(smoothstep(-0.22, -0.40, p[1]))  # noqa: E731
    fluff('Fluff_Tail', tuft_set(Vb, Nb, pick, (0, -0.35, -1.0), tlen, 0.020, normal_mix=0.28, seed=6), 2200)

    leg_idx = np.nonzero((((r['FL'] + r['FR']) > 0.6) & (Nb[:, 1] < -0.40) & (z > 0.09) & (z < 0.27)) |
                         (((r['HL'] + r['HR']) > 0.6) & (Nb[:, 1] < -0.15) & (z > 0.21) & (z < 0.40)))[0]
    pick = [leg_idx[i] for i in poisson_pick(Vb[leg_idx], 0.018, 7)]
    fluff('Fluff_Legs', tuft_set(Vb, Nb, pick, (0, -0.30, -1.0), 0.050, 0.020, normal_mix=0.15, seed=8), 2600)

    # Ear feathering follows the drop ear (for spaniel/setter types).
    ear_obj, ear_W, ear_dm = objs['Ear_Drop']
    Ve = U.verts_np(ear_obj)
    em = ear_model('drop')
    Ne = em.gradient(Ve)
    Ne /= np.linalg.norm(Ne, axis=1, keepdims=True)
    fd_z = D.HO[2] + 0.690
    e_idx = np.nonzero((Ve[:, 2] < fd_z - 0.035) & (np.abs(Ne[:, 0]) > 0.35))[0]
    e_pick = [e_idx[i] for i in poisson_pick(Ve[e_idx], 0.016, 9)]
    tufts = tuft_set(Ve, Ne, e_pick, (0, 0.05, -1.0), lambda p: 0.03 + 0.25 * max(0, fd_z - 0.06 - p[2]), 0.015,
                     depth=0.006, normal_mix=0.30, seed=10)
    obj, A, roots = fluff_object('Fluff_Ears', tufts, mats['Coat'], 1800)
    objs['Fluff_Ears'] = (obj, limit_normalize(A @ ear_W[roots]), {m: A @ ear_dm[m][roots] for m in D.MORPHS})
    log('Fluff_Ears', len(tufts), 'tufts')

    # Beard / furnishings: moustache, chin beard and brows.
    hy = D.HINGE[1]
    mus = np.nonzero((r['head'] > 0.6) & (y > hy + 0.055) & (z < D.NOSE_C[2] - 0.004) & (z > D.HINGE[2] - 0.012)
                     & (np.abs(x) > 0.010) & (Nb[:, 1] > -0.2))[0]
    chin = np.nonzero((r['head'] > 0.6) & (Wb[:, BONES.index('jaw')] > 0.5) & (Nb[:, 2] < -0.25))[0]
    brow = np.nonzero((r['head'] > 0.6) & (Nb[:, 1] > 0.35) & (Nb[:, 2] > 0.25) & (np.abs(x) > 0.03) & (np.abs(x) < 0.075)
                      & (z > D.eye_centre(1)[2] + D.EYE_R * 0.9) & (z < D.eye_centre(1)[2] + D.EYE_R * 2.0))[0]
    tufts = []
    tufts += tuft_set(Vb, Nb, [mus[i] for i in poisson_pick(Vb[mus], 0.012, 11)],
                      lambda p: (np.sign(p[0]) * 0.55, 0.35, -1.0), 0.032, 0.012, depth=0.007, normal_mix=0.35, seed=12)
    tufts += tuft_set(Vb, Nb, [chin[i] for i in poisson_pick(Vb[chin], 0.012, 13)],
                      (0, 0.25, -1.0), 0.040, 0.012, depth=0.007, normal_mix=0.3, seed=14)
    tufts += tuft_set(Vb, Nb, [brow[i] for i in poisson_pick(Vb[brow], 0.012, 15)],
                      lambda p: (np.sign(p[0]) * 0.4, 0.7, 0.6), 0.022, 0.010, depth=0.006, normal_mix=0.3, seed=16)
    obj, A, roots = fluff_object('Beard', tufts, mats['Coat'], 2000, h=0.0016, k=0.005)
    objs['Beard'] = (obj, limit_normalize(A @ Wb[roots]), {m: A @ morph_b[m][roots] for m in D.MORPHS})
    log('Beard', len(tufts), 'tufts')

    # ---- weights, morphs, frame conversion ----------------------------
    for name, (obj, W, dm) in objs.items():
        assign_groups(obj, W)
        add_shape_keys(obj, dm)
        flip_mesh_data(obj)
        obj.data.name = name
    rig = build_rig()
    for name, (obj, W, dm) in objs.items():
        obj.parent = rig
        mod = obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = rig
    log('rig bound')

    # ---- morph bone offsets (optional runtime helper, stored as extras) --
    joint_regions = {b[0]: b[4] for b in D.bone_table()}
    heads = {b[0]: b[1] for b in D.bone_table()}
    offsets = {}
    for mname in D.MORPHS:
        per = {}
        for bname, head in heads.items():
            if bname == 'root':
                continue
            ra = np.zeros((1, len(D.REGIONS)))
            ra[0, D.REGIONS.index(joint_regions[bname])] = 1
            per[bname] = D.morph_delta(mname, head[None], ra)[0]
        local = {}
        for bone in rig.data.bones:
            if bone.parent is None:
                continue
            dchild = Vector(per[bone.name] * FLIP)
            dpar = Vector(per[bone.parent.name] * FLIP) if bone.parent.name in per else Vector()
            dl = bone.parent.matrix_local.to_3x3().inverted() @ (dchild - dpar)
            if dl.length > 1e-5:
                local[bone.name] = [round(v, 5) for v in dl]
        offsets[mname] = local
    rig['dogMorphBoneOffsets'] = json.dumps(offsets)

    # ---- animation ----------------------------------------------------
    poser = Poser(rig, Vb, Wb)
    clips = build_clips(poser)
    report = key_clips(rig, poser, clips)

    # ---- save + export -------------------------------------------------
    OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    export(rig, [o for o, _, _ in objs.values()])
    tris = {name: U.tri_count(o) for name, (o, _, _) in objs.items()}
    log('triangles', tris)
    log('clip report', report)


def export(rig, meshes):
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB), use_selection=True, export_format='GLB', export_yup=True,
        export_apply=False, export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=False, export_optimize_animation_keep_anim_armature=False, export_frame_range=False, export_anim_single_armature=True,
        export_skins=True, export_all_influences=False, export_morph=True, export_morph_normal=True,
        export_extras=True, export_materials='EXPORT', export_texcoords=False, export_normals=True,
        export_optimize_animation_size=True, export_def_bones=False, export_rest_position_armature=True)
    log('exported', OUT_GLB, OUT_GLB.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
