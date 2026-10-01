import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { finishWoodland } from './woodland-driver.mjs';
const browser=await chromium.launch();let page;const errors=[];
try{
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile});
    page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173');
    await page.getByRole('button',{name:'Meet your first companion',exact:false}).click();await page.locator('.rescue-candidate').first().click();await page.getByLabel('What will you call your dog?').fill('Scout');await page.getByRole('button',{name:'Bring Scout home',exact:true}).click();await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
    await page.getByRole('button',{name:'Play Scent search',exact:true}).first().click();await page.getByRole('button',{name:'Begin Scent search round',exact:true}).click();
    await finishWoodland(page,{wrongTurn:true,touch:mobile,screenshots:true});
    await page.getByRole('region',{name:'Latest club result'}).waitFor();
    await page.locator('.activity-evidence summary').click();
    await page.getByText('Animal trails ruled out',{exact:true}).waitFor();
    assert.equal(await page.locator('.club-content').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
    await page.reload();await page.getByRole('button',{name:'Visit the Field Club',exact:false}).click();
    await page.getByRole('region',{name:'Latest club result'}).waitFor();
    const saved=await page.evaluate(async()=>{const {localDatabase}=await import('/src/lib/storage/localDatabase.ts');return JSON.parse(await localDatabase.getItem('paws-and-pedigrees-storage')).state.tutorialProgress.fieldClub;});
    assert.equal(saved.matches[0].results[0].report.activity,'woodland-search');assert.ok(saved.completedAt);assert.equal(saved.matches[0].results[0].report.mistakes,1);
    console.log(mobile?'Touch':'Desktop','new rescue, wrong turn/recovery, ground scent casting, case completion, report and reload passed');
    await page.getByRole('button',{name:'Play Scent search',exact:true}).first().click();await page.getByRole('button',{name:'Begin Scent search round',exact:true}).click();await page.getByRole('button',{name:'Take the scent & begin',exact:true}).click();
    await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('heading',{name:'The trail will wait.',exact:true}).waitFor();await page.waitForTimeout(200);const position=await page.locator('.search-adventure').getAttribute('data-z');await page.waitForTimeout(600);assert.equal(await page.locator('.search-adventure').getAttribute('data-z'),position);
    await page.getByRole('button',{name:'Continue search',exact:true}).click();await page.getByRole('button',{name:'Field notes',exact:true}).click();await page.getByRole('heading',{name:'Read the evidence.',exact:true}).waitFor();await page.getByRole('button',{name:'Return to Field Club',exact:true}).click();await page.getByRole('region',{name:'Current club visit'}).waitFor();
    console.log(mobile?'Touch':'Desktop','pause, notebook, exit and resumable visit passed');
    await context.close();
  }
  assert.deepEqual(errors,[]);
}catch(e){await page?.screenshot({path:'.browser.local/woodland-failure.png'});console.log(await page?.locator('.search-adventure').innerText().catch(()=>''));throw e;}finally{await browser.close();}
