# Implementation debrief

The routing half of #678, the ledger route John chose on 2026-11-10 over #773's `unsuitable` status.

- **`discover-shed-tool` (rev 6):** classifies on what a wrapper runs, not on fit, so a wrapper that runs the named executable is never a `miss`. It searches the executable when the need names one, drops data-manager hits, and `weak` no longer falls through to authoring.
- **`advance-galaxy-draft-step` (rev 12):** only `miss` falls through to authoring, and a rejected `weak` counts as a `miss`. The wrapper-choice-mismatch bucket gives a parameter gap a plain entry and a missing output a blocking entry. Step 1 skips straight to step 5 for a found wrapper that can't serve the step.
- **`implement-galaxy-tool-step` (rev 14):** a chosen wrapper that runs the work but can't produce a declared output becomes a blocking entry naming the wrapper. The port stays unbound.
- **`repair-galaxy-draft-topology` (rev 7):** folds when a consumer's wrapper does the step's work, as `rna_star` builds its own index.
- **Notes:** the ledger (rev 7), draft-format (rev 6), discovery schema note (rev 2), `harness-pipelines` (rev 24), and the schema JSON description, with a patch changeset.
- **Evals and scenarios:** one property each in `advance`, `implement` and `discover`. Scenarios for `implement` (STAR, no index output), `discover` (STAR index need) and `repair` (STAR fold, no fixture).

Evidence: STAR facts checked against tools-iuc by the review subagent (`@TEMPINDEX@`, no index output, 2.7.11b+galaxy1). Tool Shed search rankings for `star genome index` and `rna star` come from the review and the #678 research. No Mold run exercises the new route.

Gate: `make -k check` at `4e4df029` passes, with 496 tests, except `check-vendored` (machine-only) and `validate-roadmap`. `validate-roadmap` fails on `main` because #768, a new `roadmap/main`, isn't in the roadmap.

Left out: `author-galaxy-tool-wrapper`, left to #773. Re-pick after the escalation cap, already present on `main`.
