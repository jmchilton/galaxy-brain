# Scope evaluation

**Recommendation: expand slightly.** Keep the feature as built: the API's `categories` and `clone_url`, the `hg clone` row, the Categories card, the generated `.shed.yml` card and the aside scroll. Add one cleanup in code the branch already changes: rename `setup_column_maker_repo(category_id=…)` to `category_ids`. The branch already made that parameter accept a list, and `new_repository` uses the plural. #24167 adds no callers of the helper, so the rename can't conflict with it after merge. The PR should close #24061 and close #24062 only with a stated gap. The repository-level parts of #24062 are done. Per-tool "source" links wait on #24167's file browser, because `RepositoryTool.tool_config` is already on the page and a "View XML" link only needs #24167's contents route. Everything else below is a follow-up or was rejected.

## Possible Decompositions

The diff is about 510 non-generated lines added and 69 removed: about 265 production and 260 test. `schema.ts` (+14) is generated. These are options for John, not a recommendation.

**A. Refactor first, then the feature (2 PRs).**
1. `a4d047bea5e` baseline `RepositoryLinks.test.ts` and `fb9777b4618` row-list refactor. This is a pure refactor with no visible change, about 150 lines.
2. Everything else, as it stands.

**B. One PR per issue (2–3 PRs).**
1. Optionally, the refactor from A.1.
2. #24061: the `clone_url` field, `to_detailed_model(trans)`, `show` taking `trans`, the clone row, `test_show_clone_url_clones` and the clone `RepositoryLinks` test.
3. #24062: `categories` / `CategorySummary`, `repository_categories()`, the Categories card, `shedYml.ts` and its card, the aside-scroll CSS, the unit test, the API category tests and the Playwright test.

This means re-cutting `766a17bb0be`, which adds both API fields, and splitting the Playwright test, which checks the clone command as well. The aside-scroll CSS goes with whichever card lands second.

**C. Keep the debatable `.shed.yml` part apart (2 PRs).**
1. Clone row and categories (API and chips).
2. `shedYml.ts`, `RepositoryShedYml.vue` and the main-column card. This is the hand-written emitter part, the one a reviewer is most likely to push back on.

Order relative to #24167: either can land first. The real conflicts are three append-vs-append test hunks, and `schema.ts` needs regenerating after the second one lands (see As implemented).

## As implemented

`DetailedRepository` gains `categories: list[{id, name}]` (live categories, sorted on the server) and `clone_url`. The repository page shows a copyable `hg clone` row in Links, category chips that link to the category pages, and a `.shed.yml` rebuilt from repository settings by a 72-line TS emitter that was checked exhaustively against PyYAML. The sticky aside now scrolls once it is taller than the window.

| Pros | Cons |
|---|---|
| Covers #24061 and every repository-level ask in #24062, together on one branch off `dev` as John asked | #24062's "homepage and source for a tool" isn't addressed. Tools have no homepage field. A source link needs #24167 |
| Server returns category names, so there's no client join or extra `/api/categories` fetch | GET returns `{id, name}` while PUT takes `category_ids`. The asymmetry is deliberate and documented |
| Both new fields have defaults, so `tool_shed_client` still parses older sheds | Hand-written YAML emitter. A reviewer may ask why it isn't PyYAML or the `yaml` package |
| Reuses `generate_clone_url_for`, `ConfigFileContents` and the categories routes. The links refactor is a separate base commit | Overlaps #24167 in 3 test files (see details) |

<details>

**Overlap with #24167 (head `66f8d7c3769`), checked with `git merge-tree`.**
- `index.md` says the only conflict is in `RepositoryPage.test.ts`. That is stale: the file now merges cleanly.
- The textual conflicts are all in tests, and each is append-vs-append, so the fix is to keep both sides:
  - `playwrightbrowser.py`: new `Locators` constants.
  - `test_frontend_repositories.py`: appended tests.
  - `test/unit/tool_shed/test_repositories_manager.py`: imports and appended tests.
- These files merged cleanly with no semantic clash:
  - `RepositoryPage.vue`: #24167 replaces the revision watcher and renames `RepositoryExplore`'s prop. Neither touches the new cards.
  - `managers/repositories.py` and `api2/repositories.py`: #24167 doesn't touch `to_detailed_model`, `to_element_dict` or `show`.
  - `tool_shed_client/schema`.
- `schema.ts` is generated, so regenerate it after the second PR lands.
- #24167 adds `tabindex` to `ConfigFileContents`'s `<pre>`, which the `.shed.yml` card gains for free.
- In meaning the two PRs fit together. #24167 hides hgweb links from anonymous users, and this branch gives them a copyable clone command instead.

</details>

## Expand: `setup_column_maker_repo` `category_id` → `category_ids` (recommended)

Rename the test helper's keyword, which this branch widened to `list[str] | str | None`, to match `new_repository(category_ids=…)`. This is thermo-nuclear finding 5, which was deferred as test churn. It touches about 14 keyword call sites in 4 test files.

Two related fixes:
- `lib/tool_shed/test/base/README.md:86` shows `populator.new_repository(category_id=category.id)`, but the real keyword is `category_ids`, so the README example is already wrong. Fix it in the same commit.
- `setup_test_data_repo(category_id=…)` has the same singular name. Decide whether to align it too or leave it alone.

