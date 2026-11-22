Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly.** Keep the fix as implemented on `release_26.2`, including the model property deletion, and add two things. First, fix the nested-collection `include_collection_name` bug in `get_all_staging_paths`. I confirmed it in the scratchpad: a `list:paired` input named `input1` stages as `input1/sample1/input1/forward.bam`. It sits in the loop the branch already rewrote, and the fix is a few lines plus one assertion in the existing baseline test. Second, reconcile with mvdbeek's two open draft PRs on `release_26.2`, which none of the debriefs mention. #25023 (commit `fee0cf0ff4`, "Resolve staged source paths through the compute environment") makes the same accessor fix in `wrappers.py`, but it still has three bugs this branch already fixed: elements with repeated identifiers are dropped, metadata files are built for `all_paths`, and the returned list can be mutated. #25021 adds a file with the same path as this branch's integration test, `test/integration/test_pulsar_embedded_rewrite_parameters.py`. So: rename the integration test module, limit `_job_metadata_path` to input wrappers as #25023 does, and name the overlap in the PR description so #25023 can drop `fee0cf0ff4` and rebase. Leave the other pre-existing gaps for separate changes: the Pulsar INFO log and memo, constructor eager loading, the `consumes_identifiers` question, and #25012's `load_contents`, which is already the same commit in both of mvdbeek's PRs.

## Possible Decompositions

The branch is about 365 added and 75 removed lines; roughly 65 added lib lines and the rest tests. History: baseline tests, two behavior-preserving refactors, the fix, then the per-wrapper metadata cache.

- **Option A, along the existing commits.**
  1. Baseline tests plus both refactors (`_job_metadata_path` extraction; collection staging JSON zips staging paths with rows and shares `_metadata_files_to_staging_path_and_source_path`). No behavior change.
  2. The fix plus the cache. The cache can't land after the fix without a window where `serialize()` re-queries every metadata file on each call (performance debrief: 10,000 queries per `serialize()` at 5,000 pairs).
- **Option B, by surface.**
  1. Single-dataset metadata files: `_job_metadata_path`, `DatasetFilenameWrapper.all_metadata_files` through `input_metadata_rewrite` with its cache, and the single-dataset unit tests. Fixes the four single-dataset rows of the issue table.
  2. Collection accessors: `_dataset_elements_with_identifiers`, the parallel identifier list, the `wrapped_json.py` restructure, deleting the model property, `collection_input_paths.xml`, and the integration test.
