#!/bin/zsh
# Estimate space from deleting node_modules/.venv in worktrees idle > DAYS. Read-only.
# Usage: idle_deps_estimate.sh DAYS [ROOT...]
# du overcounts uv clones and pnpm hard links; real savings are lower.
source ${0:A:h}/idle_deps_common.sh
idle_deps_args "$@"
total=0; count=0
row() {
  local wt=$1 idle=$2; shift 2
  local kb=$(idle_deps_kb "$@")
  (( total += kb, count += 1 ))
  printf "%-55s %5d %8d\n" ${wt#$HOME/projects/worktrees/} $idle $(( kb/1024 ))
}
printf "%-55s %5s %8s\n" WORKTREE IDLE_D DU_MB
idle_deps_each row
printf "\n%d worktrees idle > %d days; du total ≈ %.1f GB\n" $count $N $(( total/1048576.0 ))
