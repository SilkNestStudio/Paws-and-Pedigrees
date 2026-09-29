import YardActivity from '../../game/yard/YardActivity';
import type { Dog } from '../../types';
export default function RealisticFetchActivity({dog,onComplete,onCancel}:{dog:Dog;onComplete:()=>void;onCancel:()=>void}) {
 return <YardActivity dog={dog} mode="fetch" onComplete={()=>onComplete()} onCancel={onCancel}/>;
}
