# Re-scope debrief

The first scope evaluation recommended Scope B, a modest expansion. The original fix (`132b1ec8a9c`) is saved as `issue_24648_shed_field_border_alt_original_scope`; see `alts/original_scope.md`.

What the expansion settled or changed:
- **Brand focus border:** it does apply. The rule is (0,3,1) against GFormInput's scoped (0,3,0), and the browser confirms it: computed `rgb(37,83,123)`. The first review was wrong to call it dead. Its comment stays.
- **Hover:** inputs and selects share a grey-700 hover border (`91906239662`). Focused fields and valid/invalid/error fields skip it.
- **textarea selector:** dropped, because it matched no element.
- **Focused, hovered selects:** they now keep the primary `::before` border, which Quasar clears (`50e41129faa`). This came from the re-scope review.

Not done, and better as follow-ups: Scope C (the undefined `--color-ebony-clay-*` tokens, other decorative borders) and Scope D (a `release_26.2` backport, which would need a different patch).

The re-scope normal review is in `subagents/rescope_review.md`. It measured these colours in a browser:

| Field | Rest | Hover | Focus |
|---|---|---|---|
| Inputs and selects | grey-500 | grey-700 | primary |
