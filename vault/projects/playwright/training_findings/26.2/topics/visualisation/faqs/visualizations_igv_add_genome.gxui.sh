#!/bin/sh
# Replay of topics/visualisation/faqs/visualizations_igv_add_genome.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`; needs GXUI_GALAXY_ROOT. IGV desktop steps are outside Galaxy.
set -e
N=igvg-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "step 1: upload a FASTA genome and a GFF3 annotation"
gxui upload-file "$GXUI_GALAXY_ROOT"/test-data/phiX.fasta --ext fasta
gxui upload-file "$GXUI_GALAXY_ROOT"/test-data/5.gff3 --ext gff3
gxui note "steps 4-5: FASTA 'display with IGV' > local (26.2: on the Visualize tab, not the expanded dataset)"
gxui dataset-display-apps 1 | grep "display with IGV: local"
gxui note "steps 7-8: GFF3 'display with IGV' > local"
gxui dataset-display-apps 2 | grep "display with IGV: local"
