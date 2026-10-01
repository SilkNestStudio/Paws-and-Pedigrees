import { useCallback, useEffect, useRef, useState } from 'react';
import { type Journey } from './journey';
import { journeyRepository, type JourneyRepository } from './journeyRepository';

export function useJourney(repository: JourneyRepository = journeyRepository) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [status, setStatus] = useState('Loading your Homecoming save…');
  const [error, setError] = useState('');
  const revision = useRef(0), queue = useRef(Promise.resolve()), failed = useRef(false), loaded = useRef(false), requested = useRef(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    repository.load().then(record => {
      if (!active) return;
      revision.current = record.revision; loaded.current = true; setJourney(record.journey); setStatus('Saved on this browser');
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not open your Homecoming save.'); });
    return () => { active = false; };
  }, [repository]);
  useEffect(() => {
    if (!loaded.current || !journey) return;
    if (failed.current) { setStatus('Not saved'); return; }
    const request = ++requested.current;
    setStatus('Saving…');
    queue.current = queue.current.then(async () => {
      if (failed.current) return;
      try { revision.current = await repository.save(journey, revision.current); if (request === requested.current) setStatus('Saved on this browser'); }
      catch (cause) { failed.current = true; setStatus('Not saved'); setError(cause instanceof Error ? cause.message : 'Could not save your progress.'); }
    });
  }, [journey, repository, retry]);
  const update = useCallback((change: (current: Journey) => Journey) => setJourney(current => current ? change(current) : current), []);
  function retrySave() { failed.current = false; setError(''); setRetry(n => n + 1); }
  function backup() {
    if (!journey) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(journey, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'homecoming-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { journey, update, status, error, retrySave, backup };
}
