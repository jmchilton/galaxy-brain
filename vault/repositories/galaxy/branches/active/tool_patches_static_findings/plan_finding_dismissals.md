# Plan: finding dismissals in tool patch collections

Design and blast radius only. Nothing is implemented. Drafted by Claude Opus 5.5 on 2026-11-26.

**The idea (John).** A patch collection should be able to say: "the review reports this finding, and a human or agent reviewed the tool and judged it acceptable, so load and run the tool anyway". Each dismissal names one finding and gives a reason, a doc and a list of reviews (`jmchilton at <date>`, `Claude Opus 5.5, high effort, at <date>`). It is the opposite of an advisory: an advisory adds a warning to a tool, and a dismissal takes a refusal away.

**Recommendation in one paragraph.** Put `dismissals:` in the patch file, next to `ops` and `advisory`. A dismissal names a rule and a location, and pins a `fingerprint` that the review CLI prints for each finding. The fingerprint hashes the finding's identity together with the template text of its location after patching. Dismissals are matched at load, against the review of the patched source. The site's trust policy is applied at job preparation, like the severity threshold is now. In v1 only findings can be dismissed (vulnerability and capability), not uncheckable codes or unchecked locations. Everything goes on branch 4 (`tool_patches_static_findings`), in new commits on top of `12af42b3aab`. No other branch changes.

## 1. Format

### Where: inside the patch file (recommended)

| | In the patch YAML (`dismissals:`) | Its own file kind (`dismissals/<key>.yml`) |
|---|---|---|
| Key and lookup | The same path is the key, with one file per version | A second tree to walk and index |
| Per-changeset overrides, stacking | Free: an override replaces the whole file, and collections stack in order | Must be rebuilt |
| Digest, freshness, store | Free: `digest_for` hashes the matched files, so editing a dismissal re-populates the store, and `indexed_patch_is_current` covers it | A new digest in the token and a new carry-forward check |
| Engine change | One inert field, carried onto `ToolPatchInfo` | None |
| Usable without patches (branch 3 alone) | No: it needs the patch database | Yes |
| Matches John's instinct | Yes | No |

The patch file wins on almost every row. Branch 3 doesn't load patches today, and it gets dismissals once it converges with branch 4 (section 3).

`fixes` (rule ids the ops fix, accepted but not validated) is already the sibling concept: `fixes` says what the ops remove, and `dismissals` says what reviewers accept. Aligning `fixes` with the finding-ref shape below is a later tidy-up, not part of this plan.

### Identifying a finding

The goal is that a dismissal goes stale, and stops matching, whenever the tool, a patch, the validators or the analyser change what it covers.

- **`rule`** and **`location`** (`command`, `configfile:<name>`, `tool`, ...) are matched exactly. They are readable, and lint names them when a dismissal goes stale.
- **`severity`** is the severity that was reviewed. The dismissal covers a finding at or below it, so a finding that gets worse is not covered.
- **`fingerprint`** is `sha256` over a versioned tuple (`FINGERPRINT_VERSION`):
  - **Identity.** `rule`, `kind`, `location` and `context`. For vulnerabilities, also the sorted `refs` (the inputs and how they are read) and the finding's `breakout`/`closes` characters. Those characters are what the sanitizer and validators leave open, so a validator change stales the dismissal. For capabilities, also `expr`.
  - **Text.** For `command` and `configfile:<name>`, the text of that template after patching, as the analyser read it. For any other location, the `sha256` of the expanded tool after patching. A `tool-code-file` finding also hashes the bytes of the code file, by the same reasoning as the collection's `script_sha256` guard. A missing file means no match.
  - **Left out on purpose.** `line` and `more_lines`, which the text already covers, and `message`, which is prose.
  - **Not `finding_match()` as it is.** `patch_review.finding_match()` keys capabilities on `message`. That suits diffing across a patch, but analyser wording changes would stale every capability dismissal.

Hashing the location, not the whole tool, means a patch or a policy demotion that touches a different location (a validator, `help`, another configfile) leaves the dismissal valid. A patch that rewrites the dismissed template stales it, which is the intent.

