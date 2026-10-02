"""Build the stylized rigged keeper/handler -> public/models/person.glb

Run from the repository root:
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" --background --python tools/blender/build_person.py

Same pipeline as build_dog.py: SDF garments/anatomy -> surface nets ->
decimate/relax -> procedural weights -> armature -> IK-solved clips -> glTF.
"""
import math
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import sdf_lib as S  # noqa: E402
from sdf_lib import vec, smoothstep, normalize  # noqa: E402
import person_shape as P  # noqa: E402
import bl_util as U  # noqa: E402
from build_dog import (sdf_object, ellipsoid_mesh, limit_normalize, flip_mesh_data, curve, qrot,  # noqa: E402
                       two_bone, bone_matrix, iter_fcurves, FLIP, RM_INV)

ROOT = HERE.parents[1]
OUT_GLB = ROOT / 'public' / 'models' / 'person.glb'
OUT_BLEND = ROOT / 'art' / 'blender' / 'person.blend'
FPS = 30
TAU = 2 * math.pi
T0 = time.time()
BONES = [b[0] for b in P.bone_table()]


def log(*a):
    print('[person %5.1fs]' % (time.time() - T0), *a, flush=True)


def materials():
    return dict(
        Skin=U.material('Skin', (0.62, 0.38, 0.27), 0.6),
        Hair=U.material('Hair', (0.10, 0.055, 0.03), 0.7),
        Jacket=U.material('Jacket', (0.075, 0.105, 0.06), 0.55),
        Shirt=U.material('Shirt', (0.50, 0.58, 0.68), 0.8),
        Trousers=U.material('Trousers', (0.26, 0.20, 0.13), 0.85),
        Boots=U.material('Boots', (0.11, 0.065, 0.035), 0.45),
        Cap=U.material('Cap', (0.24, 0.20, 0.14), 0.9),
        CoatLong=U.material('CoatLong', (0.86, 0.86, 0.83), 0.7),
        Eye=U.material('Eye', (0.018, 0.013, 0.011), 0.08, spec=0.9),
        EyeShine=U.material('EyeShine', (1.0, 1.0, 1.0), 0.3, emission=(1.0, 1.0, 1.0)),
        Mouth=U.material('Mouth', (0.28, 0.08, 0.07), 0.6),
    )


def assign_groups(obj, W):
    for j, b in enumerate(BONES):
        col = W[:, j]
        nz = np.nonzero(col > 0)[0]
        vg = obj.vertex_groups.new(name=b)
        for i in nz:
            vg.add([int(i)], float(col[i]), 'REPLACE')


def chain_bone_weights(Pts, Rw):
    W = np.zeros((len(Pts), len(BONES)))
    r = {k: Rw[:, i] for i, k in enumerate(P.REGIONS)}
    for region, pts, bones, widths in P.chains():
        cw = S.chain_weights(Pts, pts, widths)
        for i, b in enumerate(bones):
            W[:, BONES.index(b)] += r[region] * cw[:, i]
    return W


