Fix 🎯 #25040 - collection and metadata file accessors hand tools Galaxy's object store paths when the job runs somewhere else.

On a destination that rewrites input paths (Pulsar with `rewrite_parameters: true`), a tool that loops over a collection gets the job's staged copies, but a tool that asks the collection for its paths gets paths that only exist on Galaxy's side:

| What the tool template reads | `release_26.2` | This PR |
|---|---|---|
| `#for $e in $input` → `$e`, `$e.metadata.bam_index` | ✅ | ✅ |
| `$input.all_paths` | ❌ | ✅ |
| `$input.all_metadata_files` (collection) | ❌ | ✅ |
| `$input.serialize()` source and metadata file paths (collection) | ❌ | ✅ |
| `<inputs data_style="paths"/>` and `data_style="staging_path_and_source_path"` config files (collection params) | ❌ | ✅ |
| `$input.all_metadata_files` and `$input.serialize()` metadata files (single dataset) | ❌ | ✅ |

✅ the job's compute-side path · ❌ Galaxy's object store path, missing on the Pulsar host

Every accessor now derives its rows from the per-element wrappers the collection wrapper already builds, so each one returns exactly what `#for $e in $input` renders, and input metadata files go through the same `input_metadata_rewrite` that `$input.metadata.<file>` uses. Output datasets keep their Galaxy-side metadata paths: those files don't exist yet when the command is built, and asking for the rewrite would make Pulsar try to stage them.

***#25048 fixes the same bug with the same core move (paths from the element wrappers), so these two PRs are alternatives, and only one should land.*** This one also:

- **Doesn't stage metadata files a tool never reads.** `all_paths`, `data_style="paths"` and the staging paths never load or rewrite metadata files. With `rewrite_parameters: true`, every `input_metadata_rewrite` call queues that file for transfer to the Pulsar host, so a tool reading only `$bams.all_paths` from 1,000 BAMs would otherwise ship 1,000 unused `.bai` files.
- **Keeps every element when identifiers repeat**, as the old model query did. The wrapper's identifier-to-element dict holds one element per identifier, so rows are built from the element list paired with a parallel identifier list instead.
- **Uses one metadata path rewrite.** `$input.metadata.<file>` and `all_metadata_files` share `_job_metadata_path`, so the two can't drift apart.
- **Loads and rewrites each metadata file once per job.** Rows are cached per collection wrapper and metadata files per dataset wrapper, and each access gets a fresh list so a template can't corrupt the cache.

<details><summary>Also fixed: nested collections exported with "Include the collection name as top level directory?"</summary>

`get_all_staging_paths(include_collection_name=True)` put the collection name in front of every nesting level, so `export_remote` wrote a `list:list` as `mycoll/sample1/mycoll/forward.bam`. It now writes `mycoll/sample1/forward.bam`, which is what the option promises. Flat lists are byte-identical to before. This is its own commit, second in the history, and its library hunk applies unchanged to older releases if a backport is wanted.

</details>

<details><summary>Other changes and smaller behaviour differences</summary>

