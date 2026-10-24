#!/bin/sh
# Replay of faqs/galaxy/datasets_icons.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`. Filter on a missing column makes the red dataset for the bug icon.
set -e
N=icons-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "icons faq"
TAB=$(printf '\t')
gxui upload-paste "chr1${TAB}1${TAB}100" --ext bed --name a.bed
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
gxui note "expand item 2; its buttons: View, Edit attributes, Delete, Download, Export to another Galaxy (26.2, not in the FAQ), Copy Link, Dataset Details, Visualize, Show Related Items, Run Job Again"
gxui dataset-peek 2
gxui snapshot history_panel --label icons
gxui note "eye"
gxui dataset-view 2
gxui note "link"
gxui dataset-copy-link 2
gxui note "info"
gxui dataset-details 2
gxui note "chart: external display links, then the visualization list (Editor among them)"
gxui call show_dataset_visualizations 2
gxui note "rerun"
gxui dataset-rerun 2
gxui note "dataset map: filter to related items (1 and 2, not 3); click again to clear"
gxui upload-paste "unrelated" --ext txt --name u.txt
gxui dataset-related 2
gxui dataset-related 2
gxui note "bug: only on red datasets"
gxui tool-open Filter1
gxui tool-fill '{"input": 1, "cond": "c9>1"}'
gxui tool-run
gxui dataset-error 4
