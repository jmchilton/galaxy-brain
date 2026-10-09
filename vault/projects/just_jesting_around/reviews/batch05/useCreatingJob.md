# useCreatingJob

Selected originator: `client/src/composables/useCreatingJob.test.ts`.

Reviewed the goal, iteration instructions, client testing guidance, composable implementation, existing test-data factories, and neighboring composable mocks. All 10 cases and 23 assertion statements remain. Dataset and collection IDs now identify their domain, and dataset/collection describe names replace HDA/HDCA path labels.

The four typed sparse store response maps are explicitly hoisted with their module mocks. A suite-level `beforeEach` empties every map, replacing ten per-test reset calls and four separate deletion loops. Static import replaces the narrated dynamic import. Three casts claiming complete API objects were removed: the mocks deliberately accept partial dataset/collection responses, and scenario fields remain visible. Full API fixture defaults would obscure the creating-job fields under test.

## Scenario preservation

| Scenario | Assertions retained |
| --- | --- |
| Dataset has creating job | ID `job-42`, loading false, no error. |
| Dataset has no creating job | Null ID, explanatory error. |
| Dataset absent | Loading true, null ID. |
| Dataset fetch fails | Null ID, loading false, network error. |
| Collection produced by one Job | ID `job-77`, no error. |
| Collection produced by implicit jobs | Null ID, non-identifiable-job explanation. |
| Collection fetch fails | Null ID, supplied error message; error text is renamed together with its fixture. |
| Unknown source | Null ID, loading false, no error. |
| Null input ID | Null ID, loading false. |
| Input ID changes | First `job-A`, then `job-B` in the same reactive sequence. |

No second consumer needs this sparse pair of store fakes, so the arrangement remains local. Existing guidance already covers typed fixtures and isolated state; no new README advice is proposed.

Validation: this suite and `useNotificationSSE` pass together, 24 cases. Scoped ESLint, formatting, and the full client type check pass. Evidence: `/private/tmp/batch05_composables_final.log`, `/private/tmp/batch05_events_lint_final.log`.
