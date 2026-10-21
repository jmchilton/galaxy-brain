#!/usr/bin/env python3
"""Static validation of intermediate helper imports, no repository mutations."""
import json,collections
import schedule_support as s
schedule=json.loads((s.HERE/'support_schedule.json').read_text());results=[]
for lane,lane_manifest in zip(schedule['lanes'],s.MAN['lanes']):
 paths=lane['support_paths'];support=set(paths);groups=lane_manifest['groups'][1:]
 tracked=s.git('ls-tree','-rz',lane['old_parent']).split(b'\0')
 testpaths=[]
 for record in tracked:
  if record:
   _,p=record.split(b'\t',1);p=p.decode()
   if ('.test.' in p or '.stories.' in p) and p.endswith(('.ts','.js','.tsx','.jsx')):testpaths.append(p)
 allpaths=list(set(paths+testpaths+[p for g in groups for p in g['paths']]))
 original=s.get_texts(lane['old_parent'],allpaths);final=s.get_texts(lane['head'],allpaths)
 # Parse each snapshot under a unique synthetic path key but retain original origin
 # for import resolution. Files may not exist yet, so empty blobs remain absent.
 work={};keymap={}
 for p,t in original.items():
  if t:
   key='base/'+p;work[key]=t;keymap[key]=p
 for eidx,event in enumerate(lane['events']):
  if event['text']:
   key=str(eidx)+'/'+event['path'];work[key]=event['text'];keymap[key]=event['path']
 for gi,g in enumerate(groups):
  for p in g['paths']:
   if final[p]:
    key='final/'+p;work[key]=final[p];keymap[key]=p
 parsed=s.ast(work);current={keymap[k]:v for k,v in parsed.items() if k.startswith('base/')}
 event_by_index=collections.defaultdict(list)
 for ei,e in enumerate(lane['events']):event_by_index[e['index']].append((ei,e))
 errors=[]
 for gi,g in enumerate(groups):
  touched=set(g['paths'])
  for ei,e in event_by_index[gi]:
   touched.add(e['path'])
   if e['text']:current[e['path']]=parsed[str(ei)+'/'+e['path']]
   else:current.pop(e['path'],None)
  for p in g['paths']:
   if final[p]:current[p]=parsed['final/'+p]
   else:current.pop(p,None)
  # Validate every currently existing direct importer, including unchanged tests.
  for p,unit in current.items():
   for imp in unit['imports']:
    dest=s.resolve(p,imp['module'],support)
    if not dest:continue
    if dest not in current:
     errors.append({'index':gi,'owner':g['test'],'importer':p,'missing_module':dest});continue
    exports={n for u in current[dest]['units'] for n in u['exports']}
    for binding in imp['bindings']:
     if binding['imported'] not in ('*','default') and binding['imported'] not in exports:
      errors.append({'index':gi,'owner':g['test'],'importer':p,'module':dest,'missing_export':binding['imported']})
 if errors:
  # Condense repeated unchanged-invalid-import intervals.
  condensed={}
  for e in errors:
   key=tuple((k,str(v)) for k,v in e.items() if k not in ['index','owner'])
   condensed.setdefault(key,dict(e,last_index=e['index'],count=0));condensed[key]['last_index']=e['index'];condensed[key]['count']+=1
  errors=list(condensed.values())
 results.append({'lane':lane['name'],'errors':errors,'all_events_parse':True,'checked_groups':len(groups),'base_test_story_files':len(testpaths)})
 print(lane['name'],len(errors),'unique dependency failures',flush=True)
 for e in errors:print(e,flush=True)
(s.HERE/'support_schedule_validation.json').write_text(json.dumps(results,indent=2)+'\n')
