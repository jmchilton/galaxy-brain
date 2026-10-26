# History item button assertions are a stub; info_button selector stale

Source: FAQ review batch 4, vault commit 0d29b53b,
`vault/projects/playwright/training_findings/26.2/faqs/galaxy/datasets_download_datasets.md`.

`content_item.info_button` is `.params-btn`; the button is `.info-btn`. Unnoticed because
`test_history_dataset_state._assert_buttons` is a stub that returns. Verified on origin/dev 0073b5e9224.