Multiple dismissals may share a rule and location with different fingerprints. One case is a compat op gated by `needed_from` that changes the template text, so each series sees a different text.

### Reason, basis, doc

- **`reason`**: one line, required, and not `TODO` (as for `reproducibility_doc`).
- **`basis`**: an enum that limits what can be dismissed.
  - `false_positive`: the value cannot reach the place, or cannot break out of it.
  - `mitigated`: something the analyser doesn't model prevents it. The doc must say what.
  - `intended`: the tool needs this capability. Capability rules only.
  - Vulnerability rules accept only `false_positive` and `mitigated`. There is no "accepted risk" basis for vulnerabilities (section 4).
- **`doc`**: a URL or a path relative to the collection (for example `reviews/<key>.md`) holding the evidence. Required for vulnerability rules and optional for capability rules (decision 4). It is prose, so it stays out of the digest.

### Reviews

`reviews` is a non-empty list. Each entry is a concurrence: "I checked this and agree".

- `reviewer`: a GitHub login for a human, or a model name for an agent, written as the agent markers write it (`Claude Opus 5.5`).
- `type: human | agent`. They are distinguished, because the policy treats them differently.
- `date`: an ISO date.
- `effort` and `agent` (the agent workflow name): agents only, and both optional.
- `note`: optional, for example "re-checked after the 2.1.0+galaxy1 patch".
- Two entries with the same reviewer and date are rejected. A reviewer who disagrees removes the dismissal or raises it with the collection; there is no "disagree" entry (decision 5).

### Review-count policy

Policy is set in two places:
- **The collection's lint** sets the floor for authoring: at least one review, and at least one `human` review for vulnerability-rule dismissals (recommended).
- **Galaxy's site policy** can raise it: a minimum number of distinct reviewers, and whether a human review is required (section 2).

Distinct means distinct `reviewer` strings, so three runs of the same model count once.

### Model sketch (branch 4, `galaxy/tool_util/patches/model.py`)

```python
DismissalBasis = Literal["false_positive", "mitigated", "intended"]
ReviewerType = Literal["human", "agent"]
Severity = Literal["critical", "high", "medium", "low", "info"]


class Review(_FileModel):
    reviewer: NonEmptyStr
    type: ReviewerType
    date: datetime.date
    effort: NonEmptyStr | None = None  # agents only
    agent: NonEmptyStr | None = None  # agents only: workflow name or link
    note: NonEmptyStr | None = None

    @model_validator(mode="after")
    def _check(self) -> Self:
        if self.type == "human" and (self.effort or self.agent):
            raise ValueError("effort and agent are for agent reviews")
        return self


class Dismissal(_FileModel):
    rule: NonEmptyStr  # a Rule value; an unknown one is ignored with a warning, never fails the file
    location: NonEmptyStr
    severity: Severity
    fingerprint: Sha256
    basis: DismissalBasis
    reason: NonEmptyStr
    doc: NonEmptyStr | None = None
    reviews: list[Review] = Field(min_length=1)

    @model_validator(mode="after")
    def _check(self) -> Self:
        if len({(r.reviewer, r.date) for r in self.reviews}) != len(self.reviews):
            raise ValueError("a reviewer reviews a dismissal once per date")
        return self


class PatchFile(_FileModel):
    ...
    dismissals: list[Dismissal] | None = Field(default=None, min_length=1)
    # _check_rules: "needs ops, an advisory, dismissals or a combination";
    # the advisory-only check of _OPS_ONLY_FIELDS becomes "a file without ops".


# runtime state, carried on ToolPatchInfo (stored on ToolIndexEntry.patch)
class DismissalInfo(BaseModel):
    collection: CollectionRef
    path: str
    digest: str  # the file's sha256
    dismissal: Dismissal


class ToolPatchInfo(BaseModel):
    digest: str | None = None
    states: list[PatchState] = Field(default_factory=list)
    dismissals: list[DismissalInfo] = Field(default_factory=list)
```

