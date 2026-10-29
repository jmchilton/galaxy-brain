Run via Claude Opus 5.5 at medium effort.

- [x] What does the user see when it fails? A 400 naming the offending fields, not a 500; the summary flags an inaccessible user-tool row instead of returning 403.
<details>

- Names not parallel to their ids or hids: `RequestParameterInvalidException` "dataset_names has 1 entries but dataset_hids has 2; they must be parallel" (`_validate_parallel_names`, `services/workflows.py`). Before this it was a 500 (IndexError).
- Copies of one original sent with different names: 400 "hda_ids includes copies of one dataset with different dataset_names: 'numbers' and 'digits'" (`_copies_named_differently`). The form can't send this because it shows one card per original (`d3e327d5dcd`).
- A collection hid that isn't a collection still gives a 400 "hid N does not appear to be a collection", now raised from `group_hid_inputs_by_original`.
- Summary with another user's tool, or a deactivated one: the row is `invalid="custom_tool_inaccessible"`, `checked=False` (widened `except` in `histories.py`), where the whole summary used to 403.
- PDF/basic export: unlabeled or empty invocation associations are left out (`_invocation_section` returns `""`). Raw directives no longer leak into the output.
</details>

- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_invocation_sections_render_contents` checks the rendered PDF/basic markdown (contents, headings, no leftover `galaxy` fences). The `test_workflow_markdown.py` asserts on the expanded directive text, which is the contract `resolve_invocation_markdown` hands to `to_basic_markdown`, and they also run `validate_galaxy_markdown` on the result. The extraction behavior is covered by API tests.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `aa07cf68c2f` (hid path connects an implicitly converted input) passes on base and comes first. The other new tests fail on base (except `test_extract_by_ids_keeps_empty_input_name`, which guards a draft regression), so they ship with their fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
