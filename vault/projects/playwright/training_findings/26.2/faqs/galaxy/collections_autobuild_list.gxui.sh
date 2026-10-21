#!/bin/sh
# Replay of faqs/galaxy/collections_autobuild_list.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`.
set -e
N=autobuild-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "autobuild faq"
gxui upload-paste "a" --ext txt --name s1.txt
gxui upload-paste "b" --ext txt --name s2.txt
gxui note "steps: Select Items, tick both, All 2 selected > Auto Build List, name, Remove file extensions off, Build"
gxui collection-build list 1,2 --name samples --keep-extensions
gxui note "click the checkmark icon at the top of the history again: selection mode stays on after Build"
gxui component history_panel.multi_operations.show_button click
gxui note "originals are hidden, identifiers keep .txt"
gxui history-items
gxui collection-peek 5
