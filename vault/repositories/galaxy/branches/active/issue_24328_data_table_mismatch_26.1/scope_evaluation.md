# Scope evaluation (round 2, after re-scope)

**Recommendation: keep.** The branch now covers both Galaxy-side causes in the issue's root-cause comment: startup skips a conflicting shed table instead of crashing, and `handle_missing_data_table_entry` no longer wipes the live registry. Round 1's modest expansion is in: column conflicts raise `DataTableColumnMismatch` on every path, and the dead check is gone. Round 1's item (1), moving `reset_tool_data_tables` to the Tool Shed, was declined for a good reason. It is a public method on a release branch, a shim would leave nothing gained, and Galaxy no longer calls it. Every candidate left is pre-existing and not reachable on the main install path (atomic strict load, atomic `reload_from_files`), a separate branch (26.0 backport), feature-shaped (surfacing skipped tables to admins), or out of Galaxy's hands (the tools-iuc rename). None meets the bar for re-scoping a second time, and a change now would park the branch as BLOCKED for little gain.

## Possible Decompositions

The branch has 5 commits, 6 files and +126/-21 lines (about 30 lib lines, the rest tests), so it is just over the threshold. The commits already split cleanly:

1. **Refactors** (`8fbd5381555` declares `columns` and drops the dead guard; `1c2d354892f` adds the `_show_tool_data` test helper). No behavior change. These land first.
2. **Startup tolerance** (`cd895276abe`). This un-bricks servers that already hold the bad `<table>`.
3. **No registry wipe** (`b2ea2184472`). This removes the root cause and doesn't depend on 2.
4. **Typed merge error** (`27060b3478e`). Defensive; it depends only on code already in `release_26.1`.

Options: one PR (as now); 1+2+4 and 3 as two PRs; or 1, then 2, 3 and 4 in any order.

## A. As implemented (recommended)

Startup logs and skips shed-config tables whose columns conflict with a registered table, while the admin config still fails fast. `handle_missing_data_table_entry` no longer empties the live registry. `merge_tool_data_table` raises `DataTableColumnMismatch` instead of a bare `assert`, and the dead `columns is not None` guard is gone.

| Pros | Cons |
|---|---|
| Fixes Galaxy fixes 1 and 2 from the issue, and already-broken servers boot without hand-editing XML | `reset_tool_data_tables` is still on the shared base class; only a comment guards it |
| One exception type for column conflicts on every path, and the check survives `python -O` | Strict-mode `load_from_config_file` and `reload_from_files` still aren't atomic (pre-existing) |
| Small, and every review is clean: normal, rescope, codex round 2 (no findings), thermo round 2 (no blockers), test challenges | Skipped tables are reported only in the log |
| Commits decompose cleanly | |

## B. Relocate `reset_tool_data_tables` to the Tool Shed (round 1 item 1, declined)

Move the wipe off `BaseShedToolDataTableManager` into `lib/tool_shed/tools/tool_validator.py:234`, its only caller.

| Pros | Cons |
|---|---|
| No Galaxy-side API can empty the live registry | It's a public method on 26.1, and the base class is imported outside this file (`lib/tool_shed/util/commit_util.py`, `lib/galaxy/tool_shed/tools/tool_validator.py`) |
| | A safe version keeps a shim, so 26.1 gains nothing; the comment already documents the hazard |
| | Already considered and declined, and the rescope review agreed. It fits better as a dev follow-up |

## C. Atomic strict `load_from_config_file`

Validate every table in a file before registering any.

| Pros | Cons |
|---|---|
| Hardens the function the branch edits | Not reachable on the main install path: `install_manager.py:177` runs `install_tool_data_tables`, which checks every table before `add_new_entries_from_config_file` (l.181). That leaves only the legacy `handle_missing_data_table_entry` path |
| | The branch doesn't change its exposure. Before the branch, the first install already ran against a full registry |
| | Not user-reported; churn on a release branch |

## D. Atomic `reload_from_files` (thermo round 2 follow-up)

Make the reload replay all-or-nothing, so a column edit on disk between loads can't leave a table half reloaded.

| Pros | Cons |
|---|---|
| Closes a partial-state window that the typed error now makes more visible | Pre-existing; it needs a column edit on disk while Galaxy is running. Not related to the issue |
| | The type change is safe because no caller catches `AssertionError` (thermo) |

## E. Also target 26.0 (separate branch)

Port startup tolerance and the reset removal to `release_26.0`.

| Pros | Cons |
|---|---|
| 26.0 has the same startup crash, and its reset runs after every repo install | It's a port, not a cherry-pick: no `DataTableColumnMismatch` or `assert_data_table_consistency` on 26.0 |
| | John picked 26.1 on purpose, and the reporter runs 26.1.2.dev0. If wanted, it's a sibling branch, not a scope change here |

## F. Surface skipped tables to admins

Show skipped tables in an admin-visible place beyond the log.

| Pros | Cons |
|---|---|
| A log line is easy to miss, so the affected DM's tables silently don't load | Feature-shaped, with no existing startup-warning mechanism to reuse; better suited to dev |
| | Healthy 26.1 refuses the conflicting install, so only servers broken before the fix hit the skip, and the log names the remediation |

## G. Contract (drop the typed-merge commit or startup tolerance)

| Pros | Cons |
|---|---|
| Smaller diff | Dropping startup tolerance leaves pre-broken servers bricked. Dropping the typed merge undoes a cheap, reviewed improvement |

## H. Out of Galaxy's hands / unrelated

The tools-iuc `indexed_maf_files` rename (John excluded it), folding the legacy `handle_missing_data_table_entry` into `install_tool_data_tables`, and decomposing `tool_util/data/__init__.py` (1673 lines, +18 on the branch). All unchanged from round 1: out of scope, or dev-only refactors.
