# Review: galaxy-tool-util-ts#191 — gxwf default URL resolver for GA4GH TRS subworkflow links

- PR: https://github.com/jmchilton/galaxy-tool-util-ts/pull/191 (mvdbeek)
- Reviewed commit: `9b15a74c` (base `origin/main` = `eb7e4ea3`)
- Python counterpart: galaxyproject/gxformat2#263 at `e8dc2da` (`trs_descriptor_url` in `gxformat2/options.py`)
- Galaxy reference: `lib/galaxy/workflow/trs_proxy.py` on `origin/dev`
- Delivery: not posted (review only)

## Verdict

Approve with small follow-ups. No blockers. Fix is correct, sits in the right place, and matches gxformat2 and Galaxy byte for byte on every realistic input. Findings are Low or Nit.

## Commands and results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile && pnpm -r build` | OK |
| `make check` (lint, format, typecheck, schema checksums) | exit 0 |
| `cmp` of `trs_descriptor_urls.yml` and `synthetic-linked-trs-subworkflows.ga` against gxformat2#263 | **byte-identical** |
| `GXFORMAT2_ROOT=<gxformat2 pr/263> make check-sync-workflow-fixtures check-sync-workflow-expectations` | expectations: in sync; native fixtures: OK; one `ERROR: source not found .../examples/format2/draft`. This error is environmental and predates the PR: the gxformat2#263 tree (based on upstream main) has no `format2/draft/`, which exists only on the `draft_workflows` branches. It doesn't involve the new files. |
| `vitest run test/expansion.test.ts test/declarative-normalized.test.ts` (schema) | 413 passed, 1 skipped |
| `vitest run test/url-resolver.test.ts` (cli) | 6 passed |
| Red check: `url-resolver.ts` reverted to `origin/main` | 5 of 6 fail (only "plain URLs unchanged" passes). Confirms the PR's red-to-green claim. |
| Red check: `_quotePlus` replaced with bare `encodeURIComponent` | shared case fails on `trs_special_chars` (`o'rg`, `%20(beta)!*` not escaped). Confirms the claim. |
| Differential probe of TS `trsDescriptorUrl` vs Python `trs_descriptor_url` on 18 edge inputs | 15 identical; 3 differ, all invalid-UTF-8 escapes (see L1) |

Probe inputs covered: `+`, `%2B`, literal space, quote_plus-encoded id fed back in, bare `%`, `%zz`, `%FF`, a valid run followed by an invalid byte, CESU surrogate bytes, emoji (surrogate pair), `%2523` (double-encoded `#`), `?query` after the version, a version containing a slash, a version containing a space, a trailing `/PLAIN-GALAXY/descriptor`, repeated `/versions/`, a leading space, and an uppercase scheme. `+` stays literal and becomes `%2B`, `~` is kept, `!'()*` are escaped, and surrogate pairs encode correctly. On every one of those, TS matches Python.

## Findings

### L1 (Low): the `_unquote` comment understates the divergence

`packages/schema/src/workflow/normalized/expanded.ts:78-91`

The comment says an invalid-UTF-8 run "is left encoded". That's true of `_unquote` alone. But `_quotePlus` then escapes the `%`, so the final URL is double-encoded. The fallback also applies to the **whole run**, so valid bytes next to an invalid one lose their decoding too:

| input tool id | TS | Python |
|---|---|---|
| `%FF` | `%25FF` | `%EF%BF%BD` |
| `caf%C3%A9%FF` | `caf%25C3%25A9%25FF` | `caf%C3%A9%EF%BF%BD` |
| `%ED%A0%80` | `%25ED%25A0%2580` | `%EF%BF%BD%EF%BF%BD%EF%BF%BD` |

Neither output fetches anything useful, and real TRS ids never carry invalid UTF-8. Keeping the divergence is fine. Using `TextDecoder` would mean adding a host global, and this package deliberately avoids those (see the `structuredClone` note at `stateful-validate.ts:64`). The fix is to make the comment accurate:

```ts
/**
 * Percent-decode `%XX` runs (Python's `unquote`). A run that isn't valid UTF-8
 * is left as-is, so it ends up double-encoded (`%25XX`) where Python would
 * emit U+FFFD. Real TRS ids are ASCII; parity there isn't worth a TextDecoder.
 */
```

Shared fixture: not affected. Please don't add an invalid-UTF-8 case to the shared expectations, since TS would fail it by design.

### L2 (Low): the changeset should bump schema as `minor`

`.changeset/fix-trs-url-resolver.md:2`

`trsDescriptorUrl` is a new public export of `@galaxy-tool-util/schema` (`src/index.ts:186-187`). The repository's precedent for new schema exports is `minor`; see `.changeset/gxformat2-layout-and-lint-sync.md`. That pending changeset already bumps schema minor, so the release outcome doesn't change, but each changeset should be correct on its own.

```md
"@galaxy-tool-util/schema": minor
"@galaxy-tool-util/cli": patch
```

### L3 (Low): error messages drop the original ref, and a non-JSON body still gives a bare error

`packages/cli/src/commands/url-resolver.ts:49,53`

