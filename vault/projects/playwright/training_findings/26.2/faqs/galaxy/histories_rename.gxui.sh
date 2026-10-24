#!/bin/sh
# Replay of faqs/galaxy/histories_rename.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=ren-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Steps 1-3: pencil next to the history name, type the new name, Save"
gxui history-rename "renamed faq"
gxui url
