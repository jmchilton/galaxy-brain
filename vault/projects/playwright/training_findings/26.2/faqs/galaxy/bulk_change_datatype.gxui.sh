#!/bin/sh
# Replay of faqs/galaxy/bulk_change_datatype.md against the `faq_server.sh main` Galaxy (which runs
# Celery; without it the Selection menu has no Change data type), from `gxui start --headless`.
set -e
N=bulkdt-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "bulk datatype faq"
gxui upload-paste "a b c" --ext txt --name one
gxui upload-paste "d e f" --ext txt --name two
gxui note "steps 1-5: Select Items, tick both, All 2 selected > Change data type, pick tabular, Ok"
gxui history-change-datatype tabular 1 2
gxui history-items
gxui screenshot bulk-change-datatype
