#!/bin/sh
# Replay of topics/assembly/tutorials/vgp_genome_assembly/faqs/dataset_upload_fastqsanger_via_urls.md
# against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=fqurl-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "steps 1-3: Activity Bar Upload > Paste Links/URLs (not Upload Data / Paste/Fetch); paste; Add URLs"
gxui note "step 4: header Type (sets all rows) = fastqsanger.gz; Start"
gxui upload-url https://raw.githubusercontent.com/galaxyproject/galaxy/dev/test-data/1.fastqsanger.gz --ext fastqsanger.gz
gxui history-items
