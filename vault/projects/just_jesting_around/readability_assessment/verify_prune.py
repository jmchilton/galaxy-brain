"""Audit the pruned branch against the preserved, scored history."""
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path('/Users/jxc755/projects/worktrees/galaxy/branch/vitest_readability')

def git(*args):
    return subprocess.check_output(['git', '-C', str(REPO), *args], text=True).strip()

plan = json.loads((HERE / 'prune_plan.json').read_text())
head = git('rev-parse', 'vitest_readability')
assert git('rev-parse', plan['preserved_branch']) == plan['original_head']
old_order = git('rev-list', '--reverse', plan['replay_base'] + '..' + plan['original_head']).splitlines()
new_order = git('rev-list', '--reverse', plan['replay_base'] + '..' + head).splitlines()
drops = set(plan['rebase_drops'])
kept = [commit for commit in old_order if commit not in drops]
assert len(drops) == 76
assert len(plan['upstream_score2']) == 1
assert len(new_order) == len(kept) + 1
mapping, changed = [], []
for old, new in zip(kept, new_order[:len(kept)]):
    message = git('show', '-s', '--format=%B', old)
    assert message == git('show', '-s', '--format=%B', new), (old, new)
    record = {'old_commit': old, 'new_commit': new}
    mapping.append(record)
    if git('show', '--format=', old) != git('show', '--format=', new):
        changed.append({**record, 'subject': message.splitlines()[0]})
ancestors = set(git('rev-list', head).splitlines())
assert not drops.intersection(ancestors)
repair = new_order[-1]
assert git('show', '-s', '--format=%s', repair) == 'Preserve shared dependencies needed by retained readability commits'
removed = 'client/src/components/History/Content/Collection/CollectionProgress.test.js'
assert not git('ls-tree', head, '--', removed)
assert plan['upstream_score2'][0] in ancestors
report = {
    'pruned_head': head, 'preserved_head': plan['original_head'],
    'retained_branch_commits': len(kept), 'removed_branch_commits': len(drops),
    'upstream_revert': None, 'upstream_deduplication_kept': plan['upstream_score2'][0], 'dependency_repair': repair,
    'changed_retained_patches': changed, 'commit_mapping': mapping,
}
(HERE / 'prune_result.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'Preserved backup; removed {len(drops)} branch commits; retained {len(kept)} messages/trailers; upstream deduplication kept and dependency repair verified.')
print(f'{len(changed)} retained patches adapted; final head {head}')
