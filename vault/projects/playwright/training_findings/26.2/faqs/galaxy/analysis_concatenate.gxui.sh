#!/bin/sh
# Replay of faqs/galaxy/analysis_concatenate.md (tool 1, cat1) against a logged-in gxui session on
# the `faq_server.sh main` Galaxy. Tool 2 (tp_cat) isn't on a stock server.
set -e
gxui note "setup: two lists of two and a single dataset"
gxui history-new "concatenate faq"
gxui upload-paste "a1" --ext txt --name a1
gxui upload-paste "a2" --ext txt --name a2
gxui upload-paste "b1" --ext txt --name b1
gxui upload-paste "b2" --ext txt --name b2
gxui upload-paste "single" --ext txt --name single
gxui collection-build list 1,2 --name A
gxui collection-build list 3,4 --name B
gxui note "Concatenate multiple datasets or collections: collections in different parameters pair up; a single dataset is recycled"
gxui tool-open cat1
gxui tool-fill '{"input1": 8, "queries_0|input2": 11, "queries_1|input2": 5}'
gxui screenshot analysis-concatenate-form
gxui tool-run
gxui history-wait 12
gxui note "expect hid 12: a list of 2 (a<n> + b<n> + single), not one dataset; a1 holds a1, b1, single"
gxui history-items
gxui collection-peek 12
gxui collection-peek 12 a1
