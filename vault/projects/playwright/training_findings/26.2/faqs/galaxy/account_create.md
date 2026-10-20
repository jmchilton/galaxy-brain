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

- Coverage was missing, now added (`4d391ac7e36`, below gxui). `test_registration.py` covered only
  Login → Register here → Create. New: `test_registration_from_masthead` (via
  `register(via_masthead=True)`) and `test/integration_selenium/test_user_activation.py`
  (`user_activation_on` + `mock_emails_to_path://`: register, banner, Resend Verification,
  activation link, banner gone). Green under Playwright; Selenium not run (no chromedriver here).
  Gotcha: activation also turns on a DNS check of the email domain, so the default `@test.test`
  random email can't register.
- `navigation.yml` had no component for the inactivity banner; added `inactivity_box`
  (`_`, `resend_verification`). The run used `gxui call click_label "Resend Verification"`.
- `/user/resend_verification` and `/user/activate` render bare legacy message pages (no
  masthead); only a "Return to the home page" / "Go to login page." link. Works, looks dated.
- gxui: `gxui methods regist` summarised `register` as "Register a virtual subclass of an ABC"
  (`inspect.getdoc` inheriting `ABC.register`'s doc). Fixed: docstring on
  `NavigatesGalaxy.register` (`c31fcb13a8e`, below gxui).
- gxui: no way to read the activation email, so the replay can't finish on its own (see the
  script). A `gxui mail-last [--to EMAIL] [--link PATTERN]` reading Galaxy's
  `mock_emails_to_path://` output would make account FAQs fully replayable.

## Replay

`account_create.gxui.sh` (two parts, not unattended): re-run against a fresh logged-out session with a new email
(`faq-replay1@example.org`): pass, with the activation link pasted in by hand. "Fresh history"
from the process doc doesn't apply to account FAQs; a fresh logged-out session did.
