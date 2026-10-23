(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change only changes which message reaches the user when a tool's JavaScript expression fails during job preparation, and doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `global_tool_logs` wraps every templating action (command line, config files, environment variables), so every `WorkflowException` raised there now becomes an `ExpressionTemplateError`, which the job runner reports verbatim to the user instead of the generic wrapped message.
- The surfaced text is the JavaScript engine's error line; it can quote parts of the expression or input values, now visible in `misc_info`.
- `ExpressionTemplateError` is re-raised unwrapped instead of being converted to `ToolTemplatingException`; any caller that caught only the latter would no longer see it.
- `expression_error_message` parses free-form engine output by line heuristics; a different engine/node version format could yield a less useful line (falls back to the first line).

</details>

<details><summary>Risk Review Advice</summary>

Confirm nothing catches `ToolTemplatingException` specifically around command-line/config-file building in a way that now misses the re-raised `ExpressionTemplateError`, and that exposing the JS error text to the job owner is acceptable (it is their own tool and inputs). Otherwise this is a release-branch message improvement that is trivially revertible.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24415_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24415_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24415_review_0) (from [`84910093a8c`](https://github.com/jmchilton/galaxy/commit/84910093a8c)) narrows the PR's new user-facing path so only errors raised by the tool's own JavaScript become `ExpressionTemplateError`. Expression-worker failures (start failure, non-zero exit, malformed or oversized response, wall-clock timeout) keep the existing `ToolTemplatingException` path. The worker's `{"error": ...}` response is now raised as an `ExpressionScriptError` subclass of `JavascriptException`, and `global_tool_logs` checks for it on the `WorkflowException`'s cause. The branch also fixes `expression_error_message` for thrown strings that start with "at ", gives passed-through template parse errors the same prefix as evaluation errors, notes when an expression hit the CPU time limit, updates the `ExpressionTemplateError` docstring and tightens the unit and API tests. Diff: 7 files, +73/-15.

- [`9e4f5496f83`](https://github.com/jmchilton/galaxy/commit/9e4f5496f83) Only report JS raised by the tool's script as user expression errors. Adds `ExpressionScriptError` and folds the two new `except` branches in `global_tool_logs` into the generic one, plus unit tests in `test_evaluation.py`: a real JS error raises `ExpressionTemplateError`, and `sandbox_command=["false"]` raises `ToolTemplatingException`.
- [`5e0d77f1c7a`](https://github.com/jmchilton/galaxy/commit/5e0d77f1c7a) Skip only QuickJS stack frames when extracting the expression error. A regex matches the real frame shapes instead of any line starting with "at ". Adds a thrown-string unit test and a positive `<input>` check so the stripped-positions assertion isn't vacuous.
- [`609d1975ba6`](https://github.com/jmchilton/galaxy/commit/609d1975ba6) Prefix passed-through expression template errors like evaluation errors. Parse errors raised during job build now carry "Error occurred while <action> for tool '<id>':". Adds a unit test for this passthrough path.
- [`48215621a50`](https://github.com/jmchilton/galaxy/commit/48215621a50) Update ExpressionTemplateError docstring to cover evaluation errors. One-line docstring change.
- [`ef0496a1585`](https://github.com/jmchilton/galaxy/commit/ef0496a1585) Say when a tool expression hit the CPU time limit. Adds "(the expression timed out)" to QuickJS's `InternalError: interrupted`, with a unit test.
- [`dfe496c3489`](https://github.com/jmchilton/galaxy/commit/dfe496c3489) Check the API test's misc_info leaves out JS script positions. Adds a negative `<input>` assertion to `test_run_reports_expression_error`.

</details>

</details>



### P2 1: Expression-worker failures are reported as the tool author's expression error (implementation verified)

cwl_utils `do_eval` wraps every exception raised during interpolation in a `WorkflowException`. That includes Galaxy's own expression-worker failures from `js_engine._evaluate_in_subprocess`: the worker can't be started, exits non-zero, returns a malformed or oversized response, or hits the parent's wall-clock timeout. With the new `except WorkflowException` branch, all of these become `ExpressionTemplateError`. The runner's `prepare_job` then logs them at `info` with `exception=False` and skips the `ToolTemplatingException` Sentry fingerprinting, so a broken sandbox configuration or a crashed worker looks like a mistake in the user's tool. The new comment ("the error names the user's mistake") doesn't hold for these cases.

<details><summary>Evidence</summary>

On `84910093a8c`, the new unit test calls `global_tool_logs(lambda: do_eval("$(1 + 1)", {}, sandbox_command=["false"]), ...)`. It fails with `ExpressionTemplateError: Error occurred while building command line for tool 'expression_tool': Expression worker exited with code 1:` when `ToolTemplatingException` was expected.

</details>

Mark the worker's `{"error": ...}` response as script-raised and convert only that case. In `js_engine`, raise a `JavascriptException` subclass (`ExpressionScriptError`) for that response. In `global_tool_logs`, convert a `WorkflowException` to `ExpressionTemplateError` only when `e.__cause__` is an `ExpressionScriptError`. Everything else keeps the existing `ToolTemplatingException` path. This is about 15 lines plus tests, and it fits a release branch. Errors the worker itself catches before running any JS still come back as `{"error": ...}` and are still attributed to the user. Today these are quickjs-ng missing and the worker's own protocol-limit checks. Fixing that would mean tagging QuickJS exceptions in the worker protocol, which the branch doesn't do.

Fixed in [`9e4f5496f83`](https://github.com/jmchilton/galaxy/commit/9e4f5496f83).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `expression_error_message` reports thrown strings starting with "at " as `undefined` (implementation verified)

When a script throws something that isn't an `Error`, QuickJS outputs the value followed by `undefined`, with no stack. The heuristic skips every line starting with `at `. So `${ throw 'at least one input is required'; }` is reported as `undefined`, and `throw "..."` is a common validation idiom. The unit test's `"<input>" not in message` check would also pass if the raw error never contained script positions.

<details><summary>Evidence</summary>

Raw QuickJS error shapes from probing: `"TypeError: ...\n    at <anonymous> (<input>:10:37)\n    at <eval> (<input>:10:58)\n"`, `"...\n    at map (native)\n..."`, `"SyntaxError: ...\n    at <input>:1:2\n    at parse (native)\n..."`. A thrown string comes back as `"at least one input\nundefined"`.

</details>

Skip only lines that match the stack-frame shape: `at <input>:N:M`, `at <name> (<input>:N:M)` and `at <name> (native)`. Add the thrown-string case to the unit test, and assert that `<input>` appears in the raw error before checking that the message leaves it out.

Fixed in [`5e0d77f1c7a`](https://github.com/jmchilton/galaxy/commit/5e0d77f1c7a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: API test doesn't check that `misc_info` leaves out script positions (implementation verified)

`": TypeError" in misc_info` would also pass if the whole stack trace reached `misc_info`. Trimming the trace is the point of the change, so the API test should check for it. Add `assert "<input>" not in output["misc_info"]`.

Fixed in [`dfe496c3489`](https://github.com/jmchilton/galaxy/commit/dfe496c3489).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Passed-through template parse errors lack the build prefix and are untested (implementation verified)

The new `except ExpressionTemplateError: raise` branch passes build-time parse errors from `validate_expression_template` through unchanged ("Unterminated expression in tool command template at line ..."). Evaluation errors get the `Error occurred while <action> for tool '<id>':` prefix, so the two cases read differently in `misc_info`. Before this PR, these parse errors were hidden behind `ToolTemplatingException`. That behavior change isn't mentioned in the PR body, and no test covers it.

Re-raise with the same prefix (`raise ExpressionTemplateError(f"{message}: {e}") from e`). Add a test that runs an unbalanced `$(` through `global_tool_logs` and checks the prefixed message. A one-line mention in the PR body would also help.

Fixed in [`609d1975ba6`](https://github.com/jmchilton/galaxy/commit/609d1975ba6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: `ExpressionTemplateError` docstring now understates its use (implementation verified)

The docstring says "A `$(...)`/`${...}` block in a tool template does not parse", but the class now also carries runtime evaluation errors shown to the user. Update it, e.g. "could not be parsed or evaluated; shown to the user".

Fixed in [`48215621a50`](https://github.com/jmchilton/galaxy/commit/48215621a50).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: CPU-limit timeouts reach the user as `InternalError: interrupted` (implementation verified)

QuickJS reports its CPU time limit as `InternalError: interrupted`, which doesn't tell the user their expression timed out. Since this PR is what makes the message visible, map that case to something clearer in `expression_error_message`, e.g. `InternalError: interrupted (the expression timed out)`.

Fixed in [`ef0496a1585`](https://github.com/jmchilton/galaxy/commit/ef0496a1585).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
