Run via gpt-6.1-sol at high effort.

Codex reported one finding, which I confirmed and fixed. As in the first round, it saw only code supplied in the prompt.

Not acted on: nothing.

<details><summary>Details</summary>

**Limited coverage.** Codex's sandbox can't run on this host (`kernel.apparmor_restrict_unprivileged_userns=1`), so it ran with `-s read-only`, no working commands, and the branch diff plus excerpts in the prompt. By its own note it couldn't inspect the complete extended set-metadata path, BAM indexing, `Dataset.store_by` and the object store, or pgcleanup's transaction handling.

**P2, confirmed and fixed.** `_share_input_metadata_file` assigned the input's uuid to the output's row, then `_hda()` called `session.rollback()`, discarding it. The fixture never made the duplicate rows it described, though the output's metadata did point at the input, so the test still caught the overwrite. It now assigns the uuid after the last rollback and asserts the duplicate exists.

</details>
