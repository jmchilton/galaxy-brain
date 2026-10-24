Branch `pr_24361_review_0`, cut from the reviewed commit `57bac72b9a2`, adds a `responses`-based unit suite for the new HAL file source. It moves HAL's per-hop redirect validation into a reusable `open_validated_url` helper in `galaxy.files.uris`, which also reuses the calling thread's HTTP session when one is set. It then fixes the small listing issues one commit at a time, and each behavior change after the first two commits comes with a test that fails without it (the host-constant commit is behavior-neutral). The full HAL suite has 24 passing tests, and the new helper's tests in `test_uris.py` pass too.

- `54116bbc194` Add HALFilesSource unit tests: adds `test/unit/files/test_hal.py`, covering listing, filtering, version pinning, sizes, error mapping and redirect validation through the public API.
- `c9c4b947851` Extract redirect-validating fetch into galaxy.files.uris: adds `open_validated_url`, which validates every redirect hop before requesting it, and has HAL use it for its own status and content-type handling.
- `7d4498229a0` Cap HAL size probes for unpaginated listings: when `limit` is `None`, sizes are probed for at most `DEFAULT_PAGE_LIMIT` attachments.
- `4251e4fcef3` Name HAL attachment hosts; document api_url limit: moves the inline host checks into `FILE_HOSTS`/`FILE_DOMAINS` and notes the limit in the template's `api_url` help.
- `9680a1bf4ac` Skip malformed HAL search results instead of failing the page: root results with a bad id or version are logged and skipped.
- `f896cec1776` Accept trailing slash on HAL deposit paths: `_split_path` strips slashes from both ends.
- `6a8c4ce29a0` Type HAL deposit entries as RemoteFile, drop isinstance: a separately typed list removes the typing-only `isinstance` guard.
- `a823ceb8ec1` Allow text/html for HAL .html/.htm attachments: the HTML-page rejection now skips requests whose path ends in `.html` or `.htm`.
