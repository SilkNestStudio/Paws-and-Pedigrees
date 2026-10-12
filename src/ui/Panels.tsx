import { useState } from 'react';
import {
  aptitude,
  breedDescription,
  coatOf,
  CUE_LABELS,
  CUES,
  qualifiersIn,
  SPORTS,
  titlesIn,
  type Dog,
  type ExtraSport,
} from '../core/dog/dog';
import { describe as describeEstimate, isKnown } from '../core/dog/knowledge';
import { APTITUDE_LABELS, APTITUDES } from '../core/genetics/traits';
import { activeDog, dayName, FUN_DAY, hasFlag, type GameState } from '../game/state';
import { ACTIVITY_ENERGY, ADOPTION_FEE, canAdoptMore, RESTORATIONS, SHOP } from '../game/rules';
import { ageText, FIRST_TRIAL_DAY, nextShowDay, nextTrialDay } from '../game/calendar';
import {
  adviceFor,
  QUALIFY,
  qualifyTotal,
  SHOW_RULES,
  SPORT_INFO,
  TRIAL_RULES,
  trialLevel,
} from '../game/events';
import { PRACTICE_COURSES } from '../sim/courses';
import { RETIREMENT, retireProblem, runsFree } from '../game/kennel';
import { isMarketDay } from '../game/services';
import { legacyReady } from '../game/ledger';
import { isCupDay } from '../game/calendar';
import {
  CupPickPanel,
  CupRow,
  FiresideNote,
  AlbumPanel,
  HelpPanel,
  MarketPanel,
  TornPages,
  VetPanel,
} from './Village';
import { PRACTICE_PASTURES } from '../sim/pastures';
import { kennelType, REPUTATION_LEVELS, reputationName } from '../game/reputation';

