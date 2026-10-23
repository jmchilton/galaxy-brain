#!/bin/sh
# Replay of faqs/galaxy/datasets_upload_from_genomeark.md against the `faq_server.sh main` Galaxy
# (its "Genome Ark" source is usegalaxy.org's anonymous S3 bucket, so this needs network),
# from `gxui start --headless`.
set -e
N=genomeark-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "genomeark faq"
gxui note "Upload (Activity Bar) > Choose Remote Files > Genome Ark > species > Genus_species > specimen > genomic_data > pacbio (several pages); tick > Add Selected Files (n) > Start"
gxui upload-remote "Genome Ark" m151218_064724_42161_c100952770310000001823221506251610_s1_p0.subreads.bam.bai --path species/Taeniopygia_guttata/bTaeGut1/genomic_data/pacbio
gxui history-items
