#!/bin/sh
# Replay of faqs/galaxy/datasets_moving_datasets_between_galaxy_servers.md against the
# `faq_server.sh main` Galaxy, from `gxui start --headless`. The one server plays both origin and
# destination (faq_server.sh allows fetching its own links).
set -e
N=move-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "origin"
gxui upload-paste "chr1	10	20" --ext bed --name a.bed
gxui note "Origin steps 1-2: expand the dataset, Copy Link"
L=$(gxui dataset-copy-link 1 | tail -1)
gxui history-new "destination"
gxui note "Step 3: Upload > Paste Links/URLs > Add URLs > Start; a new 26.2 user's data is private, so the fetch gets 403"
gxui upload-url "$L" --ext bed --name moved.bed || true
gxui dataset-peek 1
gxui note "Make the origin history accessible (Share & Manage Access), then the link imports"
gxui history-switch origin
gxui history-share
gxui dataset-permissions 1
gxui history-switch destination
gxui upload-url "$L" --ext bed --name moved.bed
gxui dataset-peek 2
