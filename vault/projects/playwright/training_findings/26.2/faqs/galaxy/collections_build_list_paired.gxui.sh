#!/bin/sh
# Replay of faqs/galaxy/collections_build_list_paired.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=paired-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "paired faq"
gxui upload-paste "f" --ext txt --name sampleA_1.txt
gxui upload-paste "r" --ext txt --name sampleA_2.txt
gxui note "steps: Select Items, tick both, All 2 selected > Advanced Build List, List of Paired Datasets, Next, auto-pair _1/_2, Next, edit List Identifier (double-click), name, Build"
gxui collection-build list:paired 1,2 --name pairs --rename sampleA=sample_A
gxui note "click the checkmark icon at the top of the history again: selection mode stays on after Build"
gxui component history_panel.multi_operations.show_button click
gxui collection-peek 5
