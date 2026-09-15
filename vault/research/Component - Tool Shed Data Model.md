---
type: research
subtype: component
tags: [research/component, galaxy/models, galaxy/lib, galaxy/security, galaxy/api]
component: "Tool Shed Data Model"
galaxy_areas:
  - models
  - api
  - lib
  - security
status: draft
created: 2026-09-09
revised: 2026-09-10
revision: 2
ai_generated: true
summary: "Shed-side SQLAlchemy schema — 14 tables, hg-keyed RepositoryMetadata over a denormalized JSON blob, dead flags, two-revision alembic history"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-Tool-Shed-Data-Model.md"]
related_prs: [23189, 22663, 21786, 22037, 18524]
related_notes:
  - "[[Component - Tool Shed Search and Indexing]]"
  - "[[PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0]]"
  - "[[Component - Tool Install YAML]]"
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
  - "[[Component - User Password Management]]"
---

# Tool Shed Data Model

## Scope

The Tool Shed server's **own** SQLAlchemy schema: `lib/tool_shed/webapp/model/` and the layers sitting directly on it (RBAC, migrations, model→wire serialization).

Deliberately **out of scope**, because each has or deserves its own note:
- The Galaxy-side installed-repository schema (`lib/galaxy/model/tool_shed_install/`) — different database, different tables, different meaning. One-paragraph pointer at the end.
- Whoosh search, indexing, and the TRS surface — [[Component - Tool Shed Search and Indexing]] owns those. That note sketches `Repository`/`RepositoryMetadata` as background; this one goes to the column level. Read them together.

The prompt behind this note ("the tool shed data model") was ambiguous between the two schemas; the shed-side reading was chosen explicitly.

**Verified against** `galaxyproject/galaxy` `origin/dev` @ **`4252bfd6669`**. Every path and line number below was read at that SHA.

## Orientation

The ORM is essentially one file:

| File | Lines | Role |
|---|---|---|
| `lib/tool_shed/webapp/model/__init__.py` | 864 | all model classes + the `repository_metadata` `Table` |
| `lib/tool_shed/webapp/model/mapping.py` | 54 | engine build, `ToolShedModelMapping`, security agent + stats wiring |
| `lib/tool_shed/webapp/model/db/__init__.py` | 36 | exactly three query helpers |
| `lib/tool_shed/webapp/model/migrations/__init__.py` | 191 | `verify_database`, `AlembicManager`, `DatabaseStateVerifier` |
| `.../migrations/alembic/versions/` | 2 files | the entire migration history |

This is **not** a subset of `lib/galaxy/model/__init__.py`. It is an independent `registry()` (`__init__.py:80`) with its own `Base` (`:83-93`) and `MetaData`. It reuses Galaxy column types and utilities but redefines every table — including ones whose names collide with Galaxy's (`galaxy_user`, `role`, `tag`, …).

Two oddities set the tone:

1. **`Repository.hg_repo` is a live Mercurial handle hanging off an ORM object.** `from mercurial import hg, ui` at `__init__.py:16-19`; a module-level `WeakKeyDictionary` cache (`:66`); the property at `:467-471`. `Repository.is_new()`, `.tip()`, `.revision()` all hit hg (`:552-554`, `:602-604`, `:575-578`). You cannot meaningfully instantiate or serialize a `Repository` without a working hg checkout on disk.
2. **`RepositoryMetadata` is mapped imperatively, not declaratively.** A declaratively-mapped class cannot own a `.metadata` attribute — SQLAlchemy's `DeclarativeBase` claims it. Hence the standalone `Table(...)` at `:731-750` and `mapper_registry.map_imperatively(...)` at `:840-846`, with the explanation in a comment at `:706-707`. It is the one class that never made the 2022 transition to declarative mapping.

## Entity catalog

Fourteen tables. `TrimmedString` and `MutableJSONType` come from `galaxy.model.custom_types`.

### `repository` — `Repository` (`__init__.py:367-610`)

The central table.

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `create_time` / `update_time` | DateTime | standard defaults |
| `name` | `TrimmedString(255)` | indexed; **no unique constraint** — per-owner uniqueness is Python-only |
| `type` | `TrimmedString(255)` | indexed; free text holding one of three registry labels |
| `remote_repository_url`, `homepage_url` | `TrimmedString(255)` | |
| `description` | TEXT | the **synopsis** on the wire — see the triple-swap below |
| `long_description` | TEXT | |
| `user_id` | FK → `galaxy_user.id` | indexed — the owner |
| `private` | Boolean | default False; **never written `True`** anywhere in `lib/tool_shed/` |
| `deleted` | Boolean | indexed, default False; **never written `True`** either |
| `email_alerts` | `MutableJSONType` | annotated `Mapped[bytes \| None]` (`:382`) — the annotation is wrong for a JSON column |
| `times_downloaded` | Integer | incremented on hg `getbundle` |
| `deprecated` | Boolean | default False; the live "retire this repo" flag |

