#!/bin/sh
# Replay of faqs/galaxy/collections_build_list.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`.
set -e
N=buildlist-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "build list faq"
gxui upload-paste "a" --ext fasta --name sample1.fasta
gxui upload-paste "b" --ext fasta --name sample2.fasta
gxui note "steps: Select Items, tick both, All 2 selected > Advanced Build List, Flat List (preselected), Next"
gxui note "a single click on a name edits it; Remove file extensions is already on; name, Build"
gxui collection-build list 1,2 --advanced --rename sample1=first --name samples
gxui note "selection mode ends on Build; originals are hidden"
gxui collection-peek 5
