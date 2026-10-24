- `kind/bug` - missing tests are bugs (release-branch target).
- `area/testing/selenium` - two new E2E tests, helpers in `navigates_galaxy.py`, selectors in `navigation.yml`.

Bot would also add `area/testing` (`lib/galaxy_test/**`) and `area/UI-UX` (`client/src/**`); dropped both: the selenium subarea covers testing, and the client change is two `data-description` hooks plus test selectors.
