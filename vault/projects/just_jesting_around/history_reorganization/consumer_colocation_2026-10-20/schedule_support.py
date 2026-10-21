#!/usr/bin/env python3
"""Plan AST-fragment support snapshots; never modifies Git refs or worktrees."""
import json,subprocess,pathlib,os,posixpath,collections
HERE=pathlib.Path(__file__).resolve().parent
PROJECT=HERE.parent.parent
REPO='/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability'
TS=REPO+'/client/node_modules/typescript'
MAN=json.loads((PROJECT/'history_reorganization/manifest.json').read_text())
AUD=json.loads((HERE/'story_play_audit.json').read_text())
def git(*args):return subprocess.check_output(['git','-C',REPO,*args])
def get_texts(ref,paths):
 tree={}
 for record in git('ls-tree','-rz',ref).split(b'\0'):
  if record:
   meta,p=record.split(b'\t',1);tree[p.decode()]=meta.decode().split()[2]
 requested=[p for p in paths if p in tree]
 if not requested:return {p:'' for p in paths}
 data=git('cat-file','--batch',input=b'') if False else subprocess.check_output(['git','-C',REPO,'cat-file','--batch'],input=('\n'.join(tree[p] for p in requested)+'\n').encode())
 out={p:'' for p in paths};offset=0
 for p in requested:
  end=data.index(b'\n',offset);n=int(data[offset:end].split()[2]);out[p]=data[end+1:end+1+n].decode();offset=end+n+2
 return out

def ast(files):
 files=[{'path':p,'text':t} for p,t in files.items() if t]
 out=subprocess.check_output(['node',str(HERE/'typescript_units.cjs')],input=json.dumps({'typescriptPath':TS,'operation':'inspect','files':files}).encode())
 return {f['path']:f for f in json.loads(out)['files']}
def resolve(origin,mod,paths):
 if mod.startswith('@tests/'):p='client/tests/'+mod[7:]
 elif mod.startswith('@/'):p='client/src/'+mod[2:] if origin.startswith('client/') else 'lib/tool_shed/webapp/frontend/src/'+mod[2:]
 elif mod.startswith('.'):p=posixpath.normpath(posixpath.join(posixpath.dirname(origin),mod))
 elif mod.startswith('~/'):p='lib/tool_shed/webapp/frontend/src/'+mod[2:]
 else:return None
 for c in [p,p+'.ts',p+'.js',p+'.tsx',p+'/index.ts',p+'/index.js']:
  if c in paths:return c
 return None