/** Index of the lowest-scoring round. */
const worstRound = (rounds: number[]) => rounds.indexOf(Math.min(...rounds));
import { BEACH_SETUPS, FREE_PLAY, RETRIEVE_SETUPS, WATER_SETUPS } from '../sim/exercises';
import { SEASON_EFFECTS, seasonOf } from '../game/calendar';
import { LESSONS, type Lesson } from '../sim/training';
import { useApp } from '../app/store';
import { BreedingPanel, PedigreeBlock, WhelpingRoomPanel } from './Breeding';
import {
  go,
  adopt,
  devAgeYear,
  devPastFirstWeek,
  devSkipToCup,
  devSkipToSaturday,
  devTrainUp,
  retire,
  showSamThePages,
  AGILITY_RUNS,
  entryProblem,
  startAgility,
  startHerding,
  stopPractice,
  todaysShow,
  brush,
  buyItem,
  canGoToFunDay,
  closeIntro,
  closeRecap,
  closeResult,
  devAdoptQuick,
  devMoney,
  devSkipDays,
  devSkipToLitter,
  devSkipToPuppiesReady,
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
  restoreThing,
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
  const dismissable = !['result', 'intro', 'standings', 'season', 'cupPick'].includes(panel);
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
      {panel === 'breeding' && <BreedingPanel game={game} />}
      {panel === 'whelping' && <WhelpingRoomPanel game={game} />}
      {panel === 'fellTop' && <FellTopPanel game={game} />}
      {panel === 'cupPick' && <CupPickPanel game={game} />}
      {panel === 'beach' && <BeachPanel game={game} />}
      {panel === 'vet' && <VetPanel game={game} />}
      {panel === 'market' && <MarketPanel game={game} />}
      {panel === 'help' && <HelpPanel />}
      {panel === 'album' && <AlbumPanel game={game} />}
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
          className={`tab ${tab === 'kennel' ? 'active' : ''}`}
          onClick={() => setTab('kennel')}
        >
          Kennel
        </button>
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
        <button
          className={`tab ${tab === 'pages' ? 'active' : ''}`}
          onClick={() => setTab('pages')}
        >
          Torn pages ({game.ledger.length})
        </button>
      </div>
      {dog && <DogCard dog={dog} game={game} />}
      {tab === 'kennel' && <KennelStanding game={game} />}
      {tab === 'pages' && <TornPages game={game} />}
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

/** The kennel's name in the world: reputation, type, letters and stud bookings. */
function KennelStanding({ game }: { game: GameState }) {
  const type = kennelType(game);
  const bred = game.litters.reduce(
    (n, l) => n + l.puppies.length + l.kept.length + l.placed.length,
    0,
  );
  const next = REPUTATION_LEVELS.find((l) => l.from > game.reputation);
  return (
    <div>
      <h3>{game.kennelName ? `${game.kennelName} Kennels` : 'Your kennel'}</h3>
      <p className="lead">
        Reputation: <b>{reputationName(game.reputation)}</b> ({Math.round(game.reputation)} of 100)
      </p>
      <Bar value={game.reputation / 100} />
      <p className="small">
        Qualifying runs, titles and trial wins build it, and so does good news from the homes your
        puppies went to. It raises what families pay for a puppy and how often your stud dogs are
        booked.{next ? ` Next: "${next.name}" at ${next.from}.` : ''}
      </p>
      <p>
        {bred} {bred === 1 ? 'puppy' : 'puppies'} bred here.{' '}
        {type ?? 'Breed a few litters and people will start to say what your dogs are like.'}
      </p>
      {game.studBookings.length > 0 && (
        <>
          <h3>Stud bookings</h3>
          <ul className="notes">
            {[...game.studBookings]
              .reverse()
              .slice(0, 6)
              .map((b) => (
                <li key={b.id}>
                  {b.kennel} used {b.studName} (${b.fee}): a litter of {b.puppies}.
                </li>
              ))}
          </ul>
        </>
      )}
      <h3>Letters</h3>
      <ul className="notes">
        {game.letters.length === 0 && (
          <li>No letters yet. Families write a season or so after a puppy goes home.</li>
        )}
        {[...game.letters]
          .reverse()
          .slice(0, 8)
          .map((l, i) => (
            <li key={i} className={l.reputation >= 5 ? 'good' : ''}>
              <b>{l.from}:</b> "{l.text}"
            </li>
          ))}
      </ul>
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
      {dog.retired ? (
        <p className="small">
          Retired to the farmhouse. {dog.name} no longer works or needs a run, and the youngsters
          learn faster for having {dog.sex === 'female' ? 'her' : 'him'} about.
        </p>
      ) : (
        dog.ageMonths >= RETIREMENT.mayRetireMonths && (
          <div className="button-row">
            <button
              className="button secondary small"
              disabled={!!retireProblem(game, dog)}
              onClick={() => retire(dog.id)}
            >
              Retire {dog.name} to the farmhouse
            </button>
            <span className="small">
              {retireProblem(game, dog) ??
                (dog.ageMonths >= RETIREMENT.slowsMonths
                  ? `${dog.name} is slowing down with age. Retiring frees a run and helps the youngsters learn.`
                  : 'Retiring frees a run and helps the youngsters learn. It cannot be undone.')}
            </span>
          </div>
        )
      )}
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
      <PedigreeBlock game={game} dog={dog} />
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
  const later = hasDog && !!game.funDay;
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
        {hasDog && !game.funDay && game.day < FIRST_TRIAL_DAY && (
          <div className="row">
            <div className="grow">
              <div className="title">Village green: the Fun Day</div>
              <div className="sub">
                {game.day >= FUN_DAY
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
      {hasDog && (game.funDay || game.day >= FIRST_TRIAL_DAY) && (
        <>
          <h3>Competitions</h3>
          <div className="list">
            {later && (isCupDay(game.day) || game.day > 14) && <CupRow game={game} />}
            {!isCupDay(game.day) && <TrialRow game={game} />}
            {later && <ShowRow game={game} sport="agility" />}
            {later && <ShowRow game={game} sport="herding" />}
          </div>
        </>
      )}
      {hasDog && (
        <>
          <h3>Work away from home</h3>
          <div className="list">
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
            {later && (
              <div className="row">
                <div className="grow">
                  <div className="title">Fell Top Farm: work Sam's sheep</div>
                  <div className="sub">
                    Sam Pennock lets you practise on his sheep any day. Herding is a sport of its
                    own, worked by command from a post.
                  </div>
                </div>
                <button
                  className="button secondary"
                  onClick={() => useApp.setState({ panel: 'fellTop' })}
                >
                  See the work
                </button>
              </div>
            )}
            {later && (
              <div className="row">
                <div className="grow">
                  <div className="title">Sandy Cove</div>
                  <div className="sub">
                    The beach: water marks in the sea, or just a run on the sand together.
                  </div>
                </div>
                <button
                  className="button secondary"
                  onClick={() => useApp.setState({ panel: 'beach' })}
                >
                  See the beach
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <h3>The village</h3>
      <div className="list">
        <div className="row">
          <div className="grow">
            <div className="title">Village shop</div>
            <div className="sub">Kibble and kit. A short drive; it doesn't use up the day.</div>
          </div>
          <button className="button" onClick={() => travel('village')}>
            Go shopping
          </button>
        </div>
        {later && (
          <>
            <div className="row">
              <div className="grow">
                <div className="title">The vet</div>
                <div className="sub">
                  Check-ups, DNA tests, and scans for a dam in whelp. Doesn't use up the day.
                </div>
              </div>
              <button
                className="button secondary"
                onClick={() => useApp.setState({ panel: 'vet' })}
              >
                See the vet
              </button>
            </div>
            <div className={`row ${isMarketDay(game.day) ? 'active' : ''}`}>
              <div className="grow">
                <div className="title">Breeders' market</div>
                <div className="sub">
                  {isMarketDay(game.day)
                    ? 'On today: three youngsters by proven studs, and kibble by the sack.'
                    : 'The first two days of each season: youngsters by proven studs.'}
                </div>
              </div>
              <button
                className="button secondary"
                onClick={() => useApp.setState({ panel: 'market' })}
              >
                {isMarketDay(game.day) ? 'Go' : 'When?'}
              </button>
            </div>
          </>
        )}
        {canAdoptMore(game) && (
          <div className="row">
            <div className="grow">
              <div className="title">Larchwood Rescue</div>
              <div className="sub">
                New arrivals every season. Room in the runs for {runsFree(game)} more. Adoption fee
                ${ADOPTION_FEE}.
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
  const [tab, setTab] = useState<'lessons' | 'field' | 'agility'>(
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
        <button
          className={`tab ${tab === 'agility' ? 'active' : ''}`}
          onClick={() => setTab('agility')}
        >
          Agility
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
          {[
            FREE_PLAY,
            ...RETRIEVE_SETUPS,
            ...(hasFlag(game, 'restored:duckPond') ? WATER_SETUPS : []),
          ].map((s) => {
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
          {!hasFlag(game, 'restored:duckPond') && (
            <RestoreRow game={game} id="duckPond" title="Water work (locked)" />
          )}
        </div>
      )}
      {tab === 'agility' && (
        <div className="list">
          {hasFlag(game, 'restored:agilityRing') ? (
            <>
              <div className="row">
                <div className="grow">
                  <div className="title">{dog.name}'s obstacle skill</div>
                  <div className="sub">
                    Built by clean obstacles in practice. Each session is {AGILITY_RUNS} runs of the
                    course you choose.
                  </div>
                  <Bar value={dog.skills.agility} />
                </div>
                <span className="badge">{Math.round(dog.skills.agility * 100)}%</span>
              </div>
              {PRACTICE_COURSES.map((c) => {
                const b = best(c.title);
                const outgrown = dog.skills.agility >= (c.teachesTo ?? 1);
                return (
                  <div key={c.id} className="row">
                    <div className="grow">
                      <div className="title">{c.title}</div>
                      <div className="sub">
                        {c.summary}
                        {outgrown
                          ? ` ${dog.name} has learned all this course can teach: try a harder one.`
                          : ''}
                      </div>
                    </div>
                    {b >= 0 && <span className="badge good">Best {b}</span>}
                    <span className="badge">-{ACTIVITY_ENERGY.agility} energy</span>
                    <button
                      className="button"
                      disabled={night}
                      onClick={() => go('Out to the agility ring…', () => startAgility(c))}
                    >
                      Run it
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <RestoreRow game={game} id="agilityRing" title="Agility practice (locked)" />
          )}
        </div>
      )}
      <div className="button-row">
        <button
          className="link"
          onClick={() =>
            showIntro(tab === 'lessons' ? 'lesson' : tab === 'agility' ? 'agility' : 'mark', true)
          }
        >
          How does this work?
        </button>
        <Close />
      </div>
    </div>
  );
}

/** Sandy Cove: the sea for water work, and the sand for play. */
function BeachPanel({ game }: { game: GameState }) {
  const dog = activeDog(game);
  if (!dog) return null;
  const best = (title: string) =>
    game.results.filter((r) => r.title === title).reduce((b, r) => Math.max(b, r.score), -1);
  const night = game.block === 'night';
  return (
    <div className="panel card">
      <div className="kicker">Sandy Cove · {game.block}</div>
      <h2>A day at the beach</h2>
      <p className="lead">
        Water work without a pond of your own. A first visit each day lifts {dog.name}'s bond a
        little, whatever you do there.
      </p>
      <div className="list">
        <div className="row">
          <div className="grow">
            <div className="title">A run on the sand</div>
            <div className="sub">Throw the ball, paddle, enjoy your dog. Uses no time.</div>
          </div>
          <button
            className="button"
            onClick={() =>
              go('Driving to Sandy Cove…', () =>
                startFieldWork(
                  { ...FREE_PLAY, id: 'beach-free', title: 'A run on the sand' },
                  { place: 'beach' },
                ),
              )
            }
          >
            Play
          </button>
        </div>
        {BEACH_SETUPS.map((s) => {
          const b = best(s.title);
          return (
            <div key={s.id} className="row">
              <div className="grow">
                <div className="title">{s.title}</div>
                <div className="sub">{s.summary}</div>
              </div>
              {b >= 0 && <span className="badge good">Best {b}</span>}
              <span className="badge">-{ACTIVITY_ENERGY.mark} energy</span>
              <button
                className="button"
                disabled={night}
                onClick={() =>
                  go('Driving to Sandy Cove…', () => startFieldWork(s, { place: 'beach' }))
                }
              >
                Go
              </button>
            </div>
          );
        })}
      </div>
      <div className="button-row">
        <button className="link" onClick={() => showIntro('water', true)}>
          How does water work?
        </button>
        <Close label="Stay home" />
      </div>
    </div>
  );
}

/** Fell Top Farm: practice on Sam Pennock's sheep. */
function FellTopPanel({ game }: { game: GameState }) {
  const dog = activeDog(game);
  if (!dog) return null;
  const best = (title: string) =>
    game.results.filter((r) => r.title === title).reduce((b, r) => Math.max(b, r.score), -1);
  const night = game.block === 'night';
  return (
    <div className="panel card">
      <div className="kicker">Fell Top Farm · {game.block}</div>
      <h2>Work Sam's sheep</h2>
      <p className="lead">
        Each run uses one part of the day and some of {dog.name}'s energy ({Math.round(dog.energy)}%
        left). Any dog can learn, but dogs with focus and a wish to please take to it fastest.
      </p>
      <div className="list">
        {legacyReady(game) && (
          <div className="row active">
            <div className="grow">
              <div className="title">Show Sam the torn pages</div>
              <div className="sub">
                Grandpa wrote that the bitch with the white toe went to Ned Pennock at Fell Top. Sam
                is Ned's grandson.
                {runsFree(game) <= 0 ? ' (You will need a free run.)' : ''}
              </div>
            </div>
            <button
              className="button"
              onClick={() => go('Driving up to Fell Top…', showSamThePages)}
            >
              Show him
            </button>
          </div>
        )}
        <div className="row">
          <div className="grow">
            <div className="title">{dog.name}'s herding skill</div>
            <div className="sub">
              Built by every run on sheep. A trained dog stops the first time, knows left from
              right, and keeps wide of its sheep.
            </div>
            <Bar value={dog.skills.herd} />
          </div>
          <span className="badge">{Math.round(dog.skills.herd * 100)}%</span>
        </div>
        {PRACTICE_PASTURES.map((p) => {
          const b = best(p.title);
          const outgrown = dog.skills.herd >= (p.teachesTo ?? 1);
          return (
            <div key={p.id} className="row">
              <div className="grow">
                <div className="title">{p.title}</div>
                <div className="sub">
                  {p.summary}
                  {outgrown ? ` ${dog.name} has learned all this can teach: try a harder one.` : ''}
                </div>
              </div>
              {b >= 0 && <span className="badge good">Best {b}</span>}
              <span className="badge">-{ACTIVITY_ENERGY.herding} energy</span>
              <button
                className="button"
                disabled={night}
                onClick={() => go('Driving up to Fell Top…', () => startHerding(p))}
              >
                Go
              </button>
            </div>
          );
        })}
      </div>
      <div className="button-row">
        <button className="link" onClick={() => showIntro('herding', true)}>
          How does this work?
        </button>
        <Close label="Stay home" />
      </div>
    </div>
  );
}

/** Something of Grandpa's in the field, waiting to be restored. */
function RestoreRow({ game, id, title }: { game: GameState; id: string; title: string }) {
  const r = RESTORATIONS.find((x) => x.id === id)!;
  return (
    <div className="row muted">
      <div className="grow">
        <div className="title">{title}</div>
        <div className="sub">
          {r.description} <b>Unlocks:</b> {r.unlocks}
        </div>
      </div>
      <button
        className="button secondary"
        disabled={game.money < r.cost}
        onClick={() => restoreThing(id)}
      >
        Restore for ${r.cost}
      </button>
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
      <div className="button-row">
        <button className="button secondary" onClick={() => useApp.setState({ panel: 'office' })}>
          Grandpa's office (the ledger)
        </button>
        <button className="button secondary" onClick={() => useApp.setState({ panel: 'album' })}>
          Trophy shelf and album
        </button>
      </div>
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
      <FiresideNote game={game} />
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
        {(!r.skill || r.withScore) && !r.plain && <span className="badge">{r.score} points</span>}
        {r.seconds > 0 && (!r.skill || r.withScore) && (
          <span className="badge">{Math.round(r.seconds)} s</span>
        )}
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
              : r.next === 'again'
                ? `Run it again (${r.runsLeft} left)`
                : 'Back home'}
        </button>
        {r.next === 'again' && (
          <button className="button secondary" onClick={() => go('Heading home…', stopPractice)}>
            Enough for today
          </button>
        )}
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
        {def.kind === 'cup' && (
          <li className={record.placing === 1 ? 'discovery' : 'info'}>
            {record.placing === 1
              ? `★ The Hollowmere Cup is yours. ${game.kennelName || 'Your kennel'}'s name goes on it beside Grandpa's.`
              : 'The Cup goes to the kennel with the best total over all four rounds.'}
          </li>
        )}
        {def.kind === 'trial' && (
          <li className={record.qualified ? 'good' : 'warn'}>
            {record.qualified
              ? 'A qualifying run.'
              : `No qualifying run (needs ${QUALIFY.minRound}+ in every round and ${qualifyTotal(def.rounds.length)}+ in total).`}
          </li>
        )}
        {def.kind === 'trial' && dog && (
          <li className="info">
            {adviceFor(
              def.rounds[worstRound(record.entries.find((e) => e.player)!.rounds)]!.kind,
              !!def.rounds[worstRound(record.entries.find((e) => e.player)!.rounds)]!.retrieve
                ?.water,
              dog.name,
            )}
          </li>
        )}
        {title && dog && (
          <li className="discovery">
            ★ {dog.name} earned the{' '}
            {(def.sport ?? 'field') === 'field' ? '' : `${SPORT_INFO[def.sport!].name} `}
            {TRIAL_RULES[title].name} title: {dogWithTitles(dog)}.
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
        <li className="info">{SEASON_EFFECTS[seasonOf(game.day)].note}</li>
        {(r.news ?? []).map((n) => (
          <li key={n} className="good">
            {n}
          </li>
        ))}
        {(r.litters ?? []).map((l) => (
          <li key={l.dam + l.sire} className="discovery">
            {l.dam} had {l.count} puppies by {l.sire} this season. See them at the puppy paddock.
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
  const ranToday = game.trials.some((t) => t.day === game.day && t.dogId === dog.id);
  const days = nextTrialDay(game.day) - game.day;
  const night = game.block === 'night';
  return (
    <div className="row">
      <div className="grow">
        <div className="title">
          Larkspur trial ground{' '}
          <button className="link" onClick={() => showIntro('trials', true)}>
            How trials work
          </button>
        </div>
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

/** The van's row for a Saturday show: today's, or when the next one is. */
function ShowRow({ game, sport }: { game: GameState; sport: ExtraSport }) {
  const dog = activeDog(game);
  if (!dog) return null;
  const today = todaysShow(game, sport);
  const level = trialLevel(dog, sport);
  const rules = SHOW_RULES[level];
  const ranToday = game.trials.some((t) => t.day === game.day && t.dogId === dog.id);
  const days = nextShowDay(game.day) - game.day;
  const night = game.block === 'night';
  const problem = days === 0 && !ranToday ? entryProblem(game) : null;
  const what =
    sport === 'agility'
      ? 'Two rounds over a numbered course of jumps, tunnel, weave poles and A-frame.'
      : 'Gather the sheep, drive them through the gates, and pen them.';
  return (
    <div className="row">
      <div className="grow">
        <div className="title">
          {sport === 'agility' ? 'Village green: agility show' : 'Fell Top Farm: sheepdog trial'}{' '}
          <button className="link" onClick={() => showIntro('shows', true)}>
            How shows work
          </button>
        </div>
        <div className="sub">
          {ranToday
            ? `${dog.name} has competed today.`
            : problem
              ? problem
              : today
                ? `Today: ${TRIAL_RULES[level].name} level. ${what} Entry $${today.entryFee}; prizes $${today.prizes.join(', $')}.`
                : `${TRIAL_RULES[level].name} level on Saturday (${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}). ${what} Entry $${rules.entryFee}.`}
        </div>
      </div>
      <button
        className="button"
        disabled={!today || night || game.money < (today?.entryFee ?? 0)}
        onClick={() =>
          go(
            sport === 'agility' ? 'Driving to the village green…' : 'Driving up to Fell Top…',
            () => travel(sport),
          )
        }
      >
        {today && game.money < today.entryFee ? `Need $${today.entryFee}` : 'Enter'}
      </button>
    </div>
  );
}

/** Titles and qualifying runs in every sport, under the dog's name in the ledger. */
function TitleLine({ dog }: { dog: Dog }) {
  const lines = SPORTS.flatMap((sport) => {
    const held = titlesIn(dog, sport);
    const level = trialLevel(dog, sport);
    const qs = qualifiersIn(dog, sport, level);
    if (sport !== 'field' && !held.length && !qs) return [];
    const name = SPORT_INFO[sport].name;
    return [
      `${name}: ${held.length ? held.map((t) => TRIAL_RULES[t].name).join(', ') : 'no titles yet'}` +
        (held.includes(level)
          ? '.'
          : `; ${TRIAL_RULES[level].name} title ${qs} of ${QUALIFY.toTitle} qualifying runs.`),
    ];
  });
  return <p className="small">{lines.join(' ')}</p>;
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
        <button className="button secondary" onClick={() => useApp.setState({ panel: 'help' })}>
          How to play (the kennel handbook)
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
          <button className="button secondary small" onClick={() => devSkipToSaturday()}>
            Skip to Saturday (shows)
          </button>
          <button className="button secondary small" onClick={() => devSkipToSunday()}>
            Skip to Sunday (trial)
          </button>
          {game && !!game.funDay && (
            <button className="button secondary small" onClick={() => devSkipToCup()}>
              Skip to Cup day
            </button>
          )}
          {game && game.story !== 'afterFunDay' && (
            <button className="button secondary small" onClick={devPastFirstWeek}>
              Skip the first week
            </button>
          )}
          {game && game.dogs.length > 0 && (
            <>
              <button className="button secondary small" onClick={devTrainUp}>
                Train every dog to 75%
              </button>
              <button className="button secondary small" onClick={devAgeYear}>
                Age every dog a year
              </button>
            </>
          )}
          {game && game.pregnancies.length > 0 && (
            <button className="button secondary small" onClick={() => devSkipToLitter()}>
              Skip to the litter
            </button>
          )}
          {game && game.litters.some((l) => l.puppies.some((p) => p.ageMonths < 3)) && (
            <button className="button secondary small" onClick={() => devSkipToPuppiesReady()}>
              Skip until the puppies can leave
            </button>
          )}
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
  const inRuns = game.dogs.filter((d) => d.id !== game.activeDogId && !d.retired);
  const hungry = inRuns.filter((d) => d.fullness < 70).length;
  return (
    <div className="panel card">
      <div className="kicker">The kennel runs</div>
      <h2>Your dogs</h2>
      <p className="lead">
        One dog comes out with you; the others wait in their runs. {game.food} meals in the pantry.
      </p>
      <div className="list">
        {game.dogs
          .filter((d) => !d.retired)
          .map((d) => {
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
      <FiresideNote game={game} />
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
