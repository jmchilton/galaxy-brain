# Screenshot debrief

Screenshots were captured successfully.

The branch only adds tests and changes no UI. The new test, `test/integration_selenium/test_user_activation.py`, already took three screenshots, so I recorded those. Recorded at head `7857f4ca51e` with the Playwright backend, headless; 1 test passed. The images are in `screenshots/`, which is gitignored.

| File | Shows |
|---|---|
| `screenshots/user_activation_inactive.png` | Home page after registering from the masthead. The orange inactivity banner ("Your account has not been activated yet...") ends with the **Resend Verification** link. The masthead shows the new user. |
| `screenshots/user_activation_resent.png` | Green success message: "This account has not been activated yet. The activation link has been sent again..." with the test email and a "Return to the home page" link. |
| `screenshots/user_activation_activated.png` | Green success message: "Your account has been successfully activated!" with a "Go to login page." link. |

## Not captured

- **Masthead Register form (`test_registration_from_masthead`):** this test takes no screenshot. Adding one would mean editing the test. The branch doesn't change the registration UI, and the sibling registration tests don't take screenshots either, so I didn't add one.

## Problems

None.
