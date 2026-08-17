---
type: research
subtype: component
tags: [research/component, galaxy/datasets, galaxy/security, galaxy/admin, galaxy/models]
component: "Private Object Stores"
galaxy_areas: [datasets, security, admin, models]
status: draft
created: 2026-08-08
revised: 2026-08-17
revision: 2
ai_generated: true
summary: "Storage-layer private flag vs permission-layer private roles, and why user-defined stores are private only by report"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-private-object-stores.md"]
related_notes:
  - "[[Component - Data Fetch]]"
  - "[[Component - UI Error Handling]]"
  - "[[Component - User-Defined Tools]]"
  - "[[Component - DRS Support]]"
  - "[[Dependency - Pydantic Discriminated Unions]]"
  - "[[Component - E2E Tests - Writing]]"
  - "[[Component - API Tests]]"
  - "[[Component - Workflow API]]"
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
---

# Private Object Stores

Two things in Galaxy are called a "private object store", and they are not the same mechanism. This
note covers both, plus the third concept they are routinely confused with — the permission system's
notion of a private *dataset*.

**Verification anchor**: Galaxy `origin/dev` at SHA `e621a577509710e76b54aca458e44fbfaa136e00`.
Every `path:line` below was read at this SHA.

**Scope**: (A) the `private` flag on object store backends, and (B) user-defined / BYOS object
stores (`user_objects://…`). Out of scope: general object store internals (dispatch, `store_by`,
device maps), individual backend implementations (S3/Azure/iRODS/Rucio/Pithos/Onedata), caching,
and sharding — touched only where privacy changes their behaviour.

**Organising question**: what does it mean for a dataset to live in storage that cannot be shared,
and how does Galaxy actually enforce that? (A) and (B) are two different answers — and (B)'s answer
turns out to be "it doesn't".

## Table of Contents

