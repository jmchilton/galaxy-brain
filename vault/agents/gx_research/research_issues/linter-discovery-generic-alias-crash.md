# Linter discovery crashes on module-level generic aliases under Python 3.10

- Area: lib/galaxy/tool_util/lint.py
- Found while: [[Component - Tool Linters]]
- Galaxy SHA: 65e6daff
- Severity: low (latent; nothing triggers it at this SHA)

## Problem

`lint_tool_source_with_modules` (`lint.py:428-443`) iterates over every member of each `galaxy.tool_util.linters` submodule and runs `inspect.isclass(value) and issubclass(value, Linter) and not inspect.isabstract(value)` on each one. On Python 3.10, `inspect.isclass(dict[str, list[str]])` is `True`, because `types.GenericAlias` passes `isinstance(x, type)`. `issubclass(alias, Linter)` then raises `TypeError: issubclass() arg 1 must be a class`, because `Linter` is an ABC. Galaxy supports `requires-python >=3.10`.

As a result, a PEP 585 alias such as `Foo = dict[str, list[str]]` at module level in any linter module breaks every lint call on 3.10. That includes `lint_user_tool_source`, so user-defined tool create and edit (`managers/tools.py:207`) and the custom-tool agent also fail. Python 3.11 and later are unaffected, so local runs on newer Pythons don't catch it. `test_linter_module_list` (`test/unit/tool_util/test_tool_linters.py:3652`) uses the same check.

## Evidence / repro

- CPython 3.10.22: `inspect.isclass(dict[str, list[str]])` returns `True`, and `issubclass(dict[str, list[str]], L)` raises `TypeError` when `class L(ABC, Generic[T])`. On 3.11 and 3.12, `isclass` returns `False`.
- This happened in CI on the first #23884 attempt, which added `ParamQualifiedPaths = dict[str, list[str]]` to `linters/_util.py` (galaxy-brain `branches/active/upgrade_advice_structured_like/earlier_drafts/1/implementation_debrief.md`). That branch's guard in `lint.py` never reached dev.

## Suggested fix

In discovery, skip `types.GenericAlias`, or require `isinstance(value, type)` before `issubclass`. Also skip classes whose `__module__` is not the module being scanned. Add a unit test that puts a generic alias in a fake linter module passed through `extra_modules`. Drop the 3.10 special case when Galaxy drops 3.10.
