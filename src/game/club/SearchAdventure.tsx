import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Group, InstancedMesh, Object3D, OrthographicCamera, QuadraticBezierCurve3, Vector3 } from 'three';
import Dog3D from '../../components/training/3d/Dog3D';
import Handler3D from '../yard/Handler3D';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import type { Dog } from '../../types';
import { reportMetrics, type ActivityReport } from './performance';
import { SEARCH_CASES, adventureReport, chooseTrail, createSearchAdventure, currentChapter, recallSearchDog, refreshSearchScent, routeObservation, scentRadius, sendSearchDog, stepSearchAdventure, type SearchAdventureState, type TrailPoint } from './searchTrail';
import './searchAdventure.css';

function Path({a,b,width=2}:{a:TrailPoint;b:TrailPoint;width?:number}) {
  const curve=useMemo(()=>new QuadraticBezierCurve3(new Vector3(a.x,0,a.z),new Vector3((a.x+b.x)/2+.45,0,(a.z+b.z)/2),new Vector3(b.x,0,b.z)),[a.x,a.z,b.x,b.z]);
  return <mesh position={[0,.025,0]} scale={[1,.025,1]} receiveShadow><tubeGeometry args={[curve,20,width/2,6,false]}/><meshStandardMaterial color="#c9ae7d" roughness={1}/></mesh>;
}
function Forest({length,seed}:{length:number;seed:number}) {
  const trunks=useRef<InstancedMesh>(null),crowns=useRef<InstancedMesh>(null);
  const trees=useMemo(()=>Array.from({length:64},(_,i)=>{
    const n=Math.sin((i+1)*127.1+seed)*43758.5453,r=n-Math.floor(n);
    return {x:(i%2?1:-1)*(8.5+r*7),z:16-Math.floor(i/2)*(length+19)/32,y:2.5+r*2.3,scale:.8+r*.65};
  }),[length,seed]);
  useEffect(()=>{const object=new Object3D();trees.forEach((t,i)=>{
    object.position.set(t.x,t.y/2,t.z);object.scale.set(.22,t.y,.22);object.updateMatrix();trunks.current?.setMatrixAt(i,object.matrix);
    object.position.set(t.x,t.y+1,t.z);object.scale.set(t.scale*1.8,t.scale*2.1,t.scale*1.65);object.rotation.y=i;object.updateMatrix();crowns.current?.setMatrixAt(i,object.matrix);crowns.current?.setColorAt(i,new Color(['#bda569','#ac8c59','#b88554','#89916a'][i%4]));
  });if(trunks.current)trunks.current.instanceMatrix.needsUpdate=true;if(crowns.current)crowns.current.instanceMatrix.needsUpdate=true;},[trees]);
  return <><instancedMesh ref={trunks} args={[undefined,undefined,64]} castShadow><cylinderGeometry args={[.7,1,1,6]}/><meshStandardMaterial color="#685445"/></instancedMesh><instancedMesh ref={crowns} args={[undefined,undefined,64]} castShadow><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#ffffff" roughness={1} flatShading/></instancedMesh></>;
}
function Pack({color}:{color:string}) {
  return <group><mesh position={[0,.4,0]} castShadow><boxGeometry args={[.65,.8,.36]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,.3,.23]}><boxGeometry args={[.5,.35,.15]}/><meshStandardMaterial color="#d6b982"/></mesh><mesh position={[0,.87,0]}><torusGeometry args={[.14,.035,5,12,Math.PI]}/><meshStandardMaterial color="#443c37"/></mesh></group>;
}
function Scene({run,dog,paused,onReady,onSnapshot}:{run:MutableRefObject<SearchAdventureState>;dog:Dog;paused:boolean;onReady:(ready:boolean)=>void;onSnapshot:(state:SearchAdventureState)=>void}) {
  const dogGroup=useRef<Group>(null),human=useRef<Group>(null),elapsed=useRef(0),cameraPosition=useRef(new Vector3());
  const [s,setS]=useState(()=>({...run.current}));
  const person=SEARCH_CASES[s.caseIndex],length=s.chapters.length*15,chapter=currentChapter(s);
  useEffect(()=>onReady(true),[onReady]);
  useFrame(({camera,size},dt)=>{
    if(!paused)stepSearchAdventure(run.current,dt);
    const v=run.current;
    if(dogGroup.current){dogGroup.current.position.set(v.dog.x,.03,v.dog.z);dogGroup.current.rotation.y=v.heading;}
    if(human.current){human.current.position.set(v.handler.x,0,v.handler.z);human.current.rotation.y=Math.atan2(v.dog.x-v.handler.x,v.dog.z-v.handler.z);}
    if(camera instanceof OrthographicCamera){const zoom=Math.min(size.width/19,size.height/19);if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}}
    cameraPosition.current.set(v.dog.x*.45+5,18,v.dog.z+15);camera.position.lerp(cameraPosition.current,1-Math.exp(-3*Math.min(dt,.1)));camera.lookAt(v.dog.x*.45,0,v.dog.z-1.5);
    elapsed.current+=dt;if(elapsed.current>.1){elapsed.current=0;const next={...v,dog:{...v.dog},discoveries:[...v.discoveries],visited:[...v.visited]};setS(next);onSnapshot(next);}
  });
  return <>
    <color attach="background" args={['#d9c8a7']}/><fog attach="fog" args={['#d9c8a7',32,62]}/>
    <hemisphereLight args={['#fff2d2','#6e6454',2]}/><directionalLight position={[-10,24,12]} intensity={2.1} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={20} shadow-camera-bottom={-length} shadow-camera-far={130} shadow-normalBias={.05}/>
    <mesh position={[0,-.04,10-length/2]} rotation={[-Math.PI/2,0,0]} receiveShadow onPointerDown={e=>{e.stopPropagation();if(!paused)sendSearchDog(run.current,{x:e.point.x,z:e.point.z});}}><planeGeometry args={[44,length+40]}/><meshStandardMaterial color="#ae956a" roughness={1}/></mesh>
    <Forest length={length} seed={s.seed}/>
    <mesh position={[-13,.005,8-length/2]} rotation={[-Math.PI/2,0,-.035]}><planeGeometry args={[4,length+30]}/><meshStandardMaterial color="#769b9d" roughness={.4}/></mesh>
    <Path a={{x:0,z:15}} b={s.chapters[0].fork}/>
    {s.chapters.map((c,i)=><group key={i}>
      {c.choices.map((p,j)=><group key={j}>
        <Path a={c.fork} b={p}/>
        {i<s.chapters.length-1&&<Path a={p} b={s.chapters[i+1].fork} width={1.2}/>}
        <mesh position={[p.x+(j===0?-.9:.9),.4,p.z-1]} rotation={[0,.5,Math.PI/2]}><cylinderGeometry args={[.28,.4,2.2,7]}/><meshStandardMaterial color="#75604a"/></mesh>
        {i===s.stage&&s.visited.includes(`${i}:${j}`)&&<>
          <mesh position={[p.x,.055,p.z+.45]} rotation={[-Math.PI/2,0,.3]}><planeGeometry args={[.35,j===c.correct?.65:.3]}/><meshStandardMaterial color={j===c.correct?person.color:'#eee2bd'}/></mesh>
          {[0,1,2].map(n=><group key={n} position={[p.x+(n%2?-.2:.2),.04,p.z+1.3+n*.45]}><mesh rotation={[-Math.PI/2,0,0]} scale={[j===c.correct?.16:.08,j===c.correct?.29:.1,1]}><circleGeometry args={[1,8]}/><meshStandardMaterial color="#705d46"/></mesh></group>)}
        </>}
        {i===s.stage&&s.task!=='casting'&&<Html position={[p.x,1.2,p.z]} center zIndexRange={[3,1]}><button className="trail-landmark" disabled={paused||s.task==='inspecting'} onClick={()=>chooseTrail(run.current,j)}>{p.name}<span>{s.checked.includes(`${i}:${j}`)?'Animal trail':s.visited.includes(`${i}:${j}`)?'Evidence nearby':'Explore this trail'}</span></button></Html>}
        {i===s.chapters.length-1&&i===s.stage&&j===c.correct&&Math.hypot(s.dog.x-p.x,s.dog.z-p.z)<3&&<group position={[p.x+.5,0,p.z-.3]}><Pack color={person.color}/></group>}
      </group>)}
      <mesh position={[.9,.5,c.fork.z]}><boxGeometry args={[.12,1,.12]}/><meshStandardMaterial color="#69533c"/></mesh><mesh position={[.9,.9,c.fork.z]}><boxGeometry args={[1.15,.3,.1]}/><meshStandardMaterial color="#d4bc89"/></mesh>
      {i===s.stage&&<mesh position={[c.fork.x,.03,c.fork.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.55,.6,32]}/><meshBasicMaterial color="#e8d5aa" transparent opacity={.7}/></mesh>}
    </group>)}
    <group position={[-3,0,12]}><mesh rotation={[0,0,Math.PI/4]} position={[0,.75,0]}><coneGeometry args={[1.6,1.8,4]}/><meshStandardMaterial color="#657e82" flatShading/></mesh><mesh position={[0,.12,1]}><boxGeometry args={[1.4,.2,1.4]}/><meshStandardMaterial color="#6c5b49"/></mesh></group>
    {Array.from({length:8},(_,i)=>{const p=s.gap??chapter.choices[chapter.correct],t=(i+1)/9,x=s.gap?s.dog.x+(p.x-s.dog.x)*t:chapter.fork.x+(p.x-chapter.fork.x)*t+s.wind,z=s.gap?s.dog.z+(p.z-s.dog.z)*t:chapter.fork.z+(p.z-chapter.fork.z)*t;
      const visible=(s.boost>0||s.signal>.04)&&Math.hypot(x-s.dog.x,z-s.dog.z)<scentRadius(s);
      return visible&&<mesh key={i} position={[x,.18+Math.sin(s.time*2+i)*.08,z]}><sphereGeometry args={[.055,6,5]}/><meshBasicMaterial color="#ffe2a0" transparent opacity={.55+Math.sin(s.time*3+i)*.25}/></mesh>;
    })}
    <mesh position={[s.target.x,.04,s.target.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.25,.3,24]}/><meshBasicMaterial color="#fff1cb" transparent opacity={s.moving?.7:0}/></mesh>
    <group ref={human}><Handler3D moving={s.moving&&!paused}/></group>
    <group ref={dogGroup}><Dog3D dog={dog} position={[0,0,0]} animation={s.phase==='finished'?'Sit':s.task==='inspecting'?'Sniff':s.moving&&!paused?s.pace==='brisk'?'Run':'Walk':'Sniff'}/></group>
  </>;
}
export default function SearchAdventure({dog,ability,seed,challenge=false,onComplete,onCancel}:{dog:Dog;ability:number;seed:number;challenge?:boolean;onComplete:(score:number,report:ActivityReport)=>void;onCancel:()=>void}) {
  const run=useRef(createSearchAdventure(ability,seed,challenge)),submitted=useRef(false);
  const [s,setS]=useState(()=>({...run.current})),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[journal,setJournal]=useState(false);
  const person=SEARCH_CASES[s.caseIndex],chapter=currentChapter(s),finished=s.phase==='finished',enabled=started&&!paused&&!finished;
  useEffect(()=>{const pause=()=>setPaused(true),visibility=()=>{if(document.hidden)pause();},key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setPaused(v=>!v);}};window.addEventListener('blur',pause);document.addEventListener('visibilitychange',visibility);window.addEventListener('keydown',key);return()=>{window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('keydown',key);};},[]);
  const command=(fn:()=>void)=>{if(enabled){fn();setS({...run.current});}};
  const report=adventureReport(s);
  return createPortal(<section className="search-adventure" role="dialog" aria-modal="true" aria-label="Woodland search adventure" data-stage={s.stage} data-task={s.task} data-phase={s.phase} data-x={s.dog.x.toFixed(2)} data-z={s.dog.z.toFixed(2)}>
    <header className="search-header"><div><small>FIELD CLUB / WOODLAND SEARCH</small><h1>The missing {person.item}</h1><p>{dog.name} & you <span>{s.discoveries.length}/{s.chapters.length} trail discoveries</span></p></div><nav aria-label="Search controls"><button onClick={()=>{setJournal(v=>!v);setPaused(true);}}>Field notes</button><button onClick={()=>setPaused(true)}>Pause</button><button onClick={onCancel}>Exit search</button></nav></header>
    <div className="search-world"><ErrorBoundary fallback={<p>The woodland could not load. Use Exit search to return to the club.</p>}><Canvas orthographic shadows dpr={[1,1.5]} camera={{position:[5,18,27],zoom:35,near:.1,far:120}} fallback={<p>3D is unavailable. Use Exit search to return safely.</p>}><Suspense fallback={<Html center>Opening the woodland...</Html>}><Scene run={run} dog={dog} paused={!enabled} onReady={setReady} onSnapshot={setS}/></Suspense></Canvas></ErrorBoundary>
      <div className="search-objective"><small>YOUR LEAD</small><strong>{s.stage===0?`${person.garment}. Deep bootprints.`:`Follow ${person.name}'s trail deeper into the woods.`}</strong><span>Tap the ground to explore. Examine both trails if unsure.</span></div>
      <div className="search-wind" aria-label={`Breeze drifting ${s.wind<0?'left':'right'}`}><span aria-hidden="true">{s.wind<0?'←':'→'}</span> Breeze carries scent</div>
    </div>
    <div className="search-dog-status" role="status"><span className={s.signal>.2?'scent-light is-found':'scent-light'}/><div><strong>{s.behavior}</strong><p>{s.feedback}</p></div>{s.task==='inspecting'&&<progress aria-label="Checking the scent" max={1} value={s.inspection}/>}</div>
    <div className="search-toolbar"><div className="search-commands"><button aria-pressed={s.pace==='careful'} disabled={!enabled} onClick={()=>command(()=>{run.current.pace=run.current.pace==='careful'?'brisk':'careful';})}>{s.pace==='careful'?'Pace: careful search':'Pace: cover ground'}</button><button disabled={!enabled||s.boost>0||s.scentUses===0} onClick={()=>command(()=>refreshSearchScent(run.current))}>Take scent again ({s.scentUses})</button><button disabled={!enabled||s.task==='following'} onClick={()=>command(()=>recallSearchDog(run.current))}>{s.task==='distracted'?'Leave it - back to trail':'Recall to the fork'}</button></div>
      {s.task==='casting'&&<div className="search-casting"><strong>Find the trail across the clearing</strong><span>Tap open ground ahead, or direct a short sweep:</span><div>{([-1,0,1] as const).map(direction=><button key={direction} disabled={!enabled} onClick={()=>command(()=>sendSearchDog(run.current,{x:run.current.dog.x+direction*3,z:run.current.dog.z-2}))}>{direction===-1?'Sweep left':direction===1?'Sweep right':'Search ahead'}</button>)}</div></div>}{(s.task==='choosing'||s.task==='exploring'||s.task==='returning'||s.task==='distracted')&&<div className="search-routes">{chapter.choices.map((p,i)=><button key={`${s.stage}:${i}`} disabled={!enabled||s.checked.includes(`${s.stage}:${i}`)} onClick={()=>command(()=>chooseTrail(run.current,i))}><small>{i===0?'LEFT TRAIL':'RIGHT TRAIL'}</small><strong>{p.name}</strong><span>{s.checked.includes(`${s.stage}:${i}`)?'Checked: animal scent. Try the other route.':routeObservation(s,i)}</span></button>)}</div>}
    </div>
    {(!started||paused||finished)&&<div className="search-cover"><div className="search-brief"><small>{finished?'CASE CLOSED':journal?'YOUR FIELD NOTES':started?'TRAIL PAUSED':'A JOB FOR YOUR PARTNERSHIP'}</small><h2>{finished?`${person.name}'s ${person.item}, found.`:journal?'Read the evidence.':started?'The trail will wait.':`Help ${person.name} find their ${person.item}.`}</h2>
      {finished?<><p>{person.name}, the {person.job}, thanks you and {dog.name}. You followed the evidence and brought the missing gear home.</p><div className="search-case-score"><strong>{report.score}<small>/100</small></strong><span>{s.mistakes===0?'A clean trail. Every lead counted.':`${s.mistakes} animal trail${s.mistakes===1?'':'s'} ruled out. You recovered and finished.`}</span></div><dl className="search-report">{reportMetrics(report).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>:<><p>{person.name} last had the pack at the woodland camp, wearing a <strong>{person.garment}</strong>. Follow matching fabric and human bootprints. Rabbit tracks and picnic smells can lead your dog astray. When the trail breaks, cast across the clearing to find it again.</p><ol><li><strong>Read your dog.</strong> A familiar scent brings the nose down and reveals a short amber ribbon.</li><li><strong>Explore a fork.</strong> Tap nearby ground to examine evidence, then choose your route.</li><li><strong>Recover together.</strong> Recall from a distraction or refresh the scent sample. Careful pacing gives a wider search.</li></ol><p className="search-reassurance">No countdown. Take time to investigate. Your dog checks evidence automatically when close.</p></>}
      {s.discoveries.length>0&&<ul className="search-notebook">{s.discoveries.map((v,i)=><li key={i}>✓ {v}</li>)}</ul>}
      <button className="search-primary" disabled={!ready} onClick={()=>{if(finished){if(!submitted.current){submitted.current=true;const result=adventureReport(run.current);onComplete(result.score,result);}}else{setStarted(true);setPaused(false);setJournal(false);}}}>{!ready?'Preparing the woodland...':finished?'Save search & return':started?'Continue search':'Take the scent & begin'}</button><button className="search-secondary" onClick={onCancel}>Return to Field Club</button>
    </div></div>}
  </section>,document.body);
}
