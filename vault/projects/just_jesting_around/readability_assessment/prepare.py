"""Regenerate local, ignored git evidence for the frozen assessment manifests."""
import json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parent
inventory=json.loads((ROOT/'inventory.json').read_text())
items={}
for path in sorted(ROOT.glob('batch_*.json')):
 manifest=json.loads(path.read_text())
 repository=manifest['repository']
 for test in manifest['tests']:
  for item in test['commits']:items[item['commit']]=item
for item in json.loads((ROOT/'support.json').read_text())['commits']:
 items[item['commit']]=item
assert len(items)==inventory['commit_count']
def git(*args):return subprocess.check_output(['git','-C',repository,*args],text=True)
(ROOT/'commits').mkdir(exist_ok=True)
for sha,item in items.items():
 text=git('show','--format=full',sha)
 for file in item['test_files']:
  try:text+='\n\nAFTER FILE '+file+'\n'+git('show',sha+':'+file)
  except subprocess.CalledProcessError:pass
 (ROOT/'commits'/f'{sha}.txt').write_text(text)
print(f'Regenerated {len(items)} commit evidence files for {inventory["snapshot"]}')
