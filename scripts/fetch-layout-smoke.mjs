import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:390,height:844}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:100,thirst:100,energy_stat:100},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);
await page.getByRole('button',{name:'Go to the yard',exact:true}).click();await page.getByRole('button',{name:'Play fetch in the yard',exact:true}).click();await page.getByRole('button',{name:'Begin activity',exact:true}).click();await page.waitForTimeout(1200);
const box=await page.locator('.activity-scene').boundingBox();assert.ok(box.height>=150);const controls=await page.locator('.activity-actions').boundingBox();assert.ok(controls.y+controls.height<=page.viewportSize().height);assert.ok(box.y+box.height<=controls.y);
await page.screenshot({path:'.browser.local/fetch-final-'+(mobile?'landscape':'portrait')+'.png'});
await page.getByRole('button',{name:'Exit activity',exact:true}).click();await page.locator('.yard-stage').waitFor();assert.match(await page.locator('.yard-status').textContent(),/Energy 100%/);
console.log(mobile?'Landscape':'Portrait','fetch framing, visible controls and cancellation passed');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
