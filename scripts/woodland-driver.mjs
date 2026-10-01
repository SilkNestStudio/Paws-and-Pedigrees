// Shared browser driver: commands are issued through the actual UI. The seeded
// case is read only to make the chosen test route reproducible.
export async function woodlandCase(page){
  return page.evaluate(async()=>{
    const {localDatabase,flushLocalSave}=await import('/src/lib/storage/localDatabase.ts');
    const {createSearchAdventure}=await import('/src/game/club/searchTrail.ts');
    await flushLocalSave();const save=JSON.parse(await localDatabase.getItem('paws-and-pedigrees-storage'));
    const run=save.state.tutorialProgress.fieldClub.active;
    return createSearchAdventure(40,run.seed+run.results.length*97,run.challenge).chapters;
  });
}
export async function clickWoodlandGround(page,point,touch=false){
  await page.waitForTimeout(750);
  const screen=await page.evaluate(async(point)=>{
    const {OrthographicCamera,Vector3}=await import('/node_modules/.vite/deps/three.js');
    const canvas=document.querySelector('.search-world canvas'),rect=canvas.getBoundingClientRect(),field=document.querySelector('.search-adventure');
    const x=Number(field.dataset.x),z=Number(field.dataset.z);
    const camera=new OrthographicCamera(-rect.width/2,rect.width/2,rect.height/2,-rect.height/2,.1,120);
    camera.zoom=Math.min(rect.width/19,rect.height/19);camera.position.set(x*.45+5,18,z+15);camera.lookAt(x*.45,0,z-1.5);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const p=new Vector3(point.x,0,point.z).project(camera);
    return {x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};
  },point);
  if(touch)await page.touchscreen.tap(screen.x,screen.y);else await page.mouse.click(screen.x,screen.y);
}
export async function finishWoodland(page,{wrongTurn=false,touch=false,screenshots=false}={}){
  const chapters=await woodlandCase(page);
  await page.getByRole('button',{name:'Take the scent & begin',exact:true}).click();
  for(let i=0;i<chapters.length;i++){
    await page.waitForFunction(()=>['choosing','casting'].includes(document.querySelector('.search-adventure').dataset.task),null,{timeout:30000});
    if(await page.locator('.search-adventure').getAttribute('data-task')==='casting'){
      if(screenshots)await page.screenshot({path:`.browser.local/search-casting-${touch?'touch':'desktop'}.png`});
      const refresh=page.getByRole('button',{name:/Take scent again/});if(await refresh.isEnabled())await refresh.click();
      await clickWoodlandGround(page,{x:0,z:chapters[i].fork.z+2},touch);
      await page.waitForFunction(()=>document.querySelector('.search-adventure').dataset.task==='choosing',null,{timeout:20000});
    }
    if(i===0&&screenshots)await page.screenshot({path:`.browser.local/search-fork-${touch?'touch':'desktop'}.png`});
    if(i===0&&wrongTurn){
      await page.locator('.search-routes button').nth(1-chapters[i].correct).click();
      await page.getByText('Checked: animal scent. Try the other route.',{exact:true}).waitFor({timeout:20000});
      await page.getByRole('button',{name:'Recall to the fork',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.search-adventure').dataset.task==='choosing');
    }
    await page.locator('.search-routes button').nth(chapters[i].correct).click();
    await page.waitForFunction(n=>Number(document.querySelector('.search-adventure').dataset.stage)===n,i+1,{timeout:20000});
  }
  if(screenshots)await page.screenshot({path:`.browser.local/search-finished-${touch?'touch':'desktop'}.png`});
  await page.getByRole('button',{name:'Save search & return',exact:true}).click();
}
