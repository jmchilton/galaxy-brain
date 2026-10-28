Run via claude-opus-5-5 at default effort.

No refactoring of the base branch was performed.

## Evaluation

Commits reviewed (`origin/release_26.2..HEAD`, 8 commits, Baseline tests first). Candidates considered:

- `navigates_galaxy.py` tooltip-text helper (in 1d935c72d14): folds duplicated `click_away` handling into one tail. Pure, behavior-preserving, but ~6 lines; a standalone commit adds review noise without aiding the fix. Also, rewriting history mid-run would touch files a concurrent Playwright session is using.
- `TooltipOnHover.vue` removal (0d7b3961ae7): only possible once RuleCollectionBuilder stops using it, and that switch is itself the fix (disabled Finish tooltip never showed). Not hoistable without the behavior change.
- `WorkflowPublishedButtons` `editButtonTitle` removal, GCard `v-g-tooltip` -> `tooltip`, `data-title` selector updates (JobInformation test, navigation.yml, selenium test): all are consequences of the fix (switching to GButton `tooltip`/`disabled-title`), so they change behavior and belong with it.

Branch history left unchanged.
