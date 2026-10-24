#!/bin/sh
# Replay of faqs/galaxy/histories_switch.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=sw-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "first faq"
gxui history-new "second faq"
gxui note "Click Switch to history at the top of the history panel, pick a history in the modal"
gxui history-switch "first faq"
