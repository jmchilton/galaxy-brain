# Library folder download Selenium test never runs

Source: FAQ review batch 4 (galaxy-intro-rdm download FAQ), vault commits c5d2a134 / 0d29b53b,
`vault/projects/playwright/training_findings/26.2/faqs/galaxy/datasets_download_datasets.md`.

`lib/galaxy_test/selenium/test_library_contents.py::download_dataset_from_library` lacks the
`test_` prefix, so pytest never collects it. Verified on origin/dev 0073b5e9224: it also targets
`#download-btn` (button is `id="download--btn"`) and expects `selected_dataset_files.zip`
(server names it `selected_library_files`).
