# `LintContext.failed()` raises UnboundLocalError for fail levels below WARN

- Area: lib/galaxy/tool_util/lint.py
- Found while: [[Component - Tool Linters]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`LintContext.failed(fail_level)` (`lint.py:320-329`) assigns `lint_fail` only when `fail_level == LintLevel.WARN` or `fail_level >= LintLevel.ERROR`. For `"info"`, `"check"`/`VALID` or `"all"`, the method reaches `return lint_fail` without assigning it and raises `UnboundLocalError`. The public entry points `lint_tool_source` and `lint_xml` take `fail_level` as a parameter, and the signature doesn't stop a caller from passing these values.

## Evidence / repro

Read in code. Galaxy's own CLI (`galaxy-tool-data-lint`, `data/bundles/script.py`) limits `--fail-level` to `warn` and `error`, so no Galaxy caller reaches the bug.

## Suggested fix

Treat levels below WARN as "any message at or above that level", or raise a `ValueError` naming the supported levels. Add a unit test for `failed("info")`.
