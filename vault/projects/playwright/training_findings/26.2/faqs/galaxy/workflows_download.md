# faqs/galaxy/workflows_download.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_download.gxui.sh`.

- No GTN problems: the card's Download button gives the .ga file.
- Galaxy: `test_download` only clicked (TODO); now asserts the href is the workflow's `.ga` download and its name. Added `workflow_card_download_href`; gxui `workflow-download`.
