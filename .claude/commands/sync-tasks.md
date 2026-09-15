Sync `vault/JOHNS_TASKS.md` with GitHub — add this week's reviewed PRs and represent every
recently-active PR John has open.

The task list is hand-maintained. This command *adds what GitHub knows and the file is
missing*; it never deletes a hand-written bullet, never unchecks a box John checked, and
never rewords an existing item.

Config lives in `tasks_sync.yml` at the repo root (`login`, `stale_after_days`,
`exclude_repos`, `project_map`). Read it first — don't hardcode any of it here.

## Steps

### 1. Resolve the week

Week headings are anchored to **Monday** — every existing heading in the file is one.

```sh
python3 -c "import datetime; d=datetime.date.today(); m=d-datetime.timedelta(days=d.weekday()); print(m.isoformat(), (m+datetime.timedelta(days=6)).isoformat(), m.strftime('%B %-d, %Y'))"
```

That prints the Monday, the Sunday, and the heading text. If a section with that heading
doesn't exist, create it directly under `# John's Tasks`, above the previous week —
the file runs newest-first.

Headings are `## Month D, YYYY` — `##` because `# John's Tasks` is the document title, and
no ordinal suffix on the day. Match that exactly; the existing headings are already
normalized and shouldn't drift back.

### 2. Collect John's own PRs

```sh
CUTOFF=$(python3 -c "import datetime;print((datetime.date.today()-datetime.timedelta(days=<stale_after_days>)).isoformat())")
gh api "/search/issues?q=author:<login>+is:pr+is:open+updated:>$CUTOFF&per_page=100" \
  --jq '"total=\(.total_count) got=\(.items|length) incomplete=\(.incomplete_results)", (.items[] | "\(.html_url)\t\(.draft)\t\(.created_at)\t\(.updated_at)\t\(.title)")'
```

Then also catch PRs that *merged* during the week, which the open-state query misses:

```sh
gh api "/search/issues?q=author:<login>+is:pr+is:merged+merged:<monday>..<sunday>&per_page=100" \
  --jq '"total=\(.total_count) got=\(.items|length)", (.items[] | "\(.html_url)\t\(.title)")'
```

**Check `total` against `got` on every one of these, and check `incomplete`.** This is not
paranoia — `gh search prs --json` was observed returning 12 of 34 results with exit 0 and
valid JSON while a secondary rate limit was in force. The missing 22 were a clean subset
(every `galaxyproject/galaxy` hit vanished at once), so a partial result looks completely
normal. `gh search prs` cannot detect this; `/search/issues` can, which is the only reason
this uses the raw API. If `got < total`, or `incomplete` is true, **stop and re-run later** —
do not write a partial result into the task list. If `total > 100`, paginate with `&page=2`.

Repo comes from `html_url` (`github.com/<owner>/<repo>/pull/<N>`); there is no clean repo
field on these items.

A 403 mentioning a *secondary* rate limit clears in about a minute — it's separate from the
search quota, which `gh api rate_limit --jq .resources.search` reports. Space the queries out
rather than retrying immediately in a loop.

Drop anything matching `exclude_repos`. The query carries no owner qualifier, so it covers
every org — `galaxyproject/*`, `jmchilton/*`, `galaxy-iuc/*`, contributor forks — which is
intended; `exclude_repos` is the only filter.

**Which week does a PR belong to?** Whichever week it first became visible work:

- Opened non-draft → the week of `createdAt`.
- Opened as a draft, later marked ready → the week it left draft. Get that from the
  timeline, not from search (GitHub search has no ready-for-review filter):

  ```sh
  gh api repos/<owner>/<repo>/issues/<N>/timeline --paginate \
    -q '.[] | select(.event=="ready_for_review") | .created_at' | tail -1
  ```

  Only run this for PRs that are currently non-draft but were created before this week —
  it's one API call each, so don't fan it out over the whole list.
- Still a draft → the week of `createdAt`, suffixed `(draft)`.

A PR whose week resolves to an *earlier* week than the current one is only added if
it isn't in the file at all; a backfilled bullet goes under its own week's heading, not
this week's. If that week has no heading, put the PR in the current week rather than
inventing a historical section — and if a run would add more than a handful of backfilled
bullets, show the plan and confirm before writing.

### 3. Collect PRs John reviewed that merged this week

