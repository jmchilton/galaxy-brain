# Test Job Validation Plan

Follow-up to galaxyproject/galaxy#18884. That PR modeled `TestJob.outputs` but left `TestJob.job: JobDict = Dict[str, Any]` unvalidated. Goal: validate the `job:` block with a schema modeled on what the `*.gxwf-tests.yml` / Planemo `*-tests.yml` format *should* contain — not what the legacy input-staging helpers accept. Starting point is mvdbeek's XSD-derived `lib/galaxy/tool_util/schemas/job.py` @ `805f429342f`; this plan extends it only with fields we actually see in real workflow tests.

## Guiding principle

The schema defines the canonical workflow-test job syntax. It is NOT a spec of every dict shape `load_data_dict` / `stage_inputs()` / `populators._elements_to_test_data` happens to consume — those helpers are called from many sites (tool tests, workflow tests, API upload, IWC) and have accreted tolerances over the years. Schema strictness is the forcing function that cleans those up at the fixture layer.

Concretely: the `type: File | Directory | raw` + `value` / `content` form that several of Galaxy's own `gxwf-tests.yml` files use is a helper artifact — we migrate those fixtures to CWL-style rather than model the form.

### IWC verification

Before finalizing "legacy `type:` syntax is local leftover, not schema territory", we audited galaxyproject/iwc (`~/projects/repositories/iwc/workflows`, 119 `*-tests.yml` / `*-test*.yml` files):

- `type: File | Directory | raw` in a `job:` block — **0 hits**.
- `content:` as a job input key — **0 hits**.
- `file_type:` (legacy alternative to `filetype:`) — **0 hits**.
- All `value:` matches across IWC live inside output-assertion blocks (`has_size`, `has_n_lines`, etc.), never inside `job:`.

IWC is 100% CWL-style (`class: File` / `class: Collection`, `path:`, `filetype:`, `identifier`, `collection_type`, `elements`). The legacy `type:` / `value:` / `content:` inputs exist only in `lib/galaxy_test/workflow/` — genuine local leftovers. Safe to exclude from the schema.

**The final commit message MUST mention this audit**, so a future reader doesn't need to re-derive why the legacy forms were left unmodeled.

## Motivation

- PR 18884 replaced closed PR 17128 (XSD → `xsdata` → pydantic). 18884 is cleaner but lost the job-side coverage.
- galaxy-workflows-vscode's `tests.schema.json` still carries the 17128-era job models. When `galaxy-tool-util-ts` ports the new Pydantic schema for linting, those shapes regress unless Galaxy provides them.
- Typos in `job:` are a common source of latent test bugs — caught only when the test runs. Schema catches them at lint time.

## Scope

In:
- Validation of `job:` values in `*.gxwf-tests.yml` and Planemo `*-tests.yml` via `validate-test-format`.
- Migration of in-tree `lib/galaxy_test/workflow/*.gxwf-tests.yml` fixtures that currently use the legacy `type:` form.

Out:
- Modeling the legacy `type: File|Directory|raw` / `value` / `content` input syntax. That lives only in helpers; helpers still accept it; we don't bless it in the schema.
- Semantic cross-check that job keys match workflow inputs (belongs in vscode linter).
- Widening `TestJobDict` (TypedDict) — stays `Dict[str, Any]` for helper-side loose access.

## Current state

`lib/galaxy/tool_util_models/__init__.py`:

```python
JobDict = Dict[str, Any]

class TestJob(StrictModel):
    doc: Optional[str]
    job: JobDict
    outputs: Dict[str, TestOutputAssertions]
    expect_failure: Optional[bool] = False
```

`TestJobDict` (TypedDict) also uses `JobDict`.

21 of 44 files in `lib/galaxy_test/workflow/*.gxwf-tests.yml` use the legacy `type: ...` form; these need migrating before the stricter schema lands.

## Reference: Marius' model

`job.py` @ `805f429342f` models only CWL-style inputs:

- `BaseFile` with `class: Literal["File"]`, `filetype`, `dbkey`, `decompress`, `to_posix_line`, `space_to_tab`, `deferred`, `name`, `info`, `tags`.
- Three file variants via `location` vs `path` vs `composite_data`.
- `Collection` with `class: Literal["Collection"]`, `collection_type`, `elements`.
- `CollectionElement` for nested collections.
- `Job = RootModel[AnyJobParam]` where `AnyJobParam = Union[dict[str, Optional[Union[JobParamTypes, list[JobParamTypes]]]], str]` and `JobParamTypes = Union[str, int, float, bool, Collection, File]`.

