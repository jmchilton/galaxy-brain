# Workflow Brief note: an "equivalent" objective needs an oracle, and nothing says where it comes from when the source records no expected outputs

- Target: galaxyproject/foundry (`content/research/workflow-brief-design` rev 6, `nextflow-summary-to-workflow-brief` eval). Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-hic-2026-11-01, phase 2 (nextflow-summary-to-workflow-brief rev 2), 2026-11-01. Ledger id `brief-note-no-rule-for-equivalence-without-reference-outputs` (gap, minor).
- Existing issues/PRs: none. Related: 10 item 6 (blocker stage boundary; this run applied its proposed boundary), 10 item 2 (test-input placement), 06 (assertion values fixed before any run, downstream symptom of a missing oracle), 02 (test-plan `assumed` labels), #575 (paper-to-test-data scoping; same "where do expected values come from" question for papers).

## Symptom
The objective is "an equivalent Galaxy workflow". nf-core/hic 2.1.0 has no `tests/` directory, no nf-test snapshots and no `nf-test.config`; CI runs only `-profile test,docker` with no output comparison (`.github/workflows/ci.yml:40`). The host cannot run the source (`nextflow`, `java` ABSENT in `environment-probes.txt`). The brief's Acceptance criteria say the statistics "match the source's statistics files for the same inputs" and maps "match the source's … within numerical tolerance" (`workflow-brief.md:86`), but no such files exist anywhere. The writer invented the handling: an open question proposing one source run of `profile:test` at the pin on another host as the reference (`:173-177`, low), plus an unknown under Constraints. Nothing said whether this is a Blocker, a Constraint or a question, or that the acceptance criteria must name their oracle.

## Root cause
`workflow-brief-design` defines `### Acceptance criteria` as "High-level behaviors that establish success" (`:31`) and stops there. The preflight paragraph (`:66`) covers tool availability and access, not the reference outputs an equivalence claim is judged against. For nf-core pipelines with nf-test snapshots (viralrecon, bacass) the oracle was implicit; hic is the first whole-pipeline brief where it is absent.

## Evidence
- Note @ 52808616: `:31` Acceptance row; `:66` preflight; `grep -n "equivalen\|oracle\|expected output\|reference output"` → nothing.
- Brief: Acceptance criteria (`workflow-brief.md:83-89`), open question "How is equivalence established…" (`:173-177`), Agent Environment Constraints.
- `phase1-notes.md` §2 Test evidence (no tests/ dir; neither profile sets `dnase`, `hicpro_maps`, `split_fastq` or `res_zoomify`, so no source case covers those branches); `phase2-notes.md` "Blockers" rationale.

## Proposed fix
In `workflow-brief-design`:
1. Acceptance criteria that compare against the source name their oracle: recorded snapshots or test outputs (cite them), or "reference outputs from a source run of <candidate> at the pin".
2. When the source records no expected outputs, the brief proposes where reference outputs come from (which candidate, at which pin, run where and by whom) as an Open question with a proposed answer, and lists source branches no candidate exercises. The environment's ability to run the source goes under Agent Environment Constraints. Neither is a Blocker for design (consistent with 10 item 6).
3. Eval: a brief with an equivalence objective names an oracle for each comparative acceptance criterion, or an Open question for it.
Downstream, the test-plan Molds should treat an un-produced oracle as `assumed`, not as recorded values (see 02, 06).

## Draft issue
**Title:** workflow-brief-design: equivalence objectives must name an oracle; rule for sources with no recorded expected outputs

For an "equivalent workflow" objective, acceptance means matching the source's outputs, but the note's Acceptance criteria row says only "High-level behaviors that establish success", and preflight covers tools, not reference outputs. nf-core/hic 2.1.0 has no nf-test snapshots or tests directory, and the agent host can't run Nextflow. A brief writer still wrote "match the source's statistics files", then invented an open question proposing one `profile:test` source run on another host as the reference, with no rule on whether that is a blocker, a constraint or a question.

Proposal: comparative acceptance criteria name their oracle (recorded snapshots, or a named source run at the pin); without recorded outputs, the brief proposes the reference run as an Open question and lists uncovered branches; inability to run the source is a Constraint, not a Blocker; add an eval assertion. Related: the blocker stage-boundary gap in the same note, #575.
