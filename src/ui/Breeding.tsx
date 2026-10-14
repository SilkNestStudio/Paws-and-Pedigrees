import { useMemo, useState } from 'react';
import { coatOf, type Dog } from '../core/dog/dog';
import { describe as describeEstimate } from '../core/dog/knowledge';
import { deriveCoat } from '../core/genetics/coat';
import { describeMix } from '../core/genetics/breeds';
import { formatGenotype } from '../core/genetics/loci';
import { dnaInWords } from '../core/genetics/explain';
import { APTITUDE_LABELS, type Aptitude } from '../core/genetics/traits';
import { PUP_ACTIVITIES } from '../sim/puppies';
import { ageText } from '../game/calendar';
import {
  BREEDING,
  canEvaluate,
  canRaiseToday,
  damProblem,
  findStud,
  forecast,
  placementFee,
  puppyReady,
  raisingActivities,
  sireProblem,
  studBook,
  type Litter,
} from '../game/breeding';
import { RESTORATIONS } from '../game/rules';
import { KENNEL_RUNS, runsUsed } from '../game/kennel';
import { studFee, studProblem } from '../game/reputation';
import { hasFlag, type GameState } from '../game/state';
import { useApp } from '../app/store';
import {
  dogWithTitles,
  go,
  keepPup,
  placePup,
  planLitter,
  openBreeding,
  restoreThing,
  runDnaTest,
  startPuppySession,
  toggleStud,
} from '../app/flow';
import { coatSwatch } from './swatch';

const close = () => useApp.setState({ panel: null });

