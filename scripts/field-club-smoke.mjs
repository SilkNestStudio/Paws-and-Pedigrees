import { finishWoodland } from './woodland-driver.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
let page;
const errors=[];
async function visit(name){
  await page.getByRole('button',{name:`Play ${name}`,exact:true}).first().click();
  await page.getByRole('button',{name:`Begin ${name} round`,exact:true}).click();
}
async function finishSearch(){ await finishWoodland(page); }

try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button',{name:'Meet your first companion',exact:false}).click();
    await page.locator('.rescue-candidate').first().click();await page.getByLabel('What will you call your dog?').fill('Scout');await page.getByRole('button',{name:'Bring Scout home',exact:true}).click();
    await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
    assert.equal(await page.getByRole('button',{name:'Train to qualify',exact:true}).count(),2);
    await page.getByRole('button',{name:'Train: Focus around distractions',exact:true}).first().click();
    await page.getByRole('button',{name:'Begin Scent search round',exact:true}).click();
    await page.getByRole('button',{name:'Start training',exact:true}).click();
    for(let i=0;i<3;i++){
      await page.getByRole('button',{name:'Ask for a stay',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.training-game').dataset.ready==='true');
      await page.getByRole('button',{name:'Reward completed hold',exact:true}).click();
    }
    await page.getByRole('button',{name:'Save training',exact:true}).click();
    await visit('Scent search');await finishSearch();
    await page.locator('.club-results').getByText('What affected this result',{exact:true}).click();
    await page.locator('.club-results').getByText('Distance traveled',{exact:true}).waitFor();
    const label=mobile?'mobile':'desktop';await page.screenshot({path:`.browser.local/behavior-report-${label}.png`});
    await page.reload();await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
    await page.getByRole('region',{name:'Latest club result'}).waitFor();
    // Prepare a reproducible trained dog for all other event controls and advanced unlocks.
    await page.evaluate(async()=>{
      const {flushLocalSave,localDatabase}=await import('/src/lib/storage/localDatabase.ts');await flushLocalSave();
      const key='paws-and-pedigrees-storage',saved=JSON.parse(await localDatabase.getItem(key));const dog=saved.state.dogs[0];
      Object.assign(dog,{energy_stat:100,training_points:100,hunger:100,thirst:100});
      for(const d of ['agility','search','herding','water'])saved.state.tutorialProgress.fieldClub.records[dog.id][d]={xp:800,sessions:12,clubSessions:0,best:0,last:0};
      await localDatabase.setItem(key,JSON.stringify(saved));await flushLocalSave();
    });
    await page.reload();await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
    assert.equal(await page.getByRole('button',{name:'Enter advanced event',exact:true}).count(),2);
    await visit('Water retrieval');await page.getByRole('button',{name:'Begin round',exact:true}).click();
    await page.screenshot({path:`.browser.local/behavior-water-${label}.png`});
    for(let i=1;i<=3;i++){
      await page.getByRole('button',{name:`Retrieve dummy ${i}`,exact:true}).click();
      await page.waitForFunction(i=>Number(document.querySelector('.field-game').dataset.count)===i,i,{timeout:30000});
    }
    await page.getByRole('button',{name:'Save round & continue',exact:true}).click();
    if(!mobile){
      await visit('Herding');await page.getByRole('button',{name:'Begin round',exact:true}).click();
      for(let i=1;i<=3;i++){
        await page.getByRole('button',{name:`Work sheep ${i}`,exact:true}).click();
        await page.waitForFunction(i=>Number(document.querySelector('.field-game').dataset.count)>=i,i,{timeout:70000});
      }
      await page.getByRole('button',{name:'Save round & continue',exact:true}).click();
    }
    await visit('Agility');await page.getByRole('button',{name:'Start session',exact:true}).click();
    await page.getByRole('button',{name:'Send to First jump',exact:true}).waitFor();
    for(const name of ['First jump','Left jump','Tunnel','Weave poles','Seesaw','Final jump']){
      await page.getByRole('button',{name:`Send to ${name}`,exact:true}).click({timeout:30000});
    }
    await page.getByRole('button',{name:'Save round & continue',exact:true}).click({timeout:30000});
    await page.getByRole('region',{name:'Latest club result'}).waitFor();
    assert.equal(await page.locator('.club-content').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
    console.log(label,'separate training, woodland search, reports/reload, qualification, autonomous water/agility and desktop herding passed');
    await context.close();
  }
  assert.deepEqual(errors,[]);
}catch(e){await page?.screenshot({path:'.browser.local/behavior-failure.png'});throw e;}finally{await browser.close();}
