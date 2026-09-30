export type HubDestination = { id:string; label:string; detail:string; x:number; z:number; view:string };
// Destinations sit along an unobstructed central aisle. Furniture stays outside it.
export const HUB_DESTINATIONS:HubDestination[] = [
 {id:'dogs',label:'Dog runs',detail:'Visit your companions and open their care records.',x:-4.7,z:-.6,view:'kennel'},
 {id:'story',label:'Our story',detail:'Your next lesson, milestones, and the life you are building.',x:-2.7,z:-2.8,view:'office'},
 {id:'events',label:'Field Club',detail:'Practice four sports, enter a combined trial, and build a team.',x:2.5,z:-2.8,view:'fieldClub'},
 {id:'shop',label:'Supplies',detail:'Visit the shop to replenish your pantry.',x:4.7,z:-.4,view:'shop'},
 {id:'care',label:'Care room',detail:'Veterinary help and recovery.',x:4.7,z:2.1,view:'vet'},
 {id:'desk',label:'Keeper desk',detail:'Expansion plans, training, work and your breeding program.',x:-4.5,z:2.7,view:'desk'},
 {id:'yard',label:'To the yard',detail:'Step outside for care, play, and time together.',x:1.7,z:4,view:'demo3d'},
];
export function interiorStyle(level:number){
 const tier=Math.max(1,Math.min(10,Math.floor(level)||1));
 return {level:tier,runs:Math.min(6,tier*2),floor:tier>=5?'#c1b2a0':tier>=3?'#bfa58b':'#ad8b69',walls:tier>=5?'#e8dfd1':tier>=3?'#d1d6d8':'#d6c5ac',padded:tier>=2,nursery:tier>=3,trophies:tier>=5,description:tier===1?'Timber floors, two cozy runs, and room for a beginning.':tier<3?'Cushioned runs, a woven runner, and more room to grow.':tier<5?'An expanded dog wing, dedicated nursery, and improved storage.':'A furnished reception, expanded dog wing, and a display for your future awards.'};
}
export function insideAisle(p:{x:number;z:number}) {return p.x>=-5.1&&p.x<=5.1&&p.z>=-3&&p.z<=4.5;}
