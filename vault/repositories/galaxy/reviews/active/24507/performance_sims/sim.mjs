// Replicates PR stopJobs()+retryBackoffMs with virtual time; fake deleteJob.
const MAX_RETRIES=3, BASE=2000, CAP=30000, CONC=4;
function backoff(a,ra=0){const c=Math.min(CAP,BASE*2**(a-1));const j=c*0.5*Math.random();return Math.min(CAP,Math.max(c*0.5,ra)+j);}
let now=0; const timers=[];
const sleep=(ms)=>new Promise(r=>timers.push({t:now+ms,r}));
async function drain(p){let done=false;p.then(()=>done=true);while(!done){await new Promise(r=>setImmediate(r));if(done)break;timers.sort((a,b)=>a.t-b.t);const x=timers.shift();if(!x)continue;now=Math.max(now,x.t);x.r();}return p;}
class ApiError extends Error{constructor(s,ra){super("e"+s);this.status=s;this.retryAfterMs=ra;}}
async function stopJobs(ids,del){const res={stopped:[],failed:[]};const q=[...ids];
 async function one(id){for(let a=1;;a++){try{await del(id);return;}catch(e){const ra=e.retryAfterMs;const ok=[429,500,502,503,504].includes(e.status)&&a<=MAX_RETRIES&&(ra===undefined||ra<=CAP);if(!ok)throw e;await sleep(backoff(a,ra));}}}
 async function w(){let id;while((id=q.shift())!==undefined){try{await one(id);res.stopped.push(id);}catch(e){res.failed.push(id);}}}
 await Promise.all(Array.from({length:Math.min(CONC,ids.length)},w));return res;}
function scenario(name,N,mk){const runs=[];return (async()=>{for(let k=0;k<20;k++){now=0;let reqs=0;const del=mk(()=>reqs++);const r=await drain(stopJobs([...Array(N).keys()],del));runs.push({reqs,ms:now,ok:r.stopped.length,fail:r.failed.length});}
 const avg=f=>(runs.reduce((s,x)=>s+x[f],0)/runs.length).toFixed(1);console.log(`${name}: N=${N} reqs=${avg('reqs')} wall_s=${(avg('ms')/1000).toFixed(1)} stopped=${avg('ok')} failed=${avg('fail')}`);})();}
// nginx limit_req leaky bucket: rate r/s, burst b, no Retry-After, 429.
function nginx(rate,burst){return(count)=>{let level=0,last=0;return async(id)=>{count();await sleep(50);const el=(now-last)/1000;level=Math.max(0,level-el*rate);last=now;if(level+1>burst+1){throw new ApiError(429);}level+=1;};};}
const sysErr=(status,ra)=>(count)=>async()=>{count();await sleep(50);throw new ApiError(status,ra);};
await scenario("nginx 1r/s burst5",50,nginx(1,5));
await scenario("nginx 1r/s burst5",200,nginx(1,5));
await scenario("nginx 5r/s burst10",200,nginx(5,10));
await scenario("systematic 500",100,sysErr(500));
await scenario("429 Retry-After 60s",100,sysErr(429,60000));
await scenario("old Promise.all equiv (nginx 1r/s b5, 1 try)",50,nginx(1,5));
