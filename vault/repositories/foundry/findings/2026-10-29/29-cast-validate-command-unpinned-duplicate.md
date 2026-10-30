# Cast skills give two validate commands: the generated one pinned to the schema hash, the Mold body's unpinned

- Target: galaxyproject/foundry (Mold bodies under `content/molds/`, and optionally `packages/build-cli` cast generation). Nothing upstream. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-chipseq-2026-10-30, phase 2 (nextflow-summary-to-workflow-brief, Mold rev 2, foundry 40fc911d = 9f83fd55 + fixtures pin), 2026-10-30. Ledger id: `brief-mold-procedure-validate-omits-schema-pin` (friction, minor).
- Existing issues/PRs: none. Follow-up gap from PR #707 (merged; added `--schema-sha256` to every `foundry validate-*` and the generated Validation rows, after #643).

## Symptom
The cast `nextflow-summary-to-workflow-brief/SKILL.md` tells the agent to validate twice, differently. The generated Validation section (`:43`) says `foundry validate-workflow-brief --schema-sha256 8e65acb7… workflow-brief.md`. The Mold body's "Validate and hand off" step (`:67`) says `foundry validate-workflow-brief workflow-brief.md`. The writer had to choose; it ran the pinned form. Both exited 0 on this run, so no harm, but the unpinned form is exactly the gate #643/#707 made fail loud on a validator/bundle mismatch.

## Root cause
`cast-mold.ts:600-630` generates the pinned check and validate rows from the output schema's validator metadata (`schemaPinArgs`, `:417`). The Mold bodies still carry the pre-#707 literal command, copied verbatim into the cast. Five Molds do this:
- `content/molds/nextflow-summary-to-workflow-brief/index.md:95` (cast SKILL.md `:67`)
- `content/molds/freeform-summary-to-workflow-brief/index.md:85` (cast `:64`)
- `content/molds/summarize-nextflow/index.md:402` (cast `:361`, also an unpinned `npx` form)
- `content/molds/summarize-cwl/index.md:188` (cast `:181`)
- `content/molds/summarize-galaxy-workflow/index.md:80` (cast `:70`)

Each cast also has the generated pinned rows (e.g. summarize-nextflow `:49-50`, summarize-cwl `:61-62`).

## Evidence
- `grep -n 'foundry validate-' casts/claude/skills/*/SKILL.md` in the chipseq worktree shows the pinned generated row and the unpinned body line in all five.
- Run: `foundry-feedback.ledger.yml` entry above; `check-workflow-brief.json` (exit 0).

## Proposed fix
1. In the five Mold bodies, replace the literal command with "Validate as in the Validation section" (keep the brief Molds' `check-workflow-brief` instruction and exit-4 handling, which the generated rows don't cover).
2. Optional guard: have `cast-mold` (or `cast-skill-verify`) warn when a Mold body contains `<validator_bin> <validator_subcommand>` for an output that has a pinned schema, so new Molds don't reintroduce it.
3. Re-cast the five bundles; each Mold gets a revision bump and `changes.md` entry. Sequence the summarize-nextflow edit after the rev-19 queue in 08.

## Draft issue
**Title:** Cast skills carry an unpinned `foundry validate-*` from the Mold body beside the generated pinned one

Since #707, cast generation writes a pinned validate command (`foundry validate-<x> --schema-sha256 <hash> <file>`) into each skill's Validation section. Five Mold bodies still say the unpinned `foundry validate-<x> <file>`, so the cast skill gives two different commands: nextflow-summary-to-workflow-brief (`index.md:95`), freeform-summary-to-workflow-brief (`:85`), summarize-nextflow (`:402`), summarize-cwl (`:188`), summarize-galaxy-workflow (`:80`). An agent that follows the body skips the bundle/validator mismatch check #643 needed. A chipseq brief run hit the ambiguity and picked the pinned form.

Proposal: Mold bodies defer to the generated Validation section ("validate as in Validation") and keep only what it doesn't say (e.g. `check-workflow-brief` and exit-4 handling). Optionally have cast verification warn on a literal validator command in a Mold body for a pinned output.
