Fix custom builds answering "can't convert this datatype to `len`" with an opaque 500 "Failed to convert dataset.".

Adding a custom build from a dataset (`PUT /api/users/{user_id}/custom_builds/{key}` with `len|type=fasta`) wraps every failure to start the `len`/`linecount` conversion in a 500 `ToolExecutionError`. When the real cause is a datatype the server can never convert, the caller gets no hint about what's wrong, and the server log gets an INFO line with no traceback:

| Request / server state | Before | After |
| --- | --- | --- |
| Dataset whose datatype has no `len` converter (e.g. a `bed` id via the API) | 500 `"Failed to convert dataset."` (`500004`) 😬 | 400 `"Cannot create a custom build from this dataset: Conversion from 'bed' to 'len' not possible"` (`400008`) ✅ |
| `fasta` on a server whose datatypes config drops `fasta_to_len` or `len_to_linecount` | 500 `"Failed to convert dataset."` 😬 | 400 naming the missing conversion ✅ |
| A Galaxy error with its own status raised while queueing the converter (e.g. a permission error) | 500 `"Failed to convert dataset."` 😬 | that error's own status and message ✅ |
| Anything else (a bug) | 500 `"Failed to convert dataset."`, no traceback 😬 | unhandled 500 with the real traceback in the log ✅ |

***Who sees this: API clients and servers with a trimmed datatypes config. The Custom Builds page only offers FASTA datasets, so on a stock server the UI doesn't reach these paths.***

The fix narrows `except Exception` to `except NoConverterException` and raises `RequestParameterInvalidException` with the model's message, the same mapping `services/datasets.py` (`_get_or_create_converted`) and the visualization data provider registry (🔀 #22398) already use. Other errors are no longer rewrapped. ***The `except` only covers starting the conversion; a converter job that fails later never reached this block before and doesn't now.*** No client change: `CustomBuilds.vue` already shows `err_msg`.

<details><summary>Why this shows up at all</summary>

The default `datatypes_conf.xml.sample` ships both converters, so a stock server only hits the `fasta` row when an admin has trimmed the datatypes config. The `bed` row is reachable on any server through the API. The framework test datatypes (`test/functional/tools/sample_datatypes_conf.xml`) omit both converters, which is how this surfaced while writing custom build E2E coverage.

With Sentry configured, each of these requests also became a Sentry error event for a condition that isn't a server bug. As a 400 it no longer does.

</details>

## Risks

Risks are minimal - error responses from one endpoint get more specific statuses and messages, and nothing locks Galaxy into a hard-to-change choice (a two-way door).

## Context

***Complements 🔀 #24310 rather than overlapping it: #24310 checks dataset access up front (403), this maps unconvertible datatypes to 400, and both are needed.*** The two touch different lines, and merging #24310 forward over this branch produces no conflict; with both, the access check runs before any conversion is attempted. Builds on 🔀 #22398 for the `NoConverterException` → `RequestParameterInvalidException` convention. Targets `release_26.0`; the patch also applies cleanly to `release_25.1`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the code change as is; the evaluation suggested a 25.1 target, and 26.0 was kept.</summary>

- The same block exists on `release_25.1`, `release_26.0` and `dev`. The patch applies cleanly to 25.1; the evaluation recommended retargeting there or folding into #24310. I kept `release_26.0`.
- Considered and not recommended:
  - Pre-checking the `len → linecount` converter so an orphan `fasta → len` job isn't queued when only `len_to_linecount` is missing. Only reachable on a trimmed datatypes config, and it duplicates `get_converted_dataset`'s own check.
  - Mapping `ConverterDependencyException` to a 4xx in both callers. Unreachable here (neither converter declares `depends_on`), and `datasets.py` keeps it a 500 too.
  - A shared helper with `datasets.py`. The callers build differently shaped errors.
  - A happy-path FASTA API test. It's a separate bug: an API-key request has no current history, so the converter can't be queued. On `release_26.0`, Selenium `test_custom_builds.py` covers only the pasted-`len` path.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the API test and pinned its error code and message.</summary>

- `test_custom_build_from_unconvertible_dataset` checks status, error code `400008`, the `"Conversion from 'bed' to 'len' not possible"` message, and that the build isn't stored.
- It fails at its own status assertion on the base (`500 ... 'Failed to convert dataset.'`) and passes with the fix.
- No E2E test added: there's no client behavior change.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing.</summary>

- `NoConverterException` is raised directly and when a dependency has no converter; both now return 400.
- `ConverterDependencyException` still returns 500, now unwrapped, matching `datasets.py`.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>None; the fix is one import and one narrowed <code>except</code>.</summary>

- A shared `NoConverterException` → 400 helper with `datasets.py` was rejected: two callers with different error shapes, and it would change `datasets.py` output on a release branch.
- Extracting the 6-line conversion block into a method would add churn without making the fix easier to review.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? On a server missing `fasta_to_len` or `len_to_linecount`, the Custom Builds page's red alert reads `Cannot create a custom build from this dataset: Conversion from 'fasta' to 'len' not possible` instead of `Failed to convert dataset.`. API clients get the same message for any unconvertible datatype.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. One API test checks the status, error code, message, and that the build isn't saved.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The test is red on the base and green with the fix.
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/api/test_users.py::TestUsersApi::test_custom_build_from_unconvertible_dataset` fails on `release_26.0` with `500 ... 'Failed to convert dataset.'` (`500004`) and passes with the fix.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
