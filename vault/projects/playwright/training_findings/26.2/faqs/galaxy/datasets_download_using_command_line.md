# faqs/galaxy/datasets_download_using_command_line.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `1c8ea1d9a31` (`faq_server.sh main`). Copy Link on a
pasted txt, then the FAQ's wget/curl lines from a terminal against a new user's private dataset, a
public one, and a list collection. Embedded in `introduction/galaxy-intro-rdm`.

## GTN

- `cli-download-redirect` (version): Copy Link now copies `/api/datasets/{id}/download?to_ext=...`,
  which 302s to `/display` (26.1 copied `/display`). `curl -o outfile '<link>'` (and the `--insecure`
  and `-C -` lines) exit 0 and leave a 0-byte file; add `-L`. wget follows redirects.
- `cli-download-private` (version): 26.2 makes new users' data private (`privacy-default-private`),
  so the bare link gives 403 for wget and curl. Appending `?key=` to a dataset link doesn't help: the
  redirect drops it (`42dfcdd5f54`, deliberate). `wget --header "x-api-key: KEY" '<link>'` and
  `curl -L -H "x-api-key: KEY" -o outfile '<link>'` work. Step 4's collection `?key=` commands
  still work (no redirect).
- `cli-wget-output-flag` (main): `wget -O '<link>'` and `wget -O --no-check-certificate '<link>'`
  fail with "missing URL" (`-O` takes the output file). Plain `wget '<link>'` saves as
  `download?to_ext=txt`; use `wget -O outfile '<link>'` or `--content-disposition`.

## Galaxy

- The `/download` redirect drops a `?key=` query key by design (`42dfcdd5f54`: keys in a redirect
  Location are best avoided). Scripts and docs that append `?key=` to a copied link now get 403 on
  private data. Raised with John; not filed.
- Copy Link is covered by `test_history_dataset_copy_link` (`1c8ea1d9a31`). The redirect and
  header auth are covered by the direct-download integration tests (`b86d62166c1`).
- gxui: `dataset-copy-link HID` (tip `fa8cfda6c7c`). The terminal steps are outside gxui.
