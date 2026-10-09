Retain iteration 03 as implemented: five selected suites, focused migrations in four supporting suites, and two shared test helpers. The expanded scope follows the user's explicit cross-consumer authorization and the loop's requirement to complete concrete reuse opportunities.

Audit basis: frozen Galaxy diff against `51b247553a74e150c898eb9435b9230d10569466`, including the new untracked cleanup helper; `LOOP_ITERATION.md`; `readability_batch_03.yml`; the five per-file reviews; and the previously deferred notification item in `MARGINAL_ADVICE.md`. This is a scope audit; correctness, assertion preservation, and combined validation are assessed separately.

## As implemented: retain

The five originators cover component, composable, store, utility, and API tests. Cleanup item defaults are shared with the two existing neighboring consumers; the prior notification-factory follow-up is implemented in its existing helper and both consumers. All eleven Galaxy files are unit suites or test helpers; production, README, E2E tests, styles, dependencies, and runtime configuration remain outside this iteration.

| Pros | Cons |
| --- | --- |
| • Completes both concrete reuse paths with their actual consumers. | • Eleven source files require a wider review than the five-file sample. |
| • Keeps supporting cleanup migrations limited to item fixtures and notifications tied to deterministic typed fixtures. | • Supporting suites still require their own future full readability review. |

Only the five selected originators should gain iteration counters. NotificationCard's earlier counter and the other supporting counters stay unchanged. Keep this work in a third commit on the existing branch/worktree, preserving the first two commits. Zero README additions is consistent with the loop's evidence threshold.

## Contract to selected suites only

Keep the five original selections and omit cross-file migrations and both shared-helper changes. This would be a smaller diff, but it would abandon the reuse follow-through the user explicitly requested.

| Pros | Cons |
| --- | --- |
| • Shortest review surface. | • Leaves the concrete notification follow-up unresolved. |
| • Avoids touching unselected suites. | • Repeats cleanup item setup and treats the sample as a file limit. |

Not recommended. The supporting files are direct consumers, rather than unrelated cleanup.

## Retain cleanup reuse; defer notifications again

Complete the selected work and three-consumer cleanup factory, but move the notification factory and its consumers to another iteration. This is a coherent split mechanically, yet the existing notification follow-up is precisely the work the revised loop asks to carry forward.

| Pros | Cons |
| --- | --- |
| • Separates newly discovered reuse from earlier follow-up. | • Adds another deferral despite identified compatible consumers. |
| • Reduces this iteration by three files. | • Keeps randomized and malformed notification fixture defaults in use. |

Not recommended. The notification migration remains confined to test fixtures, explicit fixture inputs, and their necessary mount/update checks.

## Expand to full supporting-suite reviews or E2E coverage

Perform complete readability reviews of all four supporting suites, or add browser tests/screenshots for the represented UI. Existing reports identify different cleanup operation/mount behaviors and no second compatible fixture consumer for the selected API, store, or URL cases; they do not establish a need for additional abstractions or a production/UI change.

| Pros | Cons |
| --- | --- |
| • Could discover further opportunities in future full reviews. | • Dilutes the focused supporting migrations and inventory distinction. |
| • Browser checks could document existing appearance. | • Unchanged production UI offers no new screenshot behavior to verify. |

Not recommended for this iteration. Preserve supporting tests' eligibility for later selection and keep browser work tied to a concrete runtime change.
