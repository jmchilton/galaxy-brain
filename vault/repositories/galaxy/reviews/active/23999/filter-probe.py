import fnmatch
import pathlib
import subprocess
import yaml

repo = pathlib.Path('/Users/jxc755/projects/worktrees/galaxy/pr/23999')
base = '919f4f28403d34dcf15e0ef8924c8bdfdb15d079'
cases = [
    ('bioblend.yaml', 'lib/galaxy/schema/history.py'),
    ('bioblend.yaml', 'lib/galaxy/webapps/galaxy/api/histories.py'),
    ('config_drift.yaml', 'lib/galaxy/config/schemas/config_schema.yml'),
    ('lint.yaml', 'lib/galaxy/dependencies/pinned-typecheck-requirements.txt'),
    ('test_galaxy_release.yaml', 'lib/galaxy/version/__init__.py'),
    ('check_test_class_names.yaml', 'lib/galaxy_test/api/test_histories.py'),
    ('tool_form_harness.yaml', 'lib/galaxy/navigation/navigation.yml'),
    ('toolshed_frontend.yaml', 'lib/tool_shed/webapp/frontend/package.json'),
    ('metadata_image.yaml', 'lib/galaxy/job_execution/compute_environment.py'),
]

def eligible(patterns, path):
    include = False
    for pattern in patterns:
        negate = pattern.startswith('!')
        if fnmatch.fnmatchcase(path, pattern[1:] if negate else pattern):
            include = not negate
    return include

for workflow, path in cases:
    assert (repo / path).is_file(), path
    records = []
    for rev in [base, 'HEAD']:
        raw = subprocess.check_output(['git', '-C', str(repo), 'show', f'{rev}:.github/workflows/{workflow}'], text=True)
        data = yaml.load(raw, Loader=yaml.BaseLoader)
        records.append(eligible(data['on']['pull_request']['paths'], path))
    assert records == [True, False], (workflow, path, records)
    print(f'{workflow}: {path}: base={records[0]}, PR={records[1]}')

for alias in ['packages/schema/src/galaxy/schema', 'packages/web_apps/src/galaxy/webapps', 'packages/app/src/galaxy/dependencies', 'packages/tool_shed/src/tool_shed']:
    mode = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '-s', alias], text=True).split()[0]
    assert mode == '120000', (alias, mode)
    print(f'{alias}: git mode {mode} (symlink), target={pathlib.Path(repo / alias).readlink()}')
print('All 9 previously eligible source-only changes are excluded by the PR filters.')
