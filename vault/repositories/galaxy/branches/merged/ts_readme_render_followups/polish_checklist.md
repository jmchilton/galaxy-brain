# General checklist — 2026-10-17

Fresh subagent review of `origin/dev...HEAD` after rebase (`53a1711b655`); no correctness failures. Tool Shed README changes do not touch workflows, so the workflow checklist does not apply.

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Missing revision images return 404; unreadable READMEs are omitted with server logging; frontend request failures use `notifyOnCatch`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Real hg histories verify unchanged files, deletion, exact-path precedence and unknown revisions; README tests assert rendered output.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; existing baseline rendering tests are upstream, and new tests exercise fixed behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. - what purpose do they serve? N/A.

API tests compare image bytes, MIME type and failure cases. Playwright checks revision permalinks and decoded image dimensions. The existing overlapping vitest is retained; its removal remains an optional question for John in the earlier test-challenge debrief.

Final delta re-review at `d64a2bdfe45`: the generated optional nullable query and its description match the route exactly; no unrelated generated changes, affected checklist items remain passing. Independent regeneration with the Tool Shed Prettier configuration matches byte-for-byte.
