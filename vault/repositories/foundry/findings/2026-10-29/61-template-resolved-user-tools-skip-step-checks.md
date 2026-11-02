# User tools resolved at the template tier skip every per-step and authoring check

- Target: galaxyproject/foundry (`advance-galaxy-draft-step` endstate path, `galaxy-workflow-draft-format` resolution tiers, `workflow-brief-to-galaxy-template`). Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phases 4-5 (template; loop, 1 iteration) and phase 10 (attempts 1-3), 2026-11-01. Ledgers `draft-step-endstate-skips-per-step-checks-for-template-resolved-steps`, `draft-format-silent-on-embedded-user-tool-tier` (both minor).
- Existing issues/PRs: none exact. Related: #318 (draft coordination), #668 (loop CLI surfaces), #573 (closed; UDT binding convention), #672 (user-tool authoring note). Findings [60](60-bam-sort-order-datatypes-and-converters.md) and [62](62-galaxy-user-tool-configfile-whitespace-stripped.md) are two of the defects this let through.

## Symptom
The template emitted 97 steps, all resolved, including 18 embedded `GalaxyUserTool` steps (16 tools, verbatim HiC-Pro `bin/` ports). The first `gxwf draft-next-step` returned `{"draft": false}`, so the loop only extracted. No step went through `implement-galaxy-tool-step` or `author-galaxy-tool-wrapper`, so none of their checks ran. The driver added an ad hoc static audit (JS expressions parse, ports byte-identical, no null state); it was clean. Three defects then surfaced only in planemo, each costing a 15-22 minute attempt: a name-sorted BAM declared `bam` (attempt 1), a `while read` loop that dropped an unterminated line (attempt 2), and MultiQC rows named forward/reverse (attempt 3).

## Root cause
Confirmed in Foundry worktree `pipeline-run-chipseq` @ 2139033d:
- `galaxy-workflow-draft-format/index.md:38-41`: tiers are defined by `tool_id`, changeset and state only. A step with `run: class: GalaxyUserTool` has none, `draft-validate` treats it as resolved, and `_plan_*` is forbidden on it. The note doesn't say whether the template may author a user tool to completion, or where its run-time unknowns go.
- The template Mold lets evidence harden a step to any tier and never mentions `author-galaxy-tool-wrapper` or `galaxy-user-tool-authoring` (grep of `workflow-brief-to-galaxy-template/index.md`).
- `advance-galaxy-draft-step` (`index.md:13, 24, 66`) extracts as soon as `draft-next-step` reports `draft: false`. Nothing audits steps it never touched. `implement-galaxy-tool-step` and `author-galaxy-tool-wrapper` carry the checks (null non-optional state, user-tool binding, CWL `$(` escaping, collection shapes, and since c7ab66fa, BAM sort order), so a template-authored tool bypasses all of them.

Static checks would have caught attempt 1 (datatype rule) and plausibly attempt 2 (read-loop idiom, once finding 62's rule exists); attempt 3 needs the MultiQC naming rule in finding 14.

## Evidence
- `driver-notes.md`: "P4 done ... 97 steps ALL resolved (0 drafty) ... 18 user-tool steps"; "L1 endstate: draft false, extracted 97 steps: template resolved all ... user-tool static audit clean".
- run-summary "Process observations": "Per-step user-tool checks therefore never ran ... All three workflow defects surfaced only in planemo."
- Planemo attempts 1-3: 892 s, 981 s, 1314 s.

## Proposed fix
1. `galaxy-workflow-draft-format` tiers: a step with a complete embedded `GalaxyUserTool` is Resolved; its run-time unknowns go to the open-requirements ledger. Say when it should stay Deferred instead (`tool_id: TODO` with container, script source and command in `_plan_context`), e.g. when the template didn't apply the authoring note.
2. `workflow-brief-to-galaxy-template`: a template that authors a user tool applies `galaxy-user-tool-authoring` and `author-galaxy-tool-wrapper`'s contract rules (including rev 8's BAM rule) and its eval properties.
3. `advance-galaxy-draft-step`: when the first `draft-next-step` reports `draft: false`, run a static audit of steps resolved outside the loop (embedded user tools: datatypes, expression escaping, configfile rules, collection shapes; bound state: no null non-optional values) before `draft-extract`, and record it. Add an eval property for that path.

## Draft issue
**Title:** Template-resolved embedded user tools bypass every per-step and authoring check

In the nf-core/hic wb2g build (2026-11-01) the template resolved all 97 steps, including 18 embedded `GalaxyUserTool` steps. The first `draft-next-step` returned `draft: false`, so `advance-galaxy-draft-step` extracted without visiting any step. Neither `implement-galaxy-tool-step` nor `author-galaxy-tool-wrapper` ran, so their checks never applied. Three user-tool defects (a name-sorted BAM declared `bam`, a read loop that drops an unterminated line, MultiQC rows named forward/reverse) each cost a planemo attempt.

The draft-format tiers don't place embedded user tools, and the template Mold doesn't point to the user-tool authoring rules. Proposal: define the tier for embedded user tools in `galaxy-workflow-draft-format`; make the template apply the user-tool authoring note and `author-galaxy-tool-wrapper`'s rules when it authors one; and give `advance-galaxy-draft-step` a static audit on the already-concrete path, with an eval property. Related: #318, #668, #672.
