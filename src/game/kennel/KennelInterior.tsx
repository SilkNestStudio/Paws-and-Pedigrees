import { ClubInvitation } from '../club/FieldClub';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, OrthographicCamera } from 'three';
import Handler3D from '../yard/Handler3D';
import Dog3D from '../../components/training/3d/Dog3D';
import KennelEmblem, { kennelColors } from '../../components/layout/KennelEmblem';
import { useGameStore } from '../../stores/gameStore';
import { apprenticeshipComplete, lessonViewUnlocked, nextRibbonStep } from '../../utils/firstRibbon';
import { getKennelCapacity } from '../../utils/kennelCapacity';
import { getKennelLevelInfo } from '../../utils/kennelUpgrades';
import FirstRibbonGuide from '../../components/tutorial/FirstRibbonGuide';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { HUB_DESTINATIONS, insideAisle, interiorStyle, type HubDestination } from './interior';
import './interior.css';

type Point={x:number;z:number};
function Block({p,size,color,rotation=0}:{p:[number,number,number];size:[number,number,number];color:string;rotation?:number}) {
 return <mesh position={p} rotation={[0,rotation,0]} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.85}/></mesh>;
}
function InteriorWorld({destination,paused,onWalk,onArrive,onPosition,onChoose}:{destination:Point|null;paused:boolean;onWalk:(p:Point)=>void;onArrive:()=>void;onPosition:(p:Point)=>void;onChoose:(d:HubDestination)=>void}) {
 const {user,dogs,tutorialProgress}=useGameStore();const style=interiorStyle(user?.kennel_level??1),living=dogs.filter(d=>!d.is_dead),crestColor=kennelColors[user?.kennel_color??'copper'];
 const handler=useRef<Group>(null),position=useRef<Point>({x:0,z:3}),active=useRef(false),timer=useRef(0);const [moving,setMoving]=useState(false);
 useEffect(()=>{active.current=!!destination;},[destination]);
 useFrame(({camera,size},delta)=>{
  const dt=Math.min(.05,delta);let walking=false;
  if(camera instanceof OrthographicCamera){const zoom=Math.min(size.width/18.7,size.height/15);if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}camera.lookAt(0,0,0);}
  if(!paused&&active.current&&destination){const dx=destination.x-position.current.x,dz=destination.z-position.current.z,distance=Math.hypot(dx,dz),step=Math.min(distance,2.8*dt);if(distance>.02){position.current.x+=dx/distance*step;position.current.z+=dz/distance*step;walking=true;if(handler.current){const heading=Math.atan2(dx,dz);handler.current.rotation.y+=Math.atan2(Math.sin(heading-handler.current.rotation.y),Math.cos(heading-handler.current.rotation.y))*Math.min(1,dt*12);}}if(distance<=step+.025){active.current=false;onArrive();}}
  handler.current?.position.set(position.current.x,.12,position.current.z);timer.current+=dt;if(timer.current>.1){timer.current=0;setMoving(walking);onPosition({...position.current});}
 });
 return <>
  <color attach="background" args={['#e7dfd2']}/><ambientLight intensity={1.2}/><hemisphereLight args={['#fff5df','#7e756b',1.1]}/><directionalLight position={[2,14,9]} intensity={2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.04}/>
  <Block p={[0,-.15,0]} size={[16,.4,12]} color="#544737"/>
  {Array.from({length:16},(_,i)=><Block key={i} p={[-7.5+i,.08,0]} size={[.96,.1,11.8]} color={i%3===0?'#c4aa8d':style.floor}/>)}
  <Block p={[0,1.5,-5.8]} size={[16,3,.22]} color={style.walls}/><Block p={[-7.8,.65,0]} size={[.22,1.3,12]} color={style.walls}/><Block p={[7.8,.65,0]} size={[.22,1.3,12]} color={style.walls}/>
  {[-7.6,-4,0,4,7.6].map(x=><Block key={x} p={[x,1.65,-5.6]} size={[.16,3.3,.16]} color="#71604d"/>)}
  <Block p={[0,3.2,-5.6]} size={[16,.18,.2]} color="#71604d"/>
  <Block p={[0,.15,.7]} size={[2.5,.03,8.3]} color={style.padded?'#30445b':'#958773'}/>
  {style.padded&&[-1.12,1.12].map(x=><Block key={x} p={[x,.17,.7]} size={[.035,.015,8]} color="#c89f68"/>)}
  {/* Open runs form a dog wing, with the central aisle kept clear. */}
  {Array.from({length:style.runs},(_,i)=>{const z=-4.7+i*1.6;return <group key={i}><Block p={[-6.5,.23,z]} size={[2,.22,1.4]} color="#71614e"/><Block p={[-6.5,.4,z]} size={[1.4,style.padded?.2:.08,1]} color={style.padded?'#b98761':'#c9bba5'}/><Block p={[-6.5,.85,z-.75]} size={[2.4,1.3,.06]} color="#6c7b80"/>{[-7.55,-5.4].map(x=><Block key={x} p={[x,.8,z]} size={[.06,1.25,1.5]} color="#76838a"/>)}{i<Math.min(living.length,2)&&<Dog3D dog={living[i]} position={[-6.4,.5,z]} rotation={[0,Math.PI/2,0]} animation="Sit"/>}</group>;})}
  {/* Bulletin board with physical notes; the label opens the detailed story. */}
  <Block p={[-2.6,1.8,-5.42]} size={[3.2,1.8,.15]} color="#775337"/><Block p={[-2.6,1.8,-5.3]} size={[2.95,1.55,.07]} color="#bc9870"/>
  {[-3.5,-2.6,-1.7].map((x,i)=><Block key={x} p={[x,1.85+(i%2)*.13,-5.23]} size={[.65,.95,.015]} color={i===1?'#e8ca89':'#fff0d7'}/>)}
  {/* Competition doorway and the supplies cupboard. */}
  <Block p={[2.6,1.32,-5.5]} size={[2.2,2.7,.18]} color="#685542"/><Block p={[2.6,1.3,-5.34]} size={[1.9,2.5,.12]} color="#344b69"/><Block p={[3.2,1.2,-5.23]} size={[.1,.2,.12]} color="#c5a163"/>
  <Block p={[6.6,1,-2]} size={[2,2,2]} color="#a48461"/>{[-.2,.5,1.2].map(y=><Block key={y} p={[6.6,y+1,-.95]} size={[2.05,.09,.12]} color="#e0c5a0"/>)}
  {Array.from({length:style.level},(_,i)=><Block key={i} p={[5.9+(i%3)*.65,.4+Math.floor(i/3)*.52,-.85]} size={[.45,.43,.35]} color={i%2?'#455b72':'#c79a64'}/>)}
  <Block p={[6.5,.6,3]} size={[2,1.1,1.3]} color="#ece7dc"/><Block p={[6.5,1.2,3]} size={[2.2,.15,1.5]} color="#718e96"/>
  <Block p={[-4.5,.8,4.8]} size={[2.4,.16,1.3]} color="#735640"/>{[-5.45,-3.55].map(x=><Block key={x} p={[x,.4,4.8]} size={[.13,.8,1.1]} color="#39444e"/>)}
  <Block p={[-4.7,.93,4.6]} size={[.8,.05,.6]} color="#f5e8cb"/>
  {style.nursery&&<group><Block p={[6.4,.25,-4.5]} size={[2.2,.4,1.4]} color="#c6b398"/><Block p={[6.4,.49,-4.5]} size={[1.9,.07,1.1]} color="#d7af82"/></group>}
  {style.trophies&&<Block p={[-.1,1,-5.3]} size={[1,1.9,.5]} color="#a6865d"/>}
  <Html position={[0,3.3,-5.65]} center zIndexRange={[1,0]}><div className="interior-banner"><KennelEmblem emblem={user?.kennel_emblem} color={user?.kennel_color} size={30}/><span>{user?.kennel_name}</span></div></Html>
  <Block p={[1.7,.18,5.5]} size={[2.8,.15,.5]} color={crestColor}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.18,.75]} onClick={e=>{e.stopPropagation();onWalk({x:e.point.x,z:e.point.z});}}><planeGeometry args={[10.2,7.5]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  <group ref={handler}><Handler3D moving={moving}/></group>
  {destination&&<mesh rotation={[-Math.PI/2,0,0]} position={[destination.x,.2,destination.z]}><ringGeometry args={[.25,.33,24]}/><meshBasicMaterial color="#dba160"/></mesh>}
  {HUB_DESTINATIONS.map(d=><Html key={d.id} position={[d.x,d.id==='story'||d.id==='events'?2:1.4,d.z]} center zIndexRange={[2,1]}><button className="interior-marker" data-room={d.id} disabled={paused} onClick={()=>onChoose(d)}>{d.label}{!lessonViewUnlocked(tutorialProgress,d.view)&&d.view!=='desk'&&<small>After club introduction</small>}</button></Html>)}
 </>;
}
export default function KennelInterior({onNavigate}:{onNavigate:(view:string,options?:{yardActivity?:string;shopTab?:'items'|'pound'})=>void}) {
 const {user,dogs,tutorialProgress}=useGameStore();const level=user?.kennel_level??1,style=interiorStyle(level),next=nextRibbonStep(tutorialProgress.firstRibbon);
 const [destination,setDestination]=useState<Point|null>(null),[position,setPosition]=useState<Point>({x:0,z:3}),[paused,setPaused]=useState(false),[desk,setDesk]=useState(false),[message,setMessage]=useState('Welcome home. Tap a sign to walk over, or tap the aisle to explore.');const pending=useRef<HubDestination|null>(null);
 useEffect(()=>{const pause=()=>{setPaused(true);setDestination(null);pending.current=null;};window.addEventListener('blur',pause);document.addEventListener('visibilitychange',pause);return()=>{window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',pause);};},[]);
 const deskDialog = useRef<HTMLDialogElement>(null);
 useEffect(() => {
  const dialog = deskDialog.current;
  if (desk && !dialog?.open) dialog?.showModal();
  else if (!desk && dialog?.open) dialog.close();
 }, [desk]);
 const go=(view:string)=>onNavigate(view,view==='shop'?{shopTab:'items'}:undefined);
 const choose=(d:HubDestination)=>{if(paused)return;if(d.view!=='desk'&&!lessonViewUnlocked(tutorialProgress,d.view)){setMessage(`${d.label} opens after your first club event. ${next?'Next: '+next.title+'.':''}`);return;}setDesk(false);pending.current=d;setDestination({x:d.x,z:d.z});setMessage(`Walking to ${d.label.toLowerCase()}. ${d.detail}`);};
 return <section className="kennel-interior"><header className="interior-heading"><div><span className="journey-eyebrow">YOUR HOME / KENNEL LEVEL {level}</span><h1>Every great kennel starts somewhere.</h1><p>{style.description}</p></div><div className="interior-capacity"><strong>{getKennelLevelInfo(level).name}</strong><span>{dogs.filter(d=>!d.is_dead).length} / {getKennelCapacity(level)} companions</span></div></header>
 <ClubInvitation onNavigate={onNavigate}/>
 {!tutorialProgress.fieldClub&&!apprenticeshipComplete(tutorialProgress)&&<FirstRibbonGuide compact onNavigate={onNavigate}/>}
 <div className="interior-stage" data-level={level} data-runs={style.runs} data-x={position.x.toFixed(2)} data-z={position.z.toFixed(2)}><ErrorBoundary fallback={<p>Unable to open the 3D interior. Use the room shortcuts below to continue.</p>}><Canvas orthographic shadows dpr={[1,1.5]} camera={{position:[5,16,20],zoom:35,near:.1,far:100}} fallback={<p>3D is unavailable. Your room shortcuts are below.</p>}><Suspense fallback={<Html center>Opening your kennel…</Html>}><InteriorWorld destination={destination} paused={paused} onPosition={setPosition} onChoose={choose} onWalk={p=>{if(paused||!insideAisle(p))return;pending.current=null;setDesk(false);setDestination(p);setMessage('A little room to make your own. Choose a sign when you are ready.');}} onArrive={()=>{const room=pending.current;pending.current=null;setDestination(null);if(room?.view==='desk'){setDesk(true);setMessage('Your keeper desk. Choose what to work on next.');}else if(room)go(room.view);}}/></Suspense></Canvas></ErrorBoundary>
 {paused&&<div className="interior-pause"><h2>Your kennel is paused</h2><button className="journey-primary" onClick={()=>setPaused(false)}>Continue inside</button></div>}
 </div><p className="interior-message" role="status">{message}</p>
 <dialog ref={deskDialog} className="interior-desk-dialog" aria-labelledby="keeper-desk-title" onClose={()=>setDesk(false)}>
  <div className="nested-return"><button autoFocus onClick={()=>setDesk(false)}>Return to kennel interior</button></div>
  <section className="interior-desk" aria-label="Keeper desk">
   <div><span className="journey-eyebrow">AT YOUR DESK</span><h2 id="keeper-desk-title">Keeper desk</h2><p>Manage your kennel, plan training, and build your breeding program. Expansion changes this room as your kennel grows.</p>

 {!apprenticeshipComplete(tutorialProgress)&&<div className="interior-desk-lesson"><p>Explore the Field Club and finish a qualified club event to open the rest of your kennel.</p><button onClick={()=>go('fieldClub')}>Continue at the Field Club</button></div>}
   </div>
   <div>{[['fieldClub','Field Club sports'],['expansion','Expand the kennel'],['training','Training plans'],['breeding','Breeding & nursery'],['jobs','Find work'],['story','Story chapters']].map(([view,label])=><button key={view} disabled={!lessonViewUnlocked(tutorialProgress,view)} onClick={()=>go(view)}>{label}{!lessonViewUnlocked(tutorialProgress,view)&&<small>{view==='training'?'After your introduction':'After your first club event'}</small>}</button>)}</div>
  </section>
 </dialog>
 <details className="interior-shortcuts"><summary>Room shortcuts · skip the walk</summary><p>Use these whenever you prefer quick navigation or cannot use the 3D view.</p><div>{HUB_DESTINATIONS.map(d=><button key={d.id} disabled={d.view!=='desk'&&!lessonViewUnlocked(tutorialProgress,d.view)} onClick={()=>{if(d.view==='desk'){pending.current=null;setDestination(null);setDesk(true);}else go(d.view);}}>{d.label}</button>)}</div></details>
 </section>;
}
