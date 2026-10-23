# #580 `comments: type: frame` authored without `position`/`size` is rejected by real Galaxy import

[Issue](https://github.com/galaxyproject/foundry/issues/580) — reported by scottcain (AI-assisted), 2026-09-18. Only label at seeding: `needs-triage`. No comments, no PRs or branches.

## Proposed labels

- `roadmap/substep` — one concrete fix (Mold text + validation), not backbone. Parent: #332 "Introduce a finalize-workflow step" (tentative; see Open).
- `priority/mvp` — workflow is unimportable into real Galaxy, so "correct results now" is broken for any run that emits frames.
- `agent/implement` — Mold edits are in-repo; an agent can PR them.
- No blocker label: the Mold fix is unblocked. The validator half (gxwf `draft-validate`) is upstream; split it out if wanted and mark that part `upstream/gxwf`.

## Status

`queued` (agent/implement, no PR, no blocker).

## Findings

- Claim is plausible and matches code: `content/research/galaxy-workflow-comments/index.md` (origin/main) does say frames carry `position`/`size` (editor geometry, lines ~41-50, 110), but the four `*-summary-to-galaxy-template` Molds describe frames as "Schema-legal and optional" and mention only `contains_steps`/color, never geometry.
- So agents following the Molds omit `position`/`size`; gxformat2 schema accepts it, real Galaxy `WorkflowCommentModel` does not. The research note is not tied into the Mold instructions strongly enough.
- Related: #566 (real-Galaxy import guidance, also `needs-triage`).

## Next

Fix the four template Molds (+ evals) to require `position`/`size` on frames, pointing at the research note; then file/link a gxwf issue for `draft-validate` catching real-Galaxy-only required fields.

## Open

- Parent #332 vs another main issue (none obviously fits; #566 is not roadmap/main).
- Split validator work into an upstream gxwf issue?
