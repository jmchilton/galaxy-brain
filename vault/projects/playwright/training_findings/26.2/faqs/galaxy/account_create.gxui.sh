#!/bin/sh
# Replay of faqs/galaxy/account_create.md against a logged-out gxui session on a Galaxy with
# user_activation_on and a reachable SMTP server. Steps 6/9 (read the email, open its link) happen
# outside the browser: set ACTIVATION_LINK from the received mail before the last block.
set -e
EMAIL=${EMAIL:-faq-learner-$(date +%s)@example.org}
gxui note "step 2: Login or Register in the masthead (26.2: separate Login and Register buttons)"
gxui home
gxui component masthead.login_masthead_button visible
gxui component masthead.register_masthead_button visible
gxui note "steps 3-5: Register here on the login page, fill the form, Create"
gxui register "$EMAIL" --password faqpass123 --username "$(echo "$EMAIL" | cut -d@ -f1)"
gxui screenshot account-create-unverified-banner
gxui note "step 6: missing email -> Resend Verification in the banner"
gxui call click_label "Resend Verification"
gxui note "step 9: open the email confirmation link"
test -n "$ACTIVATION_LINK" || { echo "set ACTIVATION_LINK from the activation email and re-run the rest"; exit 0; }
gxui call navigate_to "$ACTIVATION_LINK"
gxui home
gxui screenshot account-create-activated
