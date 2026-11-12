Run via Claude Opus 5.5 at high effort.

Strengthening round (polish steps 2–3) at `5feb4633`. The new head is `4ff48eda`.

## Task list

1. **Tighten the no-field candidate citation check.** This was the only dev task. `checkCitation` accepted a value if it was any substring of the candidate `id`. Changing `mutect2` to `mutect`, `haplotypecaller` to `calling`, or `varlociraptor` to `post` all passed. Now the candidate's file stem must be the value or end in `_<value>`. Only the test file changed; no casts were regenerated.
2. **Rerun the mutations at the current head.** 18 mutations each failed, and the fixture was restored after each. Nine are caught by the shape test, which runs in CI, and nine only by the sarek-gated citation test. The description now lists them by test and drops the "before later edits" hedge.
3. **Closes → Part of.** Proposal 1 in the issue body asks summarize-nextflow to "Report available major execution profiles / paths in `summary-nextflow.json`". The PR adds no field. For sarek's `tools`, the issue's headline example, the summary has no vocabulary (B), wrong candidate `params_delta` (A) and misses subworkflow guards (C). Proposal 2 asks for a prompt or a parameter, and the PR adds neither. No end-to-end run exists. The opener is now `Toward 🎯 #798`, followed by a highlighted line naming the three things still open.
4. **rnaseq/D made precise.** `selectTestCandidate` selects only when exactly one primary case is in `default.nf.test`/`main.nf.test`. rnaseq's `default.nf.test` has `Params: default` and its `- stub` twin, both `real`/`primary` (checked with a live `buildSummary` at `47b3b0d3`). Both set only `outdir`, so they change no branch control. The canonical-file tiebreak keeps them over any other zero-change candidate (e.g. `skip_qc`, if a QC toggle isn't a branch control), and "first listed" breaks the tie. So the case shows the run doesn't stop, not that the ranking separates real alternatives.
5. **No scope input stated.** The interface Mold has no scope `input_artifact`, and no scenario covers a caller-supplied scope. The description now says both in a highlighted sentence.

## Misreadings checked

Each has a highlighted answer in the description: builds excluded branches; adds an interactive prompt; is #784's parity report; adds a summary field or closes proposal 1; tests guard run output or run in CI; scope drops trip #818's gate; Mold behaviour proven end to end.

## Questions for John (scope-widening, not done)

- Confirm Part of rather than Closes.
- `check-scope-records` CLI (F): fold it into #784, which is the default, or lift it here?
- Summarizer fixes A–D: file them, and should this PR stay draft until A and B land?
- Commit a trimmed sarek summary so the citation test runs in CI?
- An end-to-end sarek run before undrafting?
