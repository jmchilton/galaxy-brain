# Scope evaluation

**Recommendation: expand modestly.** Keep both fixes and add three small changes to code the branch already touches, so Galaxy can't wipe its live registry again and column conflicts raise one exception type everywhere. (1) Move `reset_tool_data_tables` off the Galaxy-shared `BaseShedToolDataTableManager` into the Tool Shed's `lib/tool_shed/tools/tool_validator.py`, its only remaining caller. (2) Turn the bare `assert` in `TabularToolDataTable.merge_tool_data_table` into `DataTableColumnMismatch`. (3) Drop the now-dead `existing.columns is not None` check at `data_table_manager.py:296`. Together that's about 15 lib lines plus a unit test or two, all in the 26.1 code the branch already edits. Atomic strict loading (scope D) is a reasonable add-on but optional. A 26.0 backport (scope E) is a separate branch for John to decide. The tools-iuc rename stays out.

## Possible Decompositions

The branch is about 111 changed lines (+97/-14; about 33 in lib, the rest tests), so it is only just over the threshold. The existing 4 commits already split cleanly:

1. **Baseline refactors** (`f65bf583d59`, `4caa2ec15ef`): declare `columns` on `ToolDataTable`, and add the `_show_tool_data` test helper. No behavior change. Could land first as its own PR.
2. **Startup tolerance** (`35543ecf726`): `load_from_config_file` checks consistency, and the shed config skips mismatches. This un-bricks servers that are already broken. Stands alone.
3. **No registry wipe** (`043dd7caad4`): remove the reset call. Stands alone and is independent of 2. If scope B is taken, the reset relocation fits here.

Options: one PR (as now); 1+2 and 3 as two PRs; or 1, 2 and 3 as three PRs, with 2 and 3 in either order.

## A. As implemented

Startup tolerance: shed-config tables whose columns conflict with a registered table are logged and skipped, while the admin config still fails fast. Also stops `handle_missing_data_table_entry` from emptying `app.tool_data_tables.data_tables`. Covers fixes 1 and 2 from the issue's root-cause comment.

| Pros | Cons |
|---|---|
| Fixes both Galaxy causes, and already-broken servers boot without hand-editing XML | `reset_tool_data_tables` still sits on the Galaxy-shared base class, one call away from coming back |
| Small and well reviewed (normal, codex, thermo: no blockers) | Merge `assert` is left in place, so a conflict raises `AssertionError` or `DataTableColumnMismatch` depending on the path |
| Reuses the canonical `assert_data_table_consistency` | Dead `columns is not None` check stays (both reviews noted it) |
| | No end-to-end install-flow test for the reset removal; the normal review judged one disproportionate. Test adequacy is outside this evaluation |

## B. Modest expansion (recommended)

A, plus: move `reset_tool_data_tables` into the Tool Shed validator (or inline `self.app.tool_data_tables.data_tables = {}` there) and delete it from `BaseShedToolDataTableManager`. Convert the merge `assert` to `raise DataTableColumnMismatch`, and drop the dead check. These are the three follow-ups the thermo and normal reviews filed for dev.

| Pros | Cons |
|---|---|
| Closes the bug class structurally: no Galaxy-side API can empty the live registry | Touches `lib/tool_shed/` (the Tool Shed app) in a Galaxy 26.1 fix |
| One exception type for column conflicts on every path, including reload replay and direct merges | The merge `assert` can't fire from startup any more, so converting it is defensive rather than a user-visible fix |
| Each change is a few lines in files the branch already edits, and reviewers usually ask for exactly this cleanup | One more test (validator reset, or merge raises the typed error) |
| | Removes a public method from 26.1. The module keeps a `ToolDataTableManager` alias "for backwards compatibility with existing data managers", so outside code may import it. To be safe, keep a deprecated no-op or warning shim on the Galaxy side |

<details>
<summary>Details</summary>

