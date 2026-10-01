import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/?preview=legacy');
    await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    const saved = await page.evaluate(async () => {
      const { journeyRepository } = await import('/src/game/legacy/journeyRepository.ts');
      const { adoptRescue } = await import('/src/game/legacy/journey.ts');
      const current = await journeyRepository.load();
      const journey = { ...adoptRescue({ ...current.journey, readLedger: true, prepared: true, kennelName: 'Meadow House' }, 'willow', 'Maple', ['quiet'], 'test-founder', '2026-09-30T12:00:00Z'), settled: true, firstRecall: true };
      await journeyRepository.save(journey, current.revision); return journey;
    });
    await page.reload();
    await page.getByRole('button', { name:'Journal', exact:true }).click();
    await page.locator('.legacy-journal-list').getByRole('button', {name:'The road to town',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.legacy-preview')?.dataset.nearest==='gate');
    await page.locator('.legacy-interaction button').click();
    assert.equal(await page.getByRole('button',{name:'Help Ellis',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Help Mara',exact:true}).click();
    await page.getByRole('button',{name:/find it/ }).click();
    const root=page.locator('.outing-game');
    await page.waitForTimeout(1000);
    await page.screenshot({path:`.browser.local/outing-${mobile?'phone':'desktop'}-start.png`});
    await page.getByRole('button',{name:/Trail map/}).click();
    await page.screenshot({path:`.browser.local/outing-${mobile?'phone':'desktop'}-map.png`});
    await page.getByRole('button',{name:/Trail map/}).click();
    await page.getByRole('button',{name:'Pause / leave',exact:true}).click();
    assert.equal(await page.getByRole('dialog').evaluate(d=>d.matches(':modal')),true);
    await page.getByRole('button',{name:'Continue searching',exact:true}).click();
    const cdp=mobile?await context.newCDPSession(page):null;
    async function walk(target) {
      console.log("Walking",mobile,target);
      const route=await page.evaluate(async target=>{
        const {trailPath}=await import('/src/game/legacy/outings.ts');
        const el=document.querySelector('.outing-game');
        return trailPath({x:Number(el.dataset.x),z:Number(el.dataset.z)},target);
      },target);
      assert.ok(route.length);
      for(const point of route) {
        for(let attempt=0;attempt<100;attempt++) {
          if(await root.getAttribute('data-complete')==='true')return;
          const dx=point.x-Number(await root.getAttribute('data-x')),dz=point.z-Number(await root.getAttribute('data-z'));
          const distance=Math.hypot(dx,dz);if(distance<.28)break;
          if(attempt===99) {await page.screenshot({path:'.browser.local/outing-stuck.png'});throw new Error(`Stuck: ${JSON.stringify(point)}, dx=${dx}, dz=${dz}, dialog=${await page.locator('dialog[open]').count()}`);}
          if(cdp) {
            const b=await page.getByRole('group',{name:'Move keeper',exact:true}).boundingBox();
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2+dx/distance*37,y:b.y+b.height/2+dz/distance*37}]});
            await page.waitForTimeout(Math.min(230,Math.max(70,distance/2.7*900)));
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          } else {
            const inputs=[{key:dx>0?'KeyD':'KeyA',amount:Math.abs(dx)},{key:dz>0?'KeyS':'KeyW',amount:Math.abs(dz)}].sort((a,b)=>b.amount-a.amount);
            const duration=Math.min(220,Math.max(65,distance/2.7*800));
            await page.keyboard.down(inputs[0].key);
            if(inputs[1].amount>.04) {
              await page.keyboard.down(inputs[1].key);
              const diagonal=duration*Math.min(1,inputs[1].amount/inputs[0].amount*1.3);
              await page.waitForTimeout(diagonal);await page.keyboard.up(inputs[1].key);await page.waitForTimeout(duration-diagonal);
            } else await page.waitForTimeout(duration);
            await page.keyboard.up(inputs[0].key);
          }
          await page.waitForTimeout(120);
        }
      }
    }
    await walk({x:-10,z:6});
    await page.waitForFunction(()=>Number(document.querySelector('.outing-game')?.dataset.clues)>=1,null,{timeout:15000});
    await walk({x:-12,z:-11});
    await page.waitForFunction(()=>Number(document.querySelector('.outing-game')?.dataset.clues)>=2,null,{timeout:15000});
    await page.screenshot({path:`.browser.local/outing-${mobile?'phone':'desktop'}-bridge.png`});
    await walk({x:-7,z:-21});
    await page.waitForFunction(()=>document.querySelector('.outing-game')?.dataset.found==='true',null,{timeout:15000});
    await page.getByRole('button',{name:/Bring it/}).click();
    await walk({x:0,z:14});
    await page.getByRole('button',{name:'Return home together',exact:true}).waitFor({timeout:20000});
    await page.screenshot({path:`.browser.local/outing-${mobile?'phone':'desktop'}-result.png`});
    await page.getByRole('button',{name:'Return home together',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Help Ellis',exact:true}).isEnabled(),true);
    await page.getByRole('button',{name:'Back to the courtyard',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.legacy-preview-label')?.textContent.includes('Saved on this browser'));
    await page.reload();
    await page.locator('.legacy-preview[data-dog-name="Maple"]').waitFor();
    const actual=await page.evaluate(async()=>{const {journeyRepository}=await import('/src/game/legacy/journeyRepository.ts');return(await journeyRepository.load()).journey;});
    assert.deepEqual(actual.work.completed,['mara']);assert.equal(actual.routine.meals,saved.routine.meals+2);assert.equal(actual.dog.id,saved.dog.id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log(`${mobile?'Phone':'Desktop'}: full search, crossings, retrieval, return, reward, unlock and reload passed`);
    await context.close();
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
