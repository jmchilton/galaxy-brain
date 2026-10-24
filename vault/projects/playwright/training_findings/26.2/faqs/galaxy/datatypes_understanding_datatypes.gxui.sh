#!/bin/sh
# Replay of faqs/galaxy/datatypes_understanding_datatypes.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=udt-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Tip step 1: create a new empty history"
gxui history-new "understanding datatypes faq"
gxui note "Tip step 2: click a tool (Sort)"
gxui tool-open sort1
gxui note "Tip step 3: the form lists the input's datatypes only after clicking 'accepted formats' under it"
gxui tool-accepted-formats input
gxui screenshot understanding-datatypes-accepted-formats
