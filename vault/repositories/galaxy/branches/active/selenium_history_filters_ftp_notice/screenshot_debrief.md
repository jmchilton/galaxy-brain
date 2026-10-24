Screenshots successfully obtained.

Range `d83f7eaa13c..HEAD` (HEAD now `2c983d1b49a`; was `152f307c6d3` before the test fixup below). "Before" = client built at base `d83f7eaa13c` with HEAD's tests; "after" = client built at HEAD. Playwright headless, framework-managed server, `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set.

## Index (`screenshots/`)

| Before (base) | After (HEAD) | What it shows |
|---|---|---|
| `before_ftp_help.png` | `after_ftp_help.png` | Choose Remote Files > FTP Directory. Before: no notice. After: FtpUploadHelp alert naming `ftp://ftp.galaxyproject.com` + tutorial link. |
| `before_remote_files_long_name.png` | `after_remote_files_long_name.png` | Choose Remote Files > Posix, long unbroken file name. Before: name runs over the Details column (overlapping text). After: wraps inside Name. |
| `before_data_library_long_library_name.png` | `after_data_library_long_library_name.png` | Import from Data Library library list, long library name. Before: runs past Synopsis/Description and clips at the table edge. After: wraps inside Name. |
| (none) | `after_data_library_long_folder_name.png` | Library contents, long folder name wrapped inside Name. No before: base test fails at the library-list check first. |

## How they were taken

- After: `test_ftp_directory_shows_upload_site`, `test_long_remote_file_name_stays_in_its_column` (integration_selenium), `test_long_data_library_names_stay_in_their_column` (selenium) all passed at HEAD.
- Before: base client built in a temp worktree; its `static/dist` swapped into WORKING_DIRECTORY; same tests run with `GALAXY_TEST_SELENIUM_RETRIES=0`. Each failed as expected (FTP help selector not visible; file name 734px past Name; library name 1063px past Name). The before images are the framework's failure `last.png`, taken at the failing check, so they show the same view as the matching after shot.
- HEAD `static/dist` restored afterwards (FtpUploadHelp chunk present). Temp worktree removed.

## Test change

- Added `self.screenshot("upload_data_library_long_library_name_wrapped")` after the library-name column check in `test_long_data_library_names_stay_in_their_column`, so the library-list wrap has an after shot that matches the before. Folded into `Wrap long names in the data library browser too` with fixup + autosquash, which rewrote that commit to `2c983d1b49a`. Re-ran at HEAD and it passed.

## Not captured

- FilesDialog (the older Choose Remote Files modal) also uses FtpUploadHelp now. Its behaviour is unchanged and vitest covers it, so no shot was taken.
