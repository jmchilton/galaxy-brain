No project state is locked in, because this changes Mold prose, casts and fixtures with no schema or data migration (a two-way door); the one effect a revert can't undo is that workflows built while it is live may have lost steps or public interface, with only a ledger entry recording it.

<details><summary>Risk Details</summary>

- Repair may now remove drafty steps and public inputs or outputs. A revert doesn't restore them in workflows already generated. The record is a `kind: dropped` entry, so anyone who reads the workflow without the ledger sees a smaller workflow and no gap. The only guard is the `because` citation.
- The citation guard is judged by the agent and no gate checks it. In the one `advance` trial, the agent called stock Apply Rules "unproven, not absent" and still removed the step on the searches in the entry. The debrief leaves open whether a partial citation is enough.
- Nothing limits a repair to one entry. The same trial also closed a second blocking entry and replaced public output `fastqc_zip_archives`. The entry named that remedy, but this is more change per escalation than the old "one named region", and the budget counts it as one escalation.
- `blocking: true` now covers more cases (wrapper confirmed absent, subsumed step, per-run value, late validation failure) and every Mold carrying the ledger gets the wider rule. More entries can therefore reach a Mold that edits the workflow. The convergence gate and the cap of 5 were written with computability gaps in mind.
- A blocking entry against a realized step, or with no `step`, can still reach the extract while open, because step 5 looks only at the picked step. When no drafty step is left, the loop doesn't return to repair. The debrief saw this with `trim_reads_seqtk`, whose `when:` reads a `skip_trim` that isn't in its `in:`. Wider `blocking` makes this path more likely.
- The contract may not end cleanly when a repair can't lower the count. Repair can leave an entry open against a drafty step if it has no citation, which trips the gate and ends escalation "as the cap does". The step stays drafty, though, and the ledger note itself says a drafty step never leaves the loop. `advance` step 5 only says to surrender once the cap is reached, and doesn't say what the next iteration does with that step under a `while draft` harness. By reading alone, it could spin, or fall back to authoring a wrapper for a step already judged impossible. No trial covered this path.
- Evidence is thin and comes from the author. These are single stochastic runs, the author judged the `llm-judged` properties, there was no live Galaxy run and `/test-mold` wasn't invoked. `fastqc-zip-no-port` had no agent run. `make check-fixtures` doesn't reach the new fixtures, so they can drift without a gate noticing.
- Merge order matters. #686 and `fix/advance-draft-needs-tool` conflict as text at `repair` and `advance` step 4. This branch dropped their "step 2" phrase, so whichever lands second has to restore it, and a clean-looking conflict resolution could lose it.
- Test-phase structural fixes stay out of scope. After a direct-only repair the extract would be stale, so a later change adding that route must also make the harness call `advance` again.
- Low impact: every ledger-carrying cast changes, so the diff is large and hard to read by eye. `repair`'s cast grows to 392K, mostly the vendored `gxformat2.schema.json`. `make check-casts` is clean at `6f5be153`, so casts match their sources.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether autonomous narrowing is acceptable on the citation rule as written, and whether a partial citation should count. The final repair paragraph and the Interface paragraph of `repair-galaxy-draft-topology` carry this. Consider requiring removal of a public output or input to be surfaced to the user in the run's output as well as the ledger.

Then read `advance` steps 1 and 5 together with the "Escalation budget" section of `open-requirements-ledger`, and trace what happens to a drafty step after the gate trips or the cap is reached, and to an open blocking entry on a realized step at extract. Those are the paths most likely to misbehave in a real run, and neither the trials nor the fixtures exercise them. A real pipeline run through a removal repair would settle more than further single-Mold trials.

</details>
