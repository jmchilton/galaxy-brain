`pr_24772_review_0` builds on the reviewed commit `49fa5544810` and changes no application code. It corrects three comments that the switch to MODE 3 made wrong, extends the `GTabs` attribute test to the vertical tab link, and replaces the mocked `HistoryStorageOverview` unit test with an E2E test of the active vs deleted chart.

- `73af595e525` Stop saying compat hides .native and a bare <template>: rewords the galaxy-ui README and the comments in `portableImports.test.ts` and the Tool Shed's `galaxyUi.test.ts`.
- `ff172e0259b` Cover the vertical tab link in the GTabs attribute test: parametrizes the test over `vertical`, which fails if the spread moves back in the vertical anchor.
- `fd122d6ef0e` Test the active vs deleted chart end to end: adds `test_active_vs_deleted_chart_is_not_selectable` and its selectors, and deletes `HistoryStorageOverview.test.ts`.
