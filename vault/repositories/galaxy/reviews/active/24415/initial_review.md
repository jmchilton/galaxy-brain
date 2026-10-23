# Initial review — galaxy#24415 (default profile)

- Profile: `default`
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `84910093a8c` (base `release_26.1`)

## Verdict

Small, well-targeted fix. The user now sees the JavaScript error, and the API test covers it. One real classification issue: the new `WorkflowException` branch also catches expression-worker infrastructure failures, which are reported as the tool author's mistake. The message-extraction heuristic has a small edge-case bug. The rest are nits.

Probed with `do_eval` against the worktree (borrowed venv from pr/24413):

| expression | `expression_error_message` |
|---|---|
| `$(inputs.x.elements[0].path)`, x=[] | `TypeError: cannot read property '0' of undefined` |
| `$(nosuchvar)` | `ReferenceError: nosuchvar is not defined` |
| `$(inputs.x + )` | `SyntaxError: unexpected token in expression: ')'` |
| `${ while(true){} }` (timeout) | `InternalError: interrupted` |
| `${ throw 'plain message'; }` | `plain message` |
| `${ throw 'at least one input is required'; }` | `undefined` ← bug |

## Bugs

### P2 1: Worker/infrastructure failures are reported as user expression errors

cwl_utils `do_eval` wraps **every** exception raised during interpolation (`cwl_utils/expression.py`, `except Exception: raise WorkflowException("Expression evaluation error:\n...")`). That includes Galaxy's own worker failures raised in `js_engine._evaluate_in_subprocess`: "Could not run expression worker", "Expression worker exited with code N: <stderr>", "Malformed response from expression worker", and the protocol-limit errors. These now become `ExpressionTemplateError`, so `prepare_job` logs them at `info` with `exception=False` and shows the user the worker text. Before, they went through `ToolTemplatingException` and `log.exception`. A broken sandbox config or a crashed worker is an admin problem, not a tool-author one. The new comment ("the error names the user's mistake") isn't true for these cases. cwl_utils does still call `_logger.exception`, so the traceback isn't lost entirely.

Suggested fix: make the user-facing branch match only JS errors the script itself raised. For example, have `_evaluate_in_subprocess` raise a `JavascriptException` subclass (e.g. `ExpressionScriptError`) only for the worker's `{"error": ...}` response. In `global_tool_logs`, convert a `WorkflowException` only when `isinstance(e.__cause__, ExpressionScriptError)`. Anything else falls through to the existing `ToolTemplatingException` path. Add a unit test with a failing `sandbox_command` (e.g. `["false"]`) that asserts `ToolTemplatingException` is still raised.

### P3 1: `expression_error_message` returns `undefined` for thrown strings starting with "at "

For non-`Error` throws, the worker output is `<value>\nundefined` (no stack). The heuristic skips any line starting with `at `. So `throw "at least one input is required"` is reported as `undefined`. `throw "..."` is a common validation idiom in CWL-style expressions. The root issue is that the helper scrapes a stringified QuickJS exception (message + stack) in `galaxy_ext/expressions/sandbox_worker.py` (`{"error": str(e)[:500]}`). Cleaner: have the worker send the message and stack as separate fields, or put just the message (`e.message`/`String(e)`) in `error`. Then `expression_error_message` reduces to taking the last header-stripped line, or goes away. At minimum, only skip lines matching the stack-frame shape (`at <...> (<input>:N:M)` / `at <input>:N:M`), and add the thrown-string case to the unit test.

## Nits

### P3 2: `ExpressionTemplateError` docstring now understates its use

`ExpressionTemplateError` is documented as "A `$(...)`/`${...}` block in a tool template does not parse". After this PR it also carries runtime evaluation errors. Update the docstring (e.g. "A tool expression template could not be parsed or evaluated; the message is shown to the user"). Alternatively, add a sibling `ExpressionEvaluationError(ExpressionTemplateError)` so the parse/evaluate distinction stays visible to callers and in logs.

### P3 3: Two `ExpressionTemplateError` paths produce differently prefixed messages

The new pass-through branch re-raises parse errors from `validate_expression_template` unchanged ("Unterminated expression in tool command template at line ..."). Evaluation errors get the `Error occurred while building command line for tool '<id>': ...` prefix. This pass-through is also a behavior change the PR body doesn't mention: build-time parse errors were previously hidden behind `ToolTemplatingException`. Prefixing both the same way (or neither) keeps misc_info consistent. A one-line mention in the PR body would help.

### P3 4: Timeouts surface as `InternalError: interrupted`

The QuickJS CPU interrupt reaches the user as `InternalError: interrupted`, which doesn't tell them the expression timed out. Mapping it to e.g. "expression timed out" (in the worker or in `expression_error_message`) would make the newly exposed message useful for this case. The wall-clock path in `js_engine` already says "timed out".

## Checked, no issue

- The `cwl_utils.errors.WorkflowException` import at module top is fine: `galaxy.tools.expressions` already depends on cwl_utils. `cwltool.errors.WorkflowException` is the same class, but no build phase in `global_tool_logs` runs cwltool, so no unrelated cwltool errors are caught.
- Pulsar `prepare_job` (`lib/galaxy/jobs/runners/pulsar.py` ~L561) catches `Exception` and uses `str(e)`, so it also benefits. It logs `ExpressionTemplateError` with `log.exception`, unlike the base runner's `log.info`, but that predates this PR.
- Sentry fingerprinting in `app/__init__.py` only applies to `ToolTemplatingException`. User JS errors moving off that path reduces noise, which is the right result (subject to P2 1 for infra failures).
- Tests: the API test fails without the change per the PR body, and it asserts both the prefix and `: TypeError`. The unit test checks that script positions are stripped. Coverage is proportionate; add the edge case from P3 1.
