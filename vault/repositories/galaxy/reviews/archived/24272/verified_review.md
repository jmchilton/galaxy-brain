# Verified review: galaxy#24272

Reviewed commit `9a97db13b65324badad105f8e0139864ba1d14ba`. Review branch: `pr_24272_review_0` ([details](review_0_branch_details.md)).

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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
