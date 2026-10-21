Risks are minimal. This is a client-only layout change to the invocation overview, plus an optional "Expand Step" modal. It adds no API, workflow, or tool-format behavior, and a revert would undo it cleanly (a two-way door).

<details><summary>Risk Details</summary>

- The full-page overview now splits 50/50 between the graph and the step card, and only the step body scrolls. The old page-level scroll and the "Scroll to Step" button are gone in full-page mode, so users who scrolled the whole page will notice the change. The new behavior is easy to discover.
- "Expand Step" uses `Teleport` to move `WorkflowInvocationStep` into a `GModal`. The `GModal` renders inside `.invocation-step-card`, so the card-scoped `navigation.yml` selectors (`step_card_config_tab`, `step_card_config_form`) still match while it is open.
- The fixed height (`fixed-height` 60) is dropped only when `isFullPage` is set. Embedded and non-full-page uses should keep their old sizing, but nobody has checked them visually.
- The new layout relies on a flex chain from the `.full-page` root down to the graph (`min-height: 0`, `flex: 1 1 0`) across four components. Any ancestor added later without these rules collapses the graph silently.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check the full-page overview at short viewport heights (the root sets `min-height: 400px`) and with large tool forms in the step card. They should also confirm that non-full-page uses of the overview look the same as before.

Opening "Expand Step", switching steps (which closes it), and closing it again is worth a quick manual pass. This flow exercises `Teleport` with `defer` and the swap of `WorkflowInvocationStep` by key.

</details>
