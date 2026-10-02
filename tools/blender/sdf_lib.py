"""Small numpy signed-distance-field toolkit used by the character builders.

Characters are authored as smooth unions of analytic primitives (ellipsoids,
tapered capsules, rounded boxes) instead of intersecting meshes.  The field is
sampled on a regular grid and turned into a watertight quad mesh with naive
surface nets, then every vertex is projected back onto the exact field.  This
gives the soft, filleted, "sculpted" look of a cartoon character without any
hand modelling.  No bpy import here, so the maths can be tested on its own.
"""
import math
import numpy as np

F = np.float64


def vec(*a):
    if len(a) == 1:
        return np.asarray(a[0], dtype=F)
    return np.asarray(a, dtype=F)


def smoothstep(e0, e1, x):
    t = np.clip((np.asarray(x, dtype=F) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return vec([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return vec([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return vec([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def normalize(v):
    v = vec(v)
    return v / np.linalg.norm(v)


def frame_from(y_axis, up_hint=(0, 0, 1)):
    """Rotation whose columns are local axes; local +Y follows y_axis."""
    y = normalize(y_axis)
    up = vec(up_hint)
    x = np.cross(y, up)
    if np.linalg.norm(x) < 1e-6:
        x = np.cross(y, vec(0, 1, 0))
    x = x / np.linalg.norm(x)
    z = np.cross(x, y)
    return np.stack([x, y, z], axis=1)


# --------------------------------------------------------------------------
# Primitives.  Every primitive has eval(P)->(N,), bbox()->(lo,hi), axis(P)
# (closest point on its medial axis, used by thickness morphs) and a region
# tag used for skin weights and morph masks.
# --------------------------------------------------------------------------
class Prim:
    region = None
    name = ''

    def tag(self, region, name=''):
        self.region = region
        self.name = name
        return self


class Ellipsoid(Prim):
    def __init__(self, c, r, R=None):
        self.c = vec(c)
        self.r = vec(r)
        self.R = np.eye(3) if R is None else vec(R)

    def eval(self, P):
        p = (P - self.c) @ self.R
        k0 = np.linalg.norm(p / self.r, axis=1)
        k1 = np.linalg.norm(p / (self.r * self.r), axis=1)
        out = k0 * (k0 - 1.0) / np.maximum(k1, 1e-12)
        return np.where(k1 < 1e-9, -self.r.min(), out)

    def bbox(self):
        ext = np.abs(self.R) @ self.r
        return self.c - ext, self.c + ext

    def axis(self, P):
        # Long axis segment of the ellipsoid.
        i = int(np.argmax(self.r))
        d = self.R[:, i] * self.r[i] * 0.8
        return closest_on_segment(P, self.c - d, self.c + d)[0]


class Sphere(Ellipsoid):
    def __init__(self, c, r):
        super().__init__(c, (r, r, r))


class RoundCone(Prim):
    """Capsule whose radius tapers from r1 at a to r2 at b (exact SDF)."""

    def __init__(self, a, b, r1, r2=None, scale=None, up=(0, 0, 1)):
        self.a, self.b = vec(a), vec(b)
        self.r1 = float(r1)
        self.r2 = float(r1 if r2 is None else r2)
        # Optional anisotropic squash in a local frame (x across, y along,
        # z towards the `up` hint).
        self.scale = None if scale is None else vec(scale)
        if self.scale is not None:
            self.R = frame_from(self.b - self.a, up)

    def _eval(self, P, a, b):
        r1, r2 = self.r1, self.r2
        ba = b - a
        l2 = float(ba @ ba)
        rr = r1 - r2
        a2 = l2 - rr * rr
        il2 = 1.0 / l2
        pa = P - a
        y = pa @ ba
        z = y - l2
        q = pa * l2 - y[:, None] * ba
        x2 = (q * q).sum(1)
        y2 = y * y * l2
        z2 = z * z * l2
        k = math.copysign(1.0, rr) * rr * rr * x2 if rr != 0 else np.zeros_like(x2)
        d1 = np.sqrt(x2 + z2) * il2 - r2
        d2 = np.sqrt(x2 + y2) * il2 - r1
        d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
        c1 = np.sign(z) * a2 * z2 > k
        c2 = np.sign(y) * a2 * y2 < k
        return np.where(c1, d1, np.where(c2, d2, d3))

    def eval(self, P):
        if self.scale is None:
            return self._eval(P, self.a, self.b)
        m = (self.a + self.b) * 0.5
        loc = (P - m) @ self.R / self.scale
        a = (self.a - m) @ self.R / self.scale
        b = (self.b - m) @ self.R / self.scale
        return self._eval(loc, a, b) * self.scale.min()

    def bbox(self):
        r = max(self.r1, self.r2)
        if self.scale is not None:
            r *= max(1.0, self.scale.max())
        return np.minimum(self.a, self.b) - r, np.maximum(self.a, self.b) + r

    def axis(self, P):
        return closest_on_segment(P, self.a, self.b)[0]


class Chain(Prim):
    """Smoothly joined tapered capsules through several points."""

    def __init__(self, pts, radii, k=0.0):
        self.parts = [RoundCone(pts[i], pts[i + 1], radii[i], radii[i + 1]) for i in range(len(pts) - 1)]
        self.pts = [vec(p) for p in pts]
        self.k = k

    def eval(self, P):
        d = self.parts[0].eval(P)
        for p in self.parts[1:]:
            d = smin(d, p.eval(P), self.k)
        return d

    def bbox(self):
        lo = np.min([p.bbox()[0] for p in self.parts], axis=0)
        hi = np.max([p.bbox()[1] for p in self.parts], axis=0)
        return lo, hi

    def axis(self, P):
        return project_polyline(P, self.pts)[1]


class RoundBox(Prim):
    def __init__(self, c, half, r, R=None):
        self.c, self.half, self.r = vec(c), vec(half), float(r)
        self.R = np.eye(3) if R is None else vec(R)

    def eval(self, P):
        p = (P - self.c) @ self.R
        q = np.abs(p) - (self.half - self.r)
        return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(q.max(1), 0) - self.r

    def bbox(self):
        ext = np.abs(self.R) @ self.half
        return self.c - ext, self.c + ext

    def axis(self, P):
        return np.repeat(self.c[None], len(P), 0)


class Plane(Prim):
    """Half space n.(p - o) > 0 is outside."""

    def __init__(self, o, n):
        self.o, self.n = vec(o), normalize(n)

    def eval(self, P):
        return (P - self.o) @ self.n

    def bbox(self):
        return vec(-9, -9, -9), vec(9, 9, 9)


class Func(Prim):
    """Arbitrary callable SDF with an explicit bounding box."""

    def __init__(self, fn, lo, hi):
        self.fn, self.lo, self.hi = fn, vec(lo), vec(hi)

    def eval(self, P):
        return self.fn(P)

    def bbox(self):
        return self.lo, self.hi


# --------------------------------------------------------------------------
# Models are an ordered list of (op, prim, k) steps.
# --------------------------------------------------------------------------
class Model:
    def __init__(self):
        self.steps = []

    def add(self, prim, k=0.0):
        self.steps.append(('add', prim, k))
        return prim

    def sub(self, prim, k=0.0):
        self.steps.append(('sub', prim, k))
        return prim

    def inter(self, prim, k=0.0):
        self.steps.append(('inter', prim, k))
        return prim

    def prims(self, op='add'):
        return [p for o, p, k in self.steps if o == op]

    def eval(self, P, cull=True):
        d = np.full(len(P), 1e3)
        first = True
        for op, prim, k in self.steps:
            if cull and op != 'inter' and not first:
                lo, hi = prim.bbox()
                m = k + 0.006
                mask = np.all((P >= lo - m) & (P <= hi + m), axis=1)
                if not mask.any():
                    continue
                idx = np.nonzero(mask)[0]
                v = prim.eval(P[idx])
                cur = d[idx]
            else:
                idx = None
                v = prim.eval(P)
                cur = d
            if op == 'add':
                res = v if first else smin(cur, v, k)
            elif op == 'sub':
                res = smax(cur, -v, k)
            else:
                res = smax(cur, v, k)
            first = False
            if idx is None:
                d = res
            else:
                d[idx] = res
        return d

    def gradient(self, P, eps=4e-4):
        g = np.zeros_like(P)
        for i in range(3):
            o = np.zeros(3)
            o[i] = eps
            g[:, i] = (self.eval(P + o) - self.eval(P - o)) / (2 * eps)
        return g


def closest_on_segment(P, a, b):
    ab = b - a
    L2 = max(float(ab @ ab), 1e-12)
    t = np.clip((P - a) @ ab / L2, 0.0, 1.0)
    Q = a + t[:, None] * ab
    return Q, t


def project_polyline(P, pts):
    """Arc-length parameter, closest point and distance to a polyline."""
    pts = [vec(p) for p in pts]
    best = np.full(len(P), np.inf)
    s_out = np.zeros(len(P))
    q_out = np.zeros_like(P)
    cum = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        L = float(np.linalg.norm(b - a))
        Q, t = closest_on_segment(P, a, b)
        d = np.linalg.norm(P - Q, axis=1)
        better = d < best
        best = np.where(better, d, best)
        s_out = np.where(better, cum + t * L, s_out)
        q_out[better] = Q[better]
        cum += L
    return s_out, q_out, best


def chain_weights(P, pts, widths):
    """Partition-of-unity weights for consecutive polyline segments.

    Segment i owns weight 1 in its middle; at every interior joint j the
    weight hands over to the next segment across +-widths[j-1].
    Returns array (N, nseg).
    """
    pts = [vec(p) for p in pts]
    s, _, _ = project_polyline(P, pts)
    lengths = [float(np.linalg.norm(pts[i + 1] - pts[i])) for i in range(len(pts) - 1)]
    cum = np.cumsum([0] + lengths)
    n = len(lengths)
    S = [np.ones(len(P))]
    for j in range(1, n):
        w = widths[j - 1]
        S.append(smoothstep(-w, w, s - cum[j]))
    S.append(np.zeros(len(P)))
    return np.stack([S[i] - S[i + 1] for i in range(n)], axis=1).clip(0, 1)


# --------------------------------------------------------------------------
# Surface extraction.
# --------------------------------------------------------------------------
def sample_grid(model, lo, hi, h, chunk=1_500_000):
    lo, hi = vec(lo), vec(hi)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    # Symmetric x samples so a mirrored model gives a mirrored mesh.
    xs = (np.arange(n[0]) - (n[0] - 1) / 2.0) * h + (lo[0] + hi[0]) / 2.0
    ys = lo[1] + np.arange(n[1]) * h
    zs = lo[2] + np.arange(n[2]) * h
    Fg = np.empty((n[0], n[1], n[2]), dtype=np.float32)
    per = max(1, chunk // (n[0] * n[1]))
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    for k0 in range(0, n[2], per):
        k1 = min(n[2], k0 + per)
        Z = zs[k0:k1]
        P = np.stack(np.broadcast_arrays(X[:, :, None], Y[:, :, None], Z[None, None, :]), axis=-1).reshape(-1, 3)
        Fg[:, :, k0:k1] = model.eval(P).reshape(n[0], n[1], k1 - k0)
    return Fg, (xs[0], ys[0], zs[0]), h


def surface_nets(Fg, origin, h):
    nx, ny, nz = Fg.shape
    cshape = (nx - 1, ny - 1, nz - 1)
    ncell = cshape[0] * cshape[1] * cshape[2]
    acc = np.zeros((ncell, 3))
    cnt = np.zeros(ncell)
    edges = []
    inside = Fg < 0
    for axis in range(3):
        s0 = [slice(None)] * 3
        s1 = [slice(None)] * 3
        s0[axis] = slice(0, -1)
        s1[axis] = slice(1, None)
        f0 = Fg[tuple(s0)]
        f1 = Fg[tuple(s1)]
        cross = inside[tuple(s0)] != inside[tuple(s1)]
        idx = np.nonzero(cross)
        a0, a1 = f0[idx].astype(F), f1[idx].astype(F)
        t = a0 / (a0 - a1)
        pos = np.stack(idx, 1).astype(F)
        pos[:, axis] += t
        o1, o2 = (axis + 1) % 3, (axis + 2) % 3
        cells = []
        for d1, d2 in ((-1, -1), (0, -1), (0, 0), (-1, 0)):
            c = [idx[0].copy(), idx[1].copy(), idx[2].copy()]
            c[o1] = c[o1] + d1
            c[o2] = c[o2] + d2
            valid = np.ones(len(t), bool)
            for ax in range(3):
                valid &= (c[ax] >= 0) & (c[ax] < cshape[ax])
            lin = np.where(valid, (c[0] * cshape[1] + c[1]) * cshape[2] + c[2], -1)
            cells.append(lin)
            ok = lin >= 0
            for comp in range(3):
                acc[:, comp] += np.bincount(lin[ok], weights=pos[ok, comp], minlength=ncell)
            cnt += np.bincount(lin[ok], minlength=ncell)
        cells = np.stack(cells, 1)
        good = np.all(cells >= 0, axis=1)
        flip = ~inside[tuple(s0)][idx]  # outside at low end -> normal points -axis
        quads = cells[good]
        fl = flip[good]
        quads[fl] = quads[fl][:, ::-1]
        edges.append(quads)
    active = np.nonzero(cnt > 0)[0]
    remap = -np.ones(ncell, dtype=np.int64)
    remap[active] = np.arange(len(active))
    verts = acc[active] / cnt[active, None]
    verts = vec(origin) + verts * h
    faces = remap[np.concatenate(edges, 0)]
    return verts, faces


def project_to_surface(model, V, iters=3, step=1.0):
    V = V.copy()
    for _ in range(iters):
        d = model.eval(V, cull=False)
        g = model.gradient(V)
        gl2 = np.maximum((g * g).sum(1), 1e-8)
        V -= step * (d / gl2)[:, None] * g
    return V


def mesh_from_model(model, lo, hi, h, project=True):
    Fg, origin, h = sample_grid(model, lo, hi, h)
    V, Fc = surface_nets(Fg, origin, h)
    if project:
        V = project_to_surface(model, V, iters=2, step=0.9)
    return V, Fc


def region_weights(prims, P, regions, tau=0.008):
    """Soft assignment of points to named regions from primitive distances."""
    D = np.full((len(P), len(regions)), 1e3)
    for p in prims:
        if p.region is None:
            continue
        j = regions.index(p.region)
        D[:, j] = np.minimum(D[:, j], p.eval(P))
    D -= D.min(1, keepdims=True)
    W = np.exp(-D / tau)
    return W / W.sum(1, keepdims=True)
