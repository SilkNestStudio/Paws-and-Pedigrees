import { useMemo } from 'react';
import * as THREE from 'three';
import type { Field } from '../../sim/field';
import { heightAt, scatter } from './terrain';
import { along, Prop, Props, type Placement, type PropName } from './Props';
import { borderTrees } from './Field';
import { Paths, ScentGarden, useSignTexture } from './Yard';

/**
 * Each place built from the Blender props. Positions and footprints match the
 * solid blocks and interaction spots in src/sim/home.ts and src/sim/field.ts.
 * The older code-built versions (Kennel.tsx, Yard.tsx, Places.tsx) stand in
 * while the props load.
 */

const TREE_KINDS: PropName[] = ['TreeOak', 'TreeOak2', 'TreePine'];

/** Field trees and the ring of trees around a field, split by kind. */
function FieldTrees({ field, kinds = TREE_KINDS }: { field: Field; kinds?: PropName[] }) {
  const byKind = useMemo(() => {
    const out = new Map<PropName, Placement[]>(kinds.map((k) => [k, []]));
    const add = (i: number, p: Placement) => {
      const kind = kinds[Math.floor(scatter(i, 77) * kinds.length)]!;
      out.get(kind)!.push(p);
    };
    field.trees.forEach((t, i) =>
      add(i, { x: t.pos.x, z: t.pos.z, scale: 0.7 + t.radius * 0.25, rot: scatter(i, 5) * 6.28 }),
    );
    borderTrees(field).forEach((t, i) =>
      add(i + 100, { x: t.x, z: t.z, scale: 0.75 * t.s, rot: scatter(i, 6) * 6.28 }),
    );
    return out;
  }, [field, kinds]);
  return (
    <>
      {[...byKind].map(([kind, items]) => (
        <Props key={kind} name={kind} items={items} />
      ))}
    </>
  );
}

/** Hedges down both sides and across the far end of a field. */
function FieldHedges({ field }: { field: Field }) {
  const items = useMemo(
    () => [
      ...along([field.minX - 1.5, field.maxZ - 8], [field.minX - 1.5, field.minZ], 5),
      ...along([field.maxX + 1.5, field.maxZ - 8], [field.maxX + 1.5, field.minZ], 5),
      ...along([field.minX, field.minZ - 1.5], [field.maxX, field.minZ - 1.5], 5),
    ],
    [field],
  );
  return <Props name="HedgeSection" items={items} />;
}

