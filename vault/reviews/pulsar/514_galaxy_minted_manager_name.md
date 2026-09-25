# PR 514 — Use the manager name Galaxy returns from compute-resource registration

**Verdict: correct fix, real bug, field contract verified against the Galaxy side — approve with comments. Nothing blocking; the asks are (1) fix three comments that now assert the opposite of the code, (2) HISTORY.rst entry, (3) optionally raise instead of silently falling back on an empty name, and refactor the three existing tests onto the new mock helper.**

`galaxyproject/pulsar` #514 by @dSizovs (external). Single commit `c26e15f`, rebased on
`origin/master` (`40879f3`). 79 added lines, 2 files, no deletions.

## What it does

`pulsar/client/galaxy_byoc.py:123-131` — after the HTTP status check on Galaxy's
`POST /api/compute_resources/registrations/complete`, read `manager_name` out of the
response body and, if truthy, use it in place of the relay JWT `sub` that was decoded at
`galaxy_byoc.py:99`. Two new tests plus a `_mock_relay_device_flow(sub)` helper in
`test/galaxy_byoc_test.py:210`.

## Cross-repo verification (the thing the PR description asks you to take on faith)

The endpoint does **not** exist on `origin/dev` or any release branch of
`galaxyproject/galaxy`. It lives on `mvdbeek/harden-byoc-job-security` — Galaxy PR
**#22781, "Bring Your Own Compute for Pulsar", still DRAFT**. Against that branch:

- `lib/galaxy/webapps/galaxy/api/compute_resources.py:91-106` — the `/registrations/complete`
  route declares `response_model=ComputeResourceSummary`.
- `lib/galaxy/schema/compute_resources.py:25` — `ComputeResourceSummary.manager_name` is a
  **required, non-nullable, top-level `str`**. Field name is exactly `manager_name`, not
  nested. The PR reads the right key.
- `lib/galaxy/managers/compute_resources.py:97,564` — `MANAGER_NAME_PREFIX = "cr-"`,
  minted as `f"cr-{secrets.token_hex(16)}"`. Galaxy genuinely mints a name unrelated to the
  relay `sub`. The test's `cr-0123abcd` matches the real convention.

So the premise is real and the fix is right. Two consequences worth stating:

1. **The fallback branch is dead code against the only Galaxy that implements this.**
   `manager_name` is required in the response model, and no shipped Galaxy has the endpoint
   at all. "Galaxy versions that do not return one" (`galaxy_byoc.py:124-125`) currently
   describes no released version. That's not a reason to drop it, but see finding 2.
2. **Pulsar POSTs a `manager_name` field Galaxy does not accept.** `galaxy_byoc.py:109`
   puts `manager_name` in the request body; `RegistrationCompletionPayload`
   (`lib/galaxy/schema/compute_resources.py:88-110`) has no such field, and Galaxy's `Model`
   base (`lib/galaxy/schema/schema.py:329-332`) sets no `extra="forbid"`, so pydantic
   silently drops it. It isn't a 422 — it's a no-op. See Questions.

## Ordering — does the fix actually reach `app.yml`? Yes.

Traced the whole path; the fix is not partial:

- The credentials file is written inside `flow.run()` (`galaxy_byoc.py:90`), *before*
  `manager_name` is even decoded, and `pulsar_relay_client`'s `CredentialsFile` stores no
  manager/topic data — checked the installed package.
- The only pre-hunk consumer of `manager_name` is the POST payload at `galaxy_byoc.py:109`,
  which Galaxy ignores (above).
- `pulsar/scripts/config.py:390` reads `result["manager_name"]` and `:400-406` writes it as
  the `managers:` key in `app.yml`. The returned value is what lands there.

No relay subscription or topic setup happens in this process; that's read back out of
`app.yml` by the daemon. So reassigning the local is sufficient.

## Findings, by severity

### 1. Three comments now assert the opposite of what the code does

None were updated:

- `pulsar/client/galaxy_byoc.py:8-10` (module docstring) — "Decodes the ``sub`` claim out of
  the access token — that's the relay user id, **which we adopt as the BYOC manager name (and
  as the Pulsar manager name in the local ``app.yml``)**."
- `pulsar/scripts/config.py:251-252` — "Scaffolds app.yml using the **relay-supplied**
  manager_name so the user's Pulsar binds to the same topics Galaxy publishes to."
- `pulsar/scripts/config.py:387-389` — "Write a minimal app.yml that binds Pulsar to the
  manager_name **the relay handed us (= the JWT ``sub``)**" — sitting directly above
  `manager_name = result["manager_name"]` at `:390`.

For a PR whose whole point is "these two names are different," leaving the docstring that
says they're the same is the highest-value cheap fix in the review.

