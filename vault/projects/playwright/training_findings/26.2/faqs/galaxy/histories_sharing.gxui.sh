#!/bin/sh
# Replay of faqs/galaxy/histories_sharing.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=shr-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "1-2: History options > Share & Manage Access; Make History accessible, then publish"
gxui history-share --publish
