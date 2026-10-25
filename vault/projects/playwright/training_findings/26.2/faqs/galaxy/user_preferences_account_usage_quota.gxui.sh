#!/bin/sh
# Replay of faqs/galaxy/user_preferences_account_usage_quota.md against the `faq_server.sh main`
# Galaxy, from a gxui session started with `gxui start --headless`.
set -e
N=quota-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "hello world
" --name t
gxui history-wait 1
gxui note "masthead usage summary"
gxui disk-usage
gxui note "step 1: log out and back in (26.2: doesn't recalculate; the Storage Dashboard's Refresh does)"
gxui call logout
GXUI_PASSWORD=faqpass123 gxui login "$N@example.org"
gxui disk-usage --refresh
gxui note "note: exact usage is at the top of User Preferences, not the bottom"
gxui preferences
gxui screenshot preferences-usage-header
