# Review of Marius's invocation filename collision fix

Reviewed 2026-10-11. Fork PR: [jmchilton/planemo#16](https://github.com/jmchilton/planemo/pull/16), targeting the branch behind [galaxyproject/planemo#1724](https://github.com/galaxyproject/planemo/pull/1724).

- Reviewed head: `f2e318f934409cf10989a02c0647e94a9c40f4a0`.
- Base: `393bbfaf2eb94eb6089b258069713c67d788e100` (`sanitize-invocation-test-data-paths`).
- Recommendation: **merge fork PR #16 into John's feature branch**. Marius's finding is correct, and this change fixes it without a new blocker found in review.
- Delivery: local review only; no public review or merge performed by this reviewer.

`_unique_path` records the full downloaded path and tries successive suffixes until one is unused, including when a naturally suffixed label already reserved the first candidate. The same set reaches recursive nested collections and is shared between all top-level datasets and collections within each input or output generation pass. Both YAML paths and downloads use the allocated path. Existing label keys and element identifiers remain unchanged.

All original assertions remain; the test changes add collision coverage without removing tests or weakening existing expectations.

## Validation

From an isolated checkout of the reviewed head, Python 3.12.12:

```sh
PYTHONPATH=$PWD /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -p planemo.cli tests/test_collection_elements_to_test_def.py tests/test_cmd_workflow_job_init.py tests/test_cmd_workflow_test_init.py tests/test_workflow_lint.py
```

Result: **23 passed in 3.28 seconds**.

Additional mocked API assertions independently checked output datasets with `a/b` and `a_b` labels, a top-level dataset colliding with an output collection element (`collection_item` versus collection `collection` / element `item`), and two colliding elements within the output collection (`i/tem` and `i_tem`). All six downloads received unique paths, and output definitions matched those paths. No live Galaxy invocation was exercised; the upstream end-to-end class remains skipped in relation to #1721.

## Remaining follow-ups for John

1. **Input/output collisions remain a data-correctness issue within a single command.** The fork PR acknowledges this limitation but incorrectly describes inputs and outputs as separate commands. `cmd_workflow_test_init.py:45` calls `job_template`, then line 58 calls `output_stubs_for_workflow`. The two invocation helpers create fresh sets at `workflows.py:1017` and `:1053`. A dataset input and dataset output with the same sanitized label and extension therefore both get `test-data/a_b.txt`; the later output download can replace the input. A mocked check reproduced the identical generated paths. This limitation predates the follow-up fix and does not negate the useful within-pass collision repair. Recommended follow-up: share the reservation set across the complete invocation export, or use separate input/output filename namespaces; add a single-command regression test with different input/output contents. Track this before presenting #1724 as handling all filename collisions.

2. **Output collection sampling needs an explicit decision.** At `workflows.py:1065`, the caller passes `definition_style="outputs"`, while `_elements_to_test_def` truncates only for the singular `"output"`. This mismatch exists on the base branch. Decide whether output tests should sample one element or export all elements before changing the string: a literal typo fix changes generated test coverage and download behavior. The plural still enters the output-definition branch correctly.

3. **Release-note scope should mention both commands and filename changes.** Marius correctly notes that the sanitization affects `workflow_job_init --from_invocation` as well as `workflow_test_init --from_invocation`, and universal sanitization rewrites characters beyond `/`, including `:` and `?`. Update the HISTORY entry / upstream PR description to describe the actual affected commands and regenerated filenames. This is documentation work, not a merge blocker for #16.

4. **Restore live invocation coverage when #1721 is resolved.** Current tests demonstrate the allocation logic and command compatibility, but the skipped external-Galaxy test does not currently guard the complete download/export flow in CI. An output collision case and input/output collision case would be valuable additions when that test is enabled.
