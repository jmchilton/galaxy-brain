# Self-hosting the site on jmchilton.net

Status: done (2026-10-28). `galaxy-brain.jmchilton.net` is served by nginx on the jmchilton.net Linode. GitHub Pages and the Actions deploy are gone; old `jmchilton.github.io/galaxy-brain/*` links 404 (accepted).

## Setup

- DNS (Namecheap): `galaxy-brain` CNAME → `jmchilton.net.` (A `173.255.213.165`).
- Linode: web root `/var/www/galaxy-brain.jmchilton.net` (owned by `deploy`); vhost `/etc/nginx/sites-available/galaxy-brain.jmchilton.net` (symlinked into `sites-enabled`), modeled on the jmchilton.net vhost. `_astro/` is cached for a year, `pagefind/` for an hour.
- TLS: Let's Encrypt via `certbot --nginx`; the existing `certbot.timer` renews it. Certbot also added the HTTP→HTTPS redirect.
- The server (3 CPUs, 5.8 GB, no swap; also runs Claude sessions and OpenClaw) isn't a build host. Builds happen on a laptop.

## Deploy

`make site-deploy` (`scripts/deploy_site.sh`; skill `deploy-site`): builds `origin/main` in a temporary worktree, then rsyncs `site/dist/` to the web root with checksums. Updates happen only when someone runs it.

## Rollback

Point `galaxy-brain` back to CNAME `jmchilton.github.io.`, restore `.github/workflows/deploy.yml` from git, re-enable Pages (source: Actions), and set the custom domain again.
