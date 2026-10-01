import { clamp } from './model';
import { performanceReport } from './performance';

export interface TrailPoint { x: number; z: number }
export interface TrailChoice extends TrailPoint { name: string; observation: string; animal: boolean }
export interface TrailChapter {
  fork: TrailPoint;
  choices: [TrailChoice, TrailChoice];
  correct: 0 | 1;
  clue: string;
  discovery: string;
}
export const SEARCH_CASES = [
  { name: 'Mara', item: 'field pack', garment: 'rust-red scarf', color: '#bd6242', clue: 'rust-red thread', job: 'ranger' },
  { name: 'Ellis', item: 'camera bag', garment: 'blue jacket', color: '#527da6', clue: 'blue fabric', job: 'wildlife photographer' },
  { name: 'June', item: 'survey pack', garment: 'violet bandanna', color: '#95729e', clue: 'violet thread', job: 'trail surveyor' },
] as const;
export interface SearchAdventureState {
  ability: number; seed: number; caseIndex: number; advanced: boolean; chapters: TrailChapter[];
  dog: TrailPoint; target: TrailPoint; handler: TrailPoint; heading: number;
  stage: number; phase: 'playing' | 'finished'; task: 'following' | 'choosing' | 'exploring' | 'inspecting' | 'distracted' | 'returning' | 'casting';
  route: TrailPoint[]; choice: number | null; pace: 'careful' | 'brisk'; moving: boolean;
  time: number; distance: number; commands: number; mistakes: number; workSeconds: number;
  inspection: number; signal: number; wind: number; boost: number; scentUses: number; redirects: number;
  gap: TrailPoint | null; gapsSeen: number[]; distractionSeen: number[]; checked: string[]; discoveries: string[]; visited: string[];
  feedback: string; behavior: string;
}
const dist = (a: TrailPoint, b: TrailPoint) => Math.hypot(a.x - b.x, a.z - b.z);
export function createSearchAdventure(ability: number, seed: number, advanced = false): SearchAdventureState {
  let value = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  const random = () => { value = value * 16807 % 2147483647; return value / 2147483647; };
  const caseIndex = Math.floor(random() * SEARCH_CASES.length), person = SEARCH_CASES[caseIndex];
  const names = [['Fern hollow', 'Sunlit overlook'], ['Creek bend', 'Birch ridge'], ['Old campsite', 'Foxglove clearing'], ['Stone arch', 'Fallen cedar'], ['Quiet glade', 'Woodland shelter']];
  const evidence = [person.clue, 'Deep bootprints', 'A dropped glove', 'A map corner'];
  const chapters = Array.from({length: advanced ? 5 : 3}, (_, i): TrailChapter => {
    const correct = (random() < .5 ? 0 : 1) as 0 | 1, last = i === (advanced ? 4 : 2);
    const fork = {x:0,z:5-i*15};
    const choices = [-1,1].map((side,j) => ({x:side*6,z:fork.z-6,name:names[i][j],animal:j!==correct,
      observation: j===correct ? (i%2===0 ? `A scrap of ${person.clue} catches on a branch.` : 'Deep bootprints continue through the soft ground.') : (i%2===0 ? 'Pale fur clings to a low branch. Tiny tracks lead away.' : 'Picnic crumbs and small pawprints cover the ground.'),
    })) as [TrailChoice,TrailChoice];
    return {fork,choices,correct,clue:last?person.item:evidence[i],discovery:last?`${person.name}'s ${person.item} is safe. Your partnership brought it home.`:i===0?`A piece of ${person.garment}. This is the right trail. Look for human bootprints at the next fork.`:i===1?'Fresh bootprints head deeper into the woods. Watch for more matching fabric.':`Another sign of ${person.name}. Keep following the matching fabric and bootprints.`};
  });
  return {ability:clamp(ability,10,100),seed,caseIndex,advanced,chapters,dog:{x:0,z:12},handler:{x:-1.3,z:14},target:{...chapters[0].fork},heading:Math.PI,
    stage:0,phase:'playing',task:'following',route:[{...chapters[0].fork}],choice:null,pace:'careful',moving:false,
    time:0,distance:0,commands:0,mistakes:0,workSeconds:0,inspection:0,signal:0,wind:1,boost:0,scentUses:3,redirects:0,
    gap:null,gapsSeen:[],distractionSeen:[],checked:[],discoveries:[],visited:[],feedback:`${person.name} wore a ${person.garment}. Your dog has the scent. Follow to the first fork.`,behavior:'Nose down. Following the familiar scent.'};
}
export function currentChapter(s: SearchAdventureState) { return s.chapters[Math.min(s.stage,s.chapters.length-1)]; }
export function scentRadius(s: SearchAdventureState) { return 1.7+s.ability*.04+(s.pace==='careful'?1.1:0)+(s.boost>0?3:0); }
export function routeObservation(s: SearchAdventureState, index: number) {
  const p=currentChapter(s).choices[index];
  return s.visited.includes(`${s.stage}:${index}`) ? p.observation : 'Get closer to examine the ground and branches.';
}
export function chooseTrail(s: SearchAdventureState, index: number) {
  if(s.phase!=='playing'||(index!==0&&index!==1)||s.task==='inspecting'||s.task==='casting')return;
  const chapter=currentChapter(s),goal=chapter.choices[index];
  s.commands++;s.choice=index;s.inspection=0;s.task='exploring';
  // Travel through the fork when changing branches instead of cutting through scenery.
  s.route=dist(s.dog,chapter.fork)>3 && Math.sign(s.dog.x)!==Math.sign(goal.x) ? [{...chapter.fork},{...goal}] : [{...goal}];
  s.target={...s.route[0]};s.feedback=`Checking ${goal.name.toLowerCase()}. Read the ground and watch your dog's response.`;
}
export function sendSearchDog(s: SearchAdventureState, point: TrailPoint) {
  if(s.phase!=='playing'||!Number.isFinite(point.x)||!Number.isFinite(point.z))return;
  const chapter=currentChapter(s);
  s.commands++;s.choice=null;s.inspection=0;s.task=s.gap?'casting':'exploring';
  s.target={x:clamp(point.x,-10,10),z:clamp(point.z,chapter.fork.z-9,chapter.fork.z+9)};s.route=[{...s.target}];
  s.feedback='Explore nearby ground. Your dog investigates evidence when close enough.';
}
export function recallSearchDog(s: SearchAdventureState) {
  if(s.phase!=='playing')return;
  if(s.gap){s.commands++;s.route=[];s.target={...s.dog};s.task='casting';s.feedback='Hold here and read the breeze. The last scent is in the clearing ahead.';return;}
  if(s.task==='distracted')s.redirects++;
  s.commands++;s.gap=null;s.choice=null;s.inspection=0;s.task='returning';s.route=[{...currentChapter(s).fork}];s.target={...s.route[0]};
  s.feedback='Returning to the last confirmed trail. You can choose another approach.';
}
export function refreshSearchScent(s: SearchAdventureState) {
  if(s.phase!=='playing'||s.scentUses<=0||s.boost>0)return;
  s.commands++;s.scentUses--;s.boost=12;s.feedback='The scent sample sharpens the trail for twelve seconds. Look for the amber ribbon.';
}
export function searchHint(s: SearchAdventureState) {
  if(s.phase==='finished')return 'Pack located. A job well done.';
  if(s.task==='casting')return s.signal>.1?'Nose turning. The broken trail is close.':'Scent lost in the breeze. Cast across the open ground.';
  if(s.task==='distracted')return 'Head up. Pulling toward a different smell.';
  if(s.task==='inspecting')return 'Nose down. Checking whether this scent matches.';
  if(s.signal>.2){
    const strong=s.ability>=65||s.boost>0;
    return strong?'Nose down. This scent matches the sample.':'Slowing down. There is a familiar scent nearby.';
  }
  if(s.moving)return s.pace==='brisk'?'Covering ground quickly. Faint traces are easier to miss.':'Casting slowly, nose close to the ground.';
  return 'Looking back at you. Choose where to investigate.';
}
export function stepSearchAdventure(s: SearchAdventureState, elapsed: number) {
  if(s.phase!=='playing'||!Number.isFinite(elapsed)||elapsed<=0)return;
  const duration=Math.min(.1,elapsed),steps=Math.ceil(duration*60);
  for(let i=0;i<steps&&s.phase==='playing';i++)tick(s,duration/steps);
}
function tick(s: SearchAdventureState,dt:number) {
  s.time+=dt;s.boost=Math.max(0,s.boost-dt);s.wind=Math.sin(s.time/18+s.seed)*.8;
  const chapter=currentChapter(s),match=chapter.choices[chapter.correct];
  // The scent plume drifts with the breeze; a careful search and trained nose cover more ground.
  const source=s.gap??match;const plume={x:source.x+s.wind,z:source.z+.8};
  s.signal=clamp(1-dist(s.dog,plume)/scentRadius(s),0,1);
  chapter.choices.forEach((p,i)=>{const key=`${s.stage}:${i}`;if(dist(s.dog,p)<4.8&&!s.visited.includes(key))s.visited.push(key);});
  if(s.task==='inspecting') {
    s.moving=false;s.workSeconds+=dt;s.inspection+=dt/(5.8-s.ability*.045);
    if(s.inspection>=1&&s.choice!==null) {
      const key=`${s.stage}:${s.choice}`;
      if(s.choice===chapter.correct){
        s.discoveries.push(chapter.clue);s.feedback=chapter.discovery;s.stage++;s.choice=null;s.inspection=0;
        if(s.stage===s.chapters.length){s.phase='finished';s.route=[];}
        else{s.task='following';s.route=[{x:chapter.choices[chapter.correct].x,z:chapter.fork.z-10},{...currentChapter(s).fork}];s.target={...s.route[0]};}
      }else{
        if(!s.checked.includes(key)){s.checked.push(key);s.mistakes++;}
        s.task='choosing';s.inspection=0;s.choice=null;s.route=[];
        s.feedback='Rabbit tracks, not the missing pack. Nothing is lost: recall to the fork or explore the other trail.';
      }
    }
  } else {
    const d=dist(s.dog,s.target);s.moving=d>.08;
    if(s.moving){const speed=(s.pace==='careful'?2.4:4.4)+s.ability*.009,step=Math.min(d,speed*dt);s.heading=Math.atan2(s.target.x-s.dog.x,s.target.z-s.dog.z);s.dog.x+=(s.target.x-s.dog.x)/d*step;s.dog.z+=(s.target.z-s.dog.z)/d*step;s.distance+=step;}
    if(dist(s.dog,s.target)<.12&&s.route.length){
      s.route.shift();
      if(s.task==='following'&&s.stage>0&&!s.gapsSeen.includes(s.stage)&&(s.ability<75||s.advanced)){
        s.gapsSeen.push(s.stage);s.gap={x:0,z:chapter.fork.z+2};s.route=[];s.target={...s.dog};s.task='casting';
        s.feedback='The trail breaks across the clearing. Search toward the open ground ahead. A scent refresh reveals nearby traces.';
      }else if(s.route.length)s.target={...s.route[0]};else if(s.task==='following'||s.task==='returning')s.task='choosing';
    }
    if(s.task==='casting'&&s.gap&&dist(s.dog,s.gap)<scentRadius(s)*.6){
      s.gap=null;s.task='following';s.route=[{...chapter.fork}];s.target={...chapter.fork};s.feedback='Your dog found the trail again. Follow to the next fork.';
    }
    // An inexperienced dog can be tempted when rushing past an animal scent. One correction is enough.
    if(s.task==='exploring'&&s.pace==='brisk'&&s.ability<60&&!s.distractionSeen.includes(s.stage)&&dist(s.dog,chapter.fork)>3&&dist(s.dog,chapter.fork)<5){
      s.distractionSeen.push(s.stage);s.task='distracted';s.choice=1-chapter.correct;s.route=[{...chapter.choices[s.choice]}];s.target={...s.route[0]};s.feedback='A rabbit scent caught your dog. Use Leave it to recover the trail, or let your dog check it.';
    }
    if((s.task==='exploring'||s.task==='distracted')&&!s.route.length){
      const index=chapter.choices.findIndex(p=>dist(s.dog,p)<(s.pace==='careful'?1.7:1.1)+s.ability*.009);
      if(index>=0&&!s.checked.includes(`${s.stage}:${index}`)){
        s.choice=index;s.target={...s.dog};s.task='inspecting';s.inspection=0;
      }
    }
  }
  // The human follows at a walking pace and stays behind the dog.
  const hd=dist(s.handler,s.dog);if(hd>2.3){const step=Math.min(hd-2.3,3.5*dt);s.handler.x+=(s.dog.x-s.handler.x)/hd*step;s.handler.z+=(s.dog.z-s.handler.z)/hd*step;}
  s.behavior=searchHint(s);
}
export function adventureReport(s: SearchAdventureState) {
  return {...performanceReport({discipline:'search',completed:s.discoveries.length,total:s.chapters.length,seconds:s.time,distance:s.distance,mistakes:s.mistakes,commands:s.commands,workSeconds:s.workSeconds}),
    activity:'woodland-search' as const, caseName:`${SEARCH_CASES[s.caseIndex].name}'s missing ${SEARCH_CASES[s.caseIndex].item}`, scentRefreshes:3-s.scentUses, redirects:s.redirects};
}
