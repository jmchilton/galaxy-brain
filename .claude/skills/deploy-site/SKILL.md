---
name: deploy-site
description: Build the galaxy-brain Astro site locally and rsync it to jmchilton.net (Linode). Use when asked to deploy, publish, or push the site to jmchilton.net, or to refresh galaxy-brain.jmchilton.net once it is self-hosted.
---

# Deploy site to jmchilton.net

Builds on this machine and rsyncs the static output. Don't build on the server: it has 3 CPUs, 5.8 GB RAM and no swap, and it already runs Claude sessions and OpenClaw.

## Run

```sh
make site-deploy ARGS=--dry-run   # build + show what rsync would change
make site-deploy                  # build origin/main + sync
```

`scripts/deploy_site.sh` options:
- default: fetch, build `origin/main` in a temporary detached worktree, then remove it. The main checkout is shared by other sessions and has uncommitted notes, so it isn't built by default.
- `--ref <ref>`: build another ref.
- `--working-tree`: build the current checkout as-is, uncommitted files included. Only use when the user asks for it.
- env `DEPLOY_HOST` (default `deploy@jmchilton.net`), `DEPLOY_PATH` (default `/var/www/galaxy-brain.jmchilton.net`). Point `DEPLOY_PATH=galaxy-brain-staging` at the deploy user's home for a trial run.

The build takes about 3–4 minutes (about 7.5k pages). rsync compares checksums (`-c`), because Astro rewrites every file on each build; the first sync sends about 70 MB.

## Before

- Run `make site-test` if `site/` changed since the last deploy.
- Run `ssh -o BatchMode=yes deploy@jmchilton.net true` to check access. If ssh hangs, port 22 may be blocked on the current network.

## After

- `curl -sI https://galaxy-brain.jmchilton.net/` → 200.
- Spot-check a note page and search (pagefind), e.g. `/catalog/`.
- Report the deployed SHA, files transferred and bytes sent from the rsync `--stats` output.

## Gotchas

- Don't symlink `site/node_modules` into a worktree. Astro 5 caches content in `node_modules/.astro/data-store.json`, so a shared cache leaks the main checkout's state; there, gitignored screenshots exist and the clean build fails with `ImageNotFound`. The script clones deps with `cp -c` (macOS copy-on-write) and deletes `.astro`.
- `--delete-after --delay-updates` swap files in at the end, but this isn't atomic per page. Visitors can briefly see a mix of old and new pages; acceptable for this site.
- Creating the vhost, the web root and the TLS cert needs sudo (password); that's a one-time step for the user. See `JMCHILTON_NET_HOSTING_PLAN.md`.
