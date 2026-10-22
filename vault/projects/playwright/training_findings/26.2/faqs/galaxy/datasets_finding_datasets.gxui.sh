#!/bin/sh
# Replay of faqs/galaxy/datasets_finding_datasets.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=find-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "first history"
gxui upload-paste "one" --ext txt --name first.txt
gxui history-new "second history"
gxui upload-paste "two" --ext txt --name second.txt
gxui note "not User > Datasets: the Activity Bar's Datasets lists every history's datasets"
gxui datasets-list
gxui datasets-list --search first
