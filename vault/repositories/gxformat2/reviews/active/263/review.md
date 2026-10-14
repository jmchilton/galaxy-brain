# gxformat2#263 review — Fix default_url_resolver for GA4GH TRS URLs

- PR: https://github.com/galaxyproject/gxformat2/pull/263 (mvdbeek)
- Reviewed head: `e8dc2da9b75c6a61f575ef5f429fce05ff6c9199` (commits `8dfda59` fix, `e8dc2da` shared declarative case); base `origin/main` @ `ca0bf55`
- Worktree: `~/projects/worktrees/gxformat2/pr/263`
- Companion: galaxy-tool-util-ts#191 (`trsDescriptorUrl`), reviewed at `9b15a74c`. The shared fixture and expectation are byte-identical across both repos (checked with `cmp`).
- Reference: Galaxy `lib/galaxy/workflow/trs_proxy.py` @ `origin/dev` (fetched 2026-10-14)
- Delivery: not posted (review only)

## Verdict

Approve, with small optional items. The fix mirrors Galaxy's `TrsProxy._match_url` and `TrsServer.get_version_descriptor`: `unquote` the tool id, `quote_plus` it again, leave the version alone, ignore the trailing path and append `/GALAXY/descriptor`. Every edge case below behaves the same way in Galaxy, so none of them is a regression. Before this PR, both the unencoded `#workflow/...` form (which Planemo emits, `planemo/galaxy/workflows.py:124-155`) and the bare `/versions/<v>` form failed. So did the `PLAIN-GALAXY/descriptor` form already used in `tests/example_wfs.py:93`: the old code called `.json()["content"]` on a plain-text response. All of them work now.

## Tests run

| Command | Result |
|---|---|
| `uv run --group test pytest tests/test_options.py tests/test_interop_tests.py -q` | 345 passed |
| `uv run --group test pytest tests/ -q -x` | 786 passed, 8 skipped |
| Red check: `git archive HEAD` copied to the scratchpad, with `gxformat2/options.py` from `origin/main` plus an identity stub for `trs_descriptor_url` | 4 failed: resolver `unencoded`, `encoded`, `unencoded-descriptor`, and `test_declarative[test_trs_descriptor_urls_native]`. `encoded-descriptor` passed on the old code, as expected, since it was the one form that already worked. |
| `ruff check`, `flake8`, `mypy gxformat2` | clean |
| `isort --check .` | **fails**, on `tests/test_interop_tests.py` only (see N1) |

CI is green. CI does not run isort; only `make lint` does.

## Coverage of the deleted unit tests

Commit 2 drops `test_trs_descriptor_url` (4 params) and `test_trs_descriptor_url_non_trs`. The fixture steps `trs_unencoded`, `trs_encoded`, `trs_descriptor` and `trs_encoded_descriptor` are byte-identical to the 4 deleted inputs. `plain_url` is equivalent to the non-TRS case (`value: null`), and `$length: 6` guards against missing keys. Nothing was weakened, and the `trs_special_chars` case is extra coverage. The 4-param mocked `test_default_url_resolver_trs` still runs the same inputs through the resolver.

## Findings (ranked)

### L1. The output is not a fixed point for ids containing `+`, and the expectation pins "space as `+`" — **affects the shared fixture**

`gxformat2/options.py:118`: `quote_plus(unquote(tool_id))`. `unquote` leaves `+` as is, then `quote_plus` encodes it as `%2B`. Feeding the function its own output therefore changes the URL:

```
t(special_chars_input)    -> .../repo+%28beta%29%21%2A~%2Fmain/versions/v1/GALAXY/descriptor
t(t(special_chars_input)) -> .../repo%2B%28beta%29%21%2A~%2Fmain/versions/v1/GALAXY/descriptor
```

**Failure scenario.** A TRS URL produced by Galaxy's own `TrsServer.get_trs_url` or `curated._dockstore_trs_url` (both use `quote_plus`) for an id with a space would come back from this function pointing at a different tool id. Galaxy's `_match_url` has the same asymmetry, so this is parity, not a regression. Real GitHub and Dockstore ids can't contain spaces or `+`, hence low severity.

There is also a semantic problem in the expectation header (`trs_descriptor_urls.yml:7`, "space as `+`"). In a URL path, `+` is a literal `+` under RFC 3986. The fixture pins a Galaxy quirk into both languages and describes it as the intended behaviour.

**Fix options.** All of them must land byte-identical in galaxy-tool-util-ts#191:
- Minimal: reword the header to say it pins parity with Galaxy's `trs_proxy` (`unquote` → `quote_plus`), not RFC path encoding.
- Or add an idempotence case, e.g. a step whose `content_id` is the `trs_special_chars` expected URL. This only makes sense together with switching to `unquote_plus` in both repos and in Galaxy. Otherwise the case would pin `%2B`.

### L2. A query string or an unencoded `/` in the version produces a malformed or truncated descriptor URL

`gxformat2/options.py:39-41`: `version_id` is `[^/]+` and the rest is discarded.

