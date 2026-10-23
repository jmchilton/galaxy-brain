### P2 1: Expression-worker failures are reported as the tool author's expression error (implementation verified)

cwl_utils `do_eval` wraps every exception raised during interpolation in a `WorkflowException`. That includes Galaxy's own expression-worker failures from `js_engine._evaluate_in_subprocess`: the worker can't be started, exits non-zero, returns a malformed or oversized response, or hits the parent's wall-clock timeout. With the new `except WorkflowException` branch, all of these become `ExpressionTemplateError`. The runner's `prepare_job` then logs them at `info` with `exception=False` and skips the `ToolTemplatingException` Sentry fingerprinting, so a broken sandbox configuration or a crashed worker looks like a mistake in the user's tool. The new comment ("the error names the user's mistake") doesn't hold for these cases.

<details><summary>Evidence</summary>

On `84910093a8c`, the new unit test calls `global_tool_logs(lambda: do_eval("$(1 + 1)", {}, sandbox_command=["false"]), ...)`. It fails with `ExpressionTemplateError: Error occurred while building command line for tool 'expression_tool': Expression worker exited with code 1:` when `ToolTemplatingException` was expected.

</details>

Mark the worker's `{"error": ...}` response as script-raised and convert only that case. In `js_engine`, raise a `JavascriptException` subclass (`ExpressionScriptError`) for that response. In `global_tool_logs`, convert a `WorkflowException` to `ExpressionTemplateError` only when `e.__cause__` is an `ExpressionScriptError`. Everything else keeps the existing `ToolTemplatingException` path. This is about 15 lines plus tests, and it fits a release branch. Errors the worker itself catches before running any JS still come back as `{"error": ...}` and are still attributed to the user. Today these are quickjs-ng missing and the worker's own protocol-limit checks. Fixing that would mean tagging QuickJS exceptions in the worker protocol, which the branch doesn't do.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `expression_error_message` reports thrown strings starting with "at " as `undefined` (implementation verified)

When a script throws something that isn't an `Error`, QuickJS outputs the value followed by `undefined`, with no stack. The heuristic skips every line starting with `at `. So `${ throw 'at least one input is required'; }` is reported as `undefined`, and `throw "..."` is a common validation idiom. The unit test's `"<input>" not in message` check would also pass if the raw error never contained script positions.

<details><summary>Evidence</summary>

Raw QuickJS error shapes from probing: `"TypeError: ...\n    at <anonymous> (<input>:10:37)\n    at <eval> (<input>:10:58)\n"`, `"...\n    at map (native)\n..."`, `"SyntaxError: ...\n    at <input>:1:2\n    at parse (native)\n..."`. A thrown string comes back as `"at least one input\nundefined"`.

</details>

Skip only lines that match the stack-frame shape: `at <input>:N:M`, `at <name> (<input>:N:M)` and `at <name> (native)`. Add the thrown-string case to the unit test, and assert that `<input>` appears in the raw error before checking that the message leaves it out.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: API test doesn't check that `misc_info` leaves out script positions (implementation verified)

`": TypeError" in misc_info` would also pass if the whole stack trace reached `misc_info`. Trimming the trace is the point of the change, so the API test should check for it. Add `assert "<input>" not in output["misc_info"]`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Passed-through template parse errors lack the build prefix and are untested (implementation verified)

The new `except ExpressionTemplateError: raise` branch passes build-time parse errors from `validate_expression_template` through unchanged ("Unterminated expression in tool command template at line ..."). Evaluation errors get the `Error occurred while <action> for tool '<id>':` prefix, so the two cases read differently in `misc_info`. Before this PR, these parse errors were hidden behind `ToolTemplatingException`. That behavior change isn't mentioned in the PR body, and no test covers it.

Re-raise with the same prefix (`raise ExpressionTemplateError(f"{message}: {e}") from e`). Add a test that runs an unbalanced `$(` through `global_tool_logs` and checks the prefixed message. A one-line mention in the PR body would also help.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: `ExpressionTemplateError` docstring now understates its use (implementation verified)

The docstring says "A `$(...)`/`${...}` block in a tool template does not parse", but the class now also carries runtime evaluation errors shown to the user. Update it, e.g. "could not be parsed or evaluated; shown to the user".

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: CPU-limit timeouts reach the user as `InternalError: interrupted` (implementation verified)

QuickJS reports its CPU time limit as `InternalError: interrupted`, which doesn't tell the user their expression timed out. Since this PR is what makes the message visible, map that case to something clearer in `expression_error_message`, e.g. `InternalError: interrupted (the expression timed out)`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
