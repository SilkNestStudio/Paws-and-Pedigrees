import { useMemo, useRef, useState } from 'react';
import { coatOf } from '../core/dog/dog';
import { wrapAngle } from '../core/math';
import { activeDog, dayName } from '../game/state';
import { seasonOf } from '../game/calendar';
import { dogWithTitles } from '../app/flow';
import { objective } from '../game/story';
import { fieldFor, abandonActivity, go, takePhoto } from '../app/flow';
import { LESSONS } from '../sim/training';
import { OBSTACLE_LENGTH } from '../sim/agility';
import { wallsOf, type HerdCommand } from '../sim/herding';
import { useHud, type HudSnapshot } from '../app/hud';
import { useApp, type Place } from '../app/store';
import { input } from '../app/input';
import * as act from '../app/actions';
import { useIndicators } from '../render/Targets';
import { useSpotLabels } from '../render/Spots';

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

/** The in-game interface over the 3D view. */
export function Hud() {
  const snap = useHud((s) => s.snap);
  const panel = useApp((s) => s.panel);
  const dialog = useApp((s) => s.dialog);
  const screen = useApp((s) => s.screen);
  if (!snap || screen.kind === 'title' || screen.kind === 'letter' || screen.kind === 'loading')
    return null;
  const busy = panel !== null || dialog !== null;
  return (
    <div className="hud">
      <TopBar snap={snap} />
      {snap.kind === 'home' ? <ObjectiveCard /> : <ActivityCard snap={snap} />}
      {!busy && (snap.field || snap.search || snap.agility || snap.herding) && <TargetLabels />}
      {snap.kind === 'home' && !busy && <SpotNameLabels />}
      <TopRight snap={snap} />
      {snap.lesson?.feedback && snap.lesson.time - snap.lesson.feedback.time < 3 && (
        <div className={`coach card ${snap.lesson.feedback.tone}`}>{snap.lesson.feedback.text}</div>
      )}
      {snap.puppies?.feedback && snap.puppies.time - snap.puppies.feedback.time < 3.5 && (
        <div className={`coach card ${snap.puppies.feedback.tone}`}>
          {snap.puppies.feedback.text}
        </div>
      )}
      <Events snap={snap} />
      {!busy && snap.hint && !(isTouch && snap.kind === 'home') && (
        <div
          className={`hint card ${snap.lesson?.coach ? `coach-${snap.lesson.coach}` : ''} ${
            snap.puppies?.hintKind === 'now'
              ? 'coach-now'
              : snap.puppies?.hintKind === 'help'
                ? 'coach-no'
                : ''
          }`}
        >
          {snap.hint}
        </div>
      )}
      {!busy && <Actions snap={snap} />}
      {!busy &&
        snap.kind !== 'lesson' &&
        snap.kind !== 'puppies' &&
        snap.kind !== 'herding' &&
        isTouch && <Stick />}
      {!busy && !isTouch && snap.kind !== 'herding' && <Keys snap={snap} />}
    </div>
  );
}

function Meter({ value, colour }: { value: number; colour: string }) {
  return (
    <div className="mini-meter">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colour }} />
    </div>
  );
}

