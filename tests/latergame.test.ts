import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { aptitude, coatOf, generateRescue, type Dog } from '../src/core/dog/dog';
import { addFlag, migrate, newGame, update, type GameState } from '../src/game/state';
import { adoptDog, canAdoptMore, setActiveDog, sleep } from '../src/game/rules';
import { breed, BREEDING, register, whelp } from '../src/game/breeding';
import {
  KENNEL_RUNS,
  mentorBonus,
  RETIREMENT,
  retireDog,
  retireProblem,
  runsUsed,
} from '../src/game/kennel';
import {
  allPagesFound,
  bringLegacyHome,
  checkLedger,
  LEDGER_PAGES,
  legacyReady,
} from '../src/game/ledger';
import {
  buyBulkFood,
  buyMarketDog,
  healthCheck,
  isMarketDay,
  marketStock,
  scanLitter,
  VET,
} from '../src/game/services';
import { CUP, cupEvent, cupProblem, recordEvent, rivalScore } from '../src/game/events';
import { isCupDay, nextCupDay } from '../src/game/calendar';
import { dogParams } from '../src/sim/dogParams';
import { greetVisitor, visitorToday } from '../src/game/visitors';
import { trophies } from '../src/game/trophies';

function kennel(seed = 5, dogs = 2): GameState {
  return update(newGame(seed), (s) => {
    for (let i = 0; i < dogs; i++) {
      const dog = generateRescue(
        createRng(seed * 10 + i),
        ['Bess', 'Rex', 'Fern', 'Moss'][i],
      ) as Dog;
      dog.sex = i % 2 ? 'male' : 'female';
      dog.ageMonths = 30;
      s.dogs.push(dog);
      register(s, dog, 'Larchwood Rescue');
    }
    s.activeDogId = s.dogs[0]!.id;
    s.shelter = [];
    s.story = 'afterFunDay';
    s.funDay = { entries: [], bestRound: 'mark' };
    s.kennelName = 'Oak Hollow';
    s.money = 1000;
    s.food = 99;
  });
}

describe('retirement', () => {
  it('is for old dogs, frees a run, and hands the lead to another dog', () => {
    let s = kennel();
    expect(retireProblem(s, s.dogs[0]!)).toMatch(/Too young/);
    s = update(s, (d) => {
      d.dogs[0]!.ageMonths = RETIREMENT.mayRetireMonths;
      d.dogs[0]!.titles = ['novice'];
    });
    expect(retireProblem(s, s.dogs[0]!)).toBeNull();
    expect(runsUsed(s)).toBe(2);
    s = update(s, (d) => void expect(retireDog(d, d.dogs[0]!.id)).toBe(true));
    expect(s.dogs[0]!.retired).toBe(true);
    expect(s.dogs.length).toBe(2);
    expect(runsUsed(s)).toBe(1);
    expect(s.activeDogId).toBe(s.dogs[1]!.id);
    // A retired dog stays retired: it can't be taken out to work.
    expect(update(s, (d) => void expect(setActiveDog(d, d.dogs[0]!.id)).toBe(false))).toBeTruthy();
    // And the last working dog can't be retired.
    s = update(s, (d) => void (d.dogs[1]!.ageMonths = 100));
    expect(retireProblem(s, s.dogs[1]!)).toMatch(/another working dog/);
  });

  it('old hands about the place help the youngsters learn, titled ones most', () => {
    let s = kennel(6, 3);
    expect(mentorBonus(s)).toBe(0);
    s = update(s, (d) => {
      d.dogs[0]!.retired = true;
    });
    expect(mentorBonus(s)).toBeCloseTo(0.04);
    s = update(s, (d) => {
      d.dogs[0]!.titles = ['novice'];
    });
    expect(mentorBonus(s)).toBeCloseTo(0.1);
  });

  it('a very old dog retires itself at the turn of the season, and nobody dies', () => {
    let s = kennel(7, 2);
    s = update(s, (d) => {
      d.dogs[0]!.ageMonths = RETIREMENT.retiresMonths - 2;
    });
    for (let i = 0; i < 8; i++) s = update(s, (d) => void sleep(d));
    expect(s.dogs.length).toBe(2);
    expect(s.dogs[0]!.retired).toBe(true);
    expect(s.dogs[1]!.retired).toBeFalsy();
  });

  it('retired dogs leave room for new ones', () => {
    let s = kennel(8, 2);
    s = update(s, (d) => {
      while (d.dogs.length < KENNEL_RUNS) {
        const dog = generateRescue(createRng(900 + d.dogs.length), `Dog${d.dogs.length}`) as Dog;
        d.dogs.push(dog);
      }
      d.shelter = [generateRescue(createRng(77), 'Pip') as Dog];
    });
    expect(canAdoptMore(s)).toBe(false);
    s = update(s, (d) => {
      d.dogs[2]!.retired = true;
      expect(adoptDog(d, 0, 'Pip')).not.toBeNull();
    });
    expect(s.dogs.length).toBe(KENNEL_RUNS + 1);
    expect(runsUsed(s)).toBe(KENNEL_RUNS);
  });

  it('age shows: an old dog is slower and tires sooner', () => {
    const dog = generateRescue(createRng(3), 'Old') as Dog;
    dog.ageMonths = 36;
    const young = dogParams(dog);
    dog.ageMonths = 120;
    const old = dogParams(dog);
    expect(old.gallop).toBeLessThan(young.gallop);
    expect(old.staminaMax).toBeLessThan(young.staminaMax);
  });
});

