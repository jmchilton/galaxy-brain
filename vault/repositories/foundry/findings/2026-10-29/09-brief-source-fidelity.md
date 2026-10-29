# Workflow Brief cites and paraphrases source logic without checking it, and infers environment consequences

- Target: galaxyproject/foundry (the Mold, its eval and `check-workflow-brief` all live there); Foundry tracking needed: yes
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-callings-2026-10-29, phase 2 (`nextflow-summary-to-workflow-brief` rev 2), 2026-10-29
- Existing issues/PRs: none for this Mold. Same failure class in another Mold: [#647](https://github.com/galaxyproject/foundry/issues/647) (template `_plan_*` prose asserts unverified source claims as fact). [#725](https://github.com/galaxyproject/foundry/issues/725) / [#728](https://github.com/galaxyproject/foundry/pull/728) touch the same Mold but cover scope conflicts, not fidelity.

## Symptom

The brief validated and checked clear, but three source/environment claims were wrong (corrected in the CalliNGS golden, `git diff df4f747d f8993830`):
1. `modules.nf:200` cited 3 times (brief lines 33, 53, 113) for `sampleId = replicateId.replaceAll(/[12]$/,'')`, which is on line 201. Line 200 is `script:`.
2. The AF histogram open question (brief:142) says "excluding sites with a zero count". The source (`modules.nf:306-309`) keeps a site if `$v[0]!=0 || $v[1]!=0`, so it drops only sites where both counts are 0, then drops AF==1.
3. Agent Environment (brief:193): "Conda and Mamba are absent, so tool dependencies would have to come from container images". The probes show only that they are absent from PATH. planemo can provision its own conda.

## Root cause

(a) A misread verification step, not bad input. `summary-nextflow.json` carries no line numbers for this fact (only `script_excerpt`). `phase1-notes.md:17` had the correct `modules.nf:201`. The phase-2 subagent spot-checked it with `sed -n 199,202p modules.nf`, which prints no line numbers. Line 199 holds only whitespace (`  `), and the tool result began at `  script:`, so the agent counted `script:` as 199 and the target as 200. It then "corrected" the cite in the brief and noted the change only in its return report. The brief doesn't record the disagreement.
(b) The paraphrase drifted across two hand-offs. `phase1-notes.md:72` says "printed when both counts are not zero", an ambiguous negation. Phase 2 restated it as "a zero count" (either count zero). That is the opposite filter. The literal predicate was in `summary-nextflow.json` (`processes[PREPARE_VCF_FOR_ASE].script_excerpt`) and was not re-read.
(c) The Mold (index.md:89) asks the agent to separate requested, observed and unknown facts. It doesn't stop the agent from deriving a consequence from an absence.
Nothing in the Mold tells the author how to verify a `file:line` cite, how to paraphrase a condition, or that it must not silently overwrite an upstream cite. Eval property 1 (eval.md:3-6, llm-judged) and property 4 (eval.md:18-21) did flag all three, but only in the coordinator's post-hoc grading (run-summary.md:34, :37). No deterministic gate covers citations. `check-workflow-brief` returned 0 blockers (ready).

## Evidence

- Source: `modules.nf:199` is `  ` (whitespace only, `cat -A` → `  $`), `:200` is `  script:`, `:201` is the `replaceAll` line. `:306-309` is the perl `if($v[0]!=0 ||$v[1] !=0)` … `awk '$1!=1'`.
- Phase-2 transcript (`subagents/agent-a2823ecca88a1c949.jsonl` under this session's project dir): entry 47 runs `sed -n 199,202p modules.nf`. Entry 48's result starts `"  script: \n  sampleId = …"`, so the blank line 199 isn't visible. Entry 67's report says: "Phase 1 cites `modules.nf:201` …; it is actually line 200, and the brief cites 200."
- `phase1-notes.md:17` (201, correct) and `:72` (ambiguous AF wording). `environment-probes.txt:12-13` (`conda: ABSENT`, `mamba: ABSENT`, nothing more).
- Mold: `content/molds/nextflow-summary-to-workflow-brief/index.md:83` ("distinguish source facts from expert requirements") and `:89` (environment). There is no rule on citations or paraphrase. `content/research/workflow-brief-design/index.md:46,50` covers evidence for open questions, not its accuracy.

## Proposed fix

1. Mold wording (index.md "Evidence and scope"): "Cite `path:line` only after reading the line with numbered output (`grep -n`, `nl -ba`, `sed -n 'A,Bp' | cat -n` offset). Keep upstream cites unless that numbered read contradicts them. When it does, cite the verified line and add the discrepancy as an Open question or note. When a cite points at one expression, quote it in code beside the cite. Restate filters and conditions with their operators (and/or, negation), or quote the predicate, and read the literal from `script_excerpt` or the source rather than an upstream paraphrase."
2. Mold wording (index.md:89): "Report absence as absence. Don't derive a provisioning or container consequence from a missing executable, since planemo, for example, can bootstrap conda. Put the consequence in an unknown or an Open question."
3. Deterministic check: add `--source-root <dir>` to `check-workflow-brief`, or add a sibling `foundry check-brief-citations`. It parses `` `relpath:N[-M]` `` cites and fails when the file is missing, the range is out of bounds or the cited lines are blank. When a cite sits next to an inline code quote in the same bullet, it also requires the quote's tokens to appear in the range. With rule 1's quote-beside-cite, this would have caught (a): `replaceAll` is not on line 200. The bounds check alone would not have.
4. Eval: extend property 1 with "each sampled `file:line` cite, re-read with numbered output, contains the claimed fact, and paraphrased conditions keep their operator logic". Extend property 4 with "no environment consequence beyond what the probes show". Add a deterministic property for (3). Use this run's brief as a negative fixture.
5. Upstream (optional, summarize-nextflow): avoid ambiguous negations in correction-pass prose. Quote predicates instead.

## Draft issue

**Title:** nextflow-summary-to-workflow-brief: cites and paraphrases of source logic go unverified (wrong line, inverted filter, inferred env consequence)

In a CalliNGS-NF seed run (nextflow-to-workflow-brief, 2026-10-29), the brief validated and `check-workflow-brief` came back clear, but it contained:
- `modules.nf:200` three times for the `sampleId = replicateId.replaceAll(/[12]$/,'')` line, which is 201. The upstream notes had 201. The author re-checked with unnumbered `sed -n 199,202p`, missed the whitespace-only line 199 and "corrected" the cite to 200 without recording the disagreement.
- An AF histogram filter paraphrased as "excluding sites with a zero count". The source keeps `ref!=0 || alt!=0`, so it drops only sites where both counts are zero. The source line was in `script_excerpt`, but the paraphrase came from ambiguous upstream prose.
- "Conda and Mamba are absent, so tool dependencies would have to come from container images". The probes show only that they are absent from PATH, and planemo can provision conda itself.

The Mold has no rule for verifying `file:line` cites, for paraphrasing conditions, or for absence-only environment evidence. The eval's llm-judged properties caught all three only in post-hoc grading. No deterministic gate checks citations.

Proposed:
- Mold wording: numbered reads before citing; keep upstream cites unless contradicted, and surface any contradiction; quote the expression beside a single-line cite; keep operators when restating conditions; report absence without deriving consequences.
- `check-workflow-brief --source-root` (or `check-brief-citations`): resolve `path:N[-M]` cites, fail on missing, out-of-range or blank ranges, and match adjacent code quotes against the range.
- Eval: tighten properties 1 and 4, add a deterministic citation property, and add this brief as a negative fixture.

Related: #647 (same class in nextflow-summary-to-galaxy-template).
