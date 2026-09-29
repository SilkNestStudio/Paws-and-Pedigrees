import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:40,thirst:40,energy_stat:50},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);
await page.getByRole('button',{name:'Go to the yard',exact:true}).click();
await page.getByText('Preparing your yard...', {exact:true}).waitFor({state:'hidden'});

const stage=page.locator('.yard-stage');
await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
assert.equal(await page.getByText('You',{exact:true}).count(),0);
await page.getByRole('button',{name:'Ask to wait',exact:true}).click();
await page.getByRole('button',{name:'Put out a meal',exact:false}).click();
await page.waitForFunction(()=>document.querySelector('[data-station=food]')?.textContent.includes('ready'),{},{timeout:25000});
// Immediately hold the dog before consumption; preparing reserves the meal, not care credit.
await page.getByRole('button',{name:'Ask to wait',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.yard-stage')?.dataset.behavior==='Waiting here');
assert.equal(await page.locator('meter[aria-label=Food]').evaluate(el=>el.value),40);
const pantry=await page.locator('.yard-companion').textContent();
await page.waitForTimeout(3500);
assert.equal(await page.locator('meter[aria-label=Food]').evaluate(el=>el.value),40);
await stage.scrollIntoViewIfNeeded();await page.screenshot({path:'.browser.local/handler-yard-'+(mobile?'mobile':'desktop')+'.png'});
// Reload with a reserved serving. The dog can resume care in the yard, without another charge.
await page.reload();await page.getByRole('button',{name:'Go to the yard',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('meter[aria-label=Food]')?.value>=99,{},{timeout:30000});
assert.match(await page.locator('[data-station=food]').textContent(),/empty/);
await page.getByRole('button',{name:'Fill water bowl',exact:false}).click();
await page.waitForFunction(()=>document.querySelector('.yard-stage')?.dataset.behavior==='Drinking fresh water',{},{timeout:25000});
await page.getByRole('button',{name:'Call Scout back',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.yard-stage')?.dataset.behavior==='Coming back to you');
assert.equal(await page.locator('meter[aria-label=Water]').evaluate(el=>el.value),40);
await page.getByRole('button',{name:'Ask to wait',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.yard-stage')?.dataset.behavior==='Waiting here');
const held=await stage.evaluate(el=>[el.dataset.x,el.dataset.z]);await page.waitForTimeout(3000);
assert.deepEqual(await stage.evaluate(el=>[el.dataset.x,el.dataset.z]),held);
await page.getByRole('button',{name:'Let them explore',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('meter[aria-label=Water]')?.value>=99,{},{timeout:25000});
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.getByRole('button',{name:'Continue together',exact:true}).waitFor();await page.waitForTimeout(250);
const paused=await stage.evaluate(el=>[el.dataset.x,el.dataset.z,el.dataset.ownerX,el.dataset.ownerZ]);await page.waitForTimeout(1000);assert.deepEqual(await stage.evaluate(el=>[el.dataset.x,el.dataset.z,el.dataset.ownerX,el.dataset.ownerZ]),paused);
await page.getByRole('button',{name:'Continue together',exact:true}).click();
await page.locator('[data-station=supplies]').click();await page.getByRole('heading',{name:/Shop|Market/}).first().waitFor({timeout:25000});
console.log(mobile?'Mobile':'Desktop','handler, reserved meal reload, autonomous care, interruption, wait/release, pause and Supplies route passed');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
