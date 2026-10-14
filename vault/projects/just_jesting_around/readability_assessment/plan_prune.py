import json,glob,subprocess,collections,pathlib
repo='/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability'
def git(*a):return subprocess.check_output(['git','-C',repo,*a],text=True).strip()
reviews={}
for f in glob.glob('readability_assessment/result_*.json'):
 d=json.load(open(f))
 for t in d.get('tests',[]):
  for r in t['reviews']:reviews[r['commit']]=r
 for r in d.get('reviews',[]):reviews[r['commit']]=r
head=git('rev-parse','HEAD')
msgs=collections.defaultdict(list)
for entry in git('log','--format=%H%x00%B%x00',head).split('\x00\n'):
 parts=entry.strip().split('\x00',1)
 if len(parts)==2:msgs[parts[1].strip()].append(parts[0])
records=[]
for old,r in reviews.items():
 msg=git('show','-s','--format=%B',old)
 matches=msgs[msg]
 if len(matches)!=1:raise RuntimeError((old,len(matches),msg))
 new=matches[0]
 olddiff=git('show','--format=','--no-ext-diff',old)
 newdiff=git('show','--format=','--no-ext-diff',new)
 records.append(dict(snapshot_commit=old,current_commit=new,score=r['score'],subject=msg.splitlines()[0],identical_patch=olddiff==newdiff))
drops=[r for r in records if r['score']==2]
order=git('rev-list','--reverse','--topo-order',head).splitlines()
first=min((r['current_commit'] for r in drops),key=order.index)
base=git('rev-parse',first+'^')
plan=dict(original_head=head,remote_lease=git('rev-parse','jmchilton/vitest_readability'),preserved_branch='vitest_readability_with_churn',replay_base=base,records=records,dropped_commits=[r['current_commit'] for r in drops])
pathlib.Path('readability_assessment/prune_plan.json').write_text(json.dumps(plan,indent=2)+'\n')
print('Mapped',len(records),'drop',len(drops),'changed patches',sum(not r['identical_patch'] for r in records),'changed dropped patches',sum(not r['identical_patch'] for r in drops),'base',base)
print('replay count',git('rev-list','--count',base+'..'+head),'merges',git('rev-list','--count','--merges',base+'..'+head))
for r in drops:
 if not r['identical_patch']:print(r['snapshot_commit'],r['current_commit'],r['subject'])
