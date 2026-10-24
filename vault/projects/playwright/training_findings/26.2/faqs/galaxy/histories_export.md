# faqs/galaxy/histories_export.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `8408408ab05`. No tutorial embeds it. Replay: `histories_export.gxui.sh`.

No findings. The wizard's three steps, **RO-Crate** and **Compressed TGZ**, and **Temporary Direct
Download** (24 hours) all match. Zenodo and repositories show only when the server configures them.

Galaxy: covered by `test_history_native_export_to_file` and `test_history_rocrate_export_to_file`.
gxui: `history-export [--format tar.gz|rocrate.zip]` (needed a docstring on
`click_history_option_export_to_file`).
