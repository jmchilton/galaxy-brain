#!/bin/sh
# Replay of faqs/galaxy/analysis_add_custom_build.md against a logged-in gxui session on the
# `faq_server.sh main` Galaxy. Needs the custom_builds components (galaxy_ui_driver 2782db29ee2 and up).
set -e
gxui note "step 1: a history holding the reference fasta"
gxui history-new "custom build faq"
gxui upload-paste '>chr1
ACGT
>chr2
AC' --ext fasta --name reference.fasta
gxui note "step 3: User -> Preferences -> Manage Custom Builds (26.2: the username menu)"
gxui preferences
gxui component "preferences.card(id=edit-preferences-custom-builds)" click
gxui note "steps 4-5: Name, and Database (dbkey) - labelled Key in 26.2"
gxui component custom_builds.name send-keys "FAQ Build"
gxui component custom_builds.key send-keys faq_build
gxui note "steps 6-7: Definition defaults to FASTA-file from history; the fasta is preselected"
gxui component custom_builds.definition value
gxui component custom_builds.fasta_file value
gxui note "step 8: Save; the build is listed once its converter jobs finish, after a reload"
gxui component custom_builds.save click
gxui history-wait
gxui preferences
gxui component "preferences.card(id=edit-preferences-custom-builds)" click
gxui component "custom_builds.row_count(name=FAQ Build)" text
gxui screenshot analysis-add-custom-build