| Pros | Cons |
|---|---|
| Fixes a singular/plural mismatch the branch itself created, plus a wrong README example next to it | Mechanical churn in 4 test files unrelated to the feature |
| #24167 adds no `setup_column_maker_repo` callers, so it causes no conflict after merge | Adds no user value |
| Small, and it is code the diff already touches | |

## Expand: per-tool links and categories from #24062

Show per-tool EDAM terms, xrefs and a "View XML" link on the repository page's tool list.

| Pros | Cons |
|---|---|
| Closes the last clause of #24062 ("source for a tool") | EDAM and xrefs aren't in the repository payload. `RepositoryTool` has only `tool_config`, `id`, `version` and similar, and `ToolVersionPage` fetches each tool's parsed metadata separately. Putting them on the repository page means a fetch per tool or a schema change |
| `tool_config` is already in the payload, so "View XML" needs no extra fetch once #24167's `/repositories/:id/contents?file=` exists | "View XML" depends on #24167, which isn't merged. Stacking on it goes against John's off-`dev` instruction |
| The tool version page already shows EDAM and bio.tools links | "Tool categories" don't exist on the shed side; Galaxy tool panel sections are set by the Galaxy server |

**Verdict:** follow-up after #24167. #24167 already lists "View XML from a tool" as a follow-up. Say in the PR text that this part of #24062 is left for it.

## Expand: hgweb link for logged-in users

Make the clone URL, which is the hgweb root, a link when `authStore.user` is set, the way #24167 gates Changelog. #24061 literally asks for a "link".

| Pros | Cons |
|---|---|
| Matches #24061's wording | Duplicates Explore → Changelog, which already opens hgweb for logged-in users |
| A few lines that follow #24167's auth-gating pattern | Adds an hgweb surface just as #24167 moves browsing in-app (#18295 direction: less Mercurial-centric) |
| | Pages that differ by login are harder to screenshot and test |

**Verdict:** not recommended.

## Reshape: generate `.shed.yml` on the server with PyYAML

Replace `shedYml.ts` and its test with a backend `yaml.safe_dump` exposed as a `DetailedRepository` field or a small endpoint.

| Pros | Cons |
|---|---|
| Deletes the 72-line emitter, which needed two rounds of escaping fixes (normal review, Codex) | New public API surface for a reconstructed file |
| Uses the library planemo parses with, so the output can't drift | A field would put YAML text into every `show`. An endpoint means a second fetch |
| Reusable by API clients, not just the page | The current emitter is pure and checked over 24,582 code-point cases. The risk is already retired |

<details>

The reviews compared the hand-written emitter only with the frontend `yaml` npm package, never with server-side generation. This option is the more reusable one if a Galaxy reviewer objects to hand-written YAML. It's a good fallback, not a reason to rework the branch before review.

</details>

## Alternative: the `yaml` npm package instead of the hand-written emitter

Raised in the normal and thermo-nuclear reviews, and rejected both times.

| Pros | Cons |
|---|---|
| A maintained library instead of escaping code written for this | A new dependency in the shed frontend |
| The Galaxy client already depends on it | It writes YAML 1.2 by default, so it needs `version: "1.1"`, and its output would still need the PyYAML check |

**Verdict:** keep it rejected. If the emitter is replaced, do it server-side (above).

## Expand: owners edit categories from the page

#24062's motivation is checking that categorization is correct, and the natural next step is fixing it. `PUT /api/repositories/{id}` already takes `category_ids`.

| Pros | Cons |
|---|---|
| Completes the "see it's wrong, then fix it" loop | The new frontend has no repository-edit UI at all. This would be a new feature, not a slight expansion |
| The API already exists | Permissions, form and validation are a separate design question |

**Verdict:** separate issue.

## Expand: categories in repository grids and search results

| Pros | Cons |
|---|---|
| Categorization visible without opening a repository | Not asked for. Needs categories on the summary `Repository` model, joined per row |

**Verdict:** no.

## Already handled: long-README sticky-aside clipping

The E2E polish probe measured the clipping: the branch pushed the aside to 869px against 652px of space. `0ed3a722c86` fixed it by giving the aside a `max-height` and `overflow-y: auto`, and the thermo-nuclear review kept that. No scope left here.

## Not in scope: old sleeps in shed Playwright, and the clone URL tests build by hand

- `wait_for_timeout(500)` in `test_metadata_inspector_screenshots`, and the `time.sleep(0.25)` calls in `visit_url` / `_submit_form`, aren't in code this branch touches. They belong in a separate test-infrastructure cleanup.
- A shared test helper for the clone URL: the Playwright and API tests each build it inline, and the existing builders in `hg_operations` / `testcase` embed push credentials. Two inline f-strings don't justify a helper.

| Pros | Cons |
|---|---|
| Would remove sleeps, a known source of flakiness | They're outside the diff, and the shed Playwright suite isn't this branch's concern |
| One clone-URL builder for tests | Two short call sites. The credentialed builders don't fit |

## Contract: split by issue, or drop `.shed.yml`

| Pros | Cons |
|---|---|
| Smaller PRs. The #24061 piece alone is tiny and uncontroversial | John explicitly asked for both issues in one branch |
| Moves the debatable emitter out of the way of the easy parts | Dropping `.shed.yml` leaves #24062's headline ask ("display the shed.yml") undone. Planemo never uploads the file, so a rebuilt copy is the only option |

**Verdict:** no. Splits are listed under Possible Decompositions if John wants them.
