import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const errors=[];
try { for(const mobile of [false,true]) {
const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100}});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForTimeout(1200);
await page.evaluate(async()=>{const {useGameStore}=await import('/src/stores/gameStore.ts');const {generateDog}=await import('/src/utils/dogGenerator.ts');const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');const state=useGameStore.getState();useGameStore.setState({user:{...state.user,id:'local-player',kennel_name:'Willow Creek Kennel',cash:1250,food_storage:50,last_streak_claim:new Date().toISOString()},dogs:[{...generateDog(rescueBreeds[0],'Scout','local-player',true,'male'),hunger:100,thirst:100,energy_stat:100},generateDog(rescueBreeds[1],'Maple','local-player',true,'female')],hasAdoptedFirstDog:true,tutorialProgress:{completedTutorials:['kennel-basics'],skippedTutorials:[],dismissedHelp:[],showHelpIcons:true}});const {RIBBON_STEPS}=await import('/src/utils/firstRibbon.ts');const live=useGameStore.getState();useGameStore.setState({tutorialProgress:{...live.tutorialProgress,firstRibbon:{dogId:live.dogs[0].id,status:'complete',completed:RIBBON_STEPS.map(s=>s.id),ribbonEarned:true,graduatedAt:new Date(0).toISOString()}}});await flushLocalSave();});await page.reload();await page.getByRole('heading',{name:'Every great kennel starts somewhere.'}).waitFor();await page.waitForTimeout(600);
assert.equal(await page.locator('.club-sidebar').count(),0);assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).count(),0);
assert.equal(await page.locator('.club-workspace').evaluate(el=>getComputedStyle(el).marginLeft),'0px');
await page.locator('[data-room=shop]').click();await page.getByRole('heading',{name:'Shop',exact:true}).waitFor({timeout:15000});
const bag=page.getByRole('heading',{name:'Small Bag - Basic Food',exact:true}).locator('xpath=../..');await bag.getByRole('button',{name:'Buy food',exact:true}).click();await page.getByRole('dialog',{name:'Buy dog food'}).getByRole('button',{name:'Confirm action',exact:true}).click();
await page.getByText('Added 10 food units to your pantry.',{exact:true}).waitFor();assert.match(await page.locator('.kennel-resources').textContent(),/60.0/);assert.match(await page.locator('.kennel-resources').textContent(),/1,210/);
await page.getByRole('button',{name:'Back to the kennel',exact:true}).click();await page.getByRole('button',{name:'Go to the yard',exact:true}).click();await page.locator('[data-station=inside]').click();await page.locator('.interior-stage').waitFor({timeout:15000});
await page.getByRole('button',{name:'Go to the yard',exact:true}).click();await page.getByRole('button',{name:'Play fetch in the yard',exact:true}).click();await page.getByRole('button',{name:'Begin activity',exact:true}).click();await page.waitForTimeout(1500);
async function aim(x,z){const point=await page.evaluate(async({x,z})=>{const {OrthographicCamera,Vector3}=await import('/node_modules/.vite/deps/three.js');const box=document.querySelector('.activity-scene canvas').getBoundingClientRect();const c=new OrthographicCamera(-box.width/2,box.width/2,box.height/2,-box.height/2,.1,150);c.zoom=Math.min(box.width/27,box.height/28);c.position.set(2,25,20);c.lookAt(0,0,0);c.updateProjectionMatrix();c.updateMatrixWorld();const p=new Vector3(x,.06,z).project(c);return {x:box.x+(p.x+1)*box.width/2,y:box.y+(1-p.y)*box.height/2};},{x,z});await page.mouse.click(point.x,point.y);}
await aim(-5,-5);await page.waitForTimeout(200);assert.equal(await page.getByRole('button',{name:'Throw ball',exact:true}).isDisabled(),true);
for(const [x,z] of [[9,-8],[-9,7],[8,8]]){
 await aim(x,z);await page.waitForTimeout(200);assert.ok(Math.abs(Number(await page.locator('.yard-activity').getAttribute('data-aim-x'))-x)<.1);assert.ok(Math.abs(Number(await page.locator('.yard-activity').getAttribute('data-aim-z'))-z)<.1);
 await page.screenshot({path:'.browser.local/full-yard-fetch-'+(mobile?'mobile':'desktop')+'.png'});await page.getByRole('button',{name:'Throw ball',exact:true}).click();await page.getByRole('button',{name:'Call your dog',exact:true}).click({timeout:30000});
 if(x!==8)await page.getByRole('button',{name:'Throw ball',exact:true}).waitFor({timeout:30000});
}
await page.getByRole('button',{name:'Finish session',exact:true}).click({timeout:30000});await page.locator('.yard-stage').waitFor();assert.match(await page.locator('.yard-status').textContent(),/Energy 80%/);
assert.equal(await page.locator('.club-workspace').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
console.log(mobile?'Mobile':'Desktop','no sidebar, pantry purchase without selecting a dog, cottage entry, far-yard tap aiming and three fetch retrieves passed');await context.close();
}assert.deepEqual(errors,[]);}finally{await browser.close();}