Two queries — `reviewed-by` catches formal reviews, `commenter` catches the ones where he
weighed in without submitting a review. Union them.

```sh
for ROLE in reviewed-by commenter; do
  gh api "/search/issues?q=$ROLE:<login>+is:pr+is:merged+merged:<monday>..<sunday>&per_page=100" \
    --jq '"'"'"total=\(.total_count) got=\(.items|length)", (.items[] | "\(.html_url)\t\(.user.login)\t\(.title)")'"'"'
done
```

Same `total` vs `got` check as step 2 applies here.

Filter out `author.login == <login>` — this bullet is *other people's* PRs. Both queries
return John's own merged PRs and they belong in step 2, not here.

### 4. Place each of John's PRs under a group

In order, first match wins:

1. **An existing bullet in the file.** Scan the current week and the two before it for a
   parent bullet whose text plainly covers the PR (`Embed Galaxy in Planemo`,
   `Pulsar HTCondor2`, `Fix Tool Submission Errors`). Nest under it. This is the
   important one — John's own groupings win over anything inferred.
2. **`project_map` in `tasks_sync.yml`** — repo match or title-keyword match.
3. **A `vault/projects/<name>/` directory** whose subject clearly covers the PR. If you
   use one, name the group after the project's human title and link it, e.g.
   `- [ ] Workflow State — [[workflow_state]]`.
4. **Top level, uncategorized.** A bare `- [ ]` bullet in the week. This is a fine
   outcome, not a failure — don't invent a group to avoid it.

Don't create a group for a single PR unless `project_map` says so.

### 5. Write the bullets

Indentation in this file is **tabs**, matching what's already there.

John's PRs are tasks, so they carry checkboxes — `[x]` once merged, `[ ]` while open:

```
- [ ] Embed Galaxy in Planemo
	- [ ] [planemo#1690](https://github.com/galaxyproject/planemo/pull/1690) — Add an embedded Galaxy engine for package-installed Galaxy
	- [ ] [planemo#1691](https://github.com/galaxyproject/planemo/pull/1691) — Run package-installed Galaxy through Gravity (draft)
```

Reviews are a record of work done, not a task, so they get plain bullets under one
`PRs Reviewed` parent — one per week, at the end of the week's section:

```
- PRs Reviewed
	- [galaxy#23405](https://github.com/galaxyproject/galaxy/pull/23405) mvdbeek — Fix failing API tests on release_26.1
	- [galaxy#23264](https://github.com/galaxyproject/galaxy/pull/23264) dannon — Excerpt every job log through one truncation helper
```

Strip release-branch prefixes like `[26.1]` from titles; they're noise at this altitude.
Sort reviewed PRs by repo, then descending number.

**Idempotency.** A PR is identified by its `owner/repo#number`. Before adding anything,
check whether that number already appears anywhere in the file — if it does, leave the
bullet where it is and only update its state (check the box if it merged, drop a
`(draft)` suffix if it left draft). Re-running this command twice in a row must produce
no diff the second time.

### 6. Update frontmatter and validate

Bump `revision` by one and set `revised` to today (`created` stays). Then:

```sh
make validate
```

`vault/JOHNS_TASKS.md` is a validated `moc` note — validation errors block. `summary`
doesn't change, so `make index` isn't needed unless you edited it.

### 7. Report

Short summary: week synced, PRs added under which groups, count of reviewed PRs,
anything left uncategorized, and any repo that looks like it belongs on the
exclude list. If a repo produced
noise John clearly doesn't want tracked, say so and offer to add it to `exclude_repos` —
don't edit the config unprompted.

## Notes

- Read-only `gh` calls parallelize fine; run them in one batch.
- These use `gh api /search/issues` rather than `gh search prs` solely for `total_count` /
  `incomplete_results`. Don't "simplify" them back to `gh search prs` — that loses the only
  signal that a result was truncated.
- Stale open PRs (John has drafts open since 2016) are excluded by `stale_after_days` and
  stay excluded. Don't resurrect them into the list.

## Don't

- Don't delete, reword, or uncheck an existing bullet — additive only.
- Don't check a box for work GitHub can't confirm merged.
- Don't add a PR that's already in the file under a different week.
- Don't edit `tasks_sync.yml` without asking.
- Don't post anything to GitHub. This command reads.