def main():
 result={'lanes':[],'notes':['AST references conservative; unresolved exports and compatibility findings require review before publication.']}
 for li,lane in enumerate(MAN['lanes']):
  name=lane['name'];groups=lane['groups'][1:];order={g['test']:i for i,g in enumerate(groups)};path_owner={p:order[g['test']] for g in groups for p in g['paths']};old=lane['new_parent'];head=lane['new_head']
  if li==0:paths=[p for p in lane['groups'][0]['paths'] if p!='client/README.md']
  else:paths=[h['path'] for h in AUD['stories' if li==1 else 'play']['helpers'] if h['path']!='client/tests/vitest/stories.ts']
  body=get_texts(head,paths+list(path_owner));base=get_texts(old,paths+list(path_owner));finalast=ast(body);baseast=ast(base);support=set(paths)
  units={(p,u['id']):u for p in paths if p in finalast for u in finalast[p]['units']}
  exported={p:{n:(p,u['id']) for u in finalast.get(p,{}).get('units',[]) for n in u['exports']} for p in paths}
  named={p:{n:(p,u['id']) for u in finalast.get(p,{}).get('units',[]) for n in u['names']} for p in paths}
  demands={};reasons=collections.defaultdict(list);edges=collections.defaultdict(set)
  # Existing declarations can stay base until their changed semantics are motivated by a migrated caller.
  for p in paths:
   for u in finalast.get(p,{}).get('units',[]):
    key=(p,u['id'])
    for ref in u['refs']:
     if ref in named[p] and named[p][ref]!=key:edges[key].add(named[p][ref])
    for imp in finalast[p]['imports']:
     target=resolve(p,imp['module'],support)
     if not target:continue
     for binding in imp['bindings']:
      if binding['local'] in u['refs']:
       names=exported[target] if binding['imported']=='*' else [binding['imported']]
       for n in names:
        if n in exported[target]:edges[key].add(exported[target][n])
  for p,idx in path_owner.items():
   for imp in finalast.get(p,{}).get('imports',[]):
    target=resolve(p,imp['module'],support)
    if not target:continue
    for binding in imp['bindings']:
     names=exported[target] if binding['imported']=='*' else [binding['imported']]
     for n in names:
      if n in exported[target]:
       key=exported[target][n];demands[key]=min(idx,demands.get(key,idx));reasons[key].append(p)
  # Module evaluation side effects must accompany its first import, not wait for lexical calls.
  changed=True
  while changed:
   changed=False
   for key,idx in list(demands.items()):
    p,_=key
    dependencies=set(edges[key])
    dependencies.update((p,u['id']) for u in finalast.get(p,{}).get('units',[]) if not u['names'])
    for dep in dependencies:
     if idx<demands.get(dep,10**9):demands[dep]=idx;reasons[dep].append('dependency:'+':'.join(key));changed=True
  # Existing public APIs with unchanged callers can adopt a shared fixture when
  # that fixture gains its first story consumer. Their old callers already exercise
  # the API; there is no new speculative exported function to demonstrate.
  changed=True
  while changed:
   changed=False
   for key,u in units.items():
    previous=next((v for v in baseast.get(key[0],{}).get('units',[]) if v['id']==key[1]),None)
    active=[demands[d] for d in edges[key] if d in demands]
    if key not in demands and previous and u['exports'] and active:
     demands[key]=min(active);reasons[key].append('existing API adopts demanded fixture');changed=True
   for key,idx in list(demands.items()):
    p,_=key
    dependencies=set(edges[key]);dependencies.update((p,u['id']) for u in finalast.get(p,{}).get('units',[]) if not u['names'])
    for dep in dependencies:
     if idx<demands.get(dep,10**9):demands[dep]=idx;reasons[dep].append('dependency:'+':'.join(key));changed=True
  unresolved=[]
  for key,u in units.items():
   if key not in demands:
    prev=next((v for v in baseast.get(key[0],{}).get('units',[]) if v['id']==key[1]),None)
    if prev and prev['raw']==u['raw']:demands[key]=-1
    elif key[0]!='client/types/vitest-setup.d.ts':unresolved.append({'path':key[0],'unit':key[1],'exports':u['exports']})
    else:demands[key]=0
  # Private, otherwise unreferenced utility definitions may be evaluated by vi mocks
  # or be type-only scaffolding. Report them rather than silently front-loading.
  for item in unresolved:demands[(item['path'],item['unit'])]=len(groups)-1
  # Deleted base declarations survive through the last base test that imports them
  # and through the final replacement of a base declaration referring to them.
  removed={}; removewhy={}
  for p in paths:
   for u in baseast.get(p,{}).get('units',[]):
    key=(p,u['id'])
    if key in units:continue
    indices=[]
    for test,idx in path_owner.items():
     for imp in baseast.get(test,{}).get('imports',[]):
      if resolve(test,imp['module'],support)==p and any(b['imported'] in u['exports'] or b['imported']=='*' for b in imp['bindings']):indices.append(idx)
    for v in baseast.get(p,{}).get('units',[]):
     if set(v['refs'])&set(u['names']) and (p,v['id']) in demands:indices.append(demands[(p,v['id'])])
    removed[key]=max(indices,default=0);removewhy[key]=indices
  # Matcher augmentation files are an indivisible type cleanup with their motivating test.
  special={}
  if li==0:
   owner=next((i for t,i in order.items() if t.endswith('/ResetPassword.test.ts')),None)
   if owner is None:owner=next((i for t,i in order.items() if 'ResetPassword.test' in t),0)
   for p in ['client/tests/vitest/matchers.d.ts','client/types/vitest-setup.d.ts']:special[p]=owner
   wf='client/src/components/Workflow/testUtils.ts';special[wf]=next(i for t,i in order.items() if t.endswith('/WorkflowList.test.ts'))
  # Notification factory identities and the existing list factory form one API:
  # replacing random IDs with deterministic defaults requires the list generator
  # to supply explicit unique IDs in the same commit. All public exports already
  # existed and are exercised by unchanged base tests, so this is no unused API.
  if li==0:
   notification='client/src/components/Notifications/test-utils.ts'
   idx=min(demands[k] for k,u in units.items() if k[0]==notification and u['exports'])
   for key in units:
    if key[0]==notification:demands[key]=idx
   for key in removed:
    if key[0]==notification:removed[key]=idx
  events=[];render_requests=[];render_meta=[];declowners=[]
  for p in paths:
   if p in special:
    idx=special[p];events.append({'owner':groups[idx]['test'],'index':idx,'path':p,'text':body[p] or None,'reason':'atomic type cleanup or last importer deletion'});continue
   finalunits=finalast.get(p,{}).get('units',[]);oldunits=baseast.get(p,{}).get('units',[])
   times=sorted(set([demands[(p,u['id'])] for u in finalunits if demands[(p,u['id'])]>=0]+[v for (q,_),v in removed.items() if q==p]))
   previous=base[p]
   for idx in times:
    selected=[]
    for u in finalunits:
     if demands[(p,u['id'])]<=idx:selected.append(u)
     else:
      prev=next((v for v in oldunits if v['id']==u['id']),None)
      if prev:selected.append(prev)
    for u in oldunits:
     if (p,u['id']) not in units and removed[(p,u['id'])]>idx:selected.append(u)
    # Construct a synthetic module using base import bindings needed by legacy units
    # and final import bindings. Prefer final imports unless legacy-only bindings need them.
    if idx==times[-1]:text=body[p]
    else:
     needed=set(r for u in selected for r in u['refs'])
     imports=[];covered=set()
     for imp in finalast.get(p,{}).get('imports',[])+baseast.get(p,{}).get('imports',[]):
      # Render each import independently after pruning. Duplicated modules merge later via prettier/eslint if needed.
      bindings=[b['local'] for b in imp['bindings'] if b['local'] in needed and b['local'] not in covered]
      if not bindings and not imp['sideEffect']:continue
      covered.update(bindings)
      req={'path':p,'text':imp['raw'].strip()+'\n','unitIds':[],'importNames':bindings}
      render_requests.append(req);render_meta.append((p,idx,'import'))
      imports.append(('render',len(render_requests)-1))
     text={'imports':imports,'units':selected}
    events.append({'owner':groups[idx]['test'],'index':idx,'path':p,'text':text,'reason':'first resolved test consumer and declaration dependency closure'})
   declowners.extend({'path':p,'unit':u['id'],'exports':u['exports'],'index':demands[(p,u['id'])],'owner':groups[demands[(p,u['id'])]]['test'] if demands[(p,u['id'])]>=0 else 'base','consumers':reasons[(p,u['id'])]} for u in finalunits)
  if render_requests:
   rendered=json.loads(subprocess.check_output(['node',str(HERE/'typescript_units.cjs')],input=json.dumps({'typescriptPath':TS,'operation':'render','files':render_requests}).encode()))['files']
   for e in events:
    if isinstance(e['text'],dict):
     imports='\n'.join(rendered[i]['text'].strip() for _,i in e['text']['imports']);decls='\n\n'.join(u['raw'].strip() for u in e['text']['units']);e['text']='\n\n'.join(x for x in [imports,decls] if x)+'\n'
  events.sort(key=lambda e:(e['index'],e['path']))
  # Skip identical snapshots, preserve final exact bytes.
  snapshots=dict(base);effective=[]
  for e in events:
   value=e['text'] or ''
   if value!=snapshots[e['path']]:effective.append(e);snapshots[e['path']]=value
  for p in paths:
   assert snapshots[p]==body[p],(name,p,'final content mismatch')
  result['lanes'].append({'name':name,'old_parent':old,'head':head,'support_paths':paths,'events':effective,'declaration_owners':declowners,'unresolved':unresolved,'verification':{'final_support_text_identical':True,'unresolved_exports_require_review':len(unresolved)}})
  print(name,len(effective),'events',len(unresolved),'unresolved',flush=True)
  for u in unresolved:print(' UNRESOLVED',u,flush=True)
 (HERE/'support_schedule.json').write_text(json.dumps(result,indent=2)+'\n')
if __name__=='__main__':main()
