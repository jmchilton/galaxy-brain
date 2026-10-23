# Thermo-nuclear review debrief (round 2): issue_24411_job_cache_identifier_25.1

The verdict is to approve. I made one change: a pure move in the re-scope commit. The `require_name_match` name block now sits above `identifier_key`, so that commit's `jobs.py` diff reads as a plain hoist and the identifier key sits next to the branch that uses it. I acted on nothing structural, because JobSearch refactors stay off this 25.1 bug-fix branch. New head: `9e28638711a`. Baseline `78ff86441f5` and fix `11535a475cd` are unchanged, and `git diff 108d662a5ef 9e28638711a` shows only the move. `test_jobs.py -k test_cached_job_` passed 6 and `test_workflows.py -k cached` passed 9, each run alone. black, ruff 0.13.3, isort and flake8+bugbear are clean on the changed files. Pushed to `jmchilton`.

Not acted on, with the reason:
- **Nesting the NOT EXISTS under `if require_name_match:`.** It would still test `identifier` twice, so nothing goes away. The `if identifier` / `elif` pair already reads as the two states: the job has the same identifier, or it has none.
- **`set_user_address` could be deleted by using a simpler test tool.** I checked: `model_attributes` is the only test tool that echoes `$input1.name`, so the populator stays. `test_tools.py:370` does the same PUT inline and could use it. That's a follow-up, not something for this branch.
- **Behaviour trade-off from the re-scope.** Tools that read only the identifier now also need a dataset name match, so renaming an element's dataset loses the cache hit. The result is a missed hit, never a wrong one. Splitting "reads name" from "reads identifier" would need the `consumes_names` split listed below, so it waits for dev.
- **Round-1 follow-ups still apply, all JobSearch or dev work:**
  - one "label the job saw" predicate in place of the current name condition, identifier join and NOT EXISTS
  - an `identifier_param_name(k)` helper for the roughly 6 `|__identifier__` literals
  - renaming or splitting `consumes_names`
- **Test helper naming and placement.** `_list_of_existing_dataset` is still an awkward name, and the helpers sit in the middle of the class. Renaming means fixups across all three commits for a nit, so it isn't worth it on 25.1.
- **File size.** `jobs.py` and `test_jobs.py` were already over 1k lines on the base, and `wrappers.py` and `evaluation.py` stay under 1k. The rule doesn't apply.

<details><summary>Full review</summary>

**Verdict:** approve. There's no structural regression and no plausible code-judo move that fits a minimal 25.1 fix. The branch adds no scattered special cases.

**Scope reviewed:** `git diff origin/release_25.1...HEAD` at `108d662a5ef`, with extra attention to what changed since round 1: the hoisted name condition, `tool_evaluator=self` on the fallback wrappers, the `copy_from` comment, `set_user_address` with the rename test, and the workflow baseline test.

**Change applied (fixup into `Require dataset name match for mapped job cache hits`):**

```diff
-        identifier_key = f"{k}|__identifier__"
         if require_name_match:
             hda_history_join_conditions.append(e.name == c.name)
             name_condition.append(b.name == c.name)
+        identifier_key = f"{k}|__identifier__"
         if identifier:
```

**`managers/jobs.py` `_build_stmt_for_hda`.**
- Hoisting the name condition out of the `elif` deletes a branch-specific special case. Whether names must match no longer depends on whether the request carries an identifier, which is simpler than the base.
- The rest of the function now separates cleanly into the HDA match (name, extension, metadata) and identifier presence, which is either an equality or a NOT EXISTS.
- The structural follow-up is still a single label predicate. It's out of scope here.

**`tools/evaluation.py` fallback wrappers.**
- Adding `tool_evaluator=self` makes the fourth `DatasetFilenameWrapper` construction in the evaluator consistent with the other three (lines 487, 501 and 512).
- It's the right layer and adds no new concept. No red test is possible, as the re-scope debrief records.

**`tools/wrappers.py` `element_identifier`.**
- It's unchanged since round 1, and setting the flag on every read is still the right place.
- When the identifier is `None`, the fallback to `self.name` sets the flag a second time. That's harmless.

**`model/__init__.py` comment.**
- The old comment claimed the branch couldn't be reached and gave a wrong rationale. The new one is two lines and states the actual case.

**Tests.**
- `set_user_address` is a small, typed populator next to the other user helpers, and it uses `api_asserts`. It's a reusable abstraction with one more possible consumer (`test_tools.py:370`).
- The rename test asserts both that the job wasn't copied and that the output content is the renamed value, which is strong enough.
- The workflow test's `_identifier_single_job_id` asserts exactly one matching job rather than taking the first, which is good. It duplicates the `[j for j in jobs if j["tool_id"] == ...]` filter found at about 4 sites in `test_workflows.py`. A shared `get_invocation_jobs(..., tool_id=)` filter in the populator would be a cross-file cleanup, so it's a follow-up.
- The `with (a, b):` parenthesized context managers are fine: 25.1 requires Python 3.10 or later, and the base file already uses them.

**Types and boundaries.** There are no new casts, `Any` types or optional parameters. `set_user_address` returns `None` and asserts internally.

</details>
