"""Validate rewritten story helper introduction snapshots, only in detached scratch."""
from pathlib import Path
import json
import os
import re
import subprocess
import time

HERE=Path(__file__).resolve().parent
SCRATCH=Path('/private/tmp/consumer-colocation-stories-validation')
LOGS=Path('/private/tmp/consumer-colocation-stories-runtime-logs')
LOGS.mkdir(exist_ok=True)
manifest=json.loads((HERE/'manifest.json').read_text())
lane=next(l for l in manifest['lanes'] if l['name']=='vitest_stories')
support=set(lane['support_paths'])
checks=[{'kind':'infrastructure_full_unit','commit':lane['groups'][0]['new_commit'],'owner':None}]
checks += [{'kind':'support_owner','commit':g['new_commit'],'owner':g['test']} for g in lane['groups'][1:] if any(c['path'] in support for c in g['changes'])]
results=[]
for idx,check in enumerate(checks):
 subprocess.run(['git','-C',str(SCRATCH),'checkout','--detach',check['commit']],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
 env=dict(os.environ,npm_config_use_node_version='22.20.0',VITE_CONFIG_NATIVE_IGNORE_WARNING='true')
 args=['pnpm','exec','vitest','run','--project','unit','--maxWorkers=4']
 if check['owner']:args.append(check['owner'].removeprefix('client/'))
 log=LOGS/(str(idx).zfill(2)+'-'+(check['owner'].replace('/','_') if check['owner'] else 'infrastructure')+'.log')
 started=time.monotonic()
 with log.open('w') as out:
  try:proc=subprocess.run(args,cwd=SCRATCH/'client',env=env,stdout=out,stderr=subprocess.STDOUT,timeout=500 if idx==0 else 150);code=proc.returncode
  except subprocess.TimeoutExpired:code=124
 text=log.read_text();summary=[line for line in text.splitlines() if re.search(r'Test Files|Tests\s|Errors\s|FAIL|Error:',line)]
 row={**check,'exit_code':code,'seconds':round(time.monotonic()-started,1),'log':str(log),'summary':summary[-15:]};results.append(row)
 (HERE/'stories_runtime.json').write_text(json.dumps({'scratch':str(SCRATCH),'check_count':len(checks),'completed':len(results),'results':results},indent=2)+'\n')
 print(str(idx+1)+'/'+str(len(checks)),code,check['owner'] or 'infrastructure full unit',str(row['seconds'])+'s',flush=True)
 if code:print('\n'.join(summary[-8:]),flush=True)
print('COMPLETED',len(results),'checks',sum(r['exit_code']!=0 for r in results),'failures',flush=True)
