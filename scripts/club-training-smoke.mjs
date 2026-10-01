import { finishWoodland } from './woodland-driver.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:1280,height:900}});
const page = await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
async function training(name,discipline){
  await page.getByRole('button',{name:`Train: ${name}`,exact:true}).first().click();
  await page.getByRole('button',{name:`Begin ${discipline} round`,exact:true}).click();
  await page.getByRole('button',{name:'Start training',exact:true}).click();
}
try{
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button',{name:'Meet your first companion',exact:false}).waitFor();
  await page.evaluate(async()=>{
    const {useGameStore}=await import('/src/stores/gameStore.ts');
    const {generateDog}=await import('/src/utils/dogGenerator.ts');
    const {rescueBreeds}=await import('/src/data/rescueBreeds.ts');
    const {newClubProgress,DISCIPLINES}=await import('/src/game/club/model.ts');
    const {flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');
    const state=useGameStore.getState();
    const dog={...generateDog(rescueBreeds[1],'Scout',state.user.id,true,'male'),hunger:100,thirst:100,health:100,energy_stat:100,training_points:100};
    const progress=newClubProgress();progress.records[dog.id]=Object.fromEntries(DISCIPLINES.map(d=>[d,{xp:1000,sessions:20,clubSessions:1,best:75,last:75}]));
    useGameStore.setState({dogs:[dog],selectedDog:dog,hasAdoptedFirstDog:true,activeTutorial:null,tutorialProgress:{...state.tutorialProgress,firstRibbon:undefined,fieldClub:progress}});await flushLocalSave();
  });
  await page.reload();await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
  await training('Footwork on the pads','Agility');
  for(let i=0;i<10;i++){
    await page.getByRole('button',{name:`Send to pad ${i%5+1}`,exact:true}).click();
    await page.waitForFunction(n=>Number(document.querySelector('.training-game').dataset.completed)===n,i+1);
  }
  await page.getByRole('button',{name:'Save training',exact:true}).click();
  console.log('Separate footwork training passed');
  await training('Conditioning circuit','Water retrieval');
  await page.getByRole('button',{name:'Trot',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.training-game meter').value>30);
  await page.getByRole('button',{name:'Recover',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.training-game meter').value<10);
  await page.getByRole('button',{name:'Walk',exact:true}).click();
  await page.getByRole('button',{name:'Save training',exact:true}).click({timeout:45000});
  console.log('Conditioning pace and recovery passed');
  await page.locator('article').filter({has:page.getByRole('heading',{name:'Deep woods expedition',exact:true})}).getByRole('button',{name:'Enter advanced event',exact:true}).click();
  await page.getByRole('button',{name:'Begin Scent search round',exact:true}).click();
  await finishWoodland(page);
  assert.match(await page.locator('.club-notice').innerText(),/experience/);
  console.log('Deep woods expedition passed');
  await page.locator('article').filter({has:page.getByRole('heading',{name:'Cross-current endurance retrieve',exact:true})}).getByRole('button',{name:'Enter advanced event',exact:true}).click();
  await page.getByRole('button',{name:'Begin Water retrieval round',exact:true}).click();
  await page.getByRole('button',{name:'Begin round',exact:true}).click();
  for(let i=1;i<=4;i++){
    await page.getByRole('button',{name:`Retrieve dummy ${i}`,exact:true}).click();
    await page.waitForFunction(n=>Number(document.querySelector('.field-game').dataset.count)===n,i,{timeout:40000});
  }
  await page.getByRole('button',{name:'Save round & continue',exact:true}).click();
  await page.getByRole('region',{name:'Latest club result'}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Cross-current advanced retrieve and results passed');
}catch(e){await page.screenshot({path:'.browser.local/training-advanced-failure.png'});throw e;}finally{await browser.close();}