/** Grandpa's place: the farmhouse, kennel block, yard and the training field around it. */
export function HomeWorld({
  field,
  kennelName,
  bowlFilled,
  gardenRestored,
}: {
  field: Field;
  kennelName: string;
  bowlFilled: boolean;
  gardenRestored: boolean;
}) {
  const gateSign = useSignTexture(
    kennelName ? [`${kennelName} Kennels`] : ['Kennels', 'the name has worn away'],
    { bg: '#f3ead8', fg: '#3b2a1e', width: 1024, height: 308, flipY: false },
  );
  const fieldSign = useSignTexture(['Training field'], {
    bg: '#f3ead8',
    fg: '#3b2a1e',
    width: 1024,
    height: 165,
    flipY: false,
  });
  const gateSigns = useMemo(() => ({ SignFace: gateSign }), [gateSign]);
  const fieldSigns = useMemo(() => ({ SignFace: fieldSign }), [fieldSign]);

  const fences = useMemo(
    () => [
      // Along the field side of the yard, either side of the gate.
      ...along([1.9, 44], [28.9, 44], 3),
      ...along([-1.9, 44], [-28.9, 44], 3),
      // Round the yard.
      ...along([-40, 46], [-40, 82], 3),
      ...along([40, 46], [40, 82], 3),
      ...along([-40, 83], [-3, 83], 3),
      ...along([3, 83], [40, 83], 3),
    ],
    [],
  );
  const flowers = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const bed = i % 3;
        // Along the farmhouse front (clear of the door), by the drive, and down the lane.
        const base =
          bed === 0 ? { x: -16, z: 58.4 } : bed === 1 ? { x: -6.5, z: 74 } : { x: -3, z: 79 };
        return {
          x: base.x + (scatter(i, 11) - 0.5) * (bed === 0 ? 9.5 : bed === 1 ? 1 : 3),
          z: base.z + (scatter(i, 12) - 0.5) * (bed === 1 ? 6 : 0.4),
          rot: scatter(i, 13) * 6.28,
          scale: 0.8 + scatter(i, 14) * 0.4,
        };
      }).filter((f) => Math.abs(f.x + 16) > 1.3 || f.z > 59),
    [],
  );
  const bushes = useMemo<Placement[]>(
    () => [
      { x: -22.6, z: 58.2 },
      { x: -9.2, z: 60.5, rot: 1 },
      { x: 25, z: 61.2, rot: 2 },
      { x: -36, z: 78, scale: 1.3 },
      { x: 36, z: 50, scale: 1.2, rot: 0.6 },
    ],
    [],
  );
  const rocks = useMemo<Placement[]>(
    () => [
      { x: -26, z: 46.5, rot: 0.4 },
      { x: 33, z: 47, rot: 2.1, scale: 0.8 },
    ],
    [],
  );
  const grass = useMemo<Placement[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: (scatter(i, 31) - 0.5) * 76,
        z: 46 + scatter(i, 32) * 36,
        rot: scatter(i, 33) * 6.28,
      })).filter((g) => Math.abs(g.x) > 4 && (g.z < 53 || g.z > 67 || Math.abs(g.x) > 25)),
    [],
  );

  return (
    <>
      <FieldHedges field={field} />
      <FieldTrees field={field} />
      <Paths />
      <Prop name="Farmhouse" at={{ x: -16, z: 62, rot: Math.PI + 0.08 }} />
      <Prop name="KennelBlock" at={{ x: 14, z: 60, rot: Math.PI - 0.02 }} />
      <Prop name="PantryShed" at={{ x: 22.5, z: 60, rot: Math.PI }} />
      <Prop name="Van" at={{ x: 26, z: 72.5, rot: -Math.PI / 2 }} />
      <Prop name="Noticeboard" at={{ x: 5, z: 46.6 }} />
      <Prop name="Bench" at={{ x: -7.5, z: 59.6, rot: Math.PI }} />
      <Prop name="Bales" at={{ x: 25.3, z: 59, rot: Math.PI / 2 }} />
      <Prop name="FieldGate" at={{ x: 0, z: 44 }} signs={fieldSigns} />
      <Prop name="GateSign" at={{ x: 3.4, z: 80.5, rot: Math.PI }} signs={gateSigns} />
      <Prop name="FoodBowl" at={{ x: 13.5, z: 53.4 }} />
      {bowlFilled && (
        <mesh position={[13.5, heightAt(13.5, 53.4) + 0.12, 53.4]}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 16]} />
          <meshStandardMaterial color="#8a5a35" roughness={1} />
        </mesh>
      )}
      <Prop name="WaterBowl" at={{ x: 14.4, z: 53.5 }} />
      <Props name="FenceSection" items={fences} />
      <Props name="FlowerClump" items={flowers} shadows={false} />
      <Props name="Bush" items={bushes} />
      <Props name="Rock" items={rocks} />
      <Props name="TallGrassClump" items={grass} shadows={false} />
      <ScentGarden restored={gardenRestored} />
    </>
  );
}

/** Mara's orchard: apple trees in rows, her cottage behind the start, a hedge at the far end. */
export function OrchardWorld({ field }: { field: Field }) {
  const apples = useMemo(
    () =>
      field.trees.map((t, i) => ({
        x: t.pos.x,
        z: t.pos.z,
        rot: scatter(i, 8) * 6.28,
        scale: 0.75 + scatter(i, 9) * 0.15,
      })),
    [field],
  );
  const hedge = useMemo(
    () => along([field.minX, field.minZ - 1], [field.maxX, field.minZ - 1], 5),
    [field],
  );
  const fence = useMemo(
    () => [
      ...along([field.minX - 1, 16], [field.minX - 1, field.minZ], 3),
      ...along([field.maxX + 1, 16], [field.maxX + 1, field.minZ], 3),
    ],
    [field],
  );
  return (
    <>
      <Props name="TreeApple" items={apples} />
      <Props name="HedgeSection" items={hedge} />
      <Props name="FenceSection" items={fence} />
      <Prop name="Cottage" at={{ x: -24, z: 22, rot: Math.PI }} />
      <Prop name="Van" at={{ x: 18, z: 20 }} />
      <Prop name="Bales" at={{ x: -14, z: 17, rot: 0.3 }} />
      <Prop name="Bench" at={{ x: -18, z: 18.5, rot: Math.PI }} />
    </>
  );
}

const GREEN_BALES: Placement[] = [
  { x: -36, z: 22, rot: 0.4 },
  { x: 40, z: 21, rot: -0.3 },
];

