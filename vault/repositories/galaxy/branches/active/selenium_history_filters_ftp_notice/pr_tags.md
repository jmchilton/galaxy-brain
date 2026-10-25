- `kind/bug` - missing FTP notice and long-name overflow in Upload Activity.
- `area/upload` - both fixes are in Upload Activity's remote files and data library browsers.
- `area/UI-UX` - restored alert and CSS wrap rule.
- `area/testing/selenium` - history panel and remote-files helpers, six E2E tests.

Bot would also add `area/testing` (`lib/galaxy_test/**`); dropped, the selenium subarea covers it. Skipped `area/libraries`: only the upload browser's library list is touched, not libraries themselves.
