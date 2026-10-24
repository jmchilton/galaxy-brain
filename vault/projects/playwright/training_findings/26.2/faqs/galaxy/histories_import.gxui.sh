#!/bin/sh
# Replay of faqs/galaxy/histories_import.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=imp-$$
gxui register "$N-a@example.org" --password faqpass123 --username "$N-a"
gxui history-new "shared faq"
gxui upload-paste "a b" --ext txt --name a.txt
gxui history-wait
LINK=$(gxui history-share | sed 's/^[^:]*: //')
gxui logout
gxui register "$N-b@example.org" --password faqpass123 --username "$N-b"
gxui note "Steps 1-4: open the link, Import this history (top right), enter a title, Copy History"
gxui history-import "$LINK" --name "imported faq"
gxui history-items
