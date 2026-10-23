# faqs/galaxy/datasets_upload_ftp.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `962cc494100` (`faq_server.sh main`). The server now sets
`ftp_upload_dir` and `ftp_upload_site` (`ftp.faq.example.org`), with no FTP daemon. Copying files
into `$FAQ_FTP/<email>` stands in for the FTP client (steps 2-4). Imported `1.bed` and `2.bed` through
Upload > Choose Remote Files > **FTP Directory**. No tutorial embeds it.

## GTN

- `ftp-choose-ftp-file` (main): there is no **Choose FTP file**. FTP files are the **FTP Directory**
  file source (26.1: under **Choose from repository**). Tick, **Add Selected Files**, **Start**.
- Step 1 ("look up the FTP settings") depends on the Galaxy fix below. Without it, 26.2 shows the FTP
  server's address nowhere.

## Galaxy

- Bug (26.2 regression), fixed (`962cc494100`) and queued (`remote_files_upload_ftp_help_missing`).
  - 26.1's remote files dialog (`FilesDialog`) told users at `gxftp://` which FTP server to log in to.
    26.2's Choose Remote Files (`RemoteFilesUpload.vue`) dropped that notice.
  - The notice is now its own component, `FtpUploadHelp.vue`, used by both.
  - Adds `upload_activity.remote_files_ftp_help` and `test_upload_ftp.py::test_ftp_directory_shows_upload_site`.
  - Green under Playwright and Selenium; the rest of `test_upload_ftp.py` is green under Playwright.
    FilesDialog's vitest (`#helper`) passes.
  - Not red-to-green as a test: the client was rebuilt with the fix first. The red is this run's
    pre-fix FTP Directory screenshot, which has no notice.
- Covered already: FTP import (`test_upload_simplest`, `test_upload_multiple`).
- `faq_server.sh`: `ftp_upload_dir`, `ftp_upload_site`; `env` exports `FAQ_FTP`.
- Replay: its `mkdir`/`cp` lines aren't gxui commands. They stand in for the FAQ's FTP client, which
  sits outside Galaxy.