describe("Grandpa's torn pages", () => {
  it('turn up as the kennel comes back to life', () => {
    let s = kennel();
    s = update(s, (d) => void expect(checkLedger(d)).toEqual([]));
    s = update(s, (d) => {
      addFlag(d, 'restored:whelpingRoom');
      const found = checkLedger(d);
      expect(found.map((p) => p.id)).toEqual(['litter']);
      // Found once only.
      expect(checkLedger(d)).toEqual([]);
    });
    s = update(s, (d) => {
      d.dogs[0]!.sportTitles = { agility: ['novice'] };
      addFlag(d, 'restored:scentGarden');
      addFlag(d, 'restored:duckPond');
      d.reputation = 30;
      addFlag(d, 'firstLitter');
      expect(checkLedger(d).length).toBe(4);
    });
    expect(allPagesFound(s)).toBe(true);
    expect(s.ledger.length).toBe(LEDGER_PAGES.length);
    expect(s.diary.some((e) => e.text.includes('torn page'))).toBe(true);
  });

  it("the last page brings Wren home, with Grandpa's champions behind her", () => {
    let s = kennel();
    s = update(s, (d) => {
      d.ledger = LEDGER_PAGES.map((p) => p.id);
    });
    expect(legacyReady(s)).toBe(false);
    s = update(s, (d) => addFlag(d, 'practised:herding'));
    expect(legacyReady(s)).toBe(true);
    s = update(s, (d) => {
      const wren = bringLegacyHome(d)!;
      expect(wren.name).toBe('Wren');
      expect(bringLegacyHome(d)).toBeNull();
    });
    const wren = s.dogs.find((d) => d.name === 'Wren')!;
    expect(wren.sex).toBe('female');
    expect(coatOf(wren).name.toLowerCase()).toContain('black');
    expect(aptitude(wren, 'nose')).toBeGreaterThan(55);
    const dam = s.pedigree[wren.damId!]!;
    expect(s.pedigree[dam.sireId!]!.name).toBe('Tam');
    expect(s.pedigree[dam.damId!]!.name).toBe('Nell');
    expect(s.ledger).toContain('whitetoe');
  });
});

describe('the vet', () => {
  it('a check-up measures what watching only hints at', () => {
    let s = kennel();
    const dog = s.dogs[0]!;
    s = update(s, (d) => {
      const out = healthCheck(d, dog.id);
      expect(out.ok).toBe(true);
      expect(out.found.length).toBe(4);
    });
    expect(s.money).toBe(1000 - VET.healthCheck);
    const known = s.knowledge[dog.id]!.speed!;
    expect(known.hi - known.lo).toBeLessThanOrEqual(6);
    expect(known.lo).toBeLessThanOrEqual(aptitude(dog, 'speed'));
    expect(known.hi).toBeGreaterThanOrEqual(aptitude(dog, 'speed'));
  });

  it('a scan tells the truth about the litter to come', () => {
    let s = kennel();
    s = update(s, (d) => {
      addFlag(d, 'restored:whelpingRoom');
      expect(scanLitter(d, d.dogs[0]!.id).ok).toBe(false);
      expect(breed(d, d.dogs[0]!.id, d.dogs[1]!.id)).not.toBeNull();
      expect(scanLitter(d, d.dogs[0]!.id).ok).toBe(true);
      expect(scanLitter(d, d.dogs[0]!.id).ok).toBe(false);
    });
    const scanned = s.pregnancies[0]!.scanned!;
    expect(scanned).toBeGreaterThanOrEqual(BREEDING.litterMin);
    s = update(s, (d) => void whelp(d, d.pregnancies[0]!));
    expect(s.litters[0]!.puppies.length).toBe(scanned);
  });
});

