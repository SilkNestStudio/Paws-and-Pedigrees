import { VIEW_NAMES, type GameView } from '../../utils/navigation';
import './returnNavigation.css';
export default function ReturnNavigation({current,previous,onBack,onNavigate}:{current:GameView;previous:GameView;onBack:()=>void;onNavigate:(view:GameView)=>void}) {
 if(current==='hub')return null;
 return <nav className="return-navigation" aria-label="Return controls">
  <button className="return-primary" onClick={onBack}><span aria-hidden="true">←</span> Back to {VIEW_NAMES[previous]}</button>
  <span className="return-current">{VIEW_NAMES[current]}</span>
  <div>{previous!=='hub'&&<button onClick={()=>onNavigate('hub')}>Inside kennel</button>}{current!=='demo3d'&&<button onClick={()=>onNavigate('demo3d')}>Go outside</button>}</div>
 </nav>;
}