- **Option C, if the expansion is taken.** Land the `include_collection_name` fix first as its own small PR (it doesn't depend on the fix and could target an older release), then A or B.

## Scopes considered

### 1. As implemented

Collection `all_paths`, `all_metadata_files`, `get_all_staging_paths`, `serialize()` and `data_style="paths"|"staging_path_and_source_path"`, plus single-dataset `all_metadata_files` / `serialize()["metadata_files"]`, are built from the element `DatasetFilenameWrapper`s, so they go through `input_path_rewrite` / `input_metadata_rewrite`. The unused model property is deleted, and metadata paths are cached per wrapper.

| Pros | Cons |
|---|---|
| <ul><li>Covers every ❌ row in the issue table; one source of truth, so `all_paths` matches `#for $e` by construction</li><li>Fixes crypt4gh's non-one-to-one rewrites, which text substitution can't (#23986 P2 1)</li><li>Paths-only accessors no longer cost queries or stage metadata files; net structure deleted</li><li>Already handles repeated identifiers and mutation of the returned list, both of which #25023 gets wrong</li></ul> | <ul><li>Leaves a confirmed bug in the loop it rewrote (scope 2)</li><li>Conflicts with #25023 in `wrappers.py` and with #25021 on the integration test path</li><li>`_job_metadata_path` calls `input_metadata_rewrite` for output wrappers too; #25023 limits it to inputs</li></ul> |

<details>

Intended behavior changes, all matching `#for $e`: output collections use `output_path_rewrite`, LDDA elements are included, and an unmaterialized deferred element renders its URI. These are listed in the initial debrief and the normal review, and the PR description should repeat them.

</details>

### 2. Recommended: as implemented + nested `include_collection_name` fix + reconciling with #25021/#25023

Make the collection-name prefix apply once at the top of the staging path, not at every identifier level. Also rename the integration test module, guard metadata rewrites to input wrappers, and say in the PR description that the branch overlaps #25023.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real export bug in the code the branch touched: `export_remote` with "Include the collection name" on a nested collection writes `input1/sample1/input1/forward.bam`; the bug dates from `ee63fcc736d` (2021)</li><li>Small change; the baseline test helper `_list_paired_wrapper` already builds the failing case</li><li>Avoids an add/add conflict with #25021 and lines up the hook call with #25023, so whichever lands second rebases cleanly</li></ul> | <ul><li>Changes the export layout for anyone who relied on the doubled prefix (unlikely; `test_export_remote_tool_collection_structure` leaves the option off)</li><li>A re-scope cycle (alt branch, review) for a few lines</li></ul> |

<details>

Verification: `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/c004b6a4-a500-42b4-a346-fa925c0e1502/scratchpad/check_include_collection_name.py`, run with the branch's `_list_paired_wrapper`, prints:

```
default: ['sample1/forward.bam', 'sample1/reverse.txt']
include_collection_name: ['input1/sample1/input1/forward.bam', 'input1/sample1/input1/reverse.txt']
```

The cause is at `wrappers.py:844-851`. Inside `for element_identifier in element_identifiers`, both the `max_len` reduction and the `f"{name}{sep}{identifier}"` prefix run once per nesting level. The base has the same loop (`release_26.2` `wrappers.py:809-818`); the branch only changed where the identifiers come from. Fix shape: sanitize the identifiers per level, then prepend the safe collection name once to the joined path, keeping the `max_len` reduction.

Why the overlap matters:

- **#25023** (draft, remote tool evaluation on Pulsar, "Fixes #25012"): commit `fee0cf0ff4` rebuilds `element_identifiers_extensions_paths_and_metadata_files` from the element wrappers. It also routes `DatasetFilenameWrapper.all_metadata_files` through `input_metadata_rewrite`, only when `io_type == "input"`. It changes the hook to `input_metadata_rewrite(dataset, metadata_name, metadata_file)`. Its version walks `self.__element_instances.items()`, which is the identifier dict Codex flagged for dropping repeated identifiers. It keeps the collection-level cache of rows that include metadata files, so `all_paths` stages every metadata file (normal review finding 1). It also returns the cached list itself. If this branch lands first, #25023 drops that part of `fee0cf0ff4` and changes one call in `_job_metadata_path` for its new signature.
- **#25021** (draft; mvdbeek called it "quite yucky"): it hands templates the Galaxy-side paths and replaces them with Pulsar paths after evaluation. This is the issue's "rewrite after rendering" alternative. It records each path that goes through `input_path_rewrite` / `input_metadata_rewrite`. Every element wrapper calls `input_path_rewrite` in its constructor, so with #25021 alone the base's `all_paths` would mostly be rewritten afterwards. The repro tool also renders `$e.metadata.bam_index`, which records the same metadata keys. From reading the diff (not run): once #25021 lands, this branch's integration test would probably pass on the base code, and only the unit test with `StagingComputeEnvironment` would still fail without the fix. The fix itself still matters on top of #25021: it covers crypt4gh, metadata files no template renders, and remote Pulsar paths a text pass misses. The two compose, because with #25021 the hooks return Galaxy paths and record the rewrite.

</details>

### 3. Contract: drop the accessor fix in favor of #25023

Stop here and give #25023 the review findings this branch's process turned up: repeated identifiers, over-staging, the mutable cached list, and per-call metadata queries.

| Pros | Cons |
|---|---|
| <ul><li>No duplicate work or merge conflict in `wrappers.py`</li><li>#25023 already owns the hook signature change</li></ul> | <ul><li>#25023 is a large draft about remote tool evaluation, with config and doc changes; its timeline is unknown</li><li>crypt4gh (#23986, on `dev`) needs the accessor fix whether or not remote evaluation lands</li><li>This branch is more correct and better tested in exactly the overlapping part</li></ul> |

### 4. Keep `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`

The issue's proposed approach kept the model property "for callers that need Galaxy paths". The branch deletes it.

| Pros | Cons |
|---|---|
| <ul><li>Smallest public-API change on a release branch (`galaxy-data` package)</li><li>Matches the issue text</li></ul> | <ul><li>No callers in Galaxy, nor in the local planemo, pulsar or gxformat2 checkouts; it was only the wrapper's data source</li><li>Shares its name with the wrapper property, so a future caller could bring the bug back (normal review finding 2)</li><li>Its batched query was redundant with the constructor's loads (performance finding 3)</li></ul> |

<details>

Keep the deletion. The PR description should say it differs from the issue text and why. `dataset_elements_and_identifiers` and `_build_nested_collection_attributes_stmt` stay; other model properties still use them.

</details>

### 5. Set `consumes_identifiers` when `serialize()` embeds element identifiers

The normal review noted that collection staging paths embed identifiers without setting the job-cache flag.

| Pros | Cons |
|---|---|
| <ul><li>Would make the job-cache flag reflect what the template used</li></ul> | <ul><li>Probably not a live bug: from `managers/jobs.py`, collection matching builds path signatures from `element_identifier` at every level (around lines 1032 and 1118), so inner identifiers are already compared</li><li>The remaining case, a mapped-over DCE's own name under `include_collection_name`, is narrow and not fully traced</li><li>A job-search question, not a path-rewrite one</li></ul> |

<details>

Leave it out. If anyone wants to follow up, check whether a cached `export_remote` job with `include_collection_name` on a mapped-over subcollection can be reused for a sibling with a different identifier.

</details>

### 6. Pulsar `input_metadata_rewrite`: lower INFO to debug and short-circuit repeats

Performance finding 4: there's one INFO line per metadata file per wrapper, and the path mapper runs again on each call.

| Pros | Cons |
|---|---|
| <ul><li>Fewer log lines for 10k-element BAM collections</li></ul> | <ul><li>`pulsar.py` isn't touched by the branch, and both #25021 (the same function's return path) and #25023 (its signature) edit this function</li><li>The behavior predates the branch; after the cache, the branch calls it no more than `#for $e ... $e.metadata.bam_index` already did</li><li>Operators may grep for the line</li></ul> |

### 7. Eager-load collection elements in the wrapper constructor

About 8 queries per pair (40,002 at 5,000 pairs) come from lazy loads of `elements`, `element_object`, `hda.dataset`, `tags` and `columns`.

| Pros | Cons |
|---|---|
| <ul><li>The real scaling cost for huge collections</li></ul> | <ul><li>Predates the branch and is unchanged by it</li><li>A separate performance change with its own loading-strategy risks; better on `dev`</li></ul> |

### 8. Fold in the #25012 fix (`load_contents` reading `str(wrapper)`)

The mirror image: Galaxy-side reads in `wrapped_json._json_wrap_input` / `_hda_to_object` open the compute-side path.

| Pros | Cons |
|---|---|
| <ul><li>Same file, same "which side's path" contract</li></ul> | <ul><li>Already the same commit (`7609167e34`, `_galaxy_file_name`) in both #25021 and #25023; duplicating it adds a third copy</li><li>For Pulsar, it only matters together with staging the expression job's files, which #25023 also does</li></ul> |

### 9. Base branch

`release_26.2` (unreleased, latest) vs `release_25.1` / `26.0` / `26.1` (released within the past year, same code) vs `dev`.

| Pros | Cons |
|---|---|
| <ul><li>**26.2:** where mvdbeek's overlapping Pulsar `rewrite_parameters` work targets, which keeps reconciling simple; ships in 26.2.0; the change rewrites widely used tool accessors</li><li>**Older:** the bug exists on every supported release; policy prefers the oldest supported release for clean fixes</li></ul> | <ul><li>**26.2:** 25.1-26.1 stay broken for `rewrite_parameters: true` / remote Pulsar</li><li>**Older:** more intricate than a one-liner and moves query and caching behavior; it would conflict with #25021/#25023 when merged forward</li><li>**dev:** no API or migration change needs it</li></ul> |

<details>

Keep `release_26.2`. If John wants older coverage, the standalone `include_collection_name` fix (Option C) is the piece that would backport cleanly.

</details>

### 10. Other tool-facing path accessors

I audited for other accessors that bypass the compute environment. None needs to join this branch.

| Accessor | Status |
|---|---|
| `$input`, `$input.file_name`, `$input.path`, `$input.extra_files_path` / `files_path`, `$input.metadata.<file>` | Rewritten |
| `paths_as_file`, `DatasetListWrapper`, `get_datasets_for_group` | Iterate wrappers built with the compute environment |
| YAML tool runtime (`tools/runtime.py` `dataset_path`) | Rewritten via `input_path_rewrite` / `input_extra_files_rewrite` |
| `$input.dataset.get_file_name()`, `$input.get_file_name()` (fall through to the model) | Deliberate escape hatch; in-repo uses are Galaxy-side `dynamic_options` reads, which are correct |
| `serialize()` has no extra-files / composite entries | Feature gap, not a bypass |
| CWL `dataset_wrapper_to_directory_json` `archive_location` (`unsanitized.get_file_name()`) | Bypass in experimental CWL code; out of scope |
| `$input.ext` / staging extension for decrypted crypt4gh inputs (#23986 P3 1) | No compute-environment hook exists; belongs to #23986 |

### 11. Adopt #25023's `input_metadata_rewrite(dataset, metadata_name, metadata_file)` signature here

| Pros | Cons |
|---|---|
| <ul><li>Pre-empts the conflict</li></ul> | <ul><li>Changes an abstract interface that `ProtectedInputsComputeEnvironment` (#23986) also overrides</li><li>Driven by remote evaluation's needs, which belong to #25023; `_job_metadata_path` already keeps the call to one place</li></ul> |
