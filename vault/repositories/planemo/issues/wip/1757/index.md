# Planemo #1757 — embedded user tools in managed workflows

[Issue](https://github.com/galaxyproject/planemo/issues/1757)

Implemented 2026-10-26 through `WORK_HORSE.md` on [embedded-user-tool-workflows](../../../branches/active/embedded-user-tool-workflows/index.md); pushed commit `4177dcf4`. John requested backing out if this required Galaxy core development; the real regression passed against pristine Galaxy, so no core changes were needed.

The fix skips embedded definitions during dependency discovery and provisions the user-tool role before managed import. Local suites passed (89 tests, 5 skipped), `make lint` passed, and a real managed workflow ran in Docker with its output assertion passing. [Implementation details](../../../branches/active/embedded-user-tool-workflows/implementation_debrief.md).

Fork CI is queued. No PR opened. Description polishing was blocked by automatic approval review and awaits explicit user approval.
