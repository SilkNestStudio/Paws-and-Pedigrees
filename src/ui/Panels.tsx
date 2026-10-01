import {
  aptitudeProfile,
  breedDescription,
  coatOf,
  CUE_LABELS,
  CUES,
  type Dog,
} from '../core/dog/dog';
import { formatGenotype } from '../core/genetics/loci';
import { APTITUDE_LABELS, APTITUDES } from '../core/genetics/traits';
import { FREE_PLAY, RETRIEVE_SETUPS } from '../sim/exercises';
import { LESSONS, type Lesson } from '../sim/training';
import { useGame } from '../app/store';

export function Panels() {
  const panel = useGame((s) => s.panel);
  if (panel === 'none') return null;
  return (
    <div
      className="overlay"
      onPointerDown={(e) =>
        e.target === e.currentTarget && panel === 'book' && useGame.getState().setPanel('none')
      }
    >
      {panel === 'welcome' && <Welcome />}
      {panel === 'book' && <Book />}
      {panel === 'result' && <Result />}
    </div>
  );
}

function Welcome() {
  const dog = useGame((s) => s.activeDog());
  const dismiss = useGame((s) => s.dismissWelcome);
  return (
    <div className="panel card">
      <h2>Field test: working with your dog</h2>
      <p className="lead">
        This is an early test of how it feels to work with a dog in Grandpa's old training field.
        The story, the kennel and breeding come later. Right now the question is simple: is this
        fun, and does your skill matter?
      </p>
      <p>
        You're working with <b>{dog.name}</b>, one of three rescues. Each has different natural
        strengths you'll notice as you play. Start with some free play, then try the set-ups and
        lessons in the <b>Field book</b>.
      </p>
      <h3>Controls</h3>
      <div className="controls-grid">
        <kbd>WASD / stick</kbd>
        <span>Walk (Shift or push the stick fully to run)</span>
        <kbd>Click / tap ground</kbd>
        <span>Throw the ball, send your dog, or point a direction when it's waiting</span>
        <kbd>Space</kbd>
        <span>Stop whistle in the field · "Yes!" in lessons</span>
        <kbd>R</kbd>
        <span>"Here!" — call your dog back</span>
        <kbd>F</kbd>
        <span>"Sit" to steady your dog · the lesson's cue</span>
        <kbd>Drag / Q E</kbd>
        <span>Look around</span>
      </div>
      <p>
        Watch your dog's body language at the top left. Dogs show what they're about to do before
        they do it. Wind matters: scent drifts the way the wind arrow points.
      </p>
      <div className="button-row">
        <button className="button" onClick={dismiss}>
          Let's go
        </button>
      </div>
    </div>
  );
}

function Book() {
  const tab = useGame((s) => s.bookTab);
  const setTab = useGame((s) => s.setBookTab);
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div className="panel card">
      <h2>Field book</h2>
      <div className="tabs">
        {(['work', 'lessons', 'dogs'] as const).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'work' ? 'Field work' : t === 'lessons' ? 'Lessons' : 'Dogs'}
          </button>
        ))}
      </div>
      {tab === 'work' && <WorkTab />}
      {tab === 'lessons' && <LessonsTab />}
      {tab === 'dogs' && <DogsTab />}
      <div className="button-row">
        <button className="button secondary" onClick={() => setPanel('none')}>
          Close
        </button>
      </div>
    </div>
  );
}

function bestGrade(setupId: string, dogId: string) {
  const runs = useGame.getState().history.filter((h) => h.setupId === setupId && h.dogId === dogId);
  if (runs.length === 0) return null;
  return runs.reduce((a, b) => (b.score > a.score ? b : a));
}

