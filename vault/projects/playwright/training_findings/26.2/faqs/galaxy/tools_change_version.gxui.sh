#!/bin/sh
# Replay of faqs/galaxy/tools_change_version.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=version-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Open the tool: the form shows the latest version"
gxui tool-open multiple_versions
gxui note "Click the versions icon at the top right and pick 'Switch to 0.1'"
gxui tool-version 0.1
