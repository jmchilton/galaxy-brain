#!/bin/sh
# Replay of faqs/galaxy/histories_undelete.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=und-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "undelete faq"
gxui history-new "other faq"
gxui histories-delete "undelete faq"
gxui note "Steps 1-4: Histories, Advanced search, tick Deleted, Restore on the history's card"
gxui histories-restore "undelete faq"
