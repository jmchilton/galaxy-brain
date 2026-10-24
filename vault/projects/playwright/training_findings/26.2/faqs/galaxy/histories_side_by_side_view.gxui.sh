#!/bin/sh
# Replay of faqs/galaxy/histories_side_by_side_view.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=sbs-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "second faq"
gxui note "Option 1: History options > Show Histories Side-by-Side"
gxui history-multiview
