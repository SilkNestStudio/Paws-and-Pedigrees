import { useMemo, useState } from 'react';
import { coatOf, type Dog } from '../core/dog/dog';
import { describe as describeEstimate } from '../core/dog/knowledge';
import { deriveCoat } from '../core/genetics/coat';
import { describeMix } from '../core/genetics/breeds';
import { formatGenotype } from '../core/genetics/loci';
import { APTITUDE_LABELS } from '../core/genetics/traits';
import { ageText } from '../game/calendar';
import {
  BREEDING,
  damProblem,
  findStud,
  forecast,
  placementFee,
  puppyReady,
  sireProblem,
  studBook,
  type Litter,
} from '../game/breeding';
import { RESTORATIONS } from '../game/rules';
import { hasFlag, type GameState } from '../game/state';
import { useApp } from '../app/store';
import {
  dogWithTitles,
  keepPup,
  placePup,
  planLitter,
  openBreeding,
  restoreThing,
  runDnaTest,
  titleLetters,
} from '../app/flow';
import { coatSwatch } from './swatch';

const close = () => useApp.setState({ panel: null });

function Swatch({ dog, size = 28 }: { dog: Dog; size?: number }) {
  return (
    <span
      className="swatch inline"
      style={{ background: coatSwatch(coatOf(dog)), width: size, height: size }}
    />
  );
}

/** Restoring Grandpa's whelping room, which opens breeding. */
export function WhelpingRoomPanel({ game }: { game: GameState }) {
  const r = RESTORATIONS.find((x) => x.id === 'whelpingRoom')!;
  return (
    <div className="panel card narrow">
      <div className="kicker">Restoration</div>
      <h2>{r.name}</h2>
      <p className="lead">{r.description}</p>
      <p>
        <b>Unlocks:</b> {r.unlocks}
      </p>
      <div className="button-row">
        <button
          className="button"
          disabled={game.money < r.cost}
          onClick={() => {
            restoreThing('whelpingRoom');
            openBreeding('plan');
          }}
        >
          Restore for ${r.cost}
        </button>
        <button className="button secondary" onClick={close}>
          Later
        </button>
      </div>
      {game.money < r.cost && <p className="small">You have ${game.money}. Jobs and trials pay.</p>}
    </div>
  );
}