- `Failed to fetch ${url}` now names the rewritten descriptor URL. A user debugging a 404 sees a URL that isn't in their workflow. Name both.
- If a TRS server or proxy returns 200 with an HTML body, `response.json()` throws a bare `SyntaxError` with no URL. That's the same class of unhelpful crash the PR fixes for a missing `content`.
- Typing nit: `as Record<string, unknown>` followed by `descriptor?.content` contradicts itself. The cast says the value can't be null, but the `?.` handles null.

```ts
const source = descriptorUrl ? `${url} (TRS ${ref})` : url;
if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`);

if (descriptorUrl) {
  let descriptor: { content?: unknown } | null;
  try {
    descriptor = (await response.json()) as { content?: unknown } | null;
  } catch {
    throw new Error(`TRS descriptor at ${source} is not JSON`);
  }
  if (typeof descriptor?.content !== "string") {
    throw new Error(`TRS descriptor at ${source} has no string 'content' field`);
  }
  return yaml.parse(descriptor.content) as Record<string, unknown>;
}
```

If you adopt this, update the expected message in `test/url-resolver.test.ts:44-49`. That's a message change only; the assertion stays as strong.

Related cross-repository asymmetry: gxformat2#263's `default_url_resolver` still does `descriptor["content"]`, which raises a bare `KeyError`. The two resolvers now fail differently on the same bad response. Consider adding the same guard there; that's for the reviewer of #263.

### N1 (Nit): a few tests duplicate the shared case

- `packages/schema/test/expansion.test.ts:99` (`returns null for non-TRS URLs`) repeats the fixture's `plain_url: null`. Drop it. The multi-byte UTF-8 test above it adds value and should stay.
- `packages/cli/test/url-resolver.test.ts:30` runs `it.each` over three URL forms. That re-tests the `trsDescriptorUrl` mapping, which the shared fixture already pins. At the resolver level, one TRS case shows the descriptor URL is what gets fetched. Keeping all three is cheap, so this is optional.
- The end-to-end `expandedNative` test (`:58`) and the missing-content test are the valuable ones. No assertions were weakened anywhere.

### I1 (Info, shared behavior, no action in this PR): parity limitations inherited from Galaxy

All three implementations (Galaxy `trs_proxy`, gxformat2, this PR) behave identically here. That parity is the point of the shared fixture, so these shouldn't diverge in TS alone:

- **Versions with `/` or `?`.** `version_id` is `[^/]+` and is never encoded. `.../versions/feature/branch` silently fetches version `feature`, and `.../versions/v1?x=1` builds `.../versions/v1?x=1/GALAXY/descriptor`. Dockstore versions are git refs, and those can contain `/`.
- **Encoding isn't idempotent for spaces.** An id already encoded with quote_plus (`repo+%28beta%29`) round-trips to `repo%2B%28beta%29`, because `unquote` (not `unquote_plus`) leaves `+` literal. So "already-encoded ids map to the same URL" holds for `%XX` encoding, not for quote_plus `+`. Also, `+` in a path segment is a literal plus to most servers, so `quote_plus` is the wrong encoder for paths. Galaxy made that choice and everyone follows it.
- If anyone fixes these, the fix should land in Galaxy and gxformat2 first, with a new shared expectation case, then be ported here.

## Reuse, placement and siblings

- **Placement.** `trsDescriptorUrl` next to `isTrsUrl` in `expanded.ts` mirrors gxformat2, where `trs_descriptor_url` sits beside `is_trs_url` in `options.py`. Exporting it from the schema index is consistent with how `isTrsUrl` is exported. `@galaxy-tool-util/core` has Tool Shed TRS URL helpers (`core/src/cache-http/cache-to-trs.ts:30-36`, `core/src/client/trs.ts:62`) that use plain `encodeURIComponent`. Schema can't import from core, since core depends on schema. Those helpers handle `owner~repo~tool` ids, where the two encoders agree, so there's no real duplication and no reason to merge them. Keeping `_quotePlus` and `_unquote` private is right. Promote them to a schema util only if a second caller appears.
- **Regex.** Named groups mirror Python's and Galaxy's. `isTrsUrl` keeps its behavior but has no internal callers now. It's still public API, so leave it.
- **Sibling consumers.** In this monorepo, `packages/gxwf-web/src/workflows.ts` (4 call sites) and every gxwf CLI command use `createDefaultResolver`, so they all get the fix. `galaxy-workflows-vscode` (origin/main `60d99c9`) and the Python `gxwf-web` don't resolve linked subworkflows at all, so nothing diverges.
- **Fetch surface.** Unchanged. The host still comes from the ref; only the path is rewritten.
- **Comments.** Proportionate. The `trsDescriptorUrl` doc block is about 9 lines and earns them (it explains why decode then re-encode). The divergence note is 2 lines and only needs the wording fix in L1.
- **Return type.** `string | null` matches Python's `str | None` and the fixture's `value: null`. That's the right choice here, not `undefined`.

## Shared cross-language fixture and expectations

- `trs_descriptor_urls.yml` and `synthetic-linked-trs-subworkflows.ga` are byte-identical to gxformat2#263.
- The `linked_subworkflow_descriptor_urls` op matches the Python op's filter: `type == "subworkflow"` and a string `content_id`, keyed by label.
- No finding in this review requires a change to the shared files. Optional: a `+`/`%2B` case (for example, `#workflow/a+b` → `%2Fa%2Bb`) would pin the literal-plus behavior across languages. It would have to land in gxformat2 first and then be synced.
