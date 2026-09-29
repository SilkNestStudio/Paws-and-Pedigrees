import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:100,thirst:100,energy_stat:100,training_points:100},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);

const nav=page.getByRole('navigation',{name:'Return controls'});
const scene=name=>page.locator('[data-scene='+name+']');
async function room(label,view){await page.locator('.interior-shortcuts summary').click();await page.locator('.interior-shortcuts').getByRole('button',{name:label,exact:true}).click();if(view)await scene(view).waitFor();}
async function back(label,view){const button=nav.getByRole('button',{name:'Back to '+label});await button.click();await scene(view).waitFor();}
async function checkVisible(){await page.locator('.club-main').evaluate(el=>el.scrollTop=el.scrollHeight);const box=await nav.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<page.viewportSize().height);assert.equal(await nav.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);for(const btn of await nav.getByRole('button').all()){const b=await btn.boundingBox();assert.ok(b&&b.x>=0&&b.x+b.width<=page.viewportSize().width);await btn.click({trial:true});}}
await room('Dog runs','kennel');await checkVisible();await page.screenshot({path:'.browser.local/return-navigation-'+(mobile?'mobile':'desktop')+'.png'});await back('the kennel','hub');
await room('Dog runs','kennel');await scene('kennel').getByText('Scout',{exact:true}).click();await scene('dogDetail').waitFor();await page.getByRole('tab',{name:'Full record & options'}).click();await page.getByRole('button',{name:/Back to your companion/}).click();await page.getByRole('button',{name:'Buy supplies',exact:true}).click();await scene('shop').waitFor();await checkVisible();await back('your companion','dogDetail');await back('dog runs','kennel');
await page.getByRole('button',{name:/Upgrade Kennel/}).click();await scene('expansion').waitFor();await checkVisible();await back('dog runs','kennel');await back('the kennel','hub');
for(const [label,view] of [['Our story','office'],['Supplies','shop'],['Care room','vet'],['Competitions','competition']]){
 await room(label,view);await checkVisible();
 if(view==='competition') {await page.getByRole('button',{name:/^(Register|View Details)$/}).first().click();const dialog=page.getByRole('dialog',{name:'Event details'});await dialog.waitFor();await dialog.locator(':scope > div').evaluate(el=>el.scrollTop=el.scrollHeight);await dialog.getByRole('button',{name:'Close event details',exact:true}).click();await dialog.waitFor({state:'hidden'});}
 await back('the kennel','hub');
}
for(const [label,view] of [['Expand the kennel','expansion'],['Training plans','training'],['Breeding & nursery','breeding'],['Find work','jobs'],['Story chapters','story']]){
 await room('Keeper desk');await page.getByRole('region',{name:'Keeper desk'}).getByRole('button',{name:label,exact:true}).click();await scene(view).waitFor();await checkVisible();
 if(view==='training') {await page.getByRole('button',{name:/Train Yourself/}).first().click();const dialog=page.getByRole('dialog',{name:'Training session'});await dialog.waitFor();await dialog.getByRole('button',{name:/Start Sprint Training/}).click();await dialog.locator(':scope > div').evaluate(el=>el.scrollTop=el.scrollHeight);await dialog.getByRole('button',{name:'Cancel session and return'}).click();await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('.session-report').count(),0);}
 if(view==='jobs') {const cashBefore=await page.locator('.club-balances').innerText();await page.getByRole('button',{name:'Start Job',exact:true}).first().click();await page.getByRole('dialog',{name:'Job in progress'}).getByRole('button',{name:'Cancel job and return'}).click();await page.getByRole('dialog',{name:'Job in progress'}).waitFor({state:'hidden'});await page.waitForTimeout(5200);assert.equal(await page.locator('.club-balances').innerText(),cashBefore);assert.equal(await page.getByRole('dialog',{name:'Job in progress'}).count(),0);}
 await back('the kennel','hub');
}
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:/Replay Tutorials/}).click();await page.getByRole('button',{name:'Training Your Dog',exact:true}).click();await page.getByRole('dialog',{name:'Tutorial',exact:true}).getByRole('button',{name:'Close tutorial'}).click();await scene('hub').waitFor();
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:/Reset Game/}).click();await page.getByRole('dialog',{name:'Reset game confirmation'}).getByRole('button',{name:'Cancel and return'}).click();await scene('hub').waitFor();
await room('To the yard','demo3d');await page.locator('.yard-stage').waitFor();await page.getByRole('button',{name:'Buy food',exact:true}).click();await scene('shop').waitFor({timeout:15000});await checkVisible();await back('the yard','demo3d');assert.equal(await page.locator('.yard-activity').count(),0);await back('the kennel','hub');
await room('Dog runs','kennel');await nav.getByRole('button',{name:'Go outside',exact:true}).click();await scene('demo3d').waitFor();await nav.getByRole('button',{name:'Inside kennel',exact:true}).click();await scene('hub').waitFor();
assert.equal(await page.locator('.club-sidebar').count(),0);
console.log(mobile?'Mobile':'Desktop','all room returns, nested origin history, persistent controls, training/job cancellation and yard routes passed');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
