#!/bin/sh
# Replay of faqs/galaxy/datatypes_tabular.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=tab-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "tabular faq"
gxui upload-paste "r1	chr1	10	20
r2	chr1	30	40" --ext tabular --name regions.tab
gxui note "A plain tabular's Attributes tab (1st) has no column fields"
gxui dataset-attributes 1
gxui note "Step 1.1: change the datatype - pencil > Datatypes (2nd tab, not 3rd) > New Type: interval > Save"
gxui dataset-change-datatype 1 interval
gxui note "Step 1.2: label columns - pencil > Attributes (1st tab) now has Chrom/Start/End/Strand/Name column selects"
gxui dataset-attributes 1
gxui dataset-set-metadata 1 chromCol 2
gxui dataset-set-metadata 1 startCol 3
gxui dataset-set-metadata 1 endCol 4
gxui dataset-set-metadata 1 nameCol 1
gxui dataset-attributes 1
gxui screenshot tabular-interval-columns