This is the baseline. Deviations below are additive or hygienic.

## Target model

Port into new module `lib/galaxy/tool_util_models/test_job.py` (keeps `__init__.py` lean; matches the pattern used for `tool_outputs.py`).

### Changes vs. Marius' 2023 version

1. **Add `hashes` to `BaseFile`** — `list[HashEntry]` where `HashEntry = {hash_function: Literal[...], hash_value: str}`. Widespread in IWC.
2. **Add `identifier` to `BaseFile`** — not only on `*Element` forms. The IWC `SampleMetadata` pattern attaches an `identifier` to a top-level File, and current helpers accept it.
3. **Collapse `*FileElement` duplication** — Marius' version re-declared `location`/`path`/`composite_data` on each element variant. Replace with a single `BaseFile` plus an optional `identifier`; gate the element-vs-standalone distinction at the union level, not via parallel classes.
4. **Use Galaxy's `StrictModel`** — the one in `tool_util_models/__init__.py` (`extra="forbid"` + field title generator). Drops the bespoke `Model` class.
5. **Modernize typing** — lowercase `list[...]` / `dict[...]`; `Annotated`, `Literal` from `typing_extensions` to match `tool_outputs.py`.
6. **Tighten `collection_type`** — reuse the existing `CollectionType` annotated alias from `__init__.py` (`list`/`paired`/`paired_or_unpaired`/`record`/`sample_sheet`, colon-nested). Today Marius' schema lets `collection_type` be any string.
7. **Discriminated union on `class`** — `Annotated[Union[File, Collection], Field(discriminator="class_")]` for value-level dispatch. Requires `populate_by_name=True` in each model's `ConfigDict` so both `class` (YAML) and `class_` (Python) resolve.
8. **Drop `RootModel` subclassing** — use `Job = RootModel[Dict[str, JobParamValue]]` generic per pydantic v2 idiom. No subclass of `RootModel`.
9. **Fix the top-level `AnyJobParam`** — Marius had `Union[dict[...], str]` on `Job.root`, which allows the entire `job:` block to be a bare string. It's never a string in the wild; top-level is always `Dict[str, JobParamValue]`. Scalars live as *values* under the dict, not as the dict itself.
10. **Typed lists, not bare `list`** — a job-param value can be a typed `list[JobParamValue]` (list-of-files for `data_collection` params without nesting, list-of-scalars for `multiple` text, etc). Never a bare untyped `list`.

### Union structure

```python
FileT = Annotated[Union[LocationFile, PathFile, CompositeDataFile], ...]
# Collection.elements items: nested Collection or File-with-identifier
CollectionElementT = Annotated[Union[Collection, FileElement], Field(discriminator="class_")]
# Where FileElement = FileT intersected with required identifier (or FileT + validator)

JobParamValue = Union[
    FileT,                         # class: File (with path | location | composite_data)
    Collection,                    # class: Collection + elements
    str, int, float, bool, None,   # scalars for text/int/float/bool/select params
    list["JobParamValue"],         # typed list (e.g., multiple data / multiple text)
]

Job = RootModel[Dict[str, JobParamValue]]
```

Discriminator handling: `class: File` / `class: Collection` is the only discriminator. Scalars (and `None`) dispatch by type. There is no structural fallback for `type: ...` / `value:` / `content:` / `elements` without `class:` — those raise validation errors.

`composite_data` — keep. Zero IWC hits today but it's part of the documented CWL-style input syntax supported by `stage_inputs` / upload; cheap to model.

`deferred: true` — keep as `Optional[bool]` on `BaseFile`. Don't enforce the `location`-only constraint with a model_validator in v1; leave as semantic rule and document.

`hashes` algorithms — align with `galaxy.util.hash_util.HASH_NAMES`. Resolve the exact enum when writing the model; do not invent a new set here.

## Migration: lib/galaxy_test/workflow fixtures

Before switching `TestJob.job` to the strict model, migrate all legacy-form inputs in `lib/galaxy_test/workflow/*.gxwf-tests.yml`:

| Legacy                                           | Migrated                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| `type: File, value: X, file_type: Y`             | `class: File, path: test-data/X, filetype: Y`          |
| `type: File, content: "..."`                     | `class: File, path: <fixture>` (write the content out) |
| `type: Directory, value: X, file_type: Y`        | `class: File, path: test-data/X, filetype: Y` (bwa_mem2_index case) |
| `type: raw, value: V`                            | Bare scalar `V` (including `null`, `""`, booleans). Framework runner's `test_data_format="cwl_style"` routes these as literal params via `stage_inputs`. |
| `collection_type: L, elements: [{content: C, identifier: I}]` | `class: Collection, collection_type: L, elements: [{class: File, identifier: I, path: <fixture>}]` |

