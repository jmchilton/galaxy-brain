#!/bin/sh
# Replay of faqs/galaxy/datasets_import_via_link.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`. Covers the plain, format/genome and collection variants.
set -e
N=link-$$
B=https://raw.githubusercontent.com/galaxyproject/galaxy/dev/test-data
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "import via link faq"
gxui note "Upload > Paste Links/URLs (not Paste/Fetch Data); paste; Add URLs; set the row's Type and Reference (format/genome variants); Start - no Close"
gxui upload-url "$B/1.bed" --ext interval --dbkey mm9
gxui note "collection variants: switch 'Create a collection from these files' on, Collection Name, Collection Type List; Start makes it - no Build or Create list"
gxui upload-url "$B/1.bed" "$B/2.bed" --ext bed --collection raw_files
gxui note "Collection Type List of Pairs pairs the URLs in order (forward, reverse); no single Paired type and no Swap"
gxui upload-url "$B/1.bed" "$B/2.bed" --collection fastq_raw --collection-type list:paired
gxui history-items
gxui collection-peek 5
