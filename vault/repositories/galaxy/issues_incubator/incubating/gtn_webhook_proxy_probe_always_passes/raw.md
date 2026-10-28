# GTN tutorial-mode webhook shows a blank iframe on servers that don't proxy the GTN

Found by the 26.2 FAQ hardening loop (faqs/galaxy/tutorial_mode.md), Galaxy 26.2rc1.

`config/plugins/webhooks/gtn/script.js` decides whether the server proxies the GTN at
`/training-material/` with `fetch("/training-material/")` and `response.ok`. Galaxy answers any
unknown path with its client page (200, text/html), so the probe always passes. On any server
without the nginx proxy (default dev/local installs) the iframe loads `/training-material/?...`,
which is Galaxy's own client page with no route: a blank white box.

`lib/galaxy_test/selenium/test_tutorial_mode.py::test_activate_tutorial_mode` fails locally
(timeout waiting for `#top-navbar` in the `gtn-embed` frame); it skips wherever the webhook isn't
configured, which is likely why CI didn't catch it.

Fix (on `galaxy_ui_driver`, commit "Open the real GTN in tutorial mode when Galaxy doesn't proxy
it"): probe `/training-material/api/topics.json` and require a JSON content type. Checked:
training.galaxyproject.org, usegalaxy.org and usegalaxy.eu all serve it as application/json under
`/training-material/`; a local Galaxy returns text/html. The test passes on both backends after.

Candidate for its own small PR against release_26.2.
