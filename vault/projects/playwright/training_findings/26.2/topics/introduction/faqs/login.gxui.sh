#!/bin/sh
# Replay of topics/introduction/faqs/login.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=loginfaq-$$
gxui logout || true
gxui home
gxui note "logged out: the masthead shows separate Login and Register items, not a User section with Login/Register"
gxui component masthead.login_masthead_button text
gxui component masthead.register_masthead_button text
gxui component masthead.user absent
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "logged in: Login/Register are gone and the user icon menu appears"
gxui component masthead.login_masthead_button absent
gxui component masthead.user visible
