# Implementation plan

1. Persist rerun lineage with an indexed nullable self foreign key and reversible migration; validate source access, carry lineage across batch requests, return access-filtered lineage links, omit it from reusable request exports and imported archives. Add backend and migration coverage.
2. Review backend phase, then carry source through both client run forms and show source/successor links in invocation details and rerun indication in the invocation list. Add client and E2E coverage; review phase.
3. Run required test challenges, polish E2E tests, strict code quality review, scope evaluation, and capture/inspect screenshots. Address findings and validate final changes.
4. Write implementation debriefs, push reviewed code to jmchilton remote, register handoff in branch queue, and commit/push only this task's vault files. Do not create a PR.

Decisions: use FK rather than meta parameters to support indexed reverse lookup; dropping lineage on import is acceptable for this first implementation; no edited-step marker or transitive lineage grouping. Source links and successor hints must only expose accessible invocations. Latest accessible direct successor is sufficient for the newer-rerun hint.
