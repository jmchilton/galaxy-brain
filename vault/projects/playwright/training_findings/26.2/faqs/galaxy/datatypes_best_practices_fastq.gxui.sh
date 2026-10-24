#!/bin/sh
# Replay of faqs/galaxy/datatypes_best_practices_fastq.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`, after `eval "$(faq_server.sh env)"` (for GXUI_GALAXY_ROOT).
set -e
N=fastq-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "fastq best practices faq"
gxui note "Bullet 1: autodetect gives fastqsanger; gzipped fastq stays compressed as fastqsanger.gz (not converted)"
gxui upload-file "$GXUI_GALAXY_ROOT/test-data/1.fastqsanger" "$GXUI_GALAXY_ROOT/test-data/1.fastqsanger.gz"
gxui history-items
