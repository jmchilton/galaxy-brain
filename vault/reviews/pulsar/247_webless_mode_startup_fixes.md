# PR 247 — Small fix for starting pulsar in webless mode

**Repo:** galaxyproject/pulsar · **PR:** [#247](https://github.com/galaxyproject/pulsar/pull/247) (gregvonkuster, opened 2021-03-02) · **State:** OPEN, CONFLICTING · **Commits:** `702d02f`, `2b16edd` · **Files:** `pulsar/main.py` +1/-1, `scripts/pulsar` +3/-2 · **Reviewed:** 2026-09-14

## Conclusion

**Almost nothing in the patch itself.** All three hunks are obsolete — one fixes a crash that no
longer happens, one targets a branch that no longer exists, one is now a no-op. Do not rebase it.

**But the second commit was circling a real bug that is still live**, and greg never named it:
`scripts/pulsar` computes its own location in a way that only works when it is invoked through the
`run.sh` symlink. Invoke the script by its real path and both the config-file default and the local
webless launch break. That is the salvage.

## Hunk-by-hunk

### 1. `pulsar/main.py` — `if ini_path` → `if os.path.exists(ini_path)` — **obsolete**

Greg's report: `pulsar --mode webless` against an `--mq` config dir died with
`FileNotFoundError: '~/pulsar/server.ini.sample'`, because `pulsar-config --mq` doesn't write a
`server.ini` but `ini_path` gets set to one anyway.

Both halves of that premise still hold. `_print_server_ini_info` (`pulsar/scripts/config.py:322`)
still skips `server.ini` when `args.mq`, and `find_ini` (`pulsar/main.py:244`) still ends with a bare
`return guess` — returning `"server.ini.sample"` even when the `os.path.exists` loop matched nothing:

```python
for guess in ["server.ini", "server.ini.sample"]:
    ini_path = os.path.join(config_dir, guess)
    if os.path.exists(ini_path):
        return ini_path

return guess          # <- the loop variable, unconditionally
```

What changed is the consumer. `load_app_configuration` no longer uses
`pulsar.util.pastescript.loadwsgi.ConfigLoader` — it was replaced by "Simple ini parsing without
loadwsgi dependencies" using `configparser`. **`ConfigParser.read()` silently ignores unreadable
files**, where `ConfigLoader` raised. The crash was fixed incidentally, by a migration that had
nothing to do with this PR.

Verified against `origin/master` with a config dir holding only `app.yml`:

```
ini_path resolved to: /tmp/…/server.ini.sample
exists: False
OK - load_app_configuration returned keys: ['config_dir', 'managers', 'message_queue_url']
message_queue_url: amqp://guest:guest@localhost:5672//
```

Missing ini, no crash, `app.yml` picked up correctly via the `elif ini_path:` →
`_find_default_app_config` path. Greg's guard would now be a pure no-op: skipping the read leaves
`local_conf = None → {}`, exactly what the read already produces from a file that isn't there.

Latent fragility worth recording, though: `find_ini` still hands back a path that does not exist, and
correctness now rests on `configparser`'s silence rather than on anything deliberate. A future
consumer that opens `ini_path` directly re-introduces greg's crash.

### 2a. `scripts/pulsar` — mode fallback `paster` → `webless` — **obsolete**

The `else MODE="paster"` greg edits is gone; master's chain ends `else MODE="gunicorn"`, and the
surviving `paster` branch is a deprecation shim that forwards to `pulsar-serve` anyway.

Worth noting the change would be undesirable even if it still applied. Falling back to `webless`
when no web server is on `PATH` means a plain `./run.sh` silently stops binding a port — the symptom
becomes "Pulsar is up but nothing can reach it" instead of a legible missing-dependency error.

### 2b. `scripts/pulsar` — delete `PROJECT_DIRECTORY=…` from the webless branch — **now a no-op**

In 2021 the line read `PROJECT_DIRECTORY=$PULSAR_SCRIPTS_DIR/..`, and `PULSAR_SCRIPTS_DIR` was never
set — so it clobbered a good value with `/..`. Deleting it was correct.

Master renamed the variable (`scripts/pulsar:147`, `PROJECT_DIRECTORY=$SCRIPTS_DIRECTORY/..`), which
now duplicates line 62 exactly. Deleting it is tidy but fixes nothing.

## The live bug underneath

`run.sh` is a **symlink** to `scripts/pulsar`, and `${BASH_SOURCE[0]}` does not resolve symlinks — it
reports the path as invoked. One location computation serves two invocation depths:

```bash
SCRIPTS_DIRECTORY="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/scripts"   # :61
PROJECT_DIRECTORY=$SCRIPTS_DIRECTORY/..                                        # :62
```

| invoked as | `SCRIPTS_DIRECTORY` | `PROJECT_DIRECTORY` | |
|---|---|---|---|
| `./run.sh` | `<repo>/scripts` | `<repo>` | correct |
| `scripts/pulsar` | `<repo>/scripts/scripts` | `<repo>/scripts` | wrong |

The trailing `/scripts` is only right for the symlink. Two verified consequences of running the real
path:

**Local webless launch fails.** `scripts/pulsar:147-152` does `cd $PROJECT_DIRECTORY` then
`python pulsar/main.py`:

```
scripts/pulsar: line 148: cd: <repo>/scripts/scripts/..: No such file or directory
Starting pulsar with command [python pulsar/main.py]
CWD=/tmp/…              <- cd failed, cwd never moved
target MISSING: pulsar/main.py
```

The failed `cd` does not abort the script (no `set -e`), so it launches from whatever directory the
user happened to be in. It only appears to work when that directory is already the repo root.

**Default config file points at nothing.** `scripts/pulsar:101` builds
`PULSAR_CONFIG_SAMPLE_FILE="${PROJECT_DIRECTORY}/server.ini.sample"`, and with no `server.ini` that
becomes `PULSAR_CONFIG_FILE`. `server.ini.sample` lives at the repo root, so:

```
./run.sh        -> pulsar-serve <repo>/scripts/../server.ini.sample          exists
scripts/pulsar  -> pulsar-serve <repo>/scripts/scripts/../server.ini.sample  MISSING
```

This is the same class of defect as `4b28bf8` ("Fix Pulsar configs so `./run.sh` just works out of
the box") — fixed for the symlink, still broken for the script.

The fix is one line: drop the `/scripts` suffix and derive `SCRIPTS_DIRECTORY` from the resolved
script location instead, so both entry points agree.

## Recommendation

Close #247 as superseded — the reported crash is gone and the shell hunks no longer apply. If the
`SCRIPTS_DIRECTORY` fix is worth doing, it is a fresh one-line PR, not a rescue of this branch;
there is no commit here worth preserving authorship on.

Adjacent, same file: [[480_daemon_flag_webless]] (webless branch dropping `"$@"`) and PR #487
(`--port` arg). If the `SCRIPTS_DIRECTORY` fix gets written, those three want coordinating — all
three touch the `webless` branch of this script.
