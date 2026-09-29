import { yardPath } from './handler';
import type { YardPosition } from './simulation';
export type RoamingState = { phase:'idle'|'walking'|'sniffing'; remaining:number; path:YardPosition[]; lastSpot:number };
// Keep casual exploration near the handler and clear of the cottage, bowls and hurdle.
const sniffSpots:YardPosition[]=[{x:-2,z:3.6},{x:-3.8,z:4},{x:1,z:-.6},{x:4.3,z:.3},{x:4.4,z:4.8},{x:-1.5,z:6.4},{x:2.3,z:3}];
export function createRoaming():RoamingState {return {phase:'idle',remaining:4,path:[],lastSpot:-1};}
export function resetRoaming(state:RoamingState,delay=5){state.phase='idle';state.remaining=delay;state.path=[];}
/** Ambient motion has no connection to rewards, care, or tutorial completion. */
export function stepRoaming(state:RoamingState,position:YardPosition,delta:number,random= Math.random, anchor?:YardPosition){
 const dt=Math.min(.05,Math.max(0,delta));const next={...position};let x=0,z=0;
 if(state.phase==='walking'){
  const waypoint=state.path[0];
  if(waypoint){const distance=Math.hypot(waypoint.x-next.x,waypoint.z-next.z);const step=Math.min(distance,1.15*dt);if(distance>.001){x=(waypoint.x-next.x)/distance;z=(waypoint.z-next.z)/distance;next.x+=x*step;next.z+=z*step;}if(distance<=step+.001)state.path.shift();}
  if(!state.path.length){state.phase='sniffing';state.remaining=3+random()*2;}
 }else{
  state.remaining-=dt;
  if(state.remaining<=0){
   if(state.phase==='sniffing'){state.phase='idle';state.remaining=1.5+random()*2;}
   else {const offset=Math.min(sniffSpots.length-1,Math.floor(random()*sniffSpots.length));for(let i=0;i<sniffSpots.length;i++){const index=(offset+i)%sniffSpots.length,spot=sniffSpots[index];if(anchor&&Math.hypot(spot.x-anchor.x,spot.z-anchor.z)>3.5)continue;if(index===state.lastSpot||Math.hypot(spot.x-next.x,spot.z-next.z)<1.4)continue;const path=yardPath(next,spot);if(path){state.path=path;state.phase='walking';state.lastSpot=index;break;}}if(state.phase==='idle')state.remaining=3;}
  }
 }
 return {position:next,x,z,moving:Math.hypot(x,z)>0,sniffing:state.phase==='sniffing'};
}
