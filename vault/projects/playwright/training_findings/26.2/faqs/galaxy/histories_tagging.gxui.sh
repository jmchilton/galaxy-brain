#!/bin/sh
# Replay of faqs/galaxy/histories_tagging.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=tag-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Steps 1-3: Edit next to the history name, Add tags, type, Save"
gxui history-tag assembly yellowstone-park:2014