### 2. Silent fallback breaks the module's raise-on-malformed pattern — `galaxy_byoc.py:126-131`

Scoping this honestly first: against the confirmed contract above, `manager_name` is required
and non-nullable, so the empty/null case is **unreachable today**. The ask is consistency, not
a live bug.

The module's established contract is to **raise `GalaxyBYOCRegistrationError` on a malformed
handshake**: `galaxy_byoc.py:95-98` (relay omitted `refresh_token_secondary`),
`galaxy_byoc.py:100-103` (undecodable `sub`). The new code breaks that pattern with a silent
fallback.

`if minted:` collapses three distinct cases into one:

- key **absent** — the hypothetical old-Galaxy case the comment describes. Fallback is right.
- `manager_name: null` or `""` — a Galaxy that *does* implement the endpoint returning a
  broken value. Falling back to the `sub` here would reproduce precisely the bug this PR
  exists to fix — registration prints success, `app.yml` gets the wrong name, jobs stay
  queued, and there is no log line saying why.

Suggest distinguishing them, in keeping with the surrounding code:

```python
body = resp.json() if ... else {}
if "manager_name" in body:
    minted = body["manager_name"]
    if not minted:
        raise GalaxyBYOCRegistrationError(
            "Galaxy returned an empty manager_name; refusing to register."
        )
    manager_name = minted
```

That is the reuse-of-existing-abstractions argument here: the module already has a shape for
"the peer said something impossible," and this doesn't use it.

### 3. `except ValueError` is correct for a non-JSON body, but a valid non-dict body escapes it

Verified empirically against the pinned `requests` 2.34.2 in this worktree:
`requests.exceptions.JSONDecodeError` does subclass `ValueError`, and an empty body is caught.
Good call by the author. But `resp.json()` returning valid JSON that isn't a dict is not:

```
requests 2.34.2
JSONDecodeError MRO ValueError? True
null body raises AttributeError 'NoneType' object has no attribute 'get'
string body raises AttributeError 'str' object has no attribute 'get'
empty caught as ValueError: JSONDecodeError
```

A bare `null` body or a proxy returning a JSON string crashes with a raw `AttributeError`
instead of a `GalaxyBYOCRegistrationError`. One-line fix if finding 2 is taken
(`body = ...; if not isinstance(body, dict): body = {}`). Low severity — it's defensive code
that's 90% defensive.

**On reuse:** I looked; there is nothing to reuse. `pulsar/client/` has no response-parsing
helper, and the only other `.json()` in the tree (`pulsar/user_auth/methods/oidc.py:47`) is
unguarded. This hunk is *more* careful than house style, not less. No existing abstraction is
being bypassed, and none is needed for one call site.

### 4. Tests: new helper duplicates what three existing tests still do inline

`_mock_relay_device_flow` (`test/galaxy_byoc_test.py:210-232`) is exactly the two
`responses.add` blocks that `test_register_with_galaxy_happy_path` (`:60-84`),
`test_register_with_galaxy_fails_when_relay_omits_secondary` (`:129-152`) and
`test_register_with_galaxy_surfaces_galaxy_error` (`:170-193`) each repeat verbatim. The PR
adds the abstraction and then leaves ~60 lines of duplication in place. Refactoring the three
onto it is a small, low-risk win and is the difference between "leaves a reusable
abstraction" and "accretes."

Also: the helper is appended at line 210, below the tests, while the file's other helpers
(`_b64url`, `_jwt_with_sub`) sit together at `:31-38`. Move it up.

### 5. The defect surfaces in `app.yml`, and an existing harness could assert that

`test/scripts_config_test.py` already has `temp_directory()` + `_check_project_directory()`
returning a parsed `project.app_config`, and nothing in it exercises `--register-with-galaxy`
(pre-existing gap). The new tests stop at the function's return dict. Asserting the minted
name lands as the `managers:` key in the scaffolded `app.yml` would cover
`pulsar/scripts/config.py:400-406` end-to-end using machinery that's already there. Medium —
the returned-value test does cover the defect line, so this is an upgrade, not a hole.

### 6. HISTORY.rst entry warranted

Every adjacent BYOC change got one under the open `0.15.16.dev0` section — `Pull Request 454`,
`458`, `459` — and this contributor already has an entry (`Pull Request 460`,
`HISTORY.rst:68-69`). This one has none.

### 7. Adjacent observation (not a bug — a question): `relay_topic_prefix` is never negotiated