/** The village green on Fun Day: tents behind the line, trees and a hedge round the edge. */
export function GreenWorld({ field }: { field: Field }) {
  const hedge = useMemo(
    () => along([field.minX, field.minZ - 1], [field.maxX, field.minZ - 1], 5),
    [field],
  );
  const benches = useMemo<Placement[]>(
    () => [
      { x: -14, z: 24, rot: Math.PI },
      { x: 12, z: 24.5, rot: Math.PI },
      { x: 32, z: 23, rot: Math.PI - 0.2 },
    ],
    [],
  );
  return (
    <>
      <Prop name="Tent" at={{ x: -26, z: 27, rot: Math.PI }} />
      <Prop name="Tent" at={{ x: 22, z: 28, rot: Math.PI }} />
      <Prop name="Tent" at={{ x: -6, z: 31, rot: Math.PI }} />
      <Props name="Bench" items={benches} />
      <Props name="Bales" items={GREEN_BALES} />
      <Props name="HedgeSection" items={hedge} />
      <FieldTrees field={field} kinds={['TreeOak', 'TreeOak2']} />
    </>
  );
}

/** Larchwood Rescue: the rescue building facing its exercise yard. */
export function ShelterWorld({ field }: { field: Field }) {
  const sign = useSignTexture(['Larchwood Rescue', 'every dog deserves a home'], {
    bg: '#f3ead8',
    fg: '#2f4a3c',
    width: 1024,
    height: 234,
    flipY: false,
  });
  const signs = useMemo(() => ({ SignFace: sign }), [sign]);
  const trees = useMemo(
    () => field.trees.map((t) => ({ x: t.pos.x, z: t.pos.z, scale: 0.8 })),
    [field],
  );
  const bushes = useMemo<Placement[]>(
    () => [
      { x: -9, z: field.minZ - 1.8 },
      { x: 9, z: field.minZ - 1.8, rot: 1.4 },
    ],
    [field],
  );
  const fence = useMemo(
    () => [
      ...along([field.minX, field.minZ], [field.maxX, field.minZ], 3),
      ...along([field.minX, field.minZ], [field.minX, field.maxZ], 3),
      ...along([field.maxX, field.minZ], [field.maxX, field.maxZ], 3),
    ],
    [field],
  );
  return (
    <>
      <Prop name="RescueBuilding" at={{ x: 0, z: field.minZ - 6 }} signs={signs} />
      <Props name="FenceSection" items={fence} />
      <Props name="TreeOak" items={trees} />
      <Props name="Bush" items={bushes} />
      <Prop name="Bench" at={{ x: field.maxX + 2, z: -4, rot: -Math.PI / 2 }} />
      <mesh position={[6, heightAt(6, -2) + 0.02, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 16]} />
        <meshStandardMaterial color="#c9b98f" />
      </mesh>
    </>
  );
}

const TRIAL_BENCHES: Placement[] = [
  { x: -22, z: 21, rot: Math.PI },
  { x: -18, z: 21.5, rot: Math.PI },
  { x: 20, z: 21, rot: Math.PI },
  { x: 24, z: 21.5, rot: Math.PI },
];
const TRIAL_BALES: Placement[] = [
  { x: -30, z: 18, rot: 0.3 },
  { x: 32, z: 17.5, rot: -0.4 },
  { x: -3.5, z: 20, rot: 0.1 },
];

/** Larkspur trial ground: the judges' tents behind the line, hedges and old trees. */
export function TrialWorld({ field }: { field: Field }) {
  const banner = useSignTexture(
    ['Larkspur Field Trials', 'judging today: marks · search · blind'],
    {
      bg: '#2f4a3c',
    },
  );
  const hedge = useMemo(
    () => [
      ...along([field.minX, field.minZ - 1.5], [field.maxX, field.minZ - 1.5], 5),
      ...along([field.minX - 1.5, field.maxZ - 6], [field.minX - 1.5, field.minZ], 5),
      ...along([field.maxX + 1.5, field.maxZ - 6], [field.maxX + 1.5, field.minZ], 5),
    ],
    [field],
  );
  const rope = useMemo(
    () => [...along([-40, 19], [-6, 19], 3), ...along([6, 19], [40, 19], 3)],
    [],
  );
  return (
    <>
      <Prop name="Tent" at={{ x: -10, z: 26, rot: Math.PI }} />
      <Prop name="Tent" at={{ x: 10, z: 27, rot: Math.PI }} />
      <Props name="Bench" items={TRIAL_BENCHES} />
      <Props name="Bales" items={TRIAL_BALES} />
      <Props name="FenceSection" items={rope} />
      <Props name="HedgeSection" items={hedge} />
      <FieldTrees field={field} kinds={['TreeOak', 'TreeOak2', 'TreePine']} />
      <mesh position={[0, heightAt(0, 24) + 3.4, 24]}>
        <planeGeometry args={[6.5, 1.6]} />
        <meshStandardMaterial map={banner} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
