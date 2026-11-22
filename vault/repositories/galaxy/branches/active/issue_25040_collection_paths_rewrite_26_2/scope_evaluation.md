Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly, by one small fix in the loop the branch already rewrote.** Keep everything as implemented at `cd4d46bb801` on `release_26.2`: the accessor fix, the nested `include_collection_name` fix, the input-only metadata rewrite, the deleted model property, and the renamed integration test. Add one more fix. `get_all_staging_paths` still shortens every identifier segment by the collection name's length, though the name has been its own path segment since the nested fix. The re-scope review and the thermo review both recorded this, and it was left only because the branch targets a release, which is not a reason to stay narrow. I confirmed two symptoms at head. A 240-character identifier is cut to `xxx…..bam` when "Include the collection name" is set, but kept whole without it. A collection name of 252 characters raises `AssertionError: Could not stage element, element identifier is too long`, so `export_remote` fails, even though HDCA names can be up to 255 characters. Fix it in `fece82a987e`: drop the name allowance, and reserve room for the extension only in the last segment. That commit already changes the `export_remote` layout and applies cleanly to `release_25.1` through `26.1`. Filenames change only for identifiers longer than about 240 characters, and the baseline test that pins the allowance gets one assertion updated. Two optional extras are small enough to go in the same pass: take the staging extension from `row.element.file_ext` instead of a second registry lookup, and pass `export_type|incollection` in the neighbouring `export_remote` test. Leave the other recorded pre-existing problems out. They are the Pulsar INFO log, the constructor's per-pair queries, `get_datasets_for_group`, the `MetadataWrapper` output guard, `consumes_identifiers`, and #25012's `load_contents`. Each one is outside the touched code, already in mvdbeek's drafts, or unreachable. Both drafts (#25021, #25023) are unchanged since round 1, so the reconciliation plan stands.

## Possible Decompositions

The branch is +449/−88 across 9 files: about 100 lib lines changed, and the rest is tests. The history has 6 commits:

1. `777d96e2af9` Baseline tests (+106, tests only, green on base)
2. `fece82a987e` Nested `include_collection_name` prefix, with the `export_remote` integration test (+40/−13)
3. `023fd402d11` Extract `_job_metadata_path` (refactor, +11/−4)
4. `39d9792a984` Collection staging JSON zipped from rows (refactor, +11/−14)
5. `e486edd1465` Accessors built from element wrappers, caches added, model property deleted (refactor, +53/−58)
6. `cd4d46bb801` The fix and its tests: `str(element)`, input-only metadata rewrite, functional tool, Pulsar integration test (+234/−5)

- **Option A, one PR.** All 6 commits, in their current order. The commit order already separates the steps for a reviewer.
- **Option B, two PRs.**
  1. Commits 1–2 (plus the allowance fix, if taken): an `export_remote` / staging-layout PR. It doesn't depend on the compute-environment fix and could target `release_25.1`, because the lib hunk applies there unchanged.
  2. Commits 3–6 on top: the #25040 fix, which is the part that overlaps #25023.
- **Option C, three PRs.**
  1. Commit 1 alone, the "Baseline tests" PR.
  2. Commit 2, the staging-layout fix.
  3. Commits 3–6, the #25040 fix.
- **Option D, separate the refactor from the fix.**
  1. Commits 1, 3, 4, 5: no behavior change. The model property is deleted and the rows come from the wrappers, with Galaxy-side paths. The byte-identical DB check in `baseline_refactor.md` backs this.
  2. Commit 2.
  3. Commit 6, a 19-line `wrappers.py` change plus tests.

  This gives reviewers the structural diff by itself. The cost is that the first PR changes code with no visible user benefit.
- **Option E, by surface (would need re-splitting commits).**
  1. Single-dataset metadata files: commit 3, the `_job_metadata_files` part of 5, and the dataset half of 6.
  2. Collection accessors.

  The commits interleave the two surfaces now, so this costs a rebase.

## Scopes considered

### 1. As implemented (`cd4d46bb801`)

Collection `all_paths` / `all_metadata_files` / `get_all_staging_paths` / `serialize()` / `data_style="paths"|"staging_path_and_source_path"` and single-dataset `all_metadata_files` are built from the element `DatasetFilenameWrapper`s, so they follow `input_path_rewrite` / `input_metadata_rewrite`, for inputs only. The nested `include_collection_name` prefix is written once. The model property is deleted, and paths and metadata files are cached per wrapper.

