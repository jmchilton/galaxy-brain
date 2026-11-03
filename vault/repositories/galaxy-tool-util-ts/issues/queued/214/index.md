# galaxy-tool-util-ts#214 — strict-state passes SQL that violates query_tabular regex validator

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/214
Related: [#213](../../needs_decision/213/index.md)

[Repro fixtures](repro/): `with_multiline` (passes TS, wrong), `with_1line` (rejected), `wrapped` (passes, correct)

## Triage (2026-11-03)

Checked on `origin/main` `f5470fe5` (TS) and `jmchilton/wf_tool_state` `8bf22007fcd` (Python gxwf).

**gxwf (TS) bug, but not the one reported.** TS *does* evaluate regex validators. The issue's single-line `WITH ... SELECT ...` example is rejected by both `validate` and `draft-validate --concrete`. The miss is multi-line SQL whose later line starts with `SELECT`.

- Root cause: `packages/schema/src/schema/validators/regex.ts` `applyRegex`. Galaxy uses `regex.match` (`tool_util_models/parameter_validators.py` `regex_validation`), which anchors at string start even under `(?m)`. TS maps `(?m)` to the JS `m` flag, prepends `^` and calls `.test()`. With `m`, `^` matches at *any* line start.
  - `regex.match(e, "WITH ...\nSELECT ...")` returns `None`.
  - JS `/^\s*select\s+.*\s+from\s+.*$/ims.test(...)` returns `true`.
- Python wf_tool_state rejects `with_multiline` correctly.

Other silent gaps in the same file that #214's "report unsupported validators as skipped" ask covers:

- `negate` uses an unanchored `.test()`, so it rejects values Galaxy accepts.
- A pattern that won't compile drops the validator silently (`catch { return schema }`). Unsupported Python flags (`a`, `L`, `u`, `x`) are dropped silently.
- `applyValidators` silently skips unregistered validator types.
- `--mode json-schema` omits `pattern` for flagged regexes, so they are never enforced there.
- TS exempts `""` from regex. Galaxy matches `""` too; check Galaxy's optional/empty handling before changing this.

**Upstream (Galaxy), real bug.** `Tool.check_and_update_param_values(update_values=True)` is called from `ToolModule.recover_state` / `check_and_update_state` with `workflow_building_mode=True`. It replaces an invalid stored value with the default (`""` for text) and records only an upgrade message. API invocations proceed silently, which is why job 77 ran with an empty `sqlquery`. Arguably an invalid stored value should fail the invocation. `galaxyproject/galaxy` isn't greenlisted, so ask before filing.

## Sketch

1. Match semantics: compile with the sticky `y` flag and no `^` prepend, and test with `lastIndex = 0`. This equals Python `re.match` and keeps `m` meaning for `^`/`$` inside the pattern. Apply the same to `negate`.
2. A validator that can't be enforced (bad pattern, unsupported flag, unregistered type) marks the step `skip_unsupported_validator` instead of passing. `--strict-state` already exits 2 on any non-ok/non-fail status.
3. JSON-schema mode: apply the same rule, or fall back to the effect decode for flagged regexes.
4. Tests: unit tests for `applyRegex` with Python `re.match` cases (multi-line, `negate`, flags). Add `with_multiline`/`wrapped` to the shared declarative fixtures. Python already passes them.
