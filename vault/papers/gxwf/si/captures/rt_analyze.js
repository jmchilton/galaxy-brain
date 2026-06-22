const d=JSON.parse(require("fs").readFileSync("corpus-roundtrip.json"));
const f=d.files;
let success=0,clean=0,benignOnly=0;
let failWithUncached=0, failWithRealDiff=0, failOther=0;
let encErrTotal=0, structErrTotal=0;
const failExamples=[];
for(const x of f){
  const r=x.result;
  if(r.success)success++;
  if(r.clean)clean++;
  encErrTotal+=(r.encodingErrors||[]).length;
  structErrTotal+=(r.structureErrors||[]).length;
  // per-step: detect uncached / skip vs altering diff
  const steps=r.stepResults||[];
  const stepStatuses={};
  let stepUncached=0, stepDiff=0;
  for(const s of steps){
    const st=s.status||s.outcome||"?";
    stepStatuses[st]=(stepStatuses[st]||0)+1;
    if(typeof st==="string" && st.includes("skip"))stepUncached++;
  }
  if(!r.success){
    const reasonUncached = stepUncached>0 || (r.encodingErrors||[]).some(e=>JSON.stringify(e).includes("cache")||JSON.stringify(e).includes("not in cache"));
    if(reasonUncached)failWithUncached++;
    else if((r.encodingErrors||[]).length||(r.structureErrors||[]).length){failWithRealDiff++; if(failExamples.length<6)failExamples.push([x.relativePath, "enc:"+(r.encodingErrors||[]).length+" struct:"+(r.structureErrors||[]).length, JSON.stringify(stepStatuses)]);}
    else {failOther++; if(failExamples.length<6)failExamples.push([x.relativePath,"other",JSON.stringify(stepStatuses)]);}
  }
}
console.log("success(true):",success,"/ clean(byte-ident):",clean);
console.log("failures: total",f.length-success,"| due-to-uncached",failWithUncached,"| enc/struct-error",failWithRealDiff,"| other",failOther);
console.log("encodingErrors total:",encErrTotal,"structureErrors total:",structErrTotal);
console.log("=== fail examples (non-uncached) ==="); failExamples.forEach(e=>console.log("  ",e.join(" | ")));
// also: distinct step statuses across all
const allSt={}; f.forEach(x=>(x.result.stepResults||[]).forEach(s=>{const k=s.status||"?";allSt[k]=(allSt[k]||0)+1;}));
console.log("=== all step statuses ==="); console.log(JSON.stringify(allSt,null,1));
