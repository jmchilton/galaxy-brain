#!/bin/sh
# Replay of faqs/galaxy/collections_convert_datatype.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=collconv-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "collection convert faq"
gxui upload-paste ">s1
ACGT" --ext fasta --name s1.fasta
gxui upload-paste ">s2
GGCC" --ext fasta --name s2.fasta
gxui collection-build list 1,2 --name samples
gxui note "steps: pencil on the collection, Convert tab, Converter Tool, Convert Collection"
gxui collection-convert 5 "Convert FASTA to Tabular"
gxui history-items
