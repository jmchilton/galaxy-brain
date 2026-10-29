for (const n of [1000,5000,20000]) {
 const jobs=[...Array(n).keys()].map(i=>({id:"f2db41e1fa331b3e"+i.toString(16).padStart(8,"0")}));
 const ids=jobs.map(j=>j.id);
 let t=performance.now(); jobs.filter(j=>ids.includes(j.id)); const a=performance.now()-t;
 t=performance.now(); const s=new Set(ids); jobs.filter(j=>s.has(j.id)); const b=performance.now()-t;
 console.log(`n=${n} includes=${a.toFixed(1)}ms set=${b.toFixed(2)}ms`);
}
