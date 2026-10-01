import { clamp, type Discipline } from './model';
import { performanceReport } from './performance';
import { distance, type Point } from './simulation';

export const FOOTWORK = [{x:-3,z:2},{x:3,z:1},{x:-3,z:-1},{x:3,z:-3},{x:0,z:3}];
export interface TrainingState {
  discipline: Discipline; ability: number; dog: Point; target: Point; heading: number; moving: boolean;
  time: number; distance: number; phase: 'playing' | 'finished'; completed: number; mistakes: number;
  attention: number; holding: boolean; hold: number; rewardReady: boolean; encouragement: number;
  fatigue: number; pace: 'rest' | 'walk' | 'trot'; waypoint: number; commands: number; feedback: string;
}
export function createTraining(discipline: Discipline, ability: number): TrainingState {
  return { discipline, ability: clamp(ability,10,100), dog:{x:0,z:3}, target:{x:0,z:3}, heading:Math.PI,moving:false,
    time:0,distance:0,phase:'playing',completed:0,mistakes:0,attention:100,holding:false,hold:0,rewardReady:false,encouragement:0,
    fatigue:0,pace:'rest',waypoint:0,commands:0,feedback:discipline==='agility'?'Send your dog to the glowing pad. Practice clean changes of direction.':discipline==='water'?'Build conditioning on a dry-land circuit. Alternate trotting and recovery to avoid fatigue.':'Ask for a stay, support attention around the moving distraction, then reward the completed hold.' };
}
export function trainingCommand(s: TrainingState, command: 'stay' | 'encourage' | 'reward' | 'pad' | 'rest' | 'walk' | 'trot') {
  if(s.phase!=='playing')return;
  if(command==='encourage' && s.encouragement>0)return;
  s.commands++;
  if(command==='stay'){s.target={x:0,z:0};s.holding=true;s.hold=0;s.rewardReady=false;s.attention=Math.max(70,s.attention);s.feedback='Settle on the mat. Watch attention and hold progress.';}
  if(command==='encourage'){s.attention=clamp(s.attention+32,0,100);s.encouragement=2;s.feedback='A calm reminder helps your dog hold focus.';}
  if(command==='reward'){
    if(s.rewardReady){s.completed++;s.holding=false;s.rewardReady=false;s.hold=0;s.attention=100;s.feedback='Good timing. Your dog held the stay through a distraction.';}
    else{s.mistakes++;s.hold=0;s.feedback='Wait until the hold is complete before rewarding.';}
  }
  if(command==='pad')s.target={...FOOTWORK[s.completed%FOOTWORK.length]};
  if(['rest','walk','trot'].includes(command))s.pace=command as TrainingState['pace'];
}
export function stepTraining(s:TrainingState,elapsed:number){
  if(s.phase!=='playing'||!Number.isFinite(elapsed)||elapsed<=0)return;
  const duration=Math.min(elapsed,.1),steps=Math.ceil(duration*60);
  for(let i=0;i<steps&&s.phase==='playing';i++)tick(s,duration/steps);
}
function tick(s:TrainingState,dt:number){
  s.time+=dt;s.encouragement=Math.max(0,s.encouragement-dt);
  const conditioning=s.discipline==='water',footwork=s.discipline==='agility';
  if(conditioning){
    if(s.pace==='rest'){s.target={...s.dog};s.fatigue=Math.max(0,s.fatigue-14*dt);}
    else{
      s.target={...FOOTWORK[s.waypoint]};
      s.fatigue=clamp(s.fatigue+(s.pace==='trot'?8:1.5)*(1.25-s.ability*.008)*dt,0,100);
      if(s.fatigue>=90){s.pace='rest';s.mistakes++;s.feedback='Too tired to keep form. Recover, then use a gentler pace.';}
      if(distance(s.dog,s.target)<.15)s.waypoint=(s.waypoint+1)%FOOTWORK.length;
    }
  }
  const d=distance(s.dog,s.target),speed=conditioning?(s.pace==='trot'?4:2):3+s.ability*.012;
  s.moving=d>.08;
  if(s.moving){const step=Math.min(d,speed*dt);s.heading=Math.atan2(s.target.x-s.dog.x,s.target.z-s.dog.z);s.dog.x+=(s.target.x-s.dog.x)/d*step;s.dog.z+=(s.target.z-s.dog.z)/d*step;s.distance+=step;}
  if(footwork && distance(s.dog,FOOTWORK[s.completed%FOOTWORK.length])<.15 && distance(s.target,FOOTWORK[s.completed%FOOTWORK.length])<.01){s.completed++;s.target={...s.dog};s.feedback='Pad reached. Choose the next glowing pad for another change of direction.';}
  if(!conditioning&&!footwork&&s.holding&&!s.moving){
    s.attention=Math.max(0,s.attention-(14-s.ability*.105)*dt);
    if(s.attention===0){s.holding=false;s.hold=0;s.mistakes++;s.target={x:3,z:-1};s.feedback='The distraction broke the stay. Call your dog back to the mat and encourage before attention runs out.';}
    else{s.hold+=dt;if(s.hold>=6){s.rewardReady=true;s.feedback='Hold complete. Reward now to reinforce the stay.';}}
  }
  if(conditioning)s.completed=Math.min(3,Math.floor(s.distance/18));
  const target=footwork?10:3;
  if(s.completed>=target||s.time>=120)s.phase='finished';
}
export function trainingReport(s:TrainingState){return {...performanceReport({discipline:s.discipline,completed:s.completed,total:s.discipline==='agility'?10:3,seconds:s.time,distance:s.distance,mistakes:s.mistakes,commands:s.commands}),context:'training' as const};}
export function trainingName(discipline:Discipline){return discipline==='agility'?'Footwork on the pads':discipline==='water'?'Conditioning circuit':discipline==='herding'?'Steadiness around distractions':'Focus around distractions';}
