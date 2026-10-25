# Refresh review: planemo #1725 after Marius's merge

- PR: https://github.com/galaxyproject/planemo/pull/1725
- Reviewed head: `c95fd681c979b127e7667f30585a7bdd7e6bce0f`.
- Compared base: `b8547ffde67eb0c88998a818dfbdd075327c1ead`.
- Recommendation: **keep the client fix; substantially rewrite the description**. No blocking code finding in the remaining diff. Full managed-Galaxy validation remains for CI.
- Delivery: local refresh review; no GitHub review, comment, or description edit submitted.

## Does the PR still do anything?

Yes. The remaining production change is the `test_data` argument passed to `GalaxyInteractorApi` in [`planemo/engine/galaxy.py:122`](https://github.com/galaxyproject/planemo/blob/c95fd681c979b127e7667f30585a7bdd7e6bce0f/planemo/engine/galaxy.py#L122). An explicitly supplied `--test_data` directory now reaches the client's local fallback list. Previously that list was empty. The added XML tool, external fixture, and integration test remain in the diff.

This affects embedded Galaxy tool XML tests through `ExternalGalaxyToolTestCase`, for both ordinary input files and expected output files. The real client paths are `remote_to_input` → `_get_path_or_location` → `test_data_download`, and `verify_output_dataset` → expected-data downloader → `test_data_download`. When Galaxy returns a missing-file response, the explicit directory supplies the file. When Galaxy supplies it, the server's file wins, even if the explicit directory contains a different file under the same name.

Marius's merge restores `planemo/galaxy/config.py` completely to the base version. The recognized `tool_test_data_directories` override is gone from the net diff. Galaxy therefore retains its own resolver defaults, while the explicit local directory is additive on the client. Runs without `--test_data` retain an empty client fallback list and unchanged server configuration. CLI parsing resolves the supplied directory to an absolute path, avoiding dependence on the working directory during execution.

This is a tool-test resolution fix. It does not introduce a general server configuration change or modify workflow/CWL test execution. Auto-discovered tool `test-data/` directories continue to use existing server behavior; this new client fallback requires the explicit option.

## Description recommendation

Significantly alter the current description rather than reverting the implementation. Its core issue and client-fallback explanation remain valid, but these parts describe abandoned behavior:

- The claim that both the server key correction and client fallback ship.
- The two-fix result table's `both (this PR)` row.
- The assertion that leaving `--test_data` unset prevented the old server override. `_find_test_data` also automatically discovers directories, which was the regression Marius fixed.
- The open design question proposing three alternatives; the client-only alternative has now been selected.
- `Draft until that's settled`; the PR is currently not a draft.

Lead with the final behavior: pass the explicit directory to the existing interactor fallback, preserve Galaxy's server resolver defaults and server-first precedence, and test an external input plus its expected output. Historical red-to-green measurements may be retained only if clearly attributed to the earlier implementation. Do not imply that those runs validate the merged head.

The coordinator's replacement draft was checked against the final diff and matches the actual implementation.

## Findings

No current blocking finding. The fix reuses Galaxy's existing interactor abstraction and leaves server defaults intact. The new integration test uses a unique fixture outside a conventional `test-data/` directory and verifies the copied output against that same external file, so its coverage includes both input staging and output comparison.

Optional wording cleanup at [`planemo/engine/galaxy.py:121`](https://github.com/galaxyproject/planemo/blob/c95fd681c979b127e7667f30585a7bdd7e6bce0f/planemo/engine/galaxy.py#L121): the comment says the directory is consulted only if the tool's own directory lacks the file. More precisely it is consulted after the **server** cannot supply the file; server resolution also includes Galaxy's stock/default sources. This does not affect correctness.

## Validation and limits

Working tree `/Users/jxc755/projects/worktrees/planemo/branch/test-data-option-fix` was clean before and after review, and its HEAD matched the live PR. `git diff --check` passes.

**14 behavioral checks passed** using the installed galaxy-tool-util 26.0.1 client:

- Six existing probes rerun on the merged head: explicit, automatic, and absent test-data configuration retain the server defaults; local input fallback works after a server miss; server content wins; absent option preserves an empty fallback list.
- Eight new before/after probes execute the real base engine loaded from commit `b8547ffd` and the real merged-head engine. They exercise `remote_to_input` and `verify_output_dataset`, with server file responses present or missing. Both input and expected-output resolution fail on the base after a server miss and succeed on the head. Server-provided content wins on both revisions.

The new probes are retained as [behavior_probe_2026-10-11.py](behavior_probe_2026-10-11.py), staged from `/tmp/planemo-1725-refresh/test_behavior.py`. They stub server HTTP responses, Galaxy startup, the top-level tool execution callback, and actual output retrieval; they do not replace the interactor's input resolution or expected-output comparison. This is direct evidence of the behavior change, not a live upload/tool-execution test.

The managed-Galaxy integration test at [`tests/test_cmd_test.py:85`](https://github.com/galaxyproject/planemo/blob/c95fd681c979b127e7667f30585a7bdd7e6bce0f/tests/test_cmd_test.py#L85) **was not run in this refresh**. At the coordinator's live snapshot, all 14 CI checks on the new head were pending: https://github.com/galaxyproject/planemo/actions/runs/38153917734. The prior configuration-suite result (48 passed, 3 skipped) remains historical evidence from the companion review, not a rerun claimed here.

Run the retained probe from a clean Planemo worktree at the reviewed head, using that project's dependency environment and `PYTHONPATH=$PWD`. The baseline source is read from the local Git object store, which must contain `b8547ffde67eb0c88998a818dfbdd075327c1ead`. Disable pytest caching to preserve the clean tree. Commands used for the two focused runs follow; substitute the retained probe's absolute path for its temporary path when rerunning. The earlier six-check script remains an ephemeral predecessor artifact.

```sh
PYTHONPATH=$PWD PLANEMO_SKIP_GALAXY_TESTS=1 /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q /tmp/planemo-marius-oct11/test_pr8_probe.py -p no:cacheprovider
PYTHONPATH=$PWD PLANEMO_SKIP_GALAXY_TESTS=1 /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q /tmp/planemo-1725-refresh/test_behavior.py -p no:cacheprovider
```

No Planemo source edits, Planemo commits/pushes, or remote PR changes were performed.