def delete_faces_outside(obj, keep_mask):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    kill = [f for f in bm.faces if not any(keep_mask[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()


# ==========================================================================
# Rig
# ==========================================================================
def build_rig():
    arm = bpy.data.armatures.new('PersonRig')
    rig = bpy.data.objects.new('PersonRig', arm)
    bpy.context.scene.collection.objects.link(rig)
    U.activate(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    tails = {}
    for name, head, tail, parent, region, roll in P.bone_table():
        eb = arm.edit_bones.new(name)
        eb.head = Vector(tuple(head * FLIP))
        eb.tail = Vector(tuple(tail * FLIP))
        d = normalize(tail - head)
        hint = np.cross(vec(1, 0, 0), d) if roll == 'x' else vec(0, 1, 0)
        eb.align_roll(Vector(tuple(hint * FLIP)))
        if parent:
            eb.parent = arm.edit_bones[parent]
            eb.use_connect = bool(np.allclose(tails[parent], head))
        tails[name] = tail
    arm.edit_bones['root'].use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.display_type = 'STICK'
    return rig


def bone_matrix_z(head, tail, zhint):
    y = (tail - head).normalized()
    z = zhint - y * zhint.dot(y)
    if z.length < 1e-4:
        z = Vector((0, 0, 1)) - y * y.z
    z.normalize()
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = head
    return m


class PersonPoser:
    def __init__(self, rig, V, W):
        self.rest = {b.name: RM_INV @ b.matrix_local for b in rig.data.bones}
        self.rest_inv = {k: v.inverted() for k, v in self.rest.items()}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}
        self.order = BONES
        self.Vh = np.c_[V, np.ones(len(V))]
        self.W = W
        self.arm = {sd: {k: Vector(v) for k, v in P.arm(s).items()} for sd, s in P.SIDES}
        self.leg = {sd: {k: Vector(v) for k, v in P.leg(s).items()} for sd, s in P.SIDES}
        for sd in 'LR':
            g = self.leg[sd]
            g['heel'] = g['A'] + Vector((0, -0.045, -0.078))

    def solve(self, p):
        rest, rinv = self.rest, self.rest_inv
        M = {'root': rest['root']}
        hp = p.get('hips', {})
        h0 = rest['hips'].translation
        rot = (Matrix.Rotation(hp.get('yaw', 0), 4, 'Z') @ Matrix.Rotation(hp.get('pitch', 0), 4, 'X')
               @ Matrix.Rotation(hp.get('roll', 0), 4, 'Y'))
        off = Vector((hp.get('dx', 0), hp.get('dy', 0), hp.get('dz', 0)))
        M['hips'] = Matrix.Translation(h0 + off) @ rot @ Matrix.Translation(-h0) @ rest['hips']
        rots = p.get('rot', {})
        arms = p.get('arms', {})
        skip = set()
        for sd in 'LR':
            skip |= {'thigh_' + sd, 'shin_' + sd, 'foot_' + sd}
            if 'wrist' in arms.get(sd, {}):
                skip |= {'upperarm_' + sd, 'forearm_' + sd, 'hand_' + sd}
        for b in self.order:
            if b in M or b in skip:
                continue
            par = self.parent[b]
            M[b] = M[par] @ rinv[par] @ rest[b] @ qrot(*rots.get(b, (0, 0, 0))).to_matrix().to_4x4()
        for sd, s in P.SIDES:
            a = arms.get(sd, {})
            if 'wrist' in a:
                self._arm(M, sd, s, a)
            self._leg(M, sd, p.get('legs', {}).get(sd, {}))
        return M

    def shoulder_pos(self, M, sd):
        return M['shoulder_' + sd] @ self.rest_inv['shoulder_' + sd] @ self.arm[sd]['S']

    def _arm(self, M, sd, s, a):
        J = self.arm[sd]
        S_ = self.shoulder_pos(M, sd)
        l1 = (J['E'] - J['S']).length
        l2 = (J['W'] - J['E']).length
        lh = (J['T'] - J['W']).length
        hint = Vector(a.get('hint', (s * 0.45, -1.0, -0.35))).normalized()
        E, W2 = two_bone(S_, Vector(a['wrist']), l1, l2, hint)
        zh = Vector(a.get('z', (0, 1, 0)))
        hd = Vector(a['hand_dir']).normalized() if 'hand_dir' in a else (W2 - E).normalized()
        M['upperarm_' + sd] = bone_matrix_z(S_, E, zh)
        M['forearm_' + sd] = bone_matrix_z(E, W2, zh)
        M['hand_' + sd] = bone_matrix_z(W2, W2 + hd * lh, Vector(a.get('hz', tuple(zh))))

    def _leg(self, M, sd, t):
        J = self.leg[sd]
        body = M['hips'] @ self.rest_inv['hips']
        H = body @ J['H']
        l1 = (J['K'] - J['H']).length
        l2 = (J['A'] - J['K']).length
        lf = (J['T'] - J['A']).length
        f = t.get('f', 0.0)
        R = Matrix.Rotation(t.get('yaw', 0.0), 3, 'Z') @ Matrix.Rotation(f, 3, 'X')
        if 'ankle' in t:
            A = Vector(t['ankle'])
        elif 'toe' in t:
            A = Vector(t['toe']) - R @ (J['T'] - J['A'])
        elif 'heel' in t:
            A = Vector(t['heel']) - R @ (J['heel'] - J['A'])
        else:
            A = J['A'].copy()
        hint = Vector(t.get('hint', (0, 1, 0.15))).normalized()
        K, A2 = two_bone(H, A, l1, l2, hint)
        lat = Matrix.Rotation(t.get('yaw', 0.0), 3, 'Z') @ Vector((1, 0, 0))
        M['thigh_' + sd] = bone_matrix(H, K, lat)
        M['shin_' + sd] = bone_matrix(K, A2, lat)
        M['foot_' + sd] = bone_matrix(A2, A2 + R @ (J['T'] - J['A']).normalized() * lf, lat)

    def local(self, M):
        out = {}
        for b in self.order:
            par = self.parent[b]
            if par is None:
                out[b] = self.rest_inv[b] @ M[b]
            else:
                out[b] = (self.rest_inv[par] @ self.rest[b]).inverted() @ M[par].inverted() @ M[b]
        return out

    def skin(self, M):
        A = np.array([np.array(M[b] @ self.rest_inv[b]) for b in BONES])
        return np.einsum('nb,bij,nj->ni', self.W, A, self.Vh)[:, :3]

    def chest_dir(self, M, v):
        return (M['chest'] @ self.rest_inv['chest']).to_3x3() @ Vector(v)


# ---------------------------------------------------------------------------
def foot_contact(poser, sd, y, f, lift=0.0, x=0.0):
    """Planted/rolling foot: pivots on the heel when f>0, on the toe when f<0."""
    J = poser.leg[sd]
    if f >= 0:
        heel = J['heel'] + Vector((x, y, lift))
        return dict(heel=heel, f=f)
    toe = J['T'] + Vector((x, y, lift))
    return dict(toe=toe, f=f)


def relaxed_arm(poser, M, sd, s, fwd=0.0, up=0.0, out=0.0):
    S_ = poser.shoulder_pos(M, sd)
    v = poser.chest_dir(M, (s * (0.050 + out), 0.030 + fwd, -0.446 + up))
    return dict(wrist=S_ + v)


def env(u, a=0.22, b=0.78):
    return float(smoothstep(0, a, u) * (1 - smoothstep(b, 1.0, u)))


def lerpv(a, b, t):
    a, b = Vector(a), Vector(b)
    return a + (b - a) * t


def with_arms(poser, p, arm_fn):
    """Two-pass: solve the body first, then place arm targets in that frame."""
    M = poser.solve(p)
    p['arms'] = arm_fn(M)
    return p


def build_clips(poser):
    clips = {}

    def idle(u):
        b = math.sin(TAU * 3 * u)
        p = {'hips': dict(dx=0.012 * math.sin(TAU * u), roll=-0.02 * math.sin(TAU * u), dz=-0.002),
             'rot': {'spine': (0.006 * b, 0, 0.01 * math.sin(TAU * u)), 'chest': (0.010 * b, 0, 0),
                     'neck': (0, 0.10 * math.sin(TAU * u + 0.5), 0),
                     'head': (0.03 * math.sin(TAU * 2 * u), 0.10 * math.sin(TAU * u + 1.0), 0.03 * math.sin(TAU * u))},
             'legs': {'L': {}, 'R': {}}}
        return with_arms(poser, p, lambda M: {sd: relaxed_arm(poser, M, sd, s, 0.01 * math.sin(TAU * u + s)) for sd, s in P.SIDES})
    clips['Idle'] = (120, idle, True)

    def gait(u, duty, E, lift, run=False):
        legs = {}
        for sd, off in (('L', 0.0), ('R', 0.5)):
            ph = (u + off) % 1.0
            if ph < duty:
                s = ph / duty
                y = E * (0.5 - s)
                if run:
                    f = -0.85 * float(smoothstep(0.45, 1.0, s)) + 0.05 * (1 - float(smoothstep(0, 0.2, s)))
                else:
                    f = 0.24 * (1 - float(smoothstep(0, 0.16, s))) - 0.72 * float(smoothstep(0.60, 1.0, s))
                legs[sd] = foot_contact(poser, sd, y, f)
            else:
                s = (ph - duty) / (1 - duty)
                e = s * s * (3 - 2 * s)
                y = E * (-0.5 + e)
                if run:
                    f = curve(s, [(0, -0.85), (0.35, -1.0), (0.75, -0.2), (1.0, 0.05)])
                    lz = lift * math.sin(math.pi * s) ** 0.7
                else:
                    f = curve(s, [(0, -0.72), (0.35, -0.45), (0.80, 0.12), (1.0, 0.24)])
                    lz = lift * math.sin(math.pi * s) ** 0.8
                legs[sd] = foot_contact(poser, sd, y, f, lz)
        return legs

    def walk(u):
        c = math.cos(TAU * u)
        p = {'hips': dict(dz=-0.016 - 0.012 * math.cos(TAU * 2 * u), yaw=-0.08 * c, roll=0.03 * math.sin(TAU * u)),
             'rot': {'spine': (-0.02, 0.05 * c, 0), 'chest': (-0.02, 0.06 * c, 0),
                     'neck': (0, -0.02 * c, 0), 'head': (0.02 * math.cos(TAU * 2 * u), -0.02 * c, 0)},
             'legs': gait(u, 0.60, 0.56, 0.10)}

        def arms(M):
            return {'R': relaxed_arm(poser, M, 'R', 1, 0.17 * c, 0.04 * max(0, c)),
                    'L': relaxed_arm(poser, M, 'L', -1, -0.17 * c, 0.04 * max(0, -c))}
        return with_arms(poser, p, arms)
    clips['Walk'] = (32, walk, True)

    def run(u):
        c = math.cos(TAU * u)
        p = {'hips': dict(dz=-0.045 + 0.03 * math.cos(TAU * 2 * (u - 0.3)), yaw=-0.12 * c, pitch=-0.06,
                          roll=0.03 * math.sin(TAU * u)),
             'rot': {'spine': (-0.06, 0.08 * c, 0), 'chest': (-0.06, 0.10 * c, 0),
                     'neck': (0.06, -0.03 * c, 0), 'head': (0.06, -0.03 * c, 0)},
             'legs': gait(u, 0.36, 0.78, 0.24, run=True)}

        def arms(M):
            out = {}
            for sd, s, sg in (('R', 1, 1), ('L', -1, -1)):
                S_ = poser.shoulder_pos(M, sd)
                v = poser.chest_dir(M, (s * 0.06, 0.05 + 0.20 * sg * c, -0.30 + 0.07 * sg * c))
                out[sd] = dict(wrist=S_ + v, hint=(s * 0.3, -1, -0.2))
            return out
        return with_arms(poser, p, arms)
    clips['Run'] = (20, run, True)

    planted = {'L': {}, 'R': {}}

    def gesture(fn):
        def clip(u):
            p = {'hips': dict(), 'rot': {}, 'legs': {'L': {}, 'R': {}}}
            extra = fn(u, p)
            return with_arms(poser, p, lambda M: extra(M))
        return clip

    def whistle(u, p):
        e = env(u, 0.28, 0.75)
        p['rot'].update({'chest': (-0.03 * e, 0.06 * e, 0), 'head': (0.08 * e, 0, 0)})

        def arms(M):
            mouth = Vector((0.0, 0.140, 1.458))
            wr = Vector((0.055, 0.215, 1.345))
            rel = relaxed_arm(poser, M, 'R', 1)
            return {'R': dict(wrist=lerpv(rel['wrist'], wr, e), hint=(1.0, -0.4, -1.0),
                              hand_dir=lerpv((0.05, 0.03, -1), (mouth - wr).normalized(), e), z=(0, 1, 0)),
                    'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['Whistle'] = (30, gesture(whistle), False)

    def cast(sd, s):
        def fn(u, p):
            e = env(u, 0.22, 0.80)
            p['rot'].update({'chest': (0, 0, -s * 0.06 * e), 'head': (0, s * -0.25 * e, 0)})
            p['hips'].update(dx=-s * 0.015 * e)

            def arms(M):
                rel = relaxed_arm(poser, M, sd, s)
                other = 'L' if sd == 'R' else 'R'
                tgt = Vector((s * 0.660, 0.030, 1.400))
                return {sd: dict(wrist=lerpv(rel['wrist'], tgt, e), hint=(0, -0.6, -1.0),
                                 hand_dir=lerpv((0, 0.03, -1), (s, 0.05, 0.12), e), z=(0, 1, 0)),
                        other: relaxed_arm(poser, M, other, -s)}
            return arms
        return fn
    clips['CastLeft'] = (40, gesture(cast('L', -1)), False)
    clips['CastRight'] = (40, gesture(cast('R', 1)), False)

    def cast_back(u, p):
        e = env(u, 0.22, 0.80)
        p['rot'].update({'chest': (0.04 * e, 0, 0), 'head': (0.05 * e, 0, 0)})

        def arms(M):
            rel = relaxed_arm(poser, M, 'R', 1)
            return {'R': dict(wrist=lerpv(rel['wrist'], Vector((0.225, 0.035, 1.800)), e), hint=(1, -0.3, 0),
                              hand_dir=lerpv((0, 0.03, -1), (0.02, 0.05, 1), e), z=(0, 1, 0)),
                    'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['CastBack'] = (40, gesture(cast_back), False)

    def send(u, p):
        k = lambda keys: curve(u, keys)  # noqa: E731
        lean = k([(0, 0), (0.3, 0.02), (0.55, -0.12), (0.8, -0.10), (1, 0)])
        p['rot'].update({'spine': (lean * 0.5, 0, 0), 'chest': (lean, 0.0, 0), 'head': (-lean * 0.8, 0, 0)})
        p['hips'].update(dy=k([(0, 0), (0.3, -0.01), (0.55, 0.03), (0.8, 0.03), (1, 0)]))

        def arms(M):
            rel = relaxed_arm(poser, M, 'R', 1)['wrist']
            back = Vector((0.28, -0.22, 0.95))
            fwd = Vector((0.21, 0.42, 1.00))
            if u < 0.3:
                w = lerpv(rel, back, float(smoothstep(0, 0.3, u)))
            elif u < 0.55:
                w = lerpv(back, fwd, float(smoothstep(0.3, 0.55, u)))
            elif u < 0.8:
                w = fwd
            else:
                w = lerpv(fwd, rel, float(smoothstep(0.8, 1.0, u)))
            return {'R': dict(wrist=w, hint=(0.6, -1, -0.4), z=(0, 1, 0)), 'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['Send'] = (30, gesture(send), False)

    def throw(u, p):
        k = lambda keys: curve(u, keys)  # noqa: E731
        yaw = k([(0, 0), (0.30, -0.40), (0.50, 0.20), (0.70, 0.38), (1, 0)])
        pitch = k([(0, 0), (0.30, 0.08), (0.50, -0.08), (0.70, -0.18), (1, 0)])
        p['rot'].update({'spine': (pitch * 0.4, yaw * 0.35, 0), 'chest': (pitch * 0.6, yaw * 0.55, 0),
                         'head': (-pitch * 0.6, -yaw * 0.7, 0)})
        p['hips'].update(yaw=yaw * 0.3, dy=k([(0, 0), (0.3, -0.03), (0.6, 0.04), (1, 0)]))

        def arms(M):
            relR = relaxed_arm(poser, M, 'R', 1)['wrist']
            relL = relaxed_arm(poser, M, 'L', -1)['wrist']
            keysR = [(0, relR), (0.30, Vector((0.30, -0.20, 1.56))), (0.50, Vector((0.17, 0.36, 1.64))),
                     (0.70, Vector((-0.08, 0.33, 0.98))), (1.0, relR)]
            keysL = [(0, relL), (0.30, Vector((-0.16, 0.38, 1.38))), (0.65, Vector((-0.27, -0.14, 0.94))), (1.0, relL)]

            def path(keys):
                return Vector([curve(u, [(t, v[i]) for t, v in keys]) for i in range(3)])
            wr = path(keysR)
            return {'R': dict(wrist=wr, hint=(1.0, -0.6, -0.3) if u < 0.45 else (0.8, -0.8, -0.6), z=(0, 0.3, 1)),
                    'L': dict(wrist=path(keysL), hint=(-0.5, -1, -0.4))}
        return arms
    clips['Throw'] = (36, gesture(throw), False)

    def call(u, p):
        pat = abs(math.sin(TAU * 2 * u))
        p['rot'].update({'spine': (-0.05, 0, 0), 'chest': (-0.08, -0.05, 0), 'head': (0.13, 0.05, 0.06)})

        def arms(M):
            return {'R': dict(wrist=Vector((0.215, 0.090, 0.735 + 0.070 * pat)), hint=(0.8, -1, 0),
                              hand_dir=(0.05, 0.25 - 0.2 * pat, -1), z=(0, 1, 0)),
                    'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['Call'] = (40, gesture(call), True)

    def point(u, p):
        e = env(u, 0.25, 0.80)
        p['rot'].update({'chest': (0, 0.08 * e, 0), 'head': (0, -0.06 * e, 0)})

        def arms(M):
            rel = relaxed_arm(poser, M, 'R', 1)['wrist']
            return {'R': dict(wrist=lerpv(rel, Vector((0.13, 0.46, 1.40)), e), hint=(1, -0.2, -0.6),
                              hand_dir=lerpv((0, 0.03, -1), (-0.05, 1, 0.05), e), z=(0, 0.2, 1), hz=(0, 0, 1)),
                    'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['Point'] = (40, gesture(point), False)

    def wave(u, p):
        w = math.sin(TAU * 2 * u)
        p['rot'].update({'chest': (0, 0, -0.03), 'head': (0, 0, 0.08 * math.sin(TAU * u))})

        def arms(M):
            return {'R': dict(wrist=Vector((0.35 + 0.05 * w, 0.06, 1.50)), hint=(1, -0.2, -1.0),
                              hand_dir=(0.45 * w, 0.12, 1), z=(0, 1, 0)),
                    'L': relaxed_arm(poser, M, 'L', -1)}
        return arms
    clips['Wave'] = (30, gesture(wave), True)

    def talk(u, p):
        a, b = math.sin(TAU * 2 * u), math.sin(TAU * 3 * u + 1.0)
        p['rot'].update({'chest': (0.01 * b, 0.05 * math.sin(TAU * u), 0),
                         'head': (0.05 * math.sin(TAU * 3 * u), 0.12 * math.sin(TAU * u + 0.6), 0.04 * a)})
        p['hips'].update(dx=0.006 * math.sin(TAU * u))

        def arms(M):
            return {'R': dict(wrist=Vector((0.19 + 0.03 * a, 0.21 + 0.03 * b, 0.98 + 0.05 * b)), hint=(1, -0.8, -0.6),
                              hand_dir=(0.35, 1, 0.25 + 0.2 * a), z=(0, 0, 1)),
                    'L': dict(wrist=Vector((-0.18 - 0.02 * b, 0.19 + 0.03 * a, 0.95 + 0.05 * math.sin(TAU * 2 * u + 2))),
                              hint=(-1, -0.8, -0.6), hand_dir=(-0.35, 1, 0.2), z=(0, 0, 1))}
        return arms
    clips['Talk'] = (90, gesture(talk), True)

    def clap(u, p):
        c = 0.5 + 0.5 * math.cos(TAU * 2 * u)
        p['rot'].update({'head': (0.04 * (1 - c), 0, 0)})

        def arms(M):
            out = {}
            for sd, s in P.SIDES:
                x = s * (0.045 + 0.13 * c)
                out[sd] = dict(wrist=Vector((x, 0.25, 1.08)), hint=(s, -0.6, -0.6),
                               hand_dir=(-s * 0.25 * (1 - c), 0.75, 0.66), z=(0, -0.7, 0.7), hz=(0, -0.7, 0.7))
            return out
        return arms
    clips['Clap'] = (24, gesture(clap), True)

    def kneel(u, p):
        b = math.sin(TAU * 2 * u)
        p['hips'].update(dz=-0.390, dy=-0.02, pitch=0.05)
        p['rot'].update({'spine': (-0.12 + 0.005 * b, 0, 0), 'chest': (-0.10 + 0.008 * b, 0.05, 0),
                         'head': (0.06, 0.06 * math.sin(TAU * u), 0.05)})
        J = poser.leg
        p['legs'] = {'L': dict(ankle=J['L']['A'] + Vector((-0.01, 0.40, 0.0)), hint=(0, 1, 0.6)),
                     'R': dict(toe=J['R']['T'] + Vector((0.0, -0.52, 0.0)), f=-1.25, hint=(0, 1, -0.3))}

        def arms(M):
            return {'R': dict(wrist=Vector((0.12, 0.46, 0.36 + 0.01 * b)), hint=(1, -0.6, -0.2), z=(0, 0, 1)),
                    'L': dict(wrist=Vector((-0.13, 0.33, 0.50)), hint=(-1, -0.5, 0), hand_dir=(0.1, 1, -0.3), z=(0, 0, 1))}
        return arms
    clips['Kneel'] = (60, gesture(kneel), True)
    return clips


def key_clips(rig, poser, clips):
    bpy.context.scene.render.fps = FPS
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
                V = poser.skin(M)
                lows.append(float(V[:, 2].min()))
            for b in BONES:
                pb = rig.pose.bones[b]
                q = L[b].to_quaternion()
                if b in prev and prev[b].dot(q) < 0:
                    q.negate()
                prev[b] = q
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=fr, group=b)
                if b == 'hips':
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
        report[name] = (n, round(min(lows), 4))
        log('clip', name, n, 'frames, lowest skin z', round(min(lows), 4))
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    return report


# ==========================================================================
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials()
    skin_model = P.build_skin()
    prims = skin_model.prims('add')

    def regions_at(V):
        return S.region_weights(prims, V, P.REGIONS, 0.01)

    objs = {}

    def garment(name, model, lo, hi, h, mat, tris, relax=1):
        obj = sdf_object(name, model, lo, hi, h, mat, tris, relax=relax)
        V = U.verts_np(obj)
        Rw = U.laplacian_smooth_values(obj, regions_at(V), 3, 0.5)
        Rw /= Rw.sum(1, keepdims=True)
        W = chain_bone_weights(V, Rw)
        objs[name] = (obj, W)
        log(name, U.tri_count(obj), 'tris')
        return obj

    body = garment('Body', skin_model, *P.SKIN_BOUNDS, 0.0032, mats['Skin'], 16000, relax=2)
    # Keep only skin that can be seen (head, neck, hands); the rest is under clothes.
    V = U.verts_np(body)
    keep = P.visible_skin_mask(V)
    W_all = objs['Body'][1]
    delete_faces_outside(body, keep)
    V2 = U.verts_np(body)
    from mathutils import kdtree
    kd = kdtree.KDTree(len(V))
    for i, v in enumerate(V):
        kd.insert(v, i)
    kd.balance()
    idx = [kd.find(v)[1] for v in V2]
    objs['Body'] = (body, W_all[idx])
    log('Body visible', U.tri_count(body), 'tris')

    garment('Shirt', P.build_shirt(), (-0.30, -0.16, 0.85), (0.30, 0.16, 1.45), 0.0035, mats['Shirt'], 1600)
    garment('Jacket', P.build_jacket(), (-0.42, -0.19, 0.72), (0.42, 0.21, 1.47), 0.0035, mats['Jacket'], 7000)
    garment('Trousers', P.build_trousers(), (-0.28, -0.17, 0.10), (0.28, 0.17, 1.00), 0.004, mats['Trousers'], 4000)
    garment('Boots', P.build_boots(), (-0.22, -0.13, -0.01), (0.22, 0.30, 0.26), 0.003, mats['Boots'], 2600)
    garment('Hair_Short', P.build_hair_short(), (-0.18, -0.19, 1.38), (0.18, 0.20, 1.76), 0.0028, mats['Hair'], 2400)
    garment('Hair_Long', P.build_hair_long(), (-0.18, -0.24, 1.38), (0.18, 0.20, 1.76), 0.0028, mats['Hair'], 2400)
    garment('Cap_Flat', P.build_cap(), (-0.19, -0.20, 1.52), (0.19, 0.27, 1.78), 0.0028, mats['Cap'], 1800)
    coat = garment('Coat_Long', P.build_coat_long(), (-0.44, -0.26, 0.38), (0.44, 0.28, 1.47), 0.004, mats['CoatLong'], 7000)
    # The coat skirt hangs from the hips: blend leg influence back towards the pelvis.
    Vc = U.verts_np(coat)
    Wc = objs['Coat_Long'][1]
    t = (1 - smoothstep(0.55, 0.82, Vc[:, 2]))[:, None] * 0.55
    hips = np.zeros_like(Wc)
    hips[:, BONES.index('hips')] = 1
    objs['Coat_Long'] = (coat, Wc * (1 - t) + hips * t)

    # ---- face ------------------------------------------------------------
    nos = P.build_skin()

    def on_surface(x, z, y0=0.0):
        return S.vec(__import__('dog_shape').march(nos, (x, y0, z), (0, 1, 0), 0.0008))
    Ve, Fe, Vs, Fs = [], [], [], []
    for side, s, c, d in P.eye_specs():
        surf = on_surface(c[0], c[2])
        R = S.frame_from(d, (0, 0, 1))
        ec = surf - d * 0.0030
        V, Fc = ellipsoid_mesh(ec, (0.0195, 0.0080, 0.0255), R, 24, 16)
        Fe += [tuple(i + sum(len(v) for v in Ve) for i in f) for f in Fc]
        Ve.append(V)
        for (ox, oz), r in (((0.40, 0.45), 0.0056), ((-0.35, -0.42), 0.0025)):
            p = ec + R @ vec(ox * 0.0195, 0.0076, oz * 0.0255)
            V, Fc = ellipsoid_mesh(p, (r, r * 0.3, r), R, 12, 8)
            Fs += [tuple(i + sum(len(v) for v in Vs) for i in f) for f in Fc]
            Vs.append(V)
    eyes = U.mesh_object('Eyes', np.concatenate(Ve), Fe, mats['Eye'])
    shine = U.mesh_object('EyeShine', np.concatenate(Vs), Fs, mats['EyeShine'])
    brows = S.Model()
    for side, s in P.SIDES:
        a = on_surface(s * 0.028, P.EYE_Z + 0.046) + vec(0, 0.003, 0)
        b = on_surface(s * 0.074, P.EYE_Z + 0.040) + vec(0, 0.002, 0)
        mid = on_surface(s * 0.051, P.EYE_Z + 0.051) + vec(0, 0.003, 0)
        brows.add(S.Chain([a, mid, b], [0.0062, 0.0072, 0.0048]), 0.002)
    garment('Brows', brows, (-0.12, 0.0, 1.55), (0.12, 0.17, 1.66), 0.0011, mats['Hair'], 500)
    mouth = S.Model()
    xs = np.linspace(-0.020, 0.020, 9)
    pts = [on_surface(x, 1.458 + 26 * x * x) + vec(0, 0.0012, 0) for x in xs]
    mouth.add(S.Chain(pts, [0.0026 + 0.0012 * (1 - abs(x) / 0.02) for x in xs]), 0.0)
    garment('Mouth', mouth, (-0.05, 0.0, 1.42), (0.05, 0.17, 1.50), 0.0007, mats['Mouth'], 400)
    for obj in (eyes, shine):
        U.triangulate(obj)
        n = len(obj.data.vertices)
        W = np.zeros((n, len(BONES)))
        W[:, BONES.index('head')] = 1
        objs[obj.name] = (obj, W)
    for name in ('Brows', 'Mouth'):
        obj, W = objs[name]
        W = np.zeros_like(W)
        W[:, BONES.index('head')] = 1
        objs[name] = (obj, W)
    log('face done')

    for name, (obj, W) in objs.items():
        assign_groups(obj, limit_normalize(W))
        flip_mesh_data(obj)
        obj.data.name = name
    rig = build_rig()
    for name, (obj, W) in objs.items():
        obj.parent = rig
        mod = obj.modifiers.new('Armature', 'ARMATURE')
        mod.object = rig

    # Skin check set: everything that can touch the floor (boots, trousers, coat).
    Vchk = np.concatenate([U.verts_np(objs[n][0]) * FLIP for n in ('Boots', 'Trousers', 'Body')])
    Wchk = np.concatenate([limit_normalize(objs[n][1]) for n in ('Boots', 'Trousers', 'Body')])
    poser = PersonPoser(rig, Vchk, Wchk)
    report = key_clips(rig, poser, build_clips(poser))

    OUT_BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for obj, _ in objs.values():
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB), use_selection=True, export_format='GLB', export_yup=True,
        export_apply=False, export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=False, export_optimize_animation_keep_anim_armature=False,
        export_frame_range=False, export_anim_single_armature=True,
        export_skins=True, export_all_influences=False, export_morph=False,
        export_extras=True, export_materials='EXPORT', export_texcoords=False, export_normals=True,
        export_optimize_animation_size=True, export_def_bones=False, export_rest_position_armature=True)
    log('exported', OUT_GLB, OUT_GLB.stat().st_size // 1024, 'KB')
    log('triangles', {n: U.tri_count(o) for n, (o, _) in objs.items()})
    log('report', report)


if __name__ == '__main__':
    main()
