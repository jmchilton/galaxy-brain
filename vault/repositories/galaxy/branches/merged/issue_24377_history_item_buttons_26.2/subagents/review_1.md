# Normal review 1: debrief

The reviewer approved the branch and found no bugs, so I made no changes. I recorded the reviewer's dev follow-ups in the implementation debrief.

## Not acted on
- **Direct-child combinator** (`${_} > .g-collapse-open…`). Nothing inside a content item nests another `GCollapse`, so the plain descendant selector is already unambiguous. Making this change would mean rerunning the slow E2E file under both backends for no behavioral gain.
- **`PARTIAL_TOOLTIP_BUTTONS` comment.** It doesn't just repeat the value: it says why download is matched by substring, which is that the title ends with the file size. Kept.
- **Rename to `details_expand_settled`.** The reviewer called it optional.
- **Moving the settle wait into `history_panel_click_item_title(wait=True)`, and a stable `GCollapse` "shown" marker in galaxy-ui.** Both belong on dev as follow-ups. On a release branch they would have too wide an effect.

<details><summary>Full review</summary>

See [review_1_raw.md](review_1_raw.md).

</details>
