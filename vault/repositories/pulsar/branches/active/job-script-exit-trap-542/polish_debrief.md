# Polish debrief

Wrote [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md) and [pr_tags.md](pr_tags.md), then ran one strengthening round with a subagent (Opus 5.5, medium effort).

The subagent found three wrong claims and one imprecise one in the first draft. All were fixed:

- **"Byte-identical" was false.** The template comment change was rendered into every script. That comment is now reverted (the docstring keeps the note), and a no-handler script was confirmed to render identically to `402a8f8`.
- **#541 is an issue, not a PR.** Reworded.
- **The "TERM only to the script PID" claim was imprecise.** Galaxy's `docker kill` does run, but only after the command finishes on its own. Reworded.
- **"Two lines" was the wrong size.** Now reads "the change in `job_script()`".

Development tasks applied in `2a6e7cd`:

- The trap test now builds the command with Galaxy's real `DockerContainer.containerize_command` and a stub `docker`. It is red on base.
- Added a test pinning the manager's return-code suffix.
- Added a test that the command isn't wrapped without exit handlers.

Description changes:

- The highlighted sentences now answer two misreadings: "changes every job script / affects Singularity" and "fixes cancel".
- Context now states the `release_0.15` target and the forward merge to `master`.

Not done:

- **Signal tests.** Process-group TERM behaviour differs between bash 5.2 and 3.2. The risks section documents both instead.

Questions for John:

- Open a Galaxy issue for chaining the trap in `containerize_command`?
- Land #541's TERM-first cancellation in the same 0.15.x release?

The checklist subagent was not rerun after these changes.
