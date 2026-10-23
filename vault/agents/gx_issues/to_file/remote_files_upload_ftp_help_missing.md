# 26.2 Import Data > Choose Remote Files no longer tells FTP users where to upload

Found by the FAQ loop (`faqs/galaxy/datasets_upload_ftp.md`, 26.2). Fix on `jmchilton/galaxy_ui_driver` (`bcaec710b18`, "Show the FTP upload notice in Choose Remote Files again"); target `release_26.2`. `origin/dev` is affected too (2026-10-23: no FTP notice in `RemoteFilesUpload.vue`).

## Symptom

On a server with `ftp_upload_dir` and `ftp_upload_site` set, open Upload > **Choose Remote Files** > **FTP Directory**. The user's FTP files are listed, but nothing says which FTP server to upload to or which credentials to use.

26.1's upload dialog opened `FilesDialog` (button "Choose from repository"). When the dialog was at `gxftp://`, it showed an info alert:

> This Galaxy server allows you to upload files via FTP. To upload some files, log in to the FTP server at **<ftp_upload_site>** using your Galaxy credentials. For help visit the tutorial. (+ a note for OIDC users without a Galaxy password)

26.2's Import Data panel browses remote files with `client/src/components/Panels/Upload/methods/RemoteFilesUpload.vue`, which does not use `FilesDialog` and never got that alert. `ftp_upload_site` is now shown nowhere in the upload UI. `FilesDialog` (and its alert) is still used by other pickers.

GTN's FTP FAQ step 1 says "Check that your Galaxy supports FTP upload and look up the FTP settings". On 26.1 that was this alert; on 26.2 users have nothing to look up.

## Fix

- Move the alert from `FilesDialog.vue` into `client/src/components/FilesDialog/FtpUploadHelp.vue` (reads `useConfig()` itself; `data-description="ftp upload help"`).
- `FilesDialog.vue` renders `<FtpUploadHelp v-if="showFTPHelper" id="helper" />` (its vitest `#helper` checks unchanged); drops its own `useConfig`/`GAlert`.
- `RemoteFilesUpload.vue` renders `<FtpUploadHelp v-if="currentFileSourceUri === 'gxftp://'" />` under the search bar.

## Test

`test/integration_selenium/test_upload_ftp.py::test_ftp_directory_shows_upload_site`: opens FTP Directory in Choose Remote Files and asserts the alert names the configured `ftp_upload_site`. Green under Playwright and Selenium. Not run red: the client was rebuilt with the fix first; the red is the FAQ run's pre-fix FTP Directory screenshot, which has no notice. Nav: `upload_activity.remote_files_ftp_help`.
