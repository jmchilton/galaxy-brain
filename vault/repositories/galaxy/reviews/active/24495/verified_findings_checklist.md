- [x] P2 1: `CompressedFile` still picks zip on bare `is_zipfile` and crashes on the PR's own fixture
- [x] P2 2: The new helper crashes on empty zips and sniffs directory entries; reuse `checkers.iter_zip`
- [x] P2 3: No API test for the upload regression the PR fixes
- [x] P3 1: A tar ending in a valid zip is still silently misclassified; the zip test has no leading-magic check

Other Actions:
