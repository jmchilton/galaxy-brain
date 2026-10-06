# planemo#1686 — Run Engine for Embedded Galaxy

[Issue](https://github.com/galaxyproject/planemo/issues/1686)

Draft [#1701](https://github.com/galaxyproject/planemo/pull/1701); no closes keyword.

Embedded Galaxy stack (#1701 → #1708): both were conflicted on master and were rebased 2026-09-25. master and #1701 had independently extracted the same mulled-containers block into a helper under different names; master's `_handle_mulled_container_kwds` won (it handles singularity and ships tests) and #1701's `_configure_mulled_containers` was dropped.
