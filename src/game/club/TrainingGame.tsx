import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, OrthographicCamera } from 'three';
import Dog3D from '../../components/training/3d/Dog3D';
import Handler3D from '../yard/Handler3D';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import type { Dog } from '../../types';
import type { Discipline } from './model';
import type { ActivityReport } from './performance';
import { createTraining, stepTraining, trainingCommand, trainingName, trainingReport, FOOTWORK, type TrainingState } from './trainingSimulation';

function World({ run, dog, paused, update, ready }: {run:MutableRefObject<TrainingState>;dog:Dog;paused:boolean;update:(s:TrainingState)=>void;ready:()=>void}){
  const avatar=useRef<Group>(null),ball=useRef<Group>(null),timer=useRef(0);
  const [s,setS]=useState({...run.current});
  useEffect(()=>ready(),[ready]);
  useFrame(({camera,size},dt)=>{
    if(camera instanceof OrthographicCamera){const zoom=Math.min(size.width/12,size.height/12);if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}camera.lookAt(0,0,0);}
    if(!paused)stepTraining(run.current,dt);
    const v=run.current;avatar.current?.position.set(v.dog.x,0,v.dog.z);if(avatar.current)avatar.current.rotation.y=v.heading;
    ball.current?.position.set(Math.sin(v.time*1.5)*3,.4,-2);
    timer.current+=dt;if(timer.current>.1){timer.current=0;const next={...v};setS(next);update(next);}
  });
  return <><color attach="background" args={['#ddd3bf']}/><hemisphereLight intensity={2.3}/><directionalLight position={[4,10,6]} intensity={2}/>
    <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[12,11]}/><meshStandardMaterial color="#bea882"/></mesh>
    {[-5.5,5.5].map(x=><mesh key={x} position={[x,.5,0]}><boxGeometry args={[.12,1,10]}/><meshStandardMaterial color="#e9d9b9"/></mesh>)}
    <group position={[-1,0,4]} rotation={[0,Math.PI,0]}><Handler3D/></group>
    {(s.discipline==='search'||s.discipline==='herding')?<>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]}><circleGeometry args={[1.1,32]}/><meshStandardMaterial color={s.rewardReady?'#deb06a':'#526d80'}/></mesh>
      <group ref={ball}><mesh><sphereGeometry args={[.25,16,12]}/><meshStandardMaterial color="#ce7946"/></mesh></group>
      <Html position={[0,1.7,0]} center style={{pointerEvents:'none'}}><span className="field-sign">{s.rewardReady?'GOOD STAY - REWARD':`${Math.min(6,s.hold).toFixed(1)} / 6s hold`}</span></Html>
    </>:FOOTWORK.map((p,i)=><group key={i} position={[p.x,.025,p.z]} onPointerDown={e=>{e.stopPropagation();if(!paused&&s.discipline==='agility'&&i===s.completed%5)trainingCommand(run.current,'pad');}}><mesh rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.5,24]}/><meshStandardMaterial color={i===s.completed%5?'#e5b663':'#647e8a'}/></mesh><Html position={[0,.5,0]} center style={{pointerEvents:'none'}}><span className="field-number">{i+1}</span></Html></group>)}
    <group ref={avatar}><Dog3D dog={dog} position={[0,0,0]} animation={s.moving&&!paused?'Run':'Idle'}/></group>
  </>;
}
export default function TrainingGame({dog,discipline,ability,onComplete,onCancel,returnLabel='Return to Field Club'}:{returnLabel?:string;dog:Dog;discipline:Discipline;ability:number;onComplete:(score:number,report:ActivityReport)=>void;onCancel:()=>void}){
  const run=useRef(createTraining(discipline,ability)),submitted=useRef(false);
  const [s,setS]=useState({...run.current}),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[loaded,setLoaded]=useState(false);
  const ready=useRef(()=>setLoaded(true)).current;
  useEffect(()=>{const pause=()=>setPaused(true);const visibility=()=>{if(document.hidden)pause();};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPaused(p=>!p);};window.addEventListener('blur',pause);document.addEventListener('visibilitychange',visibility);window.addEventListener('keydown',key);return()=>{window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('keydown',key);};},[]);
  const finished=s.phase==='finished',enabled=started&&!paused&&!finished,footwork=discipline==='agility',conditioning=discipline==='water';
  const command=(c:Parameters<typeof trainingCommand>[1])=>{if(enabled){trainingCommand(run.current,c);setS({...run.current});}};
  const explanation=footwork?'Guide your dog between ground pads to develop footwork. There are no agility obstacles in this exercise.':conditioning?'Build endurance on a dry-land circuit. Choose a pace, watch fatigue and take recovery breaks. This prepares the dog for swimming.':'Teach your dog to stay focused on a mat while a ball moves nearby. Encourage before attention drops, then reward after a six-second hold. This develops control for work in the field.';
  return createPortal(<section className="field-game training-game" role="dialog" aria-modal="true" aria-label={trainingName(discipline)} data-phase={s.phase} data-completed={s.completed} data-ready={s.rewardReady}>
    <header className="field-header"><div><small>TRAINING YARD / {dog.name}</small><h1>{trainingName(discipline)}</h1><p>{s.completed}/{footwork?10:3} complete · {Math.ceil(Math.max(0,120-s.time))}s remaining</p></div><div><button onClick={()=>setPaused(true)}>Pause</button><button onClick={onCancel}>Exit training</button></div></header>
    <div className="field-stage"><ErrorBoundary><Canvas orthographic camera={{position:[1,13,12],zoom:35}} dpr={[1,1.5]}><Suspense fallback={<Html center>Preparing the training yard...</Html>}><World run={run} dog={dog} paused={!enabled} update={setS} ready={ready}/></Suspense></Canvas></ErrorBoundary></div>
    <div className="field-feedback" role="status">{s.feedback}</div>
    <div className="field-controls"><p>{explanation}</p>
      {footwork?<button className="field-main-action" disabled={!enabled} onClick={()=>command('pad')}>Send to pad {s.completed%5+1}</button>:conditioning?<><label className="field-meter">Fatigue <meter min={0} max={100} value={s.fatigue}/>{Math.round(s.fatigue)}%</label><div className="field-targets">{(['walk','trot','rest'] as const).map(p=><button key={p} disabled={!enabled} aria-pressed={s.pace===p} onClick={()=>command(p)}>{p==='rest'?'Recover':p==='walk'?'Walk':'Trot'}</button>)}</div><p>{s.distance.toFixed(1)} / 54m conditioned</p></>:<><label className="field-meter">Attention <meter min={0} max={100} value={s.attention}/>{Math.round(s.attention)}%</label><div className="field-targets"><button disabled={!enabled||s.holding} onClick={()=>command('stay')}>Ask for a stay</button><button disabled={!enabled||s.encouragement>0} onClick={()=>command('encourage')}>Calm encouragement</button><button disabled={!enabled||!s.rewardReady} onClick={()=>command('reward')}>Reward completed hold</button></div></>}
    </div>
    {(!started||paused||finished)&&<div className="field-cover"><div className="field-brief"><small>{finished?'TRAINING REPORT':'BUILD A SKILL'}</small><h2>{finished?`${s.completed}/${footwork?10:3} completed`:trainingName(discipline)}</h2><p>{finished?`Time ${s.time.toFixed(1)}s. ${s.mistakes} corrections. Saving develops ${discipline} ability toward event qualification.`:explanation}</p><button className="journey-primary" disabled={!loaded} onClick={()=>{if(finished){if(!submitted.current){submitted.current=true;const report=trainingReport(run.current);onComplete(report.score,report);}}else{setStarted(true);setPaused(false);}}}>{!loaded?'Preparing your dog...':finished?'Save training':started?'Resume training':'Start training'}</button><button className="journey-text-button" onClick={onCancel}>{returnLabel}</button></div></div>}
  </section>,document.body);
}
