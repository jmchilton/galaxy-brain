#!/bin/sh
# Replay of faqs/galaxy/collections_rename.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=collrename-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "collection rename faq"
gxui upload-paste "a	1" --ext txt --name s1.txt
gxui upload-paste "b	2" --ext txt --name s2.txt
gxui collection-build list 1,2 --name samples
gxui note "steps: click the collection, click its name at the top, type the new name, Enter"
gxui collection-rename 5 "renamed samples"
gxui history-items