Two views onto `repository_metadata`, both ordered `desc(update_time)`:
- `metadata_revisions` — all rows (`:400-404`).
- `downloadable_revisions` — `viewonly`, adds `downloadable == true()` (`:392-399`).

Hybrid `last_updated_time` (`:448-465`) has an asymmetry worth noticing: it *orders by* `update_time` but *selects* `create_time`.

Push ACLs are **not in the database**: `allow_push`/`set_allow_push` (`:484-490`, `:580-600`) read and write the `allow_push =` line of `.hg/hgrc`. `admin_role` (`:473-482`) resolves a role by the string name `f"{name}_{username}_admin"` and *raises* if absent — so renaming a repository or user silently orphans it.

### `repository_metadata` — `RepositoryMetadata` (`__init__.py:710-846`)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `create_time` / `update_time` | DateTime | |
| `repository_id` | FK → `repository.id` | indexed |
| `changeset_revision` | `TrimmedString(255)` | indexed — the hg changeset **hash** |
| `numeric_revision` | Integer | indexed — the hg **local rev number** |
| `metadata` | `MutableJSONType` | the denormalized blob (below) |
| `tool_versions` | `MutableJSONType` | `{tool_guid: parent_guid_or_id}` |
| `malicious` | Boolean | default False |
| `downloadable` | Boolean | **`True` at the Table (`:743`), `False` in `__init__` (`:795`)** |
| `missing_test_components` | Boolean | indexed; hard-wired `False` |
| `has_repository_dependencies` | Boolean | indexed |
| `includes_datatypes` | Boolean | indexed; hard-wired `False` |
| `includes_tools` | Boolean | indexed |
| `includes_tool_dependencies` | Boolean | indexed |
| `includes_workflows` | Boolean | indexed; hard-wired `False` |

**No unique constraint on `(repository_id, changeset_revision)`.** The code compensates at read time in a way worth flagging loudly: `repository_metadata_by_changeset_revision` (`lib/tool_shed/util/metadata_util.py:275-293`) fetches all matching rows and, if more than one, **deletes every row after the first** and returns the first — a destructive read path standing in for a missing DB constraint. The comment says duplicates "were somehow created in the past."

Two derived properties with no backing column: `includes_tools_for_display_in_tool_panel` (`:821-828`, dug out of `metadata["tools"][i]["add_to_tool_panel"]`) and `repository_dependencies` (`:830-834`). Both are exported in the dict views.

`__init__` (`:786-819`) still accepts `tools_functionally_correct` and `test_install_error` and **silently discards both** — vestiges of the deleted Tool Shed test framework.

### `galaxy_user` — `User` (`__init__.py:107-200`)

`id`, timestamps, `email` (`TrimmedString(255)`, non-null, **not unique**), `username` (indexed, **not unique at the DB level**), `password` (`TrimmedString(40)`), `external`, `new_repo_alert`, `deleted`, `purged`.

**Password hashing is unsalted SHA1, unconditionally.** `set_password_cleartext` calls `new_insecure_hash` (`:187-191`); `check_password` compares against it (`:171-173`). `galaxy.util.hash_util.new_insecure_hash` is `sha1(...).hexdigest()` and its own docstring says it should not be considered secure. Galaxy's `User.set_password_cleartext` branches on `use_pbkdf2` and prefers `galaxy.security.passwords.hash_password`; the shed has **no such branch**, and `TrimmedString(40)` physically cannot hold a PBKDF2 digest. Fixing this needs a migration *and* a rehash-on-login path that does not exist. This is the most significant divergence in the schema.

Absences vs. Galaxy's `User`: no `active`, `activation_token`, `last_password_change`, `preferences`, `disk_usage`. `get_disk_usage()` returns literal `0` (`:175-185`). The missing `active` column is documented in the shed's own commented-out activation logic at `lib/tool_shed/managers/users.py:32-36`.

`non_private_roles` is a viewonly relationship excluding the role whose `name == User.email` (`:137-147`) — the private-role convention leaking into the ORM.