function WorkTab() {
  const dog = useGame((s) => s.activeDog());
  const screen = useGame((s) => s.screen);
  const start = useGame((s) => s.startField);
  useGame((s) => s.history.length);
  return (
    <div className="list">
      {[FREE_PLAY, ...RETRIEVE_SETUPS].map((setup) => {
        const best = setup.free ? null : bestGrade(setup.id, dog.id);
        const current = screen.kind === 'field' && screen.setupId === setup.id;
        return (
          <div key={setup.id} className={`row ${current ? 'active' : ''}`}>
            <div className="grow">
              <div className="title">{setup.title}</div>
              <div className="sub">{setup.summary}</div>
            </div>
            {best && (
              <span
                className={`badge ${best.grade === 'Excellent' || best.grade === 'Very good' ? 'good' : ''}`}
              >
                {best.grade}
              </span>
            )}
            <button className="button" onClick={() => start(setup.id)}>
              {current ? 'Restart' : 'Go'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LessonsTab() {
  const dog = useGame((s) => s.activeDog());
  const start = useGame((s) => s.startLesson);
  return (
    <>
      <p className="lead">
        Lessons are marker training: you decide what to reward and press "Yes!" at exactly the right
        moment. What {dog.name} learns here shows up in the field.
      </p>
      <div className="list">
        {(Object.keys(LESSONS) as Lesson[]).map((lesson) => (
          <div key={lesson} className="row">
            <div className="grow">
              <div className="title">{LESSONS[lesson].title}</div>
              <div className="sub">{LESSONS[lesson].summary}</div>
              <div className="meter" style={{ marginTop: 6, height: 8 }}>
                <div className="fill" style={{ width: `${dog.skills[lesson] * 100}%` }} />
              </div>
            </div>
            <span className="badge">{Math.round(dog.skills[lesson] * 100)}%</span>
            <button className="button" onClick={() => start(lesson)}>
              Train
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function SkillBars({ dog }: { dog: Dog }) {
  return (
    <div className="skills">
      {CUES.map((cue) => (
        <FragmentRow key={cue} label={CUE_LABELS[cue].name} value={dog.skills[cue]} />
      ))}
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <div className="meter">
        <div className="fill" style={{ width: `${value * 100}%` }} />
      </div>
    </>
  );
}

function DogsTab() {
  const dogs = useGame((s) => s.dogs);
  const activeId = useGame((s) => s.activeDogId);
  const select = useGame((s) => s.selectDog);
  const newRescues = useGame((s) => s.newRescues);
  return (
    <>
      <p className="lead">
        Three rescues from the shelter. Each looks and works differently. Try the same set-up with
        each.
      </p>
      <div className="list">
        {dogs.map((dog) => {
          const coat = coatOf(dog);
          return (
            <div
              key={dog.id}
              className={`row ${dog.id === activeId ? 'active' : ''}`}
              style={{ alignItems: 'flex-start' }}
            >
              <div className="grow">
                <div className="title">
                  {dog.name}{' '}
                  <span className="sub">
                    · {dog.sex}, {Math.round(dog.ageMonths / 12)} yrs
                  </span>
                </div>
                <div className="sub">
                  {coat.name} · {breedDescription(dog)}
                </div>
                <SkillBars dog={dog} />
                <DevAptitudes dog={dog} />
              </div>
              {dog.id === activeId ? (
                <span className="badge good">Working</span>
              ) : (
                <button className="button" onClick={() => select(dog.id)}>
                  Work with {dog.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="dev">
        <b>Tester tools.</b> These are for the field test only.
        <div className="button-row">
          <button className="button secondary" onClick={newRescues}>
            Meet three new rescues
          </button>
          <DevSkillButtons />
        </div>
      </div>
    </>
  );
}

function DevAptitudes({ dog }: { dog: Dog }) {
  const profile = aptitudeProfile(dog);
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
        Hidden aptitudes (tester view)
      </summary>
      <div className="skills">
        {APTITUDES.map((a) => (
          <FragmentRow
            key={a}
            label={`${APTITUDE_LABELS[a].name} ${profile[a]}`}
            value={profile[a] / 100}
          />
        ))}
      </div>
      <div className="sub" style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 11 }}>
        {formatGenotype(dog.genome.loci)}
      </div>
      {coatOf(dog).notes.map((n) => (
        <div key={n} className="sub">
          {n}
        </div>
      ))}
    </details>
  );
}

function DevSkillButtons() {
  const setSkill = useGame((s) => s.devSetSkill);
  return (
    <>
      <button
        className="button secondary"
        onClick={() => (['stop', 'cast', 'stay'] as const).forEach((c) => setSkill(c, 0.85))}
      >
        Skip ahead: trained dog
      </button>
      <button
        className="button secondary"
        onClick={() => (['stop', 'cast', 'stay'] as const).forEach((c) => setSkill(c, 0))}
      >
        Reset training
      </button>
    </>
  );
}

function Result() {
  const report = useGame((s) => s.report);
  const lessonResult = useGame((s) => s.lessonResult);
  const screen = useGame((s) => s.screen);
  const restart = useGame((s) => s.restart);
  const startField = useGame((s) => s.startField);
  const startLesson = useGame((s) => s.startLesson);
  const setPanel = useGame((s) => s.setPanel);
  const dog = useGame((s) => s.activeDog());

  if (screen.kind === 'lesson' && lessonResult) {
    const gain = lessonResult.after - lessonResult.before;
    const c = lessonResult.counts;
    return (
      <div className="panel card">
        <h2>{LESSONS[lessonResult.lesson].title}: session over</h2>
        <div className="grade">
          <span className="big">
            {Math.round(lessonResult.before * 100)}% → {Math.round(lessonResult.after * 100)}%
          </span>
          <span className={`badge ${gain > 0 ? 'good' : ''}`}>
            {gain >= 0 ? '+' : ''}
            {Math.round(gain * 100)} points
          </span>
        </div>
        <ul className="notes">
          {(c.perfect ?? 0) > 0 && <li className="good">{c.perfect} perfectly timed rewards.</li>}
          {(c.shaping ?? 0) > 0 && (
            <li className="good">{c.shaping} rewards for steps in the right direction.</li>
          )}
          {((c.early ?? 0) > 0 || (c.late ?? 0) > 0) && (
            <li>
              {c.early ?? 0} early and {c.late ?? 0} late marks
              {lessonResult.averageOffset !== null &&
                ` (on average ${lessonResult.averageOffset >= 0 ? '+' : ''}${lessonResult.averageOffset.toFixed(2)} s)`}
              .
            </li>
          )}
          {((c.wrong ?? 0) > 0 || (c.sloppy ?? 0) > 0) && (
            <li className="warn">
              {(c.wrong ?? 0) + (c.sloppy ?? 0)} rewards for the wrong thing. Those cost progress.
            </li>
          )}
          {(c.nothing ?? 0) > 0 && (
            <li className="warn">{c.nothing} marks when nothing was happening.</li>
          )}
          <li>
            {lessonResult.dogName}'s {LESSONS[lessonResult.lesson].title.toLowerCase()} skill is now{' '}
            {Math.round(lessonResult.after * 100)}%. It carries over to field work.
          </li>
        </ul>
        <div className="button-row">
          <button className="button" onClick={restart}>
            Another session
          </button>
          <button
            className="button secondary"
            onClick={() => startField(lessonResult.lesson === 'sit' ? 'free' : 'first-blind')}
          >
            Try it in the field
          </button>
          <button className="button secondary" onClick={() => setPanel('book')}>
            Field book
          </button>
        </div>
      </div>
    );
  }

  if (!report || screen.kind !== 'field') return null;
  const setupIndex = RETRIEVE_SETUPS.findIndex((s) => s.id === screen.setupId);
  const next = RETRIEVE_SETUPS[setupIndex + 1];
  return (
    <div className="panel card">
      <h2>{RETRIEVE_SETUPS[setupIndex]?.title ?? 'Retrieve'}</h2>
      <div className="grade">
        <span className="big">{report.grade}</span>
        <span className="badge">{report.score} points</span>
        <span className="badge">{Math.round(report.seconds)} s</span>
      </div>
      <ul className="notes">
        {report.notes.map((n) => (
          <li key={n.text} className={n.tone}>
            {n.text}
          </li>
        ))}
        {report.notes.length === 0 && <li>{dog.name} got the job done.</li>}
      </ul>
      <p style={{ marginTop: 12, fontWeight: 700 }}>{report.suggestion.text}</p>
      <div className="button-row">
        {report.suggestion.kind === 'lesson' && (
          <button
            className="button"
            onClick={() =>
              startLesson(
                report.suggestion.kind === 'lesson' ? (report.suggestion.lesson as Lesson) : 'sit',
              )
            }
          >
            Go to the lesson
          </button>
        )}
        <button
          className={`button ${report.suggestion.kind === 'lesson' ? 'secondary' : ''}`}
          onClick={restart}
        >
          Try again
        </button>
        {next && (
          <button className="button secondary" onClick={() => startField(next.id)}>
            Next: {next.title}
          </button>
        )}
        <button className="button secondary" onClick={() => setPanel('book')}>
          Field book
        </button>
      </div>
    </div>
  );
}
