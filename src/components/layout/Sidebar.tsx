import { useGameStore } from '../../stores/gameStore';
import { lessonViewUnlocked, apprenticeshipComplete } from '../../utils/firstRibbon';
import { memo } from 'react';
import NavIcon from './NavIcon';
interface SidebarProps { currentView: string; onViewChange: (view: string) => void; }
const items = [['hub','Kennel home'],['demo3d','Time together'],['kennel','My dogs'],['office','Our story'],['competition','Compete'],['breeding','Build a legacy'],['training','Training'],['jobs','Work'],['shop','Supplies'],['vet','Veterinary']];
function Sidebar({ currentView, onViewChange }: SidebarProps) {
 const progress=useGameStore(s=>s.tutorialProgress);
 return <aside className="club-sidebar">
   <div className="club-brand"><span className="club-brand-mark"><NavIcon name="kennel" size={30} /></span><div>Paws &amp;<br/>Pedigrees<span>A LITTLE CARE. A LASTING LEGACY.</span></div></div>
   <p className="club-nav-caption">YOUR KENNEL</p>
   <nav aria-label="Main navigation">{items.filter(([id])=>apprenticeshipComplete(progress)||['hub','office','demo3d','kennel'].includes(id)).map(([id,label]) => <button key={id} disabled={!lessonViewUnlocked(progress,id)} className={'club-nav-item inline-button ' + (currentView === id || id === 'kennel' && currentView === 'dogDetail' ? 'is-active' : '')} aria-current={currentView === id ? 'page' : undefined} onClick={() => onViewChange(id)}><NavIcon name={id}/><span>{label}{!lessonViewUnlocked(progress,id)&&<small style={{display:'block',fontSize:9}}>{id==='training'?'After your care lessons':'After your apprenticeship'}</small>}</span></button>)}</nav>
   <div className="club-sidebar-note"><span>FROM RESCUE TO REMARKABLE</span><p>Great champions start<br/>with a little connection.</p><NavIcon name="breeding" size={25}/></div>
 </aside>;
}
export default memo(Sidebar);
