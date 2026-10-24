#!/bin/sh
# Replay of faqs/galaxy/datatypes_tabular.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=tab-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "tabular faq"
gxui upload-paste "chr1	10	20	r1
chr1	30	40	r2" --ext tabular --name regions.tab
gxui note "Step 1.1: change the datatype - pencil > Datatypes (2nd tab, not 3rd) > New Type: interval > Save"
gxui dataset-change-datatype 1 interval
gxui note "Step 1.2: label columns - pencil > Attributes (1st tab) shows Chrom/Start/End/Strand/Name column selects for interval (a plain tabular has none)"
gxui dataset-rename 1 regions.tab
gxui screenshot tabular-interval-columns
gxui history-items