| Pros | Cons |
|---|---|
| <ul><li>Covers every ❌ row in the issue table, and `all_paths` matches `#for $e` by construction</li><li>Unblocks #23986 P2 1 (crypt4gh's non-one-to-one rewrites)</li><li>Better than #25023's copy of the same fix: keeps repeated identifiers, doesn't stage metadata for paths-only accessors, never hands out the cached list</li><li>No commit is slower than base; four review rounds, red/green verified</li></ul> | <ul><li>Leaves a confirmed bug in the `get_all_staging_paths` loop it rewrote (scope 2)</li><li>Still conflicts with #25023 in `wrappers.py`; the PR description has to name it</li></ul> |

### 2. Recommended: as implemented, plus dropping the stale collection-name length allowance

In `get_all_staging_paths`, stop shortening each identifier by `len(name) + 1`, and reserve the extension's length only in the last segment. Fold this into `fece82a987e`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a reachable crash: `export_remote` with "Include the collection name" asserts for names of about 250 characters or more (HDCA `name` is `TrimmedString(255)`)</li><li>Stops truncating long identifiers that fit; the collection name is already capped at 255 by `filesystem_safe_string`'s default</li><li>Same lines and commit as the nested fix, which already changes the layout; still backportable</li><li>Removes the "kept so existing layouts don't change" comment, which explains a known-wrong number</li></ul> | <ul><li>Changes export filenames for identifiers longer than about `254 − len(ext) − len(name) − 1` characters</li><li>Means one more review pass, and parks the branch for John's decision</li><li>The crash needs a very long collection name, so it is rare</li></ul> |

<details>

Verified at head with `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/c004b6a4-a500-42b4-a346-fa925c0e1502/scratchpad/check_name_allowance_scope2.py`, which builds a `list` with the branch's test helpers:

```
240-char id, name 'mycollection': [12, 242] xxxxxx...bam
same without name: [244]
252-char name -> AssertionError: Could not stage element, element identifier is too long
```

The fix shape: compute `max_len = 254 - len(extension)` for the last identifier, use the default 255 for intermediate identifiers, and drop the `assert`, which can then fail only for a 254-character extension. `test_collection_wrapper_staging_paths_with_the_collection_name` pins the current allowance, so its long-identifier assertion changes, and a 250-character-name case can be added there. Flat lists with identifiers of normal length stay byte-identical.

</details>

### 3. Optional add-on: take the staging extension from the element wrapper

