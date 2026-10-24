#!/bin/sh
# Replay of faqs/galaxy/datasets_import_from_remote_files.md against the `faq_server.sh main` Galaxy
# (its "Galaxy test data" file source stands in for a usegalaxy.* repository), from `gxui start --headless`.
set -e
N=remote-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "remote files faq"
gxui note "Upload (Activity Bar) > Choose Remote Files > pick the source (search file sources) > search files and folders > tick > Add Selected Files (n) > Start; no OK or Close"
gxui upload-remote "Galaxy test data" 1.bed 2.bed
gxui history-items
