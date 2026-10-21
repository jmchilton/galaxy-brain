**Title:** Build the direct Galaxy routes on the Workflow Brief Molds

---

🤖 *Opened by Claude for jmchilton, who decided the design questions in #694.*

Closes #694.

PAPER → GALAXY and INTERVIEW → GALAXY now write a Workflow Brief and build from it through the same `workflow-brief-to-galaxy-*` Molds as WORKFLOW BRIEF → GALAXY. They never stop for expert review. The four `freeform-summary-to-galaxy-*` Molds are retired, so one Galaxy design family serves both direct build and Plan & Build.

## Pipelines

- `paper-to-galaxy`, `interview-to-galaxy`: summarizer → `freeform-summary-to-workflow-brief` → the brief spine. PAPER keeps `paper-to-test-data` in its test-data branch.
- New harness notes:
  - run validate and check after the brief, and stop on declared blockers;
  - record "no expert review, proposals accepted by default";
  - preflight before design;
  - check the brief hash from emission onward;
  - the Done report lists every unreviewed answer and points to `pipeline-workflow-brief-to-galaxy` for a reviewed rerun.
- `workflow-brief-to-galaxy` is unchanged apart from prose. It still stops without a recorded review.
- New `eval.md` for both direct pipelines.

## Ledger: `basis: unreviewed-proposal`

A Mold that finds a `brief-proposal` answer wrong keeps it and files a brief-change recommendation, because an expert accepted it. Applied to an unreviewed brief, that rule would stop the run on every wrong guess. The new value adopts the proposal like `brief-proposal`, but a later Mold supersedes it like an `agent` decision.

- Changes:
  - `open-requirements-ledger`: the new value and its supersede rule;
  - `workflow-brief-design`: a direct-build lifecycle paragraph;
  - the interface Mold body, eval and a new scenario;
  - a one-line pointer in the data-flow Mold.
- The brief Molds' input descriptions now read "expert-reviewed or accepted unreviewed by a direct build".
- Change to direct users: an ambiguous selection now stops as a brief blocker instead of being guessed. This matches #605's "can still stop on blockers".

## Retired Molds

- Deleted `freeform-summary-to-galaxy-{interface,data-flow,template,test-plan}` and their casts.
- Repointed their consumers to the brief Molds and artifact ids:
  - `compare-against-iwc-exemplar`, `find-test-data`, `paper-to-test-data`, `implement-galaxy-workflow-test` and `repair-galaxy-draft-topology`;
  - five pattern pages, three schema notes and four research notes;
  - the test-plan CLI page, the glossary and `harness-pipelines`.
- Kept `freeform-summary-to-workflow-brief` (the brief producer) and `freeform-summary-to-cwl-design`. UPDATE INTERVIEW → GALAXY is unaffected.

## Test change

`tests/assemble-pipeline.test.ts` had a test asserting the old contract: "keeps Workflow Brief planning opt-in for the established direct pipelines". It required the freeform Molds and no `workflow-brief` phase. I replaced it with the new contract, and the new test is stricter:
- each direct spine equals summarizer + brief producer + the exact brief-pipeline spine;
- the brief spine still contains the interface and test-plan Molds;
- both harnesses say `no expert review` and `basis: unreviewed-proposal`;
- the brief pipeline still says "Missing review or";
- the freeform interface cast is gone.

## Evidence

Run 3 (DengueSeq DENV3, n = 1) sent one paper and scope through both routes. Both converged on the same workflow. The brief route added recorded decisions and more verification. Details and confounds are in #694.

## Validation

- Pass:
  - `validate` (0 errors);
  - `check-generated`, `check-planemo-pin`, `check-casts`, `check-verify`, `check-assemble-pipelines` and `check-fixtures`;
  - `test` (491);
  - `typecheck`, `format`, `lint`, `check:kinds` and `validate:roadmap`;
  - `packages-typecheck`, `packages-test` and `site:build`.
- Red only on my machine:
  - `check-vendored`: my Galaxy and galaxy-tool-util-ts checkouts differ from the pinned upstreams;
  - `check:planemo-cli`: my local planemo version.
  - This branch touches none of the files involved.
- Not run: a real end-to-end direct-build run on the new spine.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
