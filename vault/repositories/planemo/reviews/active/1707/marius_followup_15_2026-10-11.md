# Review of Marius's PR #15 for upstream Planemo #1707

Reviewed 2026-10-11. [Fork PR #15](https://github.com/jmchilton/planemo/pull/15) targets John's `test-job-files-in-tmpdir` branch for [upstream PR #1707](https://github.com/galaxyproject/planemo/pull/1707).

- Reviewed proposed head: `8697b72db2bcbbe3c84a1b129d7f04e175835155`.
- Reviewed base/upstream head: `8e8ca0e4b2c1f1ab1bcf90ff803da17d01e59535`.
- Prepared URI-only commit: `f87c2c58e457d3c4060c9c551260d350be2d7c20`, local branch `agent-review15-uri-only`, preserving Marius's authorship. The coordinator handles delivery to John's remote branch. No merge or push was performed by this review agent.

## Recommendation and delivered change

Accept the URI classification correction. `_absolute_test_data_path` previously used any nonempty `urlparse(...).scheme` to identify a URL. Consequently a real relative filename such as `sample:1.txt` remained relative when the inline job moved to a system temporary directory. Galaxy's `abs_path_or_uri` uses `"://" in value`, so adopting the same check restores the previous local-file behavior. The new regression assertion fails against the original helper and passes against the corrected helper. Existing coverage continues to verify absolute paths, remote URLs, nested collections, composite inputs, secondary files, immutability, and cleanup.

Do not merge PR #15 unchanged. Its blanket `sys.version_info >= (3, 14)` skip removes both `path` and `location` variants of the secondary-files staging test, including every future Python release and future Galaxy versions that fix the underlying bug. This weakens tests contrary to John's explicit repository instruction. The URI-only commit includes the implementation correction and new regression test, omitting the `sys` import, skip decorator, and its comment. All prior assertions remain intact. Leave PR #15 open for a decision about its remaining workaround, or close it explicitly as partially incorporated once delivery is confirmed.

## Validation

Executed in isolated `/tmp/planemo-marius-oct11/pr-15`, using the existing Planemo venv with `PYTHONPATH=$PWD`:

- `python -m pytest -p planemo.cli tests/test_engines.py`: **18 passed** on Python 3.12.12 with `galaxy-tool-util==26.0.1`, both for the proposed PR head and the final URI-only change. There were no skips in either run on this interpreter.
- Executed the new colon regression assertion using the original helper extracted from base commit: fails as expected; reran with the corrected helper: passes.
- Black (`--target-version py310 --check`), isort, flake8, and `git diff --check`: passed for both changed files.
- Ruff was unavailable in the existing venv (`No module named ruff`); no package installation was performed.
- Final local worktree is clean after commit.

The full engine suite was not rerun on Python 3.13 or 3.14 because the available dependency environment is Python 3.12. The stdlib buffering behavior below was independently reproduced with installed interpreters for all three versions. No managed Galaxy server test was run for this small correction; the existing secondary-file tests use the actual Galaxy job conversion helper and inspect the uploaded tar contents.

## Follow-up: Galaxy archive flushing on Python 3.14

Marius's diagnosis is correct. In installed `galaxy-tool-util==26.0.1`, `galactic_job_json`'s nested `replacement_file` builds secondary files into `tempfile.NamedTemporaryFile`, closes the `tarfile` wrapper, and invokes the upload using `tmp.name` without flushing or closing the caller's underlying temporary file. Its sibling `replacement_directory` has the same pattern, so a Galaxy fix should cover both secondary-file and directory tar uploads.

An independent minimal stdlib reproduction created a small tar into a `NamedTemporaryFile`, closed the tar wrapper, checked its on-disk size/readability before flushing the file, then flushed:

| Interpreter | Before underlying-file flush | After flush |
| --- | --- | --- |
| Python 3.12.12 | 10,240 bytes; readable tar | 10,240 bytes |
| Python 3.13.12 | 10,240 bytes; readable tar | 10,240 bytes |
| Python 3.14.3 | 0 bytes; tarfile ReadError/empty file | 10,240 bytes |

The root fix belongs in Galaxy `lib/galaxy/tool_util/cwl/util.py`: flush or close the caller's file before another reader opens its pathname, retain full existing test assertions, and cover both sibling archive paths on Python 3.14. Marius reports that released Galaxy tool-util versions and Galaxy dev share this bug; this review directly inspected only the installed 26.0.1 source. A requirements-floor change cannot be recommended without locating a release containing the actual fix.

Decision deferred: implement a Galaxy fix and hand off its branch using `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`, or keep Python 3.14 support pending the dependency fix. Planemo currently advertises classifiers through Python 3.13 and tests 3.10/3.13 in CI, while `requires-python` has only a lower bound, so Python 3.14 installations remain possible. Removing the skip exposes the real failing behavior on 3.14; the URI correction does not resolve that separate dependency defect. Once Galaxy is fixed, rerun both staging cases and the directory upload path on 3.14 and consider extending the CI matrix.

## Follow-up: relative CWL `$import` and `$include` references

Marius separately flagged that relocating an inline job JSON also changes the base for CWL `$import` and `$include` references. Inspection confirms that `_absolutize_nested_job_paths` rewrites file/directory `path` and `location`, secondary files, and composite data, but does not rewrite these loader directives; `planemo/cwl/run.py` passes the temporary job path to cwltool. This review did not reproduce the loader behavior end to end.

Decision needed: verify whether relative directives inside inline jobs are supported input syntax, then either preserve their original resolution base or document the limitation and recommend a dedicated external job file. External job files already retain their original paths. Do not silently add a broad recursive directive rewrite without checking cwltool loading semantics.

## Coordinator outcome

URI correction committed and pushed as f87c2c58e457d3c4060c9c551260d350be2d7c20; 18 engine tests passed. Companion #15 remains open because its Python >=3.14 skip conflicts with preserving coverage. Galaxy dependency repair recorded for John.