The rule-versus-basis check (`intended` only for capability rules), and the check that `doc` is present for vulnerability rules, run when dismissals are matched in `galaxy.tool_util.security`, not in the model. The model module stays free of the analyser's catalogue, and an unknown rule from a newer collection is skipped with a warning instead of invalidating the file (decision 7).

### Synthetic example

```yaml
# patches/example_owner/frobnicate/frobnicate_report/2.1.0+galaxy0.yml (made-up tool)
format_version: 1
kind: security
upstream: []
dismissals:
- rule: template-app-access
  location: command
  severity: high
  fingerprint: 3f5c0e9d7a1b4c2e8f6a0d3b5c7e9f1a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e
  basis: intended
  reason: Reads one server config value to choose the reference directory; the value is not user controlled.
  reviews:
  - reviewer: jmchilton
    type: human
    date: 2026-11-26
  - reviewer: Claude Opus 5.5
    type: agent
    effort: high
    agent: gx_research
    date: 2026-11-26
- rule: shell-injection
  location: configfile:script
  severity: high
  fingerprint: 9a8b7c6d5e4f30211f2e3d4c5b6a79881a2b3c4d5e6f708192a3b4c5d6e7f809
  basis: false_positive
  reason: The value is a select whose options are a fixed list; the review cannot see the option list.
  doc: reviews/example_owner/frobnicate/frobnicate_report/2.1.0+galaxy0.md
  reviews:
  - reviewer: Claude Opus 5.5
    type: agent
    effort: high
    date: 2026-11-26
```

This file has dismissals only. In a file with `ops`, the dismissals judge the content after the ops.

## 2. Semantics

**Order: after patches.** Dismissals are matched against `review_tool_source(patched)`, the review branch 4 already runs at load. That is the content jobs actually run. The cases:

- **A patch clears the dismissed finding.** The dismissal is unmatched. Lint reports it as stale (remove it), and Galaxy logs it at debug level.
- **A patch changes the finding** (its text, severity or characters). The fingerprint or severity no longer matches, so the finding refuses again. This fails safe.
- **A security unit mismatches or is demoted by policy.** The content is unpatched. Dismissals on locations the ops would have rewritten don't match, and dismissals on other locations still do.
- **The `before` report** in `review_patches` is never filtered. Dismissals only describe the content after patching.

**Versions, ranges and overrides.**
- One file per exact version. There are no version ranges, as for ops.
- Copying a dismissal to another version is an authoring step. The authoring tool may carry the `reviews` across only when the fingerprint is identical, and records `note: carried from <version>`.
- A per-changeset override replaces the whole file, so it must restate its dismissals. When an override is unusable, the version file is used, dismissals included.
- With stacked collections, each collection's dismissals are matched against the final content after every collection's patches, and each match is attributed to its own collection.

**`needed_from` and reproducibility levels.**
- Dismissals have no `kind` and no `needed_from`. If a gated compat op changes the dismissed template, a series sees text the dismissal wasn't written for, and the dismissal doesn't match there. An author who wants both series covered writes one dismissal per text.
- Reproducibility levels and `changes_requirements` are about ops, and don't apply to dismissals.
- Dismissals never change the job-cache rule (`patch_blocks_job_cache` reads states only).

**What can be dismissed.**

| Item | v1 | Why |
|---|---|---|
| Vulnerability findings | Yes (`false_positive`, `mitigated`) | These are what branch 4 refuses on |
| Capability findings | Yes (all three bases) | 49 of the 54 stock refusals at `high` are capability-only, and a patch can't remove a capability. The pending capability switch shrinks this, but a site that turns capabilities on still needs it |
| Uncheckable codes, unchecked locations | No | Branch 4 doesn't refuse on them. On branch 3 they decide `when_unsure`, and waiving them is a stronger statement ("trust this template code"). That belongs to a separate, human-only construct later. `classify()` always runs on the unfiltered report |
| Review failed | Never | Nothing was reviewed |

