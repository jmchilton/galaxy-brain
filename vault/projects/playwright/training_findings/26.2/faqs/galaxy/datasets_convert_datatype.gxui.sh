#!/bin/sh
# Replay of faqs/galaxy/datasets_convert_datatype.md (the "Convert to BAM" example) against the
# `faq_server.sh main` Galaxy, from `gxui start --headless`. Needs samtools from faq_server.sh's tool_deps.
set -e
N=convert-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "convert datatype faq"
gxui upload-file "$GXUI_GALAXY_ROOT/test-data/sam_with_header.sam" --ext sam
gxui note "steps 1-4: pencil > Datatypes > Convert to Datatype > Target datatype: bam > Create Dataset"
gxui dataset-convert 1 bam
gxui history-items
gxui screenshot convert-datatype-done
