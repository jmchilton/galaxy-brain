#!/usr/bin/env python3
"""Prepare existing lane histories with consumer-owned support, without moving refs."""
import argparse
from collections import defaultdict
import json
import os
from pathlib import Path
import subprocess
import tempfile

from readme_fragments import readability_fragments, play_fragments

ROOT=Path(__file__).resolve().parent
REPO='/Users/jxc755/projects/worktrees/galaxy/branch/storybook_interactions'


class Repo:
    def __init__(self,path):self.path=path
    def git(self,*argv,**kw):return subprocess.check_output(['git','-C',self.path,*argv],**kw)
    def text(self,*argv,**kw):return self.git(*argv,**kw).decode().strip()
    def blob(self,ref,path):return self.git('show',ref+':'+path).decode()
    def tree(self,ref):
        result={}
        for row in self.git('ls-tree','-rz',ref).split(b'\0'):
            if not row:continue
            meta,path=row.split(b'\t',1);mode,kind,oid=meta.decode().split()
            result[path.decode()]={'mode':mode,'kind':kind,'oid':oid}
        return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prepare',action='store_true',required=True)
    p.add_argument('--repo',default=REPO)
    args=p.parse_args();repo=Repo(args.repo)
    source=json.loads((ROOT.parent/'manifest.json').read_text())
    schedule=json.loads((ROOT/'support_schedule_formatted.json').read_text())
    audit=json.loads((ROOT/'story_play_audit.json').read_text())
    schedules={lane['name']:lane for lane in schedule['lanes']}
    pins={lane['name']:lane['new_head'] for lane in source['lanes']+source['ancillary']}
    for name,old in pins.items():
        if repo.text('rev-parse','refs/heads/'+name)!=old:raise RuntimeError('Existing head changed: '+name)
    original_refs={name:repo.text('rev-parse','refs/heads/'+name) for name in pins}
    original_index=repo.git('status','--porcelain=v1','-z')
    result={'base':source['base'],'pins':pins,'lanes':[],'ancillary':[],'mode':'dangling_objects_only'}
    timestamp=repo.text('show','-s','--format=%cI',pins['vitest_story_play'])
    commit_env=dict(os.environ,GIT_AUTHOR_DATE=timestamp,GIT_COMMITTER_DATE=timestamp)
    new_parent=source['base']
    for previous in source['lanes']:
        name=previous['name'];old_head=pins[name];support=schedules[name]
        if support['head']!=old_head or support['unresolved']:raise RuntimeError('Invalid support schedule: '+name)
        source_tree=repo.tree(old_head);conversions=previous['groups'][1:]
        grouped=defaultdict(list)
        for e in support['events']:grouped[e['owner']].append(dict(e))
        docs=[];doc_state={}
        if name=='vitest_readability':
            core=['client/README.md']
            initial,docs=readability_fragments(repo.blob(source['base'],'client/README.md'),repo.blob(old_head,'client/README.md'),conversions)
            doc_state['client/README.md']=initial
            for d in docs:
                d['path']='client/README.md'
                if d.get('requires_export'):
                    wanted=d['requires_export']
                    matches=[u for u in support['declaration_owners'] if u['path']==wanted['path'] and wanted['name'] in u['exports']]
                    if len(matches)!=1:raise RuntimeError('Ambiguous README helper: '+repr(wanted))
                    d['owner']=matches[0]['owner']
        elif name=='vitest_stories':core=audit['stories']['core_paths']
        else:
            core=[v for v in audit['play']['core_paths'] if v!='client/.storybook/A11Y_AUDIT.md']
            owner=conversions[-1]['test']
            initial,docs=play_fragments(repo.blob(old_head,'client/.storybook/README.md'),owner)
            doc_state['client/.storybook/README.md']=initial
            for d in docs:d['path']='client/.storybook/README.md'
            grouped[owner].append({'owner':owner,'path':'client/.storybook/A11Y_AUDIT.md','text':repo.blob(old_head,'client/.storybook/A11Y_AUDIT.md'),'reason':'completed catalog audit accompanies final converted test'})
        doc_groups=defaultdict(list)
        for d in docs:doc_groups[d['owner']].append(d)
        owners={g['test'] for g in conversions}
        if (set(grouped)|set(doc_groups))-owners:raise RuntimeError('Unknown support owner: '+name)
        fd,index=tempfile.mkstemp(prefix='galaxy-consumer-colocation-');os.close(fd);os.unlink(index)
        env=dict(commit_env,GIT_INDEX_FILE=index)
        lane={'name':name,'old_head':old_head,'old_parent':support['old_parent'],'new_parent':new_parent,'groups':[],
              'core_paths':core,'support_paths':support['support_paths'],'declaration_owners':support['declaration_owners'],'documentation_fragments':docs}
        try:
            repo.git('read-tree',new_parent,env=env)
            current=new_parent
            # Track staged blobs, allowing no-op support events to be omitted.
            staged=repo.tree(new_parent)
            def apply(updates):
                records=[];changes=[]
                for update in updates:
                    path=update['path']
                    if 'text' in update:
                        text=update['text']
                        blob=None if text is None else {'mode':source_tree.get(path,staged.get(path,{'mode':'100644'}))['mode'],'kind':'blob','oid':repo.text('hash-object','-w','--stdin',input=text.encode())}
                    else:blob=source_tree.get(path)
                    old=staged.get(path)
                    if old==blob:continue
                    records.append((blob['mode']+' '+blob['oid'] if blob else '0 '+'0'*40)+'\t'+path+'\0')
                    changes.append({**{k:v for k,v in update.items() if k!='text'},'old_blob':old,'new_blob':blob})
                    if blob:staged[path]=blob
                    else:staged.pop(path,None)
                if records:repo.git('update-index','-z','--index-info',input=''.join(records).encode(),env=env)
                return changes
            def commit(message,author_from=None):
                tree=repo.text('write-tree',env=env);e=dict(commit_env)
                if author_from:
                    an,ae,ad=repo.text('show','-s','--format=%an%x00%ae%x00%aI',author_from).split('\0')
                    e.update(GIT_AUTHOR_NAME=an,GIT_AUTHOR_EMAIL=ae,GIT_AUTHOR_DATE=ad)
                sha=repo.text('commit-tree',tree,'-p',current,input=message.encode(),env=e)
                return sha,tree
            changes=apply([{'path':path,**({'text':doc_state[path]} if path in doc_state else {})} for path in core])
            title='Document readable client test patterns' if name=='vitest_readability' else 'Introduce shared '+name.removeprefix('vitest_').replace('_',' ')+' test infrastructure'
            message=title+'\n\nKeep consumer-specific helpers and fixtures with the tests that first use them.\n\nCo-Authored-By: Codex <noreply@openai.com>\n'
            current,tree=commit(message)
            lane['groups'].append({'kind':'guidance' if name=='vitest_readability' else 'infrastructure','new_commit':current,'tree':tree,'changes':changes})
            for index_in_lane,group in enumerate(conversions):
                owner=group['test'];updates=[{'path':path} for path in group['paths']]
                updates.extend(grouped[owner])
                for fragment in doc_groups[owner]:
                    path=fragment['path'];text=doc_state[path]
                    if text.count(fragment['before'])!=1:raise RuntimeError('README context changed: '+fragment['label'])
                    doc_state[path]=text.replace(fragment['before'],fragment['after'],1)
                for path in {d['path'] for d in doc_groups[owner]}:updates.append({'path':path,'text':doc_state[path],'reason':'helper-specific documentation accompanies first consumer'})
                paths=[u['path'] for u in updates]
                if len(paths)!=len(set(paths)):raise RuntimeError('Duplicate scheduled path: '+owner)
                changes=apply(updates)
                raw=repo.git('cat-file','commit',group['new_commit']).split(b'\n\n',1)[1].decode()
                current,tree=commit(raw,group['new_commit'])
                parsed=repo.text('show','-s','--format=%(trailers:key=Test-File,valueonly)',current)
                if parsed!=owner:raise RuntimeError('Ownership trailer invalid: '+current)
                lane['groups'].append({'kind':group['kind'],'test':owner,'new_commit':current,'old_commit':group['new_commit'],'tree':tree,'changes':changes})
            final_tree=repo.text('rev-parse',old_head+'^{tree}')
            if repo.text('rev-parse',current+'^{tree}')!=final_tree:
                raise RuntimeError('Final lane tree changed: '+name+'\n'+repo.text('diff','--name-status',old_head,current))
            lane.update(new_head=current,exact_tree=final_tree,verification={'final_tree_identical':True,'example_second':lane['groups'][1]['test']==previous['example'],'support_colocated':True})
            result['lanes'].append(lane);new_parent=current
            print(name,old_head,'->',current,'core',len(core),'commits',len(lane['groups']),flush=True)
        finally:
            if os.path.exists(index):os.unlink(index)
    old_read=pins['vitest_readability'];new_read=result['lanes'][0]['new_head']
    for previous in source['ancillary']:
        name=previous['name'];old_head=pins[name];mapping={old_read:new_read}
        commits=repo.text('rev-list','--reverse',old_read+'..'+old_head).splitlines()
        for old in commits:
            parents=repo.text('show','-s','--format=%P',old).split()
            if len(parents)!=1 or parents[0] not in mapping:raise RuntimeError('Ancillary parent unexpected: '+old)
            an,ae,ad,cn,ce,cd=repo.text('show','-s','--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI',old).split('\0')
            e=dict(os.environ,GIT_AUTHOR_NAME=an,GIT_AUTHOR_EMAIL=ae,GIT_AUTHOR_DATE=ad,GIT_COMMITTER_NAME=cn,GIT_COMMITTER_EMAIL=ce,GIT_COMMITTER_DATE=cd)
            body=repo.git('cat-file','commit',old).split(b'\n\n',1)[1]
            mapping[old]=repo.text('commit-tree',repo.text('rev-parse',old+'^{tree}'),'-p',mapping[parents[0]],input=body,env=e)
        new_head=mapping[old_head];tree=repo.text('rev-parse',old_head+'^{tree}')
        if repo.text('rev-parse',new_head+'^{tree}')!=tree:raise RuntimeError('Ancillary tree changed: '+name)
        result['ancillary'].append({'name':name,'old_head':old_head,'new_head':new_head,'old_parent':old_read,'new_parent':new_read,'exact_tree':tree,'commit_mapping':{old:mapping[old] for old in commits}})
        print(name,old_head,'->',new_head,flush=True)
    if {name:repo.text('rev-parse','refs/heads/'+name) for name in pins}!=original_refs or repo.git('status','--porcelain=v1','-z')!=original_index:raise RuntimeError('A pinned branch or source worktree changed during preparation')
    result['verification']={'all_five_final_trees_identical':True,'five_pinned_refs_and_worktree_unchanged':True,'no_new_branches':True,'no_new_prs':True}
    (ROOT/'manifest.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print('Prepared only dangling objects; all existing refs and source files unchanged.',flush=True)


if __name__=='__main__':main()
