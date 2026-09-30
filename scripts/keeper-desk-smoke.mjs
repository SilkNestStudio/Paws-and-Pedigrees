import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:40,thirst:40,energy_stat:50},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);

const desk=page.getByRole('dialog',{name:'Keeper desk',exact:true});
async function openDesk(){await page.getByText('Opening your kennel?',{exact:true}).waitFor({state:'hidden'});await page.locator('[data-room=desk]').click();await desk.waitFor({timeout:15000});}
await openDesk();
const box=await desk.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=page.viewportSize().width&&box.y+box.height<=page.viewportSize().height);
assert.equal(await desk.evaluate(el=>el.matches(':modal')),true);
assert.equal(await desk.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
await page.screenshot({path:'.browser.local/keeper-desk-'+(mobile?'mobile':'desktop')+'.png'});
await desk.getByRole('button',{name:'Return to kennel interior',exact:true}).click();await desk.waitFor({state:'hidden'});
assert.equal(await page.locator('[data-room=desk]').evaluate(el=>el===document.activeElement),true);
await openDesk();await page.keyboard.press('Escape');await desk.waitFor({state:'hidden'});
for(const [label,view] of [['Expand the kennel','expansion'],['Training plans','training'],['Breeding & nursery','breeding'],['Find work','jobs'],['Story chapters','story']]){
 await openDesk();await desk.getByRole('button',{name:label,exact:true}).click();await page.locator('[data-scene='+view+']').waitFor();await page.getByRole('navigation',{name:'Return controls'}).getByRole('button',{name:/Back to the kennel/}).click();await page.locator('.interior-stage').waitFor();
}
await page.locator('.interior-shortcuts summary').click();await page.locator('.interior-shortcuts').getByRole('button',{name:'Keeper desk',exact:true}).click();await desk.waitFor();await desk.getByRole('button',{name:'Return to kennel interior',exact:true}).click();
await page.evaluate(async()=>{const {localDatabase,flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');await flushLocalSave();const key='paws-and-pedigrees-storage';const saved=JSON.parse(await localDatabase.getItem(key));saved.state.tutorialProgress.firstRibbon={dogId:saved.state.dogs[0].id,status:'active',completed:[],ribbonEarned:false};await localDatabase.setItem(key,JSON.stringify(saved));await flushLocalSave();});await page.reload();await page.locator('.interior-stage').waitFor();await openDesk();assert.equal(await desk.getByRole('button',{name:/Expand the kennel/}).isDisabled(),true);await desk.getByRole('button',{name:'Continue at the Field Club',exact:true}).click();await page.locator('[data-scene=fieldClub]').waitFor();
console.log(mobile?'Mobile':'Desktop','physical desk opens visibly, all five destinations work, close/Escape restore the kennel, shortcut works, and locked options lead to the tutorial');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
