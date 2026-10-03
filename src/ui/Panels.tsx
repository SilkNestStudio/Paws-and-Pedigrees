import { useState } from 'react';
import { aptitude, breedDescription, coatOf, CUE_LABELS, CUES, type Dog } from '../core/dog/dog';
import { describe as describeEstimate, isKnown } from '../core/dog/knowledge';
import { APTITUDE_LABELS, APTITUDES } from '../core/genetics/traits';
import { activeDog, dayName, FUN_DAY, hasFlag, type GameState } from '../game/state';
import {
  ACTIVITY_ENERGY,
  ADOPTION_FEE,
  canAdoptMore,
  KENNEL_RUNS,
  RESTORATIONS,
  SHOP,
} from '../game/rules';
import { ageText, FIRST_TRIAL_DAY, nextTrialDay } from '../game/calendar';
import { QUALIFY, TRIAL_RULES, trialLevel } from '../game/events';
import { FREE_PLAY, RETRIEVE_SETUPS } from '../sim/exercises';
import { LESSONS, type Lesson } from '../sim/training';
import { useApp } from '../app/store';
import {
  go,
  adopt,
  brush,
  buyItem,
  canGoToFunDay,
  closeIntro,
  closeRecap,
  closeResult,
  devAdoptQuick,
  devMoney,
  devSkipDays,
  devSkipToSunday,
  dogWithTitles,
  feedRunDogs,
  fillBowl,
  finishedEvent,
  leaveShelter,
  takeOut,
  goToBed,
  leaveEvent,
  ordinal,
  todaysTrial,
  meetShelterDog,
  nameKennel,
  resetGame,
  restEvening,
  restoreGarden,
  showIntro,
  startFieldWork,
  startJob,
  startLesson,
  travel,
} from '../app/flow';

const close = () => useApp.setState({ panel: null });

export function Panels() {
  const panel = useApp((s) => s.panel);
  const game = useApp((s) => s.game);
  const screen = useApp((s) => s.screen);
  if (!game) return null;
  if (!panel) return screen.kind === 'shelter' ? <ShelterCards game={game} /> : null;
  const dismissable = !['result', 'intro', 'standings', 'season'].includes(panel);
  return (
    <div
      className="overlay"
      onPointerDown={(e) => e.target === e.currentTarget && dismissable && close()}
    >
      {panel === 'office' && <Office game={game} />}
      {panel === 'noticeboard' && <Noticeboard game={game} />}
      {panel === 'van' && <VanPanel game={game} />}
      {panel === 'shop' && <Shop game={game} />}
      {panel === 'gateSign' && <GateSign game={game} />}
      {panel === 'fieldGate' && <FieldGate game={game} />}
      {panel === 'scentGarden' && <ScentGardenPanel game={game} />}
      {panel === 'bed' && <Bed game={game} />}
      {panel === 'result' && <Result />}
      {panel === 'intro' && <Intro />}
      {panel === 'standings' && <Standings game={game} />}
      {panel === 'season' && <SeasonRecapPanel game={game} />}
      {panel === 'kennel' && <KennelPanel game={game} />}
      {panel === 'menu' && <Menu />}
    </div>
  );
}

