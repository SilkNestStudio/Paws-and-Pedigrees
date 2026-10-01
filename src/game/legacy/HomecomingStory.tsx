import { useEffect, useRef, useState } from 'react';

const memories = [
  {
    image: 'grandpa',
    alt: 'Grandpa kneels beside a sable shepherd and a black-and-white collie in the warm evening light outside his kennel.',
    caption: 'Grandpa. Always happiest with his dogs.',
    chapter: 'The man behind the name',
    title: 'Before it was yours.',
    paragraphs: [
      'To everyone else, he was the man who raised champions. To you, he was Grandpa. Mud on his boots, a lead by the door, and always time for one more dog.',
      'He knew their little habits before he knew their strengths. The quiet ones. The stubborn ones. The ones nobody else had given a chance. That was where every good partnership began.',
    ],
  },
  {
    image: 'championship-years',
    alt: 'The kennel in its thriving years: flowering courtyard, championship ribbons, a handler playing with a collie, and puppies in a nursery garden.',
    caption: 'The courtyard, in its championship years.',
    chapter: 'More than a trophy cabinet',
    title: 'A legacy takes generations.',
    paragraphs: [
      'There was a time when these runs were full and this kennel’s name meant something at every competition. Behind every ribbon were ordinary days: feeding, learning, training, and trying again.',
      'Grandpa kept it all in his ledger. Each dog’s strengths. The pairings he chose. The litters he raised. Champions grew older, and a new generation carried the kennel forward.',
    ],
  },
  {
    image: 'inheritance',
    alt: 'Two brass keys rest on Grandpa’s worn ledger beside a letter and an old trophy. Beyond the doorway, the courtyard is quiet.',
    caption: 'His ledger. Your keys. An unfinished story.',
    chapter: 'The inheritance',
    title: 'He left it to you.',
    paragraphs: [
      'Now Grandpa has passed away. He left you the kennel, his notes, and the chance to give this place a future. The dogs of his championship years are memories now. The runs are quiet.',
      'There’s a little money, some food in the cupboard, and plenty to mend. You won’t rebuild it all today. Start with one place to call home—and a rescue dog who needs one.',
    ],
  },
];

export default function HomecomingStory({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const memory = memories[page];
  const last = page === memories.length - 1;

  useEffect(() => {
    root.current?.closest('dialog')?.scrollTo({ top: 0 });
    // Warm only the next picture; the world and first image take priority on arrival.
    const next = memories[page + 1];
    if (next) { const image = new Image(); image.src = `/story/homecoming/${next.image}.jpg`; }
  }, [page]);

  return <div className="legacy-story" ref={root}>
    <figure className="legacy-story-picture">
      <img key={memory.image} src={`/story/homecoming/${memory.image}.jpg`} alt={memory.alt} width="1536" height="1024" decoding="async"/>
      <figcaption>{memory.caption}</figcaption>
      <span className="legacy-story-brand" aria-hidden="true">Paws & Pedigrees<span>Homecoming</span></span>
    </figure>
    <div className="legacy-story-panel">
      <div className="legacy-story-top"><span className="legacy-eyebrow">A story to carry forward</span><button className="legacy-story-skip" disabled={!ready} onClick={onFinish}>Skip intro</button></div>
      <div className="legacy-story-copy" aria-live="polite" aria-atomic="true">
        <span className="legacy-story-chapter">{String(page + 1).padStart(2, '0')} / {memory.chapter}</span>
        <h2 id="legacy-panel-title">{memory.title}</h2>
        {memory.paragraphs.map(p => <p key={p}>{p}</p>)}
        {last && <p className="legacy-story-next"><span>Your first step</span>Find Grandpa’s ledger on the workbench outside the kennel.</p>}
      </div>
      <footer className="legacy-story-footer">
        <div className="legacy-story-progress"><span aria-label={`Part ${page + 1} of ${memories.length}`}>{memories.map((m, i) => <i key={m.image} className={i === page ? 'is-current' : ''}/>)}</span><span>{page + 1} of {memories.length}</span></div>
        <div className="legacy-story-actions">
          <button className="legacy-story-back" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Back</button>
          <button className="legacy-primary" disabled={last && !ready} onClick={() => last ? onFinish() : setPage(p => p + 1)}>{last ? ready ? 'Step into the courtyard' : 'Opening the gate…' : 'Continue'}{!last && <span aria-hidden="true">→</span>}</button>
        </div>
        <small>Take your time. You can revisit these memories in your journal.</small>
      </footer>
    </div>
  </div>;
}
