# License implementation slides

- Slug: `licenses`; source: `jmchiltondotnet/src/content/slides/licenses.mdx`.
- Preview: http://localhost:4321/slides/licenses (development server left running).
- Production URL after deployment: https://jmchilton.net/slides/licenses. Deployment was not requested or performed.
- Ten main slides, four supporting slides, and an extra-slides divider; approximately ten minutes excluding supporting material.
- Implementation snapshot: `cd37d851bb2be170b5657fbc1bc755e7134b20e1`, verified against the fork on 2026-10-25. The Galaxy source branch was not changed.
- Sources: current implementation, developer documentation, test fixtures and test code, the branch's implementation/screenshot debriefs, and issue #23261 for motivation. Current code takes precedence over stale issue details, including the 27.0 profile gate and new-rerun/remap behavior.
- Every factual slide has a `[Sources]` speaker note. No factual claims remain without a source. Historical feature-test results are explicitly attributed to the branch record; the Galaxy test suites and live fork CI were not rerun or claimed green for this task.
- Reused two existing branch screenshots; preserved original copies alongside focused crops. No new product screenshots or generated illustrations were needed.
- The only PR-description change is the added second-line slides link; removing that line restores the prior description byte for byte. No screenshot changes were needed in the PR description.

## Verification

- `make test` in jmchiltondotnet: passed formatting, ESLint, and Astro checks (zero errors; two existing Astro hints).
- `npx astro build`: passed, 41 pages including `/slides/licenses/`. Resume preprocessing ran through `make dev`; PDF generation was skipped.
- `make validate` in galaxy-brain: 126 notes, zero errors, 15 existing advisory warnings.
- Two independent reviews: rendering, then clarity/content. Reports are in `subagents/slides_render_review.md` and `subagents/slides_clarity_review.md`.

- Rendering review inspected every slide and corrected the architecture layout and preferences crop. Final targeted export captures (3, 4, 12) and regular-mode captures (1, 4) were visually checked after the fixes.
- The clarity review made only small slide-7 edits: a concrete nested-workflow fixture and precise revocation wording. The final MDX was served successfully by Astro after editing. No additional full rendering review was warranted for these small wording edits.

## Follow-ups for John

The clarity review found no new implementation defect. Its recommendations are saved in `subagents/slides_clarity_review.md`:

1. Prepare a maintainer/operator-reviewed pilot for one unconditional production wrapper; this is the highest-value validation follow-up and is already recorded as companion work.
2. Reconcile issue #23261's stale profile, rerun/remap and alternative-entitlement wording with the current implementation. No issue edits were made in this task.
3. If a small branch-code expansion is wanted, share the three forms' remembered-acceptance/submission sequencing in the existing composable while preserving their error and spinner behavior. This is an existing cleanup idea, not a new defect; current behavior is correct.
4. Decide the workflow-test default before implementing Planemo workflow one-time acceptance support in a companion task.

Conditional terms, alternative entitlements, admin acceptance, and a public per-job authorization view remain separate designs. The slides task made no changes to the Galaxy implementation or its approval/status.

## Publication

Deck and four screenshot assets committed and pushed on `jmchiltondotnet/main` as `ac69980` (`Add tool license affirmation implementation slides`). Production deployment was not performed. The Galaxy source branch remains unchanged.
