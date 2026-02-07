Import a markdown note into the vault with correct frontmatter.

Source file: $ARGUMENTS

Steps:

1. Read the source file at the path above.
2. Read ADDING_NOTES.md for frontmatter rules, folder placement, and file naming conventions.
3. Read meta_tags.yml for the allowed tag vocabulary.
4. Analyze the note content to determine:
   - `type` and `subtype` (use the Note Types table in README.md)
   - Appropriate tags from meta_tags.yml (type tag + galaxy area tags)
   - Any conditional fields needed (github_issue, github_repo, title, parent_plan, section, etc.)
   - Best filename per the naming conventions in ADDING_NOTES.md
   - Destination folder per the folder placement table in ADDING_NOTES.md
5. If the note already has frontmatter, preserve any fields that are valid and fix/add what's missing. If it has no frontmatter, generate it from scratch.
6. Set `created` and `revised` to today's date, `revision: 1`, `status: draft`, `ai_generated: true` (unless the note is clearly human-written).
7. Ask me to confirm the frontmatter and destination path before writing.
8. Copy the note to the destination with the finalized frontmatter.
9. Run `make validate` to verify the note passes validation. Fix any errors.
