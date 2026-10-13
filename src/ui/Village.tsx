import { breedDescription, coatOf, CUE_LABELS, type Dog } from '../core/dog/dog';
import { describe as describeEstimate } from '../core/dog/knowledge';
import { activeDog, type GameState } from '../game/state';
import { ageText, isCupDay, nextCupDay, seasonStartDay } from '../game/calendar';
import { CUP, CUP_ROUND_CUES, cupProblem, cupTeam } from '../game/events';
import { BREEDING } from '../game/breeding';
import { KENNEL_RUNS, mentorBonus, retiredDogs, runsFree, runsUsed } from '../game/kennel';
import { LEDGER_PAGES, LEGACY_PAGE, legacyReady } from '../game/ledger';
import { trophies } from '../game/trophies';
import { isMarketDay, MARKET, marketStock, VET } from '../game/services';
import { useApp } from '../app/store';
import {
  ALBUM_SIZE,
  buySack,
  buyYoungster,
  deletePhoto,
  dogWithTitles,
  go,
  INTROS,
  pickCupDog,
  runDnaTest,
  travel,
  vetCheck,
  vetScan,
} from '../app/flow';
import { Swatch } from './Breeding';

const close = () => useApp.setState({ panel: null });

// ---------------------------------------------------------------------------
// The Hollowmere Cup
// ---------------------------------------------------------------------------

/** The van's row for the Cup: today's entry, or how far off it is and what it takes. */
export function CupRow({ game }: { game: GameState }) {
  const today = isCupDay(game.day);
  const problem = cupProblem(game);
  const days = nextCupDay(game.day) - game.day;
  return (
    <div className={`row ${today && !problem ? 'active' : ''}`}>
      <div className="grow">
        <div className="title">Larkspur: the Hollowmere Cup</div>
        <div className="sub">
          {today
            ? (problem ??
              `Today! Four rounds: a double mark, a water blind, an agility round and sheep. You choose which dog runs each. Entry $${CUP.entryFee}; prizes $${CUP.prizes.join(', $')}.`)
            : `The kennel championship, on the last Sunday of winter (in ${days} day${days === 1 ? '' : 's'}). By invitation: reputation ${CUP.minReputation} or an Open title in any sport, and two dogs fit to run.`}
        </div>
      </div>
      <button
        className="button"
        disabled={!today || !!problem}
        onClick={() => go('Driving to Larkspur…', () => travel('cup'))}
      >
        Enter
      </button>
    </div>
  );
}

