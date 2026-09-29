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
await page.waitForTimeout(2000);
await page.locator('.yard-stage').scrollIntoViewIfNeeded();
async function checkMarkers(){
 const stage=await page.locator('.yard-stage').boundingBox();
 const markers=await page.locator('.yard-station-marker').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {id:el.dataset.station,x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(getComputedStyle(el).fontSize)};}));
 assert.equal(markers.length,6);
 for(const m of markers){assert.ok(m.font>=13,`${m.id} text is too small`);assert.ok(m.x>=stage.x&&m.x+m.width<=stage.x+stage.width,`${m.id} horizontal clipping`);assert.ok(m.y>=stage.y&&m.y+m.height<=stage.y+stage.height,`${m.id} vertical clipping`);}
 for(const selector of ['.yard-status','.yard-camera-toggle']){const overlay=await page.locator(selector).boundingBox();for(const m of markers)assert.ok(m.x+m.width<=overlay.x||overlay.x+overlay.width<=m.x||m.y+m.height<=overlay.y||overlay.y+overlay.height<=m.y,`${m.id} covered by ${selector}`);}
 const water=markers.find(m=>m.id==='water'),food=markers.find(m=>m.id==='food');assert.ok(water.x+water.width<=food.x||food.x+food.width<=water.x||water.y+water.height<=food.y||food.y+food.height<=water.y,'Food and water labels overlap: '+JSON.stringify({water,food}));
 return markers;
}
const close=await checkMarkers();await page.screenshot({path:'.browser.local/yard-readable-'+(mobile?'mobile':'desktop')+'.png'});
await page.getByRole('button',{name:'Whole yard',exact:true}).click();await page.waitForTimeout(1800);const wide=await checkMarkers();assert.deepEqual(close.map(m=>m.font),wide.map(m=>m.font));
await page.getByRole('button',{name:'Closer view',exact:true}).click();await page.waitForTimeout(1800);await checkMarkers();assert.equal(await page.locator('.kennel-yard').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);await context.close();
}assert.deepEqual(errors,[]);console.log('Yard camera desktop/mobile: readable constant-size labels, no label clipping/overlap, and both camera views passed.');
}finally{await browser.close();}
