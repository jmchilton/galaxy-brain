#!/bin/sh
# Replay of faqs/galaxy/datasets_change_dbkey.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=chdb-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "change dbkey faq"
gxui upload-paste "chr1	10	20" --ext bed --name regions.bed
gxui note "steps 1-5: expand the dataset, click the ? database link, pick hg19 in Database/Build, Save"
gxui dataset-change-dbkey 1 hg19
gxui screenshot change-dbkey-saved