export function Swatch({ dog, size = 28 }: { dog: Dog; size?: number }) {
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
      {tab === 'studs' && <StudsTab game={game} />}
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
                    <b>{dogWithTitles(d)}</b>
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
          {f.coats && (
            <p className="small">
              The chance of each colour for any one puppy. Looks only: colour doesn't change how a
              dog works.
            </p>
          )}
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
              A dog can carry a colour it doesn't show: two black dogs can have chocolate or yellow
              puppies. A DNA test on both parents shows the likely puppy colours (studs are already
              tested). Colour is looks only; it doesn't change how a dog works.
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
  const full = runsUsed(game) >= KENNEL_RUNS;
  return (
    <div className="litter">
      <h3>
        {litter.damName} × {litter.sireName}
        <span className="small">
          {' '}
          · born day {litter.bornDay} · inbreeding {(litter.inbreeding * 100).toFixed(1)}%
        </span>
      </h3>
      {litter.puppies.length > 0 && <RaisingRow game={game} litter={litter} />}
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

/** The talents that show in puppies, in plain words. */
const SEEN_IN_PUPPIES: { aptitude: Aptitude; word: string }[] = [
  { aptitude: 'confidence', word: 'Bold' },
  { aptitude: 'drive', word: 'Keen' },
  { aptitude: 'focus', word: 'Attentive' },
  { aptitude: 'biddability', word: 'Willing' },
  { aptitude: 'water', word: 'Water' },
];

/** Today's raising session, and evaluation day once the puppies are old enough. */
function RaisingRow({ game, litter }: { game: GameState; litter: Litter }) {
  const today = canRaiseToday(game, litter);
  const evaluate = canEvaluate(game, litter);
  return (
    <div className="raising">
      <div className="small">
        <b>Raising the litter.</b>{' '}
        {today
          ? 'Choose one session for today. Each builds a different talent, and how you handle each puppy decides how much.'
          : "Today's session is done. Puppies need their rest: one a day."}
      </div>
      {today && (
        <div className="button-row">
          {raisingActivities(game).map((a) => (
            <button
              key={a}
              className="button secondary small"
              title={PUP_ACTIVITIES[a].summary}
              onClick={() =>
                go('Into the paddock…', () => startPuppySession(litter.id, a, 'raise'))
              }
            >
              {PUP_ACTIVITIES[a].title} <small>({PUP_ACTIVITIES[a].builds})</small>
            </button>
          ))}
        </div>
      )}
      {evaluate && (
        <div className="button-row">
          <button
            className="button small"
            onClick={() =>
              go('Setting up the tests…', () => startPuppySession(litter.id, 'novelty', 'evaluate'))
            }
          >
            Hold evaluation day
          </button>
          <span className="small">
            Test every puppy before you choose who stays. Reading them right tells you much more.
          </span>
        </div>
      )}
      {litter.evaluated && (
        <div className="small">Evaluation day is done: see each puppy below.</div>
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
        {SEEN_IN_PUPPIES.filter((t) => k[t.aptitude])
          .map((t) => `${t.word}: ${describeEstimate(k[t.aptitude]).toLowerCase()}`)
          .join(' · ')}
      </div>
      {pup.rearing && Object.values(pup.rearing).some((v) => v) && (
        <div className="sub raised">
          Raising:{' '}
          {SEEN_IN_PUPPIES.filter((t) => pup.rearing?.[t.aptitude])
            .map((t) => {
              const pts = Math.round((pup.rearing![t.aptitude] ?? 0) * 15);
              return `${t.word.toLowerCase()} ${pts > 0 ? '+' : ''}${pts}`;
            })
            .join(', ')}
        </div>
      )}
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

/** Your own males: offer them to other kennels once they have a title. */
function OwnStuds({ game }: { game: GameState }) {
  const males = game.dogs.filter((d) => d.sex === 'male');
  if (!males.length) return null;
  return (
    <>
      <h3>Your dogs at stud</h3>
      <p className="small">
        Other kennels pay to use a proven dog. Bookings arrive with each new season: more titles and
        a bigger name bring more of them, and his puppies turn up at Larkspur a few seasons on.
      </p>
      {males.map((d) => {
        const problem = studProblem(d);
        const bookings = game.studBookings.filter((b) => b.studId === d.id);
        return (
          <div key={d.id} className={`row ${d.atStud ? 'active' : ''}`}>
            <Swatch dog={d} size={36} />
            <div className="grow">
              <div className="title">{dogWithTitles(d)}</div>
              <div className="sub">
                {problem ??
                  `Fee $${studFee(game, d)}. ${bookings.length ? `${bookings.length} booking${bookings.length > 1 ? 's' : ''} so far ($${bookings.reduce((a, b) => a + b.fee, 0)}).` : 'No bookings yet.'}`}
              </div>
            </div>
            <button
              className="button secondary small"
              disabled={!!problem}
              onClick={() => toggleStud(d.id)}
            >
              {d.atStud ? 'Withdraw' : 'Offer at stud'}
            </button>
          </div>
        );
      })}
      <h3>Studs from other kennels</h3>
    </>
  );
}

function StudsTab({ game }: { game: GameState }) {
  const studs = useMemo(() => studBook(), []);
  return (
    <div className="list">
      <OwnStuds game={game} />
      <p className="small">
        Proven dogs from other kennels. Their owners publish what the dogs have shown in trials and
        their DNA results.
      </p>
      <DnaExplained />
      {studs.map((s) => {
        const best = Object.entries(s.known)
          .map(([a, e]) => ({ a, mid: (e!.lo + e!.hi) / 2 }))
          .sort((x, y) => y.mid - x.mid)
          .slice(0, 3);
        return (
          <div key={s.dog.id} className="row">
            <Swatch dog={s.dog} size={36} />
            <div className="grow">
              <div className="title">{dogWithTitles(s.dog)}</div>
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
              <DnaResult dog={s.dog} />
            </div>
            <span className="badge">${s.fee}</span>
          </div>
        );
      })}
    </div>
  );
}

/** What a DNA test is for, said once at the top of the stud book. */
function DnaExplained() {
  return (
    <div className="dna-explained small">
      <b>What the DNA line means.</b> DNA here is about looks only: colour, pattern and coat length.
      It says nothing about ability (that is the Strengths line). A dog can carry a colour without
      showing it. A carried colour appears in puppies only when the other parent has it too, shown
      or carried; with two carriers, about one puppy in four shows it. So the DNA line matters if
      you want, or want to avoid, a particular colour. Pick a pairing on the Plan tab and the odds
      are worked out for you.
    </div>
  );
}

/** A dog's DNA result in plain words, with the breeders' codes folded away. */
function DnaResult({ dog }: { dog: Dog }) {
  return (
    <div className="sub dna-result">
      <b>DNA:</b> {dnaInWords(dog.genome.loci)}
      <details>
        <summary>Gene codes</summary>
        <span className="mono">{formatGenotype(dog.genome.loci)}</span>
        <div>
          For breeders who know them, two copies of each gene: E yellow or red, K solid or brindle,
          A pattern, B chocolate, D dilute, M merle, S white, T ticking, L coat length, F beard, Cu
          curl. A small letter is the hidden (recessive) form.
        </div>
      </details>
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
        <DnaResult dog={dog} />
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
