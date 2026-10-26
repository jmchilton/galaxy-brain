Fix 🎯 #726 - `debug-galaxy-workflow-output` gets a surface for a workflow Galaxy refuses to import.

When Galaxy rejects the workflow upload, there is no workflow, history, invocation or job, and Planemo writes no `--test_output_json` or HTML report. The debug Mold's five surfaces (tool/job, invocation, collection, missing output, assertion) all start at an invocation, so the ncbi/egapx run (Galaxy 26.1.2.dev0, 500 `IntegrityError` on import) had to improvise three things: where the evidence lives, how to narrow the failure down, and where to send the result. **This PR doesn't touch Galaxy.** The `IntegrityError` is being filed upstream separately.

| Before | After |
|---|---|
| Five surfaces, all post-invocation | **Workflow import rejection** checked first, then the five |
| Evidence lives in "Planemo result / job API / invocation API / history / assertion report" | Import response (status + body), Planemo terminal log, server-log traceback when one exists |
| No bisection method (egapx truncated the real workflow → unrelated `int()` 500s; reused UDTs may have contaminated a sub-bisection) | Self-contained synthetic variants, one feature at a time, against a passing control, same user/server/conversion, distinct tool definitions or a fresh server |
| No routing | Statically valid minimal variant reproduces a 500 → upstream repro, don't reshape the workflow. 400, or a 500 gone once valid → content error, back to the emitting phase, plus a validator-gap finding when static validation accepted it (#580 / #644) |
| `run-workflow-test` modality vocabulary had no word for it (phase 12 invented one) | `workflow-import-rejected`, `status: fail` (not `not-run`), next surfaces "workflow import response" / "Galaxy server log" |

**The rule routes the egapx case correctly.** Phase 13's minimal case A (`a` has a workflow output, embedded UDT `b` follows) passes `gxwf validate` (2/2 tool states OK) and still 500s on import, so step 3 sends it upstream as a repro. The rule does not send it back to reshape the workflow.

**Vocabulary, not schema.** `workflow-import-rejected` is Mold prose. No run-result schema enforces it yet (#49). No import-rejection fixture is committed either: the new debug scenarios are descriptive, and `run-workflow-test` records the gap.

**`fail`, not `not-run`.** An import Galaxy refused for the workflow's own content or a server defect is runtime evidence about the workflow. An import refused for a missing permission or uninstallable tool stays `not-run` (environment), which keeps `run-workflow-test` step 0 and step 5 consistent.

<details><summary>What changed, file by file</summary>

- `content/molds/debug-galaxy-workflow-output/` — step 1 adds the surface and checks it first. New steps 2 (capture evidence) and 3 (bisect, then route). Old steps 2–6 renumbered to 4–8. New eval property for import evidence, bisection, and routing. Two scenarios: Galaxy-defect 500 (egapx, #726) and content 400 (frame comment, #580).
- `content/molds/run-workflow-test/` — step 0 draws the `not-run`/`fail` line. Step 4 says what to keep when ids don't exist. Step 5 adds the modality and two surfaces. Evals updated. Scenarios get a coverage-gap entry, not a case: that file binds every case to a committed fixture, and no observed import-rejection fixture is committed.
- `content/research/planemo-workflow-test-architecture/` — new "Workflow Import Failures" section. Planemo 0.75.47 imports in `install_workflows()` while Galaxy is brought up, outside `execute()`'s `ErrorRunResponse` wrapper, so no report is written. Gxformat2 is converted client-side before upload. Managed Galaxy's log is streamed into the Planemo terminal. Includes an evidence table and a noisy-boundary bullet.
- `casts/` and `content/Dashboard.md` are regenerated.

</details>

## Risks

Risks are minimal. This is Mold, eval, and reference prose plus regenerated casts, so it is a two-way door.

<details><summary>Risk Details</summary>

- It conflicts textually with the `issue-730-udt-run-recipe` branch. Both edit `run-workflow-test/index.md`: that branch renumbers steps and also bumps to revision 8. Both also edit the planemo architecture note. Whichever lands second needs a rebase and a recast.
- The upstream/content routing rule is a heuristic. A server defect that only fires on statically invalid input would be routed as a content error.

</details>

<details><summary>Risk Review Advice</summary>

Read debug step 3's routing bullets and the `not-run`/`fail` sentence in `run-workflow-test` step 0. Together they decide where an agent sends the next import failure.

</details>

## Context

Related: #662 (another surface missing from step 1), #644 (static importability gate), #49 (run-result schema), #580 (a frame-comment 400 at import). The Galaxy `IntegrityError` itself is being filed upstream separately.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: a handled 400 leaves no server-log traceback, so the oracle requires one only when it was logged.</summary>

Codex ran in a fresh read-only session from the #726 brief. It found that the eval and debug step 2 required a server-log traceback for every rejection. Galaxy returns validation errors as handled `MessageException` responses and logs no traceback for them. The traceback is now required only when the server logged one.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
