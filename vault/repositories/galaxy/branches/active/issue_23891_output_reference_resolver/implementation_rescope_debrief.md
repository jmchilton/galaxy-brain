# Rescope debrief (2026-10-27)

The first re-harden scope evaluation (`earlier_drafts/2/scope_evaluation.md`) recommended **EXPAND, modestly**.

## The four open items
- **Lint `metadata_source`: done.**
  - Commit `886d8ffd327` generalizes the format_source reference linter into `_check_output_reference(attribute=...)` and adds the `OutputsMetadataSourceReference` linter.
  - Before this, a bad `metadata_source` was a load error from profile 26.2 with no lint warning beforehand.
  - The test was red before the implementation. It covers a missing input, a collection input, an unqualified name, a qualified name, a selector, and a discovered collection.
- **Make the shadowed legacy alias on a discovered collection a load error from 26.2: not done.** The evaluation called it "consider, lower priority", and the linter already flags it as an error. **Left for John.**
- **Mixed-type matches (`any()` vs `all()`): kept `any()`,** as the evaluation recommended.
- **`qualify_legacy_data_input_reference` duplication:** already resolved by the `type_source` commit.

## Process
- The pre-rescope branch is kept as the alt `issue_23891_output_reference_resolver_alt_original_scope` (`f323237f519`), described in `alts/original_scope.md`.
- A normal review found no bugs. I applied its wording fix and filled its test gaps; details are in `subagents/rescope_review.md`.
- Then I re-hardened. The earlier hardening debriefs are in `earlier_drafts/2/`.
