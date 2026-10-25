#!/bin/sh
# Replay of faqs/galaxy/user_preferences_manage_information.md against the `faq_server.sh accounts`
# Galaxy (activation on), from a logged-out gxui session. Reads the activation link from $FAQ_MAIL
# (`eval "$(./faq_server.sh env accounts)"`).
set -e
: "${FAQ_MAIL:?run eval \"\$(./faq_server.sh env accounts)\" first}"
N=info-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "steps 2-3: username menu > Preferences > Manage Information"
gxui user-info
gxui note "steps 4, 6: change email and public name, Save"
gxui user-info --email "$N-new@example.org" --username "$N-new"
gxui note "step 7: the account is inactive until the new address's activation link is opened"
gxui component inactivity_box._ visible
gxui call navigate_to "$(grep -o 'http[^" <\\]*activate[^" <\\]*' "$FAQ_MAIL" | tail -1 | sed 's/&amp;/\&/g')"
gxui home
gxui component inactivity_box._ absent
gxui note "step 5: Change Password is its own Preferences card, not on the Manage Information form"
gxui preferences | grep "Change Password"
gxui note "step 8: log in with the new credentials"
gxui logout
GXUI_PASSWORD=faqpass123 gxui login "$N-new@example.org"