Use `grep -l "type:" lib/galaxy_test/workflow/*.gxwf-tests.yml` (21 files) as the work list. Land migrations as their own commit ahead of the model switch so bisection against the test suite stays clean.

For the `content:` cases (inline string → dataset), either (a) promote to a checked-in `test-data/` file, or (b) skip — these tests are small enough to convert to a file on disk.

## Integration

1. `lib/galaxy/tool_util_models/test_job.py` — new module. Exports `Job`, `LocationFile`, `PathFile`, `CompositeDataFile`, `Collection`, `CollectionElement`, `HashEntry`.
2. `lib/galaxy/tool_util_models/__init__.py`:
   - `from .test_job import Job`
   - `TestJob.job`: `JobDict` → `Job`.
   - Keep `JobDict = Dict[str, Any]` alias as deprecated shim in case external code imports it (grep the repo first — if unused, remove).
3. `lib/galaxy/tool_util/validate_test_format.py` — no code change; stricter errors flow through automatically.
4. Re-export `Job` from `galaxy.tool_util_models` top-level so downstream (`galaxy-tool-util-ts`) can import it alongside `Tests`.
5. `lib/galaxy_test/base/populators.py` — add `test_data_format: Optional[Literal["cwl_style"]] = None` param to `WorkflowPopulator.run_workflow` (see Runtime dispatch below). No behavior change when unset.
6. `lib/galaxy_test/workflow/test_framework_workflows.py` — pass `test_data_format="cwl_style"` when invoking `run_workflow`, so migrated `.gxwf-tests.yml` fixtures take the strict path.

## Runtime dispatch

`WorkflowPopulator.run_workflow` is the single entry point for both `.gxwf-tests.yml`-driven framework tests and the ~290 procedural API tests in `lib/galaxy_test/api/test_workflows.py` (plus `workflow_fixtures.py` embedded `test_data:` blocks). The two call-sites disagree on bare-scalar semantics:

- **Legacy (API tests / `workflow_fixtures.py`):** bare string → upload as dataset with that content. Baked into `load_data_dict` @ `populators.py:4184-4188`. `type: raw` + `value:` is the explicit escape hatch for scalars-as-params.
- **Post-migration (framework tests):** bare scalar → literal param for `int`/`text`/`bool`/`select` workflow inputs. Datasets always carry `class: File` (or `class: Collection`). No heuristic needed — the fixture is unambiguous.

The dispatch inside `run_workflow` cannot distinguish a legacy bare-string (`text_input: |\n a\n b\n c`) from a post-migration scalar param (`threshold: 0.5`) without more signal. An earlier WIP tried a `not any(isinstance(v, dict) ...)` heuristic — it inverted semantics for every legacy multi-line-string dataset input and broke a large swath of API tests.

**Approach:** explicit signal from the caller.

