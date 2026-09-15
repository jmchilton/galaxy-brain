---
type: plan
title: "Tool Shed Legacy Cleanup"
tags:
  - plan
  - galaxy/lib
status: draft
created: 2026-09-10
revised: 2026-09-10
revision: 2
ai_generated: true
unresolved_questions: 7
summary: "State of the stalled Tool Shed legacy cleanup: all seven old branches are dead, plus a dead-code audit and sequenced next steps."
---

# Tool Shed Legacy Cleanup — State of the World & Next Steps

_Reconstructed 2026-09-10. Work stalled 2026-03-18 after PR #22078._

## TL;DR

**All 7 local `toolshed_2_cleanup_*` branches are dead. Every one is either already merged
or strictly superseded by dev. Delete them all — nothing to rebase, nothing to salvage.**

The four-round cleanup project actually *finished* its original scope. Phases 1-4, 6, 7a-7d
all landed. What remains is new scope, not unfinished scope.

The one structural prize left: **the entire WSGI/Paste stack survives only to serve
`hg clone`.** Kill that and `buildapp.py`, `CommunityWebApplication`,
`ToolShedGalaxyWebTransaction`, and the a2wsgi mount all go with it.

---

## Branch disposition

| Branch | Tip | Verdict |
| --- | --- | --- |
| `toolshed_2_cleanup_v2_routes` | `f7061aa7b3b` | MERGED (all 8 commits patch-equivalent in dev, via PR #22037) |
| `toolshed_2_cleanup_v2_mako_delete` | `e0faabbf908` | MERGED (ancestor of dev; 0 commits ahead) |
| `toolshed_2_cleanup_v2_remove_grids` | `cfee84687e6` | MERGED (PR #22037) |
| `toolshed_2_cleanup_legacy_endpoints` | `143752f5216` | MERGED (patch-equivalent, via PR #22078) |
| `toolshed_2_cleanup_migrate_galaxy_install` | `70f1d66226d` | MERGED (patch-equivalent, via PR #22078) |
| `toolshed_2_cleanup_migrate_install_apis` | `357320fef65` | MERGED (PR #22078; 0 commits ahead) |
| `toolshed_2_cleanup_v2_2` | `26124532765` | **SUPERSEDED** — 5 commits are patch-*new* but content-*behind* dev |
| `jmchilton/toolshed_2_cleanup` (remote) | `eca59e70c11` | ABANDONED mega-branch; PR #21922 called it "pretty red", split into rounds |

### Why `v2_2` is superseded, not unfinished

It's the only branch `git cherry` flags as new (`+`), which makes it look alive. It isn't:

- Its API additions (`legacy_install__*` router in `api2/repository.py`) — dev's
  `api2/repository.py` already has a **superset**: `get_ctx_rev`,
  `get_changeset_revision_and_ctx_rev`, `next_installable_changeset_revision`,
  `previous_changeset_revisions`, `updated_changeset_revisions`,
  `get_required_repo_info_dict` (GET+POST), `get_repository_dependencies`, **plus**
  `get_repository_type`, `get_tool_dependencies`, `status_for_installed_repository`,
  `display_image_in_repository` which v2_2 never had.
- Its deletions (`utility_containers/`, `framework/decorators.py`,
  `framework/middleware/remoteuser.py`) — already gone from dev.
- `shed_util_common.py`: dev is 241 lines, v2_2 is 281. Dev deleted *more*.

It's an earlier draft of the same work that got redone more thoroughly on the
`migrate_install_apis` line. Nothing in it is worth a cherry-pick.

## What shipped (the project succeeded)

| PR | Title | Merged |
| --- | --- | --- |
| #21922 | Make Shed 2 the Default - Drop Legacy Shed Tests in CI | 2026-02-25 |
| #21953 | Eliminate Twill from Tool Shed tests | 2026-03-02 |
| #22037 | Clean up more Tool Shed code (round 2) — 617 add / 13,075 del | 2026-03-10 |
| #22078 | Clean up more Tool Shed code (round 3) | 2026-03-18 |

Verified in dev today: zero `is_v2` conditionals; no `lib/tool_shed/webapp/framework/`;
no v1 `lib/tool_shed/webapp/api/`; one `.mako` left and it's alembic's `script.py.mako`;
`ShedTwillTestCase` renamed to `ShedTestCase`; `webapp/controllers/` contains only `hg.py`.

**The live roadmap doc survived in-tree:** `lib/tool_shed/test/functional/api_notes.md`.
It was updated during round 2 and still tracks endpoint usage + deletion candidates.
That is the document to keep editing — don't start a new one.

---

## Next steps

### STEP_0_DELETE_DEAD_BRANCHES — trivial, do first

```
git branch -D toolshed_2_cleanup_v2_routes toolshed_2_cleanup_v2_mako_delete \
  toolshed_2_cleanup_v2_remove_grids toolshed_2_cleanup_v2_2 \
  toolshed_2_cleanup_legacy_endpoints toolshed_2_cleanup_migrate_galaxy_install \
  toolshed_2_cleanup_migrate_install_apis
```
Remote copies on `jmchilton/` can be pruned too. No PRs are open against any of them
(only open shed PR is #19937 `shed_redirect`, unrelated).

### STEP_1_KILL_WSGI_FOR_HG — the biggest structural prize

`fast_app.py:169-172` mounts the whole WSGI app at `/` through `a2wsgi.WSGIMiddleware`.
That WSGI app (`buildapp.py`) now registers exactly one controller — `HgController` —
serving `/repos/*path_info` so `hg clone` works.

Serve mercurial from FastAPI (or a dedicated ASGI/WSGI mount scoped to `/repos` only) and
delete: `buildapp.py`, `CommunityWebApplication`, `ToolShedGalaxyWebTransaction`,
`wrap_in_middleware`, the a2wsgi dependency, `config_manage.py:226` reference, and the
`app_pair` plumbing in `fast_factory.py` / `test/base/driver.py`.

Highest value-per-line remaining. Scoping the mount to `/repos` first is a safe
intermediate commit that stops the WSGI app from shadowing FastAPI 404s.

Test: `/galaxy-toolshed-tests`, plus a real `hg clone` against a test shed.

### STEP_2_DELETE_DEAD_CODE — cheap, verified wins

Five whole files have zero importers repo-wide (see the dead-code audit below for the full
picture): `util/search_util.py` (227), `managers/groups.py` (137), `webapp/util/ratings_util.py`
(31), `util/web_util.py` (20), `util/tool_dependency_util.py` (1). Drop the matching
`.. automodule::` entries in `doc/source/lib/*.rst` in the same commit.

**`managers/groups.py` is a deliberate keep.** Unreferenced, but the `Group`,
`UserGroupAssociation` and `GroupRoleAssociation` models are still in `webapp/model/__init__.py`,
so the manager stays as their service layer. Deleting the manager while keeping the model is the
inconsistent half — either both go (needs a shed migration) or neither does. That leaves ~279
lines of whole-file deletion, independent of every other step.

`api_notes.md` also names `reset_metadata_on_repositories`, `remove_repository_registry_entry`,
`get_installable_revisions` and the Repository Revisions API as used by neither Galaxy, Planemo,
nor Ephemeris. Actual dev state:

- `remove_repository_registry_entry`, `get_installable_revisions` — already gone from code;
  only `api_notes.md` still mentions them. **The notes are stale.**
- `reset_metadata_on_repositories` — still live in `api2/repositories.py`,
  `managers/repositories.py`, and frontend `schema.ts`. `api_notes.md` records Bjoern saying
  it's still driven from the UI. Re-confirm before touching.

First commit here is free and rebuilds context: correct `api_notes.md` to match reality.

### STEP_3_GALAXY_SIDE_ADMIN_CONTROLLER — the Galaxy-side mirror of round 3

`lib/galaxy/webapps/galaxy/controllers/admin_toolshed.py` (158 lines) is still a legacy WSGI
controller on the *Galaxy* side, with a `legacy_tool_shed_endpoint` decorator and four exposed
actions: `activate_repository`, `restore_repository`, `display_image_in_repository`,
`manage_repository_json`.

Round 3 did exactly this migration on the shed side. This is the same job, other half, and it
is well-scoped — small, bounded, and directly parallel to work already done. Good candidate for
the re-entry PR if STEP_1 feels too big to restart on.

### STEP_4_GALAXY_SIDE_INSTALL_CODE — largest remaining mass, highest risk

`lib/galaxy/tool_shed/` is ~8.5k lines and untouched by rounds 1-3. Biggest files:
`metadata/metadata_generator.py` (1046), `galaxy_install/installed_repository_manager.py` (902),
`util/utility_container_manager.py` (871), `galaxy_install/install_manager.py` (870),
`util/repository_util.py` (712), `galaxy_install/tools/tool_panel_manager.py` (649).

**Do not assume `utility_container_manager.py` is dead** despite its shed-side twin being
deleted in round 3 — it is reached via `util/dependency_display.py`, which is live from
`admin_toolshed.py`, `tool_shed/managers/repositories.py:792`, and `test/base/testcase.py`.
Killing it means killing `DependencyDisplayer` first, which means STEP_3 lands first.

This is real install behaviour, not dead UI. Needs its own investigation pass before any plan.
Do not batch with steps 1-2.

### STEP_5_COSMETIC — fold into whatever PR is open

- `lib/tool_shed/test/base/testcase.py:621` — `ShedTestCase` docstring still says
  "geared toward HTML interactions using the Twill library". Twill is gone.
- Stale twill comments: `test/base/driver.py:39`, `galaxy_test/driver/driver_util.py:88,307`,
  `galaxy/tool_util/verify/interactor.py:366`.

---

## Progress

**2026-09-10 — STEP_0 not yet done; STEP_2 (+ most of the dead-code audit) IMPLEMENTED.**

Branch `toolshed_2_cleanup_dead_code`, worktree
`~/projects/worktrees/galaxy/branch/toolshed_dead_code`, off `origin/dev` @ `466e9336e62`.
**1,742 deletions / 9 insertions across 23 files.** Pushed to `jmchilton`, no PR opened.

| Commit | Contents |
| --- | --- |
| `01d6c020527` | 4 modules with no importers + their Sphinx `automodule` entries (319) |
| `3c3a2734a6b` | `dependency_display` + `utility_container_manager` display chain (498) |
| `9b3dcf833d8` | install-side dependency code under `get_dependencies_for_repository` (586) |
| `4e711c5f634` | remaining helpers: tool panel, data table, metadata, trs, commit_util (193) |
| `da336d2e5b6` | container item classes + `uncompress`/`handle_gzip`/`handle_bz2` (146) |

Verified: 113/114 tool_shed modules import (the miss is alembic `env.py`, which needs alembic's
runtime context — same on dev); mypy clean on every touched file (11 pre-existing errors, all in
files not touched); `test/unit/tool_shed/` 70 passed / 12 skipped;
`test_galaxy_install.py` + `test_toolbox.py` 41 passed / 2 xpassed; shed functional
`test_shed_repositories.py` 39 passed and `test_galaxy_install.py` 2 passed; pre-commit (black,
ruff, flake8) green on each commit.

Coverage caveat: the shed-to-Galaxy install functional suite is only **2 tests**, and it is the
suite covering the 586 lines deleted from `installed_repository_manager.py`. Those deletions rest
on zero-caller analysis, not on test coverage. The legacy numbered browser tests (`test_1*.py`)
exercise install far harder if more confidence is wanted before merge.

The audit's lower-bound caveat proved real twice — both caught by a stricter per-importer sweep
after the first deletion round:
- `DataManager`, `InvalidTool`, `Tool`, `ToolDependency` in `utility_container_manager` were
  orphaned by removing the folder builders that constructed them.
- `commit_util.uncompress` (plus `handle_gzip`/`handle_bz2`) read as live only because the word
  "uncompress" appears in a `sniff.py` comment.

That same sweep also produced three false positives worth remembering — `parse_package_elem`,
`remove_tool_dependency` and `get_repository_metadata_by_repository_id_changeset_revision` are
all called through qualified module names from packages the importer heuristic missed. **Verify
every orphan candidate by hand before deleting.**

Still open from the audit: nothing. Post-deletion sweep reports 0 orphans.


---

## Dead-code audit beneath the API/webapp layer

_Added 2026-09-10. Reproduce with `toolshed_deadcode_audit.py <tree>` (AST reachability from
entry points; conservative — tests count as live callers)._

**~1,500 dead lines in dev today, rising to ~2,045 once `admin_toolshed.py` goes.**
Rounds 1-3 removed the UI/route layer but left the code it used to call.

### Whole files, zero importers repo-wide

| File | Lines | Note |
| --- | --- | --- |
| `lib/tool_shed/util/search_util.py` | 227 | Nobody imports it. `search_repository_metadata` chain, all dead. |
| `lib/tool_shed/managers/groups.py` | 137 | `GroupManager`, zero refs — but **kept**, see STEP_2: the models it serves are still in `webapp/model`. |
| `lib/tool_shed/webapp/util/ratings_util.py` | 31 | `ItemRatings(UsesItemRatings)` — shed ratings UI is gone. |
| `lib/tool_shed/util/web_util.py` | 20 | The `escape()` "hack" whose own docstring asked to be removed. Makos gone, so it is. |
| `lib/tool_shed/util/tool_dependency_util.py` | 1 | Bare `from galaxy.tool_shed.util.tool_dependency_util import *` shim. |

Each has a matching `.. automodule::` in `doc/source/lib/*.rst` that must be dropped in the
same commit or Sphinx breaks.

### Dead regions inside live modules (transitive, deduped)

| File | Dead / total | Head of the dead chain |
| --- | --- | --- |
| `galaxy_install/installed_repository_manager.py` | 463/902 (51%) | `get_dependencies_for_repository` — zero callers; drags 5 more methods with it |
| `util/utility_container_manager.py` | 364/871 (41%) | `build_tool_dependencies_folder`, `build_tools_folder`, `build_readme_files_folder`, both `*_data_managers_folder` |
| `util/dependency_display.py` | 105/310 (33%) | `generate_message_for_invalid_repository_dependencies`, `generate_message_for_invalid_tool_dependencies`, `_add_installation_directories_to_tool_dependencies` |
| `galaxy/tool_shed/util/tool_dependency_util.py` | 60/239 (25%) | four `get_tool_dependency*` lookups |
| `tool_shed/util/metadata_util.py` | 45/370 (12%) | `get_repository_dependency_tups_from_repository_metadata`, `is_malicious`, `get_repository_metadata_by_id` |
| `galaxy_install/tools/tool_panel_manager.py` | 45/649 | `generate_tool_panel_dict_for_tool_config`, `generate_tool_section_dicts` |
| `tools/data_table_manager.py` | 31/324 | `generate_repository_info_elem[_from_repository]` |
| `repository_dependencies/repository_dependency_manager.py` | 27/582 | `get_repository_dependencies_for_installed_tool_shed_repository` |
| `tool_shed/util/commit_util.py` | 17/277 | `get_change_lines_in_file_for_tag` |
| `tool_shed/managers/trs.py` | 10/150 | `get_tools_for`, `trs_tool_id_to_repository`, `trs_tool_id_to_guid` |
| `metadata/repository_metadata_manager.py` | 11/1242 | `build_repository_ids_select_field` (grid leftover) |
| `installed_repository_metadata_manager.py` | 10/254 | same, Galaxy side |

### Answering the `dependency_display.py` question directly

No — not needed in its entirety, and it is the hinge for a much larger cascade.

Reachable surface today is only two entry points:
- `DependencyDisplayer.generate_message_for_orphan_tool_dependencies` (+ `_tool_dependency_is_orphan`),
  called from `tool_shed/managers/repositories.py:809` on repo upload. **Genuinely live.**
- `build_manage_repository_dict` → `populate_containers_dict_from_repository_metadata` →
  `GalaxyUtilityContainerManager.build_repository_containers`, called **only** from
  `admin_toolshed.py:158` and one helper in `tool_shed/test/base/testcase.py:498`.

105 lines are dead right now. Delete `admin_toolshed.py` and the second entry point goes too:
`dependency_display.py` drops to 193/310 dead (62%), and `utility_container_manager.py` — whose
sole remaining consumer is `GalaxyUtilityContainerManager` — goes 364 → **673/871 dead (77%)**.

**`admin_toolshed.py` is the keystone.** 158 lines of legacy controller holding ~540 further
lines of util-layer code alive. That reframes STEP_3: it is not just a controller migration,
it is the unlock for the largest single cleanup available.

### Caveats

Matching is name-based, so the numbers are a **lower bound** — a dead symbol whose name collides
with a common identifier elsewhere (e.g. `get_metadata`) reads as live. Checked for dynamic
dispatch (`getattr`/`eval`/`importlib`) across the layer: none that resolves methods by name.
Test code counts as a live caller throughout, so nothing here is "dead except for tests".

---

## Recommended sequencing

Revised by the dead-code audit: **STEP_3 is worth more than it looked** — it unlocks ~540 lines
of util-layer deletion on top of its own 158.

STEP_0 now (2 min) → STEP_2 as the re-entry commit (`api_notes.md` correction; cheap, rebuilds
context) → STEP_3 as "round 4" PR, or STEP_1 if you want
the bigger prize → STEP_4 scoped separately after its own investigation pass.

STEP_3 before STEP_4: `DependencyDisplayer` can't be retired while `admin_toolshed.py` calls it.

## Unresolved questions

1. Resurrect at all, or declare done? Rounds 1-3 hit the original scope; steps 1-5 are new scope.
2. `reset_metadata_on_repositories` — still UI-driven per Bjoern's old note? Delete or keep?
3. STEP_1: serve hg via FastAPI natively, or keep a2wsgi but scope the mount to `/repos`?
4. Shed `Group`/`UserGroupAssociation`/`GroupRoleAssociation`: retire the whole feature (models
   + manager, needs a migration) or rebuild a Groups API on the manager that was kept?
5. Does STEP_4 belong to this project or to the TS2.0 Celery/repodata initiative (#22213)?
7. Dead-code deletions: one "remove dead shed code" PR, or fold each into the step that
   unlocks it? (whole-file deletes are independent of STEP_1/STEP_3 and could land now)
6. Prune the `jmchilton/toolshed_2_cleanup*` remote branches too, or leave as archive?
