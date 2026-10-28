# Normal review (raw) - job_parameters_input_access_25.1

Reviewed `git diff origin/release_25.1...HEAD` (2 commits: baseline tests + change).

## Verdict

**Approve with two small fixes suggested.** The change is small, correct for every item kind, uses the existing security-agent predicates, and costs at most one extra query per data input. No blocking bugs. Unit tests pass (29/29 in `test_markdown_export.py`); ruff clean; mypy shows only the env-local `types-Markdown` stub note.

## Bugs / robustness (cheap, recommended)

1. **Markdown `job_parameters` still crashes on `None` elements.** `summarize_job_parameters` appends `None` for an unset optional data input (the client handles this with "No input provided"). `_data_input_text(None)` raises `TypeError` on `"name" not in item`. Old code failed the same way (`p['hid']`), so not a regression, but the helper is new and fixing it costs one line:
   ```python
   def _data_input_text(item: Optional[dict[str, Any]]) -> str:
       if item is None:
           return "No input provided"
       if item.get("name") is None:
           return "(not accessible)"
       ...
   ```
   Add a `None` to the value list in the new unit test.
2. **`"name" not in item` vs `item.get("name") is None`.** The markdown path gets the raw dict (key missing), but the API path serializes through `EncodedJobParameterHistoryItem`, so the same item shows up as `"name": null`. Using `item.get("name") is None` makes the helper work for both shapes. Otherwise a model-serialized dict falls through to `item["name"]` → `None` and `", ".join` raises.

Good side effect worth mentioning in the PR: the old markdown code raised `KeyError` on any DCE input (no `hid`). `_data_input_text` fixes that, and the new unit test covers it.

## Access predicate (checked; correct)

- HDA → `can_access_dataset(roles, hda.dataset)`: public-or-role check. Matches `DatasetManager.is_accessible`, which `get_accessible_job` uses.
- HDCA → `.collection` → `can_access_collection`; DCE → `element_object`, which is HDA/LDDA (`.dataset` exists) or a child `DatasetCollection` (collection branch). All covered.
- Anonymous: `get_current_user_roles()` returns `[]`, so only public items get names. Anonymous/session-owned data is public by default, so session-owned jobs are unaffected.
- Admin: `trans.user_is_admin` skips the check. That matches `DatasetManager.is_accessible` and `get_accessible_job`. `can_access_collection` itself has no admin bypass, so the explicit bypass is needed.
- The job owner gets no bypass, which is intended and tested (`test_parameters_display_input_made_private_by_its_owner`).
- Theoretical edge: a DCE with `element_object is None` would raise `AttributeError` on `.dataset`. That shouldn't happen for a job input that ran. Ignore it, or guard with `item is None → False`.

## Query cost

- HDA: one lazy load of `dataset.actions` per input, plus role checks in memory. Roles are loaded once per call (`get_current_user_roles`, cached on WorkRequestContext).
- HDCA/DCE-collection: `dataset_action_tuples` is one nested-attributes SQL statement per collection, cached on the instance.
- A job's inputs are bounded and usually few. Acceptable. No cheaper bulk helper exists on release_25.1 for mixed HDA/collection inputs.

## Reuse / abstraction (nits)

- `DatasetManager.is_accessible` (managers/datasets.py) covers the HDA case including the admin check. The collection side has no manager equivalent: `services/dataset_collections.py:288` calls `security_agent.can_access_collection` inline too. `summarize_job_parameters` is a module function that only receives `trans`, so the inline closure is reasonable for a release-branch fix.
- A reusable follow-up for dev: an `is_accessible`-style helper on the security agent or a small manager function that takes any of HDA/HDCA/DCE/DC plus roles. The same dispatch (DCE → element_object, HDCA → collection) recurs elsewhere. Not needed for this PR.
- Type hints: `item` in `can_access_data_input`/`data_input_value` could be `Union[HistoryDatasetAssociation, HistoryDatasetCollectionAssociation, DatasetCollectionElement]`. Optional nit.
- Docstring on `data_input_value` is one line; fine. No new imports.

## Tests

- Baseline commit (hda/hdca/dce happy paths) comes first and should pass on base. The DCE baseline asserts `"hid": None`, which confirms the API serializes defaults as `null`.
- The new inaccessible tests (hda via both job and deprecated dataset endpoints, owner-made-private, hdca, dce) assert exact equality, so they are red without the fix. Admin full view is asserted for the hda case.
- The markdown unit test is red without the fix (old code: `KeyError` on DCE/missing hid).
- Missing / possible additions (optional):
  - A partially-private collection (one element private) → id only. Documents the `can_access_collection` all-or-nothing semantics.
  - Admin assertion for the hdca/dce cases (one line each, reusing the existing setup).
  - A `None` element in the markdown unit test, if fix 1 is taken.
  - Anonymous viewer: hard to set up in API tests (`_different_user(anon=True)` plus a public output). Low value; skip.

## Sibling serializers on release_25.1 (scope suggestions only)

- `GET /api/jobs/{id}?full=true` (`Job.to_dict` "inputs"/"outputs"): emits `id`/`src`/`uuid` only, no names/hids. Out of scope.
- `GET /api/jobs/{id}/inputs` and `/outputs` (`dictify_associations`): `name` is the tool parameter name, not the dataset name. Out of scope.
- `summarize_job_outputs`: `{src, id}` plus the tool's output label. Out of scope.
- Rerun/`build_for_rerun` (tool `to_json` with a `job`) restores input values into the tool form, and data param `to_dict` may include hid/name for referenced items. Gated by `get_accessible_job`. Worth a quick look in a follow-up to check whether the form state carries names of items from other histories. Out of scope for this branch.
- Provenance (`/api/histories/{id}/contents/{id}/provenance`): emits input ids/uuids and raw params. Worth a follow-up check, out of scope.

## Client

- `JobParametersArrayValue.vue` renders hda/hdca/dce via `GenericHistoryItem` by id. The `{{ elVal.hid }}: {{ elVal.name }}` fallback only applies to other srcs, so the optional `name` needs no client change. The `schema.ts` diff matches the pydantic change.