- New `run_workflow` kwarg: `test_data_format: Optional[Literal["cwl_style"]] = None`.
- When `None` (default, all current callers): preserve today's behavior — `_uses_class_syntax()` auto-detect → `stage_inputs`; otherwise → `load_data_dict`. API tests and `workflow_fixtures.py` are untouched.
- When `"cwl_style"`: route via `stage_inputs` with bare scalars extracted up front as literal params (the same bare-scalar carve-out the WIP tried to add, but gated behind the explicit opt-in so it can't fire on legacy data). `type: File|raw|Directory` dict forms are rejected at this layer with a clear error referencing the schema.
- `test_framework_workflows.py` sets `test_data_format="cwl_style"` on every invocation. After fixture migration, no `.gxwf-tests.yml` can reach the `load_data_dict` path.

This keeps the schema strict (Pydantic `Job` rejects legacy forms in `.gxwf-tests.yml`), keeps `load_data_dict` behavior frozen for API callers, and removes the runtime ambiguity without a heuristic.

## Test strategy (red-to-green)

Add in `test/unit/tool_util/test_test_format_model.py`. Build fixtures in `test/unit/tool_util/test_data/test_job_fixtures/`:

### Positive fixtures (one per union arm)

- `file_path.yml` — `class: File` + `path`.
- `file_location.yml` — `class: File` + `location` + `hashes`.
- `file_composite.yml` — `class: File` + `composite_data`.
- `file_with_tags_and_dbkey.yml` — full `BaseFile` field coverage.
- `collection_list.yml` — `class: Collection`, `collection_type: list`.
- `collection_paired.yml` — `collection_type: paired`.
- `collection_nested.yml` — `collection_type: list:paired`, collection-of-collections.
- `scalars.yml` — string, int, float, bool, null values mixed in one job.
- `list_of_files.yml` — `multiple` data param as typed list of `class: File`.
- `list_of_scalars.yml` — `multiple` text param as typed list of str.

### Negative fixtures (must fail validation)

- `neg_legacy_type_file.yml` — `type: File` with `value:` (the form we're rejecting).
- `neg_legacy_type_raw.yml` — `type: raw` with `value:`.
- `neg_elements_without_class.yml` — `collection_type` + `elements` with no `class: Collection`.
- `neg_file_no_path_or_location.yml` — `class: File` with neither `path`, `location`, nor `composite_data`.
- `neg_unknown_field.yml` — extra key inside a File (catches typos via `extra="forbid"`).
- `neg_bad_collection_type.yml` — `collection_type: banana`.
- `neg_top_level_not_dict.yml` — `job:` value is a bare string.

### Regression sweeps

- `test_validate_workflow_tests` already globs `lib/galaxy_test/workflow/*.gxwf-tests.yml`. After migration + model switch, must pass without a skip list.
- `test_iwc_directory` (env-gated `GALAXY_TEST_IWC_DIRECTORY`): must continue passing. Use the existing `IWC_WORKFLOWS_USING_UNVERIFIED_SYNTAX` list to park any novel failures until IWC-side PRs land.

### Red-green order

1. Add `test_data_format="cwl_style"` param to `run_workflow` and wire `test_framework_workflows.py` to pass it. No-op for all other callers; framework tests still pass because current fixtures are still legacy-form and the auto-detect path handles them when the kwarg is None — switch to the new path happens in step 2.
2. Land migration commit for the 21 legacy fixtures. Framework runner now uses the strict path; API tests untouched.
3. Author positive + negative fixture tests — they fail against `Dict[str, Any]` for the negative cases (since nothing is checked).
4. Implement `test_job.py` arm by arm; flip `TestJob.job` to `Job`; negative cases start failing as expected.
5. Run `test_validate_workflow_tests`, `test_iwc_directory`, and the full framework-workflows suite — iterate model on any surprise.
6. Sanity sweep a sample of `test_workflows.py` API tests (e.g. `test_run_workflow`, `test_run_workflow_with_output_collections`) to confirm the `None`-default path is unchanged.

## Validation rollout

- `packages/tool_util/setup.cfg` already ships `validate-test-format` CLI — gains stricter errors; no new invocation needed.
- Changeset: minor bump on `galaxy-tool-util` (tightens validation surface; API unchanged).
- IWC hook: after merge, run `validate-test-format` across IWC. File upstream issues/PRs for any failures; 18884 landed with an empty skip list, so expect only a small number.

## Port to galaxy-tool-util-ts (downstream)

Once merged, `galaxy-tool-util-ts` `make sync-test-format-schema` can export `Job.model_json_schema()` alongside `Tests.model_json_schema()`. Replaces the hand-vendored 17128-era shapes in galaxy-workflows-vscode. No TS-side changes in this plan.

## Open questions

- `hashes` enum — pin to `galaxy.util.hash_util.HASH_NAMES` or `DatasetHash` DB enum? (IWC ships MD5, SHA-1, SHA-256 commonly.)
- `deferred: true` + `path:` — enforce mutual exclusion at the model layer or leave as doc-only?
- `class` casing — IWC is strict `File` / `Collection`; keep strict (reject lowercase)?
- `name` on `BaseFile` vs `identifier` on `BaseFile` — both exist; confirm they're distinct (history name vs collection element id) before merging onto one class.
- `TestJobDict` (TypedDict) — leave `Dict[str, Any]`? (Helpers are loose by design; typed version is not free.)
- Does `composite_data` need a `CompositeDataFileElement` too, or does the collapsed `BaseFile + identifier` approach cover it? Verify against any IWC composite collection examples.
- Drop the `JobDict = Dict[str, Any]` alias entirely, or keep as a deprecated shim? (grep-first.)
- `test_data_format` param naming — `"cwl_style"` matches existing `_uses_class_syntax` vocabulary; alternatives: `"strict"`, `"gxwf"`. Pick before landing.
- Should `test_data_format="cwl_style"` also run Pydantic `Job` validation on the incoming dict at runtime, or trust that `validate-test-format` already did? (Cheap double-check vs. duplicated cost.)
- Any non-framework call-sites that should opt in to the strict path (CWL test runner, Planemo in-repo glue)? Sweep before declaring migration done.
