# Response to mvdbeek review (2026-10-20)

Pushed to the fork on 2026-10-22 at `5ad2b2d10c2`:

- `df3dac04058` makes a required select submit `""` only when `""` is its default option (`option[1] === "" && option[2]`). Vitest went red first, then green.
- `5ad2b2d10c2` adds API `test_value_restriction_connected_empty_default_selected` (`collection_creates_pair_format.out_format`). It fails on `release_26.2`'s `modules.py`. Together with `test_value_restriction_static_default_selected` and the numeric list-default test, 3 pass locally.
- No change to the `str()` list-default conversion in `restrict_options`.
- Static check: nothing in the client mutates the option tuples' `selected` flag, so both Selenium tests should still pass. Fork CI will confirm.

## Draft thread replies (not posted)

**`modules.py:1677` (`str()` conversion)**

> Agreed. I'll leave it as it is for the backport and won't extend it. Follow-up on `dev`: type text input defaults as strings in gxformat2, then turn `test_value_restriction_selects_multiple_numeric_text_list_default` into a rejection test.

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

Type text defaults as strings in gxformat2 (schema plus lint), release it, then convert the Galaxy numeric list-default test into a rejection test on `dev` and drop the `str()` conversion.
