Fixes #23147.

## What was happening

A user-defined tool's `shell_command` is interpolated as a CWL-style parameter reference template, so `$(` opens a Galaxy expression. The tool behind the Sentry report was an ordinary bash script full of command substitutions, one of which left a quote open inside `$( )`. cwl_utils' scanner cannot read that, and the path it takes is the problem:

```python
# cwl_utils/expression.py, do_eval
try:
    return interpolate(...)
except Exception as e:
    _logger.exception(e)                       # <- the Sentry event
    raise WorkflowException("Expression evaluation error:\n%s" % str(e)) from e
```

It logs the `SubstitutionError` itself, which is why the issue body is a `SubstitutionError` whose only frames are `do_eval` / `interpolate` / `scanner` with no Galaxy frame. Galaxy then received a `WorkflowException` during job prep, which `BaseJobRunner.prepare_job`'s generic handler logged a *second* time and failed the job with `Expression evaluation error: Substitution error, unfinished block starting at position 90: ...`.

So: two error-reporter events per attempt, and a message that names a character offset into a template the author never sees.

## What this does

`validate_expression_template()` walks cwl_utils' own `scanner` over the template before anything is evaluated — the same walk `interpolate` performs, minus the JavaScript. No grammar is reimplemented, so there is nothing to drift out of sync with the version Galaxy pins. When the scan fails it raises `ExpressionTemplateError`:

```
Unterminated expression in tool shell_command at line 2, column 6:
'$(wc -l < "$f)"\n  echo "$f $n"\ndone\n'. '$(' opens a Galaxy expression, so the
parentheses and quotes inside it have to balance; write '\$(' to pass a literal
shell command substitution through to the shell.
```

Three call sites:

| Where | Effect |
|---|---|
| `do_eval` | Validates before evaluating, so cwl_utils never sees — or logs — a template it cannot read |
| `DynamicToolManager.create_unprivileged_tool` | `shell_command` and every configfile are checked, so a tool that could never run is refused with a 400 instead of stored |
| `BaseJobRunner.prepare_job` | Classified alongside `ParameterValueError`: the job fails with the message, no traceback logged |

The escape the message recommends is verified end to end, not assumed: `do_eval("echo \\$(date) > $(inputs.out)", {"out": "out.txt"})` returns `echo $(date) > out.txt`.

## Tests

Four unit tests in `test/unit/app/tools/test_expression_basics.py` and one API test in `lib/galaxy_test/api/test_unprivileged_tools.py`.

Both were verified red first against the unmodified branch point:

- `do_eval` on the unterminated script logged the full `SubstitutionError` traceback at ERROR and raised `WorkflowException`; it now raises `ExpressionTemplateError` and logs nothing.
- The API test failed with `KeyError: 'err_code'` — the tool was created and stored.

`test/unit/app/tools/` and `test/unit/app/jobs/`: 592 passed. Seven failures (six in `test_metadata.py`, `test_runner_local.py::test_galaxy_lib_on_path`) reproduce identically on the unmodified branch point and are unrelated. mypy, black, ruff, flake8 clean.

## Still open — the other half of this failure mode

Pre-scanning removes the `SubstitutionError` class of report completely. It does **not** help the more common sibling: a template that scans cleanly but whose `$( )` body is not the JavaScript the author meant.

```
echo "$(date)" > out.txt    # scans fine, evaluates as JS:
                            # ReferenceError: date is not defined
```

Note that `$(date)` is *valid* JavaScript — it is a reference to an undefined name — so a parse-only pre-check would not catch it either. The failure is only observable by evaluating, which is exactly what already fails, and cwl_utils logs it on the way out just as it did the `SubstitutionError`. Options, none taken here:

- Translate the `WorkflowException` that `do_eval` re-raises into `ExpressionTemplateError` as well, so job prep classifies it as an author error and the message reads better. Cheap, but it would also relabel genuine engine faults (a crashed or unavailable worker) as the author's fault, which wants more thought than a Sentry fix.
- Quiet the `cwl_utils` logger in Galaxy's logging config so only Galaxy's own classification reaches the reporter — which also hides real engine bugs.
- Make `$(` mean something friendlier in user tools, a design change well beyond this.

Worth its own issue; happy to file one.

## Target branch

Against `release_26.1` — a bug fix, so the current release branch rather than `dev`; the forward merge carries it to `dev`.

`create_unprivileged_tool` here already runs `lint_user_tool_source()`; the template check sits directly after it. The lint pipeline does not catch an unparseable `$(` — `lint_user_tool_source()` returns no bullets for the tool in the API test — and it cannot easily, since `cwl_utils` is only an optional `cwl` extra of `tool_util` while a reimplemented scanner would risk accepting templates that later fail at runtime.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
