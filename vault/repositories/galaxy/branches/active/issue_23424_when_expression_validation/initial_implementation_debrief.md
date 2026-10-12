# Initial implementation recovered — 2026-10-12

The existing branch rejects statically recognized flat nested tool input references at workflow import and provides step/reference diagnostics. It ports the editor reference analyzer into Python and runs its language-neutral shared specification; six API tests cover rejected flat roots, mixed dynamic access, child-property reads, valid nested spellings, fully dynamic accesses and legitimate subworkflow pipe labels.

Recovery starts from `09ea767dd8888fef0f1885dcaf351ae0cff65bfc` on dev `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`. The three patches replayed unchanged during the requested rebase. The shared-spec unit test passes; targeted API validation and required independent reviews are being performed now. Existing record/history did not contain the current handoff debriefs.

The motivation is #23424: a removed flat spelling can compare undefined to null and silently always run or skip a tool step. Import rejection reaches API clients as well as editor users. Full reference resolution, editor repair, runtime diagnostics and value_from validation are outside this branch's implemented scope.
