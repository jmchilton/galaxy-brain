#!/bin/sh
# Replay of faqs/galaxy/datasets_change_datatype.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=chdt-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "change datatype faq"
gxui upload-paste "chr1	10	20	r1	0	+" --ext txt --name reads.bed
gxui note "steps 1-4: pencil > Datatypes > Assign Datatype > New Type: bed (typing filters it) > Save"
gxui dataset-change-datatype 1 bed
gxui history-items
gxui screenshot change-datatype-saved
