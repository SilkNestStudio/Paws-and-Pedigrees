import { LETTER_PAGES } from '../game/story';
import { useApp } from '../app/store';
import { advanceDialog, continueGame, finishLetter, startNewGame } from '../app/flow';

/** Title screen, Grandpa's letter, and the dialogue box. */
export function Story() {
  const screen = useApp((s) => s.screen);
  const dialog = useApp((s) => s.dialog);
  return (
    <>
      {screen.kind === 'title' && <Title />}
      {screen.kind === 'letter' && <Letter page={screen.page} />}
      {dialog && <DialogBox />}
    </>
  );
}

function Title() {
  const game = useApp((s) => s.game);
  return (
    <div className="title-screen">
      <div className="title-card">
        <div className="kicker">A kennel story</div>
        <h1>Paws &amp; Pedigrees</h1>
        <p>
          Grandpa left you his old championship kennel. Start again with a rescue dog, and build
          something that lasts.
        </p>
        <div className="button-row center">
          {game && game.story !== 'letter' && (
            <button className="button big" onClick={continueGame}>
              Continue · day {game.day}
            </button>
          )}
          <button
            className={`button big ${game && game.story !== 'letter' ? 'secondary' : ''}`}
            onClick={() =>
              game &&
              game.story !== 'letter' &&
              !confirm('Start a new game? Your current week will be lost.')
                ? null
                : startNewGame()
            }
          >
            {game && game.story !== 'letter' ? 'New game' : 'Begin'}
          </button>
        </div>
        <div className="title-note">The first week · an early test version</div>
      </div>
    </div>
  );
}

function Letter({ page }: { page: number }) {
  const p = LETTER_PAGES[page]!;
  const last = page === LETTER_PAGES.length - 1;
  return (
    <div className="letter-screen">
      <div className="letter">
        <div className="letter-image" style={{ backgroundImage: `url(${p.image})` }}>
          <div className="caption">{p.caption}</div>
        </div>
        <div className="letter-text">
          <div className="kicker">
            A letter from Grandpa · {page + 1} of {LETTER_PAGES.length}
          </div>
          {p.text.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <div className="button-row">
            {page > 0 && (
              <button
                className="button secondary"
                onClick={() => useApp.setState({ screen: { kind: 'letter', page: page - 1 } })}
              >
                Back
              </button>
            )}
            <button
              className="button"
              onClick={() =>
                last
                  ? finishLetter()
                  : useApp.setState({ screen: { kind: 'letter', page: page + 1 } })
              }
            >
              {last ? 'Go to the kennel' : 'Continue'}
            </button>
            {!last && (
              <button className="link" onClick={finishLetter}>
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DialogBox() {
  const dialog = useApp((s) => s.dialog)!;
  const line = dialog.lines[dialog.index]!;
  const more = dialog.index + 1 < dialog.lines.length;
  return (
    <div className="dialog-wrap" onClick={advanceDialog}>
      <div className={`dialog card speaker-${line.speaker.toLowerCase()}`}>
        <div className="portrait">
          {line.speaker === 'Mara' ? 'M' : line.speaker === 'Grandpa' ? 'G' : 'You'}
        </div>
        <div className="dialog-body">
          <div className="speaker">
            {line.speaker === 'Grandpa' ? "Grandpa's ledger" : line.speaker}
          </div>
          <div className="line">{line.text}</div>
        </div>
        <button className="button small">{more ? 'Next' : 'OK'}</button>
      </div>
    </div>
  );
}
