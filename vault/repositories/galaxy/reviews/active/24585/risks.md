Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `71178a56e3b`

Risks are minimal. This change doesn't lock Galaxy into choices that are hard to change (a two-way door). It adds a new, unused `GPagination` component to `client/packages/ui` and exports it. No call sites, APIs, or user-visible UI change, so reverting means deleting one component and one export line.

<details><summary>Risk Details</summary>

- The main lasting commitment is the component's prop and event surface. It mirrors `BPagination` (`total-rows`, `per-page`, `limit`, `*-text`, `label-*`, the `*-class` props, and the `change` event for clicks only). The 23 follow-up swaps will depend on it, so renaming it later means touching every call site. Until those swaps land, it is cheap to change.
- The component goes back to page 1 when the page size changes or the page count drops below the current page, and emits `update:modelValue`. `BPagination` behaves differently here. Call sites that briefly drop `total-rows` to 0 while loading async data could get bounced to page 1 when they switch over. This is a risk for the follow-up PRs, not this one.
- Focus moves to the current page when the clicked control is disabled or removed. If it is wrong, it only affects keyboard users once the component is adopted, and it is easy to adjust.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should treat the props and events as the API every future pager depends on. Check that the names and the split between `change` (clicks only) and `update:modelValue` are the ones Galaxy wants to keep after BootstrapVue is gone.

Also check the reset-to-page-1 watcher against server-paginated call sites such as the grid lists and the history and dataset lists. Those can update `total-rows` asynchronously, so confirm before the swaps that a load or refetch won't reset a user's page.

</details>
