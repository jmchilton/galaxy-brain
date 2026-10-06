# planemo#1175 — Add `--serve` flag to `planemo test`

[Issue](https://github.com/galaxyproject/planemo/issues/1175)

Draft [#1708](https://github.com/galaxyproject/planemo/pull/1708), stacked on #1701; no closes keyword, so #1175 stays open on merge unless one is added.

Embedded Galaxy stack (#1701 → #1708): both were conflicted on master and were rebased 2026-09-25. master and #1701 had independently extracted the same mulled-containers block into a helper under different names; master's `_handle_mulled_container_kwds` won (it handles singularity and ships tests) and #1701's `_configure_mulled_containers` was dropped.
