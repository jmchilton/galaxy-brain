#!/bin/sh
# Replay of faqs/galaxy/datasets_add_tag.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=addtag-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "add tag faq"
gxui upload-paste "chr1	10	20" --ext bed --name plus.bed
gxui note "steps 1-5: expand the dataset, Add Tags, type #plus, Enter; the tag shows under the name"
gxui dataset-tag 1 "#plus"
gxui note "name tags propagate: a tool run on the tagged dataset inherits #plus"
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
gxui call history_panel_item_get_tags 2
gxui screenshot add-tag-propagated