- [[#Three Things Called Private]]
- [[#Layer A — The private Backend Flag]]
- [[#Layer B — User-Defined BYOS Object Stores]]
- [[#Where A and B Meet — and Where They Don't]]
- [[#Config Surface]]
- [[#Tests]]
- [[#Extension Points]]
- [[#Known Issues and Sharp Edges]]

## Three Things Called Private

| Concept | Lives in | Predicate | Gates |
|---|---|---|---|
| **Storage privacy** | `galaxy.objectstore` | `ObjectStore.is_private(obj)` / `ConcreteObjectStore.private` | Whether the *backend* may hold data anyone but the owner can read |
| **Permission privacy** | `galaxy.model.security` | `dataset_is_private_to_user(trans, dataset)`, `dataset_is_private_to_a_user(dataset)` | Whether *this dataset row* currently has exactly one `PRIVATE` access role |
| **User-defined storage** | `galaxy.managers.object_store_instances` | `is_user_object_store(object_store_id)` | Whether the store is a per-user BYOS instance |

Storage privacy is a **static property of configuration**. Permission privacy is a **dynamic
property of a row's `DatasetPermissions`**. They are orthogonal — a dataset can be permission-private
in a shareable store (the common case under
`new_user_dataset_access_role_default_private`), and a store can be storage-private while
permissions default to public (a configuration that errors out at job time, see
[[#Config Surface]]).

They compose at exactly **two** places.

**1. `Dataset.shareable`** — `lib/galaxy/model/__init__.py:4864-4871`

```python
@property
def shareable(self) -> bool:
    """Return True if placed into an objectstore not labeled as ``private``."""
    if self.external_filename:
        return True
    else:
        object_store = self._assert_object_store_set()
        return not object_store.is_private(self)
```

`ensure_shareable()` (`:4873-4875`) raises `MessageException(CANNOT_SHARE_PRIVATE_DATASET_MESSAGE)`;
the constant is at `:336` — *"Attempting to share a non-shareable dataset."*

**2. `Job.requires_shareable_storage(security_agent)`** — `lib/galaxy/model/__init__.py:2355-2366`.
This is the *only* place the permission system feeds the storage system: given the permissions
already computed for a job's outputs, does this job need a store that permits sharing? The in-code
comment at `:2356-2358` notes it could be hoisted into `galaxy.tools.actions` at job-creation time
when permissions are already known — an acknowledged inefficiency, not a bug.

Note the near-namesakes `dataset_is_private_to_user` (`lib/galaxy/model/security.py:1142-1156`) and
`dataset_is_private_to_a_user` (`:1158-1170`) differ only in whether they compare against a
*specific* user's private role or accept *any* `Role.types.PRIVATE` role. Neither has anything to do
with `ObjectStore.is_private`.

## Layer A — The private Backend Flag

### Definition and parsing

In `lib/galaxy/objectstore/__init__.py`:

- `DEFAULT_PRIVATE = False` (`:72`)
- `ObjectStore.is_private(obj)` — abstract (`:373-374`); `BaseObjectStore.is_private` delegates via
  `self._invoke("is_private", obj)` (`:730-731`)
- `BaseObjectStore.parse_private_from_config_xml` (`:736-741`) — classmethod, reads the `private`
  XML attribute through `asbool`
- `ConcreteObjectStore.__init__` (`:799`) — `self.private = config_dict.get("private", DEFAULT_PRIVATE)`,
  commented *"Annotate this as true to prevent sharing of data."*; `_is_private` returns it (`:869-870`)
- Serialisation into `ConcreteObjectStoreModel.private` via `to_dict()` (`:815`) / `to_model()` (`:832`)
- XML ingress for disk at `DiskObjectStore.parse_xml` (`:958`); YAML carries the `private:` key through

Badges: `_get_concrete_store_badges` (`:855`) passes `private` to `serialize_badges`
(`objectstore/badges.py:92-94`), which appends `{"type": "restricted", "source": "galaxy"}`
(`badges.py:124-130`). `restricted` is Galaxy-generated, not admin-settable.

### Nested stores

**`DistributedObjectStore`** — privacy is per-backend. `object_store_ids(private=None)` (`:1694-1700`)
filters on `backend.private`. `NestedObjectStore._is_private` (`:1340-1341`) resolves the object's
`object_store_id` to a concrete backend and asks that store, with a non-exception default of
`False` — so an **unresolvable object reads as shareable**.

**`HierarchicalObjectStore`** — privacy is store-wide, enforced by assertion at `:1745-1755`: a
contained backend may restate the parent's value but not contradict it. `parse_xml` (`:1770-1784`)
sidesteps this for XML by stamping the parent value onto every backend dict. `_is_private`
(`:1810-1814`) returns `self.private` unconditionally, because the hierarchical store does not use
`object_store_id` to dispatch.

`HierarchicalObjectStore` inherits the base `object_store_ids()` → `[]` (`:376-383`), which makes
the `shareable=` API filter a no-op under it (see below).

### The write-side gate

`ObjectStorePopulator` (`:2159-2189`) is where a private store refuses shareable data:

```python
concrete_store = self.object_store.create(dataset)
if concrete_store.private and require_shareable:
    raise ObjectCreationProblemSharingDisabled()
```

The check reads `concrete_store.private` **directly**, not through `is_private()` — this matters for
[[#Where A and B Meet — and Where They Don't]].

**Sharp edge**: the two entry points have opposite defaults. `set_object_store_id` defaults
`require_shareable=False` (`:2173`); `set_dataset_object_store_id` defaults `True` (`:2177`). Five
call sites in `lib/`:

| Call site | `require_shareable` |
|---|---|
| `lib/galaxy/jobs/__init__.py:1843`, `:1956`, `:1964` | explicit, from `requires_shareable_storage` |
| `lib/galaxy/model/__init__.py:5588` (`HistoryDatasetAssociation.set_skipped`) | omitted → **`False`** |
| `lib/galaxy/model/deferred.py:183` (deferred materialization) | omitted → **`True`** |

The last two land on opposite sides purely by which overload they happened to call. Neither looks
deliberate.

`ObjectCreationProblemSharingDisabled.client_message` (`:2143-2157`) is consumed at exactly one
place — `lib/galaxy/jobs/runners/__init__.py:212` — so a violation surfaces as a **failed job with
an admin-legible message**, not an API 4xx.

### Read and share-side gates

`Dataset.shareable` / `ensure_shareable()` are consulted at:

| Site | Blocks |
|---|---|
| `lib/galaxy/model/security.py:896-903` | `set_all_dataset_permissions` — for a non-new dataset in a non-shareable store, the incoming permission set must be exactly one `PRIVATE` access role |
| `lib/galaxy/model/security.py:936` | `set_dataset_permission` when touching `DATASET_ACCESS` |
| `lib/galaxy/model/security.py:978` | `privately_share_dataset` — despite the name, private stores still forbid it ("privately share" = share with a restricted set) |
| `lib/galaxy/model/security.py:1202` | `make_dataset_public` |
| `lib/galaxy/model/__init__.py:6297-6298` | `to_library_dataset_dataset_association` — raises a bare `Exception`, not a `MessageException` |
| `lib/galaxy/webapps/galaxy/controllers/dataset.py:261` | legacy controller display path |

API filtering at `lib/galaxy/webapps/galaxy/services/history_contents.py:1095-1099` maps
`shareable=` onto `object_store_ids(private=not shareable)`, but guards with `if object_store_ids:` —
an empty result **silently disables the filter** rather than returning nothing.

### API and client surface

`GET /api/datasets/{id}/storage` → `DatasetsService.show_storage`
(`lib/galaxy/webapps/galaxy/services/datasets.py:450-499`) reports `private` (`:467`, via
`is_private`), `shareable` (`:489`), and `relocatable` (`:488`). The response model is
`DatasetStorageDetails` at `services/datasets.py:146-177` — it lives there, not in `schema/schema.py`.

`can_change_object_store_id` (`lib/galaxy/model/security.py:629-643`) is the relocation gate, and
deliberately uses *actual sharing* (any HDA in another user's history) rather than either privacy
notion — its comment says a dataset "kept private in a sharable object store" should still allow the
swap.

Client: `ObjectStore/ObjectStoreRestrictionSpan.vue:14` carries the user-facing sentence
("stored on storage restricted to a single user… cannot be shared, published, or added to Galaxy
data libraries"); `ObjectStore/badgeMessages.ts:2-4` and `ObjectStoreBadge.vue:64-65` render
`restricted` as a *disadvantage* and `user_defined` as *neutral*.

### Relocation

`lib/galaxy/managers/dataset_storage_operations.py:264-267` computes
`is_privacy_downgrade_for_target` (source private, target not). It feeds
`preview.privacy_downgrade_count` and produces advisory copy (`:592-595`) — a **warning, not a
block**. `_is_private_for_object_store_id` (`:299-304`) duck-types a `SimpleNamespace` proxy to ask
`is_private` about a bare store id.

## Layer B — User-Defined BYOS Object Stores

### Identity and model

- Scheme `USER_OBJECTS_SCHEME = "user_objects://"` (`objectstore/__init__.py:76`); predicate
  `is_user_object_store` (`:87-88`) is a plain `startswith`
- `UserObjectStore` model — `lib/galaxy/model/__init__.py:12597-12662`, table `user_object_store`,
  extends `HasConfigTemplate` (`:12582-12594`) → `HasConfigSecrets` + `HasConfigEnvironment`;
  `User.object_stores` at `:903`
- Migration `c14a3c93d66a_add_user_defined_object_stores.py` adds `template_id`,
  `template_version`, `template_definition`, `template_variables`, `template_secrets`, and the usual
  lifecycle columns. **No `private` column.**

### Shared config-template machinery

`lib/galaxy/managers/_config_templates.py` (665 lines) is genuine shared abstraction between
`object_store_instances.py` and `file_source_instances.py` — the latter backing user file sources
(see [[Component - DRS Support]]). `object_store_instances.py:53-75` imports 26 names from it:
payload models, test targets, secret/vault lifecycle (`recover_secrets`, `update_instance_secret`,
`upgrade_secrets`, `purge_template_instance`), template lifecycle (`sort_templates`,
`save_template_instance`), and OAuth2 helpers. The model-layer counterpart is `HasConfigTemplate`,
shared by `UserObjectStore` and `UserFileSource`, keyed by `secret_config_type`.

This is the closest structural sibling to [[Component - User-Defined Tools]] — same "user brings a
definition, admin sets the envelope" shape.

### Configuration models

`lib/galaxy/objectstore/templates/models.py`:

- `ObjectStoreTemplateType` (`:37`) — `aws_s3 | azure_blob | boto3 | disk | generic_s3 | onedata | rucio | irods`
- `ObjectStoreConfiguration` (`:462-472`) — a pydantic discriminated union on `type`
  (see [[Dependency - Pydantic Discriminated Unions]])
- every member is a `StrictModel` — `lib/galaxy/util/config_templates.py:72-73`,
  `ConfigDict(extra="forbid", coerce_numbers_to_str=True)`

**No member has a `private` field, and `extra="forbid"` means an admin cannot add one via a
template.** This is load-bearing.

### Resolution

`user_objects://<uuid>` → live `ConcreteObjectStore`:

1. `BaseUserObjectStoreResolver.resolve_object_store_uri` (`objectstore/__init__.py:99-109`)
2. `UserObjectStoreResolverImpl.resolve_object_store_uri_config`
   (`managers/object_store_instances.py:384-397`) — load the row, recover secrets from the vault,
   prepare environment, sort templates, expand configuration
3. `concrete_object_store(...)` (`objectstore/__init__.py:2013-2043`) — builds an ad-hoc
   `GalaxyConfigAdapter` (hardcoding `store_by="uuid"`, `enable_quotas=False`) and constructs the
   backend from `object_store_configuration.model_dump()`
4. `DistributedObjectStore._resolve_backend` (`:1613-1619`) is the hook — so **BYOS only works under
   a `DistributedObjectStore`** (`type_to_object_store_class`, `:1880-1882`)
5. `validate_selected_object_store_id` (`:1706-1723`) — BYOS ids bypass the selection allowlist;
   the UUID is matched against `user.object_stores` instead

Job-directory serialisation runs through `serialize_static_object_store_config` (`:1824`) and
`user_object_store_configuration_to_config_dict` (`:1381-1389`), driven from
`lib/galaxy/jobs/__init__.py:2611-2618`.

### Quota

BYOS is quota-exempt: `lib/galaxy/quota/__init__.py:365-367` returns `False` from `is_over_quota`
for a `user_objects://` job, complemented by `QuotaSourceMap.get_quota_source_info`
(`objectstore/__init__.py:2091-2097`) and `QuotaModel(source=None, enabled=False)` in `_to_model`.

### API and UI

`lib/galaxy/webapps/galaxy/api/object_store.py` exposes `GET /api/object_stores` (requires
`selectable=true`) plus CRUD/test/purge on `/api/object_store_instances`.
`UserConcreteObjectStoreModel` (`managers/object_store_instances.py:82-91`) extends
`ConcreteObjectStoreModel` with template provenance.

Selenium coverage: `NavigatesGalaxy.create_object_store_template`
(`lib/galaxy/selenium/navigates_galaxy.py:3150-3173`), sharing `_fill_configuration_template` with
the file-source equivalent — see [[Component - E2E Tests - Writing]].

## Where A and B Meet — and Where They Don't

**BYOS stores are reported as private but are not mechanically private. Layer A is never engaged.**

1. `_to_model` hardcodes `private=True` on the API model
   (`managers/object_store_instances.py:362`) and passes `True` to `serialize_badges` (`:337-343`),
   so every BYOS instance carries `restricted` + `user_defined` badges.
2. The **runtime** store is built from `object_store_configuration.model_dump()`, and no
   configuration variant has a `private` field.
3. So `ConcreteObjectStore.__init__` evaluates `config_dict.get("private", DEFAULT_PRIVATE)` →
   **`False`**.
4. Therefore, for a dataset in a BYOS store: `Dataset.shareable` → `True`;
   `ObjectCreationProblemSharingDisabled` is never raised; `make_dataset_public`,
   `privately_share_dataset`, and `set_all_dataset_permissions` all pass their guards.
5. Nothing fills the gap. Repo-wide, `is_user_object_store` has exactly three callers outside
   `objectstore/__init__.py` — quota, job-directory URI collection, and an import. **No permission
   code path special-cases BYOS.**

**Consequence**: `GET /api/object_store_instances` reports `private: true` for an instance while
`GET /api/datasets/{id}/storage` reports `private: false` for a dataset sitting in it — and the
enforcement paths consult the second.

Framed safely: BYOS privacy today is *presentational and social* (the store is bound to one user's
credentials; the UI badges it `restricted`), not *mechanical*. Whether a user can share data out of
their own S3 bucket is governed by the ordinary permission system, exactly as if the data sat on the
default disk.

Making it mechanical would mean adding `private` to `ObjectStoreConfiguration` or injecting it at
`concrete_object_store` — but that immediately trips `ObjectCreationProblemSharingDisabled` for any
user whose default permissions are public, which is the default. Per-store permission defaults do
not exist today.

**Corroboration**: `test/integration/objectstore/test_per_user.py` (487 lines, the canonical BYOS
suite) contains zero occurrences of "private" or "shareable". Conversely
`test_private_handling.py` — the canonical Layer A suite — only ever configures an
admin-side `private="true"` store.

## Config Surface

**Admin, `object_store_conf.xml` / `.yml`** — selected via `object_store_config_file`
(`config_schema.yml:1200-1207`) or embedded via `object_store_config` (`:1209-1222`). XML uses a
`private="true"` attribute; YAML a `private: true` key. The sample's own prose
(`object_store_conf.sample.yml:486-490`, mirrored at `object_store_conf.xml.sample:314-318`) presents
privacy as an option *with costs*:

> …it cannot be used in public datasets, shared between users, etc.. This is for example purposes -
> you may very well not want scratch storage to be defined as private as it prevents a lot of
> regular functionality…

**The mandatory pairing** is `new_user_dataset_access_role_default_private`
(`config_schema.yml:3051-3059`, default `false`). A private store is only usable if new users'
datasets default to private permissions — otherwise every job fails at `ObjectStorePopulator`.
`test_private_handling.py` tests both polarities and asserts exactly this.

**Admin, `object_store_templates.yml`** — `object_store_templates_config_file`
(`config_schema.yml:661-667`) or embedded `object_store_templates` (`:669-674`).
`user_config_templates_use_saved_configuration` (`:691-700`, enum
`fallback | preferred | never`, default `fallback`) governs whether a stored `template_definition`
or the current catalog wins when an admin has changed templates; it is shared with file sources.

## Tests

**Layer A**

| File | Covers |
|---|---|
| `test/unit/objectstore/test_objectstore.py:368-392` (`test_mixed_private`) | `object_store_ids(private=…)` filtering; hierarchical propagation |
| `test/unit/objectstore/test_badges.py` | badge serialisation incl. `restricted` |
| `test/integration/objectstore/test_private_handling.py` | `make_dataset_public` → HTTP 400 / code `400008`; job **errors** when default permissions are public |
| `test/integration/objectstore/test_private_handling_library_imports.py` | public-library input + private preferred store still lands outputs privately |
| `test/integration/objectstore/test_bulk_storage_operations.py:698` | the privacy-downgrade advisory warning |
| `test/integration/objectstore/test_changing_objectstore.py:37` | relocation under private-by-default permissions |

**Layer B**

| File | Covers |
|---|---|
| `test/integration/objectstore/test_per_user.py` | 9 tests — create/update/use, bad template id and version, secrets, upgrades, quota exemption. Needs a distributed parent store |
| `test/unit/objectstore/test_serializing_user_object_stores.py` | job-directory serialisation of `user_objects://` |
| `test/unit/data/test_quota.py:126` | usage accounting for a BYOS id |
| `test/integration/test_scripts_pgcleanup.py:252-315` | pgcleanup cannot resolve `user_objects://` — a documented operational limitation |

**Coverage gap**: nothing asserts the privacy semantics of a BYOS store. No test exercises
`Dataset.shareable`, `make_dataset_public`, or `ObjectCreationProblemSharingDisabled` against a
`user_objects://` dataset — which is precisely why the mismatch above goes unnoticed.

## Extension Points

- **New privacy-bearing backend** — subclass `ConcreteObjectStore`; `private` / `_is_private` come
  free. For XML support, remember `parse_private_from_config_xml` in your `parse_xml` (pattern:
  `DiskObjectStore.parse_xml`, `:958`). YAML needs nothing.
- **New BYOS template type** — add a `Literal` to `ObjectStoreTemplateType`, a
  `…TemplateConfiguration` / `…Configuration` `StrictModel` pair, both discriminated unions
  (`templates/models.py:445-472`), and an example catalog. Ensure `type_to_object_store_class`
  (`:1859-1917`) can build it and the class is a `ConcreteObjectStore` (asserted at `:2038`).
- **Making BYOS genuinely private** — add `private` to each `…Configuration`, or inject at
  `user_object_store_configuration_to_config_dict` (`:1381`) / `concrete_object_store` (`:2013`).
  Weigh the `new_user_dataset_access_role_default_private` interaction — you would need per-store
  permission defaults.
- **New "meets storage privacy" check** — go through `Dataset.shareable` / `ensure_shareable()`,
  never `object_store.is_private()` directly. `ensure_shareable` gives the standard
  `MessageException` + error code `400008` for free (see [[Component - UI Error Handling]]).

## Known Issues and Sharp Edges

1. **BYOS reports `private: true` but is not private.** Two API endpoints disagree; enforcement
   follows the non-private one. Untested in either direction.
2. **Asymmetric `require_shareable` defaults** (`:2173` vs `:2177`) — the two non-job callers omit
   the flag and land on opposite sides as a result.
3. **`NestedObjectStore._is_private` fails open** (`:1340-1341`) — an unresolvable object reads as
   shareable.
4. **`shareable=` history-contents filter silently no-ops** on hierarchical/concrete top-level stores.
5. **Hierarchical privacy agreement is an `assert`** (`:1752-1755`) — disabled under `python -O`,
   and raises `AssertionError` rather than a `ConfigurationError` on misconfiguration.
6. **`to_library_dataset_dataset_association` raises a bare `Exception`** (`model/__init__.py:6298`)
   → surfaces as a 500, unlike every other `ensure_shareable` site.
7. **`dataset_is_private_to_a_user` docstring is wrong** — copied from its sibling, says "the current
   user's private role" for a method with no user context (`security.py:1158-1163`).
8. **`requires_shareable_storage` reloads permissions in the job layer** — acknowledged in-code as
   avoidable if computed at job creation.
9. **pgcleanup cannot resolve `user_objects://`** backends.
10. **API layer calls a private manager method** — `api/object_store.py:87` reaches
    `object_store_instance_manager._to_model(...)`.
11. **Privacy downgrade on relocation is a warning, not a block.**

## Related Notes

- [[Component - Data Fetch]] — upload/import is a major producer of datasets needing an
  `object_store_id`; the `require_shareable` gate fires on upload jobs
- [[Component - Workflow API]] — invocations carry `preferred_object_store_id` (and split
  output/intermediate stores), the outermost tier of the preference cascade
- [[Component - User-Defined Tools]] — closest structural sibling; same enforced-vs-convention tension
- [[Component - DRS Support]] — user file sources share `_config_templates.py` and `HasConfigTemplate`
- [[Dependency - Pydantic Discriminated Unions]] — why a `private` key cannot be smuggled through a template
- [[Component - UI Error Handling]] — `CANNOT_SHARE_PRIVATE_DATASET_MESSAGE` and error code `400008`
- [[Component - API Tests]] — `DatasetPopulator.selectable_object_stores()` / `create_object_store()`
- [[Component - E2E Tests - Writing]] — the BYOS preferences UI surface
