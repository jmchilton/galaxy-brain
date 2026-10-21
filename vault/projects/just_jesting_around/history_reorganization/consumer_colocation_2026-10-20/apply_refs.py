#!/usr/bin/env python3
"""Atomically replace only the five existing refs after exact-tree review."""
import argparse
import json
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', required=True)
    parser.add_argument('--repo', default='/Users/jxc755/projects/worktrees/galaxy/branch/storybook_interactions')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text())

    def git(*argv):
        return subprocess.check_output(['git', '-C', args.repo, *argv]).decode().strip()

    entries = manifest['lanes'] + manifest['ancillary']
    expected = {'vitest_readability', 'vitest_stories', 'vitest_story_play', 'vitest_real_api_calls', 'vitest_readability_with_churn'}
    assert {e['name'] for e in entries} == expected
    worktrees = {}
    for block in git('worktree', 'list', '--porcelain').split('\n\n'):
        rows = dict(line.split(' ', 1) for line in block.splitlines() if ' ' in line)
        if rows.get('branch', '').startswith('refs/heads/'):
            worktrees[rows['branch'][11:]] = rows['worktree']
    transaction = ['start']
    for entry in entries:
        name, old, new = entry['name'], entry['old_head'], entry['new_head']
        if git('rev-parse', 'refs/heads/' + name) != old:
            raise RuntimeError('Existing branch moved: ' + name)
        if git('rev-parse', old + '^{tree}') != git('rev-parse', new + '^{tree}'):
            raise RuntimeError('Tree changed: ' + name)
        if name in worktrees:
            state = subprocess.check_output(['git', '-C', worktrees[name], 'status', '--porcelain=v1'])
            if state:
                raise RuntimeError('Dirty worktree: ' + worktrees[name])
        backup = 'refs/archive/test-consumer-colocation-20261020/' + name
        result = subprocess.run(['git', '-C', args.repo, 'rev-parse', '--verify', backup], capture_output=True, text=True)
        if result.returncode == 0:
            if result.stdout.strip() != old:
                raise RuntimeError('Recovery ref already differs: ' + backup)
            transaction.append('verify ' + backup + ' ' + old)
        else:
            transaction.append('create ' + backup + ' ' + old)
        transaction.append('update refs/heads/' + name + ' ' + new + ' ' + old)
    transaction.extend(['prepare', 'commit'])
    subprocess.run(['git', '-C', args.repo, 'update-ref', '--stdin'], input='\n'.join(transaction) + '\n', text=True, check=True)
    for entry in entries:
        assert git('rev-parse', entry['name']) == entry['new_head']
    print('Updated only the five existing branches; original heads retained under refs/archive/test-consumer-colocation-20261020/.')


if __name__ == '__main__':
    main()