### Smaller tables

- **`api_keys`** (`:96-104`) — `key` (`TrimmedString(32)`, unique), `deleted`. That `deleted` column is the *only* thing the shed's entire alembic history has ever added.
- **`password_reset_token`** (`:203-218`) — `token` is the PK (no surrogate `id`); 24-hour default expiry. Consumed by *Galaxy's* `UserManager` through the `SharedModelMapping` indirection.
- **`galaxy_session`** (`:343-364`) — still live in TS 2.0; cookie name `galaxycommunitysession`. `prev_session_id` is a bare Integer self-reference with **no FK** (`:357`).
- **`category`** (`:642-674`) — `name` unique. `active_repository_count()` (`:656-670`) is **raw SQL via `text()`** with hardcoded `= false` literals rather than SQLAlchemy's `false()`.
- **`repository_category_association`** (`:677-688`) — no timestamps, no unique constraint on the pair; a repository can join the same category twice.
- **`role`** (`:240-272`) — `name` unique, `type` from `Bunch(PRIVATE, SYSTEM, USER, ADMIN, SHARING)`. Only `PRIVATE` and `SYSTEM` are ever produced; shed admin-ness is config-driven, not role-driven.
- **`galaxy_group`** (`:221-237`) — the only group with semantic meaning is the one literally named **"Intergalactic Utilities Commission"** (`IUC_NAME`, `security/__init__.py:17`), looked up by name.
- **Join tables** — `user_group_association`, `user_role_association`, `group_role_association`, `repository_role_association` (`:275-340`). All FK-indexed, **none with a unique constraint on the pair**.
- **`repository_rating_association`** (`:625-639`) — **vestigial**; no reference anywhere in `lib/` or `test/` outside the model file. The rating UI was deleted in `44d6a34178f`.
- **`tag`** (`:691-703`) — **orphan**. There is no `ItemTagAssociation` of any kind in the shed model, so nothing can ever be tagged. `webapp/app.py:83` constructs a `CommunityTagHandler`, but nothing reads `app.tag_handler`, and `galaxy.model.tags` imports `Tag` from `galaxy.model` anyway.

### Tables you will *not* find

Prominent in pre-2.0 Tool Shed docs and still present as strings inside the checked-in sqlite test fixture, but gone at this SHA:

- **`repository_review`, `component`, `component_review`, `repository_reviewer`** and the `RepositoryReview`/`ComponentReview`/`Component` classes — removed in `44d6a34178f` (2022-09-16, −3828 lines) along with `review_util.py`, the review controller, the review grids, and the `test_0400_*`/`test_0405_*` functional tests. **There is no current equivalent: the shed has no review or curation model.** The only remaining trace is the stale binary fixture at `test/unit/tool_shed/data/toolshed_community_files/database/community.sqlite`.
- **No `repository_dependency` / `tool_dependency` / `tool_version` tables shed-side.** Dependencies live as JSON inside `repository_metadata.metadata`. The relational versions exist only on the Galaxy install side.
- No `item_tag_association` variants, no `stored_workflow`, no `page`.

## Relationships

```
User 1──* Repository            (repository.user_id)
User 1──* APIKeys / PasswordResetToken / GalaxySession
User *──* Role                  via user_role_association
User *──* Group                 via user_group_association
Group *──* Role                 via group_role_association
Repository *──* Role            via repository_role_association  (in practice one SYSTEM admin role each)
Repository *──* Category        via repository_category_association
Repository 1──* RepositoryMetadata
Repository 1──* RepositoryRatingAssociation   [vestigial]
Tag 1──* Tag                    (self, parent_id)  [orphan]
```

**Nothing in the schema links a `Repository` to another `Repository`.** Repository dependencies are string tuples `[shed_url, name, owner, changeset_revision, prior_installation_required, only_if_compiling_contained_td]` inside the JSON blob, resolved by name+owner lookup at read time (`metadata_util.py:230-264`). Dangling references are normal and log-and-continue (`:259-263`).

**Ordering caveat that bites downstream**: both metadata collections order by `update_time`, not `numeric_revision`. `managers/repositories.py:803-806` depends on this ("the zeroth revision will be the tip just after an upload"). Callers wanting changelog order must go through `metadata_util.get_metadata_revisions(..., sort_revisions=True)`, which re-sorts by `numeric_revision` (`:177-178`).

## The hg-changeset ↔ metadata-row lifecycle

This is the load-bearing part of the model and the part most likely to surprise.

