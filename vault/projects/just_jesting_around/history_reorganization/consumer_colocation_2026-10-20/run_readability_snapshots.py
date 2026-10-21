#!/usr/bin/env python3
import json,pathlib,subprocess,os,re,time,signal
HERE=pathlib.Path(__file__).resolve().parent
M=json.loads((HERE/'manifest.json').read_text());L=M['lanes'][0]
SCRATCH=pathlib.Path('/private/tmp/consumer-colocation-validation');OUTPUT=HERE/'readability_runtime.json'
env=dict(os.environ,npm_config_use_node_version='22.20.0',VITE_CONFIG_NATIVE_IGNORE_WARNING='true')
support=set(L['support_paths']);results=[]
def git(*args):return subprocess.check_output(['git','-C',str(SCRATCH),*args]).decode()
def expanded_tests(group):
 out=[group['test']];changed=[c['path'] for c in group['changes'] if c['path'] in support]
 patterns=[]
 for path in changed:
  if path.endswith('mockConfig.js'):patterns+=['setupMockConfig']
  elif path.endswith('PageEditor/testData.ts'):patterns+=['FAKE_PAGE_SUMMARY','FAKE_PAGE_UNTITLED']
  elif path.endswith('sseStoreSupport.ts'):patterns+=['sseMockFactory','emitSse','setSseConnected','setSseHasEverConnected','useVisibilityPatch','trackVisibilityListeners']
  elif '/Notifications/' in path:patterns+=['generateMessageNotification','generateNewSharedItemNotification','generateToolInstallationRequestNotification','generateNotificationsList']
 if patterns:
  cmd=['git','-C',str(SCRATCH),'grep','-l','-E','|'.join(patterns),group['new_commit'],'--','client/**/*.test.ts','client/**/*.test.js']
  p=subprocess.run(cmd,stdout=subprocess.PIPE,text=True)
  out+= [line.split(':',1)[1] for line in p.stdout.splitlines()]
 return sorted(set(out))
def run(command,cwd,log):
 start=time.time()
 with open(log,'w') as f:
  f.write('cwd: '+str(cwd)+'\ncommand: '+repr(command)+'\n');f.flush()
  proc=subprocess.Popen(command,cwd=str(cwd),env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=proc.wait(timeout=240)
  except subprocess.TimeoutExpired:
   os.killpg(proc.pid,signal.SIGTERM);code=124
 return code,round(time.time()-start,2)
for group in L['groups']:
 changed=[c['path'] for c in group['changes'] if c['path'] in support]
 if not changed:continue
 assert not git('status','--porcelain').strip(),'Scratch has source changes'
 subprocess.check_call(['git','-C',str(SCRATCH),'checkout','--detach',group['new_commit']],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 tests=expanded_tests(group);tool=group['test'].startswith('lib/')
 cwd=SCRATCH/('lib/tool_shed/webapp/frontend' if tool else 'client')
 prefix='lib/tool_shed/webapp/frontend/' if tool else 'client/'
 relative=[p[len(prefix):] for p in tests]
 log='/private/tmp/consumer-colocation-read-'+str(len(results)).zfill(2)+'.log'
 code,seconds=run(['pnpm','exec','vitest','run',*relative],cwd,log)
 result={'commit':group['new_commit'],'owner':group['test'],'support_paths':changed,'test_paths':tests,'log':log,'exit_code':code,'seconds':seconds}
 results.append(result);OUTPUT.write_text(json.dumps({'lane':'vitest_readability','results':results},indent=2)+'\n')
 text=pathlib.Path(log).read_text(errors='replace')
 summaries=[x.strip() for x in text.splitlines() if re.search(r'Test Files|Tests\s+\d|FAIL|Error:',x)]
 print(('PASS' if code==0 else 'FAIL'),group['test'],seconds,'s',summaries[-5:],flush=True)
 if code:
  print('STOPPED on failure; inspect '+log,flush=True);break
 if 'client/types/vitest-setup.d.ts' in changed:
  log='/private/tmp/consumer-colocation-matcher-typecheck.log'
  code,seconds=run(['pnpm','type-check'],SCRATCH/'client',log)
  result['type_check']={'exit_code':code,'seconds':seconds,'log':log};OUTPUT.write_text(json.dumps({'lane':'vitest_readability','results':results},indent=2)+'\n')
  print('MATCHER_TYPECHECK',code,seconds,flush=True)
  if code:print('Typecheck failed; continuing owner suites for independent evidence.',flush=True)
print('Recorded',len(results),'support snapshots',flush=True)
