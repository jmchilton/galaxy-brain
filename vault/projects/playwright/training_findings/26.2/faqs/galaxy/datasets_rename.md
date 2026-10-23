# faqs/galaxy/datasets_rename.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `7e323178dc0` (`faq_server.sh main`). A pasted `seq.fa`:
pencil > Edit Dataset Attributes > Attributes > **Name** `genomes.fa` > **Save** ("Attributes
updated."). Embedded in 102 tutorials.

## GTN

- No findings. The pencil, the central-panel form, **Name** and **Save** all match 26.2.

## Galaxy

- Covered: `test_dataset.py::test_history_dataset_rename`. No new tests.
- gxui: `dataset-rename HID NAME` (tip `7e323178dc0`).
