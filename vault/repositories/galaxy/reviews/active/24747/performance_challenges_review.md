# Performance review: #24747

- Profile: gx_performance_challenger
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: f76e9ce6925d (compared against merge-base ab036aead321)

Verdict: no performance blocker. The extra request is bounded as the PR describes: registered users, servers with quota source labels, at most every 5s per visible tab, none while hidden, and at most one in flight plus one queued. Details and raw counts are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

## P3 1: The usages endpoint now polled runs each source's quota query three times

This PR moves `GET /api/users/current/usages` from page visits to every storage refresh, so its per-call cost now matters more. `UserSerializer.serialize_disk_usage` gets `quota_percent`, `quota` and `quota_bytes` separately for each source. Each one reruns the same `get_quota` query on its own `engine.connect()`.

The backend code predates this PR and the PR is client-only, so this suits a small follow-up rather than blocking the merge. It doesn't question the second request itself.

<details><summary>Evidence</summary>

Statement counts from `serialize_disk_usage` on the PR's `lib`, using `MockApp` on in-memory SQLite ([script](performance_challenges/count_usage_queries.py)):

| Sources, including default (S) | Statements | `get_quota` runs |
| --- | --- | --- |
| 1 | 4 | 3 |
| 2 | 7 | 6 |
| 4 | 13 | 12 |
| 11 | 34 | 33 |

At the 5s bound with S=4, that is 156 statements per minute per visible tab while history sizes change.

These are counts only: no Postgres run and no latency figure, so the real server impact is unmeasured.

</details>

Look up the quota once per source and derive the other two values from it. `serialize_disk_usage_for` has the same three calls and can share the helper.

<details><summary>Details</summary>

`get_percent` already accepts `quota=`:

```python
quota_bytes = agent.get_quota(user, quota_source_label=label)
quota_percent = agent.get_percent(user=user, quota=quota_bytes, quota_source_label=label)
quota = nice_size(quota_bytes) if quota_bytes is not None else "unlimited"
```

A prototype of this in the script gave output identical to the current serializer for 0, 3 and 10 labels, and reduced the serializer to S+1 statements. The "unlimited" formatting would be better reused from `get_quota_nice_size` than copied, for example by splitting out a helper that takes bytes.

</details>

## P3 2: Usages load and refresh on servers whose only labeled source has its quota disabled

The watcher's gate uses `config.quota_source_labels`, which includes labels with `enabled: false`. `/usages` leaves those sources out unless the user has a usage row for them. On a server whose only labeled source is disabled, `hasOtherQuotaSources` is true, so every refresh pays the second request, while the meter's `quotaUsages.length > 1` check stays false and nothing extra is shown.

This is an uncommon configuration and costs one small request per refresh, with no wrong output in the registered case. It is the one exception found to the PR's "servers with quotas on several sources" note.

<details><summary>Evidence</summary>

`QuotaSourceMap` with a default backend and one `source: scratch, enabled: false` backend ([script](performance_challenges/label_gate.py)):

```
config labels: ['scratch']
usages labels: []
```

Sites: `client/src/stores/userStore.ts:185`, `client/src/components/Masthead/QuotaMeter.vue` (`showSourcesPopover`), `lib/galaxy/objectstore/__init__.py:2304` (`get_quota_source_labels`) and `:2332` (`ids_per_quota_source`). The anonymous popover branch uses the same labels check.

</details>

Have the config expose only labels with quotas enabled, if no other `quota_source_labels` consumer needs the disabled ones; otherwise accept this and drop the finding. Consumers weren't audited for this review.
