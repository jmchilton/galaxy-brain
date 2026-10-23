# faqs/galaxy/datasets_moving_datasets_between_galaxy_servers.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `5d410abf9b8` (`faq_server.sh main`). The one server
plays both ends: a new user's Copy Link pasted into Paste Links/URLs in another history. No
tutorial embeds it.

## GTN

- `moving-link-private` (version): 26.2 makes new users' data private, so the copied link gives
  `403 Forbidden` and the destination's upload goes red ("Failed to fetch url: 403 Client Error").
  After **Make History accessible** (Share & Manage Access) the same link imports. Same cause as
  `cli-download-private`. 26.2's **Export to another Galaxy** button (`icons-export-another-galaxy`)
  is the direct route now.
- Step 3's **Upload data > Paste / Fetch Data** and "genome assembly" are 26.2's Upload >
  **Paste Links/URLs** > **Add URLs**, with **Reference** in the row (`upload-import-data-panel`,
  `link-add-urls`).

## Galaxy

- Covered: Copy Link (`1c8ea1d9a31`) and link uploads (`test_upload_activity*`). No new tests.
- `faq_server.sh`: `fetch_url_allowlist: 127.0.0.1,::1`, so the server can fetch its own links.
  By default Galaxy refuses them ("Access to this address in not permitted by server
  configuration"). That's correct server behaviour, not a finding.
