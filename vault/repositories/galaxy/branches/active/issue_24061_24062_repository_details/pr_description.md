Fix 🎯 #24061 and implement 🎯 #24062 - Tool Shed repository pages show the `hg clone` command, category links and a ready-made `.shed.yml`.

![Repository page: Planemo .shed.yml card, Categories chips, Links card ending in the Mercurial clone command](screenshots/repository_page.png)

The new Tool Shed's repository page left out things the old one had or that maintainers need to check their work. You couldn't get the Mercurial repository (#24061). You couldn't see which categories a repository is in or what its `.shed.yml` should look like, which is how you'd check it's categorized correctly (#24062). This PR adds three things to the page:

- **Links → Mercurial clone.** A copyable `hg clone <url>` command. ***It's a command, not a link: the main shed now returns 403 for anonymous hgweb pages, but cloning still works for everyone.***
- **Categories card.** Each category is a chip linking to that category's repository list, sorted by name.
- **Planemo card.** A `.shed.yml` for the repository, with `name`, `owner`, `description`, `long_description`, `homepage_url`, `remote_repository_url`, `type` and `categories`. ***Planemo never uploads `.shed.yml`, so the shed doesn't have the original. This one is rebuilt from the repository's current settings: copy it into a tool directory to manage that repository with Planemo.***

***This closes #24062 except for its per-tool homepage and source links.*** Tools have no homepage field, and a per-tool source link needs the file browser in 🔀 #24167. The repository-level homepage and development links were already on the page.

The API change is small. `GET`/`PUT /api/repositories/{id}` (`DetailedRepository`) gains `categories` (`[{id, name}]`, live categories sorted by name) and `clone_url` (from `generate_clone_url_for`, so it honors `tool_shed_url`). ***Both fields are additive with defaults, so `tool_shed_client` still parses responses from older sheds, and `PUT` still takes `category_ids` as before.***

***The sticky-aside change below is here because these cards make the aside taller than the window on long pages, which cut off its last cards.***

<details><summary>Sticky aside fix (long pages)</summary>

The aside is sticky. On a long page, an aside taller than the window had its bottom cards cut off for good. The extra cards here make that happen at ordinary window sizes. The aside's `top` is now `min(masthead + 1rem, 100vh − height − 1rem)`, using its measured height. A tall aside scrolls with the page until its end shows, then sticks. On short pages nothing changes.

![Long repository page scrolled halfway: the aside's Links card, clone command included, is fully visible](screenshots/long_page_aside_end.png)

`test_repository_aside_end_reachable_on_long_page` fails when the aside's CSS is reverted to `dev`'s.

</details>

<details><summary>What changed</summary>

- **Backend**
  - `managers/repositories.py`: `repository_categories()` returns live categories as `CategorySummary`, sorted case-insensitively. `to_detailed_model` takes `trans` and fills `categories` and `clone_url`. The unused `to_element_dict(include_categories=…)` flag is gone.
  - `api2/repositories.py`: `show` passes `trans` through. It sets no session or cookie for anonymous users.
  - `tool_shed_client/schema`: `CategorySummary`; `DetailedRepository.categories` and `clone_url`. The shed `schema.ts` is regenerated for these fields only.
  - `PUT` still takes `category_ids`; it returns the new shape.
- **Frontend**
  - `RepositoryLinks.vue` builds its rows from one list. This refactor is its own commit (`fb9777b4618`), after baseline tests (`a4d047bea5e`) that pass on `dev`. The clone row then adds a command row with a hover title holding the full command.
  - `RepositoryCategories.vue` and `RepositoryShedYml.vue` are small presentational cards. The `.shed.yml` card reuses `ConfigFileContents` for copy and download.
  - `shedYml.ts` writes the YAML. It uses a plain scalar only when it's safe, JSON-style quoting with `\uXXXX` escapes otherwise, and a literal block for multi-line text.

</details>

<details><summary>Why a small YAML writer and not a library</summary>

The output is a handful of known keys with string values, so the writer is 72 lines with no dependency. The `yaml` npm package would add a dependency to the shed frontend, and it writes YAML 1.2 by default while Planemo reads with PyYAML (YAML 1.1). A one-time exhaustive check round-tripped every code point from 0 to 0x2FFF, plus U+FEFF, U+FFFE and U+FFFF, through PyYAML, in both a single-line and a block position. All 24,582 cases came back unchanged. That sweep isn't committed, but `test_repository_shed_yml_loads_back_with_pyyaml` loads the card's rendered text with PyYAML for a set of awkward values.

</details>

## Risks

The published `DetailedRepository` model gains `categories` and `clone_url`. Once clients read them, their names and shapes are hard to change (a one-way door).

<details><summary>Risk Details</summary>

- New response fields on `GET`/`PUT /api/repositories/{id}`: `categories: [{id, name}]` and `clone_url`.
- `GET` returns categories as `{id, name}` while `PUT` takes `category_ids`. The asymmetry is deliberate: the page and `.shed.yml` need names, and returning them avoids a client-side join against `/api/categories`, which counts repositories for every category in the shed.
- The `.shed.yml` is reconstructed. If Planemo adds keys the shed doesn't store, the card won't show them.
- The hand-written YAML writer is the most likely place for a subtle bug. A Playwright test loads the rendered `.shed.yml` with PyYAML for awkward values, both as a literal block and quoted with escapes (`: `, ` #`, `\r\n`, U+2028, a trailing `:`), and a one-time sweep covered every code point up to 0x2FFF.

</details>

<details><summary>Risk Review Advice</summary>

Look at the API shape in `tool_shed_client/schema` and `managers/repositories.py`: field names, the `{id, name}` category summary, and the GET/PUT asymmetry. Then read `shedYml.ts`'s quoting rules, since that's the one piece written from scratch.

</details>

## Context

Independent of 🔀 #24167 (the in-app repository file browser). Either can land first: they conflict only in three test files, where both sides should be kept, and `schema.ts` needs regenerating for the second. The two fit together: #24167 hides hgweb links from anonymous users, whose hgweb pages the main shed's nginx already refuses, and this gives them a clone command instead.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep both issues in one PR as built; per-tool source links wait on #24167.</summary>

- Splits by issue, or the `.shed.yml` card on its own, were listed but not recommended. The #24061 part is tiny, and dropping `.shed.yml` leaves #24062's main ask undone.
- Generating `.shed.yml` on the server with PyYAML is the fallback if reviewers object to the TS writer. It costs new API surface.
- Rejected: an hgweb link for logged-in users (duplicates Explore → Changelog), editing categories from the page, categories in grids.
- A singular test-helper keyword the branch had widened to take a list was reverted to its original type instead of renamed.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Moved category names to the server, which deleted a client-side join, a store action and a test special case.</summary>

- `DetailedRepository` returned category ids at first, so the page fetched every category and joined them. It now returns `{id, name}`, sorted on the server.
- `to_element_dict(include_categories)` became a `repository_categories()` helper.
- `RepositoryLinks.vue`'s four copied `<li>` blocks became one row list.
- The YAML writer's regex no longer needs rebuilding per call.
- Kept: the hand-written writer, and the `.shed.yml` card in the main column.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dropped a page-level vitest test Playwright already covered, and added a deleted-category unit test.</summary>

- The Playwright test creates categories out of alphabetical order and checks chips and `.shed.yml` list them by name.
- `test_repository_categories_leave_out_deleted_categories` covers a filter no API can reach, since no API deletes a category.
- `RepositoryLinks.test.ts` baselines pass on `dev`; the clone test fails at its assertion against `dev`'s component.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found one YAML escaping bug, fixed with a red-first test.</summary>

- A multi-line description containing U+2028, U+2029 or C0 control characters produced a `.shed.yml` PyYAML couldn't load. Those characters are now escaped and force the quoted form.
- The exhaustive PyYAML round-trip above was run after this fix.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The <code>RepositoryLinks.vue</code> row-list refactor moved ahead of the feature, behind baseline tests.</summary>

- `a4d047bea5e` adds baseline tests that pass on `dev`. `fb9777b4618` refactors the rows with rendered output unchanged, and the baseline tests stay green.
- The clone row then adds only the row shape it needs.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A missing or empty field hides its row or card. A failed copy shows the shed's "Your browser did not allow copying to the clipboard." notice.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_show_clone_url_clones` clones from the returned URL, and the rendered `.shed.yml` is loaded back with PyYAML.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, `a4d047bea5e`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- API (`test_shed_repositories.py`): categories listed by name ignoring case, PUT response categories, and `test_show_clone_url_clones`, which runs `hg clone` on the returned URL.
- Unit (`test_repositories_manager.py`): deleted categories are left out.
- Playwright (`test_frontend_repositories.py`): clone command text, category chip order and links, `.shed.yml` lines; the rendered `.shed.yml` loads back with PyYAML to the repository's values; the aside's end is reachable mid-page on a long page.
- Vitest: `RepositoryLinks.test.ts` (rows, hrefs, copying the full clone command) and `shedYml.test.ts` (whole documents, quoting, escaping, literal blocks).

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
