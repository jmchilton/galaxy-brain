# Description strengthening — 2026-10-12

No further development within the branch’s motivation would materially strengthen the pitch. The single documentation correction was applied: pass the pytest selector through `run_tests.sh` using `-- -k`, since its own option parser rejects bare `-k`. No strengthening task remains. The description otherwise makes a concrete, supported case for the narrow import/update migration check.

## Applied task

1. In `pr_description.md`, corrected the API test command continuation from `-k` to `-- -k`. This is a description-only correction; no behavior, checklist answer or validation result changes.

No additional implementation task is recommended. Full JavaScript parsing/reference resolution and editor repair would widen the scope and are already appropriately separated from this branch.

## Misreading map

| Likely misreading | Highlighted sentence addressing it in context | Assessment |
| --- | --- | --- |
| This changes invocation of already stored workflows or repairs their expressions. | ***This protects workflow imports and updates of tool steps; previously stored workflows retain their execution behavior until repaired.*** | Above the risk and detail folds, directly after the example. It identifies both the protected write boundary and retained stored-workflow behavior. |
| All workflow steps reject pipe labels, including legitimate subworkflow inputs. | ***This protects workflow imports and updates of tool steps; previously stored workflows retain their execution behavior until repaired.*** | The explicit tool-step restriction is reinforced in the next scope paragraph by the statement that subworkflow pipe labels remain valid. |
| This proves every reference exists or validates arbitrary JavaScript. | ***This is a targeted migration check: uncertain JavaScript is accepted conservatively, so it does not validate every input reference or expression.*** | Above folds and adjacent to named unsupported syntax. It answers the full-parser/resolver expectation without implying that all dynamic syntax disables recognized-root rejection. |
| It is an editor-only aid rather than an API contract. | ***This protects workflow imports and updates of tool steps; previously stored workflows retain their execution behavior until repaired.*** | In context, the preceding paragraph explicitly says API clients and workflow authors receive the write-boundary protection and shows the HTTP diagnostic. |

The existing highlighted sentences cover each likely audience/scope misreading. No additional highlighted disclaimer is necessary.

## Detailed review

Reviewed `d47f83c407c71649356c27065ea80e9ee360c531` against `origin/dev`, all six changed files, `pr_description.md`, all four title options, the checklist review, initial/final implementation debriefs, scope evaluation, normal review, strict code-quality review and test-challenge debrief. This is the one fresh strengthening round requested by `POLISH_BRANCH.md`.

The opener and before/after table lead with the motivating observable failure. The actual evaluator reproduction explains why the flat property reads `undefined` and a comparison against `null` silently returns the wrong boolean; this is stronger evidence than agent agreement. The table claims rejection only for its recognized static spelling. The base comparison fails at the HTTP 400 assertion with HTTP 200, rather than on a branch-only API. The description therefore needs no broader proof claim or removed hedge.

Production rejection is bounded to string expressions on tool steps whose analyzed global root contains a pipe. It retains proved roots before computed children and alongside ordinary separate dynamic access. Unsupported scope/assignment syntax, Unicode or escaped identifiers, undecoded string keys and uncertain templates can conservatively fall outside analysis. The description states both boundaries. It does not claim complete agreement with the permissive client analyzer or claim that every unknown expression is proven safe. The unchanged shared fixture and removed client-only Python matching policy are accurately described.

Migration guidance distinguishes conditional nesting from repeat indexing: `queries_0|input2` becomes `inputs.queries[0].input2`, rather than suggesting a blind split at `|`. The server error presents `cond|input1` as an example, not a generated repair for the actual arbitrary connection. Stored workflow invocation is unchanged, while import and update can now reject recognized obsolete spelling. The risk section calls out the accepted workflow-artifact/API contract change and the deliberate detection gaps. A broader resolver, full parser or repair flow remains separate work.

The recorded 29-case count is consistent with the diff: six original API tests, sixteen accepted-expression cases, five proved-root rejection cases and one update-persistence case make 28 API cases, plus one shared-spec unit test. The actual-evaluator evidence for sixteen accepted expressions is separately identified. These results were checked against the debriefs rather than rerun in this description review. Fork CI is explicitly pending; the description does not claim green CI. Human reading remains unchecked.

All four titles fit the final motivation and avoid claiming full reference validation. The first title is the clearest match to the recognized obsolete flat-input rule. No second frontier-model review is claimed or fabricated.

The API command has a real usability defect: running its documented prefix with bare `-k` exits 1 with `ERROR: Invalid option -k`, before starting tests. `run_tests.sh` handles `--` by ending its own option loop and later appends the remaining arguments to pytest unchanged, so `-- -k` is the required repair. The direct unit command is valid in an appropriately prepared Galaxy test environment; `pytest.ini` provides `pythonpath = lib`.

No code or description was mutated by this reviewer, no PR was opened or posted, and no approval is recorded. The parent applied the single documentation correction (`-- -k`); this reviewer reread the corrected command. No strengthening task remains. Retain the human-read checkbox for John and hand off without another strengthening loop.