export function BreedingPanel({ game }: { game: GameState }) {
  const tab = useApp((s) => s.breedingTab);
  const pups = game.litters.reduce((n, l) => n + l.puppies.length, 0);
  const newLitter = game.litters.find((l) => l.bornDay === game.day && l.puppies.length);
  const set = (t: typeof tab) => useApp.setState({ breedingTab: t });
  return (
    <div className="panel card wide">
      <div className="kicker">Grandpa's whelping room</div>
      <h2>{newLitter && tab === 'litters' ? 'The puppies are here!' : 'Breeding'}</h2>
      <div className="tabs">
        <button className={`tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => set('plan')}>
          Plan a litter
        </button>
        <button
          className={`tab ${tab === 'litters' ? 'active' : ''}`}
          onClick={() => set('litters')}
        >
          Litters{pups ? ` (${pups} puppies)` : ''}
        </button>
        <button className={`tab ${tab === 'studs' ? 'active' : ''}`} onClick={() => set('studs')}>
          Stud book
        </button>
      </div>
      {tab === 'plan' && <PlanTab game={game} />}
      {tab === 'litters' && <LittersTab game={game} />}
      {tab === 'studs' && <StudsTab />}
      <div className="button-row">
        <button className="button secondary" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planning a pairing
// ---------------------------------------------------------------------------

function PlanTab({ game }: { game: GameState }) {
  const studs = useMemo(() => studBook(), []);
  const females = game.dogs.filter((d) => d.sex === 'female');
  const males = [...game.dogs.filter((d) => d.sex === 'male'), ...studs.map((s) => s.dog)];
  const [damId, setDamId] = useState<string | null>(
    females.find((d) => !damProblem(game, d))?.id ?? females[0]?.id ?? null,
  );
  const [sireId, setSireId] = useState<string | null>(males[0]?.id ?? null);
  const dam = females.find((d) => d.id === damId) ?? null;
  const sire = males.find((d) => d.id === sireId) ?? null;
  const f = dam && sire ? forecast(game, dam, sire) : null;

  if (!females.length)
    return (
      <p className="lead">
        Breeding starts with a female of your own. Larchwood Rescue has new arrivals every season
        (take the van).
      </p>
    );

  return (
    <div className="plan">
      <div className="pickers">
        <div>
          <h3>Dam</h3>
          <div className="pick-list">
            {females.map((d) => {
              const problem = damProblem(game, d);
              return (
                <button
                  key={d.id}
                  className={`pick ${d.id === damId ? 'active' : ''}`}
                  onClick={() => setDamId(d.id)}
                >
                  <Swatch dog={d} />
                  <span>
                    <b>{dogWithTitles(d)}</b>
                    <small>{problem ?? `${ageText(d.ageMonths)} · ${coatOf(d).name}`}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3>Sire</h3>
          <div className="pick-list">
            {males.map((d) => {
              const stud = findStud(d.id);
              const problem = sireProblem(d);
              return (
                <button
                  key={d.id}
                  className={`pick ${d.id === sireId ? 'active' : ''}`}
                  onClick={() => setSireId(d.id)}
                >
                  <Swatch dog={d} />
                  <span>
                    <b>
                      {d.name}
                      {d.titles.length ? ` ${d.titles.map(titleLetters).join(' ')}` : ''}
                    </b>
                    <small>
                      {stud
                        ? `${stud.kennel} · $${stud.fee}`
                        : (problem ?? `Yours · ${ageText(d.ageMonths)}`)}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {dam && sire && f && (
        <div className="forecast">
          <h3>
            {dam.name} × {sire.name}
          </h3>
          <div className="facts">
            <span className="badge">
              Litter of {f.litterSize[0]}–{f.litterSize[1]}
            </span>
            <span className={`badge ${f.inbreeding >= BREEDING.inbreedingWarn ? 'warn' : 'good'}`}>
              Inbreeding {(f.inbreeding * 100).toFixed(1)}%
            </span>
            <span className="badge">Due {BREEDING.gestationDays} days after mating</span>
            {f.fee > 0 && <span className="badge">Stud fee ${f.fee}</span>}
          </div>

          <h4>Likely coats</h4>
          {f.coats ? (
            <div className="coat-odds">
              {f.coats.map((c) => (
                <div key={c.name} className="coat-odd">
                  <span
                    className="swatch inline"
                    style={{ background: coatSwatch(deriveCoat(c.sample)) }}
                  />
                  <span className="grow">{c.name}</span>
                  <b>{Math.round(c.share * 100)}%</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="small">
              Coat genes can hide. A DNA test on both parents shows the likely puppy colours (studs
              are already tested).
              <div className="button-row">
                {[dam, sire]
                  .filter((d) => !d.dnaTested)
                  .map((d) => (
                    <button
                      key={d.id}
                      className="button secondary small"
                      disabled={game.money < BREEDING.dnaTestCost}
                      onClick={() => runDnaTest(d.id)}
                    >
                      DNA test {d.name} (${BREEDING.dnaTestCost})
                    </button>
                  ))}
              </div>
            </div>
          )}

          <h4>Likely talents</h4>
          <p className="small">
            From what you know about each parent. Work your dogs more and these ranges narrow.
          </p>
          <div className="talents">
            {f.talents.map((t) => (
              <div
                key={t.aptitude}
                className="talent-row"
                title={APTITUDE_LABELS[t.aptitude].effect}
              >
                <span>{APTITUDE_LABELS[t.aptitude].name}</span>
                <span className={t.certain ? 'known' : 'unknown'}>
                  {t.certain ? '' : 'Rough guess '}
                  {t.lo}–{t.hi}
                </span>
                <div className="range">
                  <div
                    className="band"
                    style={{ left: `${t.lo}%`, width: `${Math.max(2, t.hi - t.lo)}%` }}
                  />
                  <div className="mid" style={{ left: `${t.mid}%` }} />
                </div>
              </div>
            ))}
          </div>

          <ul className="notes">
            {f.warnings.map((w) => (
              <li key={w} className="warn">
                {w}
              </li>
            ))}
            {f.blocked && <li className="warn">{f.blocked}</li>}
          </ul>
          <div className="button-row">
            <button
              className="button"
              disabled={!!f.blocked || game.money < f.fee}
              onClick={() => planLitter(dam.id, sire.id)}
            >
              {f.fee > 0 ? `Breed (stud fee $${f.fee})` : 'Breed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Litters and puppies
// ---------------------------------------------------------------------------

function LittersTab({ game }: { game: GameState }) {
  const litters = [...game.litters].sort((a, b) => b.bornDay - a.bornDay);
  if (!litters.length && !game.pregnancies.length)
    return <p className="lead">No litters yet. Plan one on the first tab.</p>;
  return (
    <div className="litters">
      {game.pregnancies.map((p) => {
        const dam = game.dogs.find((d) => d.id === p.damId);
        const days = p.dueDay - game.day;
        return (
          <div key={p.id} className="row">
            <div className="grow">
              <div className="title">
                {dam?.name} is in whelp to {p.sireName}
              </div>
              <div className="sub">
                Puppies due on day {p.dueDay} (
                {days <= 0 ? 'any time now' : days === 1 ? 'tomorrow' : `in ${days} days`}). Gentle
                lessons only for her until then.
              </div>
            </div>
          </div>
        );
      })}
      {litters.map((l) => (
        <LitterCard key={l.id} game={game} litter={l} />
      ))}
    </div>
  );
}

function LitterCard({ game, litter }: { game: GameState; litter: Litter }) {
  const full = game.dogs.length >= 6;
  return (
    <div className="litter">
      <h3>
        {litter.damName} × {litter.sireName}
        <span className="small">
          {' '}
          · born day {litter.bornDay} · inbreeding {(litter.inbreeding * 100).toFixed(1)}%
        </span>
      </h3>
      {litter.puppies.length > 0 && (
        <div className="puppies">
          {litter.puppies.map((p) => (
            <PuppyCard key={p.id} game={game} litter={litter} pup={p} full={full} />
          ))}
        </div>
      )}
      {(litter.kept.length > 0 || litter.placed.length > 0) && (
        <p className="small">
          {litter.kept.length > 0 &&
            `Kept: ${litter.kept.map((id) => game.pedigree[id]?.name ?? '?').join(', ')}. `}
          {litter.placed.map((p) => `${p.name} went to ${p.home} ($${p.fee})`).join('; ')}
        </p>
      )}
    </div>
  );
}

function PuppyCard({
  game,
  litter,
  pup,
  full,
}: {
  game: GameState;
  litter: Litter;
  pup: Dog;
  full: boolean;
}) {
  const [name, setName] = useState(pup.name);
  const coat = coatOf(pup);
  const k = game.knowledge[pup.id] ?? {};
  const ready = puppyReady(pup);
  return (
    <div className="puppy card">
      <div className="puppy-head">
        <Swatch dog={pup} size={36} />
        <div>
          <div className="title">{pup.name}</div>
          <div className="sub">
            {pup.sex === 'female' ? 'Girl' : 'Boy'} · {coat.name}
          </div>
        </div>
      </div>
      <div className="sub">
        Bold: {describeEstimate(k.confidence).toLowerCase()} · Keen:{' '}
        {describeEstimate(k.drive).toLowerCase()}
      </div>
      <div className="sub">{ageText(pup.ageMonths)} old</div>
      {ready ? (
        <>
          <input maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="button-row">
            <button
              className="button small"
              disabled={full}
              title={full ? 'All six runs are full' : ''}
              onClick={() => keepPup(litter.id, pup.id, name)}
            >
              Keep
            </button>
            <button className="button secondary small" onClick={() => placePup(litter.id, pup.id)}>
              Place (${placementFee(game, litter, pup)})
            </button>
          </div>
        </>
      ) : (
        <div className="small">With mum until {BREEDING.goHomeMonths} months (next season).</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The stud book
// ---------------------------------------------------------------------------

function StudsTab() {
  const studs = useMemo(() => studBook(), []);
  return (
    <div className="list">
      <p className="small">
        Proven dogs from other kennels. Their owners publish DNA results and what the dogs have
        shown in trials.
      </p>
      {studs.map((s) => {
        const best = Object.entries(s.known)
          .map(([a, e]) => ({ a, mid: (e!.lo + e!.hi) / 2 }))
          .sort((x, y) => y.mid - x.mid)
          .slice(0, 3);
        return (
          <div key={s.dog.id} className="row">
            <Swatch dog={s.dog} size={36} />
            <div className="grow">
              <div className="title">
                {s.dog.name} {s.dog.titles.map(titleLetters).join(' ')}
              </div>
              <div className="sub">
                {s.kennel} ({s.owner}) · {describeMix(s.dog.breedMix)} · {coatOf(s.dog).name}
              </div>
              <div className="sub">"{s.blurb}"</div>
              <div className="sub">
                Strengths:{' '}
                {best
                  .map(
                    (b) =>
                      `${APTITUDE_LABELS[b.a as keyof typeof APTITUDE_LABELS].name} ${Math.round(b.mid)}`,
                  )
                  .join(', ')}
              </div>
              <div className="sub mono">DNA: {formatGenotype(s.dog.genome.loci)}</div>
            </div>
            <span className="badge">${s.fee}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Pedigree lines for the ledger: parents and grandparents, as far as known. */
export function PedigreeBlock({ game, dog }: { game: GameState; dog: Dog }) {
  const ped = game.pedigree;
  const nameOf = (id?: string) =>
    id
      ? (ped[id]?.name ?? game.dogs.find((d) => d.id === id)?.name ?? 'not recorded')
      : 'not recorded';
  const sire = dog.sireId ? ped[dog.sireId] : undefined;
  const dam = dog.damId ? ped[dog.damId] : undefined;
  const litters = game.litters.filter((l) => l.damId === dog.id || l.sireId === dog.id);
  return (
    <div className="pedigree">
      <h3>Family</h3>
      {sire || dam ? (
        <table className="ped">
          <tbody>
            <tr>
              <td rowSpan={2}>
                Sire: <b>{nameOf(dog.sireId)}</b>
              </td>
              <td>{nameOf(sire?.sireId)}</td>
            </tr>
            <tr>
              <td>{nameOf(sire?.damId)}</td>
            </tr>
            <tr>
              <td rowSpan={2}>
                Dam: <b>{nameOf(dog.damId)}</b>
              </td>
              <td>{nameOf(dam?.sireId)}</td>
            </tr>
            <tr>
              <td>{nameOf(dam?.damId)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="small">
          {dog.origin === 'shelter'
            ? 'A rescue: parents unknown. Her story starts here.'
            : 'No recorded parents.'}
        </p>
      )}
      {dog.breeder && <p className="small">Bred by {dog.breeder}.</p>}
      {litters.length > 0 && (
        <p className="small">
          Litters:{' '}
          {litters
            .map(
              (l) =>
                `${l.damId === dog.id ? `by ${l.sireName}` : `out of ${l.damName}`} (day ${l.bornDay})`,
            )
            .join('; ')}
        </p>
      )}
      {dog.dnaTested ? (
        <p className="small mono">DNA (coat): {formatGenotype(dog.genome.loci)}</p>
      ) : (
        hasFlag(game, 'restored:whelpingRoom') && (
          <button className="link" onClick={() => runDnaTest(dog.id)}>
            DNA test {dog.name} (${BREEDING.dnaTestCost})
          </button>
        )
      )}
    </div>
  );
}
