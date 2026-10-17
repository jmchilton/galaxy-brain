**Recommendation: keep the scope as implemented.** It is a server-only `/build` labelling fix for batch `data` inputs on `release_26.1`, with one Playwright E2E test. Every expansion raised (collection-param parity, client relabel, API test, Selenium drag parity) is either unreported, cosmetic, declined by the user, or separate test infra. Treat them as follow-ups. One merge note, not a scope change: forward-merging into `release_26.2`/`dev` auto-merges `populate_model.py` without a conflict but leaves `Optional` used and not imported (`NameError` on import). Whoever forward-merges must fix it. Alternatively, the branch can write `dict[str, Any] | None` there now; Python >=3.10 on 26.1 allows it.

Issue: [#24093](https://github.com/galaxyproject/galaxy/issues/24093). Diff: `d405ebc1f4c..c78d5bce28f`, 5 files, +81/−13. Server: `tools/__init__.py`, `parameters/populate_model.py`, `parameters/basic.py`. Test: `selenium/test_tool_form.py`, `navigation.yml`.

## 1. As implemented (recommended)

`Tool.to_json` passes the raw flat request state to `populate_model`. This lets `DataToolParameter.to_dict` resolve every value of a `{"batch": true, "values": [...]}` wrapper and feed it through the existing pin/carry path, so every dropped hidden element gets the server label `<hid>: (hidden) <name>`. Form state still keeps only the first value. One `@playwright_only` E2E test drags two paired `forward` elements.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported symptom exactly. The red was `['2: (hidden) forward', 'Selected: forward']`.</li><li>Server labels are authoritative, and every `/build` rebuilds them, so this covers hidden, deleted and foreign-history batch values, not just DCE drags.</li><li>Build-only side channel. Execution and dependent-param state are untouched.</li><li>Reuses `options_pagination` keying and the pin/carry machinery. Normal, codex and thermo-nuclear reviews all approve the altitude.</li><li>Small diff, right for a release branch.</li></ul> | <ul><li>The only regression guard is a Playwright E2E test. The backend fix has no API or unit test (the user's choice).</li><li>Adds an `incoming` arg threaded beside `options_pagination`, one more parameter through `populate_model`.</li><li>Forward-merge conflicts into 26.2/dev (mechanical), plus the silent `Optional` import break noted above.</li></ul> |

## 2. Contract: drop the `to_dict_kwargs` cleanup

Keep only the `incoming` threading. Leave the duplicated paginated/unpaginated `to_dict` calls in `populate_model` as on base.

| Pros | Cons |
|---|---|
| <ul><li>Slightly smaller release-branch diff.</li></ul> | <ul><li>Two reviews called the collapse a net win. Without it, `incoming_value` has to be added to four call sites instead of one.</li><li>Saves almost nothing. Not recommended.</li></ul> |

## 3. Expand: DataCollectionToolParameter batch parity (question a)

Apply the same `incoming_value` handling to `DataCollectionToolParameter.to_dict`. Today it pins only a single `isinstance(..., DatasetCollectionElement)`, so subcollection DCEs batch-dropped into a collection input might show a first-only label.

| Pros                                                                                                                                                                                                                | Cons                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <ul><li>Symmetric with the data-param fix. `populate_model` already gates `incoming_value` on `type == "data"`, so the plumbing exists.</li><li>Same root cause: `to_python` collapses the batch wrapper.</li></ul> | <ul><li>Not reachable: no client sends a multi-value batch to a collection input (probed, see details).</li><li>Not a one-liner. The single-DCE pin needs generalising to a list, and that changes legacy pinned-DCE JSON on a release branch.</li><li>DCE labels have no hid or filename either way (`name (as …)` vs `Selected: name`), so the user-visible gain is smaller.</li><li>Would need its own E2E with a nested collection.</li></ul> |
|                                                                                                                                                                                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                              |

<details>
<summary>details</summary>

`basic.py` `DataCollectionToolParameter.to_dict` pins `{"hid": -1, "name": dce.element_identifier, "src": "dce"}` only when `other_values[self.name]` is a single DCE. `FormData.vue` labels server-pinned DCE options `${name} (as <source>)`. Client keep-options for drops without a hid are labelled `Selected: ${name}`. So a split like the one in this issue is plausible for batch collection inputs.

**Probed 2026-10-16: not reachable.** The collapse code exists, but no client path feeds it two values:

- The tool form's `data_collection` variant is single-select with batch disabled; `module_data_collection` "Multiple collections" lives only in the workflow run form's input steps, which never call `tools/*/build`.
- DCEs drag one at a time (`CollectionPanel` has no multi-select). A throwaway Playwright probe dropped two `list:paired` sub-pairs into `collection_paired_test`; each drop replaced the selection (`{"batch": false, "values": [<one dce>]}`), label `test1 (as dataset collection)`.
- Multi-dragging two selected HDCAs sends `{"batch": false, "values": [hdca, hdca]}`. The server keeps the first, the client adopts it, and the label is the consistent `<hid>: <name>`. The second collection is silently dropped with no warning, a separate minor UX bug, not this one.

The data-only fix is not asymmetric in any way users can hit. No API test added; the user made it conditional on a reproduced collection problem.

</details>

## 4. Alternative or complement: client relabel (question b)

Change the client so a dropped DCE's placeholder uses the underlying dataset's hid and name instead of `Selected: <element_identifier>`. That means `toDataOption` in `FormData.vue` and `setCollectionElementName` in `setDrag.ts`.

| Pros | Cons |
|---|---|
| <ul><li>Removes the brief `Selected: forward` flash before the `/build` response lands.</li><li>No backend change.</li></ul> | <ul><li>Alone, it does not fix the bug. The server rebuild still overwrites the first value with `(hidden) <name>` and leaves later ones client-labelled. Matching that would mean copying the server label format into the client.</li><li>`setDrag.ts` renaming DCEs to `element_identifier` is intentional for other drop targets, so changing it has a wider blast radius.</li><li>The user chose the server-side approach.</li></ul> |

<details>
<summary>details</summary>

At most this is a cosmetic dev-only follow-up: make the client placeholder use the DCE object's hid/name so it matches the server label before the rebuild. It would not replace the server fix. Nothing in the issue asks for it.

</details>

## 5. Expand: add an API regression test (question c)

Add a test in `lib/galaxy_test/api/test_tools.py` that POSTs `tools/cat1/build` with a batch wrapper of two hidden HDAs and asserts both appear labelled `(hidden)`. It would follow the sibling `test_build_data_options_*` pattern, about 20 lines.

| Pros | Cons |
|---|---|
| <ul><li>Cheap backend guard that runs in the API suite on every PR. It covers `to_json` → `populate_model` → `incoming` wiring, which unit tests can't reach.</li><li>The normal review's top recommendation.</li></ul> | <ul><li>The user explicitly declined it in favour of the Selenium-suite test, which does run in Playwright CI.</li><li>The E2E test is the only coverage of the actual client drop path, so it stays either way.</li></ul> |

<details>
<summary>details</summary>

The decision is respected and is not part of the recommended scope. If a PR reviewer asks for backend coverage, this is the ready answer. Optionally add a second case with the data param nested in a conditional or repeat to pin the `full_name` keying.

</details>

## 6. Expand: Selenium-backend drag parity (question d)

Teach `HasDriver.drag_and_drop`, which uses seletools, to dispatch `dragenter`/`dragover` with a real `DataTransfer`. That would let the new test drop `@playwright_only`.

| Pros | Cons |
|---|---|
| <ul><li>Removes a test-infra gap that blocks Selenium coverage of every `FormData` drop.</li></ul> | <ul><li>Test-infra change unrelated to the bug. It belongs on `dev`, not a release-branch bug fix.</li><li>Risk of regressing the existing Selenium drag tests (other components).</li></ul> |

## 7. Target branch (question e): `release_26.1` vs later bases

Keep `release_26.1`. The bug was reported on 26.1, and `release_26.0` has none of the `DataOptionsBuilder`/pin/carry machinery (`_pin_live_hda_inputs` is absent), so 26.1 is the oldest branch the fix applies to as written. `release_26.2` and `dev` are forward-merge hops, not candidate bases.

| Pros | Cons |
|---|---|
| <ul><li>Ships to 26.1 users who reported it.</li><li>26.1 into 26.2/dev merges cleanly on its own, so this branch adds only its own conflicts.</li><li>The user chose it, and the base is current (`origin/release_26.1` == `d405ebc1f4c`).</li></ul> | <ul><li>Three mechanical conflicts into 26.2 and dev: `Optional[...]` vs `\| None` signatures in `basic.py`/`tools/__init__.py`, and test-insertion adjacency in `test_tool_form.py`.</li><li>Silent hazard: `populate_model.py` auto-merges with `incoming: Optional[...]` while 26.2/dev removed the `Optional` import, so the module fails at import. Lint (F821) or any test catches it, but the merger must know.</li></ul> |

<details>
<summary>details</summary>

Checked with `git merge-tree --write-tree origin/{release_26.2,dev} HEAD`. In both results, `populate_model.py` imports only `Any` from `typing` but line 18 reads `incoming: Optional[dict[str, Any]] = None`. There is no `from __future__ import annotations`, so this is a runtime `NameError`. Two fixes, either is fine:

- Write `incoming: dict[str, Any] | None = None` on this branch. `requires-python >= 3.10` on 26.1, so it is valid. It is a style outlier in a file that still uses `Optional`, but it merges forward cleanly.
- Leave the branch as is, and note the fix in the PR/handoff for the forward merger.

No security-relevant findings.

</details>
