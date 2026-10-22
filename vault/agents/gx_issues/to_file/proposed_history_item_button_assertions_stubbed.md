# History item button checks in `test_history_dataset_state.py` are a stub, and the selectors they need are stale

`TestHistoryDatasetState._assert_buttons` returns without checking anything, so the title and action button checks in the dataset state tests pass however the buttons look.

```python
    def _assert_buttons(self, hid, expected_buttons):
        # TODO: Useful but unmigrated test from legacy history
        # item = self.history_panel_item_component(hid=hid)
        # for expected_button in expected_buttons:
        #    button = item[f"{expected_button}_button"]
        #    self.assert_tooltip_text(button.wait_for_visible(), BUTTON_TOOLTIPS[expected_button])'''
        return
```

`_assert_title_buttons` (`display`, `edit`, `delete`) and `_assert_action_buttons` (`info`, `download`) both call it. `_prepare_dataset` calls `_assert_title_buttons`, so `test_dataset_state` and `test_dataset_change_dbkey` (two of the four tests) go through it, and `test_dataset_state` also calls `_assert_action_buttons`. All of these run on an `ok` dataset; the `discarded` and `deferred` tests never reach it. The check ran only against the legacy history panel, and has been a no-op since 399c6e91948 ("Remove is_beta_history flag from selenium tests", 2022-09).

Because nothing has run the commented-out loop since, the selectors and tooltips it needs have drifted. On current `dev` (0073b5e9224) it would fail on four of the five buttons; only `delete` still matches:

| Button | `history_panel.content_item` selector | `dev` markup | `BUTTON_TOOLTIPS` | `dev` title |
| --- | --- | --- | --- | --- |
| display | `.display-btn` ✅ | `.display-btn` (`ContentOptions.vue`) | View data ❌ | View |
| edit | none ❌ (dropped as unused in 9992ec7f65a) | `.edit-btn` (`ContentOptions.vue`) | Edit attributes ✅ | Edit attributes (`This dataset is not yet editable.` while new/queued/running/etc.) |
| delete | `.delete-btn` ✅ | `.delete-btn` (`ContentOptions.vue`) | Delete ✅ | Delete |
| info | `.params-btn` ❌ | `.info-btn` (`DatasetActions.vue`) | View details ❌ | Dataset Details |
| download | `.download-btn` ✅ | `.download-btn` (`DatasetDownload.vue`; a dropdown when the dataset has metadata files) | Download ❌ | `Download (<size>)`, or `Download` with no size |

`content_item.info_button` is in `navigation.yml` and the generated `schema.ts`, but nothing uses it. It still points at the old `.params-btn` class.

## Proposed Approach

Put `_assert_buttons` back: point `content_item.info_button` at `.info-btn`, re-add `content_item.edit_button` (`.edit-btn`), update `BUTTON_TOOLTIPS` to the current titles, and restore the loop with the existing `assert_tooltip_text` helper. Run the file under Selenium and Playwright.

<details><summary>Approach details</summary>

- `display`, `edit` and `info` have fixed titles in the `ok` state, so exact matches work. The download title includes the file size, so use `assert_tooltip_text_contains` with `Download`, or leave `download` to `_assert_downloadable`, which already checks that button.
- The loop stops at its first failure, so fix all four rows before judging the result.
- Regenerate `schema.ts` (`client/navigation_to_schema.mjs`) after the `navigation.yml` change. It is already out of sync: its `content_item` still lists `edit_button` and `visualize_button`.

</details>

## Alternative Approaches

Delete `_assert_buttons`, its two callers, `BUTTON_TOOLTIPS` and the unused `info_button` selector. This is honest about what's tested, but it drops the only check of which buttons an `ok` dataset shows and what their tooltips say. Restoring it is a small change, so it is preferred.

<details><summary>Alternatives In Detail</summary>

### Alternative: Remove the stub and dead selectors

<details><summary>Description</summary>

#### Details

Delete `_assert_buttons`, `_assert_title_buttons`, `_assert_action_buttons`, `BUTTON_TOOLTIPS`, and `content_item.info_button`.

#### Why the proposed approach is preferred

The tests would no longer imply coverage they don't have, but the history item buttons are what users click first, and these tests are the natural place to guard them. Fixing two selectors and a dict costs less than losing that coverage.

</details>

</details>
