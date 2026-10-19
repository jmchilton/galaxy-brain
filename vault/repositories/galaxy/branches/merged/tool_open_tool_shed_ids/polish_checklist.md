# Polish checklist — 2026-10-14

Reviewed `cddb6503a6eccfc82f57d1bf1eb96097f6535ff0` against `dev` at `c63ffc2ccae4875976677b468dce3ac3e1ba74d8` with a fresh checklist subagent. No blockers. Only the general checklist applies: no workflow editor, scheduler, invocation, collection mapping or gxformat2 code changes.

- [ ] Did a human read every test and every comment? Requires John.
- [x] What does the user see when it fails? GUID searches find no matching tool; automation times out locating the link/card.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The added row asserts a full GUID result containing `.`, `/` and `+`, rather than matching internals.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.

Evidence: all four changed files, `tool_open()` wait/click behavior, `Tool.vue` data-tool-id markup, implementation and test-review notes. The special-form fixture comment explains why the panel test does not assert form rendering. John chose current E2E plus search unit coverage on 2026-10-14.

Coordinator verification after rebase: `vitest run src/components/Panels/utilities.test.ts` — 25 passed; `git diff --check` clean; `git range-diff` confirms an identical patch after the conflict-free rebase. Historical red/green and browser evidence remains in the implementation and test-challenge debriefs; this polish did not repeat those browser runs.
