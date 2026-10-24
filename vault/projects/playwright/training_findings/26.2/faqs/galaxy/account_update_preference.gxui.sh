#!/bin/sh
# Replay of faqs/galaxy/account_update_preference.md against a logged-in gxui session on the
# `faq_server.sh main` Galaxy. Which cards show depends on the server's config; these are the
# stock-config cards.
set -e
gxui note "step 2: User -> Preferences (26.2: the username menu in the masthead)"
gxui home
gxui component masthead.user click
gxui component masthead.preferences click
gxui note "step 3: the preference cards (prints id and title of each)"
gxui preferences
for card in edit-preferences-information edit-preferences-password edit-preferences-permissions \
    edit-preferences-api-key edit-preferences-credentials edit-preferences-notifications \
    edit-preferences-custom-builds edit-preferences-make-data-private delete-account edit-preferences-sign-out; do
  gxui component "preferences.card(id=$card)" visible
done
gxui screenshot account-update-preference-cards
