Set up MACHINE for agent work. MACHINE is an ssh target such as `chickenstraws` or `jmchilton.net` (entries in John's `~/.ssh/config`). If none is given, use this machine. Run each step over `ssh MACHINE`.

Prefer user-level installs under `~/.local/bin`. Ask John before using `sudo` or the system package manager.

## git and make

They only need to be installed. If either is missing, ask John to approve installing it with the system package manager, e.g. `sudo apt-get install -y git make`.

## uv

- Missing: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Present: `uv self update`

## gh

- Missing or older than the latest release: install the latest `gh` binary from https://github.com/cli/cli/releases into `~/.local/bin`. Match the architecture to `uname -m`.
- Run `gh auth status`. If it isn't logged in, ask John to run `ssh -t MACHINE 'gh auth login && gh auth setup-git'` in a terminal, because login is interactive.
- If `~/.ssh/known_hosts` has no `github.com` entry, add GitHub's host keys from `gh api meta --jq '.ssh_keys[]'`. Then check that `ssh -T git@github.com` authenticates.

## git config

1. Copy John's `~/.gitconfig` and `~/.config/git/ignore` from this machine with `scp`. If the remote files exist and differ, show the diff and ask first.
2. On MACHINE, remove every `credential` section with `git config --global --remove-section`. They point at macOS paths.
3. Run `gh auth setup-git`.
4. If `interactive-rebase-tool` isn't installed there, drop `sequence.editor` and the `interactive-rebase-tool` section.

## herdr

- Missing: `curl -fsSL https://herdr.dev/install.sh | sh`
- Present: `herdr update`. It stops a running herdr server, so if one is running, ask John first.
- If `herdr machine list` on this machine doesn't list MACHINE, ask John to run `! herdr machine add MACHINE`, so agents launched there show in his local herdr.

## Node

Use [nvm](https://github.com/nvm-sh/nvm) with the current LTS release.

1. If nvm is missing, run the install script from nvm's latest release.
2. Run `nvm install --lts && nvm alias default 'lts/*'`.

3. Plain `ssh MACHINE <command>` shells stop reading `~/.bashrc` early, at its interactive check. Move `export PATH="$HOME/.local/bin:$PATH"` and nvm's `NVM_DIR`/`nvm.sh` lines above that check, so tools resolve there too.

## ghwt

Install from `jmchilton/ghwt` main, not npm, because the npm release lags main. `ghwt --version` doesn't change between commits, so report the commit instead.

1. Clone `https://github.com/jmchilton/ghwt.git` to `~/projects/repositories/ghwt`. If the clone already exists, run `git pull --ff-only` on main.
2. In the clone, run `npm install && npm run setup`.
3. Check that `ghwt --help` runs.
4. If `~/.ghwtrc.json` is missing, run `ghwt init --vaults-path ~/projects/obsidian-vaults --vault-name ghwt`.

## galaxy-brain

1. Clone `git@github.com:jmchilton/galaxy-brain.git` to `~/projects/repositories/galaxy-brain`. If the clone already exists, pull main; if it has local changes, ask John first.
2. Check that MACHINE's entry in [ENVIRONMENTS.yml](ENVIRONMENTS.yml) points at its `vault/`.

## Claude Code

- Missing: `curl -fsSL https://claude.ai/install.sh | bash`
- Present: `claude update`
- If `claude auth status` shows it isn't logged in, ask John to run `! ssh -t MACHINE claude` and `/login`.

## Codex

- Install or update with `npm install -g @openai/codex@latest`.
- If `codex login status` shows it isn't logged in, ask John to run `! ssh -t MACHINE codex login --device-auth`.
- The first codex launch in the galaxy-brain clone stops on a trust prompt. Accept it over ssh with `herdr pane send-keys <pane> Enter`.

## Report

End with a table showing each tool's version before and after, plus the ghwt commit. List anything you skipped or that is waiting on John.