### A metadata row is not "one row per changeset"

`set_repository_metadata` (`lib/tool_shed/metadata/repository_metadata_manager.py:1107-1191`) branches:

- **New row** — if the repo type is not `TipOnly` *and* `new_metadata_required_for_utilities()`: `create_or_update_repository_metadata(repository.tip(), metadata_dict)`.
- **In-place mutation** — otherwise: fetch the *latest* metadata row and **advance its `changeset_revision` to the new tip** (`:1134-1166`), re-setting `metadata`, `downloadable`, `has_repository_dependencies`, `includes_tools`, `includes_tool_dependencies`, and hard-setting `includes_datatypes`/`includes_workflows`/`missing_test_components` to `False`.

So it is "one row per *metadata-distinct* changeset", and rows **move forward**. `repository_suite_definition` and `tool_dependency_definition` repos are `TipOnly`, so they always take the in-place branch.

### `numeric_revision` drift

`numeric_revision` is written only by `reset_all_metadata_on_repository_in_tool_shed` (six sites) and lazily backfilled when `-1`/`NULL` (`metadata_util.py:165-173`, committing the fix inline — an N+1 commit pattern). It is **not** written by `set_repository_metadata`. So on the in-place branch, `changeset_revision` advances while `numeric_revision` keeps pointing at the previous changeset.

