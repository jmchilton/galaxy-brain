# Response to mvdbeek review (2026-10-20)

Pushed to the fork on 2026-10-22; tip `3274a9c98da`:

- `df3dac04058` makes a required select submit `""` only when `""` is its default option (`option[1] === "" && option[2]`). Vitest went red first, then green.
- `5ad2b2d10c2` adds API `test_value_restriction_connected_empty_default_selected` (`collection_creates_pair_format.out_format`). It fails on `release_26.2`'s `modules.py`. It passes locally.
- `3274a9c98da` types multiple text parameters strictly, on John's call: the feature is new in 26.2 (#23992, not in any release), so it shouldn't coerce. All three `str()` conversions that #23992 added in response to mvdbeek's review are gone (`restrict_options`, `TextToolParameter.get_initial_value`, `_multiple_to_python`). A non-text default on a multiple text input now fails the run form with a 400 (`InputParameterModule.get_runtime_inputs`), and runtime entries must be `str`. The numeric test is now `test_value_restriction_rejects_multiple_numeric_text_list_default`. Doctests 15 passed, workflow units 194 passed, related API tests 14 passed.
- Static check: nothing in the client mutates the option tuples' `selected` flag, so both Selenium tests should still pass. Fork CI will confirm.

## Draft thread replies (not posted)

**`modules.py:1677` (`str()` conversion)**

> These conversions came from my response to your #23992 review, and multiple text parameters haven't shipped yet, so I've removed them altogether instead of carrying them into 26.2 (3274a9c98da). Multiple text parameters are now strictly typed: a non-text default fails the run form with a 400, and runtime entries must be strings. The numeric test is now a rejection test. I opened galaxyproject/gxformat2#272 to type text defaults as strings in gxformat2, so that this gets caught at upload too.

**`utilities.js:416` (required select submitting `""`)**

> Good catch. Narrowed in df3dac04058: `""` is only accepted when it's the default option. A placeholder `""` option with no default blocks Run again, and the Vitest covers that case.

**`test_workflows.py:10079` (connected `""` default)**

> Added `test_value_restriction_connected_empty_default_selected` in 5ad2b2d10c2. It connects a `""` default to `collection_creates_pair_format`'s `out_format` select, which has a `""` option, and fails without this PR's `modules.py` change.

**Top-level reply (restriction string)**

> Yes, I think that's worth an issue. I'll open one.

## Draft issue (not opened)

Title: Workflow text input restrictions lose data through the editor's `value:label,...` string

> Static `restrictions` on workflow text parameters are stored and edited as one `value:label,value:label` string. Parsing that string on load is lossy:
>
> - a value containing `:` (`a:b`) becomes value `a` with label `b`
> - a value containing `,` (`1,2`) becomes two options
> - a stray comma adds an empty `""` option
>
> Every editor load and save round trip can silently rewrite the allowed values. Workflows authored in gxformat2 with structured `{value, label}` restrictions are affected as soon as they're opened in the editor.
>
> Possible fix: store restrictions as structured `{value, label}` lists, and have the editor edit them as rows instead of a delimited string.
>
> Found during review of #24140.

## Follow-up branch (not started)

Issue: [galaxyproject/gxformat2#272](https://github.com/galaxyproject/gxformat2/issues/272), opened 2026-10-22.

Type text defaults as strings in gxformat2 (schema plus lint), so non-text defaults are rejected at upload rather than at run-form time.
