Run via Codex CLI 0.166.0 (`gpt-6-sol`, reasoning effort medium, read-only), triaged by Claude Opus 5.5 at high effort.

Codex reviewed `b74c6bdd..94fcfb58`, after the normal-review commit. Fixes are in `fc28186c`. It raised three findings. I acted on all three: two are fixed, and one is documented because the real fix belongs to the summarizer.

- **Fixed: the scope choice now reaches the test Molds (P1).** This is the divergence the normal review had left as a question.
  - The interface brief now states the scope's candidate `id`.
  - `nextflow-to-test-data` (rev 5) uses that candidate on `needs-scope-choice`, and asks for a caller's choice only when the brief names none.
  - `nextflow-test-to-galaxy-test-plan` (rev 9) takes `nextflow-galaxy-interface` as an input and does the same.
  - No ledger wiring was needed, because both Molds can read the candidate from the interface brief. That brief is already an input to test-data and is produced earlier in the pipeline.
- **Fixed: the fallback no longer needs a primary candidate (P2).** The summarizer can return `needs-scope-choice` with no primary candidate, for example a lone `pipeline-defaults` candidate whose required params are unset. The fallback now picks from the primary candidates when there are any, and from all candidates otherwise.
- **Documented, not fixed: candidate-`id` citations (P1).** Codex is right that sarek's `test_candidates[tests/variant_calling_mutect2.nf.test::dynamically-generated]` records `params_delta.tools: strelka`, so the summary contradicts the `mutect2` value. The ledger note already allowed citing such a candidate by `id`, as a stopgap for the summarizer bug. It now says outright that the citation rests on the name alone and that `params_delta` may not show the value. The real fix is in summarize-nextflow: give generated candidates their own `params_delta`, and keep the `tools` values from the schema `pattern`. Rejecting these citations would leave sarek's `tools` alternatives with nothing to cite.

Not acted on: nothing else.

<details><summary>Full Codex output (triaged)</summary>

Coverage: Codex read AGENTS.md, the glossary, the meta notes, all changed Molds, the template, test-plan, test-data and summarize Molds, the pipeline, both research notes, `step-removals.ts`, the summarize resolver and schema, and the test. It checked the fixture against live sarek and rnaseq summaries. Vitest couldn't start in the read-only sandbox (Vite cache write).

1. **P1 correctness:** "Sarek scope drops cite candidate IDs that do not support their control values." `scope-somatic-calling` cites a candidate whose `params_delta.tools` is `strelka`, and the test only checks that the value appears in the id. **CONFIRMED.** It's a by-design stopgap, now documented as such; see above.
2. **P1 api-contract:** "An interface scope choice is not carried to downstream test selection." On rnaseq, test-data asks for a caller choice and test-plan has no selected candidate to consume. **CONFIRMED**, matching normal review P2 2. Fixed through the interface brief.
3. **P2 correctness:** "The autonomous fallback has no rule when there is no primary candidate." **CONFIRMED.** Summarize-nextflow index.md:417 and the pipeline-defaults fallback can return `needs-scope-choice` without a primary candidate. Fixed.

</details>
