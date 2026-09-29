import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { Group, Mesh, Vector3 } from 'three';
import Dog3D from '../../components/training/3d/Dog3D';
import type { Dog } from '../../types';
import { useGameStore } from '../../stores/gameStore';
import { nextRibbonStep } from '../../utils/firstRibbon';
import { YARD_CAMERA } from './camera';
import Handler3D from './Handler3D';
import { yardPath } from './handler';
import { createRoaming, resetRoaming, stepRoaming } from './roaming';
import { neededBowl, YARD_CARE_THRESHOLD } from './care';
import { stations, type YardPosition } from './simulation';

type Station = typeof stations[number];
type Task = 'follow' | 'recall' | 'food' | 'water' | 'rest';
function advance(position:YardPosition, path:YardPosition[], speed:number, dt:number) {
    const target=path[0]; if(!target)return {moving:false,x:0,z:0};
    const distance=Math.hypot(target.x-position.x,target.z-position.z);
    const step=Math.min(distance,speed*dt), x=distance?(target.x-position.x)/distance:0,z=distance?(target.z-position.z)/distance:0;
    position.x+=x*step;position.z+=z*step;
    if(distance<=step+.001)path.shift();
    return {moving:step>0,x,z};
}
function place(group:Group|null, p:YardPosition, direction:{x:number;z:number}, dt:number) {
    if(!group)return;group.position.set(p.x,.07,p.z);
    if(direction.x||direction.z){const heading=Math.atan2(direction.x,direction.z);group.rotation.y+=Math.atan2(Math.sin(heading-group.rotation.y),Math.cos(heading-group.rotation.y))*Math.min(1,dt*12);}
}
export default function YardWorld({dog,spawn,ownerSpawn,destination,preparing,paused,waiting,cue,overview,low,onArrive,onSend,onStation,onPosition,onOwnerPosition,onBehavior,onMessage,onBusy}:{
    dog:Dog;spawn:YardPosition;ownerSpawn:YardPosition;destination:YardPosition|null;preparing:boolean;paused:boolean;waiting:boolean;
    cue:{id:number;kind:'recall'|'rest'}|null;overview:boolean;low:boolean;
    onArrive:()=>void;onSend:(p:YardPosition)=>void;onStation:(s:Station)=>void;
    onPosition:(p:YardPosition)=>void;onOwnerPosition:(p:YardPosition)=>void;
    onBehavior:(s:string)=>void;onMessage:(s:string)=>void;onBusy:(v:boolean)=>void;
}) {
    const {scene}=useGLTF('/models/kennel_yard.glb');
    const environment=useMemo(()=>{const copy=scene.clone(true);copy.traverse(n=>{if(n instanceof Mesh){n.castShadow=true;n.receiveShadow=true;if(n.name.startsWith('Bowl_contents'))n.visible=false;}});return copy;},[scene]);
    const owner=useRef({...ownerSpawn}), position=useRef({...spawn});
    const ownerModel=useRef<Group>(null), dogModel=useRef<Group>(null);
    const ownerRoute=useRef<YardPosition[]>([]), dogRoute=useRef<YardPosition[]>([]);
    const task=useRef<Task|null>(null), careTime=useRef(0), prepareTime=useRef(0), arrival=useRef(false);
    const roaming=useRef(createRoaming()), walked=useRef(0), publish=useRef(0), recallGrace=useRef(0);
    const target=useRef(new Vector3()), look=useRef(new Vector3(...YARD_CAMERA.close.target));
    const [pose,setPose]=useState({ownerMoving:false,tending:false,animation:'Idle' as 'Idle'|'Walk'|'Eat'|'Sit'|'Sniff'});
    const lesson=useGameStore(s=>s.tutorialProgress.firstRibbon?.status==='active'&&s.tutorialProgress.firstRibbon.dogId===dog.id?nextRibbonStep(s.tutorialProgress.firstRibbon)?.id:undefined);
    const earned=useGameStore(s=>s.tutorialProgress.firstRibbon?.ribbonEarned);
    const begin=(kind:Task,p:YardPosition)=>{const path=yardPath(position.current,p);if(!path)return false;task.current=kind;dogRoute.current=path;careTime.current=0;resetRoaming(roaming.current);return true;};
    useEffect(()=>{
        ownerRoute.current=destination?yardPath(owner.current,destination)??[]:[];
        arrival.current=!!destination;prepareTime.current=0;
        if(destination){task.current=null;dogRoute.current=[];careTime.current=0;resetRoaming(roaming.current);recallGrace.current=2;}
    },[destination]);
    useEffect(()=>{task.current=null;dogRoute.current=[];careTime.current=0;resetRoaming(roaming.current);},[waiting]);
    useEffect(()=>{
        if(!cue)return;
        if(cue.kind==='rest'){const mat=stations.find(s=>s.id==='rest')!;begin('rest',mat);}
        else {const p={x:owner.current.x+.8,z:owner.current.z};begin('recall',yardPath(position.current,p)?p:owner.current);}
    },[cue]);
    useFrame(({camera},delta)=>{
        const dt=Math.min(.05,Math.max(0,delta));let ownerMoving=false,tending=false;
        let motion={moving:false,x:0,z:0},animation:typeof pose.animation='Idle',behavior='Taking in the surroundings';
        if(!paused){
            const before={...owner.current};const ownerMotion=advance(owner.current,ownerRoute.current,2.7,dt);ownerMoving=ownerMotion.moving;
            place(ownerModel.current,owner.current,ownerMotion,dt);
            if(lesson==='move'){walked.current+=Math.hypot(owner.current.x-before.x,owner.current.z-before.z);if(walked.current>=3)useGameStore.getState().recordRibbon(dog.id,'move');}
            if(arrival.current&&!ownerRoute.current.length){
                tending=preparing;prepareTime.current+=dt;
                if(tending){const station=[...stations].sort((a,b)=>Math.hypot(a.x-owner.current.x,a.z-owner.current.z)-Math.hypot(b.x-owner.current.x,b.z-owner.current.z))[0];place(ownerModel.current,owner.current,{x:station.x-owner.current.x,z:station.z-owner.current.z},dt);}
                if(!preparing||prepareTime.current>=1.2){arrival.current=false;onArrive();}
            }
            recallGrace.current=Math.max(0,recallGrace.current-dt);
            // Commands outrank needs; a waiting dog never consumes supplies.
            if(waiting){behavior='Waiting here';animation='Sit';}
            else {
                const live=useGameStore.getState().dogs.find(d=>d.id===dog.id);
                if(task.current==='food'||task.current==='water'){
                    const kind=task.current;
                    if(!live||!live.yard_bowls?.[kind]||(kind==='food'?live.hunger:live.thirst)>YARD_CARE_THRESHOLD){task.current=null;dogRoute.current=[];careTime.current=0;}
                }
                if(!task.current&&recallGrace.current===0){const need=live&&neededBowl(live);if(need){const bowl=stations.find(s=>s.id===need)!;begin(need,{x:bowl.x,z:bowl.z+.6});}}
                const distance=Math.hypot(owner.current.x-position.current.x,owner.current.z-position.current.z);
                if(!task.current&&distance>3.8){begin('follow',owner.current);}
                if(task.current){
                    const current=task.current;
                    if(current==='follow'&&distance<1.5){task.current=null;dogRoute.current=[];resetRoaming(roaming.current,3);}
                    else {
                        motion=advance(position.current,dogRoute.current,current==='follow'||current==='recall'?3.4:2,dt);
                        animation=motion.moving?'Walk':'Idle';
                        behavior=current==='recall'?'Coming back to you':current==='follow'?'Following you':current==='rest'?'Going to the mat':`Going to the ${current==='water'?'water':'food'} bowl`;
                        if(!dogRoute.current.length){
                            if(current==='recall'||current==='follow'){task.current=null;recallGrace.current=6;resetRoaming(roaming.current,6);}
                            else {
                                const bowl=stations.find(s=>s.id===current)!;
                                place(dogModel.current,position.current,{x:bowl.x-position.current.x,z:bowl.z-position.current.z},dt);
                                animation=current==='rest'?'Sit':'Eat';behavior=current==='food'?'Eating their meal':current==='water'?'Drinking fresh water':'Resting together';
                                careTime.current+=dt;
                                if(careTime.current>=2.2){
                                    task.current=null;careTime.current=0;recallGrace.current=3;resetRoaming(roaming.current,4);
                                    const state=useGameStore.getState();const result=current==='food'?state.feedDog(dog.id,'bowl'):current==='water'?state.waterDog(dog.id,'bowl'):state.restDog(dog.id);
                                    onMessage(result.success?(current==='food'?`${dog.name} finished the meal. The food bowl is empty.`:current==='water'?`${dog.name} had a drink. Refill the water bowl when you are ready.`:result.message??'Rest complete.'):result.message??'Care interrupted.');
                                }
                            }
                        }
                    }
                }else {
                    const ambient=stepRoaming(roaming.current,position.current,dt,Math.random,owner.current);position.current=ambient.position;motion=ambient;
                    animation=ambient.moving?'Walk':ambient.sniffing?'Sniff':'Idle';behavior=ambient.sniffing?'Sniffing around':ambient.moving?'Exploring the yard':'Taking in the surroundings';
                }
            }
        }else behavior='Paused';
        place(ownerModel.current,owner.current,{x:0,z:0},dt);place(dogModel.current,position.current,motion,dt);
        const preset=overview?YARD_CAMERA.overview:YARD_CAMERA.close;
        camera.position.lerp(target.current.set(...preset.position),1-Math.exp(-4*dt));look.current.lerp(target.current.set(...preset.target),1-Math.exp(-4*dt));camera.lookAt(look.current);
        publish.current+=delta;
        if(publish.current>.1){publish.current=0;setPose({ownerMoving,tending,animation});onPosition({...position.current});onOwnerPosition({...owner.current});onBehavior(behavior);onBusy(tending||careTime.current>0);}
    });
    return <>
        <color attach="background" args={['#e1d9ca']}/><fog attach="fog" args={['#e1d9ca',28,65]}/>
        <hemisphereLight args={['#fff0dd','#687b65',1.8]}/><directionalLight position={[-8,18,8]} intensity={2.3} castShadow={!low} shadow-mapSize={[1024,1024]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-normalBias={.04}/>
        <primitive object={environment} dispose={null}/>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.06,0]} onClick={e=>{e.stopPropagation();onSend({x:e.point.x,z:e.point.z});}}><planeGeometry args={[22,22]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
        <group ref={ownerModel}><Handler3D moving={pose.ownerMoving} tending={pose.tending}/></group>
        <group ref={dogModel}><Dog3D dog={dog} position={[0,0,0]} animation={pose.animation} speed={task.current?1:.65}/></group>
        {destination&&<mesh position={[destination.x,.1,destination.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.25,.32,32]}/><meshBasicMaterial color="#bb7848"/></mesh>}
        {stations.map(s=><Html key={s.id} position={[s.x,s.id==='inside'?3.3:s.id==='food'?1.1:2.1,s.id==='inside'?-3.4:s.z]} center zIndexRange={[1,0]}><button disabled={paused} className={`yard-station-marker yard-marker-${s.id}`} data-station={s.id} onClick={()=>onStation(s)}>{s.id==='water'?<>Water<small>{dog.yard_bowls?.water?'ready':'empty'}</small></>:s.id==='food'?<>Food<small>{dog.yard_bowls?.food?'ready':'empty'}</small></>:s.id==='inside'?'Go inside':s.id==='rest'?'Rest':s.id==='supplies'?'Supplies':'Agility'}<i aria-hidden="true"/></button></Html>)}
        {(['food','water'] as const).map(kind=>{const s=stations.find(s=>s.id===kind)!;return dog.yard_bowls?.[kind]&&<mesh key={kind} position={[s.x,.22,s.z]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.29,24]}/><meshStandardMaterial color={kind==='water'?'#72adbd':'#886044'} roughness={kind==='water'?.25:.9}/></mesh>;})}
        {['water','feed','rest','agility'].includes(lesson??'')&&stations.filter(s=>s.id===(lesson==='feed'?'food':lesson)).map(s=><mesh key={s.id} position={[s.x,.1,s.z]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.6,.75,32]}/><meshBasicMaterial color="#efc36b"/></mesh>)}
        {earned&&<group position={[-5.2,2,-3.62]}><mesh><circleGeometry args={[.19,16]}/><meshStandardMaterial color="#dbb65f"/></mesh>{[-.08,.08].map(x=><mesh key={x} position={[x,-.22,-.01]} rotation={[0,0,x*2]}><planeGeometry args={[.12,.35]}/><meshStandardMaterial color="#354e70" side={2}/></mesh>)}</group>}
    </>;
}