This is now *documented rather than fixed*, in a comment added 2026-07-27 (`437d5fc623c`, PR #23189) at `lib/tool_shed/util/repository_util.py:333-336`:

> Deliberately not read from `repository_metadata.numeric_revision`: when a push updates the metadata record in place its `changeset_revision` advances to the new tip while `numeric_revision` keeps pointing at the previous changeset, and Galaxy clones at whatever `ctx_rev` we hand it.

`get_repo_info_dict` therefore recomputes `ctx_rev` from hg on **every call** (`repository_util.py:337`).

### The "moved ahead" read pattern

Because rows move forward, a client's remembered `changeset_revision` can stop matching any row. `get_current_repository_metadata_for_changeset_revision` (`metadata_util.py:83-99`) handles it: exact-hash lookup, and on a miss, walk the changelog forward via `get_next_downloadable_changeset_revision` (`:182-203`) and look *that* up. `get_repo_info_dict` then nulls out `metadata_for_changeset` when the returned row describes a different revision than requested (`repository_util.py:328-332`).

### Reset path

`reset_all_metadata_on_repository_in_tool_shed` (`repository_metadata_manager.py:815-1013`) is the canonical rebuild: clone once into a temp dir (`4364049db52` optimized this from a per-changeset clone), iterate the type-dependent changeset list, `hg update` to each, regenerate metadata, and compare against the ancestor → `EQUAL` / `SUBSET` / `NOT_EQUAL_AND_NOT_SUBSET` / `NO_METADATA`. Rows are written only at `NOT_EQUAL_AND_NOT_SUBSET` boundaries; afterwards `_clean_repository_metadata` deletes every row not in the retained list. `dry_run`/`verbose` modes with before/after snapshots landed Dec 2025 (PR #21786).

## The `metadata` JSON blob

Produced by `BaseMetadataGenerator` in `lib/galaxy/tool_shed/metadata/metadata_generator.py` (shared with the Galaxy install side), subclassed as `ToolShedMetadataGenerator`. Keys at this SHA: `tools`, `invalid_tools`, `invalid_tool_errors`, `tool_dependencies`, `invalid_tool_dependencies`, `repository_dependencies`, `invalid_repository_dependencies`, `datatypes`, `workflows`, `data_manager`, `sample_files`, `readme_files`.

Only `tools` has a declared shape — `RepositoryMetadataToolDict`, a real `TypedDict` (`metadata_generator.py:66-79`): `id, guid, name, version, profile, description, version_string_cmd, tool_config, tool_type, requirements, tests, add_to_tool_panel`. `guid` is the `<host>/repos/<owner>/<name>/<tool_id>/<version>` form.

`invalid_tools` is heterogeneous by history — `build_invalid_tools` (`metadata_util.py:29-44`) accepts both bare strings (old format, joined against `invalid_tool_errors`) and dicts (new format).

How much the app leans on this blob is visible in `ShedCounter.generate_statistics` (`shed_statistics.py:27-94`): repository counts, unique tool ids, valid/invalid tool versions, datatype extensions and workflow counts are all derived by iterating `repository.metadata_revisions` and dict-digging. It runs **at every process start**, inside `mapping.init` (`mapping.py:50-52`) — a full table scan plus JSON walk on boot.

## Flag semantics

| Flag | Status |
|---|---|
| `Repository.deprecated` | **Live.** `PUT`/`DELETE /api/repositories/{id}/deprecated` (`api2/repositories.py:519-551`). Enforced in `HgController.handle_request` (`controllers/hg.py:41-42`) and excluded from indexing/category counts. |
| `Repository.deleted` | **Dead.** Read in filters and SQL, never assigned `True`; there is no repository-delete endpoint. Deprecation replaced deletion. Any `True` rows are legacy from the removed grid UI. |
| `Repository.private` | **Dead.** Read only in `Category.active_repository_count`'s raw SQL and serialized on the wire; never written. |
| `RepositoryMetadata.malicious` | Per-revision, admin-flippable (`api2/repositories.py:485-517`). **Does not gate installability** — a revision can be `malicious=True` *and* `downloadable=True` and will still be handed to installers. |
| `RepositoryMetadata.downloadable` | The installability gate. Backs `downloadable_revisions` → `get_ordered_installable_revisions`. |
| `missing_test_components`, `includes_datatypes`, `includes_workflows` | **Hard-wired `False`** on both write paths, while remaining indexed and serialized to clients. |
| `times_downloaded` | Incremented only on hg `getbundle` (`hg.py:43-49`) — one write transaction per clone. Used as a "never installed anywhere" proxy by `can_change_type`. |

**Divergent `downloadable` derivations.** `create_or_update_repository_metadata_with_details` (`repository_metadata_manager.py:486-555`) computes it from four conditions; the in-place branch uses `metadata_util.is_downloadable` (`:334-353`), which *also* returns `True` for `datatypes` and `workflows`. **The two paths disagree about whether a datatypes-only or workflows-only revision is downloadable.**

**Uniqueness invariants are Python-side, not DB-side**: repository name unique per owner plus 2–80 chars and a lower-case regex (`repository_util.py:540-563`); the username `"repos"` is reserved because `hgweb_repo_prefix` is `repos/`; the admin role name `f"{name}_{username}_admin"` is namespaced-string uniqueness standing in for a composite key.

## Repository types

`Repository.type` is free text; the three legal labels come from `lib/galaxy/tool_shed/repository_type.py`. The type controls **which changesets get metadata**:

| Type | Base | `get_changesets_for_setting_metadata` | Content rule |
|---|---|---|---|
| `unrestricted` | `Metadata` | the whole `repo.changelog` | new repo or `times_downloaded == 0` |
| `repository_suite_definition` | `TipOnly` | `[repo.changelog.tip()]` | every changed file must be `repository_dependencies.xml` |
| `tool_dependency_definition` | `TipOnly` | `[repo.changelog.tip()]` | every changed file must be `tool_dependencies.xml` |

`Registry.get_class_by_label` returns `None` for anything else — no validation error at the model layer. The API layer *does* validate what the column does not: `type_` on the create/update requests is a `RepositoryType` enum, while `Repository.type` on the response model is a bare `str` with a `# TODO: enum` comment.

## RBAC on top of the schema

`CommunityRBACAgent` (`lib/tool_shed/webapp/security/__init__.py:75-271`), one per `ToolShedModelMapping`, reachable as `app.security_agent`.

**The generic RBAC machinery is a shell.** `RBACAgent.permitted_actions = Bunch()` is empty and nothing overrides it, so `allow_action`/`get_item_actions`/`get_permitted_actions` are dead paths — `get_item_actions` still carries a Galaxy-copied docstring naming `Dataset, Library, LibraryFolder`, none of which exist here.

What actually enforces anything:

1. **Repository administration** — `user_can_administer_repository` (`:239-260`): resolve `admin_role` by name, check direct `UserRoleAssociation`, then group membership via `GroupRoleAssociation` → `UserGroupAssociation`. A pure-Python graph walk, no SQL.
2. **Push permission** — `usernames_that_can_push` = `listify(repository.allow_push())`, i.e. **parsed out of `.hg/hgrc`**, not the database.
3. **IUC archive import** — you may create a repository owned by someone else iff you are in the group named "Intergalactic Utilities Commission" (`:262-271`).
4. **Admin** — not a role at all; `app.config.is_admin_user(user)` off the `admin_users` config string.

The association setters (`:170-229`) all delete-then-recreate with a `session.commit()` **inside the loop**.

## Mapping, sessions, query layer

`mapping.init(url, engine_options, create_tables)` (`mapping.py:34-54`) builds the engine, constructs `ToolShedModelMapping(SharedModelMapping)`, attaches `CommunityRBACAgent` and `ShedCounter`, and runs the statistics scan. `SharedModelMapping` (`lib/galaxy/model/base.py:137-148`) exists specifically so shared Galaxy code can do `app.model.User` / `.GalaxySession` / `.APIKeys` / `.PasswordResetToken` against either app's classes.

`create_tables=True` **bypasses alembic entirely** — that is how the unit-test app boots against `sqlite:///:memory:`. `webapp/app.py:61-78` calls `verify_database(...)` *before* `mapping.init(...)`. Request-scoped sessions are keyed on `X-Request-ID` via the FastAPI dependency `get_app_with_request_session` (`api2/__init__.py:62-70`).

`db/__init__.py` is the entire query layer — three functions: `get_repository_query`, `get_repository_by_name`, `get_repository_by_name_and_owner` (the last a legacy `session.query(...)` chain, not `select()`, and the shed's most-called helper). Contrast `lib/galaxy/model/db/`, a real package of typed `select()`-based helpers. Consequently ad-hoc `select()` statements are scattered across `security/__init__.py`, `shed_statistics.py`, `metadata_util.py`, `managers/repositories.py`, and `repository_metadata_manager.py`.

## Migrations

**The whole history is two revision scripts**: `969bbf7bcc29` (2023-02-04, blank baseline, both `upgrade()`/`downgrade()` are `pass`) and `1b5bf427db25` (2024-05-29, adds `api_keys.deleted`). One column change since the move to alembic. Head is `1b5bf427db25`.

How it differs from Galaxy's setup:

| | Galaxy | Tool Shed |
|---|---|---|
| Branches | `gxy` + `tsi` labels, possibly two databases | single linear branch, **no branch labels** |
| Auto-migrate | supported | **none** — `DatabaseStateVerifier(engine)` takes the engine only |
| Autogenerate | — | explicitly disabled: `target_metadata = None` (`alembic/env.py:11`) |
| sqlalchemy-migrate cutover | 180 (gxy) / 17 (tsi) | 27 |
| CLI | `manage_db.sh` | `manage_toolshed_db.sh` |

It nonetheless imports Galaxy's migration base classes wholesale — `BaseAlembicManager`, `DatabaseStateCache`, `load_metadata`, the exception types, `create_database`/`database_exists`. Only `RevisionNotFoundError` is shed-local.

**A fresh shed database is created by `metadata.create_all` and then *stamped*, never migrated** — the two revision scripts only ever run on databases that predate them.

### Adding a migration

1. `sh manage_toolshed_db.sh revision -m "<message>"`.
2. Set `down_revision` to the current head (`1b5bf427db25`); leave `branch_labels = None`.
3. Write `upgrade()`/`downgrade()` with `galaxy.model.migrations.util` helpers inside `with transaction():` — autogenerate is unavailable, so this is hand-written.
4. **Mirror the change in `lib/tool_shed/webapp/model/__init__.py`** — the ORM is the source of truth for fresh databases via the `create_all` path.
5. Add a `REVISION_TAGS` entry in `dbscript.py` at release time (currently stale — nothing past `24.1`).

## Model → wire

Two serialization stacks coexist.

**`Dictifiable`** — `User`, `Group`, `Role`, `Repository`, `Category`, `RepositoryMetadata` declare `dict_collection_visible_keys`/`dict_element_visible_keys`; `get_value_mapper` supplies `encode_id` for `id`/`repository_id`/`user_id`.

**Pydantic** — `lib/tool_shed_client/schema/__init__.py`, also shipped as the standalone `packages/tool_shed_schema` distribution. The bridge is mechanical dict→model construction (`to_model`, `to_detailed_model`, `managers/repositories.py:744-749`), so **the Pydantic field set must be kept in sync with `dict_element_visible_keys` by hand** — there is no shared declaration.

**The `synopsis`/`description`/`long_description` triple-swap on create is a genuine trap**: `request.synopsis → Repository.description`, `request.description → Repository.long_description`, and the response calls them `description`/`long_description` again (`managers/repositories.py:718-719`).

Other shape notes:
- `RepositoryDependency` is declared as a **subclass of `RepositoryRevisionMetadata`** — a dependency serializes as a full, recursive metadata record, which is why `get_all_dependencies` needs a cycle guard.
- `RepositoryMetadata` on the wire is a `RootModel[dict[str, RepositoryRevisionMetadata]]` keyed `"{numeric_revision}:{changeset_hash}"`.
- A parallel `RepositoryRevisionMetadataPreview`/`RepositoryMetadataPreview` pair exists so the `dry_run` reset path can serialize **unpersisted** objects — every id field is `str | None` there.
- `includes_tool_dependencies`/`includes_datatypes`/`includes_workflows` are `bool | None = None` on the wire, optional precisely because the last two are permanently `False`.

## Shares vs. forks Galaxy's model machinery

**Shared** — column types (`MutableJSONType`, `TrimmedString`); session helpers (`build_engine`, `SharedModelMapping`); utilities (`now`, `unique_id`, `Bunch`, `Dictifiable`, `new_insecure_hash`); the entire migration framework bar one exception class; ID encoding; `BaseMetadataGenerator`; the repository-type constants; and a set of managers registered against shed rows through `SharedModelMapping` — `ApiKeyManager`, `UserManager(app_type="tool_shed")`, `GalaxySessionManager`, `AuthManager`, `NoQuotaAgent`.

**Forked** (same table names, different columns) — `galaxy_user`, `galaxy_session`, `api_keys`, `password_reset_token`, `role`, `galaxy_group`, the three user/group/role join tables, `tag`.

The fork is load-bearing: `User` diverges on password hashing and on the absence of `active`, which is why shared Galaxy user code either avoids those fields or has them commented out. `SharedModelMapping`'s type union is the only place the divergence is declared.

**False-positive warning**: `RepositoryMetadata` exists in *both* worlds with the same name and completely different meaning. Grepping the name across `lib/` is misleading. See [[Component - Galaxy Pulsar Runner Code Sharing]] for the vault's other treatment of two codebases sharing a partially-forked module.

## Testing

- **`test/unit/tool_shed/`** — boots a whole in-memory shed. `_util.py:62-82` does `mapping.init("sqlite:///:memory:", create_tables=True)` (so the schema comes from `create_all` and **alembic is never exercised**), a temp hgweb config dir, and a real `IdEncodingHelper`. `conftest.py` gives `shed_app`, `new_user`, `new_repository`, `provides_repositories`. `_util.py:151-181` tars up test-data dirs and drives the real `upload_tar_and_set_metadata` — real hg commits into a temp repo.
- Model-behaviour coverage lives mostly in **`test_repository_metadata_manager.py`**, which asserts on `len(new_repository.downloadable_revisions)` and `new_repository.revision()` before and after a metadata reset across the `column_maker`, `column_maker_with_download_gaps`, and `data_manager_gaps` fixtures — precisely the lifecycle above.
- `test/unit/tool_shed/model/` contains **only an empty `__init__.py`**.
- **`test_dbscript.py`** — the whole module's test classes are `@pytest.mark.skip`ped ("Slow test: database migration management scripts"), so shed migration CLI behaviour is not exercised in CI by default. Its docstrings also name a transposed, non-existent path (`lib/tool_shed/model/webapp/migrations/`).
- **Functional tests** — `lib/tool_shed/test/functional/`, ~40 legacy `test_00xx_*`/`test_1xxx_*` files plus modern API tests. `test/base/test_db_util.py` reaches into **both** models via two distinct sessions. Run these with `/galaxy-toolshed-tests`, not by hand. See [[Component - Worktree Bootstrapping]] for getting a runnable checkout.
- The frontend fixtures at `webapp/frontend/src/components/MetadataInspector/__fixtures__/*.json` are captured real API responses — the best available examples of the serialized `RepositoryRevisionMetadata` shape, and a good reason not to change serialization casually.

## Known warts

Roughly by blast radius:

1. **Unsalted SHA1 passwords, structurally locked in** by the `TrimmedString(40)` column width.
2. **The model is coupled to Mercurial and the filesystem** — `mercurial` imported into the model module, a `WeakKeyDictionary` of open hg repos keyed on ORM instances, push ACLs in `.hg/hgrc`.
3. **Missing unique constraint on `(repository_id, changeset_revision)`**, compensated by a *destructive read* that deletes duplicates.
4. **`numeric_revision` drifts from `changeset_revision`**, documented in a 2026 comment rather than fixed; consumers recompute from hg.
5. **Three permanently-`False` indexed boolean columns**, still serialized to clients.
6. **Two dead flags** — `deleted` and `private` are read but never written.
7. **`malicious` does not gate installability.**
8. **Divergent `downloadable` derivations** between the two write paths.
9. **Orphan `tag` table** plus a constructed-but-unused `CommunityTagHandler`.
10. **Vestigial `repository_rating_association`.**
11. **Dead-on-arrival RBAC scaffolding** — empty `permitted_actions`, unreachable methods, Galaxy-copied docstrings, three of five `Role.types` never produced.
12. **N+1 commits** in the association setters and the `numeric_revision` backfill.
13. **Full-table statistics scan at every process start.**
14. **Raw SQL with hardcoded `= false` literals** in `Category.active_repository_count`.
15. **`Repository.email_alerts` is mis-typed and mis-read** — `MutableJSONType` annotated `Mapped[bytes | None]`, read back with `json.loads(...)` plus a `# type: ignore`. Nothing writes it; the checkbox UI went with the grids.
16. **`RepositoryMetadata.__init__` silently discards two parameters.**
17. **Divergent `downloadable` defaults** between Table and `__init__`.
18. **`db/` is a three-function stub** while Galaxy has a real query package; queries are scattered across five modules.
19. **Stale `REVISION_TAGS`** — nothing past `24.1`.
20. **Migration CLI tests skipped by default**, with stale docstrings.
21. **Stale checked-in sqlite fixture** still containing the removed `repository_review` tables; nothing rebuilds it.
22. **No timestamps on `repository_category_association`**, and no unique constraint on any of the five join tables.
23. **`GalaxySession.prev_session_id` is an un-FK'd integer self-reference.**

## Recent activity and direction of travel

| Commit | Date | Subject | PR |
|---|---|---|---|
| `dd6dc9dee53` | 2026-07-27 | Reuse loaded repository objects when building repo info dicts | #23189 |
| `437d5fc623c` | 2026-07-27 | Resolve changeset revision numbers in-process instead of via `hg id` — added the `numeric_revision` drift comment | #23189 |
| `a1445bfbafc` | 2026-05-08 | Type-hint imperatively-mapped `RepositoryMetadata` columns | #22663 |
| `17517238773` | 2026-05-08 | Fix Tool Shed index incremental update sort order | #22663 |
| `de43933c0eb` | 2026-03-11 | Migrate legacy install protocol endpoints to FastAPI | |
| `cfee84687e6` | 2026-02-25 | Delete grid framework & repository registry (Phases 3+4) | #22037 |
| `8fc135eb2e8` | 2026-02-25 | Delete legacy UI controllers & Mako templates (Phase 2) | #22037 |
| `4364049db52` | 2026-01-19 | Optimize metadata reset to clone repository once | |
| `7154ee95658` | 2025-12-12 | Add before/after metadata snapshots to `reset_metadata` API | #21786 |
| `ae3bdf5b381` | 2025-12-12 | Add `dry_run` and `verbose` modes to `reset_metadata_on_repository` API | #21786 |

The load-bearing historical commit is older: **`44d6a34178f`** (2022-09-16, −3828 lines), which deleted the review model entirely. Also relevant: `185a99f17ff` (moved `RepositoryMetadata` out of `mapping.py`) and `940380eb6e3` (mapped `Repository` declaratively) — the shed's model was imperative until 2022, and `RepositoryMetadata` is the one class that never made the transition.

**Direction of travel: nothing is being added to this schema.** Three years of work are deletions (review, grids, controllers, registry), the FastAPI migration, and performance/typing fixes around the existing tables. Treat it as frozen-and-decaying, not evolving — which matters when planning work against it: a change that needs a new table is a much bigger ask here than the table count suggests.

## Adjacent, not covered here

**The Galaxy-side installed-repository model** lives in `lib/galaxy/model/tool_shed_install/__init__.py`, with its own `Base` and its own alembic branch label `tsi`. Tables: `tool_shed_repository`, `repository_repository_dependency_association`, `repository_dependency`, `tool_dependency`, `tool_version`, `tool_version_association`. It is a *different* schema in a *different* (optionally separate) database, describing what a Galaxy server has **installed** rather than what a shed **hosts**. Notably it *does* relationalize the repository and tool dependencies that the shed keeps as JSON, and it carries an `installation_status` state machine the shed has no concept of. Worth a sibling note. The install-request format that feeds it is covered by [[Component - Tool Install YAML]], whose `name`/`owner`/`revisions` triple is exactly the `(Repository.name, User.username, RepositoryMetadata.changeset_revision)` key described above.
