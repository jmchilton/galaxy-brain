#!/bin/sh
# Replay of faqs/galaxy/histories_export.md (and histories_download_histories.md) against the
# `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=exp-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "export faq"
gxui upload-paste "a b" --ext txt --name a.txt
gxui history-wait
gxui note "Steps 1-5: History options > Export History to File > Compressed TGZ > Temporary Direct Download > Export"
gxui history-export
gxui note "RO-Crate format"
gxui history-export --format rocrate.zip
