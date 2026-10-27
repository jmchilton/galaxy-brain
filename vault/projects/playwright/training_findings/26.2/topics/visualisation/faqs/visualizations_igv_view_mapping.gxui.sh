#!/bin/sh
# Replay of topics/visualisation/faqs/visualizations_igv_view_mapping.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`; needs GXUI_GALAXY_ROOT. IGV desktop steps are outside Galaxy.
set -e
N=igvm-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-file "$GXUI_GALAXY_ROOT"/test-data/1.bam --ext bam
gxui note "steps 4-5: BAM 'display with IGV' > local (26.2: on the Visualize tab, not the expanded dataset)"
gxui dataset-display-apps 1 | grep "display with IGV: local"
