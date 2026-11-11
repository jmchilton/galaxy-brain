Run via Claude Opus 5.5 at medium effort.

# Domain review: `issue-789-readme-no-archeology` (a4988f41)

**Verdict: approve with two small changes.** The change is in the right place (the Mold body, plus a fixture-backed scenario and a fixture-independent eval property). It matches the IWC prompt's README checklist and the Foundry no-archaeology rule. Recast, Dashboard and provenance are regenerated: `npm run validate` gives 0 errors, and `check:dashboard` and `cast-all --check` are clean. Two gaps should close in this PR: the README requirement list now repeats itself and over-requires, and test evidence (the final invocation id, benchmark tables) is left ambiguous even though it was the bulk of the iwc-lab#4 README.

## IWC practice: invocation ids and benchmark tables

I surveyed `origin/main` of galaxyproject/iwc: 124 READMEs.
- **No** workflow README contains the word "invocation" or a usegalaxy invocation link.
- Testing sections are rare and short. Examples are `hyphy` "Test Data"/"Running Tests" and `fastq-to-matrix-10x` "Test data": where the data is and what it is.
- Benchmark content is at most a one-line claim, such as the `mags-building` note "our benchmark showed that Binette produces better MAGs", or an optional validation feature (`giraffe-deep-variant-pangenome-calling` hap.py). The one exception is `dna-seq-classification-lstm`, which has evaluation tables; it is an ML model, where metrics describe the artifact.
- The pinned IWC prompt (`references/prompts/workflow-pr-review-command.md` §README) asks for purpose, inputs and parameters, outputs, tutorial links, and differences from similar workflows. It asks for nothing about test runs or validation.

So the answer is no. A final passing invocation id is PR or reviewer evidence (CI reruns the test anyway), and so are the provenance and benchmark tables (sections A/B of iwc-lab#4, with SHA-1s, samtools recipes and vcfeval tables). None of it is user documentation. At most, the README keeps one sentence of an accuracy claim that a user would rely on, plus a pointer to where the evidence lives.

## Real issues

### 1. Final invocation id and validation tables are left ambiguous

The new "Keep development history out" bullet names only "earlier or superseded runs and invocation ids". That implies the final passing invocation belongs in the README. The fixture's `## Testing` keeps `4ae2da923366f120`, and the scenario's `expect` says nothing about it, so either outcome passes. The new bullet 1 also makes "the bundled test data" required README content. That is how iwc-lab#4 grew sections A/B and C.

Replacement for the index.md (and cast) bullet:

```markdown
- Keep run evidence and development history out of the README: invocation ids (final or superseded), test-run and benchmark provenance tables, failed or abandoned tools and versions, environment-only failures, validator caveats, and the story of how the run reached its result. A sentence on a validated accuracy claim may stay. Put that material, and any such section in a supplied README, in the maturation report instead.
```

Scenario `expect` addition (examples/readme-history):

```markdown
- expect: ... The `History` block, both invocations `4ae2da923366f120` and `fbf1b200b6a8b01c`, the arm64 NanoPlot failure, the failed medaka 1.4.4 run and the `gxwf validate` reviewer note leave the README and appear in `iwc-maturation-report.md`.
```

Eval property: change the clause "It carries no earlier or superseded invocations" to "It carries no invocation ids, run-provenance or benchmark tables, ...". With that rule, any `invocation` token or 16-hex id in a README is a failure a script can find. Consider `check: deterministic + llm-judged` (§6.3).

### 2. New README bullet repeats bullet 1 and over-requires sections

Bullet 1 (unchanged) already says README from "purpose, valid inputs, and expected outputs", and the output artifact description says the same. The new bullet restates those items and then requires "fixed settings, limitations, the bundled test data". None of those are in the IWC checklist. "Optional by default" (§5) applies, and this list is part of why the agent padded the README. Merge the two:

```markdown
- Create or update a README for a user of the workflow as submitted, from evidenced purpose, valid inputs and important parameters, and expected outputs, following the bundled IWC README checklist. Preserve useful supplied material. Explain differences from the source workflow and related IWC workflows; when the final workflow departs from its source, state the choice and its reason in a sentence or two. State unknown comparisons or tutorial links as unresolved; do not invent them.
```

## Nits

- **Validator caveat is an upstream bug (§1).** The fixture's "`gxwf validate` reports `null` optional inputs as tool-state errors; known false positive" comes straight from iwc-lab#4. Routing it to the report is right. If no gxwf issue exists for that false positive, one should be filed. This is not a Mold change.
- **"Notes for reviewers" content** (test-data hosting, export encoding) is PR-description material. The report is the right destination today. Optionally, step 6 could say the report's history section is written to be lifted into the PR body. Skip it if the downstream publication Mold already owns that.
- **Fixture** has `outputs: []` and the README has no Outputs section. That is fine and consistent with the other fixtures. The expected behaviour (outputs unresolved, nothing invented) is already covered by the evidence-bounded property.
- **Changelog sentence** ("says what the release contains, not how it was reached") aligns with the IWC "describes what actually changed" rule. Good.
