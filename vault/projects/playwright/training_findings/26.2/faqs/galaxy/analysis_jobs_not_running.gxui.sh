#!/bin/sh
# Replay of faqs/galaxy/analysis_jobs_not_running.md against the `faq_server.sh accounts` Galaxy
# (activation on), from a logged-out gxui session. Reads the activation link from $FAQ_MAIL
# (`eval "$(./faq_server.sh env accounts)"`).
set -e
: "${FAQ_MAIL:?run eval \"\$(./faq_server.sh env accounts)\" first}"
N=jobs-faq-$$
gxui note "step 1: logged out, the masthead shows Login and Register (no User menu)"
gxui home
gxui component masthead.login_masthead_button visible
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "step 1: logged in, the masthead shows the username menu"
gxui component masthead.logged_in_only visible
gxui note "step 2: not activated - a banner, and an upload fails at once (nothing waits in a queue)"
gxui component inactivity_box._ visible
gxui history-new "jobs faq"
gxui upload-paste "a" --ext txt --name a 2>&1 | grep "Action requires account activation"
gxui screenshot jobs-not-running-inactive
gxui note "step 2: open the email's activation link; uploads and jobs work"
gxui call navigate_to "$(grep -o 'http[^" \\]*activate[^" \\]*' "$FAQ_MAIL" | head -1)"
gxui home
gxui upload-paste "a" --ext txt --name a
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
