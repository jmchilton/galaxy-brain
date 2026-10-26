Screenshots successfully obtained.

Visually inspected the final pair captured by the primary's passing `TestPublishedWorkflowsGrid::test_run_from_preview_and_import` Playwright run. The `-1.png` captures in `/tmp/workflow-faq-final-playwright/` are the latest pair, taken against the same final tracked tree preserved at `0501935d4c4e`; the earlier unsuffixed captures were not used. No competing browser run was started during this step.

| Saved screenshot | Verified appearance |
| --- | --- |
| [Public workflow preview](screenshots/public_workflow_preview.png) | Workflow Preview modal is open over the workflow list. The three-node graph, author/description panel, Import button and Run button are visible. The logged-in user differs from the workflow author, matching the cross-user case. |
| [Run form before import](screenshots/public_workflow_run_before_import.png) | The selected workflow's actual run form is rendered with both required inputs, its author badge, and the import action in the header (tray/arrow icon before the workflow diagram and settings icons). The empty history correctly produces “No datasets available” input notices and a disabled Run Workflow button. |

Both images are readable and show the expected state without loading overlays or error dialogs. Empty-history notices are intentional because this test opens the form and imports the workflow; it does not execute the workflow or create input datasets. The test subsequently clicks the run-form import action and verifies exactly one distinct workflow copy through the API.

The branch changes import behavior rather than visual layout. TRS integration cases verify run-route destination, imported ID and version provenance; they do not require a fully rendered form for remote workflows whose tools are absent from the standard test server. The local public-workflow fixture supplies the actual rendered-form screenshots above.

No capture adjustment or implementation change was needed. Images are stored locally under the branch's gitignored `screenshots/` directory; this index is the committed record.
