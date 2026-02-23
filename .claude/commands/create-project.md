Initialize a new project in the vault with proper frontmatter.

Arguments: $ARGUMENTS

The first argument is the project slug (kebab-case directory name, e.g. `structured-tool-state`).
Everything after the slug is either:
- A file path (if it starts with `/` or `./` or `~`) — use the file's content as the index.md body
- A text description of the project — use it to generate a landing page

Steps:

1. Parse the arguments: extract the project slug (first word) and the rest (description or file path).
2. If the rest looks like a file path, read that file. Otherwise treat it as a description string.
3. Read meta_tags.yml for the allowed tag vocabulary.
4. Determine appropriate frontmatter:
   - `type: project` (always)
   - `title` — derive from the slug or document content (human-readable, e.g. "Structured Tool State")
   - `tags` — must include `project` tag; add galaxy area tags from meta_tags.yml based on content
   - `status: draft`
   - `created` and `revised` — today's date (YYYY-MM-DD)
   - `revision: 1`
   - `ai_generated: true`
   - Optional: `galaxy_areas`, `related_notes`, `related_issues`, `related_prs`, `branch` — include when evident from the content
5. Ask me to confirm the title, tags, and any optional fields before writing.
6. Create the project directory: `vault/projects/<project-slug>/`
7. Write `vault/projects/<project-slug>/index.md` with:
   - The finalized frontmatter
   - If a document was supplied: the document content as the body (strip any existing frontmatter from it)
   - If a description was supplied: a heading (`# <Title>`) followed by the description
8. Run `make validate` to verify the index.md passes validation. Fix any errors.
