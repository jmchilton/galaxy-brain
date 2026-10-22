#!/bin/sh
# Replay of faqs/galaxy/datasets_data_privacy_features.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=priv-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "privacy faq"
gxui upload-paste "secret" --ext txt --name secret.txt
gxui note "1: pencil > Permissions tab; on 26.2 a new user's dataset already has access = their private role"
gxui dataset-permissions 1
gxui note "2: History options (menu icon) > Share & Manage Access > Make Private tab > Make History Private"
gxui history-make-private
gxui note "3: user menu > Preferences > Set Dataset Permissions for New Histories > Make new datasets private switch"
gxui preferences-new-datasets-private --off
gxui preferences-new-datasets-private
