const d=JSON.parse(require("fs").readFileSync("corpus-roundtrip.json"));
const f=d.files;
const cls={}, errSig={}, toolOwner={}, failedWFs=[];
const cached=new Set(require("fs").readFileSync("cached_tools.txt","utf8").split("\n").filter(Boolean));
let stepFailUncached=0, stepFailCached=0;
for(const x of f){
  if(x.result.success)continue;
  let wfReasons=new Set();
  for(const s of (x.result.stepResults||[])){
    if(s.success)continue;
    cls[s.failureClass]=(cls[s.failureClass]||0)+1;
    const sig=(s.error||"").replace(/[0-9]+/g,"N").slice(0,60);
    errSig[sig]=(errSig[sig]||0)+1;
    const owner=(s.toolId||"").split("/repos/")[1]?.split("/")[0]||"?";
    toolOwner[owner]=(toolOwner[owner]||0)+1;
    const inCache=cached.has(s.toolId);
    if(inCache)stepFailCached++; else stepFailUncached++;
    wfReasons.add(s.failureClass);
  }
  failedWFs.push([x.relativePath.split("/")[0], [...wfReasons].join(",")]);
}
console.log("=== failureClass counts ==="); console.log(JSON.stringify(cls,null,1));
console.log("failing steps: in-cache",stepFailCached,"| uncached",stepFailUncached);
console.log("=== error signatures (top) ==="); Object.entries(errSig).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>console.log("  ",v,"|",k));
console.log("=== owner of failing tools ==="); console.log(JSON.stringify(toolOwner,null,1));
console.log("=== failed WFs by top category ==="); const cat={}; failedWFs.forEach(([c])=>cat[c]=(cat[c]||0)+1); console.log(JSON.stringify(cat,null,1));
