# faqs/galaxy/datasets_add_tag.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `a9b34ac894c` (`faq_server.sh main`). Expanded a BED,
clicked **Add Tags** (tags icon), typed `#plus`, Enter: the tag showed under the name and survived a
page reload. `my tag` was rejected. Concatenate on the tagged dataset gave an output tagged `#plus`.
Snippeted by 71 tutorials.

## GTN

- Steps 1-5 hold. "Letters or numbers" undersells the tag syntax (`.`, `:`, `-`, emoji are fine) but
  "no spaces" is right; not filed.
- `histories_why_nametags.svg` is a diagram, not a screenshot.

## Galaxy

- Gap: no E2E added a tag to a single history item (only the history's own tags, collections via
  their panel view, and workflow/history lists). Backend propagation is API-tested
  (`test_tag_auto_propagation`). Added `test_item_name_tag_propagates_to_tool_output`
  (`a9b34ac894c`) with `history_panel_item_add_tags` and `content_item.tag_area_button` /
  `tag_area_input`, mirroring `history_panel.*`.
- gxui: `dataset-tag HID TAG...` (tip `abe4446f5bc`). `gxui component 'history_panel.content_item(suffix=[data-hid="1"])...'`
  fails: the path parser drops the quotes, giving an invalid selector.
