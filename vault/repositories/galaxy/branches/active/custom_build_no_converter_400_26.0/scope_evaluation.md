# Scope evaluation

**Recommendation: expand, by combining rather than adding code. Keep the code change as is (`NoConverterException` → 400, nothing else wrapped). Retarget it from `release_26.0` to `release_25.1`, and preferably land it as a second commit on #24310 (`[25.1] Better API Handling for Custom Builds`).** v25.1.0 was tagged 2025-12-12, so 25.1 is still inside the ~1-year support window (about 7 weeks remain as of 2026-10-20). The identical `except Exception: raise ToolExecutionError("Failed to convert dataset.")` block is on `origin/release_25.1` (users.py L535). The fix is a simple, clean one, which by John's preference points to the oldest supported target. #24310 already edits the same FASTA block on 25.1, and its title covers this change. The two changes combine on 25.1 with no textual conflict, and merging #24310 forward over this branch also produces no conflict. Folding into #24310 is John's call, since he opened that PR and its CI is running; a standalone 25.1 PR is the fallback. Either way, red-to-green must be rerun on 25.1 with a 25.1 venv, and the branch and record get renamed from `_26.0` to `_25.1`. In-code expansions (pre-checking the `len → linecount` converter, `ConverterDependencyException` mapping, a shared helper with `datasets.py`, a happy-path API test) were each considered and are not recommended.

## Base branch

- `release_25.0`: v25.0.0 was tagged 2025-06-18, so it is out of the support window.
- `release_25.1`: v25.1.0 was tagged 2025-12-12, so it is in the window. Same code: `origin/release_25.1` users.py L531-536.
- `dev`: same code (L578-583).
- The initial debrief compared only 26.0 and dev.
- Ancestry: `origin/release_25.1` is an ancestor of the branch base `495b7fee26a`, so a 25.1 fix merges forward normally.
- 25.1 compatibility, checked read-only in scratch:
  - `git diff 495b7fee26a HEAD` applies cleanly to 25.1's `users.py` and `test_users.py`.
  - 25.1 has `NoConverterException.value`, `assert_error_message_contains`, `assert_error_code_is` and the `DatasetPopulator` import.
  - The test has not been run on 25.1.

## Scopes considered

### As implemented (release_26.0, standalone)

Narrows the bare `except Exception` to `except NoConverterException`, which raises `RequestParameterInvalidException` with the model's message. Everything else now propagates unwrapped. One API test covers it (bed → 400 + error code + message, no build stored). 26 lines in total.

| Pros | Cons |
|---|---|
| - Minimal and follows the existing `datasets.py` convention<br>- Red-to-green already verified on 26.0 | - Skips the oldest supported branch with the bug (25.1)<br>- A second PR on the same 6-line block as #24310, one release apart |

### Retarget to release_25.1, standalone PR (code unchanged)

Same diff, rebased onto `release_25.1`.

| Pros | Cons |
|---|---|
| - Meets the base policy: oldest supported branch with the bug<br>- Simple fix, so an older target fits John's preference<br>- Patch applies cleanly to 25.1 | - Red-to-green needs a rerun on 25.1 (25.1 venv)<br>- Rename and record churn (`_26.0` → `_25.1`)<br>- About 7 weeks of 25.1 support left (small benefit, but still in policy) |

### Retarget to 25.1 and fold into #24310 (recommended)

Push this commit (and its stricter-assertions follow-up, squashed or not) onto `better_custom_build_error_handling_25.1` as a second commit. #24310 then covers both custom-build-from-dataset error paths: inaccessible → 403 and unconvertible → 400.

| Pros | Cons |
|---|---|
| - One PR, one review, one merge-forward for one block of code<br>- #24310's title ("Better API Handling for Custom Builds") already describes this change<br>- Each commit stays self-contained and tested, so it's easy to drop again if a reviewer objects<br>- Read-only simulation: no conflict either way | - #24310 is John's open, non-draft PR with CI in progress, so adding to it needs his OK<br>- Restarts #24310's CI<br>- Grows a PR John deliberately kept fast and small |

<details><summary>Merge simulation (scratch only, no repo state touched)</summary>

