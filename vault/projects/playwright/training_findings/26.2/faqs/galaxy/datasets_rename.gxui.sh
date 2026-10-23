#!/bin/sh
# Replay of faqs/galaxy/datasets_rename.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=rename-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "rename faq"
gxui upload-paste ">a
ACGT" --ext fasta --name "seq.fa"
gxui note "pencil > Edit Dataset Attributes > Attributes: Name genomes.fa > Save"
gxui dataset-rename 1 genomes.fa
gxui history-items
