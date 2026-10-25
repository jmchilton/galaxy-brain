# Sourced by idle_deps_{estimate,clean}.sh.

# Usage parse: N [ROOT...]; default roots are galaxy branch and PR worktrees.
idle_deps_args() {
  N=${1:?usage: $0 DAYS [ROOT...]}; shift
  roots=("$@")
  (( ${#roots} )) || roots=(~/projects/worktrees/galaxy/branch ~/projects/worktrees/galaxy/pr)
  now=$(date +%s); cutoff=$(( now - N*86400 ))
}

# Newest of last commit, index mtime and HEAD mtime; git status can bump the index.
idle_deps_last_activity() {
  local wt=$1 gitdir commit idx head last
  gitdir=$(git -C $wt rev-parse --absolute-git-dir 2>/dev/null) || return 1
  commit=$(git -C $wt log -1 --format=%ct 2>/dev/null || echo 0)
  idx=$(stat -f %m $gitdir/index 2>/dev/null || echo 0)
  head=$(stat -f %m $gitdir/HEAD 2>/dev/null || echo 0)
  last=$(( commit > idx ? commit : idx )); (( head > last )) && last=$head
  echo $last
}

# Prints rebuildable dependency dirs present in a worktree.
idle_deps_targets() {
  local t
  for t in $1/client/node_modules $1/node_modules $1/.venv; do [[ -d $t ]] && echo $t; done
}

# Calls $1 WORKTREE IDLE_DAYS TARGET... for each idle worktree with dependency dirs.
idle_deps_each() {
  local cb=$1 root wt last targets
  for root in "${roots[@]}"; do
    for wt in $root/*(N/); do
      [[ -e $wt/.git ]] || continue
      last=$(idle_deps_last_activity $wt) || continue
      (( last < cutoff )) || continue
      targets=(${(f)"$(idle_deps_targets $wt)"})
      (( ${#targets} )) || continue
      $cb $wt $(( (now-last)/86400 )) "${targets[@]}"
    done
  done
}

idle_deps_kb() { du -sk "$@" 2>/dev/null | awk '{s+=$1} END {print s+0}'; }