**Stale or unmatched dismissals.**
- **Galaxy at load:** a structurally invalid dismissal makes the file invalid, like any other field (decision 7). An unknown rule, a disallowed basis, or a missing `doc` drops that one dismissal with a warning. An unmatched dismissal is logged at debug level only, since it can be legitimately unmatched on this series.
- **The CLI:** a new `--fail-on stale-dismissal` choice, for collection CI.
- **Collection deep lint:** every dismissal must match on at least one covered content of its key, for some supported series. Otherwise it fails.

**Site policy (branch 4 config).** Applied at job preparation, not at load. So `StaticReview` stores every finding's rule and severity together with the dismissals it matched, and changing the policy needs no re-review or re-populate (the same principle as severity-free storage).
- `tool_security_dismissal_collections`: `"*"` (every configured collection, the recommended default), `[]` (ignore every dismissal), or a list of collection names. Default: decision 3.
- `tool_security_dismissal_min_reviewers`: default 1.
- `tool_security_dismissal_require_human`: `none | vulnerabilities | all`. Default `vulnerabilities`; decision 4.

Why trust every configured collection by default: an admin who adds a collection already lets it rewrite commands, which is more power than lifting a refusal. The opt-out is there for sites that use a collection for ops but run their own review.

## 3. Consumers and blast radius

**Headline: only branch 4 changes.** It gets about 450 library lines, 450 test lines and 100 lines of docs and generated config, in new commits on top of `12af42b3aab`. No other branch is re-picked or rebased.

The private collection needs a matching format, lint and authoring update. Branches 1, 2 and 3 are unchanged in phase 1.

| Area | Branch | Change | Size |
|---|---|---|---|
| `patches/model.py` | 4 | `Review`, `Dismissal`, `DismissalInfo`; `PatchFile.dismissals`; the shape rules in `_check_rules` | ~70 |
| `patches/database.py` | 4 | `_apply_file` returns the used file's dismissals, and `apply_patches` sets `ToolPatchInfo.dismissals`. A dismissal-only match already sets `patch_state` (with empty states). `digest_for` is unchanged, since it already hashes the file. No `ENGINE_VERSION` bump: such files used to fail validation and load unpatched, and their digest is new anyway | ~20 |
| `security/dismissals.py` (new) | 4 | `fingerprint(finding, tool_source)`, `match_dismissals(report, tool_source, dismissals)` returning matched, unmatched and rejected (with reasons), and the rule/basis/doc checks against `Rule` and `VULNERABILITY_RULES` | ~130 |
| `security/refusal.py` | 4 | `StaticReview` stores findings as `(rule, severity, dismissed_by)`, where `dismissed_by` lists the collection, path, humans and agents. `refused_rules(threshold, accept)` takes the policy as a predicate. The stored shape changes | ~35 |
| `tools/security_review.py` | 4 | `_review` matches `tool_source.patch_state.dismissals` and logs the dismissed and rejected matches per tool. `check_static_findings` builds the policy predicate from config, refuses only rules it doesn't cover, and logs each job of a tool whose dismissed findings would otherwise refuse | ~40 |
| Config schema and regenerated files, plus mocks (`galaxy_mock.py`, `tool_source_support.py`, the test `RefusalConfig`) | 4 | Three options. The severity-list validation precedent (`_process_config`) applies to `require_human`. `make config-rebuild` | ~40 + generated |
| Index and freshness | 4 | The shapes of `ToolPatchInfo` and `StaticReview` change, which changes `INDEX_SCHEMA_HASH`. Branch 4 already bumps it, so this folds into the same unreleased bump. `tool_confs_token` is unchanged, because policy is applied at prepare | ~0 |
| `security/patch_review.py` | 4 | `PatchReview.dismissed` and `stale_dismissals`, computed on `after`. `to_dict` gets the matching keys | ~30 |
| `security/__main__.py` | 4 | With `--tool-patch-path`: `DISMISSED` lines, a `fingerprint` on every finding in the JSON, `--fail-on stale-dismissal`, and `--ignore-dismissals`. `--fail-on <severity>` and `FailOn.met` see the filtered findings. Optional `--suggest-dismissals` prints YAML stubs with fingerprints and no reviews | ~70 |
| `classify()` and the uncheckable codes | none | They run on the unfiltered report | 0 |
| Toolbox, populator, cached toolbox | none | They already carry `patch_state` and `static_review` through every seam, and the new fields ride along | 0 |
| API and UI | none in v1 | `patches_as_dicts` dumps states only, and `Tool.static_review` isn't exposed. An admin view of dismissals is a follow-up | 0 |
| Docs: `doc/source/admin/tool_security_review.md` | 4 | A "Dismissing reviewed findings" section next to "Refusing tools with findings", covering the trust model and the policy options | ~60 |
| Tests | 4 | Unit: model table, fingerprint stability and staleness (template edit, validator change, worse severity, analyser version), stacking, overrides, policy predicate, CLI. Integration: a synthetic tool is refused, then runs once dismissed, and is refused again after a template edit, under both toolboxes. Put these in new test modules, not in `test_tool_patches.py` | ~450 |
| Branch 3 runtime (`ToolSecurityReviewer`) | 3, later | Filter `checked_findings` by matched dismissals, keep `classify` unfiltered, and keep `when_unsure` unchanged. Needs the patch database, so it waits for the branch 3/4 convergence already on John's list | ~40, later |
| Branches 1 and 2 | none | Hoisting `fingerprint` to branch 1 would force `--onto` rebases of both children, and the model on branch 2 would be unused infrastructure (its only reader is branch 4) | 0 |
| Planemo, Tool Shed | none | Dismissals belong to third-party installed versions. A tool author fixes the tool instead. An in-tool annotation that the author writes for themselves is a different, untrusted design, and is rejected | 0 |

