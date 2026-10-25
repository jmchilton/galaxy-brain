#!/bin/zsh
# Delete node_modules/.venv in worktrees idle > DAYS; skips worktrees with live processes.
# Usage: idle_deps_clean.sh [--dry-run] DAYS [ROOT...]
# Rebuild with the galaxy-bootstrap skill (or uv sync / pnpm install).
source ${0:A:h}/idle_deps_common.sh
dry=0; [[ $1 == --dry-run ]] && { dry=1; shift; }
idle_deps_args "$@"
busy=(${(f)"$(lsof -a -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sort -u)"})
avail() { df -k ~ | awk 'NR==2 {print $4}'; }
before=$(avail); cleaned=0; skipped=0
clean() {
  local wt=$1 idle=$2 c; shift 2
  for c in "${busy[@]}"; do
    [[ $c == $wt || $c == $wt/* ]] && { echo "SKIP busy  ${wt#$HOME/projects/worktrees/}"; (( skipped += 1 )); return; }
  done
  echo "CLEAN ${idle}d ${wt#$HOME/projects/worktrees/}: ${(j: :)${@#$wt/}}"
  (( dry )) || rm -rf -- "$@"
  (( cleaned += 1 ))
}
idle_deps_each clean
after=$(avail)
printf "\n%d cleaned, %d skipped busy; freed %.1f GB (df)%s\n" $cleaned $skipped \
  $(( (after-before)/1048576.0 )) "$( (( dry )) && echo ' [dry run]')"
