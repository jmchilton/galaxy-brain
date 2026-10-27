# Codex review debrief (round 2)

Codex reported two P1 findings. Both were refuted by running them, so no code changed. Reviewed head: `108d662a5ef`; diff `origin/release_25.1...HEAD`.

Not acted on, with the reason:
- **P1 "identifier-only tools lose workflow cache hits when dataset names differ" (jobs.py:751): refuted.**
  - Codex's scenario is the branch's own baseline test `test_workflow_rerun_mapped_identifier_step_with_use_cached_job`. It claims that test fails at the tip; it passes. The test challenge ran `test_workflows.py -k cached` (9 passed), and I ran it on base, on the alt, and at the re-scope head.
  - Codex assumes cached `cat1` element outputs get newly generated, hid-dependent names. They don't. Dumping both histories' contents showed the implicit element HDAs named `Concatenate multiple datasets or collections` in each history, so `b.name == c.name` holds. Only HDCA names carry `on collection N`.
  - Codex's "in-memory query" set the names to differ by construction, which isn't what happens in a real rerun.
- **P1 "plain reuse of a mapped collection-producing job fails during output copying" (jobs.py:765): not reproduced.**
  - I wrote a throwaway API test (afterwards reverted): `collection_split_on_column` mapped over a list with one tabular element, then the same tool run directly on that HDA with `use_cached_job=True`.
  - On both base and tip the plain job ran fresh: state `ok`, `copied_from_job_id` None, no `NotImplementedError`.
  - The `DatasetCollection` vs HDCA mismatch in `Job.copy_from` stays a theoretical follow-up, already noted in `subagents/rescope_review.md`. I didn't investigate why the late search didn't match here.

<details><summary>Full review</summary>

Codex ran read-only with a JSON findings schema. Its brief covered the issue's intent and the four cases, plus "keep hits for name-agnostic tools and workflow reruns". Codex reviewed 22 files, including `jobs/__init__.py`, `tools/execute.py`, `test/integration/test_job_cache.py` and the test tools. Codex didn't run the API suite.

```json
[
  {"severity": "P1", "file": "lib/galaxy/managers/jobs.py", "line": 751,
   "title": "Identifier-only tools lose workflow cache hits when dataset names differ",
   "failure_scenario": "Run test_workflow_rerun_mapped_identifier_step_with_use_cached_job ... rerun in history with shifted hids. Cached cat outputs receive newly generated names ... identifier_single step executes again ... failing the new assertion.",
   "confidence": "certain"},
  {"severity": "P1", "file": "lib/galaxy/managers/jobs.py", "line": 765,
   "title": "Plain reuse of a mapped collection-producing job fails during output copying",
   "failure_scenario": "Map collection_split_on_column over a list ... then run directly on that HDA with use_cached_job=True ... raises 'Don't know how to copy DatasetCollection to HistoryDatasetCollectionAssociation'.",
   "confidence": "certain"}
]
```

</details>
