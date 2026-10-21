#!/bin/sh
# Replay of faqs/galaxy/collections_change_datatype.md against the `faq_server.sh main` Galaxy
# (Celery on), from `gxui start --headless`.
set -e
N=colltype-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "collection datatype faq"
gxui upload-paste "a	1" --ext txt --name s1.txt
gxui upload-paste "b	2" --ext txt --name s2.txt
gxui collection-build list 1,2 --name samples
gxui note "steps: pencil on the collection, Datatypes tab, New Type tabular, Save"
gxui collection-change-datatype 5 tabular
gxui collection-peek 5