- Reviews filed these as "dev" follow-ups because the branch targets a release. The process overrides that reason: Galaxy is liberal about release-branch bug fixes, and these are related defects in touched code.
- Relocating the reset: `lib/tool_shed/tools/tool_validator.py:234` is the only caller. It runs in the Tool Shed, where the registry really is throwaway. `lib/tool_shed/tools/tool_validator.py:24` subclasses `galaxy.tool_shed.tools.tool_validator.ToolValidator`, which sets `self.stdtm = BaseShedToolDataTableManager(self.app)` (l.26), so `self.app` there is the Tool Shed app. The reset can be a private Tool Shed method or an inline assignment. Galaxy's `ShedToolDataTableManager` then has no wipe method at all.
- Optional fourth tiny item: rename the `_testbase_fields` typo (testbase vs testbeta) in `test_tool_data_delete.py`, a test file the branch already edits. It is pre-existing and cosmetic, so leaving it out is fine.
- Merge `assert`: thermo rejected moving the *check* into the merge (that would reorder `table_elems.append`). Swapping `assert` for a typed raise keeps the explicit pre-check and avoids that objection. It also means `python -O` can no longer skip the check.

</details>

## C. Contract: reset removal only

Ship only `043dd7caad4` and leave startup strict.

| Pros | Cons |
|---|---|
| Smallest diff; removes the root cause | Servers already holding the bad `<table>` still fail to boot (the reporter had to hand-edit XML) |
| | Any other path that writes a conflicting shed table still bricks Galaxy; the issue itself says installing a repo should never stop Galaxy from booting |

## D. Atomic strict `load_from_config_file`

Validate every table in the file before registering any, so a strict-mode mismatch leaves memory untouched. Skip mode keeps its per-table behavior.

| Pros | Cons |
|---|---|
| Fixes a pre-existing in-memory vs shed-conf disagreement in the function the branch edits (thermo follow-up) | Unlikely on the main install path: `install_manager.py:177` runs `install_tool_data_tables`, which checks every `<table>` before `add_new_entries_from_config_file` runs. That leaves mainly the legacy `handle_missing_data_table_entry` path |
| About 10 lines, a two-pass loop | Not user-reported; more churn in a release-branch fix |

<details>
<summary>Details</summary>

Today, if table N mismatches, tables 1..N-1 are already in `data_tables`. `add_new_entries_from_config_file` catches the error, returns `[]`, and with `persist=True` writes nothing. So those tables work until restart and then disappear. It's worth including if John wants the touched function fully hardened. Otherwise it is fine as a follow-up.

</details>

## E. Also target 26.0 (separate branch)

Backport startup tolerance and the reset removal to `release_26.0`, which has the same startup crash. On 26.0 the reset runs after *every* repo install, not only Data Manager installs.

| Pros | Cons |
|---|---|
| Galaxy policy is the oldest supported branch that has the bug, and 26.0 is hit harder by the reset | 26.0 has no `DataTableColumnMismatch` or `assert_data_table_consistency`, so it's a port, not a cherry-pick |
| The startup crash bricks a server, which is serious | John chose 26.1 deliberately (the 26.0 install code differs); the reporter runs 26.1 |

## F. Surface skipped tables to admins

Besides the log line, record skipped tables somewhere admins see them, such as the data tables admin UI or a startup warning summary.

| Pros | Cons |
|---|---|
| A log-only error is easy to miss; the affected DM's tables silently don't load | New UI/API surface; no existing mechanism to reuse cleanly for startup config warnings |
| | Feature-shaped, not a bug fix; better suited to dev |

## G. Tolerate mismatches in the admin config too

Apply `skip_column_mismatches` to `tool_data_table_config_path` as well.

| Pros | Cons |
|---|---|
| Galaxy never fails to boot over data tables | Hides admin-authored mistakes that should fail fast; the review agreed with keeping it strict |

## H. Resolve the `indexed_maf_files` collision (tools-iuc)

Rename the IUC DM table or align its schema with core.

| Pros | Cons |
|---|---|
| Lets the IUC DM install and work alongside core | Not a Galaxy change; John excluded it, and tools-iuc owns it |
| | Galaxy fixes are needed regardless, since any two repos can collide |

## I. Fold legacy `handle_missing_data_table_entry` into `install_tool_data_tables`

Remove the duplicate persist path noted in the initial debrief.

| Pros | Cons |
|---|---|
| One install path for shed data tables, which removes the non-atomic path in D | Larger refactor of 2014-era install code; behavior risk on a release branch; better suited to dev |

## J. Decompose `tool_util/data/__init__.py`

Split the 1674-line module, a thermo follow-up.

| Pros | Cons |
|---|---|
| The module has been over 1k lines for a long time | Large and unrelated to the bug; the branch adds 1 net line; dev-only work |
