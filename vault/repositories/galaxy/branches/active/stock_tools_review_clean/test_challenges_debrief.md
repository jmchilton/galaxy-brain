Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: stock_tools_review_clean (re-harden)

**Top line:** No test changes. Nothing committed, so nothing was pushed and nothing was cherry-picked onto `stock_tools_review_clean_reshaped`. The branch head is still `4cf60e5ebfb`.

- The upload1 unit test stays dropped. `0803734dbf3` (Baseline tests) adds it and `15e81e6d910` removes it, so the net diff has no unit tests. The upload API tests cover the change. I reran them fresh: 7 passed.
- joiner2's `<test>` is kept. It passes on HEAD. With the original command put back under the same test, it fails with `NotFound: cannot find 'tmp'`, which is the bug being fixed.
- **No new tool `<test>` is needed.** That includes the re-scope's ML Jupyter `.ipynb` suffix fix (`52a07dee05e`), whose effect no tool test can observe (see below).
- **New evidence: Extract Genomic DNA's `is_of_type` change is covered by tests.** It was earlier recorded as covered only by render comparison. Two of the tool's existing tests (5 and 6) take a GFF input with a history FASTA and don't need data tables. They pass on HEAD, and fail when the GFF branch is disabled. CI never runs them: the tool is in `known_broken_tools.txt` and isn't in the sample tool conf. They also need a one-line Python 3 fix in the tool's script, which I applied only for the run (next point).

Not acted on, for John:
- **Extract Genomic DNA's history-reference path fails on Python 3 on base and on the branch.** In `tools/extract/extract_genomic_dna.py`, `stderr = ""` then `stderr += tmp_stderr.read(...)` reads bytes. So every job with a history FASTA fails with `Error running faToTwoBit. can only concatenate str (not "bytes") to str`.
  - **Fix:** `stderr = b""`.
  - **Why I left it:** the branch doesn't touch this script, and the tool is listed as deprecated ("IUC provides same tool"). Fixing it makes jobs that fail today succeed. That is the same kind of change as the joiner2 and shrimp_wrapper fixes, so whether it belongs on this branch is your call.
- **joiner2's test doesn't run in CI.** `main_tools.yaml` runs `lib/galaxy/config/sample/tool_conf.xml.sample`, and joiner2 isn't in it (only `joiner.xml` is). Adding joiner2 there would ship it to new deployments, which is a product decision. The test stays as the tool's own test, for planemo or a custom tool conf.
- **Correction to the earlier debriefs:** they said the interactive tools have no tests. Five of them have one: Jupyter 1.0.0, 1.0.1 and 1.0.3, ML Jupyter and Qiskit. Each is a `run_it` test on `test.ipynb`.
  - **They never run in Galaxy CI.** `InteractiveTool` refuses to load unless `interactivetools_enable` is set, `test.ipynb` isn't in the repository, and the tests need the tools' Docker images.
  - **Branch impact:** none. The `./` path change and the suffix fix keep those tests' expected outputs the same.
- **No E2E tests.** The branch changes no UI.

## Unit tests

There are none in the net diff.

`0803734dbf3` added a test that pinned upload1's `file_type` options. It passed before the separator change, as a baseline test should. `15e81e6d910` dropped it, because the upload API tests already fail when the separator breaks. The earlier challenge showed that by breaking the separator: 5 of the 7 tests failed. The only thing the unit test pinned beyond that was the labels and order of a tool form the client never renders. I agree with dropping it.

When history is reshaped, drop the two commits together. `stock_tools_review_clean_reshaped` already reflects this.

## Tool test: joiner2 (`605f9b26407`)

- **Right layer:** the fix makes a broken stock tool work, and a tool `<test>` is the idiomatic test for that.
- **Fails without the fix, at the job:** I put the `release_26.1` `<command>` back into the current XML, keeping the test. The job errored with `NotFound: cannot find 'tmp'`. This isn't a missing fixture: the broken command is the bug.
- **Data and comparison:** it reuses `1.bed` and `2.bed`. `sort="true"` keeps the comparison independent of locale.
- **Not pinned on purpose:** the narrowing from `-k N` to `-k N,N`. It matters only in locales that ignore whitespace when collating. A test for it would depend on the host's locale.

