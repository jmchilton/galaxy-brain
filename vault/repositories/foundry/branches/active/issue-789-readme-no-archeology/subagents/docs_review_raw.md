Run via Claude Opus 5.5 at medium effort.

# Docs review: issue-789-readme-no-archeology

Scope: `git diff origin/main...HEAD -- content/molds` (index.md step 5–6, eval.md new property, scenarios.md new case, `examples/readme-history/README.md`), checked against `.agents/skills/foundry-documentation/SKILL.md`.

## Verdict

Good to merge with one small fix. The text is concise and matches the surrounding style. It has no semicolons and none of the banned words. Step 5 now separates README content from changelog content cleanly. One factual mismatch between the scenario and its fixture should be fixed. The rest are nits.

## Fix

### 1. Scenario calls the Clair3 reason "one-sentence", but the fixture gives two

`scenarios.md`: the fixture's `## Why Clair3 instead of medaka` section has two sentences ("The source pipeline calls variants with medaka. The current Galaxy medaka wrappers make haploid calls, so…"). index.md says "a sentence or two" and eval.md says "one- or two-sentence". With "one-sentence" in the scenario, a judge could penalize a README that keeps the fixture's reason word for word. The case also leaves out the Oxford comma that the neighboring cases use ("tool identity, other state, and output assertions").

Replace:

```
- expect: the emitted README keeps the purpose, the inputs and the one-sentence reason for using Clair3 rather than medaka. The `History` block, the superseded invocation `fbf1b200b6a8b01c`, the arm64 NanoPlot failure, the failed medaka 1.4.4 run and the `gxwf validate` reviewer note leave the README and appear in `iwc-maturation-report.md`.
```

with:

```
- expect: the emitted README keeps the purpose, the inputs, and the short reason for using Clair3 rather than medaka. The `History` block, the superseded invocation `fbf1b200b6a8b01c`, the arm64 NanoPlot failure, the failed medaka 1.4.4 run, and the `gxwf validate` reviewer note leave the README and appear in `iwc-maturation-report.md`.
```

## Nits

### N1. Scenario says nothing about the current test invocation `4ae2da923366f120`

The fixture's `## Testing` section names a current passing invocation next to the superseded one. index.md lists only "earlier or superseded runs and invocation ids" as history, so a judge can't tell whether the current id should stay in the README. Decide which outcome is wanted and say so. If it should move to the report (most consistent with "bundled test data", not run results), append to the second sentence:

```
…, the `gxwf validate` reviewer note, and the usegalaxy.org invocation ids leave the README and appear in `iwc-maturation-report.md`.
```

and drop the separate `fbf1b200b6a8b01c` item. If it should stay, add "and the README may keep the current passing invocation `4ae2da923366f120`" instead.

### N2. Step 5 now has two README bullets that overlap

Bullet 1 ("Create or update a README from evidenced workflow purpose, valid inputs, and expected outputs…") and new bullet 2 ("Write the README for a user… It covers purpose, inputs, outputs…") both list purpose, inputs, and outputs. Optional merge. Keep bullet 1 as is and start bullet 2 at its new content:

```
- Write the README for a user of the workflow as submitted. Beyond purpose, inputs, and outputs, it covers fixed settings, limitations, the bundled test data, and how the workflow differs from its source or related IWC workflows. When the final workflow departs from its source, state the choice and its reason in a sentence or two.
```

### N3. eval.md: unclear "that" and an agentless passive

"whether that came from a supplied README or from the run" — "that" has no clear antecedent. "Such evidence is moved" doesn't say who moves it (SKILL: name the actor). Replace:

```
The README describes the workflow as submitted. It carries no earlier or superseded invocations, failed or abandoned tool attempts, environment-only failures, validator caveats, or narrative of how the run got there, whether that came from a supplied README or from the run. Such evidence is moved to the maturation report, not silently dropped. A one- or two-sentence reason for a final departure from the source workflow is not history.
```

with:

```
The README describes the workflow as submitted. Whether it comes from a supplied README or from the run itself, it carries no earlier or superseded invocations, failed or abandoned tool attempts, environment-only failures, validator caveats, or narrative of how the run got there. The Mold moves that material to the maturation report instead of dropping it. A one- or two-sentence reason for a final departure from the source workflow is not history.
```

### N4. Frontmatter output description for the report doesn't mention the new content

Step 6 now adds "the development history kept out of the README" to the report. The `iwc-maturation-report` output `description` (index.md line 64) wasn't updated. Optional, for consistency:

```
    description: "Per-checklist status report with evidence, before-and-after changes, unresolved decisions, development history kept out of the README, source pin, and explicit downstream validation disclaimer."
```

## Fixture (`examples/readme-history/README.md`)

It works as realistic input. It mixes a legitimate short reason (the Clair3 section), a current-plus-superseded test section, a collapsed `<details>` history block, and a reviewer note. Each scenario item has exactly one source in the fixture. The History block repeats the Clair3 rationale ("which is why the workflow switched to Clair3"), which usefully checks that the Mold keeps the short reason and drops the history. The semicolon in the reviewer note is fixture data, so it's fine. The only fixture concern is the ambiguity in N1. Leaving out an Outputs section matches `outputs: []` in the fixture workflow.
