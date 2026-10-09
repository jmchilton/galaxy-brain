Fix 🎯 #23886 - a collection output's `type_source` crashes job creation when it points into a conditional or at an input named like `reads_1`.

| Tool declares                                  | `type_source`                       | `release_26.1`                                          | This PR                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `input_collect` at top level                   | `input_collect`                     | ✅ works                                                 | ✅ works                                                                                                                                    |
| `input_collect` in `<conditional name="cond">` | `cond\|input_collect`               | ❌ `'Conditional' object has no attribute 'inputs'`      | ✅ works, mapped or not                                                                                                                     |
| `reads_1` at top level                         | `reads_1`                           | ❌ `'NoneType' object has no attribute '_history_query'` | ✅ works                                                                                                                                    |
| `input_collect` in a section and repeat        | qualified                           | ✅ works                                                 | ✅ works (new regression test)                                                                                                              |
| `input_collect` in `<conditional name="cond">` | `input_collect` (bare legacy alias) | ❌ `'NoneType' object has no attribute '_history_query'` | ❌ tool fails to load: *Output collection 'list_output' has type_source 'input_collect', which must be qualified as 'cond\|input_collect'.* |

`cond|input_collect` is the qualified form the XSD docs and linter tell authors to use for `structured_like`, so the obvious spelling is the one that crashed. When mapped over, Galaxy built the implicit output collection and then job creation failed, which in a workflow fails the invocation.

***The bare-alias row is rejected when the tool loads, not newly supported: it never worked when the output was created, mapped or not.*** ***`format_source` and `structured_like` still accept legacy aliases. Only `type_source` lookup changes.*** ***No known shipped tool is affected: every `type_source` in Galaxy's own tools is top-level or already qualified, and tools-iuc, bgruening/galaxytools and tools-devteam don't use `type_source` at all.***

***This targets `release_26.1` as a crash fix. It isn't a regression: the string walk dates from 2018.***

This PR:

- **Records each collection parameter during the existing input visit.** `collect_input_dataset_collections` already walks the inputs with `tool.visit_inputs`, which follows the active conditional case. It now also records each collection-holding parameter under its qualified key.
- **Looks `type_source` up instead of re-walking `tool.inputs` by string.** The old walk assumed every group has `.inputs` (conditionals don't) and stripped a trailing `_<digit>` from every name, as if it were a repeat index.
- **Rejects bare aliases when the tool loads, at every profile.** The error names the output and the qualified key to use, so authors find out once instead of on every job. Any other unresolved `type_source` still fails at job creation, now with an error naming the output.
- **Documents the rule.** The XSD docs for `type_source` and `collection_type_source` now say nested inputs must be qualified, as the docs for `structured_like` already do.

<details><summary>Implementation notes</summary>

- The `(value, reduced)` pairs and the parameters are recorded together by one `record()` helper, so the key check and the lookup can't disagree.
- `_collect_inputs` returns a `CollectedToolInputs` NamedTuple. It was a 6-tuple and would have been 7.
- The load check maps each nested data or collection input's legacy path (conditional and section names dropped, as `visit_input_values` does) to its qualified path, keeping repeat indices, so `rep_0|input_collect` becomes `rep_0|cond|input_collect`.
- `LegacyUnprefixedDict` gains `map_values()`, which replaces the manual `_legacy_mapping` copy when building `input_collections`, which keeps aliases working for `format_source` and `structured_like`.
- Model-operation tools take the same path. They never had legacy aliases, so they behave the same.

</details>

## Risks

One-way door: a tool whose `type_source` uses a bare alias for a nested input no longer loads, at every profile.

<details><summary>Risk Details</summary>

- Bare legacy aliases for `type_source` are rejected for good. Supporting them later would mean a second resolution rule.
- A tool that used a bare alias only on an output it filters out could run on `release_26.1` whenever the filter dropped that output, because the lookup was skipped. That tool now doesn't load at all. We know of no such tool.
- No linter checks `type_source` yet. Authors find out at load time.

</details>

<details><summary>Risk Review Advice</summary>

Check that failing the tool load, rather than supporting the alias, is the rule we want. `structured_like` and `format_source` accept the alias, so `type_source` is now the strict one. Also check that `collect_input_dataset_collections` records parameters in exactly the cases where it records values, since the lookup depends on the two agreeing.

</details>

## Context

Found while writing the developer reference in 🔀 #23877, which describes this walk. Related to 🎯 #23444, a shared resolver for nested references in output sources. ***This PR isn't that resolver; it fixes the crash with the traversal Galaxy already does, and its tests carry over.***

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A bare alias stops the tool loading, with an error naming the output and the qualified key. Any other unresolved `type_source` gets a 400 naming the output, not an internal `AttributeError`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - the unit tests load tool XML and check whether it loads. The tool and workflow tests run jobs and check their outputs.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Only steps that crashed. Qualified conditional and `_<digit>` references now run. Tools with bare aliases no longer load.
- [x] Who hits this in practice and what is the evidence? Nobody known: tools-iuc, bgruening/galaxytools and tools-devteam don't use `type_source` at all. The crash is on the documented reference style.
- [x] Were simpler or existing approaches considered? Yes - see details.

<details><summary>Alternatives considered</summary>

- **Teach the string walk about conditionals and repeats.** That adds a third traversal of the input tree, next to `visit_input_values` and `sliced_input_collection_structure`, and it can drift from the keys `input_collections` holds. Recording the parameter during the existing visit can't drift.
- **Wait for the #23444 resolver.** That's the long-term answer, but it's a larger design question. This fix is small and its tests carry over.
- **Also accept the bare alias.** #23886 first proposed this. It would make a reference that never worked newly valid, so it was dropped ([issue comment](https://github.com/galaxyproject/galaxy/issues/23886#issuecomment-5969319163)).

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

Tool framework tests (`test/functional/tools/`):

- `collection_type_source_conditional`: `type_source="cond|input_collect"`. Fails on `release_26.1` with `'Conditional' object has no attribute 'inputs'`.
- `collection_type_source_digit_name`: `type_source="reads_1"`. Fails on `release_26.1` with `'NoneType' object has no attribute '_history_query'`.
- `collection_type_source_section_repeat`: a section and a repeat. Passes on both, kept as a regression guard.

Workflow framework test (`lib/galaxy_test/workflow/`):

- `collection_type_source_conditional_mapped`: maps a `list:list` over the conditional input. On `release_26.1` the invocation fails; the cause is `'Conditional' object has no attribute 'inputs'`.

Unit (`test/unit/app/tools/test_tool_deserialization.py`):

- `test_bare_type_source_alias_fails_to_load`: bare aliases into a conditional, a section and a repeat-wrapped conditional fail to load, naming `cond|input_collect`, `sec|input_collect` and `rep_0|cond|input_collect`. All three load on the branch without the check.
- `test_qualified_type_source_loads`: the qualified forms load, as does a bare name that matches a top-level input.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
