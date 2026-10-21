#!/bin/sh
# Replay of faqs/galaxy/cite-tools-used-in-a-history.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`. MAF to BED declares a citation (stock Sort doesn't, so it wouldn't be listed).
set -e
N=cite-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "cite faq"
gxui upload-file "$GXUI_GALAXY_ROOT/test-data/3.maf" --ext maf
gxui tool-open MAF_To_BED1
gxui tool-fill '{"input1": 1, "species": ["hg17"]}'
gxui tool-run
gxui history-wait 2
gxui note "steps 1-3: History options > Export Tool References; References (APA) tab, Galaxy's own first"
gxui history-references
gxui note "step 3: the BibTeX tab"
gxui history-references --bibtex
gxui screenshot tool-references-bibtex
