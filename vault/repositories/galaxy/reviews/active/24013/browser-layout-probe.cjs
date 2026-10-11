const assert=require('node:assert/strict');
const {chromium}=require('/private/tmp/galaxy-a11y-validation/client/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1200,height:900}}); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/histories/test**',r=>r.fulfill({json:{nice_size:'1.2 GB',contents_active:{deleted:123,hidden:45},contents_states:{ok:1234,error:567,running:89,queued:10}}}));
 const delay=()=>page.waitForTimeout(180);
 const set=async patch=>{await page.evaluate(patch=>Object.assign(window.reviewState,patch),patch); await delay();};
 const measure=()=>page.evaluate(()=>{
   const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,scrollWidth:e.scrollWidth};};
   const header=document.querySelector('.g-card-header')||document.querySelector('#g-card-review-header');
   return {class:header.className,header:rect('#g-card-review-header'),title:rect('.g-card-title-section'),badges:rect('#g-card-badges-review'),actions:rect('#g-card-extra-actions-review'),bookmark:rect('#g-card-bookmark-add-review'),select:rect('#g-card-select-review'),badge:rect('.history-datasets')};
 });
 for(const base of [false,true]){
  await page.goto('http://127.0.0.1:52413/review-harness.html'+(base?'?base=1':'')); await page.waitForSelector('#g-card-review-header'); await delay();
  for(const width of [220,260,300,340,440,650]){await set({width});console.log(JSON.stringify({case:'small-pill',base,width,...await measure()}));}
  await set({historyBadge:true}); await delay();
  for(const width of [220,260,300,340,440,650,1000]){await set({width});console.log(JSON.stringify({case:'history-pill',base,width,...await measure()}));}
  if(!base){
   await set({historyBadge:false,width:300,badges:Array.from({length:6},(_,i)=>({id:'b'+i,label:'Badge '+i,title:'Badge',href:'#b'+i}))});
   for(const width of [220,300,440,650]){await set({width});console.log(JSON.stringify({case:'multiple-pill',base,width,...await measure()}));}
   await set({width:340,badges:[{id:'count',label:'42 items',title:'Count',href:'#count'}]});
   await page.evaluate(()=>{window.reviewTransitions=0;new MutationObserver(()=>window.reviewTransitions++).observe(document.querySelector('#g-card-review-header'),{attributes:true,attributeFilter:['class']});});
   await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.reviewTransitions),0,'stable header should not keep changing class');
   await page.evaluate(()=>document.documentElement.style.fontSize='24px');await delay();console.log(JSON.stringify({case:'root-font-150-percent',...await measure()}));await page.evaluate(()=>document.documentElement.style.fontSize='16px');await delay();
   await page.evaluate(()=>document.activeElement.blur());await page.locator('#g-card-select-review').focus();const sequence=[];for(let i=0;i<6;i++){sequence.push(await page.evaluate(()=>document.activeElement.id));await page.keyboard.press('Tab');}console.log(JSON.stringify({case:'tab-sequence',sequence}));
   await page.locator('#g-card-extra-actions-review button').click();await delay();console.log(JSON.stringify({case:'menu-open',cardClass:await page.locator('#g-card-review').getAttribute('class'),menuVisible:await page.locator('#g-card-extra-actions-review .dropdown-menu').isVisible()}));
   await page.keyboard.press('Escape');await delay();
   await set({showBookmark:false,extraActions:[],selectable:false,canRenameTitle:false});console.log(JSON.stringify({case:'no-controls',...await measure()}));
   await set({show:false});await delay();await set({show:true});console.log(JSON.stringify({case:'remount',...await measure()}));
  }
 }
 console.log(JSON.stringify({case:'page-errors',errors}));assert.deepEqual(errors,[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
