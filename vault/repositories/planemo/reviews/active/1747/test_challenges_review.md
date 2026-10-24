# Test challenges review — planemo#1747

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `0fe5ce4b` (base `b1ac9ac5`)
- Detail and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

**Verdict:** the tests are good. All three new tests are behavior-level regression tests. They pass at head and fail against master's `autoupdate.py`, and none should be dropped. The gaps: one mock layer that a small extraction would remove, and three branches of the new revision-selection logic that no test checks. No P1s.

### P2 1: Extract the revision-selection decision so the tests don't monkeypatch the ToolShed lookup

`_outdated` monkeypatches `autoupdate.find_repos_from_tool_id` and passes `SimpleNamespace(log=print)` as ctx. Both are needed only because the selection logic sits inside the `check_tool_step` closure, next to the `ToolShedInstance` call.

Hoist it into a pure `find_updated_tool_id(tool_id, repos) -> Optional[str]` (sketch in the debrief). `check_tool_step` keeps the fetch and logging. Then test the new function directly: no monkeypatch, no ctx stand-in. This follows the PR's own move of `base_tool_id` to module level.

### P2 2: Test the no-downgrade seed, the malicious filter, and numeric revision ordering

I ran three mutations, and the PR's tests passed under all of them:
- `matching_tool_ids = [tool_id]` → `[]`: a workflow on `2.2.8.3` gets "updated" to `2.2.8+galaxy1`, which is a downgrade. The PR description calls out this seed as a deliberate change.
- Dropping the `malicious` filter.
- Comparing `numeric_revision` as `str` instead of `int`, so `9` beats `10`. The fixtures list revisions in ascending insertion order, so the PR's tests never exercise the ordering.

Add one case for each. Probe versions of all three pass at head; they are in the debrief.

### P3 1: Pin the `->` changelog contract in an existing integration test

The `->` output lines that the IWC bot parses into changelogs are the user-visible point of the PR, but no test checks them. The Galaxy-gated integration tests do reach the "updated" path. `test_autoupdate_multiple_workflows` could also assert `"The following tools were updated:"` and a `"<base_id>: <old> -> <new>"` line in `result.output`.

Optional: pull the "predicted but not made" computation out of `cmd_autoupdate.cli` into a small `autoupdate` helper, so the warning branch gets a unit test.

### P3 2: Add a gxformat2-original case to `test_updated_tools`

For `.gxwf.yml` workflows, production compares a gxformat2 original (list `steps`, `run:` subworkflows) to a native `.ga` export. The unit test only uses native on both sides. A format2-vs-native case passes at head and would cover this without Galaxy, where today only the Galaxy-gated `test_autoupdate_gxformat2_workflow` covers it.
