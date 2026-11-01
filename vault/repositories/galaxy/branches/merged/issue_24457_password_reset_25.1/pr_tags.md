- kind/bug
- area/auth
- area/UI-UX
- area/testing/selenium

Authentication and its visible login state are central to the fix; Selenium coverage proves both user flows. Checked `doc/source/project/issues.rst` and `.github/labeler.yml` on `release_25.1`. The bot also matches the broader `area/testing` and `area/testing/integration` paths; those add no useful scope here. Its `area/auth` paths cover backend auth modules, so the authentication label needs explicit application for these client changes.
