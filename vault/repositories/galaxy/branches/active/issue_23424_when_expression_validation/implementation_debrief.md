# Implementation handoff — 2026-10-12

READY for human review: the recovered branch keeps the original narrow migration check, fixes false-positive import rejections, and passes the required independent reviews and targeted validation. Polishing completed the description and final pitch review; fork CI on the new head remains pending.

## Final behavior and choices

Workflow imports and updates reject statically recognized obsolete flat nested tool-input roots with HTTP 400, naming the step ID/label and offending reference and giving an illustrative supported spelling. Legitimate subworkflow labels containing a pipe still import. Proven roots remain rejected before computed children or alongside separate ordinary dynamic access.

The scanner deliberately declines uncertain binding/lexical constructs, including declarations/functions, assignments, Unicode/escaped identifiers, templates and undecoded string literals. This prevents compatibility regressions without promising complete JavaScript or reference validation. The shared client specification checks every overlapping static/dynamic expectation; the unused Python client edge-matching policy was removed. Client behavior and the shared YAML itself are unchanged.

Release guidance now covers imports, updates and repeats (`queries_0|input2` becomes `inputs.queries[0].input2`). No guessed rewrite or editor repair was introduced. The scope review recommends the implemented rule; warning-only validation, a full parser/resolver, editor repair and runtime/value_from diagnostics remain separate work.

## Validation and evidence

- Targeted real Galaxy API/shared-contract suite: 29 passed (28 API cases plus one shared analyzer specification test), including rejected editor-format updates preserving stored content.
- Before the fixes, new compatibility tests reproduced 10 false rejections. All 16 accepted examples now also evaluate true through Galaxy's real expression evaluator.
- The original import rejection assertion was run against the unmodified dev workflow manager loaded by a temporary pytest plugin: it failed at the expected HTTP 400 assertion because dev returned HTTP 200. This was a manager baseline comparison using the same real API test harness, not a failure on an API added by the branch.
- For nested state with `cond.input1 = null`, Galaxy do_eval returns true for `inputs["cond|input1"] !== null` and false for the correct `inputs.cond.input1 !== null`, reproducing the motivating silent mismatch.
- Repository-pinned Ruff passes on all changed Python files. Black (Python 3.10 target), isort and whitespace checks pass. Mypy passes for the new analyzer. Commit hooks pass, including flake8 and symlink checks.
- Normal review and strict code-quality review findings were fixed and independently checked; scope evaluation recommends keeping the implemented scope. Browser tests/screenshots are inapplicable because this is a server write-boundary change with no client interaction or rendering changes.

## Branch and approval

Base: dev `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`. Pushed head: `d47f83c407c71649356c27065ea80e9ee360c531`. Worktree is clean. The implementation recovery commit is `d47f83c407c`; it follows the three unchanged rebased patches.

No PR was reopened or created. Closed #23817 remains historical context, and John will choose whether to reopen it or use a fresh PR after reading the proposed description and tests/comments. No final approval is recorded for this SHA.
