import { useEffect, useRef, useState } from 'react';
import { coatOf } from '../core/dog/dog';
import { wrapAngle } from '../core/math';
import { createTrainingField } from '../sim/field';
import { LESSONS } from '../sim/training';
import { useHud, type HudSnapshot } from '../app/hud';
import { useGame } from '../app/store';
import { input } from '../app/input';
import * as act from '../app/actions';

const FIELD = createTrainingField();
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export function Hud() {
  const snap = useHud((s) => s.snap);
  const panel = useGame((s) => s.panel);
  if (!snap) return null;
  return (
    <div className="hud">
      <DogChip snap={snap} />
      <TopCentre snap={snap} />
      <TopRight snap={snap} />
      {snap.lesson && <LessonPanel snap={snap} />}
      {snap.lesson?.feedback && <Coach snap={snap} />}
      {panel === 'none' && snap.hint && <div className="hint card">{snap.hint}</div>}
      {panel === 'none' && <Actions snap={snap} />}
      {snap.kind === 'field' && (isTouch ? <Stick /> : <Keys snap={snap} />)}
      {snap.kind === 'lesson' && !isTouch && <Keys snap={snap} />}
    </div>
  );
}

function DogChip({ snap }: { snap: HudSnapshot }) {
  const dog = useGame((s) => s.activeDog());
  const coat = coatOf(dog);
  const swatch =
    coat.base === 'eumelanin' && !coat.points
      ? coat.eumelanin
      : coat.points
        ? `linear-gradient(135deg, ${coat.eumelanin} 55%, ${coat.pheomelanin} 55%)`
        : coat.pheomelanin;
  return (
    <div className="dog-chip card">
      <div className="swatch" style={{ background: swatch }} />
      <div>
        <div className="name">{snap.dogName}</div>
        <div className="tell">{snap.tell}</div>
      </div>
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

function TopCentre({ snap }: { snap: HudSnapshot }) {
  const rel = snap.wind ? wrapAngle(snap.wind.heading - snap.cameraYaw) : 0;
  return (
    <div className="top-centre">
      {snap.wind && (
        <div
          className="wind card"
          title="The arrow shows where the wind is blowing, relative to your view. Scent drifts the same way."
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
          {windWords(snap.wind.strength)}
        </div>
      )}
      <div className="events">
        {snap.field &&
          snap.events
            .slice(-2)
            .map((e) => <FadingEvent key={`${e.time}-${e.text}`} text={e.text} tone={e.tone} />)}
      </div>
    </div>
  );
}

function FadingEvent({ text, tone }: { text: string; tone: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(t);
  }, []);
  return visible ? <div className={`event card ${tone}`}>{text}</div> : null;
}

function TopRight({ snap }: { snap: HudSnapshot }) {
  const [showMap, setShowMap] = useState(!isTouch);
  return (
    <div className="top-right">
      <button className="icon-button" onClick={act.openBook}>
        Field book
      </button>
      {snap.field && (
        <button className="icon-button" onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'Hide map' : 'Map'}
        </button>
      )}
      {snap.field && showMap && <MiniMap snap={snap} />}
    </div>
  );
}

function MiniMap({ snap }: { snap: HudSnapshot }) {
  const f = snap.field!;
  const w = FIELD.maxX - FIELD.minX;
  const h = FIELD.maxZ - FIELD.minZ;
  const rel = snap.wind ? snap.wind.heading : 0;
  return (
    <div className="minimap card">
      <svg viewBox={`${FIELD.minX} ${FIELD.minZ} ${w} ${h}`}>
        <rect x={FIELD.minX} y={FIELD.minZ} width={w} height={h} fill="#8fb35f" />
        {FIELD.cover.map((c, i) => (
          <circle
            key={i}
            cx={c.center.x}
            cy={c.center.z}
            r={c.radius}
            fill="#b6ad5c"
            opacity={0.85}
          />
        ))}
        {FIELD.trees.map((t, i) => (
          <circle key={i} cx={t.pos.x} cy={t.pos.z} r={3} fill="#3f6a33" />
        ))}
        {f.trace.length > 1 && (
          <polyline
            points={f.trace.map((p) => `${p.x},${p.z}`).join(' ')}
            fill="none"
            stroke="#fff"
            strokeWidth={1.2}
            strokeOpacity={0.8}
          />
        )}
        {f.items.map((it, i) =>
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
        <circle
          cx={f.keeper.x}
          cy={f.keeper.z}
          r={2.6}
          fill="#22352a"
          stroke="#fff"
          strokeWidth={0.8}
        />
        <circle cx={f.dog.x} cy={f.dog.z} r={2.6} fill="#d9622b" stroke="#fff" strokeWidth={0.8} />
        <g
          transform={`translate(${FIELD.maxX - 10} ${FIELD.minZ + 10}) rotate(${(-rel * 180) / Math.PI + 180})`}
        >
          <path d="M0 -7 L4 3 L0 1 L-4 3 Z" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}

function LessonPanel({ snap }: { snap: HudSnapshot }) {
  const l = snap.lesson!;
  const info = LESSONS[l.lesson];
  return (
    <div className="lesson-panel card">
      <h3>{info.title}</h3>
      <p>{info.how}</p>
      <div className="stat-row">
        <span>{snap.dogName}'s skill</span>
        <span>{Math.round(l.skill * 100)}%</span>
      </div>
      <div className="meter">
        <div className="fill" style={{ width: `${l.skill * 100}%` }} />
        <div className="before" style={{ left: `${l.before * 100}%` }} />
      </div>
      <div className="stat-row" style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>
        <span>Treats left: {l.treats}</span>
        <span>Interest: {l.interest > 0.7 ? 'keen' : l.interest > 0.45 ? 'fading' : 'tired'}</span>
      </div>
    </div>
  );
}

function Coach({ snap }: { snap: HudSnapshot }) {
  const f = snap.lesson!.feedback!;
  if (snap.lesson!.time - f.time > 3) return null;
  return <div className={`coach card ${f.tone}`}>{f.text}</div>;
}

function Actions({ snap }: { snap: HudSnapshot }) {
  if (snap.field) {
    const f = snap.field;
    return (
      <div className="actions">
        {f.canThrow && (
          <button className="action" onClick={act.throwsPlease}>
            Throw!<small>T</small>
          </button>
        )}
        {!f.dogAway && !f.free && (
          <button className="action" onClick={act.steady}>
            Sit<small>F</small>
          </button>
        )}
        {f.dogAway && (
          <button className="action" onClick={act.recall}>
            Here!<small>R</small>
          </button>
        )}
        <button className="action primary" onClick={act.whistle}>
          Whistle<small>Space</small>
        </button>
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
  if (snap.lesson) {
    const cue =
      snap.lesson.lesson === 'stop'
        ? 'throw, then whistle'
        : snap.lesson.lesson === 'cast'
          ? 'or 1 2 3: send'
          : 'cue';
    return (
      <div className="keys card">
        <kbd>Space</kbd> Yes! (mark) · <kbd>F</kbd> {cue} · drag to look around
      </div>
    );
  }
  return (
    <div className="keys card">
      <kbd>WASD</kbd> walk · <kbd>Shift</kbd> run · <kbd>Click</kbd> send / throw / direct
      <br />
      <kbd>Space</kbd> whistle · <kbd>R</kbd> here · <kbd>F</kbd> sit · <kbd>Q</kbd>
      <kbd>E</kbd> or drag to turn
    </div>
  );
}

/** Touch joystick: drag the knob to walk; push to the edge to run. */
function Stick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = (clientX - cx) / (rect.width / 2);
    let dy = (clientY - cy) / (rect.height / 2);
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
