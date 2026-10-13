"""Validate subagent assessments and add only readability fields to the live ledger."""
import collections,json,pathlib,re,yaml
ROOT=pathlib.Path(__file__).resolve().parent
ledger=ROOT.parent/'jest_tests.yml'
def validate(manifest,result):
 assert manifest['batch']==result['batch']
 expected={t['file']:t for t in manifest['tests']}
 assert len(result['tests'])==len(expected)
 assert {t['file'] for t in result['tests']}==set(expected)
 for t in result['tests']:
  commits={c['commit']:c for c in expected[t['file']]['commits']}
  assert len(t['reviews'])==len(commits)
  assert {r['commit'] for r in t['reviews']}==set(commits)
  for r in t['reviews']:
   assert type(r['score']) is int and 1<=r['score']<=5,r
   assert str(r['iteration'])==str(commits[r['commit']]['iteration']),r
   assert isinstance(r['rationale'],str) and len(r['rationale'])>15,r
   assert isinstance(r['defect'],str) and r['defect'],r
   assert isinstance(r['caps'],list),r
 return result['tests']
def main():
 assessed={}; results=[]
 for path in sorted(ROOT.glob('result_[0-9][0-9].json')):
  manifest=json.loads((ROOT/path.name.replace('result_','batch_')).read_text())
  result=json.loads(path.read_text()); tests=validate(manifest,result)
  for t in tests:
   assert t['file'] not in assessed
   assessed[t['file']]=t
  results.extend(r for t in tests for r in t['reviews'])
 before=ledger.read_text(); parsed_before=yaml.safe_load(before)
 chunks=re.split(r'(?=^- file: )',before,flags=re.M); new=[]
 for chunk in chunks:
  if not chunk.startswith('- file: '):new.append(chunk);continue
  f=chunk.splitlines()[0][8:]
  if f not in assessed:new.append(chunk);continue
  # Remove only our previous assessment block; preserve other writers' fields.
  chunk=re.sub(r'^  readability_score:.*\n','',chunk,flags=re.M)
  chunk=re.sub(r'^  readability_reviews:\n(?:^    .*\n)*','',chunk,flags=re.M)
  t=assessed[f]
  block=f"  readability_score: {min(r['score'] for r in t['reviews'])}\n  readability_reviews:\n"
  for r in t['reviews']:
   block+=f"    - commit: {r['commit']}\n      iteration: {int(r['iteration']) if r['iteration'] is not None else 'null'}\n      score: {r['score']}\n"
  lines=chunk.splitlines(keepends=True);new.append(lines[0]+block+''.join(lines[1:]))
 after=''.join(new); parsed_after=yaml.safe_load(after)
 def existing(rows):return [{k:v for k,v in row.items() if k not in {'readability_score','readability_reviews'}} for row in rows]
 assert existing(parsed_before)==existing(parsed_after),'unrelated ledger change'
 assert len([r for r in parsed_after if 'readability_score' in r])==len(assessed)
 if after!=before:
  assert ledger.read_text()==before,'ledger changed concurrently; rerun instead of overwriting'
  ledger.write_text(after)
 print(json.dumps({'batches':len(list(ROOT.glob('result_[0-9][0-9].json'))),'tests':len(assessed),'commits':len({r['commit'] for r in results}),'commit_test_reviews':len(results),'scores':dict(sorted(collections.Counter({r['commit']:r['score'] for r in results}.values()).items()))}))
if __name__=='__main__':main()