function TopBar({ snap }: { snap: HudSnapshot }) {
  const game = useApp((s) => s.game);
  const screen = useApp((s) => s.screen);
  const shelterPick = useApp((s) => s.shelterPick);
  if (!game) return null;
  const pupTurn =
    screen.kind === 'puppies'
      ? game.litters.flatMap((l) => l.puppies).find((p) => p.id === snap.puppies?.pupId)
      : undefined;
  const dog =
    screen.kind === 'shelter'
      ? game.shelter[shelterPick]
      : screen.kind === 'puppies'
        ? pupTurn
        : activeDog(game);
  const coat = dog ? coatOf(dog) : null;
  const swatch = !coat
    ? '#ccc'
    : coat.whiteAmount > 0.45
      ? `radial-gradient(circle at 35% 35%, ${coat.base === 'eumelanin' ? coat.eumelanin : coat.pheomelanin} 30%, ${coat.white} 32%)`
      : coat.points
        ? `linear-gradient(135deg, ${coat.eumelanin} 55%, ${coat.pheomelanin} 55%)`
        : coat.base === 'eumelanin'
          ? coat.eumelanin
          : coat.pheomelanin;
  return (
    <div className="top-bar">
      <div className="dog-chip card">
        {dog ? (
          <>
            <div className="swatch" style={{ background: swatch }} />
            <div className="dog-text">
              <div className="name">
                {screen.kind === 'shelter' || screen.kind === 'puppies'
                  ? dog.name
                  : dogWithTitles(dog)}
              </div>
              <div className="tell">{snap.tell || coat?.name}</div>
              {screen.kind !== 'shelter' && screen.kind !== 'puppies' && (
                <div className="needs">
                  <span title="Energy">Energy</span>
                  <Meter value={dog.energy} colour={dog.energy < 25 ? '#c0632a' : '#3f8a4f'} />
                  <span title="Fullness">Fed</span>
                  <Meter value={dog.fullness} colour={dog.fullness < 30 ? '#c0632a' : '#d9a03a'} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="dog-text">
            <div className="name">
              {game.kennelName ? `${game.kennelName} Kennels` : "Grandpa's kennel"}
            </div>
            <div className="tell">No dog yet</div>
          </div>
        )}
      </div>
      <div className="day-chip card">
        <div className="day">
          {dayName(game.day)} · <span className="block">{game.block}</span>
        </div>
        <div className="season">
          {seasonOf(game.day)}, week {Math.floor((game.day - 1) / 7) + 1}
        </div>
        <div className="stock">
          <span title="Money">${game.money}</span>
          <span title="Meals in the pantry">{game.food} meals</span>
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard() {
  const game = useApp((s) => s.game);
  const [open, setOpen] = useState(true);
  if (!game) return null;
  const obj = objective(game);
  if (!obj.steps.length) return null;
  return (
    <div className="objective card" onClick={() => setOpen((o) => !o)}>
      <div className="objective-title">
        <span className="dot" /> {obj.title}
      </div>
      {open && (
        <ul>
          {obj.steps.map((s) => (
            <li key={s.text} className={s.done ? 'done' : ''}>
              {s.done ? '✓' : '○'} {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityCard({ snap }: { snap: HudSnapshot }) {
  const screen = useApp((s) => s.screen);
  const event = useApp((s) => s.event);
  const roundIndex =
    screen.kind === 'retrieve' ||
    screen.kind === 'search' ||
    screen.kind === 'agility' ||
    screen.kind === 'herding'
      ? (screen.round ?? 0)
      : 0;
  const eventLine = event
    ? `${event.def.name} · round ${roundIndex + 1} of ${event.def.rounds.length}`
    : '';
  let title = '';
  let sub = '';
  if (screen.kind === 'retrieve') {
    title = screen.setup.title;
    sub = screen.job
      ? `Job for ${screen.job.client} · $${screen.job.pay}`
      : screen.round !== undefined
        ? eventLine
        : screen.setup.focus;
  } else if (screen.kind === 'search') {
    title = screen.setup.title;
    sub = screen.job
      ? `Job for ${screen.job.client} · $${screen.job.pay}`
      : screen.round !== undefined
        ? eventLine
        : 'Search';
  } else if (screen.kind === 'lesson') {
    title = LESSONS[screen.lesson].title;
    sub = LESSONS[screen.lesson].how;
  } else if (screen.kind === 'herding') {
    title = screen.setup.title;
    sub = screen.round !== undefined ? eventLine : screen.setup.summary;
  } else if (screen.kind === 'agility') {
    title = screen.course.title;
    sub = screen.round !== undefined ? eventLine : screen.course.summary;
  } else if (screen.kind === 'shelter') {
    title = 'Larchwood Rescue';
    sub = 'Play with each dog, then choose.';
  } else if (screen.kind === 'puppies' && snap.puppies) {
    title = snap.puppies.title;
    sub = `${snap.puppies.summary} (${Math.min(snap.puppies.done + 1, snap.puppies.total)} of ${snap.puppies.total})`;
  }
  const l = snap.lesson;
  const a = snap.agility;
  const h = snap.herding;
  return (
    <div className={`objective card activity ${l ? 'lesson' : ''}`}>
      <div className="objective-title">{title}</div>
      <div className="sub">{sub}</div>
      {h && (
        <>
          <ul className="task-list">
            {h.tasks.map((t, i) => (
              <li key={i} className={i < h.task ? 'done' : i === h.task ? 'now' : ''}>
                {i < h.task ? '✓' : '○'} {i + 1}. {t.label[0]!.toUpperCase()}
                {t.label.slice(1)}
                {i <= h.task && t.through > 0 ? ` (${t.through} of ${h.flock})` : ''}
              </li>
            ))}
            <li className={h.task >= h.tasks.length ? 'now' : ''}>
              ○ {h.tasks.length + 1}. The pen{h.penned ? ` (${h.penned} of ${h.flock} in)` : ''}
            </li>
          </ul>
          <div className="stat-row">
            <span className={h.seconds > h.standard ? 'over' : ''}>
              {Math.floor(h.seconds)} s of {h.standard} s
            </span>
            <span>Time is called at {h.limit} s</span>
          </div>
          {h.harried > 0 && (
            <div className="stat-row muted">
              <span>Sheep scattered: {h.harried}</span>
            </div>
          )}
        </>
      )}
      {a && (
        <>
          <div className="stat-row">
            <span>
              Obstacle {Math.min(a.next + 1, a.total)} of {a.total}
            </span>
            <span className={a.seconds > a.standard ? 'over' : ''}>
              {a.seconds.toFixed(1)} s of {a.standard} s
            </span>
          </div>
          <div className="stat-row muted">
            <span>{a.faults ? `Faults: ${a.faults}` : 'Clear so far'}</span>
          </div>
        </>
      )}
      {l && (
        <>
          <div className="stat-row">
            <span>{snap.dogName}'s skill</span>
            <span>{Math.round(l.skill * 100)}%</span>
          </div>
          <div className="meter">
            <div className="fill" style={{ width: `${l.skill * 100}%` }} />
            <div className="before" style={{ left: `${l.before * 100}%` }} />
          </div>
          <div className="stat-row muted">
            <span>Treats left: {l.treats}</span>
            <span>
              Interest: {l.interest > 0.7 ? 'keen' : l.interest > 0.45 ? 'fading' : 'tired'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function windWords(strength: number): string {
  return strength < 0.3
    ? 'Light air'
    : strength < 0.5
      ? 'Gentle breeze'
      : strength < 0.7
        ? 'Fresh breeze'
        : 'Strong wind';
}

function Events({ snap }: { snap: HudSnapshot }) {
  const toasts = useApp((s) => s.toasts);
  const rel = snap.wind ? wrapAngle(snap.wind.heading - snap.cameraYaw) : 0;
  const recent = snap.events.filter((e) => e.text).slice(-2);
  return (
    <div className="top-centre">
      {snap.wind && (
        <div
          className="wind card"
          title="Where the wind blows, relative to your view. Scent drifts the same way."
        >
          <div className="dial">
            <svg
              className="arrow"
              width="24"
              height="24"
              viewBox="-12 -12 24 24"
              style={{ transform: `rotate(${-rel}rad)` }}
            >
              <path d="M0 -10 L6 4 L0 1 L-6 4 Z" fill="#d9622b" />
              <rect x="-1.2" y="1" width="2.4" height="9" fill="#d9622b" />
            </svg>
          </div>
          Wind: {windWords(snap.wind.strength)}
        </div>
      )}
      <div className="events">
        {recent
          .filter((e, i) => recent.findIndex((x) => x.text === e.text) === i)
          .map((e) => (
            <div key={`${e.time}-${e.text}`} className={`event card ${e.tone}`}>
              {e.text}
            </div>
          ))}
        {toasts.map((t) => (
          <div key={t.id} className={`event card ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopRight({ snap }: { snap: HudSnapshot }) {
  const [showMap, setShowMap] = useState(true);
  const screen = useApp((s) => s.screen);
  const inActivity =
    screen.kind === 'retrieve' ||
    screen.kind === 'search' ||
    screen.kind === 'lesson' ||
    screen.kind === 'agility' ||
    screen.kind === 'herding' ||
    screen.kind === 'puppies';
  return (
    <div className="top-right">
      <button className="icon-button" onClick={() => useApp.setState({ panel: 'menu' })}>
        Menu
      </button>
      {screen.kind !== 'shelter' && (
        <button className="icon-button" onClick={takePhoto} title="Take a photograph for the album">
          Photo
        </button>
      )}
      {inActivity && (
        <button className="icon-button" onClick={() => go('Heading back…', abandonActivity)}>
          {screen.kind === 'lesson' || screen.kind === 'puppies' ? 'Finish' : 'Leave'}
        </button>
      )}
      {(snap.field || snap.search) && (
        <button className="icon-button" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Hide map' : 'Map'}
        </button>
      )}
      {(snap.field || snap.search) && showMap && <MiniMap snap={snap} />}
      {snap.agility && <CourseMap snap={snap} />}
      {snap.herding && <FlockMap snap={snap} />}
    </div>
  );
}

/** Names over the places you can use at home; the one in reach says which key to press. */
function SpotNameLabels() {
  const list = useSpotLabels((s) => s.list);
  return (
    <>
      {list.map((l) => (
        <div
          key={l.id}
          className={`spot-label ${l.ready ? 'ready' : ''}`}
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
        >
          {l.text}
          {l.ready && <b>{isTouch ? ' · tap the button' : ' · press E'}</b>}
        </div>
      ))}
    </>
  );
}

/** Labels over targets on screen, arrows at the edge for targets off screen. */
function TargetLabels() {
  const list = useIndicators((s) => s.list);
  return (
    <>
      {list.map((t) =>
        t.onScreen ? (
          <div
            key={t.id}
            className="target-label"
            style={{ left: `${t.x}%`, top: `${t.y}%`, borderColor: t.colour }}
          >
            {t.label} · {t.metres} m
          </div>
        ) : (
          <div key={t.id} className="target-edge" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
            <div
              className="target-arrow"
              style={{ transform: `rotate(${t.angle}rad)`, borderBottomColor: t.colour }}
            />
            <span>
              {t.label} · {t.metres} m
            </span>
          </div>
        ),
      )}
    </>
  );
}

function MiniMap({ snap }: { snap: HudSnapshot }) {
  const screen = useApp((s) => s.screen);
  const place: Place =
    screen.kind === 'retrieve' || screen.kind === 'search'
      ? screen.place
      : screen.kind === 'shelter'
        ? 'shelter'
        : 'home';
  const game = useApp((s) => s.game);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const field = useMemo(() => fieldFor(place), [place, game?.flags.length]);
  const w = field.maxX - field.minX;
  const h = field.maxZ - field.minZ;
  const f = snap.field;
  const s = snap.search;
  const keeper = f?.keeper ?? s?.keeper;
  const dog = f?.dog ?? s?.dog;
  const trace = f?.trace ?? s?.trace ?? [];
  return (
    <div className="minimap card">
      <svg
        viewBox={`${field.minX} ${field.minZ} ${w} ${h}`}
        onPointerUp={(e) => {
          // Tap the map to send, direct, or search there.
          const svg = e.currentTarget;
          const p = svg.createSVGPoint();
          p.x = e.clientX;
          p.y = e.clientY;
          const m = svg.getScreenCTM();
          if (!m) return;
          const w = p.matrixTransform(m.inverse());
          act.tapGround({ x: w.x, z: w.y });
        }}
      >
        <rect
          x={field.minX}
          y={field.minZ}
          width={w}
          height={h}
          fill={field.style === 'beach' ? '#e3d4a4' : '#8fb35f'}
        />
        {field.cover.map((c, i) => (
          <circle
            key={i}
            cx={c.center.x}
            cy={c.center.z}
            r={c.radius}
            fill="#b6ad5c"
            opacity={0.85}
          />
        ))}
        {(field.ponds ?? []).map((p, i) => (
          <ellipse key={i} cx={p.center.x} cy={p.center.z} rx={p.rx} ry={p.rz} fill="#5b93a3" />
        ))}
        {field.trees.map((t, i) => (
          <circle key={i} cx={t.pos.x} cy={t.pos.z} r={2.2} fill="#3f6a33" />
        ))}
        {s && (
          <circle
            cx={s.hint.center.x}
            cy={s.hint.center.z}
            r={s.hint.radius}
            fill="none"
            stroke="#f3a24b"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        )}
        {trace.length > 1 && (
          <polyline
            points={trace.map((p) => `${p.x},${p.z}`).join(' ')}
            fill="none"
            stroke="#fff"
            strokeWidth={1.2}
            strokeOpacity={0.8}
          />
        )}
        {f?.items.map((it, i) =>
          it.state === 'lying' || it.state === 'flying' ? (
            it.kind === 'blind' ? (
              <rect key={i} x={it.pos.x - 2} y={it.pos.z - 2} width={4} height={4} fill="#e2622d" />
            ) : (
              <g key={i} stroke="#fff" strokeWidth={1.4}>
                <line
                  x1={it.pos.x - 2.2}
                  y1={it.pos.z - 2.2}
                  x2={it.pos.x + 2.2}
                  y2={it.pos.z + 2.2}
                />
                <line
                  x1={it.pos.x - 2.2}
                  y1={it.pos.z + 2.2}
                  x2={it.pos.x + 2.2}
                  y2={it.pos.z - 2.2}
                />
              </g>
            )
          ) : null,
        )}
        {keeper && (
          <circle
            cx={keeper.x}
            cy={keeper.z}
            r={2.4}
            fill="#22352a"
            stroke="#fff"
            strokeWidth={0.8}
          />
        )}
        {dog && (
          <circle cx={dog.x} cy={dog.z} r={2.4} fill="#d9622b" stroke="#fff" strokeWidth={0.8} />
        )}
      </svg>
    </div>
  );
}

/** The numbered course from above, with you and your dog on it. */
function CourseMap({ snap }: { snap: HudSnapshot }) {
  const screen = useApp((s) => s.screen);
  const a = snap.agility;
  if (screen.kind !== 'agility' || !a) return null;
  const course = screen.course;
  const xs = [...course.obstacles.map((o) => o.pos.x), course.start.x];
  const zs = [...course.obstacles.map((o) => o.pos.z), course.start.z];
  const minX = Math.min(...xs) - 4;
  const minZ = Math.min(...zs) - 4;
  const w = Math.max(...xs) + 4 - minX;
  const h = Math.max(...zs) + 4 - minZ;
  return (
    <div className="minimap card course-map">
      <svg viewBox={`${minX} ${minZ} ${w} ${h}`}>
        <rect x={minX} y={minZ} width={w} height={h} fill="#8fb35f" />
        <polyline
          points={[course.start, ...course.obstacles.map((o) => o.pos)]
            .map((p) => `${p.x},${p.z}`)
            .join(' ')}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.45}
          strokeWidth={0.25}
          strokeDasharray="0.8 0.6"
        />
        {course.obstacles.map((o, i) => {
          const len = OBSTACLE_LENGTH[o.kind] / 2;
          const dx = Math.sin(o.heading);
          const dz = Math.cos(o.heading);
          const across = o.kind === 'jump';
          // Jumps are drawn as a bar across the path; the rest along it.
          const ex = across ? dz * 0.9 : dx * len;
          const ez = across ? -dx * 0.9 : dz * len;
          const state = i < a.next ? 'done' : i === a.next ? 'next' : 'todo';
          return (
            <g key={i} opacity={state === 'done' ? 0.45 : 1}>
              <line
                x1={o.pos.x - ex}
                y1={o.pos.z - ez}
                x2={o.pos.x + ex}
                y2={o.pos.z + ez}
                stroke={o.kind === 'tunnel' ? '#3f6fb5' : o.kind === 'frame' ? '#c8452f' : '#fff'}
                strokeWidth={o.kind === 'jump' ? 0.5 : 1}
                strokeLinecap="round"
              />
              <circle
                cx={o.pos.x + dz * 1.9}
                cy={o.pos.z - dx * 1.9}
                r={1.25}
                fill={state === 'next' ? '#ffb347' : '#fff'}
              />
              <text
                x={o.pos.x + dz * 1.9}
                y={o.pos.z - dx * 1.9 + 0.62}
                fontSize={1.7}
                fontWeight={700}
                textAnchor="middle"
                fill="#22352a"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        <circle
          cx={a.keeper.x}
          cy={a.keeper.z}
          r={0.9}
          fill="#22352a"
          stroke="#fff"
          strokeWidth={0.3}
        />
        <circle cx={a.dog.x} cy={a.dog.z} r={0.9} fill="#d9622b" stroke="#fff" strokeWidth={0.3} />
      </svg>
    </div>
  );
}

/** The pasture from above: gates, pen, sheep, your dog and you. */
function FlockMap({ snap }: { snap: HudSnapshot }) {
  const screen = useApp((s) => s.screen);
  const h = snap.herding;
  if (screen.kind !== 'herding' || !h) return null;
  const setup = screen.setup;
  const walls = wallsOf(setup);
  const minX = -34;
  const minZ = -58;
  const w = 68;
  const height = 76;
  const pen = setup.pen;
  return (
    <div className="minimap card course-map">
      <svg viewBox={`${minX} ${minZ} ${w} ${height}`}>
        <rect x={minX} y={minZ} width={w} height={height} fill="#8ba556" />
        <rect
          x={pen.center.x - pen.size / 2}
          y={pen.center.z - pen.size / 2}
          width={pen.size}
          height={pen.size}
          fill="#d8c27a"
        />
        {walls.map((s, i) => (
          <line
            key={i}
            x1={s.a.x}
            y1={s.a.z}
            x2={s.b.x}
            y2={s.b.z}
            stroke="#5a4028"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
        ))}
        {setup.gates.map((g, i) => {
          const x = (g.a.x + g.b.x) / 2;
          const z = (g.a.z + g.b.z) / 2;
          return (
            <g key={i} opacity={i < h.task ? 0.45 : 1}>
              <circle cx={x} cy={z} r={2.3} fill={i === h.task ? '#ffb347' : '#fff'} />
              <text
                x={x}
                y={z + 1.1}
                fontSize={3.1}
                fontWeight={700}
                textAnchor="middle"
                fill="#22352a"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        {h.sheep.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.z}
            r={1.2}
            fill="#fff"
            stroke="#3a332d"
            strokeWidth={0.3}
          />
        ))}
        <circle
          cx={h.keeper.x}
          cy={h.keeper.z}
          r={1.5}
          fill="#22352a"
          stroke="#fff"
          strokeWidth={0.4}
        />
        <circle cx={h.dog.x} cy={h.dog.z} r={1.5} fill="#d9622b" stroke="#fff" strokeWidth={0.4} />
      </svg>
    </div>
  );
}

function Actions({ snap }: { snap: HudSnapshot }) {
  if (snap.herding) {
    const h = snap.herding;
    const ready = h.phase === 'ready';
    const button = (cmd: HerdCommand, label: string, key: string, primary = false) => (
      <button
        className={`action ${primary ? 'primary' : ''} ${h.suggest === cmd ? 'suggested' : ''}`}
        disabled={ready && cmd !== 'comeBy' && cmd !== 'away'}
        onClick={() => act.herd(cmd)}
      >
        {label}
        <small>{key}</small>
      </button>
    );
    return (
      <div className="actions herding">
        {button('thatllDo', "That'll do", 'R')}
        {button('comeBy', '↶ Come by', 'A')}
        {button('walkUp', 'Walk up', 'W')}
        {button('away', 'Away ↷', 'D')}
        {button('lieDown', 'Lie down', 'Space', true)}
      </div>
    );
  }
  if (snap.agility) {
    const ready = snap.agility.phase === 'ready';
    return (
      <div className="actions">
        {!ready && (
          <>
            <button className="action" onClick={act.steady}>
              Easy<small>F</small>
            </button>
            <button className="action" onClick={act.recall}>
              Here!<small>R</small>
            </button>
          </>
        )}
        <button className="action primary" onClick={act.whistle}>
          {ready ? 'Go!' : 'Go on'}
          <small>Space</small>
        </button>
      </div>
    );
  }
  if (snap.kind === 'puppies' && snap.puppies) {
    const idle = snap.puppies.phase !== 'round';
    return snap.puppies.mode === 'evaluate' ? (
      <div className="actions">
        <button className="action" disabled={idle} onClick={() => act.pupRead('keen')}>
          Keen<small>1</small>
        </button>
        <button className="action" disabled={idle} onClick={() => act.pupRead('unsure')}>
          Unsure<small>2</small>
        </button>
        <button className="action" disabled={idle} onClick={() => act.pupRead('worried')}>
          Worried<small>3</small>
        </button>
      </div>
    ) : (
      <div className="actions">
        <button className="action" disabled={idle} onClick={act.pupHelp}>
          Make it easier<small>X</small>
        </button>
        <button className="action primary" disabled={idle} onClick={act.pupPraise}>
          Good pup!<small>Space</small>
        </button>
      </div>
    );
  }
  if (snap.kind === 'home') {
    const near = snap.home?.near;
    return (
      <div className="actions">
        {snap.dogName && (
          <button className="action" onClick={act.recall}>
            Call<small>R</small>
          </button>
        )}
        {snap.home?.nearDog && near?.id !== 'dog' && (
          <button className="action" onClick={act.pat}>
            Pat<small>F</small>
          </button>
        )}
        {near && (
          <button className="action primary wide" onClick={act.interact}>
            {near.label}
            <small>E</small>
          </button>
        )}
      </div>
    );
  }
  if (snap.kind === 'shelter') return null;
  if (snap.field) {
    const f = snap.field;
    return (
      <div className="actions">
        {f.canThrow && (
          <button className="action primary" onClick={act.throwsPlease}>
            Throw!<small>T</small>
          </button>
        )}
        {!f.dogAway && !f.free && !f.canThrow && (
          <button className="action" onClick={act.steady}>
            Sit<small>F</small>
          </button>
        )}
        {f.dogAway && (
          <button className="action" onClick={act.recall}>
            Here!<small>R</small>
          </button>
        )}
        {!f.canThrow && (
          <button className="action primary" onClick={act.whistle}>
            Whistle<small>Space</small>
          </button>
        )}
      </div>
    );
  }
  if (snap.search) {
    const s = snap.search;
    return (
      <div className="actions">
        {s.phase === 'alert' ? (
          <>
            <button className="action" onClick={act.searchOn}>
              Search on<small>X</small>
            </button>
            <button className="action primary" onClick={act.showMe}>
              Show me!<small>Space</small>
            </button>
          </>
        ) : (
          s.phase !== 'ready' && (
            <button className="action" onClick={act.recall}>
              Here!<small>R</small>
            </button>
          )
        )}
      </div>
    );
  }
  const l = snap.lesson!;
  const busy = l.phase === 'done';
  return (
    <div className="actions">
      {l.lesson === 'sit' && (
        <button className="action" disabled={busy} onClick={() => act.lessonCue()}>
          Sit<small>F</small>
        </button>
      )}
      {l.lesson === 'indicate' && (
        <button className="action" disabled={busy} onClick={() => act.lessonCue()}>
          Find it<small>F</small>
        </button>
      )}
      {l.lesson === 'stay' && (
        <>
          <button className="action" disabled={busy} onClick={() => act.lessonCue('gentle')}>
            Gentle toss<small>G</small>
          </button>
          <button className="action" disabled={busy} onClick={() => act.lessonCue('full')}>
            Big throw<small>F</small>
          </button>
        </>
      )}
      {l.lesson === 'stop' && (
        <button className="action" disabled={busy} onClick={() => act.lessonCue()}>
          {l.phase === 'idle' ? 'Throw' : 'Whistle'}
          <small>F</small>
        </button>
      )}
      {l.lesson === 'cast' && (
        <>
          <button className="action" disabled={busy} onClick={() => act.lessonCue('left')}>
            Left<small>1</small>
          </button>
          <button className="action" disabled={busy} onClick={() => act.lessonCue('back')}>
            Back<small>2</small>
          </button>
          <button className="action" disabled={busy} onClick={() => act.lessonCue('right')}>
            Right<small>3</small>
          </button>
        </>
      )}
      <button className="action primary" disabled={busy} onClick={act.yes}>
        Yes!<small>Space</small>
      </button>
    </div>
  );
}

function Keys({ snap }: { snap: HudSnapshot }) {
  const text =
    snap.kind === 'home'
      ? 'WASD walk · Shift jog · E use · F pat your dog · R call · drag or Q to look'
      : snap.kind === 'herding'
        ? "A: Come by (left) · D: Away (right) · W: Walk up · Space or S: Lie down · R: That'll do"
        : snap.kind === 'agility'
          ? 'Run: click the ground, or W A D · Space: Go / Go on · R: Here · F: Easy'
          : snap.kind === 'lesson'
            ? 'Space: Yes! · F: cue · drag to look around'
            : snap.kind === 'puppies'
              ? snap.puppies?.mode === 'evaluate'
                ? 'Say what you saw: 1 keen · 2 unsure · 3 worried'
                : 'Space: Good pup! · X: make it easier'
              : snap.kind === 'search'
                ? 'WASD walk · click: search here · Space: show me · X: search on · R: here'
                : 'WASD walk · click: send / throw / direct · Space whistle · R here · F sit · T throw';
  return <div className="keys card">{text}</div>;
}

/** Touch joystick: drag the knob to walk; push to the edge to jog. */
function Stick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let dy = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    input.stick.x = dx;
    input.stick.y = -dy;
    setKnob({ x: dx * 36, y: dy * 36 });
  };
  const end = () => {
    active.current = null;
    input.stick.x = 0;
    input.stick.y = 0;
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div
      ref={base}
      className="stick"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