describe("the breeders' market", () => {
  it('sets up at the start of each season with three youngsters', () => {
    expect(isMarketDay(1)).toBe(false);
    expect(isMarketDay(8)).toBe(true);
    expect(isMarketDay(9)).toBe(true);
    expect(isMarketDay(10)).toBe(false);
    let s = kennel();
    s = update(s, (d) => void (d.day = 8));
    const stock = marketStock(s);
    expect(stock.length).toBe(3);
    expect(marketStock(s).map((l) => l.dog.id)).toEqual(stock.map((l) => l.dog.id));
    for (const lot of stock) {
      expect(lot.price).toBeGreaterThanOrEqual(120);
      expect(lot.dog.ageMonths).toBeLessThan(12);
      expect(lot.dog.sireId).toBe(lot.sireId);
    }
    const next = marketStock(update(s, (d) => void (d.day = 15)));
    expect(next.map((l) => l.dog.id)).not.toEqual(stock.map((l) => l.dog.id));
  });

  it('a bought youngster joins the kennel with its pedigree, once only', () => {
    let s = kennel();
    s = update(s, (d) => void (d.day = 8));
    const lot = marketStock(s)[0]!;
    s = update(s, (d) => {
      const dog = buyMarketDog(d, 0, 'Jet')!;
      expect(dog.name).toBe('Jet');
      expect(buyMarketDog(d, 0, 'Again')).toBeNull();
    });
    expect(s.money).toBe(1000 - lot.price);
    expect(s.dogs.length).toBe(3);
    expect(s.pedigree[lot.dog.id]!.sireId).toBe(lot.sireId);
    expect(s.pedigree[lot.sireId]!.name).toBe(lot.sireName);
    expect(marketStock(s)[0]!.sold).toBe(true);
    // Not on other days, and not without the money.
    expect(
      update(s, (d) => void ((d.day = 11), expect(buyMarketDog(d, 1, 'X')).toBeNull())),
    ).toBeTruthy();
    expect(
      update(s, (d) => void ((d.money = 10), expect(buyMarketDog(d, 1, 'X')).toBeNull())),
    ).toBeTruthy();
    s = update(s, (d) => void expect(buyBulkFood(d)).toBe(true));
    expect(s.food).toBe(99 + 20);
  });
});

