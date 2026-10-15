# Normal review — issue_24093_batch_element_labels_26.1

**Implementer top line:** No code changes from this review. Approve verdict accepted.

Not acted on:
- (1) API test — user explicitly asked for a Selenium-suite test *instead of* an API test; E2E runs in Playwright CI.
- (2) `MalformedId` from a later batch value — left; matches `check_param` handling of `values[0]`, and client never sends malformed ids.
- (3) null batch value + `default_object` — left; client `createValue` only emits real `{id, src}` entries.
- (4) `DataCollectionToolParameter` — follow-up, out of scope.

---

**Verdict: approve; no blockers in branch logic. Recommend adding one API regression test (finding 1); rest low/optional.** Reviewed `d405ebc1f4c..c6d281bb3c3` (fix + Playwright E2E). Fix verified at unit level with a scratch probe (two hidden HDAs in a batch wrapper both come back `(hidden) <name>`; before, only the first).

## Findings (ranked)

1. **Medium — no backend-level guard for a backend fix.** `lib/galaxy_test/selenium/test_tool_form.py:386` is the only test, `@playwright_only`. Playwright CI (`.github/workflows/playwright.yaml`) does run `lib/galaxy_test/selenium`, so it is guarded, but slowly and only through drag-and-drop. Suggest an API test in `lib/galaxy_test/api/test_tools.py` beside `test_build_data_options_pinned_outside_page`: POST `tools/cat1/build` with `inputs={"input1": {"batch": True, "values": [hdaA, hdaB]}}` where both are hidden (or DCEs of a paired collection), assert both ids appear in `options.hda` with `(hidden) ` names. Covers `to_json` -> `populate_model` -> `incoming` wiring the unit level can't. Optionally a second case nesting the data param in a conditional/repeat to pin `full_name` keying. Keep the E2E (it's the only coverage of the client drop path).
2. **Low — `MalformedId` escapes `_batch_selection`.** `lib/galaxy/tools/parameters/basic.py:2630-2642` catches only `ValueError`; `security.decode_id` raises `galaxy.exceptions.MalformedId` (a `MessageException`). Probe: a garbage `values[1]` now 400s the whole build, where before it was ignored. Matches `check_param`'s precedent for `values[0]` and the client never sends malformed ids, so acceptable; either leave (say so in debrief) or catch `(ValueError, MessageException)` since this path is best-effort labelling only.
3. **Low/optional — null batch value + `default_object`.** `from_json(None)` returns `default_object` when the param has one, so a null entry in `values` would carry the tool default as an extra keep-option. Rare; a `if value in (None, "", "None"): continue` in `_batch_selection` would close it.
4. **Follow-up (agree out of scope) — `DataCollectionToolParameter.to_dict`** still pins a single DCE; batch-dropped subcollection DCEs likely show the same first-only labelling. Fine as a follow-up; populate_model already gates `incoming_value` on `input.type == "data"`, so extending later is a one-line kwarg + helper.

## Checked, no finding

- **Keying:** `populate_model` prefixes (`rep_{i}|`, `cond|`, `section|`) match `_populate_state_legacy` flat keys (`lib/galaxy/tools/parameters/__init__.py:648-751`). `/build` client payload is flat; nested payloads already don't work for groups in legacy `populate_state`, so no new gap.
- **Other callers:** `lib/galaxy/workflow/modules.py:1616` passes no `incoming` -> `{}` -> `incoming_value=None` -> no-op. No `DataToolParameter` subclasses override `to_dict`.
- **Rerun path:** `params_to_incoming` puts model objects (not batch dicts) into kwd -> `_batch_selection` returns `[]`.
- **Validation parity:** later values go through the same `from_json` as the first (state/deleted/collection checks, `ParameterValueError` is a `ValueError` -> skipped). A bare HDCA in a non-multiple batch raises and is skipped — same as pre-fix (first HDCA still handled via form state).
- **DB cost:** N extra `get`s + matcher calls per build; `value not in job_input_values` and `_page_hda_matches` filtering are O(N x page). Negligible for realistic selections.
- **Abstraction:** `meta.py`'s `is_batch` is a nested closure and `__collection_multirun_parameter` is private; nothing public to reuse. Threading `incoming` next to `options_pagination` (same keying) is consistent; collapsing the duplicated paginated/unpaginated `to_dict` calls into `**to_dict_kwargs` is a nice cleanup. Form state still holding only the first value keeps dependent params (column/metadata filters) unchanged — correct choice.
- **Imports:** `MutableMapping` already imported at module top; no buried imports.
- **`@playwright_only` justification:** holds — `FormData.vue` drop needs `@dragenter`; `seletools` `drag_and_drop` doesn't dispatch it. Existing Selenium drag tests target different components.
- **E2E quality:** asserts exact server labels incl. hid for both drops (would catch regression to `Selected: forward`); red observed before fix per implementation debrief. New selectors are scoped to `form-element-${parameter}`. Fine.

<details>
<summary>details</summary>

### Fix shape
`Tool.to_json` passes `params.__dict__` as `incoming`; `populate_model` threads it through groups and passes `incoming.get(full_name)` as `incoming_value` to `data` params. `DataToolParameter._batch_selection` resolves each value of a `{"batch": true, "values": [...]}` wrapper with `from_json` and appends unseen items to `job_input_values`, which then flow through the existing page/pin/carry machinery (`_page_hda_matches`, `_pin_live_hda_inputs`, `_carry_unresolved_inputs`). Root cause is `BaseDataToolParameter.to_python` collapsing a batch wrapper on a non-multiple param to `values[0]`; fixing it there would change execution/dependent-param state, so a build-only side channel is the right altitude.

### Probe details (scratch, not committed)
Subclassed `TestDataToolParameter` from `test/unit/app/tools/test_data_parameters.py`. Note: the base fixture's `MockTrans(history=...)` creates its own `MockApp`, so ids encoded/added via `self.app` don't resolve through `trans.sa_session`; a unit test must build `MockTrans(app=self.app, history=self.test_history)`. With that:
- two hidden HDAs in batch -> `['(hidden) hda1', '(hidden) hda2']` (pass).
- second value `{"src": "hda", "id": "zzz"}` -> `MalformedId` propagates.
- unknown HDCA id -> `ValueError` -> skipped.
Existing `test_data_parameters.py` suite: 21 pass.

### Why API test over unit test
A unit test on `_batch_selection`/`to_dict` would be quick but needs the fixture tweak above and would not cover `to_json` passing `params.__dict__` or `populate_model` keying. The sibling `test_build_data_options_*` API tests already exercise `/build` options/pinned output with `cat1`, so the new test is ~20 lines of established pattern and runs in the API suite on every PR.

</details>