- The model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` is removed. It had no caller left, and a Galaxy-side twin with the wrapper method's name invites the bug back.
- The collection `all_metadata_files` return type is corrected to `list[list[tuple[str, str]]]`.
- Because rows now match `$e`: output collections give the compute-side output path, a deferred element gives its source URI (only under remote tool evaluation), LDDA elements are included (the old query joined on HDAs only), and element identifiers are tuples in every case (remote tool evaluation used to give lists).
- `wrapped_json.py` pairs each staging path with its row directly instead of transposing the rows and zipping them back, and shares the metadata file staging layout between single datasets and collections.

</details>

<details><summary>Commits</summary>

1. Baseline tests for collection and dataset wrapper path accessors (pass on `release_26.2`).
2. Put the collection name once at the top of nested staging paths.
3. Extract the metadata file path rewrite from `DatasetFilenameWrapper` (refactor).
4. Build collection staging JSON from the wrapper rows directly (refactor).
5. Build collection path accessors from the element wrappers (refactor; paths still Galaxy-side).
6. Route collection and metadata file path accessors through the compute environment (the fix).

</details>

## Risks

The one hard-to-reverse part is small: `export_remote` with "Include the collection name" changes filenames for nested collections, and anything already relying on the doubled name would see a new layout.

<details><summary>Risk Details</summary>

- Tool templates on path-rewriting destinations now see different (correct) paths from these accessors. On destinations that don't rewrite paths, output is unchanged apart from the small differences listed above.
- `export_remote` nested-collection layout changes as described; flat lists don't change.
- The removed model property could break code outside Galaxy that called it; nothing in Galaxy does.
- Not changed on purpose: `get_all_staging_paths` still shortens identifiers by the collection name's length when the name is included, which over-truncates identifiers longer than about 240 characters and rejects collection names longer than about 250. Fixing that changes export filenames, so it's left for a separate PR.

</details>

<details><summary>Risk Review Advice</summary>

Look at `DatasetCollectionWrapper._dataset_rows` and `DatasetFilenameWrapper._job_metadata_files` in `wrappers.py`: every collection and metadata file accessor now derives from these two caches, so their keys (element list plus parallel identifier list) and the input-only rewrite guard carry the whole change. The `export_remote` layout change in commit 2 is the one user-visible behaviour change outside Pulsar.

</details>

## Context

Alternative to 🔀 #25048. Overlaps 🔀 #25023 (remote tool evaluation on Pulsar) and 🔀 #25021 (Pulsar `rewrite_parameters` jobs whose command template reads inputs); the integration test here is named so it doesn't collide with #25021's. Alternative kept on 🌿[issue_25040_collection_paths_rewrite_26_2_alt_original_scope](https://github.com/jmchilton/galaxy/tree/issue_25040_collection_paths_rewrite_26_2_alt_original_scope) - the fix without the nested `include_collection_name` change and without the input-only metadata guard. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All six items pass.</summary>

- [x] What does the user see when it fails? An accessor exception fails command evaluation, so the job errors before launch with the traceback in the handler log; the only user-facing message is the existing "element identifier is too long" assertion.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Mostly behavioural; the two caching tests are implementation-coupled on purpose.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, the first commit, unit tests only.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/pr_checklist/). Run via Claude Sonnet 5.5 at high effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope as implemented; the stale collection-name length allowance is left for a follow-up.</summary>

A first evaluation expanded the branch with the nested `include_collection_name` fix and the input-only metadata guard. The second kept all of that and suggested also dropping the name-length allowance in `get_all_staging_paths`; that changes export filenames for very long identifiers, so it was deferred to its own PR.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/scope_evaluation/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Passes; the caches form one two-layer design, each on the object that owns its data.</summary>

Acted on: the collection rows became a recursive cached property over a private `_DatasetRow(identifiers, element, path)` NamedTuple, replacing a generator plus positional tuple unpacking. Kept: the parallel identifier list (reading identifiers off children would trip job-cache `consumes_identifiers`), and the public row shape (templates outside Galaxy may index it).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added an <code>export_remote</code> integration test for nested collections and dropped two tests that proved nothing extra.</summary>

The nested-layout unit test became an `export_remote` integration test that checks the files actually written. The functional tool's `<tests>` block was dropped because it passed before and after the fix; the Pulsar integration test runs the same tool with stronger assertions. Unit tests that pin flattening order, repeated identifiers, the flat layout, and "paths-only accessors never touch metadata" were kept.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/test_challenges_debrief/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>No new SQL; <code>all_paths</code> on a 5,000-pair collection drops from 5,001 queries to none.</summary>

Measured on SQLite with a real `PulsarComputeEnvironment` and 10,000 datasets: the first `all_paths` went from 2.19 s / 5,001 queries to 27 ms / 0 queries because it no longer loads metadata files; `all_metadata_files` costs what `all_paths` used to, once. A quadratic slowdown for templates indexing `all_paths[$i]` in a loop was found and fixed by caching the rows.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/performance_challenges_debrief/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two findings, neither a defect at head.</summary>

Tuples instead of lists for element identifiers: normal jobs already got tuples from the old query; only remote tool evaluation gave lists, so types are now consistent. `$input.metadata.<file>` and `all_metadata_files` rewriting the same file separately: same helper and same Pulsar key, so the file is staged once. An earlier round found dropped repeated identifiers and a mutable cached list; both were fixed.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/codex_review/). Run via gpt-6.2-sol at none effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Three refactor commits ahead of the fix leave it a 19-line <code>wrappers.py</code> change plus tests.</summary>

The refactors extract the metadata path helper, simplify the staging JSON builder, and build the rows from the element wrappers with Galaxy-side paths, with no change in output. The fix commit then only switches each row's path to `str(element)` and adds the input-only metadata rewrite.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_25040_collection_paths_rewrite_26_2/baseline_refactor/). Run via Claude Opus 5.5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

- `test/integration/test_pulsar_embedded_rewrite_parameters_input_paths.py` runs a tool that prints every accessor on embedded Pulsar with `rewrite_parameters: true` and `default_file_action: copy`, checks the per-element paths sit in Pulsar's staging directory, and checks every bulk accessor and the `data_style="paths"` config file against them. On `release_26.2` it fails with the object store path where the staged path should be.
- `test/unit/app/tools/test_wrappers.py` covers the same accessors with a stub compute environment, plus nested collections, repeated identifiers, output wrappers, and that paths-only accessors never ask for a metadata rewrite.
- `test/integration/test_remote_files.py::test_export_remote_tool_nested_collection_with_collection_name` checks the nested export layout.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
