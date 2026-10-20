Kind of think these P3s are bullshit and I would ignore them. -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Mostly a two-way door: no API or format change, but the fix lives in the shared `visit_input_values` walker, so every caller (not just workflow import of `__job_resource`) now gets a default selector written into state for any conditional whose selector is missing, and imported workflows persist that default.

<details><summary>Risk Details</summary>

- The new branch applies to all conditionals in all callers of `visit_input_values` (tool execution, workflow run/refactor, state upgrades), not only the injected `__job_resource` group. Previously a missing selector produced `__current_case__ = -1` and skipped the case; now the default case is selected and its nested inputs are visited.
- `get_initial_value(None, context)` runs with `trans=None`; for tool-defined conditionals with dynamic or data-dependent selectors this may raise or pick a different default than the tool form would.
- Saved workflow `tool_state` now contains a defaulted conditional where before it would have errored; that persisted state is a minor, but durable, change to workflow artifacts.
- Release-branch (26.1) fix; rollback is a simple revert since no schema or API changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether defaulting missing conditional selectors is acceptable as general walker behavior or should be scoped to the import/fill-state path (e.g. done by the callback that leaves the selector absent). Check that callers relying on a missing selector meaning "no case" (case inference, `allow_case_inference`, error reporting via `case_error`) still behave correctly, and that `trans=None` is safe for dynamic selectors.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24272_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

**Heads up: the branch deletes the PR's new unit test file `test/unit/app/tools/test_visit_input_values.py`**, moving its coverage into the `visit_input_values` doctest (see P3 2).

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_24272_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24272_review_0)

The branch is built on the reviewed commit `9a97db13`. It moves the test coverage for the new missing-selector seeding out of a Bunch-faked unit file and into the `visit_input_values` doctest, and deletes that file. The PR's unit tests aren't lost. The missing-selector case becomes a doctest that fails without the fix. The present-selector case is already covered by the first doctest's round-trip assertion that `g` is `True`, which would fail if the seed overwrote a selector already present. The branch also makes the seed tolerate selectors whose default needs a `trans`, such as genome builds, `from_url`, and data-table filters. Those fall back to the old behavior: the selector stays unset and no case is selected (`__current_case__ = -1`), where the PR as written raised `AttributeError`. The PR's integration test is unchanged and wasn't run.

- [`7e081456d27`](https://github.com/jmchilton/galaxy/commit/7e081456d27) Cover missing-conditional seeding in visit_input_values doctest. Adds a doctest case showing that the default case is selected and serialized, and deletes `test/unit/app/tools/test_visit_input_values.py`.
- [`5659f52b751`](https://github.com/jmchilton/galaxy/commit/5659f52b751) Keep old behavior when a missing selector's default needs a trans. Wraps the seed in a `try` and adds a doctest using a conditional keyed on `genomebuild`.

</details>

</details>

### P3 1: Seeding a selector with `trans=None` can now fail for walkers that used to tolerate a missing selector (implementation verified)

`visit_input_values` has no `trans`, so the new seed calls `test_param.get_initial_value(None, context)`. A select whose options need a trans then raises `AttributeError`. That covers `genomebuild` (`trans.history`), `from_url` options (`trans.user`), and data-table filters (`trans.app`). Before this change, callers that don't pass `allow_case_inference` handled a missing selector silently with `__current_case__ = -1`. Now every such walker fails on it, including job-time evaluation and workflow run/refactor, not only import. Selectors like this are rare in conditionals, but the failure is a hard error in paths that never serialize the state.

<details><summary>Evidence</summary>

A conditional keyed on `GenomeBuildParameter`, with the state `{}` and the default `allow_case_inference=False`:

- at `9a97db13~1`: `{'c': {'__current_case__': -1}}`
- at `9a97db13`: `AttributeError: 'NoneType' object has no attribute 'history'`

</details>

Wrap the seed in a `try` and leave the selector unset when it fails, so those cases fall back to the earlier behavior. Static selectors, including `__job_resource__select`, still get seeded. An `is_dynamic` guard would also work, but it would skip seeding for dynamic selects that don't need a trans.

<details><summary>Details</summary>

```python
try:
    values[input.test_param.name] = input.test_param.get_initial_value(None, context)
except Exception:
    # Dynamic options (genome builds, from_url, data table filters) may need a trans.
    pass
```

There is also a doctest case: a `genomebuild`-keyed conditional ends up as `{'__current_case__': -1}`.

</details>

Fixed in [`5659f52b751`](https://github.com/jmchilton/galaxy/commit/5659f52b751).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Test the seeding in the `visit_input_values` doctest instead of a Bunch-faked unit file (implementation verified)

`visit_input_values` documents how it handles missing state in its doctests, but the new behavior isn't covered there. The existing "Conditional parameter missing in state" case never reaches the new branch: its `TextToolParameter` selector seeds a value that matches no case. Instead, the new unit file builds a conditional out of `cast(ConditionalWhen, Bunch(...))`. Its missing-selector test duplicates the integration test, which already covers the real injected `__job_resource` group from start to finish.

A doctest case that drops the conditional and selects the boolean's default case covers the branch more directly. Its output shows the case being selected, `i` being visited, and `params_to_strings` serializing the state. The doctest fails with `KeyError: 'g'` when the seed is removed. `test_present_conditional_selector_is_kept` is already covered: the first doctest's round-trip asserts `['f']['g'] is True` while `g` defaults to `False`, so a seed that overwrote a selector already in the state would fail it. Delete `test/unit/app/tools/test_visit_input_values.py`.

<details><summary>Details</summary>

```python
>>> # Conditional missing in state, selector is seeded with its default so the default case is visited
>>> f.name = 'f'
>>> f.test_param = g
>>> nested = dict([('a', 1), ('b', [dict([('c', 3), ('d', [dict([('e', 5)])])])])])
>>> visit_input_values(inputs, nested, visitor)
...
name=g, prefix=b_0|d_0|, prefixed_name=b_0|d_0|f|g, prefixed_label=b 1 > d 1 > g, value=None
No value found for 'b 1 > d 1 > g'.
name=i, prefix=b_0|d_0|, prefixed_name=b_0|d_0|f|i, prefixed_label=b 1 > d 1 > i, value=None
No value found for 'b 1 > d 1 > i'.
>>> params_to_strings(inputs, nested, None, nested=True)['b'][0]['d'][0]['f']
{'g': False, '__current_case__': 1}
```

</details>

Fixed in [`7e081456d27`](https://github.com/jmchilton/galaxy/commit/7e081456d27). **Note: this commit deletes the PR's new unit test file `test/unit/app/tools/test_visit_input_values.py`** in favour of the doctest above.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
