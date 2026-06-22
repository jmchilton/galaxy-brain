const d=JSON.parse(require("fs").readFileSync("corpus-roundtrip.json"));
const cached=new Set(require("fs").readFileSync("cached_tools.txt","utf8").split("\n").filter(Boolean));
const f=d.files;
let wfUncachedOnly=0, wfHasMissingParam=0, wfSuccess=0;
const missingTools={};
for(const x of f){
  const r=x.result;
  if(r.success){wfSuccess++;continue;}
  let hasMissingOnCached=false, hasUncached=false;
  for(const s of (r.stepResults||[])){
    if(s.success)continue;
    const e=s.error||"";
    if(e.startsWith("tool not resolved")) hasUncached=true;
    else if(e.includes("post-conversion validation")){
      // is the tool cached?
      if(cached.has(s.toolId)){hasMissingOnCached=true;
        const t=(s.toolId||"").split("/").slice(-2,-1)[0]; missingTools[t]=(missingTools[t]||0)+1;
      } else hasUncached=true;
    }
  }
  if(hasMissingOnCached)wfHasMissingParam++;
  else if(hasUncached)wfUncachedOnly++;
}
console.log("roundtrip success WFs:",wfSuccess);
console.log("failed WFs — uncached-only (cache artifact):",wfUncachedOnly);
console.log("failed WFs — >=1 cached tool missing required param (real finding):",wfHasMissingParam);
console.log("=== tools with post-conversion 'missing param' on CACHED schema ==="); 
Object.entries(missingTools).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("  ",v,"|",k));
