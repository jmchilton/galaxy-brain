Risks are minimal - this change rewrites Mold routing prose and one schema `description` string, leaving the `hit`/`weak`/`miss` enum and all validation shape unchanged, so it doesn't lock the project into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `weak` no longer falls through to `author-galaxy-tool-wrapper`; harness runs that relied on that escape now confirm the candidate or route to topology repair, which could loop or stall if confirmation is inconclusive.
- `miss` is narrowed to "no wrapper runs the named executable"; a wrapper that runs it but fits badly now goes to repair via a blocking ledger entry instead of authoring, putting more load on `repair-galaxy-draft-topology` (still `status: draft`).
- The new fold rule in repair (`remove-step` + `rewire` + `change-parameter`, e.g. `rna_star` building its own index) is a new structural edit path with only scenario coverage.
- The reworded schema description ships in a published `@galaxy-foundry/gxwf-foundry` patch release; it's text only and is easy to revise later.

</details>

<details><summary>Risk Review Advice</summary>

Check that the `weak` path in `advance-galaxy-draft-step` step 2 always ends somewhere: confirmed and pinned, downgraded to `miss`, or sent to repair through implement's ledger entry. Make sure no case is left with no exit. Also check that implement's new "leave the `TODO_*` port unbound" rule is consistent with step 1 of advance, which recognises a found wrapper that can't serve the step and sends it to step 5, so the loop doesn't pick the same step again forever.

</details>
