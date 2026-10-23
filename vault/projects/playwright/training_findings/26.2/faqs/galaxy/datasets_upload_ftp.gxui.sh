#!/bin/sh
# Replay of faqs/galaxy/datasets_upload_ftp.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`, after `eval "$(faq_server.sh env)"` (for FAQ_FTP and GXUI_GALAXY_ROOT).
set -e
N=ftp-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "ftp faq"
gxui note "Steps 2-4 (FTP client): the server has no FTP daemon; copying into the user's FTP directory stands in"
mkdir -p "$FAQ_FTP/$N@example.org"
cp "$GXUI_GALAXY_ROOT/test-data/1.bed" "$GXUI_GALAXY_ROOT/test-data/2.bed" "$FAQ_FTP/$N@example.org/"
gxui note "Steps 5-8: Upload > Choose Remote Files > FTP Directory > tick > Add Selected Files (n) > Start; there is no Choose FTP file"
gxui upload-remote "FTP Directory" 1.bed 2.bed
gxui history-items
gxui note "Step 1: Upload > Choose Remote Files > FTP Directory names the FTP server (ftp_upload_site)"
gxui call upload_context remote-files
gxui component 'upload_activity.remote_files_browser_label(label=FTP Directory)' click
gxui component upload_activity.remote_files_ftp_help text
