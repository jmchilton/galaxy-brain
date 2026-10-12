# Test challenges — 2026-10-12

Reviewed Galaxy's `doc/source/dev/writing_tests.md`, client testing guidance, and both vault E2E writing/component references. The branch changes server workflow import/update validation; tests should primarily exercise those HTTP boundaries.

## Changes and findings

The original six API tests already exercised rejection, mixed dynamic access, child-property reads, supported nested spellings, fully computed accesses and legitimate subworkflow pipe labels. They use real imported workflows and no mocks, so they remain. The small format2 fixture constructs actual tool-state/connection input rather than a fake manager or request object.

Added 22 parametrized/API cases: sixteen valid expressions outside the strict static subset must import and round-trip unchanged; five cases must still reject a proved flat root even with computed/escaped children, separate template access or a quoted arrow string; and an editor-style update must reject the obsolete spelling while preserving the prior persisted workflow. Parametrization identifies each expression independently in failures.

The initial sixteen-case regression run failed ten valid import examples before the fixes and passed six controls. Scope declarations/functions, a Unicode identifier suffix, templates and escaped literal keys were being mistaken for proved global input paths. Further independent review exposed nested-template text leaking through interpolation braces in regexes/comments, input rebinding without a declaration, and a quoted arrow incorrectly disabling static checking. The backend now handles these unsupported constructs conservatively rather than interpreting arbitrary JavaScript scopes/escape rules. Proven pipe roots preceding ordinary dynamic children or alongside ordinary dynamic template accesses remain rejected.

All sixteen permissive examples were also evaluated using Galaxy's real `do_eval` with nested input state: every example is valid and returns `True`. This establishes actual compatibility examples rather than inventing unsupported strings only to satisfy an analyzer test.

## Unit-test challenge

Retained the shared YAML reference-analysis contract. Exact static-path and dynamic-access expectations document the analyzer's supported subset and check agreement with the independently implemented client analyzer; HTTP import tests cannot express that cross-language contract. Every shared `static_paths`/`dynamic` assertion remains intact, and the fixture itself is unchanged.

Removed the unused Python `expression_references_input` helper, prefix matcher and associated client-only `references_input` assertions. Production Python only consumes `analyze_input_references`; input-to-edge matching is editor policy. The Python fixture consumer explicitly skips cases containing only that client policy. This removes a test-only port instead of carrying unused APIs or conflating permissive editor matching with strict server rejection. New compatibility regressions are API tests, not additional implementation-oriented unit tests. No mocks, `SimpleNamespace` fixtures or patched manager internals were introduced.

## Browser E2E decision

No new browser test is warranted for this change. The behavior is a backend write-boundary contract, reached by imports and editor saves, and the new real HTTP update test uses editor-format workflow content and verifies persistence after a rejected save. There are no client rendering, navigation or interaction changes to exercise. A browser test would repeat this server coverage while adding unrelated page setup. If a future change introduces an editor repair flow or error presentation, that visible behavior should receive a smart-component E2E test. Existing nested-input runtime workflow fixtures remain unchanged; this review did not add duplicate execution or browser coverage.

## Validation

Final targeted run: **29 passed**, 398 deselected, in 21.20 seconds. This comprises the six existing API tests, twenty-two new API cases and the shared analyzer contract test. The run uses the existing Galaxy root virtualenv, `PYTHONPATH=lib:test`, the backend-test skill defaults, and functional sample tools; no dependencies were installed into that environment. Two existing namespace-package deprecation warnings were emitted.

Additional compatibility check: all sixteen permissive examples evaluate `True` through Galaxy's real JavaScript evaluator and have no proved static input paths. `git diff --check` passes. No API behavior was weakened to make these checks pass; unsupported syntax is explicitly conservative, while proved obsolete roots remain covered by rejection tests.