Replace the `datatypes_registry.get_datatype_by_extension(...)` / `file_ext_export_alias` lookup in `get_all_staging_paths` with `row.element.file_ext`. That is the route `DatasetFilenameWrapper.get_staging_path` already uses (thermo's "extension alias computed two ways").

| Pros | Cons |
|---|---|
| <ul><li>One route to the staging extension; the loop sheds a registry lookup and a `getattr`</li><li>Same loop as scope 2</li></ul> | <ul><li>Cleanup, not a fix: `vcf_bgzip` (`vcf.gz`) is the only alias, and both routes agree for every datatype today</li><li>`file_ext` reads the global model registry, while the collection uses the injected one; they are the same object in practice, but nobody has verified that for remote tool evaluation</li></ul> |

### 4. Optional add-on: correct the neighbouring `export_remote` test's parameter

`test_export_remote_tool_collection_structure` passes `export_type|infiles` for a collection export. It passes only because `incollection` defaults to the newest HDCA. The new sibling test passes `incollection`.

| Pros | Cons |
|---|---|
| <ul><li>One word in a file the branch already edits; the test then exercises what it claims to</li></ul> | <ul><li>Test-only and unrelated to #25040</li></ul> |

### 5. Contract: drop the accessor fix in favor of #25023

| Pros | Cons |
|---|---|
| <ul><li>No `wrappers.py` conflict</li></ul> | <ul><li>#25023 is still a large draft about remote tool evaluation, last updated 2026-11-21, and its `fee0cf0ff4` is unchanged: it still keys on `__element_instances` (drops repeated identifiers), builds metadata for `all_paths` (over-staging), and returns its cached list</li><li>#23986 needs the accessor fix whether or not remote evaluation lands</li></ul> |

### 6. Contract: split the nested-prefix commit out of this PR

The `include_collection_name` fix (and scope 2, if taken) becomes its own PR, possibly on an older release.

| Pros | Cons |
|---|---|
| <ul><li>It is independent of the compute-environment fix, and its lib hunk applies cleanly to `release_25.1`, `26.0` and `26.1`</li><li>Shrinks the PR that overlaps #25023</li></ul> | <ul><li>Two PRs for John to shepherd; it's a packaging choice (Decompositions, Option B), not a scope change</li></ul> |

### 7. Pulsar `input_metadata_rewrite`: lower the INFO log to debug and return early on a repeat

| Pros | Cons |
|---|---|
| <ul><li>5,000 fewer INFO lines per job for a 5,000-BAM collection</li></ul> | <ul><li>`pulsar.py` isn't touched by the branch, and #25021 (the return path) and #25023 (the signature) both edit this function</li><li>Predates the branch; with the per-wrapper cache, the branch calls it no more often than `#for $e … $e.metadata.bam_index` does</li></ul> |

### 8. Eager-load collection elements in the wrapper constructor

| Pros | Cons |
|---|---|
| <ul><li>The real scaling cost: 8 queries per pair (40,002 at 5,000 pairs)</li></ul> | <ul><li>Predates the branch and is unchanged by it; a loading-strategy change belongs on `dev` with its own measurements</li></ul> |

### 9. `DatasetCollectionWrapper.get_datasets_for_group`: reuse the element wrappers, and cache empty groups

| Pros | Cons |
|---|---|
| <ul><li>Removes a second wrapper-building route; `if not cache.get(group)` recomputes groups that matched nothing</li></ul> | <ul><li>Not a path bug: it passes `**self.kwargs`, compute environment included, so its paths are rewritten</li><li>A method the branch doesn't touch; group lookups flatten through `collection.dataset_elements` and read tags, a different job from the path accessors</li></ul> |

### 10. Guard `MetadataWrapper` file params for outputs as `all_metadata_files` now is

| Pros | Cons |
|---|---|
| <ul><li>`$output.metadata.<file>` and `$output.all_metadata_files` would agree</li></ul> | <ul><li>Unreachable: `FileParameter.make_copy` copies a metadata file only when the target dataset already exists in the object store, so `metadata_source` outputs have no metadata files at evaluation time</li><li>#25023 rewrites that method and leaves it unguarded too</li></ul> |

### 11. Shared per-file metadata resolver for `MetadataWrapper` and `all_metadata_files` (Codex P3)

| Pros | Cons |
|---|---|
| <ul><li>Saves one path-mapper call per file when a template uses both</li></ul> | <ul><li>No wrong output, because Pulsar keys staging by Galaxy path; adds structure to a method #25023 is rewriting</li></ul> |

### 12. Set `consumes_identifiers` when staging paths embed identifiers

| Pros | Cons |
|---|---|
| <ul><li>The flag would reflect what the template used</li></ul> | <ul><li>Unchanged by the branch: identifiers came from the model before and from the constructor's list now, and neither sets it</li><li>Collection job-cache matching already compares element identifiers at every level; the remaining case (a mapped-over subcollection's own name) is narrow and a job-search question</li></ul> |

### 13. Fold in #25012 (`load_contents` reading the compute-side path)

| Pros | Cons |
|---|---|
| <ul><li>The mirror-image bug, in `wrapped_json.py`</li></ul> | <ul><li>Already the same commit (`7609167e34`) in both #25021 and #25023; a third copy would only add conflicts</li></ul> |

### 14. Close the `all_metadata_files[i]`-in-a-loop gap (still about 6x base)

| Pros | Cons |
|---|---|
| <ul><li>Fully matches base performance</li></ul> | <ul><li>Needs shared inner lists (which templates could mutate, as on base) or deep copies (no faster); a public code search found no template using the pattern</li></ul> |

### 15. Base branch

| Pros | Cons |
|---|---|
| <ul><li>**`release_26.2`:** where #25021 / #25023 target; ships in 26.2.0; the change moves query and caching behavior in widely used accessors</li><li>**Older:** the bug exists on every supported release</li></ul> | <ul><li>**`release_26.2`:** 25.1–26.1 stay broken for `rewrite_parameters: true` and remote Pulsar</li><li>**Older:** the accessor fix would conflict with the drafts when merged forward</li></ul> |

<details>

Keep `release_26.2` for the accessor fix. If John wants older coverage, the nested-prefix commit (with scope 2) is the piece that backports cleanly, per Option B or scope 6.

</details>

### 16. Already settled in round 1, still holding

- **Keep the model property** (`DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`). Still no callers, and its name invites the bug back, so keep the deletion. The PR description should say this departs from the issue text.
- **Adopt #25023's `input_metadata_rewrite(dataset, metadata_name, metadata_file)` signature.** No: it changes an interface that #23986 also overrides, and `_job_metadata_path` keeps the call in one place.
- **Other tool-facing accessors.** Round 1's audit found no other bypass that needs to join. The CWL `archive_location` and crypt4gh `$input.ext` (#23986 P3 1) stay out of scope.