**Private collection (`tool-patches-private`).** Its format docs and tooling need a matching update. This plan lists the general structure only:
- **`docs/format.md`:** a Dismissals section, and "a file has ops, an advisory, dismissals, or a combination".
- **`docs/lint.md`:** the rules, plus deep-lint staleness.
- **`docs/review.md`:** a Dismissals checklist (disclosure, basis, evidence, fingerprint recomputed on the patched content).
- **`docs/authoring.md`:** a new step for authoring dismissals.
- **`tools/spec.py`:** the field list.
- **`tools/checker.py`:**
  - lint: the structure, the review floor, and basis against the rule kind;
  - `check`: prints fingerprints through the Galaxy CLI.
- **Deep lint:** checks the fingerprints on covered contents.
- **The generator and the hand layer:** a `sources/dismissals/<key>.yml` layer that `generate.py` merges, so regeneration doesn't clobber dismissals. This is the "mirror hand edits" invariant.
- **The collection's own `engine.py`:** must accept the field.
- **`AGENTS.md`:**
  - an agent adds only its own `reviews` entry, and only after verifying independently from the doc and the tool;
  - it never writes a `human` entry or edits another reviewer's entry;
  - it never relaxes a basis;
  - one dismissal per commit, with the reviewer named in the commit message.

**Conflicts with the `collection_fix` work.**
- It is pushed: `e0a94aa8566..8bb1573a319` on `tool_patches`, and rebased into branch 4 at `12af42b3aab` (`d2254dd7805..12af42b3aab`).
- It edits the same `PatchFile._check_rules` lines (the "needs ops, an advisory or both" rule and the upstream requirement) and adds lint-table cases to `test_tool_patches.py`.
- Start dismissals after that work settles. Keep the `model.py` diff additive: new classes, one field, and one rewritten shape rule. Put the tests in new files, so that each re-sync of `tool_patches` into branch 4 replays cleanly.

## 4. Risks

- **A dismissal laundering a real issue.** This is the main risk. Mitigations:
  - vulnerabilities have no accepted-risk basis;
  - the doc is required for vulnerability dismissals;
  - the collection floor requires a human review for vulnerability dismissals;
  - the fingerprint makes a dismissal fail closed on any relevant change;
  - the site can require a human or opt out per collection.

  There is also a disclosure point. A truthful `mitigated` or accepted dismissal of a real vulnerability describes an unfixed issue, so under the collection's disclosure invariant it may live only in the private repo, as `collection_fix` files do. It must never reach a public export or a public branch record.
