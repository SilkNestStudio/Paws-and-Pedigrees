import { lazy, Suspense, useState } from 'react';
const AgilityGame = lazy(() => import('./AgilityGame'));

/** Standalone practice never mounts auth, the persisted store, or cloud services. */
export default function PracticeView() {
  const [session, setSession] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  if (result !== null) return <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
    <div className="max-w-md text-center"><p className="text-amber-300 uppercase tracking-widest text-xs">Meadow practice</p>
      <h1 className="text-3xl font-bold my-4">A good day on the course</h1><p className="text-slate-300">Performance: {result.toFixed(2)}×. Practice does not change your kennel or award currency.</p>
      <button className="bg-amber-300 text-slate-950 rounded-xl p-3 font-bold my-5" onClick={() => { setResult(null); setSession(n => n + 1); }}>Run again</button>
      <a className="block text-slate-300 underline" href="/">Go to my kennel</a>
    </div>
  </main>;
  return <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white p-8">Preparing the meadow…</div>}>
    <AgilityGame key={session} dogName="Scout" onComplete={setResult} onCancel={() => { window.location.href = '/'; }} />
  </Suspense>;
}
