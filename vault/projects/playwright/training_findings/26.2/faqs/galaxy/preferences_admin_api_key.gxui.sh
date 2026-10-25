#!/bin/sh
# Replay of faqs/galaxy/preferences_admin_api_key.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=apikey-$$
gxui note "Step 2: register a new account"
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Step 3: username menu -> Preferences, then Manage Galaxy API Key"
gxui preferences
gxui component 'preferences.manage_api_key' click
gxui note "Step 4: Create a new key"
gxui component 'preferences.get_new_key' click
gxui note "Step 5: the key is shown, with a copy button"
gxui component 'preferences.api_key_input' visible
gxui component 'preferences.api_key_copy_button' visible