Traced this and it does **not** currently misbehave, so flagging it only as a question.
Galaxy's `RegistrationCompletionPayload` accepts `relay_topic_prefix`
(`lib/galaxy/schema/compute_resources.py:106`) and `ComputeResourceSummary` returns it
(`:39`). Pulsar neither sends nor reads it, and `_run_register_with_galaxy` writes an
`app.yml` (`pulsar/scripts/config.py:400-406`) with no `relay_topic_prefix` key. Galaxy stores
exactly what the payload carried — `complete_registration` passes `relay_topic_prefix` straight
into the `ComputeResource` row (`lib/galaxy/managers/compute_resources.py:609,689`) with no
fallback to operator config. So both sides end up unset and the topics match.

The only way this bites is if a Galaxy operator populates the prefix by some path outside this
handshake; Pulsar's docs say it "must match on both Galaxy and Pulsar sides"
(`docs/configure.rst:322`) and topics are `{prefix}_job_setup_{manager_name}`
(`docs/configure.rst:498-506`). Worth asking whether that path exists, since the failure mode
would be identical to the one this PR fixes.

### 8. Imports — clean

No new imports. The lazy `pulsar_relay_client` import at `galaxy_byoc.py:74-80` is
pre-existing and carries a comment explaining the Python-version reason.

## Test verification

Env: `uv venv --python 3.12` + `uv pip install -r requirements.txt -r dev-requirements.txt -e .`
in the worktree. **The tests did NOT skip** — `pulsar_relay_client` resolved, all 7 ran.

With the PR as submitted:

```
test/galaxy_byoc_test.py::test_decode_jwt_sub_pulls_claim PASSED                        [ 14%]
test/galaxy_byoc_test.py::test_decode_jwt_sub_returns_none_on_malformed PASSED          [ 28%]
test/galaxy_byoc_test.py::test_register_with_galaxy_happy_path PASSED                   [ 42%]
test/galaxy_byoc_test.py::test_register_with_galaxy_fails_when_relay_omits_secondary PASSED [ 57%]
test/galaxy_byoc_test.py::test_register_with_galaxy_surfaces_galaxy_error PASSED        [ 71%]
test/galaxy_byoc_test.py::test_register_with_galaxy_uses_galaxy_minted_manager_name PASSED [ 85%]
test/galaxy_byoc_test.py::test_register_with_galaxy_falls_back_to_sub_without_minted_name PASSED [100%]
======================== 7 passed, 2 warnings in 16.86s ========================
```

Red-to-green confirmed — `git checkout origin/master -- pulsar/client/galaxy_byoc.py`, tests
untouched:

```
test/galaxy_byoc_test.py::test_register_with_galaxy_uses_galaxy_minted_manager_name FAILED [ 85%]
test/galaxy_byoc_test.py::test_register_with_galaxy_falls_back_to_sub_without_minted_name PASSED [100%]
>       assert result["manager_name"] == "cr-0123abcd"
E       AssertionError: assert 'relay-user-uuid' == 'cr-0123abcd'
test/galaxy_byoc_test.py:256: AssertionError
```

The new test genuinely pins the new behaviour. Note `falls_back_to_sub_without_minted_name`
passes on reverted source — it's a characterization test for the old path, not a regression
test. Fine, just be accurate about what it buys.

`ruff check pulsar/client/galaxy_byoc.py test/galaxy_byoc_test.py` — clean.

**PR description claim verified:** the pre-existing happy-path test
(`test/galaxy_byoc_test.py:86-91`) mocks Galaxy returning `"manager_name": "byoc_7_lab"`, the
same value as the JWT `sub` at `:78`, and asserts `result == {... "manager_name": "byoc_7_lab"}`
at `:99`. It genuinely could not tell the two apart. The claim is accurate.

**CI:** `requirements.txt:12` gates `pulsar-relay-client>=0.2.1` on `python_version >= "3.10"`,
and `.github/workflows/pulsar.yaml` runs the test matrix on `['3.7','3.11','3.12','3.13','3.14']`
with `tox` `test` deps pulling `-rrequirements.txt`. So these tests skip on the 3.7 leg by
design and genuinely execute on 3.11+. No coverage gap in CI.

## Questions for the author

1. `galaxy_byoc.py:109` still POSTs `manager_name` to Galaxy, which Galaxy's
   `RegistrationCompletionPayload` doesn't declare and pydantic silently drops. Drop it from
   the payload in this PR? Leaving it in is what makes the client *look* like it's choosing
   the name.
2. Should a present-but-empty `manager_name` raise rather than fall back (finding 2)? Related:
   what Galaxy version range is the fallback actually for — the endpoint is unreleased (#22781
   is draft) and the response model makes the field required, so it's unreachable today.
3. Refactor the three existing tests onto `_mock_relay_device_flow` while you're here?
4. HISTORY.rst entry under `0.15.16.dev0`?
5. Can a Galaxy operator set `relay_topic_prefix` outside this handshake (finding 7)? If so,
   Pulsar's scaffolded `app.yml` would need to carry it too.
