Screenshots successfully obtained.

Followed `GX_PROCESS_SCREENSHOTS.md` and read the E2E writing guidance. Ran the new mapped invocation URL regression and the existing invocation job-details test using Playwright against the local Galaxy/Vite environment. All seven final screenshots below were individually opened and inspected. Dialog text is legible, selected jobs match the assertions, and graph captures show the expected selected step.

| Screenshot | Evidence |
| --- | --- |
| [Mapped job via step number](screenshots/invocation_mapped_job_step_number.png) | `step_number=2` opens the selected successful mapped-job dialog. |
| [Mapped job via step index](screenshots/invocation_mapped_job_step_index.png) | `step_index=1` opens the same job. |
| [Mapped job via step label](screenshots/invocation_mapped_job_step_label.png) | `step_label=mixed_collection` opens the same job. |
| [Previous mapped job](screenshots/invocation_mapped_job_previous.png) | Previous changes the displayed job; the test also checks URL/dialog ID equality. |
| [Closed mapped-job dialog](screenshots/invocation_mapped_job_dialog_closed.png) | Closing returns to the selected mixed-job graph step. |
| [Changed graph node](screenshots/invocation_mapped_job_changed_node.png) | Clicking the input selects `input_c`; the test checks that `job` is removed and the invocation root stays mounted. |
| [Existing single-job details](screenshots/invocation_step_jobs.png) | The established Steps-tab job-information view still renders correctly. |

The mapped test passed in 82.35s and the existing job-details test passed in 96.70s. New dialog captures wait for loading messages to disappear. The graph interaction zooms to 50% through visible controls so the neighboring input is clickable; selecting the input then centers it normally. Preliminary captures are archived under `earlier_drafts/1/screenshots` and `earlier_drafts/2/screenshots`.

An earlier run timed out while uploading its fixture, before feature navigation. Restarting only the task backend and warming a disposable upload resolved that local runtime issue for the final passing run. No screenshot blocker remains. PNGs are stored in the branch's ignored `screenshots/` directory.
