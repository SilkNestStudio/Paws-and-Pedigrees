import { useGameStore } from '../../stores/gameStore';
import { nextCompanionStep, type CompanionDestination } from '../../utils/companionLoop';
import NavIcon from '../layout/NavIcon';
export default function KennelBriefing({ onNavigate }: { onNavigate: (view: CompanionDestination) => void }) {
 const { dogs, selectDog } = useGameStore();
 const priorities = dogs.filter(d => !d.is_dead).map(dog => ({ dog, step: nextCompanionStep(dog) })).sort((a,b) => a.step.priority - b.step.priority).slice(0,3);
 return <>{priorities.length ? priorities.map(({dog,step},i) => <button className="club-task" key={dog.id} onClick={() => { selectDog(dog); onNavigate(step.destination); }}><span className="club-task-number">0{i+1}</span><div><strong>{dog.name}: {step.title.toLowerCase()}</strong><p>{step.detail}</p></div><NavIcon name="arrow" size={18}/></button>) : <p>Your next chapter begins with a companion. Visit the rescue when you are ready.</p>}</>;
}
