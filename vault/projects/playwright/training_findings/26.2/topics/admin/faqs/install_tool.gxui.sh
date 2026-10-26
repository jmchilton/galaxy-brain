#!/bin/sh
# Replay of topics/admin/faqs/install_tool.md (query=bwa, name="Map with BWA-MEM", section=Mapping, as in the cvmfs
# and pulsar tutorials) against the `faq_server.sh main` Galaxy (faq-admin@example.org is an admin; needs network for
# the Tool Shed), from `gxui start --headless`.
set -e
gxui note "setup, not in the FAQ: log in as an admin and uninstall bwa if an earlier run left it installed"
gxui register faq-admin@example.org --password faqpass123 --username faq-admin || gxui login faq-admin@example.org --password faqpass123
gxui tool-uninstall bwa bwa devteam || true
gxui note "step 1: search the tools for bwa; Map with BWA-MEM isn't there yet"
gxui tool-search bwa
gxui note "steps 2-7: Admin (Activity Bar, not the top bar) > Tool Management > Install and Uninstall > search bwa > devteam's bwa > Install on the newest revision > Target Section Mapping > Ok"
gxui tool-install bwa bwa devteam --section Mapping
gxui note "check: the same search now lists Map with BWA-MEM, without a page reload"
gxui tool-search bwa
gxui note "cleanup, not in the FAQ"
gxui tool-uninstall bwa bwa devteam
