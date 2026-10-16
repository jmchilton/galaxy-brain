**Recommendation: keep scope as implemented.** The branch already has the modest expansion: the first scope evaluation's in-branch items were both implemented. Import drops step rows that have no `order_index`, and import of a nested subworkflow invocation is covered. Every remaining candidate is one of three things:
- settled by John (below);
- owned by a sibling branch;
- a test-only tweak or a defensive change for hand-edited archives.

I checked the rest of the touched code for related bugs. No other per-step invocation record carries raw step ids. RO-Crate import goes through the same `_import_workflow_invocations`. Nothing in-branch and unsettled is left to widen.

Evaluated at head `301e92ededd` (since pushed), stacked on #24178 @ `b53a5d9fe8b`. The branch's own diff is `b53a5d9fe8b..HEAD`: 5 files, +153/−9, of which about 37 lines are implementation.

**Settled (not evaluated as options):**
- The stack stays on `dev`. A `release_26.2` backport is John's call after merge.
- The shared resolver `resolve_step_parameters()` lives in #24178. #24176 stays a sibling on #24178 and is not restacked.
- The "step parameters lost" notice is out of scope.
- The siblings own the export (#24178), run-form seeding (#24176) and the client (#24177).
- The `param_map` lookup fix and the 400 for unknown outer indices are done in #24178.

## As implemented (recommended)

- `_serialize` adds `order_index` and index-keyed `step_parameters` to step rows that resolve.
- Import re-keys rows that have an `order_index` onto the rebuilt workflow, and drops rows without one, logging a warning.
- `/request` skips rows whose step isn't in the workflow, logging a warning. This covers invocations imported before the fix.

| Pros | Cons |
| --- | --- |
| • Follows the issue's Proposed Approach, plus the first evaluation's expansion: dropping unmappable rows closes the legacy cross-server collision, and a re-export can no longer give a wrong step a valid `order_index`.<br>• Store format only. No migration, and older Galaxy servers ignore the new keys.<br>• Reuses the parent's resolver and `step_parameters_by_index`/`_by_id` unchanged.<br>• Flat and nested imports, legacy archives and re-export are all pinned red→green.<br>• Normal, Codex (no findings) and thermo (1 small fix) reviews are clean. | • The `/request` skip has no API test. The API can no longer create stale rows; it's covered by reasoning, and the PR description should say so.<br>• Collisions in invocations imported cross-server *before* the fix stay undetectable. There is no id map to recover them from. |

## Related bugs in touched code: other step-id-keyed records (checked, nothing to add)

I swept the invocation store and the `/request` export for other raw-step-id leaks.

| Pros | Cons |
| --- | --- |
| • Confirms the fix is complete for this bug class:<br>  – Steps, step states, input step parameters, input datasets and collections, outputs and subworkflow links all go through `attach_workflow_step(order_index)`.<br>  – `replacements`, `meta` and `resource` input parameter rows are keyed by name.<br>  – Invocation messages, which hold step ids, aren't exported.<br>• RO-Crate is a `DirectoryModelExportStore` subclass. It writes the same `invocation_attrs.txt` and imports through the same directory store and the same `_import_workflow_invocations`. | • Nothing to act on. |

<details>
<summary>Adjacent, not step-id related</summary>

`meta` rows such as `preferred_object_store_id` are copied verbatim on import, so a rerun of a cross-server import could name an object store that doesn't exist on this server. That fails at invoke time, not as a 500 from `/request`. It is a separate concern with its own policy question: drop the row or validate it. It is not this issue's bug, so it isn't worth raising here unless a reviewer brings it up.

</details>

## Expansion: tolerate a bad `order_index` or inner index at import (thermo T5) — not recommended

A row with a stale `order_index` (`KeyError` in `step_by_index`) or an unknown inner index (`step_parameters_by_id`) would be dropped with a warning instead of aborting the whole import.

| Pros | Cons |
| --- | --- |
| • Matches the drop policy for rows without `order_index`. | • Only a hand-edited or mismatched archive can reach it. The exporter writes only indexes it resolved against the same workflow it exports.<br>• Inconsistent with the sibling rows (`attach_workflow_step`), which abort on a bad `order_index` too. Changing one row type alone is arbitrary, and changing all of them is a store-wide policy change.<br>• Adds untestable-through-the-API branches. |

## Expansion: end-to-end rerun submission of an imported invocation — not recommended

Extend the import test so it actually submits the `/request` payload and checks the new run's step parameters, with `include_files=True` so that the inputs are usable.

| Pros | Cons |
| --- | --- |
| • Exercises the user's full flow: Rerun, then Run. | • Test-only, so it doesn't change scope.<br>• Adds little for step parameters. Equality of `/request` with the original's payload, which is keyed by order index, already proves the rows were re-keyed. The parent's `*_rerun` tests prove that payload resubmits.<br>• Needs file import and job runs, so it's slow. Its failures would most likely come from imported datasets or workflows, not from this bug. |

## Expansion: model-side encoder for the import re-key (thermo T3) — not recommended

A `set_step_parameters(step, params)` on the row, the inverse of `resolve_step_parameters()`.

| Pros | Cons |
| --- | --- |
| • Keeps encode and decode next to each other. | • It would be a thin wrapper with one caller. `run_request` already writes rows keyed by id.<br>• It would land on the parent's model class, which is settled to live in #24178. |

## Contraction: remove the `/request` skip and the `_serialize` guard — not recommended

Now that import drops unmappable rows, these two might look dead.

| Pros | Cons |
| --- | --- |
| • A slightly smaller diff. | • Invocations imported before the fix already have stale ids in their databases. Without the skip, Rerun on those returns a 500 again (same server), and without the guard their export fails.<br>• The issue explicitly asks for the skip. |

## Contraction: drop the legacy-archive API test (thermo T2) — not recommended

`test_import_export_invocation` already drives the drop on import. The API test adds about 45 lines of tar helpers.

| Pros | Cons |
| --- | --- |
| • A smaller test file. | • It is the only test of the user's scenario: an old archive, a 200 from `/request`, and a re-export with no stale rows.<br>• Removing a test needs John's approval. |
