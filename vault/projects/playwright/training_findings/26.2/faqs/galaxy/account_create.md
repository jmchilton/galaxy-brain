# faqs/galaxy/account_create.md — 26.2, UI run

GTN `45d4932d33`; Galaxy 26.2rc1, `galaxy_ui_driver` `6c1b6093964` (fix below at `f1190a3fca2`),
local server with `user_activation_on` and a debug SMTP sink. Every step works; one is outdated.

## GTN

- **Step 2 "Login or Register"** no longer exists. 26.2's masthead has separate **Login** and
  **Register** buttons (screenshot `faq-account-create-masthead.png`). **Register** opens the form
  directly (`/register/start`), so steps 2-3 collapse to "Click **Register** in the masthead". The
  `login_register.png` screenshot is stale. The Login → "Register here." path still works.
- Steps are numbered 1, 2, 3, 5, 6, 9 (the markdown renders them 1-6, but the source is confusing
  to edit).
- Step 6 could name the banner's **Resend Verification** link (verified: it resends and the new
  link activates) before sending people to change their email.
- Typos: "Fill in the the registration form", "confimation".

Verified as written: "Register here." link, **Create** button, the unverified-email banner,
activation email, activation link → "Your account has been successfully activated!", banner gone.

## Galaxy

- Coverage: `test_registration.py` covers Login → Register here → Create. Not covered by E2E:
  the masthead **Register** button (`masthead.register_masthead_button` exists in
  `navigation.yml`, no test uses it) and the whole activation flow (banner, Resend Verification,
  activation link; only API-level `test/integration/test_users.py`). Proposed: one
  `test_registration_from_masthead` in `test_registration.py`, and an integration-selenium test
  with `user_activation_on` + `smtp_server: mock_emails_to_path://...` that registers, sees the
  banner, resends, activates and sees the banner go. Not implemented this run.
- `navigation.yml` has no component for the inactivity banner or its Resend Verification link
  (`App.vue`); the run used `gxui call click_label "Resend Verification"`.
- `/user/resend_verification` and `/user/activate` render bare legacy message pages (no
  masthead); only a "Return to the home page" / "Go to login page." link. Works, looks dated.
- gxui: `gxui methods regist` summarised `register` as "Register a virtual subclass of an ABC"
  (`inspect.getdoc` inheriting `ABC.register`'s doc). Fixed: docstring on
  `NavigatesGalaxy.register` (`c31fcb13a8e`, below gxui).
- gxui: no way to read the activation email, so the replay can't finish on its own (see the
  script). A `gxui mail-last [--to EMAIL] [--link PATTERN]` reading Galaxy's
  `mock_emails_to_path://` output would make account FAQs fully replayable.

## Replay

`account_create.gxui.sh`: re-run against a fresh logged-out session with a new email
(`faq-replay1@example.org`): pass, with the activation link pasted in by hand. "Fresh history"
from the process doc doesn't apply to account FAQs; a fresh logged-out session did.
