# faqs/galaxy/tutorial_mode.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `93b8866b6bd`, `faq_server.sh main`. Replay: `tutorial_mode.gxui.sh` (passes fresh).

- FAQ steps hold: the masthead graduation cap opens the GTN over Galaxy; clicking outside closes it. Tool buttons need the server to proxy the GTN (usegalaxy.* do).
- Galaxy bug, fixed on `galaxy_ui_driver`: the webhook's proxy probe always passed (Galaxy answers any path with 200), so servers without the proxy showed a blank box. Probe `api/topics.json` for JSON instead. `test_activate_tutorial_mode` failed before, passes after on both backends. Queued `gx_issues/to_file/gtn_webhook_proxy_probe_always_passes.md`.
- Gif is from 2020 (old masthead): `gtn_screenshots_26_2.yaml`, low.
- No gxui verb; the replay uses `gxui call tutorial_mode_activate` + frame switch.
