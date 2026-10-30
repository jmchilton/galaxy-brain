---
type: research
subtype: component
tags:
  - research/component
  - galaxy/security
  - galaxy/datasets
  - galaxy/collections
  - galaxy/api
component: "Dataset and Collection Access Checks"
galaxy_areas: [security, datasets, collections, api]
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
summary: "Which helper decides read access to datasets, HDAs, LDDAs, HDCAs, collection elements and jobs, how they agree, and which ones batch"
sources:
  - "vault/agents/gx_research/archive/dataset_collection_access_checks.md"
related_notes:
  - "[[Component - Private Object Stores]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Collection API]]"
  - "[[Component - Implicit Dataset Conversion]]"
  - "[[Component - API Tests]]"
---

# Dataset and Collection Access Checks

Galaxy has two independent read-access rules and several helpers per rule. Picking the wrong helper for a related item, or the per-item one for a batch, is the usual mistake.

- **Dataset rule (role-based).** Applies to `Dataset`, and through it to HDAs, LDDAs and collection elements. A dataset is readable if it has no `access` permission rows, or if the caller holds *every* role on its `access` rows. History ownership and sharing play no part.
- **History rule (sharable).** Applies to `History`, and through it to HDCAs. A history is readable if it is importable, owned by the caller, or shared with the caller. Dataset permissions play no part.

