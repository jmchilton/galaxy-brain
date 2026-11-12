Run via Claude Opus 5.5 at high effort.

Documentation review of the branch's authored Markdown, after the domain review (`32720e29`), against the worktree's `.agents/skills/foundry-documentation/SKILL.md`. Fixes are in `32a4ae8d`, with casts regenerated in the same commit. No rule, expectation or check got weaker. (A pre-existing pipeline-case expectation lost in the domain step was restored in `5feb4633`.)

## Changed

- **Semicolons in prose.** Removed four from lines the branch adds or touches:
  - the data-flow eval property ("is fine; designing it is not" became "It may name an excluded branch as a companion workflow without designing it");
  - the test-plan `nextflow-galaxy-interface` input description;
  - the test-plan body's candidate sentence;
  - test-data step 2.
- **Ledger note `from` rule.** One dense paragraph is now a short list, one line per citation form (`params`, `profiles`, `test_candidates`, `workflow.conditionals`). The no-`enum` candidate-`id` form sits under `test_candidates`, and the free-text control rule is its own bullet. `params[<name>].default` is now listed. The fixture already used it and `checkCitation` already accepted it. "initialisation" became "initialization", the repository's spelling.
- **Interface Mold Scope.** The first bullet had packed three cases into one bullet. Caller scope, selected candidate and `needs-scope-choice` fallback are now separate bullets. "Without stopping to ask" moved into the opening sentence, so it covers every case, and the standalone closing line is gone. "Honour" became "Honor", matching the 11 other uses in `content/`.
- **Data-flow body.** The companion-workflow sentence now reads in one pass, with the sarek example in apposition instead of a trailing "e.g." clause.
- **Fixture README.** It opens on the file and what it holds. "When the sarek fixture is cloned" now says how it gets there (`make fixtures-nextflow`), and the test description says citations must back their values, not only exist.
- **Pipeline sarek case.** The domain-review rewrite was one run-on sentence. It is now four short sentences with the same claims.

## Checked

- No banned words or phrases in added lines. The only `gate` was the interface Mold's "human gate", which the domain review cut.
- Scenario and eval files keep the fixture-plus-expectation form, with no preamble.
- `npx prettier --check` is clean on the touched files.
- Facts I re-checked against sources: sarek and rnaseq pins, rnaseq `aligner` default and enum, nine drops in the fixture, and sarek in `workflow-fixtures/fixtures.yaml`.

## Gate

At `32a4ae8d` (2026-11-12): `make -k check`: red only on `validate-roadmap` (GitHub API rate limit) and `check-vendored` (fails on this machine only), 503 tests passing. `npm run typecheck` and `npm run packages-typecheck`: clean. No package code changed, so `packages-build` from the domain step still holds.
