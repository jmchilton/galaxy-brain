#!/bin/sh
# Replay of faqs/galaxy/histories_find_purge.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=purge-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "purge faq 1"
gxui history-new "purge faq 2"
gxui note "Steps 2-8: Histories (Activity Bar), Select all, Purge (N), confirm Purge histories"
gxui histories-purge-all
