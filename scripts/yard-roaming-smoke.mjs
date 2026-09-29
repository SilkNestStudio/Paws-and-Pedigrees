import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:40,thirst:40,energy_stat:50},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'active',completed:['yard'],ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);
await page.getByRole('button',{name:'Go to the yard',exact:true}).click();
await page.getByText('Preparing your yard...', {exact:true}).waitFor({state:'hidden'});

const stage=page.locator('.yard-stage');
await page.waitForFunction(()=>document.querySelector('.yard-stage')?.dataset.behavior==='Sniffing around',{},{timeout:40000});
assert.equal(await page.locator('[data-tutorial-step=move]').count(),1,'Ambient walking must not finish the movement lesson');
assert.equal(await page.locator('meter[aria-label=Food]').evaluate(el=>el.value),40);
assert.equal(await page.locator('meter[aria-label=Water]').evaluate(el=>el.value),40);
await stage.scrollIntoViewIfNeeded();await page.screenshot({path:'.browser.local/yard-sniffing-'+(mobile?'mobile':'desktop')+'.png'});
const point=await page.evaluate(async()=>{const {PerspectiveCamera,Vector3}=await import('/node_modules/.vite/deps/three.js');const {YARD_CAMERA}=await import('/src/game/yard/camera.ts');const box=document.querySelector('.yard-stage canvas').getBoundingClientRect();const camera=new PerspectiveCamera(45,box.width/box.height,.1,1000);camera.position.set(...YARD_CAMERA.close.position);camera.lookAt(...YARD_CAMERA.close.target);camera.updateMatrixWorld();const p=new Vector3(3,.06,1).project(camera);return {x:box.x+(p.x+1)*box.width/2,y:box.y+(1-p.y)*box.height/2};});await page.mouse.click(point.x,point.y);
await page.waitForFunction(()=>{const s=document.querySelector('.yard-stage');return Math.abs(Number(s.dataset.ownerX)-3)<.1&&Math.abs(Number(s.dataset.ownerZ)-1)<.1;},{},{timeout:15000});
await page.getByRole('button',{name:'Call Scout back',exact:true}).click();await page.waitForFunction(()=>{const s=document.querySelector('.yard-stage');return Math.hypot(Number(s.dataset.x)-Number(s.dataset.ownerX),Number(s.dataset.z)-Number(s.dataset.ownerZ))<1.2;},{},{timeout:15000});
await page.getByRole('button',{name:'Ask to wait',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.yard-stage').dataset.behavior==='Waiting here');const held=await stage.evaluate(el=>[el.dataset.x,el.dataset.z]);await page.waitForTimeout(6500);assert.deepEqual(await stage.evaluate(el=>[el.dataset.x,el.dataset.z]),held);
await page.getByRole('button',{name:'Let them explore',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.yard-stage').dataset.behavior==='Exploring the yard'||document.querySelector('.yard-stage').dataset.behavior==='Following you',{},{timeout:15000});
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.getByRole('button',{name:'Continue together',exact:true}).waitFor();await page.waitForTimeout(250);const paused=await stage.evaluate(el=>[el.dataset.x,el.dataset.z]);await page.waitForTimeout(1000);assert.deepEqual(await stage.evaluate(el=>[el.dataset.x,el.dataset.z]),paused);await page.getByRole('button',{name:'Continue together',exact:true}).click();
console.log(mobile?'Mobile':'Desktop','ambient sniffing, no automatic lesson/care, click interruption, recall, wait/release and blur pause passed');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
