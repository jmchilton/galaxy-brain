const d=JSON.parse(require("fs").readFileSync("corpus-validate.json"));
const wfs=d.categories.flatMap(c=>c.results);
let stepOK=0,stepSkip=0,stepFail=0,stepErr=0,stepOther={};
let connOK=0,connInvalid=0,connSkip=0, connWFwithInvalid=0, connReportPresent=0;
const buckets={fullyClean:0, onlyUncached:0, hasToolStateFail:0, hasConnInvalid:0, hasWfError:0};
const failingWFs=[];
for(const w of wfs){
  let nSkip=0,nFail=0,nErr=0,nOK=0;
  for(const r of (w.results||[])){
    if(r.status==="ok")nOK++;
    else if(r.status&&r.status.startsWith("skip")){nSkip++;}
    else if(r.status==="fail"){nFail++;}
    else if(r.status==="error"){nErr++;}
    else stepOther[r.status]=(stepOther[r.status]||0)+1;
  }
  stepOK+=nOK;stepSkip+=nSkip;stepFail+=nFail;stepErr+=nErr;
  // connection report
  const cr=w.connection_report;
  let invalid=0;
  if(cr){connReportPresent++;
    if(typeof cr.ok==="number")connOK+=cr.ok;
    if(typeof cr.invalid==="number"){connInvalid+=cr.invalid;invalid=cr.invalid;}
    if(typeof cr.skipped==="number")connSkip+=cr.skipped;
  }
  // bucket
  const hasErr=!!w.error;
  if(hasErr){buckets.hasWfError++;failingWFs.push([w.name,"wf-error",w.error]);}
  else if(nFail>0||nErr>0){buckets.hasToolStateFail++;failingWFs.push([w.name,"toolstate-fail",nFail+nErr]);}
  else if(invalid>0){buckets.hasConnInvalid++;failingWFs.push([w.name,"conn-invalid",invalid]);}
  else if(nSkip>0){buckets.onlyUncached++;}
  else buckets.fullyClean++;
  if(invalid>0)connWFwithInvalid++;
}
console.log("WORKFLOWS:",wfs.length);
console.log("STEP TOTALS: ok",stepOK,"skip(uncached)",stepSkip,"fail",stepFail,"error",stepErr,"other",JSON.stringify(stepOther));
console.log("CONNECTIONS: ok",connOK,"invalid",connInvalid,"skipped",connSkip,"| reports present",connReportPresent,"| WFs w/ invalid conn",connWFwithInvalid);
console.log("WORKFLOW BUCKETS:",JSON.stringify(buckets,null,1));
console.log("NON-CLEAN WFs:"); failingWFs.forEach(f=>console.log("  ",f.join(" | ")));