```
.../versions/v1?x=1        -> .../versions/v1?x=1/GALAXY/descriptor   (query ends up in the path)
.../versions/feature/foo   -> .../versions/feature/GALAXY/descriptor  (silently a different version)
```

Galaxy's `TRS_URL_REGEX` behaves identically. An unencoded branch version with a slash is ambiguous by construction (`/versions/v1/GALAXY/descriptor` has the same shape), so only the query and fragment case can be fixed cheaply.

**Optional hardening:** exclude `?` and `#` from the version.

```python
TRS_URL_REGEX = re.compile(
    r"(?P<trs_base_url>https?://.+)/ga4gh/trs/v2/tools/(?P<tool_id>.+)/versions/(?P<version_id>[^/?#]+)"
)
```

The TS regex needs the same change. The shared fixture changes only if a case is added.

### L3. The descriptor type and relative path are always replaced

The docstring at `options.py:113` mentions this. A `content_id` ending in `/CWL/descriptor`, or in `/GALAXY/descriptor/sub/wf.ga` (a TRS relative-path file), is rewritten to the primary GALAXY descriptor. That matches Galaxy's trailing `.*`, and for `PLAIN-GALAXY` it is an improvement. A relative-path URL, however, now silently fetches a different file. No change requested. It might be worth adding a `PLAIN-GALAXY/descriptor` step to the fixture, since that form is already used in `tests/example_wfs.py:93` and `tests/test_basic.py:566` (**fixture-affecting**).

### L4. Sibling-path divergence: `default_url_resolver` sniffs the URL shape and ignores `content_source`

Galaxy (`managers/workflows.py` ~2300-2320) dispatches on `content_source`:
- `trs_url` always goes through the TRS proxy, and a non-matching URL raises "Invalid TRS URL".
- `url` is always a plain fetch.
- Shape sniffing (`trs_proxy._match_url`) is only the fallback when there is no `content_source`, i.e. gxformat2 `run:`.

In gxformat2, `UrlResolverFn` receives only the URL. A native `content_source: trs_url` step whose URL doesn't match therefore falls back to a plain GET and YAML parse. A `content_source: url` step with a TRS-shaped URL gets rewritten. This predates the PR (the old code sniffed too), but the rewrite makes the second case more consequential. Note it for follow-up; fixing it needs a resolver signature change and is out of scope here.

### L5. Cycle detection keys on the raw URL

`gxformat2/normalized/_conversion.py:160,173`. The encoded and unencoded forms of the same TRS URL are different keys, so a cycle `A(unencoded) -> B -> A(encoded)` is only stopped by `MAX_EXPANSION_DEPTH` (10). The loop is bounded, and Galaxy also keys on the raw `trs_url`. An optional one-line hardening is to key on `trs_descriptor_url(url) or url` in `resolve_url` and `child` (the TS port would need the same change; the fixture would not).

### N1. isort: `make lint` fails on this PR

`tests/test_interop_tests.py:22`. `from gxformat2.options import trs_descriptor_url` sits between `gxformat2.mermaid` and `gxformat2.normalized`. It should come after `from gxformat2.normalized._native import NormalizedNativeWorkflow` (line ~33). This is the only isort failure in the whole repo; CI doesn't gate on it.

### N2. `is_trs_url` has no callers left

`options.py:101`. Nothing in gxformat2, Planemo (`origin/master`), gxwf-web or Galaxy (`origin/dev`) imports it. It is public API, so keep it, but route it through the same match path:

```python
def is_trs_url(url: str) -> bool:
    """Check if a URL matches the GA4GH TRS v2 tools/versions pattern."""
    return trs_descriptor_url(url) is not None
```

Or leave it as it is. This is a nit.

### N3. The mocked resolver test re-tests the URL mapping 4 times

`tests/test_options.py:28`. Now that the declarative case owns the mapping, `test_default_url_resolver_trs` only needs to show that the resolver GETs the descriptor URL and extracts `content`. A single input (`unencoded`) would do, and `TRS_URLS` / `ENCODED_DESCRIPTOR_URL` could shrink to match. Optional.

## Reuse / abstraction notes

- `trs_descriptor_url` is a reasonable small reusable piece. Galaxy already depends on gxformat2 (`lib/galaxy/managers/workflows.py:16-23`) but keeps a parallel `TRS_URL_REGEX`, `GA4GH_GALAXY_DESCRIPTOR` and quote logic in `trs_proxy.py`. As a follow-up (not for this PR), consider a `parse_trs_url(url) -> TrsUrl(base_url, tool_id, version_id) | None` NamedTuple in gxformat2, with `trs_descriptor_url` and `is_trs_url` built on top. Galaxy's `_match_url` and `get_trs_url` could then delegate to it, which would leave one definition of the TRS-URL contract across Galaxy, gxformat2 and the TS port.
- Imports are at module level, the typing (`str | None`) is fine, and there are no obvious comments to remove. The pointer comment in `test_options.py:24` is useful.

## Shared fixture summary (would need lockstep changes in galaxy-tool-util-ts#191)

- L1: header wording, or an idempotence case.
- L3: an optional `PLAIN-GALAXY` case.
- L2 and L5 change the code in both repos, but the fixture only if cases are added.
