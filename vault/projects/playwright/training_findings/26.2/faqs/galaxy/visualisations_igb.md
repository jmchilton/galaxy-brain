# faqs/galaxy/visualisations_igb.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `6b42e205276`. Replay: `visualisations_igb.gxui.sh`.

- Correct: with a dbkey set, Charts icon (Visualize tab) lists **display in IGB** (**View**). Not used by tutorials.
- Galaxy: display links on the Visualize tab had no E2E; added `test_display_application_links`
  (red: no dbkey) and `dataset_display_applications`; gxui `dataset-display-apps HID`. The test
  datatypes config gives bed only UCSC, so the test asserts that.
