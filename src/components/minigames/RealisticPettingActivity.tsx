import { useEffect, useRef, useState } from 'react';
import type { Dog } from '../../types';
import { rescueBreeds } from '../../data/rescueBreeds';
import { shopBreeds } from '../../data/shopBreeds';
import { getDogImage } from '../../utils/dogImages';
interface Props { dog: Dog; onComplete: () => void; onCancel: () => void; }
const moments = ['Give them a moment to settle.', 'They are getting comfortable with you.', 'Stay a little longer. There is no rush.', 'A quiet moment, shared.'];
export default function RealisticPettingActivity({ dog, onComplete, onCancel }: Props) {
 const [seconds, setSeconds] = useState(0);
 const [holding, setHolding] = useState(false);
 const completed = useRef(false);
 const dialog = useRef<HTMLDivElement>(null);
 useEffect(() => {
   const previous = document.activeElement as HTMLElement | null;
   dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
   return () => { if (previous?.isConnected) previous.focus(); };
 }, []);
 const ready = seconds >= 12;
 const breed = [...rescueBreeds, ...shopBreeds].find(b => b.id === dog.breed_id);
 useEffect(() => {
   const release = () => setHolding(false);
   window.addEventListener('blur', release);
   document.addEventListener('visibilitychange', release);
   return () => { window.removeEventListener('blur',release); document.removeEventListener('visibilitychange',release); };
 }, []);
 useEffect(() => {
   if (!holding || ready) return;
   let previous = performance.now();
   const timer = setInterval(() => {
     const now = performance.now(); const delta = Math.min(.15, (now-previous)/1000); previous = now;
     setSeconds(value => Math.min(12, value+delta));
   },100);
   return () => clearInterval(timer);
 }, [holding, ready]);
 return <div ref={dialog} className="quiet-time" role="dialog" aria-modal="true" aria-label={'Quiet time with '+dog.name} onKeyDown={event => { if(event.key==='Escape') onCancel(); if(event.key==='Tab') { const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button'); if (!buttons?.length) return; const first = buttons[0], last = buttons[buttons.length-1]; if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();} else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();} } }}><section><div className="quiet-time-heading"><p className="club-eyebrow">TIME WELL SPENT</p><button onClick={onCancel} aria-label="Leave quiet time">Close</button></div><h2>Just you and {dog.name}.</h2><p>Hold the button to offer gentle attention. Release whenever you like.</p><div className={'quiet-time-portrait '+(holding&&!ready?'is-petting':'')}><img src={getDogImage(breed?.name || 'Mixed Breed','Sitting')} alt={dog.name}/><span aria-live="polite">{moments[Math.min(3,Math.floor(seconds/4))]}</span></div><progress aria-label="Time spent bonding" max={12} value={seconds}/>{ready ? <button className="club-button" autoFocus onClick={() => { if(completed.current) return; completed.current=true; onComplete(); }}>Finish your quiet time</button> : <button className="quiet-time-hold" style={{touchAction:'none'}} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setHolding(true); }} onPointerUp={() => setHolding(false)} onPointerCancel={() => setHolding(false)} onLostPointerCapture={() => setHolding(false)} onKeyDown={event => { if(event.code==='Space'||event.code==='Enter'){event.preventDefault();setHolding(true);} }} onKeyUp={event => { if(event.code==='Space'||event.code==='Enter'){event.preventDefault();setHolding(false);} }} onBlur={() => setHolding(false)}>{holding?'Enjoying your company...':'Hold to offer gentle attention'}</button>}<small>{ready ? 'The bond reward is applied when you finish.' : 'Mouse, touch, or hold Space on the button. Leaving early gives no reward.'}</small></section></div>;
}
