#!/bin/sh
# Replay of faqs/galaxy/user_preferences_forgot_password.md against the `faq_server.sh accounts`
# Galaxy, from a logged-out gxui session. Reads the reset link from $FAQ_MAIL
# (`eval "$(./faq_server.sh env accounts)"`).
set -e
: "${FAQ_MAIL:?run eval \"\$(./faq_server.sh env accounts)\" first}"
N=forgot-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui logout
gxui note "step 2: Login or Register (26.2: a separate Login button)"
gxui home
gxui component masthead.login_masthead_button visible
gxui note "steps 3-5: email on the login form, 'Forgot password? Click here to reset your password.', submit"
gxui password-reset "$N@example.org"
gxui note "steps 5-6: open the emailed link, enter (and confirm) the new password, Save new password"
gxui password-reset "$N@example.org" --link "$(grep -o 'http[^" \\]*token=[0-9a-f]*' "$FAQ_MAIL" | tail -1)" --password newpass456
gxui note "saving logs you in; log out and back in with the new password"
gxui component masthead.logged_in_only visible
gxui logout
GXUI_PASSWORD=newpass456 gxui login "$N@example.org"
