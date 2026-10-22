#!/bin/sh
# Replay of faqs/galaxy/datasets_detect_datatype.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=detect-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "detect datatype faq"
gxui upload-paste ">seq1
ACGTACGT" --ext txt --name seq.txt
gxui history-items
gxui note "steps 1-3: pencil > Datatypes > Auto-detect"
gxui dataset-detect-datatype 1
gxui history-items