- **Combined on 25.1:** `git merge-file` with ancestor = `origin/release_25.1`, ours = `bd26faf57f3`, theirs = 25.1 + this patch. 0 conflicts in `users.py` and `test_users.py`. Result: `get_accessible` at L531, then `try` / `except NoConverterException`.
- **Merge-forward (25.1 + #24310 into 26.0 + this branch):** ancestor = `origin/release_25.1`, ours = this branch's `HEAD`, theirs = `bd26faf57f3`. 0 conflicts in both files.
- Why there's no conflict:
  - The hunks are 5 unchanged lines apart: the dataset load line vs. the `except` line.
  - The import hunks touch different statements.
  - The tests are added at different places in `test_users.py`.
- So the "merge-forward conflict expected" note in `better_custom_build_error_handling_25.1/index.md` doesn't reproduce in a file-level 3-way merge.
- The combined order is also semantically right: the access check (403) runs before any conversion is attempted, and the converter check (400) runs inside it.

</details>

### Pre-check the `len → linecount` converter before queueing (not recommended)

Before calling `get_converted_dataset(trans, "len")`, check `trans.app.datatypes_registry.get_converter_by_target_type("len", "linecount")`. If only `len_to_linecount` is missing, the 400 would then come before an orphan `fasta → len` job is queued. Flagged in the initial debrief and the codex review.

| Pros | Cons |
|---|---|
| - Fixes a real partial-state edge in the touched code<br>- About 3 lines, and the registry lookup exists | - Reachable only when an admin's datatypes config keeps `fasta_to_len` but drops `len_to_linecount`; stock config ships both<br>- No cheap red-to-green: API test datatypes lack both converters, so it needs a bespoke integration datatypes config<br>- Duplicates `get_converted_dataset`'s own check with a hand-built message |

<details><summary>Details</summary>

`get_converters_by_datatype("len")` calls `type(self.get_datatype_by_extension(ext))`. On a config that drops the `len` datatype entirely, that is `NoneType`, so the guard needs care to avoid becoming its own 500. The orphan job is hidden (`visible=False`), harmless, and reused if the build is retried after the config is fixed. Leaving this out of a release-branch PR is defensible. If a reviewer asks for it, it's a small follow-up commit with an integration test.

</details>

### Map `ConverterDependencyException` (and the `None`-return path) in both callers (not recommended)

`get_converted_dataset` raises `ConverterDependencyException` when a `depends_on` dependency is in an error state, and returns `None` while a dependency is still running. In custom builds, a `None` from the first step would raise `AttributeError` on `new_len.get_converted_dataset`. Both now surface as raw 500s with a traceback, where before they were wrapped as 500 "Failed to convert dataset.". `services/datasets.py::_get_or_create_converted` doesn't map the exception either.

| Pros | Cons |
|---|---|
| - Would make both HTTP callers consistent on every converter failure mode | - Unreachable on stock config: neither `fasta_to_len` nor `len_to_linecount` declares `depends_on` (verified in the internal issue debrief)<br>- Unclear whether it should be a 4xx: a failed dependency job is closer to a server/job failure, and the status is still 500, just with a real traceback now<br>- Would change `datasets.py` behavior on a release branch for a path this issue doesn't reach |

### Shared `NoConverterException` → 400 helper / extra-data parity with `datasets.py` (not recommended)

Already rejected in `baseline_refactor.md`. The two callers have different shapes: `datasets.py` does one conversion with `source`/`target`/`available` extra data, while custom builds chain two conversions and forward the model message. With only two HTTP callers, a helper would be speculative.

| Pros | Cons |
|---|---|
| - Single place for the mapping | - Speculative with two differently shaped callers<br>- Changes `datasets.py` output on a release branch |

### Add a happy-path `len|type=fasta` API test (not recommended)

Flagged in `test_challenges_debrief.md`.

| Pros | Cons |
|---|---|
| - Pins the success path next to the new error path | - API test datatypes can't convert fasta → len, so the test can't run in the API suite<br>- Coverage already lives in Selenium `test_custom_builds.py` and in `custom_build_from_fasta` (26.2), which adds the converters to the framework test datatypes |

### Contract (not applicable)

At 26 lines with one tested behavior change, there's nothing to remove.