describe('the Hollowmere Cup', () => {
  it('closes each year, by invitation, for a kennel with two dogs', () => {
    expect(isCupDay(28)).toBe(true);
    expect(isCupDay(27)).toBe(false);
    expect(nextCupDay(1)).toBe(28);
    expect(nextCupDay(29)).toBe(56);
    let s = kennel();
    expect(cupProblem(s)).toMatch(/last Sunday of winter/);
    s = update(s, (d) => void (d.day = 28));
    expect(cupProblem(s)).toMatch(/invitation/);
    s = update(s, (d) => void (d.reputation = CUP.minReputation));
    expect(cupProblem(s)).toBeNull();
    const one = update(s, (d) => void (d.dogs[1]!.retired = true));
    expect(cupProblem(one)).toMatch(/two dogs/);
    // An Open title in any sport is an invitation too.
    const titled = update(s, (d) => {
      d.reputation = 0;
      d.dogs[0]!.sportTitles = { herding: ['novice', 'open'] };
    });
    expect(cupProblem(titled)).toBeNull();
  });

  it('has a round of every kind of work, and rivals who really run them', () => {
    const def = cupEvent(123, 28);
    expect(def.rounds.map((r) => r.kind)).toEqual(['mark', 'blind', 'agility', 'herding']);
    expect(def.rivals.length).toBe(4);
    for (const rival of def.rivals) {
      for (let i = 0; i < 4; i++) {
        const score = rivalScore(def, rival, i);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
    const victor = def.rivals.find((r) => r.id === 'victor')!;
    expect(rivalScore(def, victor, 0) + rivalScore(def, victor, 1)).toBeGreaterThan(100);
  });

  it('winning it goes down in the ledger, and tires every dog that ran', () => {
    let s = kennel();
    s = update(s, (d) => {
      d.day = 28;
      d.reputation = 30;
    });
    const def = cupEvent(s.seed, 28);
    const [a, b] = s.dogs.map((d) => d.id);
    s = update(s, (d) => {
      const out = recordEvent(
        d,
        def,
        [95, 95, 95, 95],
        def.rivals.map(() => [60, 60, 60, 60]),
        [a!, a!, b!, b!],
      )!;
      expect(out.record.placing).toBe(1);
      expect(out.record.prize).toBe(CUP.prizes[0]);
      expect(out.record.entries[0]!.dog).toBe('Bess & Rex');
    });
    expect(s.flags).toContain('cup:won');
    expect(s.reputation).toBe(30 + CUP.reputationWin);
    expect(s.dogs.every((d) => d.energy <= 70)).toBe(true);
    expect(s.dogs[0]!.qualifiers).toEqual({});
    expect(cupProblem(s)).toMatch(/run in the Cup today/);
    expect(s.diary.some((e) => e.text.includes('Hollowmere Cup'))).toBe(true);
  });
});

describe('saves', () => {
  it('a version 4 save gains the ledger and the album', () => {
    const old = kennel() as unknown as Record<string, unknown>;
    delete old.ledger;
    delete old.photos;
    old.version = 4;
    const s = migrate(structuredClone(old))!;
    expect(s.version).toBe(5);
    expect(s.ledger).toEqual([]);
    expect(s.photos).toEqual([]);
  });
});

describe('visitors at the gate', () => {
  it('Mara drops by every few days with a tip, and food when the pantry is thin', () => {
    let s = kennel();
    s = update(s, (d) => {
      d.day = 9;
      d.food = 2;
      d.flags.push('visit:dora', 'visit:sam');
    });
    const v = visitorToday(s)!;
    expect(v.name).toBe('Mara');
    expect(v.meals).toBe(2);
    s = update(s, (d) => void greetVisitor(d));
    expect(s.food).toBe(4);
    // She says her piece once.
    expect(visitorToday(s)).toBeNull();
    expect(visitorToday(update(s, (d) => void (d.day = 10)))).toBeNull();
  });

  it('Victor turns up the day you have a titled dog, once', () => {
    let s = kennel();
    s = update(s, (d) => {
      d.day = 16;
      d.dogs[0]!.titles = ['novice'];
    });
    expect(visitorToday(s)!.id).toBe('victor');
    s = update(s, (d) => void greetVisitor(d));
    expect(visitorToday(s)?.id).not.toBe('victor');
  });

  it('nobody calls during the first week', () => {
    const s = update(kennel(), (d) => {
      d.story = 'freeWeek';
      d.day = 3;
    });
    expect(visitorToday(s)).toBeNull();
  });
});

describe('the trophy shelf', () => {
  it('fills with what the kennel has won and put right', () => {
    let s = kennel();
    expect(trophies(s)).toEqual([]);
    s = update(s, (d) => {
      d.dogs[0]!.titles = ['novice'];
      d.dogs[1]!.sportTitles = { agility: ['novice'] };
      addFlag(d, 'restored:duckPond');
      addFlag(d, 'firstLitter');
      d.reputation = 30;
      d.day = 28;
      const def = cupEvent(d.seed, 28);
      recordEvent(
        d,
        def,
        [95, 95, 95, 95],
        def.rivals.map(() => [50, 50, 50, 50]),
        [d.dogs[0]!.id, d.dogs[1]!.id],
      );
    });
    const shelf = trophies(s);
    expect(shelf[0]!.kind).toBe('cup');
    expect(shelf.filter((t) => t.kind === 'title').length).toBe(2);
    expect(shelf.some((t) => t.text.includes('duck pond'))).toBe(true);
    expect(shelf.some((t) => t.text.includes('first litter'))).toBe(true);
  });
});
