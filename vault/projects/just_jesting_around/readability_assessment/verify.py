"""Check completeness, score ranges, snapshot coverage, and ledger consistency."""
import collections,hashlib,json,pathlib,yaml
from apply import validate
ROOT=pathlib.Path(__file__).resolve().parent
inventory=json.loads((ROOT/'inventory.json').read_text())
assert hashlib.sha256((ROOT.parent/'READABILITY_RUBRIC.md').read_bytes()).hexdigest()==inventory['rubric_sha256']
ledger=yaml.safe_load((ROOT.parent/'jest_tests.yml').read_text())
rows={r['file']:r for r in ledger}
expected_files=set(); commits={}; per_test=[]; association_count=0
for path in sorted(ROOT.glob('batch_*.json')):
 manifest=json.loads(path.read_text())
 assert manifest['snapshot']==inventory['snapshot']
 result=json.loads((ROOT/path.name.replace('batch_','result_')).read_text())
 for t in validate(manifest,result):
  assert t['file'] not in expected_files
  expected_files.add(t['file']);row=rows[t['file']]
  assert row['readability_score']==min(r['score'] for r in t['reviews'])
  expected=[{'commit':r['commit'],'iteration':int(r['iteration']) if r['iteration'] is not None else None,'score':r['score']} for r in t['reviews']]
  assert row['readability_reviews']==expected
  for r in t['reviews']:
   if r['commit'] in commits:
    assert commits[r['commit']]['score']==r['score'],('inconsistent shared-commit score',r['commit'])
   else:commits[r['commit']]=r
   association_count+=1
  per_test.append(row['readability_score'])
support=json.loads((ROOT/'support.json').read_text())
support_result=json.loads((ROOT/'result_support.json').read_text())
expected={r['commit']:r for r in support['commits']}
assert len(support_result['reviews'])==len(expected)
assert {r['commit'] for r in support_result['reviews']}==set(expected)
for r in support_result['reviews']:
 assert type(r['score']) is int and 1<=r['score']<=5
 assert r['rationale'] and r['defect'] and isinstance(r['caps'],list)
 assert str(r['iteration'])==str(expected[r['commit']]['iteration'])
 assert r['commit'] not in commits
 commits[r['commit']]=r
assert len(expected_files)==inventory['test_count']
assert len(commits)==inventory['commit_count']
assert association_count==inventory['commit_test_review_count']
assert len(support_result['reviews'])==inventory['support_commit_count']
assert {r['file'] for r in ledger if 'readability_score' in r}==expected_files
summary={'snapshot':inventory['snapshot'],'assessment_date':inventory['assessment_date'],'rubric':'READABILITY_RUBRIC.md','rubric_sha256':inventory['rubric_sha256'],'test_count':len(expected_files),'commit_count':len(commits),'commit_test_review_count':association_count,'batch_count':len(list(ROOT.glob('batch_*.json'))),'test_summary':'minimum of individual commit scores; not a final-file quality score','commit_score_counts':dict(sorted(collections.Counter(r['score'] for r in commits.values()).items())),'test_score_counts':dict(sorted(collections.Counter(per_test).items())),'supporting_commit_reviews':support_result['reviews'],'iterated_without_readability_commit':[r['file'] for r in ledger if r.get('iterated') and r['file'] not in expected_files]}
(ROOT/'summary.yml').write_text(yaml.safe_dump(summary,sort_keys=False,width=100))
print(json.dumps({k:v for k,v in summary.items() if k not in {'supporting_commit_reviews','iterated_without_readability_commit'}},indent=2))
