# Test challenges — test cleanup, 2026-10-12

Reviewed the working revision against `HEAD`, the previous challenge debrief, Galaxy's `doc/source/dev/writing_tests.md`, `client/README.md#client-side-unit-testing`, and both vault E2E writing/component references. This fresh challenge applies to the test-only cleanup requested after implementation recovery.

## Test layer decision

John explicitly asked to clean up expensive API combinations that duplicate the exhaustive expression contract. That instruction takes precedence over the shared challenge checklist's general preference to move easily expressible unit cases to API/integration/browser tests. Galaxy's testing guide also recommends isolated unit tests for complex components that need no server or database. The expression scanner is such a component; the HTTP write boundary still needs representative API coverage.

The revision reduces the focused API collection from 28 cases to six test methods, while retaining all 22 moved expression regressions as fast parametrized analyzer contracts. The shared cross-language YAML fixture remains unchanged. Backend-only conservative handling stays in the Python tests because editor edge matching intentionally has different, permissive policy; imposing these backend expectations on the client specification would conflate those policies.

## Coverage preservation

An AST comparison of the original API parametrizations with the new Python parametrizations confirms all 21 expression strings occur unchanged in the replacement tests. The separate property-read rejection contributes the twenty-second case. No expression category disappeared:

- Sixteen permissive cases cover `const`/`let`/`var` bindings, assignment rebinding, function/arrow/method bindings, Unicode identifiers, simple/interpolated/nested templates, regex/comment content within nested templates, and hex/Unicode escapes. Each requires no proved input path and conservative dynamic classification.
- Six retained-root cases cover computed children, a quoted arrow, template children, escaped children, a separate template access, and a static child property. Exact path expectations ensure that unsupported children do not discard a proved root; the quoted-arrow and static-child controls require static classification.

These tests assert the public analyzer's reference-analysis contract. They do not inspect tokens, call private scanner helpers, derive expectations using implementation functions, or mirror the algorithm. Their regression cases originated from valid expression examples that exposed false import rejections during the prior review. That review also evaluated the sixteen permissive examples with Galaxy's real JavaScript evaluator; this cleanup does not add JavaScript evaluation to every analyzer test.

The six remaining API tests exercise behavior that analyzer tests cannot establish:

- An obsolete flat tool reference returns HTTP 400 with the step, offending reference and replacement spelling.
- A proved obsolete root still rejects when the expression also has a computed access.
- A fully computed expression imports and now explicitly round-trips unchanged.
- Both documented nested spellings import successfully within one test method.
- A rejected editor-style update leaves the prior persisted expression intact.
- A literal pipe in a legitimate subworkflow input label remains accepted.

The retained mixed-access API case proves that the manager does not ignore all static paths just because analysis also reports dynamic access. The accepted computed round-trip gives representative HTTP preservation coverage, while the backend-only variants verify the analyzer result that the manager consumes. Repeating each syntax variant through workflow creation/download would add server operations without testing another write-boundary behavior.

## Other checklist challenges

The analyzer tests and shared fixture use no mocks, monkeypatches, `SimpleNamespace`, fake managers or fake request objects. No mock replacement, dataclass fixture rewrite or production restructuring is needed. The API cases use real workflows and the existing API/populator helpers; the small workflow fixture remains real Format2 workflow content. No assertions were weakened to make failing tests pass; the moved tests preserve the regression cases and directly assert their relevant contract.

No client source or Vitest test changes are part of this cleanup. The existing client fixture consumer remains subject to the previously reviewed client testing guidance. No new browser test is warranted: this revision changes test placement only, and the feature's import/save boundary and failed-save persistence already have real HTTP tests. There is no new rendering, navigation, interaction or error presentation to test through smart components. No duplicate workflow execution test is needed for a static reference-analysis change.

## Validation and conclusion

Inspected the completed focused run in `/tmp/when_test_cleanup.log`: **29 passed**, 398 deselected, in 31.59 seconds, with two existing namespace-package deprecation warnings. The 29 selected cases are 22 new analyzer parametrizations, the unchanged shared-spec consumer and six API tests. This preserves the focused regression count while removing 22 expensive API cases; the nested-spelling API method intentionally still performs two imports. The total run time includes server setup and is not a before/after performance benchmark.

No additional test edits are recommended. The user-directed balance of exhaustive fast contracts and representative HTTP tests is appropriate, and the cleanup retains every discovered regression category.
