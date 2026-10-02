# Galaxy implementation of Planemo issue #904

Reviewed the working diff on `issue-904-reserved-input-names` in `/Users/jxc755/projects/worktrees/galaxy/branch/issue-904-reserved-input-names` against `origin-https/dev` on 2026-09-30.

No blocking findings.

The new input linter belongs in Galaxy's shared tool-util package, which Planemo consumes. It reuses Cheetah's `Template.Reserved_SearchList`, the same collection Cheetah checks for NameMapper collisions, and Galaxy's `_parse_name` for argument-derived parameter names. Limiting warnings to top-level parameters and groups avoids false positives for qualified nested inputs. Missing names remain the responsibility of the existing validation linters. Cheetah is already provided through `galaxy-util[template]` in the tool-util package dependencies.

Coverage includes parameters, argument-derived names, all three input group types, XPath reporting, case sensitivity, explicit name precedence, and nested names. The rendering tests demonstrate both the actual `$sleep` collision and successful nested lookups, making them useful regression checks rather than implementation-only assertions.

The coordinator reports 121 passing tests across `test_tool_linters.py` and `test_fill_template.py`, plus passing Ruff after formatting. Independently checked `git diff --check`, Cheetah's collision check, and Galaxy's parameter naming and template context construction. Planemo CLI integration verification remains with the coordinator.
