# Re-scope review

Run via Claude Opus 5.5 (inherited) at default effort, on `b69a34a4fa4` (re-scope delta vs `issue_25040_collection_paths_rewrite_26_2_alt_original_scope`).

No blocking or medium findings. I acted on three of four:
- Computed the top-level name segment and the name length allowance once per call. A comment now says why the allowance stays: it keeps existing layouts.
- Reworded the `all_metadata_files` docstring for outputs.
- Moved the nested-prefix commit to directly after the baseline commit, so it can be cut as its own (backportable) PR.

Head after changes: `5543883b662`. The tree is the same apart from where the tests sit. Every commit passes `test_wrappers.py`.

Not acted on:

- `export_remote` integration sibling test with `include_collection_name` on a `list:list`: optional. Left for the second test challenge round to weigh.
- Guarding `MetadataWrapper` for outputs: out of scope; #25023 rewrites that method.
- Dropping the stale per-segment name allowance: it would change existing flat-list export filenames on a release branch.

<details>

## Verdict

No blocking or medium-severity findings. The two new commits are small, coherent and correct. Flat-list staging output is byte-identical to `release_26.2`. Every commit is green, and both new behavior tests fail before their fix.

## Verified

- `test_wrappers.py` at each of the 7 commits (git archive copies): base + baseline tests 38 passed; then 38, 38, 38, 39, 40, 41, 42.
- HEAD test file on `682779d7985` lib (pre-re-scope): exactly the two new tests fail (`input1/sample1/input1/...`; `/job/inputs/metadata_out_bai.dat`).
- `get_all_staging_paths` parity, base vs HEAD, 40 cases. Inputs: flat list with spaces, `/`, a leading dot and a 300-char identifier; empty, `None` and 200-char names; nested `list:list`. Settings: four `invalid_chars` sets, with `include_collection_name` on and off. Only the intended nested + `include_collection_name=True` cases differ, and assertion behavior is unchanged.
- The nested-prefix lib hunk applies cleanly to `release_26.2`. Neither #25021 nor #25023 touches that loop body. Their `sample_tool_conf.xml` additions don't conflict.
- ruff/black/isort clean.

## Findings (all low)

1. **`wrappers.py:844-849`: the per-segment `max_len` reduction for the collection name has always been stale.** The name was always its own path component, so the reduction only over-truncates. Keeping it keeps flat output byte-identical, which is right for a release branch. Pre-existing failure: a name of about 250 characters makes `max_len < 1`, so `export_remote` with "include collection name" asserts. The reduction also uses the raw name length and subtracts 1 for a `None` name. Suggested: a comment, or hoist `max_len` and the sanitized name out of the loops. Don't change truncation here.
2. **`wrappers.py:490-501`: `all_metadata_files` and `$output.metadata.<file>` disagree for outputs, which can't happen in practice.** `MetadataWrapper` still rewrites whatever the io_type. Output wrappers are built at command-build time, before outputs have file-type metadata, so both yield nothing. The guard matches #25023 exactly, and #25023 also leaves `MetadataWrapper` alone. Fix the docstring only.
3. **Nit, commit order:** if John wants the nested-prefix fix as a standalone or backport PR, move it to directly after the baseline commit.
4. **Optional:** nothing runs `export_remote` end to end with `include_collection_name`. A sibling of `test/integration/test_remote_files.py:332` (`test_export_remote_tool_collection_structure`, `list:list`) asserting `<hdca name>/test0/data0.txt` would be cheap. Note that the existing test passes `export_type|infiles`, not `export_type|incollection`; that quirk is pre-existing.

## Test quality

- The baseline `test_collection_wrapper_staging_paths_with_the_collection_name` pins the flat layout through both accessors and passes on base. It builds its HDCA inline (minor duplication).
- The nested test is focused and reuses the helper.
- The output metadata test asserts both the paths and `metadata_rewrites == []`. It needs the new `StagingComputeEnvironment.output_path_rewrite`. Its value is modest (it covers a defensive guard) but it isn't trivial.

## Minor

- Starting the list with the sanitized name would read more directly than `insert(0, ...)`.
- The integration test rename is complete and folded into the fix commit; no class collision with #25021.
- `export_remote_0.1.0.xml` picks up the same layout change. Note it in the PR description: `name/outer/inner.ext` instead of `name/outer/name/inner.ext`.
- No security findings.

</details>
