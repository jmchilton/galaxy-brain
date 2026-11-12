Run via Claude Opus 5.5.

# Strengthen round (polish steps 2–3)

Reviewed `pr_description.md` against the branch at `52762228` and applied the tasks in the same session. One strengthening round.

## Tasks

1. **Deterministic `_plan_state` transport test (applied).** New `tests/plan-state-transport.test.ts` (root, since `@galaxy-tool-util/schema` and `content/` live there; it imports the resolver from `packages/summarize-nextflow/src` so a stale `dist` can't mask it). On a bamtofastq-shaped pipeline (entry → `NFCORE_BAMTOFASTQ` → `BAMTOFASTQ` → `ALIGNMENT_TO_FASTQ` → two `SAMTOOLS_VIEW` aliases, one with a synthetic if/else `prefix` for a tie) it:
   - copies each call's effective entries per the template's rule (ids from the call's rows, once each, `tie: true` from tie rows, one JSON line per entry), embeds the document in a one-step draft, dumps and reloads the draft, and checks `validateDraft(...).ok` and that the entries parse back deep-equal;
   - checks both branch assignments of the tied key carry `tie`;
   - checks the same document as a mapping fails `validateDraft` with structure errors (probed first: `validateDraft` itself rejects it, so this matches the `gxwf draft-validate` exit-2 claim);
   - checks every fixture expression is lost when written as plain YAML;
   - extracts the template Mold's `_plan_state` example and requires it to validate and equal resolver output for its call. Mutating `-F12` in the Mold made this case fail, then reverted.
2. **(b) advance completeness (description only).** No validator: a ledger/flag checker is the unapproved follow-up. Sharpened the bold sentence: nothing deterministic fails a run that leaves a flag without a record.
3. **(c) profile-wins caveat (no change).** Stated in Ranking rules (bold) and Risks; Mold, schema JSON and schema note all document it.
4. **Description scoping.** The bold Evidence sentence now separates the deterministically checked transport from whether the Molds follow the rules (still LLM-judged, no end-to-end run). Added the test to the "Why YAML inside a string" paragraph and Files.

5. **Stale casts (found by the gate, fixed).** `make -k check` after the test showed 12 casts drifted on `summary-nextflow.schema.json`: `32673995` changed `effective_args` descriptions, and the casts committed after it were cast against a stale `dist`, so the earlier "green apart from roadmap/vendored" gate was a false pass. Regenerated in a separate commit.

## Misreadings checked

- Closes #781 → top bold sentence.
- Adds a draft field / schema change → bold "still a string".
- Resolver evaluates config → bold "doesn't evaluate config `if`s or closures".
- Molds proven end-to-end → bold Evidence sentence, rescoped so the new test doesn't recreate this misreading.
- advance enforces dispositions deterministically → bold advance sentence.

## Not done

- No end-to-end run evidence; none fabricated.
- The test exercises a test-side copy of the template rule, not the Mold's output.