## Changed tools and their test coverage

| Tool | Change | Tool tests | What I checked this time |
|---|---|---|---|
| upload1 | literal `\t` separator | none; API tests | `test_tools_upload.py` (7 file_type tests): 7 passed. |
| `__IMPORT_HISTORY__` | `'--$__ARCHIVE_TYPE__'` | none; API tests | `test_histories.py -k "test_import_export or test_import_1901_histories"`: 7 passed. These cover both `--url` and `--file`. |
| Extract Genomic DNA | `is_of_type('gff')` | 7, all skipped in CI | Tests 5 and 6 (GFF input, history FASTA): pass on HEAD with the `b""` fix applied temporarily. With `#if False:` in place of the check, both fail (`Exception while parsing command line`), so they exercise the changed branch. Tests 0 to 4 need `twobit.loc` or `alignseq.loc`. |
| joiner2 | command fix | 1, new | Passes on HEAD; fails on the original command. |
| gtf2bedgraph, Extract_features1, vcf_to_maf_customtrack1 (2) | quoting, `--` | existing | All pass on HEAD. Extract_features1 and vcf_to_maf_customtrack1 are in the sample conf, so CI runs them. |
| axt_to_fasta, axt_to_concat_fasta | quoting | existing | Pass on HEAD. They need an absolute `builds_file_path` to `builds.txt.sample`; a relative path is joined onto `tool_data_path`. |
| ML Jupyter | `.ipynb` suffix (`52a07dee05e`) | 1, never run in CI | Render comparison `52a07dee05e^` → HEAD: only names ending in `.ipynb` change, from `x.ipynb.ipynb` to `x.ipynb`. All other cases render the same. In run mode the executed notebook is copied to the output, so the output is the same either way. In open mode the change is the notebook's name in the Jupyter UI. A tool test can't observe either one. |
| HiGlass, ilastik, Panoply, VRM, Phinch, AskOmics, cellxgene, Jupyter 1.0.x, Qiskit | quoting, `./`, `/` replacement, naming refactors | none runnable | Render comparison, from the implementation and the reviews. They run only inside their containers. |
| liftOver, axt_to_lav, interval2maf, blat, BEAM, master2gd_snp, SRMA | quoting | commented out, missing, or blocked by the environment | For pure quoting, the argv is the behaviour, and the render comparison shows it unchanged. A new test would only add coverage. |
| shrimp_wrapper | template parse fix | 4, not runnable | SHRiMP 1.x isn't packaged and the test data is missing. The implementation ran all four branches against a stub mapper. |

## Mocks, helpers, E2E

- No unit tests, mocks or new API test code remain, so there is nothing to restructure and no helpers to add.
- No E2E test is warranted.

## Test results (HEAD `4cf60e5ebfb`)

All runs were sequential, using pytest directly with `-p no:postgresql`.

- **Framework runner:** a scratch copy of `test_toolbox_pytest.py` with an empty skiplist, and a tool conf of the seven tools below. Conda was off, and `faToTwoBit` came from a scratch conda env.
  - joiner2: 1 passed.
  - gtf2bedgraph 1, Extract_features1 1, vcf_to_maf_customtrack1 2: passed.
  - axt_to_fasta 1, axt_to_concat_fasta 1: passed (with an absolute builds path).
  - Extract genomic DNA, tests 5 and 6: passed with the temporary `b""` fix. Failed with the GFF branch disabled. Failed without the fix, on the Python 3 bytes bug, on base and on the branch.
  - Extract genomic DNA, tests 0 to 4: fail, because no data tables are installed.
- **Negative check:** joiner2 on the original command: 1 failed (`cannot find 'tmp'`).
- **API:**
  - `lib/galaxy_test/api/test_tools_upload.py`, 7 selected: 7 passed.
  - `lib/galaxy_test/api/test_histories.py` import tests: 7 passed.
- The worktree was restored after each temporary edit, and `git status` is clean.
