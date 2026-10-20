#!/bin/sh
# Replay of faqs/galaxy/account_create.md against a logged-out gxui session on the
# `faq_server.sh accounts` Galaxy (activation on; mail lands in $FAQ_MAIL). Not unattended:
# steps 6/9 (read the email, open its link) happen outside the browser.
#   Part 1:  EMAIL=x@example.org sh account_create.gxui.sh      (register, see banner, resend)
#   Part 2:  EMAIL=x@example.org ACTIVATION_LINK='<from the mail>' sh account_create.gxui.sh
set -e
: "${EMAIL:?set EMAIL; part 2 must reuse the part 1 address}"
if [ -z "$ACTIVATION_LINK" ]; then
  gxui note "step 2: Login or Register in the masthead (26.2: separate Login and Register buttons)"
  gxui home
  gxui component masthead.login_masthead_button visible
  gxui component masthead.register_masthead_button visible
  gxui note "steps 3-5: Register here on the login page, fill the form, Create"
  gxui register "$EMAIL" --password faqpass123 --username "$(echo "$EMAIL" | cut -d@ -f1)"
  gxui screenshot account-create-unverified-banner
  gxui note "step 6: missing email -> Resend Verification in the banner"
  gxui call click_label "Resend Verification"
  echo "PART 1 DONE - not a pass yet: re-run with ACTIVATION_LINK for $EMAIL" >&2
  exit 2
fi
gxui note "step 9: open the email confirmation link"
gxui call navigate_to "$ACTIVATION_LINK"
gxui home
gxui component masthead.logged_in_only visible
gxui screenshot account-create-activated
