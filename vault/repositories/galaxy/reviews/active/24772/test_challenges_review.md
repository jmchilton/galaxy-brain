# Test challenges review: #24772

- Profile: gx_test_challenger
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `49fa5544810c37ddfa05ccc9eaa2bd52c07e019c`

Supporting detail, including the mutation runs behind these findings, is in [test_challenges_debrief.md](test_challenges_debrief.md).

No P1 findings. I did not hunt for bugs and found none in passing.

## P2 1: Replace `HistoryStorageOverview.test.ts` with an E2E test of the chart

The new unit test takes four `vi.mock` calls to check that template literals reach a stubbed `BarChart`. Once `enable-selection` leaves the shared object, `:enable-selection="false"` is a literal in the template, and what that flag does is already tested in `Charts/BarChart.test.ts`.

Its third assertion can't fail: `BarChart` has a default `labelFormatter`, so `expect(charts[1]!.props("labelFormatter")).toBeTypeOf("function")` still passes with `v-bind="byteFormattingForChart"` removed from the chart. I ran that mutation and the test stayed green, so losing the byte formatting goes undetected.

The user-visible behavior is on the PR's manual test plan ("the active vs deleted chart shouldn't be selectable"), and `test_history_storage.py` already drives this page and clicks a bar on the sibling chart.

Add an E2E test covering both the selection and the formatting, then delete the unit test. Sketch, not run:

```yaml
# navigation.yml, history_storage selectors
active_vs_deleted: "[data-description='chart history datasets by active']"
active_vs_deleted_bar: "[data-description='chart history datasets by active'] [aria-roledescription='bar'][aria-label*='${name}']"
active_vs_deleted_legend: "[data-description='chart history datasets by active'] .legend-label"
active_vs_deleted_selection: "[data-description='chart history datasets by active'] .selection-info"
```

```python
@selenium_test
@managed_history
def test_active_vs_deleted_chart_is_not_selectable(self):
    self._upload_named_paste_content(UPLOAD_DATA_3)
    self.wait_for_history()
    self.home()
    self.components.history_panel.storage_overview.wait_for_and_click()
    history_storage = self.components.history_storage
    history_storage.active_vs_deleted.wait_for_visible()
    # Byte formatting comes from byteFormattingForChart, not BarChart's default formatter.
    assert history_storage.active_vs_deleted_legend.wait_for_text().endswith(" b")
    history_storage.active_vs_deleted_bar(name="Active").wait_for_and_click()
    history_storage.active_vs_deleted_selection.assert_absent()
```

`bytesToString` uses the unit `b` below 1 KB, while `BarChart`'s default formatter prints a bare number, so the legend check tells the two apart for these small uploads. Check the exact legend text when running it, and that the Active bar's `aria-label` contains its label, as the existing `dataset_by_size` selector assumes. If you would rather keep a unit test, at least tighten the assertion to `.toBe(byteFormattingForChart.labelFormatter)`.

## P3 1: `GTabs.test.ts` covers only the horizontal tab link

`GTabs.vue` has two copies of the tab anchor, and the PR reorders the spread in both. The new test renders only the non-vertical one, so moving the spread back in the vertical copy leaves it green. I ran that mutation.

Parametrizing with `it.each([false, true])` and passing `props: { vertical }` to `mount` closes this. In a scratch copy both cases pass at the PR head, and the `vertical: true` case fails under the mutation with `expected 'caller-id' to be 'first-button'`. Extracting the anchor into one shared template would also remove the duplication, but that goes beyond this PR's scope.
