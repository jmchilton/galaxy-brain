# Initial implementation debrief

Commits on `dev` (`51e0a80a0db`):
- `0fb0a277264` Baseline tests: plain dataset renders `null`; workflow step mapped over a list already gets each identifier (workflow map-over passes a DCE). Moved tool dict to `TOOL_WITH_ELEMENT_IDENTIFIER` in `populators.py`.
- `520d3fa8a6d` Fix + red tests (`/api/tools` batch, `/api/jobs` Batch) + 2 unit tests in `test/unit/app/tools/test_runtime.py`.

Red verified: both mapped API tests rendered `null\n` per element before the fix; unit tests red before fix.

Cause: tool-form/API map-over (`meta.py` `__expand_collection_parameter[_async]`) gives each job an HDA with a transient `element_identifier`; job state records `{"src": "hda"}`. `runtimeify` only sets `element_identifier` on the DCE branch; legacy `to_cwl` never set the property. `/api/tools` → `to_cwl` (no `job.tool_state`); `/api/jobs` → `runtimeify`.

Fix: `UserToolEvaluator.build_param_dict` builds `{dataset.id: identifier}` from `ElementIdentifierMapper` + job params (`<name>|__identifier__`, written by `actions/__init__.py`), passes it to `setup_for_runtimeify(element_identifiers=...)` (looked up by resolved HDA id, then requested id, so implicit conversions work) and `to_cwl(element_identifiers=...)`. basename/nameroot unchanged.

Checks: 4 API tests green; `test_runtime.py`, `test_modules.py`, `test_evaluation.py`, configfile-paths unit tests green (163+2); ruff/black clean; mypy error count unchanged vs base.
