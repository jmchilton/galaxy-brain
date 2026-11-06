# #670 Topology repair forbids both interface edits (input and output promotion) and has no gate for either

[Issue](https://github.com/galaxyproject/foundry/issues/670) — opened by scottcain's AI assistant, currently only `needs-triage`. No comments, no PR or branch addresses it (`gh pr list --search 670` empty).

## Proposed labels

- `roadmap/substep`: changes to one Mold, its eval and adjacent notes, not backbone work.
- Parent: #318 "Revise how skills working on draft coordinate - more direct, more deterministic, more YAML" (`roadmap/main`, `priority/mvp`), tentative. Its research comment moves the `topology_repair` budget into the draft root and floats a `repair-topology` kind, so the gate question lands there. #332 (finalize step) is the weaker candidate; it only fits the hide check.
- `priority/mvp`: input promotion was the only way to get this run's tests going on a small genome, and the Mold and its eval both forbid it. Judgment call: output promotion alone would be `priority/v2`, since nothing was broken.
- `work/ready-research`: where these edits belong and whether the hide rule stands are open (see Findings), so an implementer would stop on design questions.
- No blocker labels.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3: labels are staged in `issue_tags.md`. Once applied as proposed it becomes `queued_research`.

## Findings

Verified on `origin/main` `51338d1d`, 2026-11-06, with local `gxwf` 1.0.0.

**Holds as reported:**

- The clause exists: `content/molds/repair-galaxy-draft-topology/index.md:94` "surrounding topology, already-realized steps, and workflow interface stay put". Also not named by the issue, so a fix must change them: `eval.md:29-30` (property "the repair stays local") and `scenarios.md` "repair inside an otherwise realized draft", which expects workflow inputs and outputs byte-identical.
- The three shapes and the outputs blurb cover only inserting or narrowing (`index.md:23`, `:96`). `input_artifacts` and `output_artifacts` are only the draft and the ledger, so no downstream artifact is named.
- The gate can't move for an output promotion: `open_history` must be strictly decreasing and a flat count "trips the gate immediately" (`content/research/open-requirements-ledger/index.md:212`; also `advance-galaxy-draft-step/index.md:174`, `galaxy-workflow-draft-format/index.md:128`).
- A test can't reach `state`: `TestJob` is `doc`, `expect_failure`, `job`, `outputs` in `casts/claude/skills/implement-galaxy-workflow-test/references/schemas/tests-format.schema.json:1749`. #578 is the same gap seen from the test side.
- Draft input variants accept `min`/`max` (`galaxy-tool-util-ts` `packages/schema/src/workflow/raw/gxformat2-draft.ts:374-376`).
- The draft-format note has no post-job action text. Reproduced with a one-step draft: an output sourced from a `hide: true` port passes `gxwf draft-validate`, including `--concrete`, and `gxwf draft-extract` copies the `hide` through.
- STAR: `genomeSAindexNbases` defaults to 14 (`tools-iuc` `tools/rgrnastar/macros.xml:189`), and the wrapper's own tests set 5 (`rg_rnaStar.xml:451`).

**Doesn't hold, or needs narrowing:**

- **The proposed "MUST NOT carry `hide: true`" rule contradicts IWC.** 171 of 1,993 workflow outputs in 26 of 133 IWC workflows also carry `HideDatasetAction`, data outputs included (`merqury_qv`, `Merqury CN plots` in `Assembly-Hifi-HiC-phasing-VGP4`). Galaxy's action only sets `visible = False` on the output (`lib/galaxy/job_execution/actions/post.py:318-328`), so "a promoted output the user cannot see" looks overstated: it is hidden from the history, and the action doesn't remove the output. Not run on a live Galaxy. A `draft-validate` error would flag those 26 workflows' shape, so at most this is a warning or a promotion-time step, not a rule.
- **"The only Mold that can make an interface edit" is true only of the greenfield loop.** `apply-galaxy-workflow-changeset/index.md:80` already has `add-input`, `add-output` / `expose-output` as direct edits, `update-interview-to-galaxy/scenarios.md:52` spells out `expose-output` as "unhide, add a workflow output", and `changeset-to-galaxy-test-plan/index.md:113` already handles the test-plan follow-through. That Mold is in `update-interview-to-galaxy` and `galaxy-workflow-review`, and it takes a reviewed change-set, so it can't serve the loop as is. New repair shapes should reuse this vocabulary rather than add a parallel one.
- **The output-promotion run was outside the Mold's contract.** It closed `blocking: false` entries, but escalation fires only on blocking entries (`open-requirements-ledger/index.md:89`, `advance-galaxy-draft-step/index.md:174`). The absent gate follows from that. The real question is who owns non-blocking interface edits, which may not be this Mold. Input promotion is in scope only if the ledger entry is blocking, as the issue's evidence bar assumes.
- **"`draft-extract` silently drops" is narrower than stated.** With a missing source port, `draft-validate` fails with a topology error, and `draft-extract` exits 0 but lists the output in `dropped_outputs` under `--report-json`. It is silent only because `advance-galaxy-draft-step/index.md:159` doesn't ask for the report. Its reason is also misleading: `cascade` depending on a step that survived. Asserting promoted outputs by name still seems right.
- **"No packaged reference" is true of the repair skill only.** `content/research/gxformat2-schema/index.md:56` documents the `out:` actions, but it isn't in the repair Mold's references. Adding it on demand may beat a new subsection in the draft-format note, which is cast into six skills.
- **"Every fixture any IWC rnaseq workflow uses" doesn't apply to IWC.** `rnaseq-pe` and `rnaseq-sr` use `geneSource: indexed` with a wired `genomeDir`, and no IWC workflow sets `genomeSAindexNbases`. The failure needs history-genome mode, so this is a real case without IWC precedent for this input. Wired parameter inputs in general do have precedent (`minimum coverage` in the update-interview scenario).

**Not verified:** the run's numbers (13 inputs, 63 steps, 15 → 18 outputs, `126 ok / 0 invalid`) and the `--connections` byte-identical claim. The run artifacts aren't linked. My one-step repro counted 0 edges, so it says nothing either way, though the claim is plausible because a promotion adds no edge. The STAR abort on a small genome wasn't reproduced.

Related, all open:

- #669, #660, #661, #654: other gaps in this Mold, all `needs-triage`, none with a record or an index line yet. #668 covers `--connections` being unpackaged.
- #318: its research moves the budget this issue's gate depends on.
- #571: nested `in:` key addressing, which input promotion of `refGenomeSource|genomeSAindexNbases` needs.
- #578: the test-side view of the same unreachable value.
- #678: routes capability misses to this Mold, so it widens the same contract.

Not an upstream issue: the Mold and notes are Foundry-owned, and nothing here waits on another repo. The optional `draft-validate` check would be gxwf work, which we maintain, so no upstream draft. Whether to want one depends on question 2.

## Next

After labels: research comment answering the questions below. Implementation then edits the Mold, eval, scenarios, ledger and draft-format notes, and recasts. The three corrections can land separately.

Questions for John:

1. Should repair own interface edits, or only blocking input promotion, with non-blocking output promotion going elsewhere (`expose-output` through the change-set path, or #332's finalize step)?
2. Hide rule: drop it, make it a `draft-validate` warning, or keep it only as a step in promoting a port ("unhide", as in the change-set scenario)? IWC argues against a MUST NOT.
3. Research #654, #660, #661, #669 and #670 together? They come from the same Mold, and at least #660 and #669 also ask for new repair shapes.
4. Split this issue? Input promotion is the mvp part; output promotion and the hide note could be v2.

Staged labels applied 2026-11-06: +roadmap/substep, +priority/mvp, +work/ready-research; parent #318.
