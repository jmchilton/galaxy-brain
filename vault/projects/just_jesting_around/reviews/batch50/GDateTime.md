# GDateTime — batch 50

Replaced untyped object props/component cast and unnecessary async mounting with a native mount helper accepting a Date. Two named field rows expose the entered value and exact emitted Date in one arrangement. Required inputs use get; existing emittedArg remains the event boundary. Every wrapper unmounts.

All four original executed checks remain: input event presence and exact Date for date/time changes. ISO strings deliberately omit a timezone, matching the local-calendar behavior of the component and baseline. No production/helper/supporting files changed.

Baseline/final two cases pass; final shuffled500101, pinnedNode22.20.0, maxWorkers1. Exact source IDs/locations across13files retain every covered statement/function/branch operand. Explicit canonical precommit checks including ESLint/Prettier pass. Existing helper suffices; no new README or marginal guidance warranted.
