# faqs/galaxy/workflows_share.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `c48fe3d7d5a`. Replay: `workflows_share.gxui.sh`.

- `workflows-share-save`: after entering the email (step 4) the user must click **Save**; the FAQ never says so,
  and without it nothing is shared. Step 2 also says "the workflow you would like to publish" (it's sharing).
- Step 5 fine: the workflow appears under **Workflows shared with me** with Import / Run in its preview.
- Galaxy tests: `test_workflow_sharing.py` covers sharing by email/id and the shared-with-me list.
- gxui: `workflow-share NAME EMAIL`.
