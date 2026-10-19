## John's Checklist

- [ ] Did a human read every test and every comment? Requires John.
- [x] What does the user see when it fails? HTTP 400 with the shared selection-policy or existing routing error, before a requested history is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; real API requests assert rejection and persisted side effects.
- [x] Are the comments free of excess archeology? Yes; no comments added.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Invalid explicit storage preferences, conflicting general/split preferences and caller-supplied effective outputs fail before history creation; valid workflows retain storage routing.
- [x] Who hits this in practice and what is the evidence? Invocation API callers submitting these options; six API regressions cover rejection without stray histories.
- [x] Were simpler or existing approaches considered? Yes; reuse the shared selection validator and move existing routing guards. Narrower scope retained the demonstrated history side effect; universal invocation preflight needs separate design.

Independent read-only checklist review at 000233d81ebccaea171682cc5bdeb00b99da8ac4 against release_26.2 at 579ca73440d776002b7099538cef000838687d8e. No blockers. Reviewed complete two-file diff and current rescope/scope/review evidence. Checks in run_request.py precede target-history construction; original truthiness and exclusivity predicates remain. Derived effective outputs remain computed later. API cases cover all three preference fields, effective outputs and both general/split conflicts; latter cases check specific error and no invocation. Recorded implementation logs show 6 negative API passes and 4 configured general/split/mapped/nested integration controls. Configured nonselectable-backend negatives were considered in scope evaluation; no additional policy behavior is implemented here. Multi-error requests can now report a storage error earlier. Fresh CI/test assessment belongs to the polish owner.
