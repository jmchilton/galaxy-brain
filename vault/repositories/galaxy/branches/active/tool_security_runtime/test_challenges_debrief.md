Run via Claude Opus 5.5.

**Coordinator:** after a rebase onto the final shared commit `5659a4db4a4`, the challenge commit is `d097f908686`, on top of `b29d7f7cdab`; the hashes below are from before that rebase. I applied these recommendations for the shared commit, together with the sibling branch's:
- `_real_lib_path(path, tools_dir)` now takes the directory, so its test needs no monkeypatch.
- The base runner test moved to `test/unit/app/jobs/test_prepare_refusals.py`, with a `RefusingJobWrapper` dataclass and a small runner subclass.
- The Pulsar test asserts `[str(refusal)]`.
- `test_galaxy_upload_tool_path` is folded into the parametrized tests.
- Both lists gained source-checkout `tools/` paths: `upload.xml` among the own tools, `catWrapper.xml` among the reviewed.

Not acted on: dropping `test_galaxy_upload_tool_exemption_is_decided_once_per_tool` (out of scope), and the refusal wording when the refused characters come from the FTP directory (listed for John in the implementation debrief).

# Test challenges: tool_security_runtime (shared plumbing revision)

Scope: only the tests this revision added or changed. The rest were challenged in `earlier_drafts/2/test_challenges_debrief.md`.

I added one commit on top of `b32d12cc35b`: `b97274d1c5b`, "Challenge shared plumbing tests". It makes three changes:
- It merges the two Galaxy's-own-tools tests into one parametrized test, with the full level sweep for all six tools.
- It widens the "reviewed beside them" test from one tool to three.
- It makes the `ftpfile_param_shell_injection` FTP-directory refusal sweepable. The runner now creates the files a job names in the user's FTP directory, and the case gains a green job with a harm check, so the generic sweep covers the email-address slot too.

I did not drop any spec job. I only recommend changes to the shared commit's tests and did not edit them.

Results: `test_security_review.py`, `test_security_review_spec.py`, `test/unit/tool_util/security` and `test_security_refusal.py` all pass: 3105 passed. black, ruff and isort are clean. mypy on `security_review_spec.py` shows the same 2 errors as the base (`_ComputeEnvironment`, line 72). The admin doc's generated section was regenerated.

## Changes

- **Merged `test_galaxy_upload_tool_is_exempt_at_every_level` and `test_tools_galaxy_runs_itself_are_not_reviewed_at_any_level` into `test_galaxy_own_tools_are_exempt_at_every_level[...]`.**
  - The test is parametrized over upload1 plus the five `hidden_lib_tool_paths()` tools.
  - The old hidden-lib test was named "at any level" but checked only `enforce_all`/`refuse`, and never checked the once-per-reviewer log.
  - Every own tool now goes through 3 levels x 2 `when_unsure` values, asserts `tool.command` (so only the exemption leaves it unreviewed), and asserts the "it is one of Galaxy's own tools" log line 6 times.
  - The `tool.id == "upload1"` sanity check went with the merge. The lookalike tests and the integration test `test_galaxy_upload_tool_runs` cover upload1's specifics.
  - Mutation: with the `is_galaxy_own_tool` check removed from `reviewed_tool_source`, all 6 fail at `reviewed_tool_source(tool) is None`.