Jobs combine both rules (see [Jobs](#jobs-jobmanagerget_accessible_job)).

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. All `file:line` references are at that SHA.

Out of scope: library permission UI and management, and the object-store `private` flag (see [[Component - Private Object Stores]], which also covers how datasets become private).

## The dataset rule: `GalaxyRBACAgent`

All in `lib/galaxy/model/security.py`. `DATASET_ACCESS` is `Action("access", ..., "restrict")` (`lib/galaxy/security/__init__.py:47-51`). The model is `restrict`, so no rows means unrestricted and multiple rows are ANDed.

| Helper | Input | Queries | Notes |
|---|---|---|---|
| `dataset_is_public(dataset)` `:1146` | `Dataset` | 1 (lazy `dataset.actions`) | True when no `access` action is present. |
| `allow_action(roles, action, item)` `:281` | any permissioned item | 1 per item (`get_item_actions`) | For `DATASET_ACCESS`, needs all roles. For other actions, needs any. With no rows, returns `action.model == "restrict"`. |
| `can_access_dataset(roles, dataset)` `:504` | `Dataset` + `Role` objects | about 2 per dataset | `dataset_is_public(...) or allow_action(roles, DATASET_ACCESS, dataset)`. This is the per-item primitive almost everything else calls. |
| `can_access_datasets(roles, action_tuples)` `:512` | `(action, role_id)` tuples, already fetched | 0 | Compares role ids (`cached_id`). Fails if any `access` tuple's role is missing. Empty tuples mean access. It answers once for **all** datasets the tuples came from, never per dataset. |
| `can_access_collection(roles, collection)` `:523` | `DatasetCollection` | 1 | `can_access_datasets(roles, collection.dataset_action_tuples)`. All-or-nothing over every leaf dataset. |
| `dataset_access_mapping(trans, roles, datasets)` `:455` | list of `Dataset` | 2 total | Returns `{dataset.id: bool}` from `datasets_are_public` (`:1191`) OR `allow_action_on_libitems` (`:402`). Has the comment `# DELETEME: SM: DO NOT TOUCH! This actually works.` and no callers at this SHA. |
| `dataset_permission_map_for_access(...)` `:470` | same | 2 total | Same body as `dataset_access_mapping`, also no callers. |

`DatasetCollection.dataset_action_tuples` (`lib/galaxy/model/__init__.py:7925-7930`) is one query over every nested element's `DatasetPermissions` (`_build_nested_collection_attributes_stmt`), cached on the instance. Tool actions also use `collection_info.map_over_action_tuples(...)` to check a mapped-over input in one call.

**Parity.** All the helpers implement the same predicate: public, or holds all `access` roles. They differ in the input they take (ORM `Role` objects vs role ids) and in granularity: `can_access_datasets`/`can_access_collection` give one answer for a set, while `dataset_access_mapping` and `can_access_dataset` answer per dataset. None of them knows about admins. Callers add `trans.user_is_admin` themselves, or go through the managers below.

**Roles.** `trans.get_current_user_roles()` (`lib/galaxy/managers/context.py:269`) uses `user.all_roles()`, a fresh joined-load query. `DatasetManager.has_access_permission` uses `user.all_roles_exploiting_cache()` (`model/__init__.py:1088`), which walks the relationships already loaded. Both include group roles, and both are `[]` for anonymous users, so anonymous users can read only public datasets.

## Managers: `is_accessible` / `get_accessible`

`AccessibleManagerMixin` (`lib/galaxy/managers/secured.py:22-60`) defines the following:

- `is_accessible(item, user, **kwargs)` (`:36`) is abstract. It raises `exceptions.NotImplemented` (HTTP 501) unless a subclass overrides it.
- `get_accessible(id, user, **kwargs)` (`:43`) is `by_id`, then `error_unless_accessible`.
- `error_unless_accessible(item, user, **kwargs)` (`:53`) raises `ItemAccessibilityException` (HTTP 403, `lib/galaxy/exceptions/__init__.py:188`).

| Manager | `is_accessible` rule | Where |
|---|---|---|
| `DatasetManager` | admin → True; else `security_agent.can_access_dataset(user.all_roles_exploiting_cache(), dataset)` | `managers/datasets.py:124-138` |
| `DatasetAssociationManager` (base of HDA and LDDA managers) | defers to `DatasetManager.is_accessible(item.dataset, ...)` | `managers/datasets.py:378-383` |
| `HDAManager` | inherited from `DatasetAssociationManager`. **The HDA's history is not consulted** | `managers/hdas.py:101` |
| `LDDAManager` | inherited from `DatasetAssociationManager` (dataset rule only) | `managers/lddas.py:18` |
| `SharableModelManager` (histories, pages, workflows, visualizations) | importable → True; `is_owner` (admin or `item.user == user`) → True; anonymous → False; in `users_shared_with_dot_users` → True | `managers/sharable.py:92-115` |
| `HistoryManager` | sharable rule, but `is_owner` for an anonymous user is `item == current_history` | `managers/histories.py:271-284` |
| `HDCAManager` | **not implemented**. It mixes in `AccessibleManagerMixin` but doesn't override `is_accessible`, so `hdca_manager.get_accessible` raises 501. Nothing calls it at this SHA | `managers/hdcas.py:63-125` |

`LDDAManager.get(trans, id, check_accessible=True)` (`managers/lddas.py:31`) is a separate legacy path. It goes through `managers/base.py:get_object` → `security_check` (`:89-135`): admin → item; for LDDA/LD/LibraryFolder it calls `security_agent.can_access_library_item` (`model/security.py:605`), which combines `can_access_library` on the parent library with `can_access_dataset`. `security_check` handles admins through `trans.user_is_admin`.

### The admin bypass

- Managers: `UserManager.is_admin(user, trans=None)` (`managers/users.py:476-486`). For a real user it calls `config.is_admin_user(user)`. For `user is None` it returns `trans.user_is_admin`, which covers the master API key. That case works only when the caller passes `trans=trans` in kwargs, and most service code calls `get_accessible(id, trans.user)` without it.
- Agent helpers: no bypass. Every caller writes `trans.user_is_admin or ...` (e.g. `tools/actions/__init__.py:228,237,334`, `services/tools.py:518`, `services/dataset_collections.py:285`).
- `JobManager.get_accessible_job`: checks `trans.user_is_admin` first (`managers/jobs.py:372`).

## HDCAs and collection elements

HDCA reads go through `DatasetCollectionManager.get_dataset_collection_instance(trans, "history", id, check_ownership=False, check_accessible=True)`, which calls `__get_history_collection_instance` (`managers/collections.py:960-975`):

- `check_ownership`: `history_manager.error_unless_owner(hdca.history, trans.user, current_history=trans.history)`.
- `check_accessible` (default): `history_manager.error_unless_accessible(hdca.history, ...)`, i.e. the **history rule** on the containing history. The member datasets' permissions are not consulted.

Library collections (`__get_library_collection_instance`, `:977-995`) use `can_access_library_item`, which for an LDCA checks only the library.

The history-contents service's `__get_accessible_collection` (`services/history_contents.py:1305`) and workflow run requests with `src: hdca` (`workflow/run_request.py:488-489`) both use this path.

Bare `DatasetCollectionElement` reads (`GET /api/dataset_collection_element/{dce_id}`, `services/dataset_collections.py:280-289`) use the **dataset rule** instead: non-admins need `can_access_collection(roles, dce.child_collection or dce.collection)`. For a leaf (`hda`) element that is the *parent* collection, so one restricted sibling makes every leaf in it 403. Covered by `test_dataset_collection_element_security` (`lib/galaxy_test/api/test_dataset_collections.py:818`).

When a tool consumes a collection, the tool action uses the dataset rule over all leaves (`tools/actions/__init__.py:325-340`): `collection.dataset_action_tuples` for a whole-collection input (or `child_collection` for a subcollection input), and `map_over_action_tuples` for mapped-over inputs (`:226-235`). The history rule is not applied there.

## Jobs: `JobManager.get_accessible_job`

`managers/jobs.py:363-391`:

1. 404 if the job doesn't exist.
2. Allowed if the job belongs to the caller: `job.user_id == trans.user.id`, or, for anonymous callers, `job.session_id == trans.galaxy_session.id`. Also allowed if `trans.user_is_admin`.
3. Otherwise `_user_can_access_job` (`:378`):
   - If the job has outputs, it's allowed when **every** output HDA's dataset passes `DatasetManager.is_accessible` and every dataset inside every output HDCA does (`hdca.dataset_instances`).
   - Otherwise, or if any output fails, it falls back to `history_manager.is_accessible(job.history, user)`, which is the history rule with no `current_history`.
4. Denial raises `ItemAccessibilityException` (403).

Job inputs are not part of the decision. Release branches differ: `release_25.1` checks only `job.output_datasets` (a job with collection-only outputs fails with "Job has no output datasets.") and has no history fallback. The collection-output and history-fallback logic came from `cba5013bc38` ("Fix job access check for collection-only outputs", PR #22603, issue #22602). Tests: `test_show_collection_only_job_public`, `test_show_collection_only_job_private_denied` and `test_show_job_accessible_via_public_history` (`lib/galaxy_test/api/test_jobs.py:408-443`).

Callers include `services/jobs.py:139,203`, `api/jobs.py:703`, `workflow/extract.py:813,936`, `markdown_util.py:270,275`, `services/workflows.py:468`, `api/chat.py`, `api/agents.py` and `agents/error_analysis.py`.

## Per-item filtering vs whole-request failure

| Surface | Behavior on an inaccessible item |
|---|---|
| `GET /api/datasets/{id}`, `/api/histories/{h}/contents/{id}`, display, converted, metadata (`services/datasets.py` `get_accessible` at `:406,463,514,...`; `services/history_contents.py:1289`) | **Fail**: 403 for the request. |
| History contents listing and HDA serialization (`HDASerializer.serialize`, `managers/hdas.py:658-665`) | **Degrade per item**: an HDA failing `is_accessible` is serialized with the `inaccessible` view (`:598-602`: `accessible`, `id`, `name`, `history_id`, `hid`, `history_content_type`, `state`, `deleted`, `visible`). It still appears, with `accessible: false`, name and hid. |
| `GET /api/datasets` search without `history_id` (`services/datasets.py:363-390`) | **Filter in SQL**: only items in histories the user owns (`managers/history_contents.py:466-472`). With `history_id`, the history must pass `history_manager.get_accessible`, then items degrade per item as above. |
| `GET /api/dataset_collections/{hdca}/contents/{parent}` (`services/dataset_collections.py:292-345`) | HDCA gated by the history rule (403 for the whole request). Each `hda` element then gets `object.accessible = hda_manager.is_accessible(...)`. **Annotated, not hidden**. |
| `GET /api/dataset_collection_element/{id}` | **Fail**: 403 if any dataset in the relevant collection is restricted. |
| History/collection zip archive (`services/history_contents.py:980-990`) | History gated by `get_accessible`. Inaccessible HDAs are **skipped silently**. |
| Tool execution inputs (`tools/actions/__init__.py:226-240,332-340`) | **Fail** the whole request (`ItemAccessibilityException`) on the first inaccessible input. |
| Collection build from `element_identifiers` (`managers/collections.py:762-779`) | **Fail**: `hda_manager.get_accessible` per `hda`, `ldda_manager.get(check_accessible=True)` per `ldda`, history rule per `hdca`. |
| Copy HDA into history (`services/history_contents.py:1408-1414`) | **Fail**, with both gates: `hda_manager.get_accessible`, *and* `history_manager.error_unless_accessible(original.history, ...)`. This is the one place both rules are applied to an HDA. |
| History sharing with dataset-permission reconciliation (`managers/histories.py:485-510`) | Per-dataset `can_access_dataset(target_user.all_roles(), hda.dataset)` over all `activatable_datasets`. A per-item loop, flagged `TODO: Handle this is a more performant way`. |

## Choosing a helper

- **One HDA or LDDA you were handed by id**: `hda_manager.get_accessible(id, trans.user)` / `ldda_manager.get_accessible(...)` (403 on failure, admin-aware).
- **A related dataset reached through a model relationship** (an implicit conversion, a job input, a metadata file): the access decision belongs to *that* dataset's `Dataset`, not the parent's. Use `hda_manager.is_accessible(related_hda, user)` to skip or annotate, or `error_unless_accessible` to fail. A converted HDA has its own `Dataset`. Its access roles were derived at converter-job creation from the inputs' `access` roles (union) plus the history's default access (`tools/actions/__init__.py:573-583`, `guess_derived_permissions` at `model/security.py:684`). They are a snapshot and don't track later permission changes on the parent. Converters run through `converter.execute` (`datatypes/data.py:922`), i.e. the tool action path.
- **Many datasets at once without per-item queries**: on dev at this SHA there is no batched role-id helper with callers. Options:
  - `dataset_access_mapping(trans, roles, datasets)`: 2 queries, takes `Dataset` objects and `Role` objects. Unused, but works and is marked "DO NOT TOUCH".
  - Collection-scoped: `can_access_collection` / `dataset_action_tuples`, which give one all-or-nothing answer.
  - Add the admin bypass yourself in either case.
- **HDCA**: `dataset_collection_manager.get_dataset_collection_instance(trans, "history", id)`. Don't call `hdca_manager.get_accessible` (501).
- **Collection element**: decide whether the history rule (via its HDCA) or the dataset rule (`can_access_collection` / per-HDA `is_accessible`) is the contract you need. Galaxy uses each in different endpoints.
- **Job**: `job_manager.get_accessible_job(trans, job_id)`. It doesn't cover the job's inputs, so items referenced from job parameters need their own per-item check.

## Proposed: batch helpers on the `compare_runs` branch (not on dev)

The research request says `accessible_dataset_ids` is "on dev". It is **not** in `origin/dev` @ `65e6daff`. It exists only on John's unmerged `compare_runs` branch (commit `1e8f1517438` "Add batched dataset and sharable item access checks"; no PR, see `vault/repositories/galaxy/branches/active/compare_runs/`). The proposal:

- `GalaxyRBACAgent.accessible_dataset_ids(role_ids, dataset_ids) -> set[int]`: one query over `DatasetPermissions` rows with the `access` action, returning `dataset_ids` minus those with any access role outside `role_ids` (public datasets included). It works on ids rather than ORM objects and is keyed by `dataset_id`, so HDA copies sharing a restricted `Dataset` resolve together.
- `SharableModelManager.accessible_ids(user_id, ids) -> set[int]`: one query for `user_id == user_id OR importable OR users_shared_with.any(user_id)`. It ignores admin status.
- It registers the security agent in the app container so managers can depend on it, and adds parity tests against `can_access_dataset`, `can_access_datasets`, `dataset_access_mapping`, `datasets_are_public` and `is_accessible` (`test/unit/data/test_galaxy_mapping.py`, `test/unit/app/managers/test_HistoryManager.py`).

Neither helper applies the admin bypass. The branch's design and its parity test are in `compare_runs/subagents/phase_2_implementation.md` and `phase_2_review_fixes.md`. On release branches (`release_25.1`, `release_26.0`), `can_access_dataset`, `can_access_datasets`, `can_access_collection` and `dataset_access_mapping` all exist and the proposal does not.

## Tests

| Area | Tests |
|---|---|
| Manager rules | `test/unit/app/managers/test_HDAManager.py` (`test_accessible` `:205`, `test_anon_accessibility` `:285`, `test_serializing_inaccessible` `:503`); `test/unit/app/managers/test_HistoryManager.py:159` (`test_accessible`) |
| Agent and permissions | `test/unit/data/test_galaxy_mapping.py` (private/sharing role tests from `:582`); `test/unit/data/model/db/test_security.py` |
| API | `lib/galaxy_test/api/test_datasets.py` (`test_search_returns_only_accessible` `:295`, `test_show_permission_denied`); `test_dataset_collections.py` (`test_dataset_collection_element_security` `:818`, `test_collection_contents_security`, `test_published_collection_contents_accessible` `:1075`); `test_jobs.py:408-443`; `test_history_contents.py:966` (`test_hdca_from_inaccessible_library_datasets`). Multi-user via `_different_user()`; see [[Component - API Tests]] |

No unit test covers `dataset_access_mapping`, `can_access_datasets` or `can_access_collection` directly at this SHA.

## Related

- [[Component - Private Object Stores]]: the storage-level private flag and how private roles get set.
- [[Component - Collection Models]]: HDCA → `DatasetCollection` → DCE structure that the history and dataset rules split across.
- [[Component - Collection API]]: the endpoints whose gating is summarized above.
- [[Component - Implicit Dataset Conversion]]: converted HDAs are separate HDAs with their own `Dataset` and permissions.
- [[Component - API Tests]]: `_different_user` and multi-user API test patterns.
- Branch records: `vault/repositories/galaxy/branches/active/compare_runs/`, `job_parameters_input_access_25.1/`, `converted_dataset_lookup_via_manager_26.0/`.
