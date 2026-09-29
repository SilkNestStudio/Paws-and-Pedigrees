import KennelBriefing from './KennelBriefing';
import { useGameStore } from '../../stores/gameStore';
import { rescueBreeds } from '../../data/rescueBreeds';
import { shopBreeds } from '../../data/shopBreeds';
import { getDogImage } from '../../utils/dogImages';
import { storyChapters } from '../../data/storyChapters';
import InventoryPanel from './InventoryPanel';
import NavIcon from '../layout/NavIcon';
import heroDog from '../../assets/images/dogs/GoldenRetrieverSitting.png';
type View = 'kennel' | 'dogDetail' | 'office' | 'story' | 'training' | 'competition' | 'breeding' | 'jobs' | 'shop' | 'vet' | 'demo3d';
interface OfficeDashboardProps { onNavigate: (view: View, options?: { shopTab?: 'breeds' | 'items' | 'pound' }) => void; }
export default function OfficeDashboard({ onNavigate }: OfficeDashboardProps) {
 const { user, dogs, selectDog, storyProgress } = useGameStore();
 const living = dogs.filter(d => !d.is_dead);
 const needsCare = living.filter(d => d.hunger < 50 || d.thirst < 50 || d.happiness < 50 || d.health < 50 || d.energy_stat < 50);
 const pregnancies = living.filter(d => d.is_pregnant);
 const wins = (user?.competition_wins_local || 0) + (user?.competition_wins_regional || 0) + (user?.competition_wins_national || 0);
 const chapter = storyChapters.find(c => c.id === storyProgress.currentChapter);
 return <div className="club-dashboard">
   <div className="club-page-heading"><div><p className="club-eyebrow">THE EVERYDAY ADVENTURE</p><h2>A good day starts here.</h2><p>A little care today. A remarkable companion for life.</p></div><span className="club-date">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</span></div>
   <section className="ribbon-guide" aria-label="Your next kennel goal"><p className="ribbon-eyebrow">YOUR NEXT MILESTONE</p><h2>{(user?.kennel_level??1)<2?'Build a stable home before expanding.':'Prepare your next generation.'}</h2><p>{(user?.kennel_level??1)<2?'Keep food and care funded, practice with your rescue, and save $500 for kennel level 2. Choose suitable jobs for income; check competition fees and eligibility before entering.':'Keep developing your dogs. Breeding needs healthy, bonded adults, the fee, and at least three free nursery spaces. Champion parents do not guarantee champion puppies.'}</p><div className="ribbon-guide-actions"><button onClick={()=>onNavigate('demo3d')}>Check my dog first</button><button onClick={()=>onNavigate('jobs')}>Find suitable work</button><button onClick={()=>onNavigate('competition')}>Review upcoming events</button></div></section>
   <section className="club-hero" aria-label="Welcome to your kennel"><div className="club-hero-copy"><span className="club-pill">BUILT ON BOND, NOT JUST BLOODLINE</span><h2>Small beginnings.<br/><em>Extraordinary dogs.</em></h2><p>Build trust, discover their strengths, and find your own path to the podium. Your next chapter starts together.</p><button className="club-button" onClick={() => onNavigate('demo3d')}>Spend time with your dogs <NavIcon name="arrow" size={19}/></button></div><div className="club-hero-art"><div className="club-hero-orbit"/><img src={heroDog} alt="A golden retriever sitting attentively"/><span className="club-hero-caption">EVERY DOG HAS A STORY.</span></div></section>
   <div className="club-stats">{[
    { label:'Dogs in your care', value:dogs.length, note:living.length + ' active companions', icon:'kennel' },
    { label:'Care check-in', value:needsCare.length, note:needsCare.length ? 'Ready for a little attention' : 'Everyone is feeling settled', icon:'breeding' },
    { label:'Competition wins', value:wins, note:'Every step forward counts', icon:'competition' },
    { label:'Kennel level', value:user?.kennel_level || 1, note:'Room to grow your legacy', icon:'office' },
   ].map(stat => <div className="club-stat" key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></div><span className="club-stat-icon"><NavIcon name={stat.icon}/></span></div>)}</div>
   <div className="club-overview-grid"><section className="club-panel"><div className="club-section-heading"><div><p className="club-eyebrow">YOUR INNER CIRCLE</p><h3>Familiar faces</h3></div><button className="club-text-button" onClick={() => onNavigate('kennel')}>View kennel <NavIcon name="arrow" size={17}/></button></div>
     <div className="club-dog-list">{dogs.slice(0,4).map(dog => { const breed = [...rescueBreeds, ...shopBreeds].find(b => b.id === dog.breed_id); return <button className="club-dog-row" key={dog.id} onClick={() => { if (dog.is_dead) { onNavigate('kennel'); return; } selectDog(dog); onNavigate('dogDetail'); }}><img src={getDogImage(breed?.name || 'Mixed Breed','Sitting')} alt=""/><div className="club-dog-summary"><strong>{dog.name}</strong><span>{breed?.name || 'Mixed breed'} &middot; {dog.is_rescue ? 'Rescue companion' : 'Kennel companion'}</span><div className="club-bond-track"><i style={{width:Math.min(100, Math.max(4, dog.bond_level * 20)) + '%'}}/></div><small>Bond level {dog.bond_level} &middot; {dog.training_points} training points</small></div><span className={'club-dog-badge ' + (needsCare.includes(dog) ? 'needs-care' : '')}>{dog.is_dead ? 'In memory' : needsCare.includes(dog) ? 'Care time' : 'Settled'}</span><NavIcon name="arrow" size={18}/></button>; })}</div>
     <button className="club-adopt-link" onClick={() => onNavigate('shop',{shopTab:'pound'})}><NavIcon name="breeding"/><div><strong>Make room for a new beginning.</strong><span>Visit the rescue and meet your next companion.</span></div><NavIcon name="arrow" size={18}/></button>
   </section><section className="club-panel club-today"><div className="club-section-heading"><div><p className="club-eyebrow">ONE STEP AT A TIME</p><h3>Make today count</h3></div></div>
     <KennelBriefing onNavigate={onNavigate}/>
     {pregnancies.length > 0 && <button className="club-text-button" onClick={() => onNavigate('breeding')}>{pregnancies.length} litters on the way <NavIcon name="arrow" size={17}/></button>}
   </section></div>
   <section className="club-story"><span className="club-story-icon"><NavIcon name="story" size={32}/></span><div><p className="club-eyebrow">YOUR PATH TO CHAMPIONSHIP</p><h3>{chapter?.title || 'Every legacy has a first chapter.'}</h3><p>{storyProgress.completedChapters.length} of {storyChapters.length} chapters complete. There is more to your story.</p></div><button className="club-button club-button-light" onClick={() => onNavigate('story')}>Continue your story <NavIcon name="arrow" size={18}/></button></section>
   <div className="club-section-heading"><div><p className="club-eyebrow">BEHIND THE SCENES</p><h3>Your kennel essentials</h3></div><button className="club-text-button" onClick={() => onNavigate('demo3d')}>Visit your yard <NavIcon name="arrow" size={17}/></button></div>
   <InventoryPanel/>
 </div>;
}
