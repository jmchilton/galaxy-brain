#!/bin/sh
# Replay of faqs/galaxy/histories_archive.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=arc-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "archive faq"
gxui upload-paste "a" --ext txt --name a.txt
gxui history-wait
gxui note "Steps 1-3: History options > Archive History > Archive history"
gxui history-archive
gxui note "Finding it again: Histories (Activity Bar) > Archived Histories, not Data > Histories"
gxui histories-archived
