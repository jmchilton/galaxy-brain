#!/bin/sh
# Replay of faqs/galaxy/datasets_download_using_command_line.md against the `faq_server.sh main`
# Galaxy, from `gxui start --headless`. The wget/curl steps run outside the browser.
set -e
N=cli-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "command line faq"
gxui upload-paste "line 1" --ext txt --name d1.txt
gxui note "step 2: click the dataset name, then the Copy Link icon"
gxui dataset-copy-link 1
gxui note "26.2: the link 302s to /display, so curl needs -L; new users' data is private, so send -H 'x-api-key: KEY'"
gxui dataset-permissions 1