- **Self-asserted reviewer identity.** A `reviews` entry is unsigned text, so Galaxy can't verify it. The trust comes from the collection itself: who can commit to it, its review process, and optionally signed commits. Collection CI can check that a commit adding a `human` entry was authored by that login. Galaxy treats `reviews` as provenance for the policy and the logs, not as authentication. The docs must say so.
- **Dismissals going stale across versions.** Staleness is by design and fails safe. The tool is refused again, and lint and the CLI name the stale dismissal. The operational risk is a Galaxy upgrade. `REVIEW_VERSION` re-reviews every tool, and if the analyser changes an identity field, dismissals stop matching and tools start refusing after the upgrade. Mitigations:
  - keep `FINGERPRINT_VERSION` stable;
  - leave prose out of the fingerprint;
  - run the collection's CI against Galaxy release branches before a release;
  - document upgrade behaviour.
- **Audit.** Load logs one line per tool with its dismissed matches (rule, collection, path, reviewer counts) and its rejected matches (with the reason). At prepare, a job runs although an undismissed copy of the review would refuse it: that is logged at INFO with the job id. A durable per-job record (like the deferred `Job.tool_patch` column) is a follow-up.
- **Typos disabling security ops.** If a malformed dismissal invalidates the whole file, the file's ops don't apply either. Collection lint catches this before release. Decision 7 offers a lenient parse instead.

## 5. Phasing

0. **Prerequisites.**
   - John settles the capability switch on branch 4. It changes how much dismissals matter, and both touch `refused_rules`.
   - `collection_fix` settles.
   - Decisions 1–7 below.
1. **Branch 4, minimal.**
   - Baseline tests first: a file carrying `dismissals:` is rejected today and the tool loads unpatched; a synthetic tool is refused.
   - Then the model and the carry-through, `dismissals.py`, the `StaticReview` shape, refusal with the policy predicate, logging, config, the CLI's `fingerprint`/`DISMISSED`/`--fail-on stale-dismissal`, docs and tests.
2. **Collection tooling.** Format docs, lint, deep-lint staleness, the generator's hand layer, the `AGENTS.md` workflow and the review checklist. It can run in parallel with phase 1, against the same model.
3. **Branch 3,** after the 3/4 convergence: dismissals in the runtime job check.
4. **Later.**
   - A human-only waiver for uncheckable codes.
   - An admin API view, and dismissals in the `patches` API field.
   - A durable per-job audit record.
   - Optionally, builtin-collection dismissals for stock `tools/` capability findings. This overlaps with `stock_tools_review_clean` and the capability switch (decision 6).

## 6. Open decisions for John

1. **Placement.** In the patch file (recommended) or as its own file kind.
2. **How strict the fingerprint is.** Identity plus the location's template text plus breakout characters (recommended)? The alternatives are identity only (more durable, but it can cover a changed template), or the whole expanded tool (stales on any edit, including `help`).
3. **Site trust default.** Honour dismissals from every configured collection (recommended, since collections already rewrite commands), or opt in per collection.
4. **Review floor.**
   - The collection requires at least one human review for vulnerability dismissals (recommended)?
   - Galaxy's `require_human` default: `vulnerabilities` (recommended) or `none`.
   - `min_reviewers` default: 1.
   - Is `doc` required for capability dismissals too?
5. **The review entry shape.**
   - Concurrence-only entries (recommended), or a `verdict: agree | disagree` where any disagreement disables the dismissal?
   - `type` as the field name. `kind` is taken in this format.
6. **The stock-tools consumer.** Should the builtin collection ship `intended` dismissals for stock data-source capability findings? Or is that left to the capability switch and `stock_tools_review_clean`?
7. **A malformed dismissal.** Invalidate the whole file, as for every other field (recommended, with lint as the guard)? Or drop only that dismissal, so a typo can't switch off the file's security ops?
8. **Uncheckable codes.** Keep them out of v1 (recommended), with a separate human-only waiver later for branch 3's `when_unsure`?
9. **Disclosure.** Confirm that dismissals with basis `mitigated` on vulnerability rules are private-only, like `collection_fix` files. `false_positive` and `intended` ones may then be exported.
