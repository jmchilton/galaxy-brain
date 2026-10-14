const fs = require('fs');
const path = require('path');
const client = path.join(process.env.A11Y_SOURCE || '/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y', 'client');
const {chromium} = require(path.join(process.env.STORYBOOK_CLIENT_DIR || '/tmp/galaxy-a11y-validation/client', 'node_modules/playwright'));
const esbuild = require(client+'/node_modules/esbuild');
const {parse,compileStyle} = require(client+'/node_modules/@vue/compiler-sfc');
(async()=>{
 const {descriptor}=parse(fs.readFileSync(client+'/src/components/Collections/common/ClickToEdit.vue','utf8'));
 const css=compileStyle({source:descriptor.styles[0].content,filename:'ClickToEdit.vue',id:'data-v-review',scoped:true,preprocessLang:'scss'});
 if(css.errors.length) throw css.errors[0];
 const bootstrap=fs.readFileSync(client+'/node_modules/bootstrap/dist/css/bootstrap.css','utf8');
 const source=`import {createApp,h,ref} from '${client}/node_modules/vue/dist/vue.esm-bundler.js';
 import Multiselect from '${client}/node_modules/vue-multiselect/dist/vue-multiselect.esm.js';
 window.mountSelect=(searchable)=>{window.app?.unmount();window.app=createApp({setup(){const value=ref(['Alpha','Beta','Gamma']);return ()=>h(Multiselect,{id:'probe',options:['Alpha','Beta','Gamma'],modelValue:value.value,'onUpdate:modelValue':v=>value.value=v,multiple:true,searchable});}});window.app.mount('#select');};`;
 const bundle=await esbuild.build({stdin:{contents:source,resolveDir:client,loader:'js'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"','__VUE_OPTIONS_API__':'true','__VUE_PROD_DEVTOOLS__':'false','__VUE_PROD_HYDRATION_MISMATCH_DETAILS__':'false'},alias:{vue:client+'/node_modules/vue/dist/vue.esm-bundler.js'}});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.setContent(`<style>${bootstrap}\n${css.code}</style><div style="font-size:16px;font-weight:400"><h3 id="normal">History</h3><h3 id="editable" class="click-to-edit-label" data-v-review>History</h3><button id="button" class="click-to-edit-label" data-v-review>History</button></div><div id="select"></div>`);
 const typography=await page.evaluate(()=>{const props=id=>{const s=getComputedStyle(document.getElementById(id));return {fontSize:s.fontSize,fontWeight:s.fontWeight}};return {normal:props('normal'),editable:props('editable'),button:props('button')}});
 if(JSON.stringify(typography.normal)!==JSON.stringify(typography.editable)) throw Error('Heading typography differs '+JSON.stringify(typography));
 if(typography.button.fontSize!=='16px'||typography.button.fontWeight!=='400') throw Error('Button does not inherit parent font');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const focus=[];
 for(const searchable of [true,false]) {
  await page.evaluate(s=>window.mountSelect(s),searchable);
  for(const [name,key,next] of [['Beta','Enter','Gamma'],['Gamma','Space','Alpha'],['Alpha','Enter',null]]) {
   const button=page.getByRole('button',{name:'Remove '+name,exact:true});await button.focus();await page.keyboard.press(key);
   await button.waitFor({state:'detached'});
   const actual=await page.evaluate(()=>({label:document.activeElement.getAttribute('aria-label'),tag:document.activeElement.tagName,role:document.activeElement.getAttribute('role')}));
   if(next ? actual.label!=='Remove '+next : actual.tag!==(searchable?'INPUT':'DIV')) throw Error(JSON.stringify({searchable,name,actual}));
   focus.push({searchable,removed:name,key,actual});
  }
 }
 fs.writeFileSync('/tmp/24046-browser-results.json',JSON.stringify({typography,focus},null,2));
 console.log(JSON.stringify({typography,keyboardRemovals:focus.length}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
