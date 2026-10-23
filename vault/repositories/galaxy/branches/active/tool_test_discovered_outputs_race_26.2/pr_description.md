Fix a tool test framework race - with the tool request API, `expect_num_outputs` counts discovered datasets when the job finishes before its outputs are listed.

Tool framework tests flake under `GALAXY_TEST_USE_LEGACY_TOOL_API=never`. Seen on #24368, which doesn't touch tool code; a rerun passed:

```
JobOutputsError: Incorrect number of outputs - expected 3, found 5
(dataset(s): out_1,out_2,__new_primary_file_list_output|4__,__new_primary_file_list_output|5__ collection(s): list_output)
```

`resolve_tool_submission` (tool request path) waits for the request to be submitted, then lists `jobs/{id}/outputs`. If the job has already finished, collection discovery has associated each element with the job as `__new_primary_file_<output>|<id>__`, so they get counted as declared outputs. The legacy path reads the submit response, built before the job runs, so discovery hasn't happened yet.

***This only changes how the test client reads job outputs - no server or API behavior changes, real output-count mismatches still fail exactly as before, and discovered datasets are still verified (`verify_primary_datasets` fetches them separately).***

***The new helpers in `interactor.py` only replace three hand-built `__new_primary_file_` strings - no new behavior.***

<details><summary>Commits</summary>

1. Extract `split_declared_job_outputs` from `resolve_tool_submission` (pure refactor).
2. Add `DISCOVERED_OUTPUT_PREFIX`, `discovered_output_name` and `is_discovered_output` in `tool_util/verify/interactor.py`, replacing the hand-built `__new_primary_file_` names in `verify_output_dataset` and `galaxy_test/selenium/framework.py` (pure refactor).
3. The fix: `split_declared_job_outputs` skips discovered outputs, with a unit test that fails without the skip.

</details>

<details><summary>Tests</summary>

- `test_split_declared_job_outputs_skips_discovered_datasets` feeds a declared dataset, a discovered dataset and a collection and checks the exact split; it fails against the base behavior.
- The unit test feeds the post-completion output list directly; forcing the ordering in a functional test would need a hook in `resolve_tool_submission`. The existing tool framework tests (e.g. `output_filter`, discovery tools) cover the refactored counting and lookup paths.

</details>

## Risks

Risks are minimal - test framework client code only, no API or server changes (a two-way door).

## Context

Galaxy core (`output_collect.py`, `store/discover.py`, `model/__init__.py`) still builds the `__new_primary_file_` name itself; sharing one definition via `galaxy.util` is a possible `dev` follow-up. Alternative kept on 🌿[`tool_test_discovered_outputs_race_26.2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/tool_test_discovered_outputs_race_26.2_alt_original_scope) - same fix with an inline prefix check and no shared name helpers. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented; the approved shared-helper expansion has landed.</summary>

- Expanded once (approved) to share the discovered-output name helpers across `tool_util` and `galaxy_test`.
- Rejected for a release branch: unifying with Galaxy core via `galaxy.util` (cross-layer, `dev`), hardening `populators.py` consumers (no observed failure), filtering discovered outputs server-side (API contract change).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the one fix test; dropped two tests that restated the helpers.</summary>

- The HTTP-mocked test became a plain dict-in/dict-out test of `split_declared_job_outputs` with exact asserts.
- Dropped tests that restated the name f-string and tested the helper directly; the refactor commit is behavior-preserving and covered by tool framework tests.

</details>

### ✅ Second Frontier Model Review

<details><summary>No defects and no missed existing abstractions.</summary>

- Reviewed `interactor.py`, `selenium/framework.py`, the unit test and the core discovery code (`output_collect.py`, `store/discover.py`, `model/__init__.py`) and the jobs API.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two behavior-preserving refactor commits lead the fix.</summary>

- `split_declared_job_outputs` extraction, then the shared name helpers; the fix commit carries only the skip and its test. Unit tests pass at each commit.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Unchanged - a real mismatch still raises `Incorrect number of outputs - expected N, found M`; discovered names no longer inflate the count.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - realistic job-output dicts in, exact split out.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A - the two refactor commits lead the fix.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
