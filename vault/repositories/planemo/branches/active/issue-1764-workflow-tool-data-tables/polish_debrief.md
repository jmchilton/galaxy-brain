# Polish debrief

Wrote the description, titles and tags; one strengthening round.

Applied: fixed a backwards claim ("new line shows when nothing loaded"), softened "works today" to what code shows (no end-to-end run), bolded engine scope, issue coverage, and that tool tests picking up a `.sample` also print the line. Tags limited to existing repo labels.

Not applied: end-to-end workflow test with a data-table tool (local Galaxy install fails in this env; Galaxy-side expansion and merge verified by code reading); data-manager parent-dir nit in docs; `## Context` omitted (no related PR).

Questions for John (scope-widening, not done): add the misnamed-file warning after all (it fires only when that exact file exists, so low noise); print searched paths at `-v` only; open a follow-up issue for container mounts of `${__HERE__}` paths.
