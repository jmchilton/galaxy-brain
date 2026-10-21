#!/usr/bin/env python3
"""Exercise the three play-helper introductions; compare existing strict failures."""
import json,os,re,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
WORK=Path('/private/tmp/consumer-colocation-play-validation')
LOG=Path('/private/tmp/consumer-colocation-play-runtime-logs');LOG.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'manifest.json').read_text());lane=manifest['lanes'][2]
env=dict(os.environ,npm_config_use_node_version='22.20.0',VITE_CONFIG_NATIVE_IGNORE_WARNING='true')
results=[]
def run(label,args):
 start=time.monotonic();log=LOG/(label+'.log')
 with log.open('w') as f:r=subprocess.run(args,cwd=WORK/'client',env=env,stdout=f,stderr=subprocess.STDOUT,timeout=300)
 text=log.read_text();summary=[s for s in text.splitlines() if re.match(r'\s*(Test Files|Tests |Errors|Duration)',s)]
 return {'exit_code':r.returncode,'log':str(log),'seconds':round(time.monotonic()-start,1),'summary':summary}
def checkout(ref):subprocess.run(['git','-C',str(WORK),'checkout','--detach',ref],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for i,group in enumerate(lane['groups'][1:]):
 if not any(c['path'] in lane['support_paths'] for c in group['changes']):continue
 owner=group['test'];entry={'owner':owner,'commit':group['new_commit']};checkout(group['new_commit'])
 exists=subprocess.run(['git','-C',str(WORK),'cat-file','-e',group['new_commit']+':'+owner],capture_output=True).returncode==0
 if exists:entry['unit']=run(str(i)+'-unit',['pnpm','exec','vitest','run','--project','unit',owner.removeprefix('client/')])
 stories=[c['path'] for c in group['changes'] if '.stories.' in c['path']]
 assert stories
 entry['browser']=run(str(i)+'-browser',['pnpm','exec','vitest','run','--project','storybook']+[p.removeprefix('client/') for p in stories])
 if entry['browser']['exit_code']:
  checkout(lane['old_head'])
  entry['baseline_browser']=run(str(i)+'-baseline-browser',['pnpm','exec','vitest','run','--project','storybook']+[p.removeprefix('client/') for p in stories])
 results.append(entry);(ROOT/'play_runtime.json').write_text(json.dumps({'cases':results},indent=2)+'\n')
 print(owner,entry.get('unit',{}).get('exit_code'),'browser',entry['browser']['exit_code'],'baseline',entry.get('baseline_browser',{}).get('exit_code'),flush=True)
print('Play helper runtime cases complete.',flush=True)
