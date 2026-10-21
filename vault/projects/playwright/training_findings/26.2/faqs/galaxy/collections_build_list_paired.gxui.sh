#!/bin/sh
# Replay of faqs/galaxy/collections_build_list_paired.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=paired-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "paired faq"
gxui upload-paste "f" --ext txt --name sampleA_1.txt
gxui upload-paste "r" --ext txt --name sampleA_2.txt
gxui note "steps: Select Items, tick both, All 2 selected > Advanced Build List, List of Paired Datasets, Next, auto-pair _1/_2, Next, name, Build"
gxui note "List Identifier edit (double-click the cell) is skipped; the run kept the guessed sampleA"
gxui collection-build list:paired 1,2 --name pairs
gxui collection-peek 5
