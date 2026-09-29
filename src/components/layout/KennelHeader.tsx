import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getKennelCapacity } from '../../utils/kennelCapacity';
import { getLevelProgress } from '../../utils/levelProgression';
import { flushLocalSave } from '../../lib/storage/localDatabase';
import { isLocalMode } from '../../lib/storage/config';
import SettingsDropdown from './SettingsDropdown';
import KennelEmblem, { kennelColors } from './KennelEmblem';
import './kennelHeader.css';

export default function KennelHeader({currentView,onSignOut,onNavigate}:{currentView:string;onSignOut:()=>Promise<void>;onNavigate:(view:string)=>void}) {
 const {user,dogs,selectedDog,setKennelIdentity}=useGameStore();
 const [panel,setPanel]=useState<'identity'|'account'|null>(null),[name,setName]=useState(''),[emblem,setEmblem]=useState('paw'),[color,setColor]=useState('copper'),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close();},[panel]);
 if(!user)return null;
 const living=dogs.filter(d=>!d.is_dead),dog=living.find(d=>d.id===selectedDog?.id)??living[0],progress=getLevelProgress(user.xp);
 const edit=()=>{setName(user.kennel_name);setEmblem(user.kennel_emblem??'paw');setColor(user.kennel_color??'copper');setMessage('');setPanel('identity');};
 return <><header className="club-topbar kennel-topbar">
   <button className="kennel-identity-button" aria-label="Customize kennel name and emblem" onClick={edit}><KennelEmblem emblem={user.kennel_emblem} color={user.kennel_color}/><span><small>YOUR KENNEL · EDIT IDENTITY</small><strong>{user.kennel_name}</strong></span></button>
   <div className="club-balances kennel-resources"><div><span>Balance</span><strong>${user.cash.toLocaleString()}</strong></div><div><span>Pantry food</span><strong>{user.food_storage.toFixed(1)} <small>units</small></strong></div><div><span>Kennel · level {user.kennel_level}</span><strong>{living.length}/{getKennelCapacity(user.kennel_level)} <small>dogs</small></strong></div><button className="kennel-account-button" onClick={()=>setPanel('account')}>Keeper & wallet</button><SettingsDropdown onSignOut={onSignOut}/></div>
   <div className="kennel-care-strip" aria-label="Active companion needs">{dog?<><label>With you<select disabled={['demo3d','training','competition'].includes(currentView)} aria-label="Active companion" value={dog.id} onChange={e=>useGameStore.getState().selectDog(living.find(d=>d.id===e.target.value)!)}>{living.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>{[['Food',dog.hunger],['Water',dog.thirst],['Energy',dog.energy_stat]].map(([label,value])=><div key={label} className={Number(value)<=35?'needs-attention':''}><span>{label} <strong>{Math.round(Number(value))}%</strong></span><meter aria-label={`${dog.name} ${label}`} min={0} max={100} value={Number(value)}/></div>)}<button onClick={()=>onNavigate('demo3d')}>Go to the yard</button></>:<span>No living companion selected.</span>}<small>Water refills are free.</small></div>
 </header>
 <dialog ref={dialog} className="kennel-dialog" aria-labelledby="kennel-panel-title" onCancel={()=>setPanel(null)}><button className="kennel-dialog-close" aria-label="Close kennel panel" onClick={()=>setPanel(null)}>Close</button>
 {panel==='identity'?<form onSubmit={async e=>{e.preventDefault();setSaving(true);const result=setKennelIdentity(name,emblem,color);setMessage(result.message);if(result.success&&isLocalMode){try{await flushLocalSave();}catch{setMessage('Changed in this session, but saving failed. Keep this tab open and export a backup.');}}setSaving(false);}}>
 <span className="journey-eyebrow">A HOME WITH YOUR NAME ON IT</span><h2 id="kennel-panel-title">Make it your kennel.</h2><div className="kennel-identity-preview"><KennelEmblem emblem={emblem} color={color} size={70}/><strong>{name||'Your kennel'}</strong></div>
 <label className="kennel-name-field">Kennel name<input autoFocus required minLength={2} maxLength={36} value={name} onChange={e=>setName(e.target.value)}/></label><fieldset><legend>Choose your emblem</legend><div className="kennel-design-options">{['paw','mountain','star','oak'].map(item=><button type="button" key={item} aria-pressed={emblem===item} onClick={()=>setEmblem(item)}><KennelEmblem emblem={item} color={color}/>{item}</button>)}</div></fieldset><fieldset><legend>Choose your colors</legend><div className="kennel-design-options">{Object.keys(kennelColors).map(item=><button type="button" key={item} aria-pressed={color===item} onClick={()=>setColor(item)}><KennelEmblem emblem={emblem} color={item} size={28}/>{item}</button>)}</div></fieldset><p>These choices are free. Your name and crest appear on the kennel's wall banner and header.</p><button className="journey-primary" disabled={saving} type="submit">{saving?'Saving…':'Save kennel identity'}</button><p role="status">{message}</p></form>:<section><span className="journey-eyebrow">YOUR KEEPER RECORD</span><h2 id="kennel-panel-title">Keeper & wallet</h2><h3>Keeper level {progress.currentLevel}</h3><progress aria-label="Keeper XP" value={progress.xpInCurrentLevel} max={progress.xpNeededForNext}/><p>{progress.xpInCurrentLevel} / {progress.xpNeededForNext} XP toward level {progress.nextLevel}.</p><p>Keeper XP exists, but the current game awards it through a limited set of actions and rewards. Daily dog care builds your dog's bond; it does not currently award keeper XP. Kennel expansion is a separate cash upgrade.</p><h3>{user.gems} gems</h3><p>Gems can fund training-point refills and gem-priced shop or breeding options when unlocked. They are game currency here; there is no real-money checkout.</p></section>}
 </dialog></>;
}
