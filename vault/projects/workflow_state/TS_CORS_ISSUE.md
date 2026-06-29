# ToolShed CORS — blocker for browser-based tool resolution

## Summary

The Galaxy Workflows VS Code extension running in the **browser** (vscode.dev /
github.dev / vscode-test-web) cannot fetch tool metadata from the Galaxy
ToolShed because **ToolShed responds without an `Access-Control-Allow-Origin`
header**. The browser's same-origin policy then blocks every cross-origin
`fetch()` the in-browser language servers make, even though the requests
themselves are valid and succeed from `curl` / Node.

This is **not** a bug in the extension. It is a server-side gap in ToolShed. The
desktop (Node) extension is unaffected because Node `fetch` does not enforce
CORS.

## Evidence

`curl` against ToolShed returns 200 with JSON:

```
$ curl -s -o /dev/null -w "%{http_code}\n" \
    "https://toolshed.g2.bx.psu.edu/api/tools/iuc~kraken2~kraken2/versions/2.1.1+galaxy1"
200
```

The same URL from the in-browser server worker fails:

```
[DEBUG] toolshed fetch failed (https://toolshed.g2.bx.psu.edu) for
        iuc~kraken2~kraken2: Failed to fetch
        @ .../server/gx-workflow-ls-native/dist/web/nativeServer.js
```

`Failed to fetch` / `net::ERR_FAILED` is the browser surfacing a CORS rejection:
the preflight/response has no `Access-Control-Allow-Origin`, so the response is
not readable by the page and the promise rejects.

Confirming it is purely CORS: placing a tiny reverse proxy in front of ToolShed
that adds `Access-Control-Allow-Origin: *` makes every one of these fetches
succeed (200) from the browser, with no other change.

## What breaks (browser only)

Every feature that needs a *live* fetch from ToolShed:

- **Auto tool resolution** — `populateCache()` on document open/change (TRS
  versions + tool definition fetch).
- **Manual "Populate Tool Cache"** command.
- **Tool state validation / completion** for any tool not already in the
  IndexedDB cache (validation/completion read from cache; the cache can only be
  filled by a successful fetch).
- **"Insert Tool Step…"** ToolShed search (`/api/tools?q=…`) and the subsequent
  step-skeleton fetch.

Already-cached tools keep working in the browser across reloads because the
IndexedDB tool cache (`galaxy-tool-cache-v1`) persists. This masks the problem:
a workspace whose tools were cached in a prior (working) session still
validates, while *new* lookups silently return nothing.

## Endpoints that must be CORS-enabled

All under the ToolShed origin (default `https://toolshed.g2.bx.psu.edu`). These
are the request shapes the extension's `@galaxy-tool-util/{core,search}` layer
issues:

- `GET /api/tools/{owner}~{repo}~{toolId}/versions/{version}` — TRS tool versions
- `GET /api/tools?q={query}[&tool_help=false]` — tool search
- `GET /api/repositories?owner={owner}&name={repo}` — repo lookup
- `GET /api/repositories/get_ordered_installable_revisions?owner=…&name=…` — revisions
- (tool definition fetch used to populate the cache)

For the browser client a minimal, safe policy is sufficient — these are public,
unauthenticated, read-only JSON endpoints:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: *
```

and a `204` response to `OPTIONS` preflight on the same paths. No credentials
are sent, so `Access-Control-Allow-Origin: *` (rather than echoing Origin +
`Allow-Credentials`) is appropriate and avoids the credentialed-wildcard
restriction.

## Workarounds (until ToolShed sets CORS)

1. **CORS reverse proxy** (used for the capture/demo work). Forwards all paths to
   ToolShed and adds the headers above; point the extension at it via
   `galaxyWorkflows.toolShed.url`. Dev/demo only — not shippable.

   ```js
   // minimal node proxy on :8765 -> https://toolshed.g2.bx.psu.edu
   // adds Access-Control-Allow-Origin: *, handles OPTIONS preflight
   ```

2. **`tool-cache-proxy`** (galaxy-tool-util package) — a same-origin tool source
   the web build can hit without CORS. The right long-term answer for hosted web
   deployments if ToolShed CORS can't be relied on.

3. **Pre-warm the cache** — populate the IndexedDB cache from a context that can
   reach ToolShed, then operate offline. Brittle; only covers known tools.

## Recommended fix

Enable CORS on the public read-only ToolShed API (headers above). This unblocks
the browser extension directly with no client changes and no proxy. File against
the ToolShed (galaxyproject) — it benefits any browser-based ToolShed API
consumer, not just this extension.

## Caveats / notes

- `galaxyWorkflows.toolShed.url` is read at server init and on
  `onConfigurationChanged` (the server re-`configure()`s its
  `ToolInfoService`/`ToolSearchService`), so the proxy URL can be applied without
  a reload — *if* the setting actually persists. In throwaway `vscode-test-web`
  instances User `settings.json` may not survive a page reload, which can make it
  look like the setting "didn't take" — verify the live fetch URL in the server
  worker logs.
- Bundled tool-util versions at time of writing: extension pins
  `@galaxy-tool-util/{core,schema,search}` `1.8.0` in `package.json` but the
  resolved `search` was `1.7.2`; worth aligning.
