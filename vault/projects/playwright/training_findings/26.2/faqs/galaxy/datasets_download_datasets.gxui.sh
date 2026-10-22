#!/bin/sh
# Replay of faqs/galaxy/datasets_download_datasets.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=dl-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "download faq"
gxui upload-paste "line 1" --ext txt --name d1.txt
gxui note "click the dataset to expand it"
gxui dataset-peek 1
gxui note "the Download icon fetches the same URL Copy Link copies (no gxui verb saves the file)"
gxui dataset-copy-link 1