/** Before each round of the Cup: who runs it? */
export function CupPickPanel({ game }: { game: GameState }) {
  const ev = useApp((s) => s.event);
  if (!ev || ev.def.kind !== 'cup') return null;
  const index = ev.team.length;
  const round = ev.def.rounds[index];
  if (!round) return null;
  const cues = CUP_ROUND_CUES[round.kind];
  const mine = ev.player.reduce((a, b) => a + b, 0);
  const best = Math.max(0, ...ev.rivals.map((r) => r.reduce((a, b) => a + b, 0)));
  return (
    <div className="panel card">
      <div className="kicker">
        The Hollowmere Cup · round {index + 1} of {ev.def.rounds.length}
      </div>
      <h2>{round.title}</h2>
      <p className="lead">
        Who runs this one? No dog may run more than {CUP.roundsPerDog} rounds.
        {index > 0 && ` So far: you ${mine}, the best of the others ${best}.`}
      </p>
      <div className="list">
        {cupTeam(game).map((d) => {
          const used = ev.team.filter((id) => id === d.id).length;
          return (
            <div key={d.id} className="row">
              <Swatch dog={d} size={36} />
              <div className="grow">
                <div className="title">{dogWithTitles(d)}</div>
                <div className="sub">
                  {cues
                    .map((c) => `${CUE_LABELS[c].name} ${Math.round(d.skills[c] * 100)}%`)
                    .join(' · ')}{' '}
                  · energy {Math.round(d.energy)}%
                </div>
                <div className="sub">
                  {used === 0
                    ? 'Has not run yet today.'
                    : `Has run ${used} round${used > 1 ? 's' : ''} today.`}
                </div>
              </div>
              <button
                className="button"
                disabled={used >= CUP.roundsPerDog}
                onClick={() => go(`Sending ${d.name} to the line…`, () => pickCupDog(d.id))}
              >
                Send {d.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The vet
// ---------------------------------------------------------------------------

export function VetPanel({ game }: { game: GameState }) {
  return (
    <div className="panel card">
      <div className="kicker">The village · Dr Osei's surgery</div>
      <h2>The vet</h2>
      <p className="lead">
        You have <b>${game.money}</b>. A visit doesn't use up the day.
      </p>
      <div className="list">
        {game.dogs.map((d) => {
          const pregnancy = game.pregnancies.find((p) => p.damId === d.id);
          const known = game.knowledge[d.id] ?? {};
          return (
            <div key={d.id} className="row">
              <Swatch dog={d} size={36} />
              <div className="grow">
                <div className="title">{dogWithTitles(d)}</div>
                <div className="sub">
                  {ageText(d.ageMonths)} · speed {describeEstimate(known.speed).toLowerCase()} ·
                  stamina {describeEstimate(known.stamina).toLowerCase()}
                </div>
                {pregnancy && (
                  <div className="sub">
                    In whelp, due day {pregnancy.dueDay}
                    {pregnancy.scanned !== undefined
                      ? `: ${pregnancy.scanned} puppies on the scan.`
                      : '.'}
                  </div>
                )}
              </div>
              <div className="button-col">
                <button
                  className="button secondary small"
                  disabled={game.money < VET.healthCheck}
                  onClick={() => vetCheck(d.id)}
                  title="Measures speed, agility, stamina and power exactly"
                >
                  Check-up ${VET.healthCheck}
                </button>
                <button
                  className="button secondary small"
                  disabled={d.dnaTested || game.money < BREEDING.dnaTestCost}
                  onClick={() => runDnaTest(d.id)}
                  title="Shows the coat genes this dog carries"
                >
                  {d.dnaTested ? 'DNA tested' : `DNA test $${BREEDING.dnaTestCost}`}
                </button>
                {pregnancy && pregnancy.scanned === undefined && (
                  <button
                    className="button secondary small"
                    disabled={game.money < VET.scan}
                    onClick={() => vetScan(d.id)}
                  >
                    Scan ${VET.scan}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="small">
        A check-up measures speed, agility, stamina and power exactly. A DNA test shows coat genes,
        for forecasting puppies' colours. A scan counts the puppies on the way.
      </p>
      <div className="button-row">
        <button className="button secondary" onClick={close}>
          Drive home
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The breeders' market
// ---------------------------------------------------------------------------

export function MarketPanel({ game }: { game: GameState }) {
  const open = isMarketDay(game.day);
  const next = seasonStartDay(game.day) + 7 - game.day;
  const stock = open ? marketStock(game) : [];
  const free = runsFree(game);
  return (
    <div className="panel card">
      <div className="kicker">The village · breeders' market</div>
      <h2>{open ? 'Youngsters for sale' : 'No market today'}</h2>
      {!open && (
        <p className="lead">
          The breeders set up on the first two days of each season (Monday and Tuesday). The next
          market is in {next} day{next === 1 ? '' : 's'}.
        </p>
      )}
      {open && (
        <>
          <p className="lead">
            You have <b>${game.money}</b> and {free} free run{free === 1 ? '' : 's'}. Each youngster
            is by a proven stud, with its pedigree. Different stock every season.
          </p>
          <div className="list">
            {stock.map((lot, i) => (
              <MarketLot key={lot.dog.id} lot={lot} index={i} money={game.money} free={free} />
            ))}
            <div className="row">
              <div className="grow">
                <div className="title">Sack of kibble</div>
                <div className="sub">{MARKET.bulkMeals} meals at the market price.</div>
              </div>
              <span className="badge">${MARKET.bulkCost}</span>
              <button className="button" disabled={game.money < MARKET.bulkCost} onClick={buySack}>
                Buy
              </button>
            </div>
          </div>
        </>
      )}
      <div className="button-row">
        <button className="button secondary" onClick={close}>
          Drive home
        </button>
      </div>
    </div>
  );
}

function MarketLot({
  lot,
  index,
  money,
  free,
}: {
  lot: ReturnType<typeof marketStock>[number];
  index: number;
  money: number;
  free: number;
}) {
  const d: Dog = lot.dog;
  return (
    <div className={`row ${lot.sold ? 'muted' : ''}`}>
      <Swatch dog={d} size={40} />
      <div className="grow">
        <div className="title">
          {d.name} · {d.sex}, {ageText(d.ageMonths)}
        </div>
        <div className="sub">
          {breedDescription(d)} · {coatOf(d).name} · from {lot.seller}
        </div>
        <div className="sub">{lot.blurb}</div>
      </div>
      <span className="badge">${lot.price}</span>
      <button
        className="button"
        disabled={lot.sold || money < lot.price || free <= 0}
        onClick={() => go(`Driving home with ${d.name}…`, () => buyYoungster(index))}
      >
        {lot.sold ? 'Sold' : free <= 0 ? 'No free run' : 'Buy'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grandpa's torn pages, the farmhouse, and the help pages
// ---------------------------------------------------------------------------

/** The office tab for the torn pages of Grandpa's ledger. */
export function TornPages({ game }: { game: GameState }) {
  const found = LEDGER_PAGES.filter((p) => game.ledger.includes(p.id));
  const missing = LEDGER_PAGES.filter((p) => !game.ledger.includes(p.id));
  const home = game.ledger.includes(LEGACY_PAGE.id);
  return (
    <div>
      <p className="lead">
        Pages have been torn from the back of the ledger. {found.length} of {LEDGER_PAGES.length}{' '}
        found.
      </p>
      <ul className="notes">
        {found.map((p) => (
          <li key={p.id}>
            <b>{p.title}.</b> "{p.text}"
          </li>
        ))}
        {home && (
          <li className="discovery">
            <b>{LEGACY_PAGE.title}.</b> {LEGACY_PAGE.text}
          </li>
        )}
        {missing.map((p) => (
          <li key={p.id} className="muted">
            A page is missing. {p.hint}
          </li>
        ))}
        {!missing.length && !home && (
          <li className="good">
            {legacyReady(game)
              ? 'Every page found. Ned Pennock had the bitch with the white toe: take the pages up to Fell Top (the van) and show Sam.'
              : "Every page found. Ned Pennock had the bitch with the white toe. Work Sam's sheep at Fell Top once, then show him the pages."}
          </li>
        )}
      </ul>
    </div>
  );
}

/** Who is by the stove, and what they are worth to the youngsters. */
export function FiresideNote({ game }: { game: GameState }) {
  const old = retiredDogs(game);
  if (!old.length) return null;
  const bonus = Math.round(mentorBonus(game) * 100);
  return (
    <p className="small">
      By the stove: {old.map((d) => dogWithTitles(d)).join(', ')}. With the old hands about, your
      working dogs learn {bonus}% faster. {runsUsed(game)} of {KENNEL_RUNS} runs in use.
    </p>
  );
}

const TROPHY_MARKS = { cup: '🏆', title: '🎖', rosette: '🏵', keepsake: '✦' } as const;

/** The farmhouse wall: what the kennel has won, and the photographs you have taken. */
export function AlbumPanel({ game }: { game: GameState }) {
  const shelf = trophies(game);
  return (
    <div className="panel card">
      <div className="kicker">The farmhouse</div>
      <h2>Trophy shelf and album</h2>
      <h3>On the shelf</h3>
      <ul className="notes">
        {shelf.length === 0 && (
          <li>Bare, for now. Rosettes, titles and the Cup itself will stand here.</li>
        )}
        {shelf.map((t, i) => (
          <li key={i} className={t.kind === 'cup' ? 'discovery' : t.kind === 'title' ? 'good' : ''}>
            {TROPHY_MARKS[t.kind]} {t.text}
          </li>
        ))}
      </ul>
      <h3>
        The album ({game.photos.length} of {ALBUM_SIZE})
      </h3>
      {game.photos.length === 0 && (
        <p className="small">
          No photographs yet. Press "Photo" at the top right of the screen any time you want to keep
          a moment.
        </p>
      )}
      <div className="album">
        {game.photos.map((p, i) => (
          <figure key={`${p.day}-${i}`}>
            <img src={p.image} alt={p.caption} />
            <figcaption>
              {p.caption}{' '}
              <button className="link" onClick={() => deletePhoto(i)}>
                Remove
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="button-row">
        <button className="button secondary" onClick={() => useApp.setState({ panel: 'bed' })}>
          Back
        </button>
      </div>
    </div>
  );
}

/** Every how-to card in one place. */
export function HelpPanel() {
  const order = [
    'home',
    'lesson',
    'mark',
    'blind',
    'search',
    'water',
    'trials',
    'agility',
    'herding',
    'shows',
    'breeding',
    'puppies',
    'evaluation',
  ];
  return (
    <div className="panel card">
      <div className="kicker">How to play</div>
      <h2>The kennel handbook</h2>
      <p className="lead">
        Every guide card in one place. The goal card at the top left always says what to do next,
        and the orange arrow points the way.
      </p>
      {order.map((key, i) => {
        const card = INTROS[key];
        if (!card) return null;
        return (
          <details key={key} open={i === 0} className="help">
            <summary>{card.title}</summary>
            <ul className="steps">
              {card.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>
        );
      })}
      <details className="help">
        <summary>The week, the seasons and the year</summary>
        <ul className="steps">
          <li>
            A dog can work until it is tired, and every dog has its own energy: when one is worn
            out, take another out at the kennel runs. A night's sleep restores most of it (less for
            a hungry dog). Go to bed at the farmhouse door to start the next day.
          </li>
          <li>
            Saturday: agility show and sheepdog trial. Sunday: field trial at Larkspur. The first
            two days of each season: the breeders' market.
          </li>
          <li>
            Seven days make a season and every dog ages three months with each. The Hollowmere Cup
            is run on the last Sunday of winter.
          </li>
          <li>
            Old dogs slow down from nine and can retire to the farmhouse from seven: they free a run
            and help the youngsters learn. No dog ever dies.
          </li>
        </ul>
      </details>
      <div className="button-row">
        <button className="button" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}

/** The dog walking out with you, for panels that need a name. */
export const withYou = (game: GameState): string => activeDog(game)?.name ?? 'your dog';