- **`test_other_tools_galaxy_ships_beside_them_are_reviewed` is now parametrized.**
  - It covers `sample_sheet_to_tabular.xml` (beside data fetch), the converter `datatypes/converters/bam_to_bai.xml` (under set metadata's directory), and `bundled/data_source/ucsc_tablebrowser.xml`. That last one is a stock data source tool beside upload.xml.
  - This pins the owner decision that converters and stock tools stay reviewed, at the reviewer level and not only at the predicate.
  - Mutation: exempting by directory instead of by real path in `is_galaxy_own_tool` makes `sample_sheet_to_tabular` and `ucsc_tablebrowser` fail. Before this change, only one of them was covered.
- **`TOOLS_DIR` is defined once.** It sits above `GALAXY_UPLOAD_TOOL`, which now uses it.
- **`SpecJobRunner` puts the job's FTP files in place (`_upload_by_ftp`).**
  - It creates the user's FTP directory and an empty file for each plain file name the job gives an ftpfile param, as if the user had uploaded them.
  - Names with a path separator, `.` and `..` are skipped, so a job never writes outside that directory.
  - This is test utility code, and it is what lets a green ftpfile job run with exit 0.
- **`ftpfile_param_shell_injection` gains a green job with a harm check.** The job is `f: reads.txt`, with a file that exists.
  - This makes the case a sweep base. The sweep (not trusting the review to know what a tool reads) now sets every payload into `inputs.f`, `user.email`, `user.username` and the preferences.
  - Mutation: with the ftpfile branch in `_accessor_values` disabled, the sweep job `ftpfile_param_shell_injection-green-1-user.email-0` fails independently of the hand-written red job. Red job 1 also fails, under both evaluators and in log mode.
  - Before this change, the case had no green job with a harm check, so the sweep never covered it.
- **The FTP-directory red job pins its message.** The added `message_contains` is `"the value of input 'f' contains the characters [$ ']"`. The value `reads.txt` has neither character, so this asserts that the refusal reads the directory as Galaxy writes it, not only that some shell-injection refusal happened.
- **Docs:** `doc/source/admin/tool_security_review.md` regenerated for the new green job.

## Challenged and kept

- **`file_param_stays_quoted` green jobs.**
  - Job 0 (a quote-breaking name, no harm check) pins that the value is not refused. A sweep job allows "refused or harmless", so it cannot pin that.
  - Job 1 (`/dev/null`, harm) exists only to make the sweep base exit 0, and its doc says so.
  - The review has no findings here, so these jobs prove the rendered value stays sanitized end to end, not the job check.
- **`repr_python_literal` green harm job.**
  - It is the evidence for the analyser's "repr() in code position is one literal" verdict. It covers a raw value and a sanitized value with exec code.
  - I considered a value with a backslash and both quote kinds. I declined it: whatever Galaxy reads, the result depends only on CPython's repr.
  - The sweep's shell payloads add little here (the sweep docstring says so), but they are harmless.
- **`repr_inside_python_string` / `json_inside_python_string`.** Each red job is a quote-free exec payload with harm (exit 0) and the `[( )]` message, and each green job is plain punctuation. Kept as is.
- **`SpecJobRunner` FTP config.** `ftp_upload_dir` is set to the runner's directory, and `user_ftp_dir` mirrors `ProvidesUserContext.user_ftp_dir` with the default `email` identifier and template. Calling the real property would need a trans. The comment says it mirrors that property, so kept.
- **Removal of `test_galaxy_upload_tool_path` from this branch.** It is now in the shared `test_security_refusal.py`, unchanged in substance. Nothing on this branch still imports `is_galaxy_upload_tool`.
- **Not in scope, noted:**
  - `test_galaxy_upload_tool_exemption_is_decided_once_per_tool` counts calls to a monkeypatched `reviewed_tool_source`, which is an implementation detail. The merged test's log count already shows once-per-reviewer-and-tool behaviour. It is a candidate to drop in a later pass.
  - `upload_job()` is a `SimpleNamespace` stub, like the 8 ported job stubs in the file. A shared small dataclass for all of them would read better, but converting only one would be inconsistent, so I left it.

## Not addressed

- When the refused characters come from the FTP directory (the email address), the refusal still says "the value of input 'f' contains the characters ..." and suggests renaming the dataset or changing the value. The user cannot fix the problem that way. This is a UX wording choice for John, not a test issue.
- No integration test for ftpfile: it would need an FTP-configured server, and the spec runner already uses the real evaluator. No E2E test is needed, since there is no UI.

## Shared commit (recommendations)

Shared commit S, `873d6552976`, is carried by the sibling branch too. These are recommendations only, and none was applied.

- **`test_own_tools_resolve_beside_the_real_tools_directory`** monkeypatches the private `security_refusal._TOOLS_DIR` and calls the private `_real_lib_path`. A small refactor, `_real_lib_path(path, tools_dir)` with the directory passed in, would drop the monkeypatch and test the same packaged-layout behaviour.
- **`test_runner_fails_a_refused_job_without_an_error`**
  - It tests `BaseJobRunner.prepare_job`, so it belongs under `test/unit/app/jobs/`, beside the parametrized Pulsar test, not in the refusal module's test file.
  - Its `SimpleNamespace` job wrapper (lambdas for `get_id_tag`, `get_state`, `prepare`, `fail`) would read better as a small dataclass. That dataclass could be shared with `test_rejected_job_fails_without_resubmission`.
  - Without S, `ToolInputRejected` falls into the generic `except` and is failed with `exception=True`, so the test does fail at its own assertion.
- **`test_rejected_job_fails_without_resubmission` (Pulsar).** The `message` parameter repeats `str(refusal)`, and `test_refusal_names_its_codes_first` already pins the code-prefix format. Asserting `failures == [str(refusal)]`, as the base-runner test does, would drop the second parameter.
- **`test_other_tools_galaxy_ships_are_reviewed`.** Its comment says "Stock tools, through bundled and through the directory it links to in a source checkout", but it lists only the `bundled/` form. Either add `<root>/tools/filters/catWrapper.xml` or trim the comment.
- **`test_galaxy_own_tools`.**
  - Consider adding `<root>/tools/data_source/upload.xml`. A source checkout's default tool conf loads upload from there (`tool_path` defaults to `tools`).
  - That path is covered today only through realpath equality, and end to end through the integration test.
- **`test_galaxy_runs_five_tools_as_its_own_machinery`** is a change detector of `hidden_lib_tool_paths()`. I would keep it: a new special tool should force an explicit exemption decision.
- **`test_materialized_tool_keeps_its_stored_source_path`**
  - It fails without S only because the attribute does not exist yet. That is acceptable, since the attribute is the feature.
  - It pins the half of the chain that branch 3's `test_upload_tool_from_a_tool_source_store_is_judged_by_its_stored_path` (which sets the attribute by hand) cannot.
  - Keep it.
- **`test_copies_of_galaxy_own_tools_are_reviewed`, `test_refusal_names_its_codes_first`, `test_galaxy_upload_tool_path`:** fine as they are.
