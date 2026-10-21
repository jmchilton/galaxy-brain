// Format intermediate snapshots; keep each final support blob byte-for-byte.
const fs=require('fs');
const cp=require('child_process');
const path=require('path');
const repo='/Users/jxc755/projects/worktrees/galaxy/branch/storybook_interactions';
const prettier=require(path.join(repo,'client/node_modules/prettier'));
(async()=>{
 const filename=path.join(__dirname,'support_schedule.json');
 const schedule=JSON.parse(fs.readFileSync(filename,'utf8'));
 let formatted=0;
 for(const lane of schedule.lanes){
  for(const event of lane.events){
   if(event.text===null)continue;
   const final=cp.execFileSync('git',['-C',repo,'show',`${lane.head}:${event.path}`],{encoding:'utf8'});
   if(event.text===final)continue;
   const filepath=path.join(repo,event.path),options=await prettier.resolveConfig(filepath);
   event.text=await prettier.format(event.text,{...options,filepath});
   formatted++;
  }
 }
 fs.writeFileSync(path.join(__dirname,'support_schedule_formatted.json'),JSON.stringify(schedule,null,2)+'\n');
 console.log(`Formatted ${formatted} intermediate snapshots; final source blobs preserved.`);
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1;});
