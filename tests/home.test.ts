import { describe, expect, it } from 'vitest';
import {
  callDog,
  createHomeSession,
  fillHomeBowl,
  setHomeInput,
  stepHome,
  HOME_SOLIDS,
} from '../src/sim/home';
import { FIXED_DT } from '../src/sim/retrieve';
import { testDog } from './helpers';

const run = (s: ReturnType<typeof createHomeSession>, seconds: number) => {
  for (let i = 0; i < seconds / FIXED_DT; i++) stepHome(s, FIXED_DT);
};

describe('home', () => {
  it('the dog goes to a filled bowl, eats, and reports it', () => {
    const s = createHomeSession(testDog(), 1, { x: 0, z: 70 }, false);
    fillHomeBowl(s);
    run(s, 20);
    expect(s.ate).toBe(true);
    expect(s.bowlFilled).toBe(false);
  });

  it('the dog follows the keeper and comes when called', () => {
    const s = createHomeSession(testDog(), 2, { x: 0, z: 70 }, false);
    setHomeInput(s, { x: 1, z: 0 }, false);
    run(s, 6);
    setHomeInput(s, { x: 0, z: 0 }, false);
    run(s, 2);
    expect(Math.hypot(s.dog!.pos.x - s.keeper.pos.x, s.dog!.pos.z - s.keeper.pos.z)).toBeLessThan(
      4,
    );
    callDog(s);
    run(s, 4);
    expect(s.dog!.pose).toBe('sit');
  });

  it('the keeper cannot walk through buildings', () => {
    const s = createHomeSession(null, 3, { x: -16, z: 55 }, false);
    setHomeInput(s, { x: 0, z: 1 }, false);
    run(s, 6);
    const house = HOME_SOLIDS[0]!;
    const inside =
      s.keeper.pos.x > house.minX &&
      s.keeper.pos.x < house.maxX &&
      s.keeper.pos.z > house.minZ &&
      s.keeper.pos.z < house.maxZ;
    expect(inside).toBe(false);
  });

  it('walking up to a spot makes it usable', () => {
    const s = createHomeSession(null, 4, { x: 5, z: 49 }, false);
    stepHome(s, FIXED_DT);
    expect(s.nearSpot).toBe('noticeboard');
  });
});
