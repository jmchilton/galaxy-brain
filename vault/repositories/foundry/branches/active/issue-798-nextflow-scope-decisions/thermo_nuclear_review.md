Run via Claude Opus 5.5 at high effort, using `_shared/prompts/thermo-nuclear-code-quality-review.md`, on `b74c6bdd..fc28186c` (authored content only; generated casts skipped). Fixes in `eb81515c`; head after the final advisor check is `198340b3` (test-data overview line, eval clause).

The structure holds up. The scope shape copies #781's nested-record pattern rather than adding a new collection, and no file grows past 1k lines. The main problem was rule sprawl: the same "work inside the scope" and "branch control" rules were written out in two or three places. I gave each rule one home:

- **Interface Mold Scope intro:** dropped its sarek tour of branch controls. It now points at the ledger note's definition, which the Mold already loads.
- **Interface Mold:** dropped "Cite every control value from the summary". The ledger's `from` rule says the same.
- **Ledger note:** dropped "a pipeline carried whole needs no scope decision" and "fixed controls aren't workflow inputs". That's interface policy, not ledger shape, and it now lives only in the interface Mold.
- **Data-flow Mold body:** cut its restatement of "no node, `when:` arm or fan-in, drop stays open" down to a pointer to Source scope, keeping only the companion-workflow sentence that is its own.
- **Test:** replaced the `as ScopeDecision[]` / `as ScopeDrop[]` casts and the pointless `ScopeDecision | Record<string, unknown>` unions with type-guard filters, and dropped unused fields from `ScopeDecision`.

Not acted on:

- **The `from` resolver (`checkCitation`) lives in a test.** It's the only machine reader of the citation grammar, and #784 will need one too. Moving it into `gxwf-foundry` now would be speculative with one caller, so #784 owns that (noted in `stack_plan.md`).
- **The data-flow reference `purpose` still names the scope rule in one clause.** It says why the note is loaded upfront, which is the job of a reference `purpose`.
- **The interface eval property restates the shape rules.** An eval is the oracle and has to state what it checks. It is marked `deterministic` but only checks the committed fixture, not run output, until #784 or a run checker reads real ledgers.
- **`checkCitation`'s four-way `if` chain.** A lookup table would add indirection over four short cases.

<details><summary>Full review</summary>

**Verdict:** approve after the de-duplication above. There's no structural regression, no file over 1k lines (ledger note 322 lines, interface Mold about 130, test about 165), and no spaghetti in package code. This branch changes no package code.

1. **Rule sprawl, high conviction.** "Design nothing for an excluded branch and carry its drop open" appeared in the ledger note, the data-flow body and the data-flow reference purpose. "Branch control = params/profile/conditional" appeared in the ledger note and the interface intro. "Whole pipeline needs no scope; fixed controls aren't inputs" appeared in both the ledger note and the interface Mold. Each copy can drift, and the ledger note is bundled verbatim into 25 casts, so its copies cost the most. Fixed as listed.
2. **Shape vs vocabulary.** Approved. `decisions[].scope` and `entries[].scope_branch` match the `source_arg` precedent: a nested object that marks a record's role, so readers filter by key presence. There's no new top-level collection and no `kind` value. `isStepDrop` already excludes these records because they have no top-level `step`, so no new branch was needed in `step-removals.ts`.
3. **Test types.** The casts hid the filter invariant. Type guards make it explicit. Fixed.
4. **Reusable abstraction.** The citation grammar now has a spec (ledger note) and one implementation (test). That's acceptable for a single consumer. Extract it when #784 adds a second.
5. **Ledger note length.** Source scope adds about 40 lines to a note bundled everywhere. Every Mold carrying the ledger has to keep scope drops open and design nothing for them, so it belongs there rather than in a separate note.

</details>
