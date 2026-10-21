#!/bin/sh
# Replay of faqs/galaxy/dataset_tool_errors_metadata.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=metadata-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "metadata faq"
gxui upload-paste "chr1	100	200	r1	0	+" --ext bed --name regions.bed
gxui note "pencil icon > Edit Attributes; metadata fields sit on the Attributes tab"
gxui call history_panel_item_edit 1
gxui note "Directly reset metadata: change a field and Save"
gxui component 'edit_dataset_attributes.metadata_input(name=comment_lines)' clear-send-keys 3
gxui component edit_dataset_attributes.save_button click
gxui component edit_dataset_attributes.alert text
gxui note "Autodetect metadata: the Attributes tab's Auto-detect (not the Datatypes tab's)"
gxui component edit_dataset_attributes.auto_detect_metadata_button click
gxui screenshot metadata-autodetect
gxui history-wait 1
gxui home
gxui call history_panel_item_edit 1
gxui component 'edit_dataset_attributes.metadata_input(name=comment_lines)' value
