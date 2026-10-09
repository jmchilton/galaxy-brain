# Iteration 13 strict maintainability audit

Approved. No structural regression, unjustified abstraction, cast proliferation,
or missed substantial simplification remains in this iteration. Reviewed only
the 16 changed test files relative to
`ba5800a26798382da706088dca0947a769b19641`, using the full shared strict quality
prompt. No source changes were needed during the audit.

## Structural simplifications

The strongest simplification is upload submission: a lifecycle-only harness
replaces invented UI controls, error catching, JSON serialization, selectors,
and repeated microtask flushing. The actual public async operation remains the
test action. Its held-response cancellation scenario removes wall-clock timing
and proves early resolution rather than observing an empty text container.
The suite shrinks from 528 to 476 lines while retaining its upload/batch/error
contracts and splitting independent signal modes.

Canonical history, file-source, collection, workflow, and upload factories remove
parallel object definitions. The history factory migration follows into the
archive selector as a concrete supporting consumer. A new generic fixture or
mount library would add concepts without replacing repeated domain behavior.
Local mount helpers pay for themselves through multiple cases with the same
component and lifecycle setup; scenario values and assertions stay at the call
site. Export-link extraction replaces positional identity calls with one visible
ordered array.

Named tables replace loops or several unrelated assertions in Tags/model,
invocation titles, and collection descriptions. They preserve literal inputs
and expectations rather than deriving expected values from the implementation.
The collection table still tests prop updates. Selection, workflow-id reload,
date modes, Lint store removal, and dataset display interactions retain their
dependent transitions.

## Ownership and boundaries

Fresh Pinia instances are supplied through the existing `withPlugins` helper;
stores are seeded on that same instance. Automatic component teardown, stopped
Lint scopes, stopped run watchers, reset module mocks, restored spies, and restored
date timers prevent state from surviving failed assertions. Cleanup wrappers
remain short and local; no new state-machine/helper framework was introduced.

Typed invocation summaries and `satisfies` upload rows replace assertion casts.
The Lint fixture's documented `unknown as Steps` boundary intentionally represents
incomplete historical steps and is cloned each time; filling defaults would erase
the test conditions. Existing Vue compatibility casts remain narrow mount
boundaries. OpenAPI parameters stay inferred; the workflow response uses
`response.untyped` for its summary shape rather than weakening handler typing.
Minimal route/tool-name mocks represent external dependencies rather than the
logic being asserted.

## Size and complexity

All changed files remain well below 1,000 lines. The largest, upload submission,
shrinks to 476 lines; the next largest is useActiveContext at 287. The aggregate
iteration diff removes more lines than it adds (643 additions, 761 deletions).
No production component, API, dependency, test configuration, README rule, or
shared helper was changed. No new ad hoc feature branch, generic optional mode,
or architecture boundary was introduced. The cancellation promise gates model
the one scenario's request ordering directly; their response release is protected
by `finally`.

No further decomposition would remove a clear category of complexity within this
scoped change. Existing guidance already explains the improvements, so no new
best-practice rule or marginal advice is warranted.

## Validation and limits

Verified authoritative artifacts: 161 passing cases in 16 affected files,
zero skips/failures, shuffled seed 130151; full client typecheck, scoped ESLint
with zero permitted warnings, and Prettier all exit zero. The driver reports a
clean source diff check. CI and browser suites are outside this local evidence.
