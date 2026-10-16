*Drafted by Claude (AI assistant) on behalf of John Chilton; reviewed and posted by John.*

This looks good to me, and I don't see any blockers. The watermark fix is right, and I like that the tests pin the stale-CDN case. Pulling out `ToolInstallationRequestDialog` and `useCanRequestToolInstallation` gives us something we can reuse elsewhere. The curated unit tests (129) pass locally. The two red "Test Galaxy packages" jobs are the unrelated pulsar `build_client_manager` ImportError.

There's one small bug:
- **Local-feed descriptions show entities literally.** Local mode sends `sanitize_html(annotation)`, so `R&D` arrives as `R&amp;D`, and `plainDescription` strips the tags but never decodes entities. Taking `textContent` from a `DOMParser` fragment would fix it.

Some reuse and consistency points. Happy to see these as follow-ups:
- **Edited copies count as "the import".** `trs_imports` scans every revision on purpose. But Galaxy drops `source_metadata` when a workflow is modified (see the comment in `Workflow.copy`), and `get_workflow_by_trs_id_and_version` only looks at `latest_workflow`. So we now have two "find this user's TRS import" queries that disagree. I'm fine with either answer, but can we choose one deliberately, ideally with a shared helper or at least a comment cross-referencing the two?
- **TRS id parsing.** `entry_trs_tool_id` hand-splits the URL and uses `unquote_plus`, but imports record the id via `TrsProxy._match_url` (`TRS_URL_REGEX` + `unquote`). Reusing that path would guarantee "the id an import records". Projecting `trsID` directly would work too.
- **Release comparison.** `_release_order` (Python) and `compareReleases` (TS) are new, and they already disagree on `v0.1.0` vs `v0.1`. `TrsTool.vue` also has its own `parseSemver`. Maybe have the server return the comparison, or share a single TS helper in `utils/`.
- `ToolBox.vue` still inlines the same config/anonymous gate that `useCanRequestToolInstallation` now wraps, so it could use the composable.
- For non-admins, installed data-manager tools show up as missing. That's correct for runnability, but the request then asks admins to install something they already have.

UX nit: "Update to v0.2" imports a second copy rather than updating, so "Import v0.2" might set expectations better. The footer already says "You have v0.1".

## Risks
The additive `imported_workflow_id`/`imported_version` fields and `is:runnable` on `GET /api/workflows/curated` are small one-way doors. The edited-copy semantics above are baked into the field description, so it would be good to settle that before merge.
