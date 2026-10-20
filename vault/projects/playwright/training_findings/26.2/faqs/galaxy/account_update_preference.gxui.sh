#!/bin/sh
# Replay of faqs/galaxy/account_update_preference.md against a logged-in gxui session on the
# `faq_server.sh main` Galaxy. Cards with no navigation.yml entry (dataset permissions, tools
# credentials, notifications, make data private) are checked by screenshot only.
set -e
gxui note "step 2: User -> Preferences (26.2: the username menu in the masthead)"
gxui home
gxui component masthead.user click
gxui component masthead.preferences click
gxui note "step 3: the preference cards"
gxui component preferences.manage_information visible
gxui component preferences.change_password visible
gxui component preferences.manage_api_key visible
gxui component preferences.custom_builds visible
gxui component preferences.delete_account visible
gxui component preferences.sign_out visible
gxui screenshot account-update-preference-cards
