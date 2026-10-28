# Codex review debrief (round 2)

Three findings; none acted on. All three describe behavior that matches an existing Galaxy contract or the branch's documented shape. Head unchanged (`2c31c23611f`).

Not acted on:
- **In-history matches in tool-form options keep real name/hid/tags** (P1, `basic.py` matching loop). Refuted as a defect: items in the caller's current history are already listed with name/hid by history contents. `HDASerializer.serialize` falls back to the `"inaccessible"` view, which still includes `name` and `hid` (`managers/hdas.py:577-580, 640-645`). The branch only changes previous inputs from outside the current history. The in-history loop was deliberately left untouched.
- **`hid`/`name` serialize as `null` rather than being omitted** (P2, `schema.py`). Refuted: `null` is the documented contract (initial debrief and the API tests pin `"hid": None, "name": None`). It also matches how the model already serializes a dce's `hid`.
- **`append_dce` placeholder has no `hid`** (P2). Refuted: data-param DCE options have never carried `hid`. The baseline test `test_rerun_form_leaf_dce_option` pins that shape on unmodified 25.1, and the branch keeps the shape.

Design note for John: the branch's rule (dataset access) is stricter than history contents. A viewer of a published history sees the name and hid of a restricted HDA there, but `parameters_display` hides them.

<details><summary>Details</summary>

`codex exec -s read-only` over `git diff origin/release_25.1...HEAD` with the findings schema. The brief gave purpose only. Coverage: 18 files including dataset_matcher, populate_model and the tool actions. Codex ran no tests.

</details>
