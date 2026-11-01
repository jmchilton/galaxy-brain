# Re-scope debrief

The first scope evaluation ([earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md)) recommended one modest expansion. `step_state_to_tool_state` loaded a text input with both `restrictions` and `suggestions` as suggestions. Because the editor form holds one kind of option, the restrictions were dropped as soon as the workflow was imported or saved, and the run form offered free text without enforcing them. It's the same failure class as #24375, in the function this branch already edits.

- **Original scope:** kept as `issue_24375_restriction_string_roundtrip_26.1_alt_original_scope` at `13c2282e38c` on the fork ([alts/original_scope.md](alts/original_scope.md)).
- **Expansion commit `6340eaa04f2`:**
  - Restrictions beat suggestions.
  - Restricting on connections still beats static restrictions, as at runtime.
  - Suggestions with restrict-on-connections still load as suggestions.
  - Only the restrictions plus suggestions case changes.
- **Tests:**
  - Two unit tests, one per precedence rule. The restrictions-beat-suggestions test fails with the old precedence.
  - The API test `test_text_input_restrictions_and_suggestions_open_restricted` uploads both lists. It checks that the downloaded state keeps the restrictions, and that the run form is a select over them.
- **Review:** the normal review ([subagents/review_rescope.md](subagents/review_rescope.md)) found that my first version also flipped restrictions over restrict-on-connections, and that its comment cited a wrong precedent. Both are fixed in the amended commit.
- **Not taken (per the scope evaluation):**
  - a structured editor (dev work)
  - a dict with no `value`, and rejecting non-text entries (both import validation, gxformat2#272)
  - the sample-sheet column editor (a separate client format)