function Close({ label = 'Close' }: { label?: string }) {
  return (
    <button className="button secondary" onClick={close}>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// The office: Grandpa's ledger
// ---------------------------------------------------------------------------

function Office({ game }: { game: GameState }) {
  const [tab, setTab] = useState<string>(game.activeDogId ?? 'notes');
  const dog = game.dogs.find((d) => d.id === tab) ?? null;
  return (
    <div className="panel card">
      <div className="kicker">The office</div>
      <h2>Grandpa's ledger</h2>
      <div className="tabs">
        {game.dogs.map((d) => (
          <button
            key={d.id}
            className={`tab ${tab === d.id ? 'active' : ''}`}
            onClick={() => setTab(d.id)}
          >
            {d.name}
          </button>
        ))}
        <button
          className={`tab ${tab === 'diary' ? 'active' : ''}`}
          onClick={() => setTab('diary')}
        >
          Diary
        </button>
        <button
          className={`tab ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          Grandpa's notes
        </button>
      </div>
      {dog && <DogCard dog={dog} game={game} />}
      {tab === 'diary' && (
        <ul className="notes">
          {game.diary.length === 0 && <li>Nothing written yet. The pages are waiting.</li>}
          {[...game.diary].reverse().map((d, i) => (
            <li key={i}>
              <b>{dayName(d.day)}:</b> {d.text}
            </li>
          ))}
        </ul>
      )}
      {tab === 'notes' && (
        <ul className="notes">
          <li>
            "Watch the dog before you command it. Ears, tail, nose: they tell you what comes next."
          </li>
          <li>"Feed before you train. A hungry dog listens to its stomach."</li>
          <li>"Mark the moment, not the minute after. Late praise teaches nothing."</li>
          <li>
            "Scent runs downwind like smoke. Put the dog below the wind and let the nose work."
          </li>
          <li>
            "A dog that's bouncing about found something fun. A dog that slows down found something
            real."
          </li>
          <li>"Rest days are training days too."</li>
        </ul>
      )}
      <div className="button-row">
        <Close />
      </div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="meter">
      <div className="fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

function DogCard({ dog, game }: { dog: Dog; game: GameState }) {
  const coat = coatOf(dog);
  const knowledge = game.knowledge[dog.id] ?? {};
  return (
    <div>
      <p className="lead">
        {dogWithTitles(dog)} · {dog.sex}, {ageText(dog.ageMonths)} old · {coat.name} ·{' '}
        {breedDescription(dog)}
      </p>
      <TitleLine dog={dog} />
      <div className="two-col">
        <div>
          <h3>Natural talents</h3>
          <p className="small">
            What you've learned by watching {dog.name} work. Ranges narrow with experience.
          </p>
          <div className="skills">
            {APTITUDES.map((a) => {
              const est = knowledge[a];
              return (
                <div key={a} className="talent-row" title={APTITUDE_LABELS[a].effect}>
                  <span>{APTITUDE_LABELS[a].name}</span>
                  <span className={isKnown(est) ? 'known' : 'unknown'}>
                    {describeEstimate(est)}
                  </span>
                  <div className="range">
                    {est && (
                      <div
                        className="band"
                        style={{ left: `${est.lo}%`, width: `${Math.max(2, est.hi - est.lo)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h3>Trained skills</h3>
          <div className="skills">
            {CUES.map((c) => (
              <div key={c} className="talent-row">
                <span>{CUE_LABELS[c].name}</span>
                <span>{Math.round(dog.skills[c] * 100)}%</span>
                <Bar value={dog.skills[c]} />
              </div>
            ))}
          </div>
          <h3>Bond</h3>
          <Bar value={dog.bond / 100} />
          {hasFlag(game, 'own:brush') && (
            <div className="button-row">
              <button className="button secondary" onClick={brush}>
                Brush {dog.name}
              </button>
            </div>
          )}
        </div>
      </div>
      {coat.notes.length > 0 && <p className="small">{coat.notes.join(' ')}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Noticeboard, van, shop
// ---------------------------------------------------------------------------

function Noticeboard({ game }: { game: GameState }) {
  return (
    <div className="panel card">
      <div className="kicker">The noticeboard</div>
      <h2>Jobs and requests</h2>
      <p className="lead">Each job uses one part of the day. You'll travel there in the van.</p>
      <div className="list">
        {game.jobs.length === 0 && (
          <div className="row">No new notices today. Check again tomorrow.</div>
        )}
        {game.jobs.map((job) => (
          <div key={job.id} className="row">
            <div className="grow">
              <div className="title">{job.title}</div>
              <div className="sub">
                {job.client}: "{job.blurb}"
              </div>
              <div className="sub">
                {job.kind === 'search'
                  ? 'Scent search'
                  : job.kind === 'blind'
                    ? 'A blind retrieve'
                    : 'Marked retrieves'}{' '}
                · {job.place === 'orchard' ? "Mara's orchard" : "Grandpa's field"}
              </div>
            </div>
            <span className="badge good">${job.pay}</span>
            <button
              className="button"
              disabled={game.block === 'night' || !game.dogs.length}
              onClick={() =>
                go(
                  job.place === 'orchard'
                    ? "Driving to Mara's orchard…"
                    : 'Out to the training field…',
                  () => startJob(job),
                )
              }
            >
              Take it
            </button>
          </div>
        ))}
      </div>
      <div className="button-row">
        <Close />
      </div>
    </div>
  );
}

function VanPanel({ game }: { game: GameState }) {
  const hasDog = game.dogs.length > 0;
  const funDay = canGoToFunDay(game);
  return (
    <div className="panel card">
      <div className="kicker">The van</div>
      <h2>Where to?</h2>
      <div className="list">
        {!hasDog && (
          <div className="row">
            <div className="grow">
              <div className="title">Larchwood Rescue</div>
              <div className="sub">Grandpa's wish: start with a dog that needs you.</div>
            </div>
            <button
              className="button"
              onClick={() => go('Driving to Larchwood Rescue…', () => travel('shelter'))}
            >
              Drive there
            </button>
          </div>
        )}
        {hasDog && (
          <div className="row">
            <div className="grow">
              <div className="title">Mara's orchard</div>
              <div className="sub">
                Jobs in the orchard start from the noticeboard by your gate.
              </div>
            </div>
            <button
              className="button secondary"
              onClick={() => useApp.setState({ panel: 'noticeboard' })}
            >
              See jobs
            </button>
          </div>
        )}
        {canAdoptMore(game) && (
          <div className="row">
            <div className="grow">
              <div className="title">Larchwood Rescue</div>
              <div className="sub">
                New arrivals every season. Room in the runs for {KENNEL_RUNS - game.dogs.length}{' '}
                more. Adoption fee ${ADOPTION_FEE}.
              </div>
            </div>
            <button
              className="button secondary"
              onClick={() => go('Driving to Larchwood Rescue…', () => travel('shelter'))}
            >
              Visit
            </button>
          </div>
        )}
        <div className="row">
          <div className="grow">
            <div className="title">Village shop</div>
            <div className="sub">Kibble and kit. A short drive; it doesn't use up the day.</div>
          </div>
          <button className="button" onClick={() => travel('village')}>
            Go shopping
          </button>
        </div>
        {hasDog && (game.funDay || game.day >= FIRST_TRIAL_DAY) && <TrialRow game={game} />}
        {hasDog && !game.funDay && game.day < FIRST_TRIAL_DAY && (
          <div className="row">
            <div className="grow">
              <div className="title">Village green: the Fun Day</div>
              <div className="sub">
                {game.funDay
                  ? 'Done for this year.'
                  : game.day >= FUN_DAY
                    ? 'Today! Three rounds: a mark, a search and a blind.'
                    : `Sunday. ${FUN_DAY - game.day} day${FUN_DAY - game.day > 1 ? 's' : ''} to go.`}
              </div>
            </div>
            <button
              className="button"
              disabled={!funDay}
              onClick={() => go('Driving to the village green…', () => travel('green'))}
            >
              Enter
            </button>
          </div>
        )}
      </div>
      <div className="button-row">
        <Close label="Stay home" />
      </div>
    </div>
  );
}

function Shop({ game }: { game: GameState }) {
  return (
    <div className="panel card">
      <div className="kicker">The village shop</div>
      <h2>Supplies</h2>
      <p className="lead">
        You have <b>${game.money}</b> and <b>{game.food} meals</b> in the pantry.
      </p>
      <div className="list">
        {SHOP.map((item) => {
          const owned = item.once && hasFlag(game, `own:${item.id}`);
          return (
            <div key={item.id} className="row">
              <div className="grow">
                <div className="title">{item.name}</div>
                <div className="sub">{item.description}</div>
              </div>
              <span className="badge">${item.cost}</span>
              <button
                className="button"
                disabled={owned || game.money < item.cost}
                onClick={() => buyItem(item.id)}
              >
                {owned ? 'Owned' : 'Buy'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="button-row">
        <Close label="Drive home" />
      </div>
    </div>
  );
}

function GateSign({ game }: { game: GameState }) {
  const [name, setName] = useState(game.kennelName);
  return (
    <div className="panel card narrow">
      <div className="kicker">The gate sign</div>
      <h2>{game.kennelName ? `${game.kennelName} Kennels` : 'Name your kennel'}</h2>
      <p className="lead">
        {game.kennelName
          ? "Your name, on Grandpa's gate. You can repaint it if you like."
          : "Grandpa's old name has worn away. What will your kennel be called?"}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          nameKennel(name);
        }}
      >
        <div className="name-input">
          <input
            autoFocus
            maxLength={28}
            value={name}
            placeholder="e.g. Oak Hollow"
            onChange={(e) => setName(e.target.value)}
          />
          <span>Kennels</span>
        </div>
        <div className="button-row">
          <button className="button" type="submit" disabled={name.trim().length < 2}>
            Paint the sign
          </button>
          <Close label="Later" />
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The training field gate
// ---------------------------------------------------------------------------

function FieldGate({ game }: { game: GameState }) {
  const dog = activeDog(game)!;
  const [tab, setTab] = useState<'lessons' | 'field'>(
    game.story === 'firstLesson' ? 'lessons' : game.story === 'firstMark' ? 'field' : 'lessons',
  );
  const best = (title: string) =>
    game.results.filter((r) => r.title === title).reduce((b, r) => Math.max(b, r.score), -1);
  const night = game.block === 'night';
  const lessons = (Object.keys(LESSONS) as Lesson[]).filter(
    (l) => l !== 'indicate' || hasFlag(game, 'restored:scentGarden'),
  );
  return (
    <div className="panel card">
      <div className="kicker">Grandpa's training field · {game.block}</div>
      <h2>What shall we work on?</h2>
      <p className="lead">
        Each choice uses one part of the day and some of {dog.name}'s energy (
        {Math.round(dog.energy)}% left).
        {night && " It's dark now: only free play until tomorrow."}
      </p>
      <div className="tabs">
        <button
          className={`tab ${tab === 'lessons' ? 'active' : ''}`}
          onClick={() => setTab('lessons')}
        >
          Lessons
        </button>
        <button
          className={`tab ${tab === 'field' ? 'active' : ''}`}
          onClick={() => setTab('field')}
        >
          Field work
        </button>
      </div>
      {tab === 'lessons' && (
        <div className="list">
          {lessons.map((l) => (
            <div
              key={l}
              className={`row ${game.story === 'firstLesson' && l === 'sit' ? 'active' : ''}`}
            >
              <div className="grow">
                <div className="title">{LESSONS[l].title}</div>
                <div className="sub">{LESSONS[l].summary}</div>
                <Bar value={dog.skills[l]} />
              </div>
              <span className="badge">-{ACTIVITY_ENERGY.lesson} energy</span>
              <button
                className="button"
                disabled={night}
                onClick={() => go('Setting up the lesson…', () => startLesson(l))}
              >
                Train
              </button>
            </div>
          ))}
          {!hasFlag(game, 'restored:scentGarden') && (
            <div className="row muted">
              <div className="grow">
                <div className="title">Search and indicate (locked)</div>
                <div className="sub">Restore Grandpa's scent garden to unlock this lesson.</div>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'field' && (
        <div className="list">
          {[FREE_PLAY, ...RETRIEVE_SETUPS].map((s) => {
            const b = best(s.title);
            const highlight = game.story === 'firstMark' && s.id === 'first-mark';
            return (
              <div key={s.id} className={`row ${highlight ? 'active' : ''}`}>
                <div className="grow">
                  <div className="title">{s.title}</div>
                  <div className="sub">{s.summary}</div>
                </div>
                {b >= 0 && <span className="badge good">Best {b}</span>}
                {!s.free && <span className="badge">-{ACTIVITY_ENERGY.mark} energy</span>}
                <button
                  className="button"
                  disabled={night && !s.free}
                  onClick={() => go('Out to the training field…', () => startFieldWork(s))}
                >
                  {s.free ? 'Play' : 'Go'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="button-row">
        <button
          className="link"
          onClick={() => showIntro(tab === 'lessons' ? 'lesson' : 'mark', true)}
        >
          How does this work?
        </button>
        <Close />
      </div>
    </div>
  );
}

function ScentGardenPanel({ game }: { game: GameState }) {
  const r = RESTORATIONS[0]!;
  const done = hasFlag(game, `restored:${r.id}`);
  return (
    <div className="panel card narrow">
      <div className="kicker">Restoration</div>
      <h2>{r.name}</h2>
      <p className="lead">
        {done
          ? 'Cleared, the boxes set out again. It looks like it did in the old photographs.'
          : r.description}
      </p>
      <p>
        <b>Unlocks:</b> {r.unlocks}
      </p>
      <div className="button-row">
        {!done && (
          <button className="button" disabled={game.money < r.cost} onClick={restoreGarden}>
            Restore for ${r.cost}
          </button>
        )}
        {done && game.dogs.length > 0 && (
          <button
            className="button"
            onClick={() => go('Setting up the scent boxes…', () => startLesson('indicate'))}
          >
            Train Search and indicate
          </button>
        )}
        <Close />
      </div>
      {!done && game.money < r.cost && (
        <p className="small">You have ${game.money}. Noticeboard jobs pay.</p>
      )}
    </div>
  );
}

function Bed({ game }: { game: GameState }) {
  const dog = activeDog(game);
  return (
    <div className="panel card narrow">
      <div className="kicker">The farmhouse</div>
      <h2>{game.block === 'night' ? 'Time for bed' : `It's ${game.block}`}</h2>
      {dog && (
        <ul className="notes">
          <li className={dog.fullness < 30 && !game.bowlFilled ? 'warn' : ''}>
            {game.bowlFilled
              ? `${dog.name}'s bowl is filled for the night.`
              : dog.fullness < 50
                ? `${dog.name} is hungry. Fill the bowl at the runs before bed.`
                : `${dog.name} is well fed.`}
          </li>
          <li>
            {game.food <= 2
              ? `Only ${game.food} meals left: buy kibble soon.`
              : `${game.food} meals in the pantry.`}
          </li>
          <li>
            {dog.energy < 40
              ? `${dog.name} is tired and needs a good night.`
              : `${dog.name} has energy to spare.`}
          </li>
        </ul>
      )}
      <div className="button-row">
        <button className="button" onClick={() => go('Goodnight…', goToBed)}>
          Go to bed
        </button>
        {dog && game.block === 'evening' && (
          <button className="button secondary" onClick={restEvening}>
            Rest together a while
          </button>
        )}
        <Close label="Not yet" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results, intro cards, the Fun Day table, the menu
// ---------------------------------------------------------------------------

function Result() {
  const r = useApp((s) => s.result);
  if (!r) return null;
  return (
    <div className="panel card">
      <h2>{r.title}</h2>
      <div className="grade">
        <span className="big">{r.grade}</span>
        {!r.skill && <span className="badge">{r.score} points</span>}
        {r.seconds > 0 && !r.skill && <span className="badge">{Math.round(r.seconds)} s</span>}
        {r.pay > 0 && <span className="badge good">+${r.pay}</span>}
      </div>
      {r.skill && (
        <div className="skill-change">
          <span>{r.skill.name}</span>
          <div className="meter">
            <div className="fill" style={{ width: `${r.skill.after * 100}%` }} />
            <div className="before" style={{ left: `${r.skill.before * 100}%` }} />
          </div>
          <span>
            {Math.round(r.skill.before * 100)}% → {Math.round(r.skill.after * 100)}%
          </span>
        </div>
      )}
      <ul className="notes">
        {r.notes.map((n) => (
          <li key={n.text} className={n.tone}>
            {n.text}
          </li>
        ))}
        {r.discoveries.map((d) => (
          <li key={d.text} className="discovery">
            ★ {d.text}
          </li>
        ))}
      </ul>
      {r.suggestion && <p style={{ marginTop: 12, fontWeight: 700 }}>{r.suggestion}</p>}
      <div className="button-row">
        <button
          className="button"
          onClick={() => go(r.next === 'home' ? 'Heading home…' : 'Next…', closeResult)}
        >
          {r.next === 'eventNext'
            ? 'Next round'
            : r.next === 'eventDone'
              ? 'Final standings'
              : 'Back home'}
        </button>
      </div>
    </div>
  );
}

function Intro() {
  const intro = useApp((s) => s.intro);
  if (!intro) return null;
  return (
    <div className="panel card narrow">
      <div className="kicker">How to play</div>
      <h2>{intro.title}</h2>
      <ul className="steps">
        {intro.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="button-row">
        <button className="button" onClick={closeIntro}>
          Got it
        </button>
      </div>
    </div>
  );
}

function Standings({ game }: { game: GameState }) {
  const done = finishedEvent();
  if (!done) return null;
  const { def, outcome } = done;
  const { record, title } = outcome;
  const dog = game.dogs.find((d) => d.id === record.dogId);
  const winner = record.entries[0]!;
  return (
    <div className="panel card">
      <div className="kicker">{def.name} · final standings</div>
      <h2>{winner.player ? 'You won!' : `${winner.kennel} wins`}</h2>
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Kennel</th>
            {def.rounds.map((r) => (
              <th key={r.title}>{r.short}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {record.entries.map((e, i) => (
            <tr key={e.kennel} className={e.player ? 'you' : ''}>
              <td>{i + 1}</td>
              <td>
                {e.kennel}
                <div className="sub">{e.dog}</div>
              </td>
              {e.rounds.map((s, j) => (
                <td key={j}>{s}</td>
              ))}
              <td>
                <b>{e.total}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="notes">
        <li className={record.placing <= 3 ? 'good' : 'info'}>
          You placed {ordinal(record.placing)} of {record.entries.length}
          {record.prize > 0 ? `: $${record.prize} prize money.` : '.'}
        </li>
        {def.kind === 'trial' && (
          <li className={record.qualified ? 'good' : 'warn'}>
            {record.qualified
              ? 'A qualifying run.'
              : `No qualifying run (needs ${QUALIFY.minRound}+ in every round and ${QUALIFY.minTotal}+ in total).`}
          </li>
        )}
        {title && dog && (
          <li className="discovery">
            ★ {dog.name} earned the {TRIAL_RULES[title].name} title: {dogWithTitles(dog)}.
          </li>
        )}
      </ul>
      <div className="button-row">
        <button className="button" onClick={() => go('Driving home…', leaveEvent)}>
          Head home
        </button>
      </div>
    </div>
  );
}

function SeasonRecapPanel({ game }: { game: GameState }) {
  const r = game.recap;
  if (!r) return null;
  return (
    <div className="panel card">
      <div className="kicker">The season turns</div>
      <h2>
        {r.season} is over. {r.next} begins.
      </h2>
      <ul className="notes">
        <li>
          {r.activities} lessons, jobs and practices.{' '}
          {r.jobs > 0 ? `${r.jobs} job${r.jobs > 1 ? 's' : ''} done. ` : ''}
          Money {r.moneyChange >= 0 ? `up $${r.moneyChange}` : `down $${-r.moneyChange}`}.
        </li>
        {r.trials.map((t, i) => (
          <li key={i} className={t.qualified ? 'good' : 'info'}>
            {t.name}: {ordinal(t.placing)} of {t.entries}
            {t.qualified ? ', a qualifying run' : ''}.
          </li>
        ))}
        {r.best.map((b) => (
          <li key={b.title}>
            Best {b.title}: {b.score} points
          </li>
        ))}
        {r.skillGains.map((g) => (
          <li key={`${g.dog}-${g.cue}`} className="good">
            {g.dog}: {CUE_LABELS[g.cue].name} {Math.round(g.before * 100)}% →{' '}
            {Math.round(g.after * 100)}%
          </li>
        ))}
        {r.ages.map((a) => (
          <li key={a.dog} className="discovery">
            {a.dog} is now {ageText(a.months)} old.
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button className="button" onClick={closeRecap}>
          On to {r.next}
        </button>
      </div>
    </div>
  );
}

/** The van's Larkspur row: today's trial, or when the next one is. */
function TrialRow({ game }: { game: GameState }) {
  const dog = activeDog(game);
  if (!dog) return null;
  const today = todaysTrial(game);
  const level = trialLevel(dog);
  const rules = TRIAL_RULES[level];
  const ranToday = game.trials.some((t) => t.day === game.day);
  const days = nextTrialDay(game.day) - game.day;
  const night = game.block === 'night';
  return (
    <div className="row">
      <div className="grow">
        <div className="title">Larkspur trial ground</div>
        <div className="sub">
          {ranToday
            ? 'You ran today. The next trial is next Sunday.'
            : today
              ? `Today: the ${today.name}. ${rules.blurb} Entry $${today.entryFee}; prizes $${today.prizes.join(', $')}.`
              : `${rules.name} trial on Sunday (${days === 1 ? 'tomorrow' : `in ${days} days`}). ${rules.blurb}`}
        </div>
      </div>
      <button
        className="button"
        disabled={!today || night || game.money < (today?.entryFee ?? 0)}
        onClick={() => go('Driving to Larkspur…', () => travel('trial'))}
      >
        {today && game.money < today.entryFee ? `Need $${today.entryFee}` : 'Enter'}
      </button>
    </div>
  );
}

/** Titles and qualifying runs, under the dog's name in the ledger. */
function TitleLine({ dog }: { dog: Dog }) {
  const level = trialLevel(dog);
  const qs = dog.qualifiers[level] ?? 0;
  return (
    <p className="small">
      {dog.titles.length
        ? `Titles: ${dog.titles.map((t) => TRIAL_RULES[t].name).join(', ')}. `
        : 'No trial titles yet. '}
      {!dog.titles.includes(level) &&
        `${TRIAL_RULES[level].name} title: ${qs} of ${QUALIFY.toTitle} qualifying runs.`}
    </p>
  );
}

function Menu() {
  const game = useApp((s) => s.game);
  return (
    <div className="panel card narrow">
      <h2>Menu</h2>
      <div className="list">
        <button className="button" onClick={close}>
          Resume
        </button>
        <button
          className="button secondary"
          onClick={() => {
            close();
            useApp.setState({ screen: { kind: 'title' } });
          }}
        >
          Back to the title screen (progress is saved)
        </button>
      </div>
      <div className="dev">
        <b>Tester tools</b> (for checking the game; not part of normal play)
        <div className="button-row">
          <button className="button secondary small" onClick={() => devMoney()}>
            +$200 and food
          </button>
          <button className="button secondary small" onClick={() => devSkipDays(1)}>
            Skip a day
          </button>
          <button className="button secondary small" onClick={() => devSkipToSunday()}>
            Skip to Sunday
          </button>
          {game && game.dogs.length === 0 && (
            <button className="button secondary small" onClick={devAdoptQuick}>
              Adopt the first dog now
            </button>
          )}
          <button
            className="button secondary small"
            onClick={() => {
              if (confirm('Delete this save and start again?')) void resetGame();
            }}
          >
            Delete save
          </button>
        </div>
        {game && activeDog(game) && <TesterAptitudes dog={activeDog(game)!} />}
      </div>
    </div>
  );
}

function TesterAptitudes({ dog }: { dog: Dog }) {
  return (
    <details>
      <summary>Hidden aptitudes (tester view)</summary>
      <div className="small">
        {APTITUDES.map((a) => `${APTITUDE_LABELS[a].name} ${aptitude(dog, a)}`).join(' · ')}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// The shelter
// ---------------------------------------------------------------------------

function ShelterCards({ game }: { game: GameState }) {
  const pick = useApp((s) => s.shelterPick);
  const [choosing, setChoosing] = useState<number | null>(null);
  const [name, setName] = useState('');
  return (
    <div className="shelter-cards">
      {game.shelter.map((dog, i) => {
        const coat = coatOf(dog);
        const k = game.knowledge[dog.id] ?? {};
        const met = hasFlag(game, `met:${dog.id}`);
        return (
          <div key={dog.id} className={`shelter-card card ${i === pick ? 'active' : ''}`}>
            <div className="title">{dog.name}</div>
            <div className="sub">
              {dog.sex}, {ageText(dog.ageMonths)} · {coat.name}
            </div>
            <div className="sub">{breedDescription(dog)}</div>
            {met && (
              <div className="sub">
                Speed: {describeEstimate(k.speed).toLowerCase()} · Listens:{' '}
                {describeEstimate(k.biddability).toLowerCase()}
              </div>
            )}
            {choosing === i ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  go(`Driving home with ${name || dog.name}…`, () => adopt(i, name || dog.name));
                }}
              >
                <input
                  autoFocus
                  maxLength={16}
                  placeholder={dog.name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="button-row">
                  <button
                    className="button small"
                    type="submit"
                    disabled={game.dogs.length > 0 && game.money < ADOPTION_FEE}
                  >
                    Take {name || dog.name} home
                    {game.dogs.length > 0 ? ` ($${ADOPTION_FEE})` : ''}
                  </button>
                  <button className="link" type="button" onClick={() => setChoosing(null)}>
                    Back
                  </button>
                </div>
              </form>
            ) : (
              <div className="button-row">
                {i !== pick && (
                  <button
                    className="button secondary small"
                    onClick={() => go(`Meeting ${dog.name}…`, () => meetShelterDog(i))}
                  >
                    Play
                  </button>
                )}
                <button
                  className="button small"
                  onClick={() => {
                    setChoosing(i);
                    setName(dog.name);
                  }}
                >
                  Choose
                </button>
              </div>
            )}
          </div>
        );
      })}
      {game.dogs.length > 0 && (
        <div className="shelter-card card leave">
          <div className="title">Not today</div>
          <div className="sub">You have ${game.money}. New dogs arrive every season.</div>
          <div className="button-row">
            <button
              className="button secondary small"
              onClick={() => go('Driving home…', leaveShelter)}
            >
              Drive home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The kennel runs: who comes out, and feeding the others
// ---------------------------------------------------------------------------

function KennelPanel({ game }: { game: GameState }) {
  const inRuns = game.dogs.filter((d) => d.id !== game.activeDogId);
  const hungry = inRuns.filter((d) => d.fullness < 70).length;
  return (
    <div className="panel card">
      <div className="kicker">The kennel runs</div>
      <h2>Your dogs</h2>
      <p className="lead">
        One dog comes out with you; the others wait in their runs. {game.food} meals in the pantry.
      </p>
      <div className="list">
        {game.dogs.map((d) => {
          const out = d.id === game.activeDogId;
          return (
            <div key={d.id} className={`row ${out ? 'active' : ''}`}>
              <div className="grow">
                <div className="title">{dogWithTitles(d)}</div>
                <div className="sub">
                  {ageText(d.ageMonths)} · {coatOf(d).name}
                </div>
                <div className="needs-row">
                  <span>Energy</span>
                  <Bar value={d.energy / 100} />
                  <span>Fed</span>
                  <Bar value={d.fullness / 100} />
                </div>
              </div>
              {out ? (
                <span className="badge good">With you</span>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => go(`Fetching ${d.name}…`, () => takeOut(d.id))}
                >
                  Take out
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="button-row">
        {inRuns.length > 0 && (
          <button className="button" disabled={hungry === 0} onClick={feedRunDogs}>
            {hungry
              ? `Feed the dogs in the runs (${hungry} meal${hungry > 1 ? 's' : ''})`
              : 'Runs are fed'}
          </button>
        )}
        <button className="button secondary" disabled={game.bowlFilled} onClick={fillBowl}>
          {game.bowlFilled ? 'Bowl is full' : `Fill ${activeDog(game)?.name ?? 'the'}'s bowl`}
        </button>
        <Close />
      </div>
    </div>
  );
}
