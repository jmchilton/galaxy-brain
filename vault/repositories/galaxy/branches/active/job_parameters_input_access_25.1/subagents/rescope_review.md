# Re-scope review debrief

Verdict: ship; no bugs. Acted on:
- Tool input access errors no longer name the dataset (`tools/actions/__init__.py`), so the form placeholder isn't undone at submission. New commit `d3f0af8ae2e` + API test `test_tool_run_inaccessible_hda_input_error` (red before, green after).
- Renamed the `basic.py` module helper to `user_can_access_data_input` (was easy to confuse with the agent method), typed both helpers, updated the `_browser_session` docstring. Fixup into `ea927586c27`.

Not acted on:
- Shared `"(not accessible)"` constant across `markdown_util` and `basic.py` — different presentation layers; a shared home would add a cross-layer import on a release branch.
- Inline HDA placeholder dict vs `append` — `append` reads `hid`/`tags` from the item; a flag would be no shorter.
- Third-party test with an accessible input — owner baselines already pin the accessible shape.
- `dce_content` reuse of `can_access_data_input` — dev follow-up.
- Leaf DCE form rule (whole collection) is stricter than tool execution (element's own dataset); consistent with `parameters_display`. Note for PR description.

<details><summary>Full review</summary>

See [rescope_review_raw.md](rescope_review_raw.md).

</details>
