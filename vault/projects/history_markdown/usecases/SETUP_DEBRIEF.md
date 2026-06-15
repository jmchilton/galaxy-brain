# Setup Debrief — local Galaxy + tools + Docker + MCP

Debrief of standing up a local Galaxy on this machine (Apple Silicon / macOS, Docker Desktop) to drive the history_markdown use cases: install the use-case Tool Shed tools, run them in Docker/BioContainers, and expose the notebooks MCP. Done in a single session 2026-06-12.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/history_pages` (has `mcp_notebooks` + PR #22860 merged).

## Final state

| Piece | State |
|-------|-------|
| Galaxy | running on `http://localhost:8080`, v26.2.dev0, admin `jmchilton@gmail.com` |
| Tools | 18 Tool Shed repos installed (the 3 use-case YAMLs), 0 errors |
| Containers | 18 repos → 82 tool ids → **24 unique BioContainer images, 0 unresolved**, all pre-pulled |
| Docker jobs | enabled; verified end-to-end (bedtools ran in `quay.io/biocontainers/bedtools` and returned correct output) |
| MCP | `enable_mcp_server: true`, mounted at `/api/mcp`, registered in Claude Code as `galaxy-notebooks`, `connect` returns `connected: true` |

Resource footprint: ~22 GB of BioContainer images (amd64), 269 MB of installed tool wrappers in `database/shed_tools`.

## What it took, in order

### 1. Config — `config/galaxy.yml` (edited in place)
The instance already had `admin_users: jmchilton@gmail.com` and the AI key. Added this block under `galaxy:`:

```yaml
  galaxy_infrastructure_url: http://localhost:8080
  enable_mcp_server: true
  conda_auto_install: false
  enable_mulled_containers: true
  job_config:
    runners:
      local:
        load: galaxy.jobs.runners.local:LocalJobRunner
        workers: 4
    execution:
      default: docker_dispatch
      environments:
        docker_dispatch:
          runner: local
          docker_enabled: true
```

- `conda_auto_install: false` + `enable_mulled_containers: true` → resolve tools to containers, not conda envs.
- The inline `job_config` with one `docker_enabled` environment is permissive: containerized tools run in Docker, builtin tools (upload, etc.) still run on the host. No `require_container`, so nothing is forced.
- `galaxy_infrastructure_url` set so MCP/API responses build absolute URLs correctly.
- Default container resolvers + `$defaults` docker volumes work out of the box on macOS — the worktree lives under `/Users`, which Docker Desktop shares by default.
- Galaxy auto-created `config/shed_tool_conf.xml` (tool_path → `database/shed_tools`) on first start; did **not** need to set `tool_config_file`.

### 2. Ephemeris — installed ISOLATED
```bash
uv tool install ephemeris      # puts shed-tools etc. on ~/.local/bin, in its own env
```
Do **not** `uv pip install ephemeris` into Galaxy's `.venv` (see Snag #1).

### 3. Start Galaxy
```bash
cd <worktree>
source .venv/bin/activate
export PYTHONPATH="$(pwd)/lib"
NO_PROXY=* GALAXY_SKIP_CLIENT_BUILD=1 sh run.sh --skip-wheels > /tmp/galaxy_history_pages.log 2>&1
```
Note: **no** `GALAXY_RUN_WITH_TEST_TOOLS` (that mode hides installed shed tools). Client dist already built, so `GALAXY_SKIP_CLIENT_BUILD=1` is safe and fast. `run.sh` runs under gravity and returns once gunicorn+celery are supervised.

Stop:
```bash
.venv/bin/galaxyctl shutdown ; pkill -f 'gunicorn galaxy.webapps' ; pkill -f 'celery --app galaxy.celery'
```

### 4. Admin API key
The admin user (id 1) already existed with a key. Retrieve:
```bash
sqlite3 database/universe.sqlite "select key from api_keys where user_id=1 order by create_time desc limit 1;"
```
(If a fresh DB ever lacks the user, register `jmchilton@gmail.com` — it's in `admin_users` so it becomes admin automatically — via the `galaxy-register-user` skill, then read the key.)

### 5. Install tools (containers only)
```bash
shed-tools install -g http://localhost:8080 -a <KEY> \
  -t mrsa-mobile-amr-tools.yml --skip-install-resolver-dependencies
# repeat for tal1-candidate-genes-tools.yml, atac-differential-tools.yml
```
`--skip-install-resolver-dependencies` = don't build conda envs (we use Docker). Wrapper-only installs are seconds each.

### 6. Resolve + pre-pull containers
Resolve every installed tool to its image (admin endpoint, no pull):
```
GET /api/container_resolvers/toolbox?tool_ids=<comma-separated>   # tool_ids optional; filters
```
Each entry's `status.container_description.identifier` is the `quay.io/biocontainers/...` image. 82 tools collapsed to 24 unique images, 0 unresolved. Then pre-pulled each (Apple Silicon → amd64):
```bash
docker pull --platform linux/amd64 <image>
```
At job time the `cached_mulled` resolver finds these local images and reuses them (no re-pull). Galaxy can also pull them itself via `POST /api/container_resolvers/toolbox/install`.

### 7. MCP
`enable_mcp_server: true` (step 1) mounts a stateless Streamable-HTTP FastMCP sub-app at `/api/mcp`. `fastmcp` was already in the venv (3.2.4; branch pins 3.4.2 but the imports the code uses work fine). Registered in Claude Code:
```bash
claude mcp add --transport http galaxy-notebooks http://localhost:8080/api/mcp/
```
**Auth is per-tool**: every MCP tool takes an `api_key` argument (no transport header/secret). The agent passes the admin key on each call; `connect(api_key)` validates it.

## Snags hit (and fixes)

1. **Ephemeris shadowed Galaxy's source tree.** `uv pip install ephemeris` into Galaxy's `.venv` pulled `galaxy-util`/`galaxy-tool-util` (v26.0.1) into site-packages, which shadowed the worktree's `lib/galaxy/*`. Galaxy died at startup: `ImportError: cannot import name 'now' from 'galaxy.util'`. Fix: uninstall those 4 packages from the venv, install ephemeris isolated via `uv tool install`.
2. **DB behind the branch's migrations.** Fresh-ish worktree DB → `OutdatedDatabaseError: version b75f0f4dbcd4, code expects 28885b317f78`. Fix: `sh manage_db.sh upgrade` (applied the notebook/tool_request migrations), then start.
3. **Trailing-newline `while read` dropped one image.** A Python-written image list joined with `"\n".join(...)` has no final newline, so the bash `while read` loop silently skipped the last line (staramr). Pulled it explicitly; 24/24 present.

## Verification done
- `bedtools_sortbed` on a tiny BED → job `state=ok`; Galaxy log shows `docker run ... quay.io/biocontainers/bedtools:2.31.1--h13024bc_3`; output correctly sorted. Proves install → container resolution → Docker execution → correct result.
- MCP `connect` → `{"connected": true, user: jmchilton@gmail.com, server 26.2}`; `list_histories` sees the smoke-test history. Proves MCP transport + auth + Galaxy access.

## Caveat: Apple Silicon
BioContainers are linux/amd64-only, so tools run under emulation — correct but slow. Fine for demoing the use-case flows; heavy tools (bakta, staramr, integron_finder) will be sluggish.
