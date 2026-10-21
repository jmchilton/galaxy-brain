#!/bin/sh
# Replay of faqs/galaxy/collections_add_tag.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`.
set -e
N=coltag-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "collection tag faq"
gxui upload-paste "a" --ext txt --name a.txt
gxui upload-paste "b" --ext txt --name b.txt
gxui collection-build list 1,2 --name mylist
gxui note "steps 1-6: open the collection, pencil, Add Tags, #mytag, Save, tag shows under the name"
gxui collection-tag 5 "#mytag"
gxui screenshot collections-add-tag
