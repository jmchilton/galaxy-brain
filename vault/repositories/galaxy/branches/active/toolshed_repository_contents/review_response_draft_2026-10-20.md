Thanks, this was useful. I've retargeted to `dev` <!-- John: one line on why dev rather than 26.2, given the follow-up comment said 26.2 is fine -->.

**Listing sizes.** Dropped `size` from `RepositoryFileEntry` (99053330762). `list_manifest` now walks only the manifest. A new unit test fails if a listing opens any file. On a synthetic 3000-file revision it went from 390 ms with 3000 filelog opens to 3.1 ms with none. The contents response still reports size, which is the only place the UI shows it. The copy-metadata caveat in the schema is gone too.

**Shared cache.** Agreed that `Cache-Control: public` alone doesn't protect against a crawler that fetches each URL once, and I've taken "needs no nginx change" out of the description. These routes suit `proxy_cache` well:

- Every 200 is keyed on an immutable 12-char hash, with a strong `ETag` and `max-age=86400`.
- The files routes don't touch the session, so anonymous responses carry no `Set-Cookie`. That's now asserted in `test_repository_files_anonymous`. Logged-in and anonymous users get the same body.
- 404s carry no public `Cache-Control`, so a cache won't hold them by default.
- `Vary: Origin` gives one variant per origin. The shed's own same-origin GETs and crawlers send no `Origin`, so in practice that's one variant plus one per cross-origin client.

Something like `location ~ ^/api/repositories/[^/]+/revisions/[0-9a-f]{12}/files { proxy_cache shed_files; proxy_cache_valid 200 1d; proxy_cache_lock on; ... }`. I'm happy to work out the exact block with whoever runs the main shed before this is deployed there.

**Old `/repos/<owner>/<name>/file/tip` links.** On the main shed nginx answers these with 403 before the app sees them, so an in-app redirect only helps once nginx passes anonymous `/repos/*/*/file/*` through. If that's acceptable, the hg controller could send anonymous `file/<rev>[/<path>]` views to `/repositories/<id>/contents?file=<path>`, with `revision=` set when `<rev>` is a downloadable hash. I'd rather do that as a follow-up, since it touches the route that serves `hg clone`.

**Login prompt for 26.2.** <!-- John: is a ~10-line "Log in to browse contents / changelog" PR coming against release_26.2? yes/no -->

**Core `allow_cors` changes.** They're two separate commits, `a7bffd9cce8` (preflights don't inherit `response_model`) and `a0347a08d9f` (`Vary: Origin`), and I can split them into their own PR if you'd prefer.

**`RepositoryContentsBrowser` props.** Still on the deferred list.
