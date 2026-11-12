Run via gpt-6-sol at medium effort.

# Codex review: `ef1607a8..ccf4a817` (fix at `c48a8ee2`)

Codex (`codex exec -s read-only`, structured findings) returned two P1s and two P2s. One was a real doc/code mismatch, fixed in the commit below; the other three don't hold up.

## Fixed

- **P2: `entries: null` exits 0 though the CLI page says a non-list `entries` exits 3.** Confirmed as a doc mismatch, not a code bug: `ledgerEntries` reads `ledger.entries ?? []` (`packages/gxwf-foundry/src/step-removals.ts:44`), so a YAML `entries:` with no items is an empty ledger. Removed steps still come back unlabelled (exit 4), so it can't false-green a removal. Codex's "build-cli rejects it" is off: `parseOpenRequirements` returns `null`, which `readOpenRequirements` treats as no ledger, also no entries. Kept the behaviour, made the page say "an `entries` that holds something other than a list exits 3 ... an empty `entries:` key has no drops", and added a test pinning it (green on arrival; it pins existing behaviour, no red phase). Casts regenerated.

## Refuted

- **P1: `gxwf diff` is absent from the pinned gxwf 1.15.** True, and already the branch's documented release dependency (gtu-ts #233 + pin bump). It's why the PR stays draft, and the Mold's `step-removal-check-error` route is deliberate. Not a new defect.
- **P1: the `unlabelled-step-removal` fixture can't really pass Planemo (placeholder Zenodo URL).** The placeholder `zenodo.org/records/0000000` is the house convention for eval fixtures. Every `review-galaxy-workflow` example uses it, and `workflow-test-result.json` is a canned handoff for LLM-judged evals, not a reproducible run.
- **P2: malformed JSON/YAML exits 1, not 3.** The CLI page documents "Read and parse failures exit `1`", the same as `run-json-validator` and `run-yaml-validator` ("1 — input error (missing file, malformed YAML)"). Exit 3 is a wrong shape after a successful parse. My brief to Codex called exit 3 "malformed input", which invited this. The implementation debrief now uses the precise wording.

## Coverage

Codex read the TS sources, tests, Molds, CLI page, fixture and `build-cli`'s ledger reader. It skipped most generated cast provenance and pipeline assemblies; those are checked by `check-casts` / `check-assemble-pipelines`.
