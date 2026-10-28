# Issue draft (source)

Row 8 of `vault/projects/just_jesting_around/BUGS_FOUND.md`, as of 2026-10-10:

| Bug | Where | Found by | Status |
| --- | --- | --- | --- |
| Modal dialog has no accessible name: the native `<dialog>` has no `aria-labelledby` pointing at its title heading, so screen readers announce an unnamed dialog and a play can't find it by `{ name }` (finds the dialog by role, then the heading inside) | `packages/ui/src/components/GModal.vue` | Play lane, WorkflowMissingToolsRequest | Same code on fetched dev (2026-10-10); plays tolerate it |
