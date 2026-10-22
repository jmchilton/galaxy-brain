#!/bin/sh
# Replay of faqs/galaxy/datasets_create_new_file.md (the "specific file" example plus a genome)
# against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=newfile-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "create new file faq"
gxui note "26.2: Upload (Activity Bar) > Paste File Content; name, Type, Reference and Spaces->Tabs are row columns; Start"
gxui upload-paste "gene start end
ORF1ab 266 21555" --name "SARS-CoV-2 feature mapping" --ext tabular --dbkey hg19 --space-to-tab
gxui history-items
gxui dataset-peek 1
gxui screenshot create-new-file-uploaded
