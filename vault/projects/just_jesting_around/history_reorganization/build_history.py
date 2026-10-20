#!/usr/bin/env python3
"""Reorganize three pinned lane histories, creating dangling objects only.

--prepare never changes refs, the repository index, or worktree files. Every
resulting lane must have exactly its original tree before the manifest is saved.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

BASE = "93b3c85e5320048b33bcc78f6f7767e06813f7e0"
LANES = [
    ("vitest_readability", "1358d37887996e552e0fac6467c8738865618d9a", "client/src/utils/parseBool.test.ts"),
    ("vitest_stories", "fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864", "client/src/components/BaseComponents/GDropdownItem.test.ts"),
    ("vitest_story_play", "3eaa09792d688138b2107ee436f99431f96de0d3", "client/src/components/BaseComponents/GDropdownItem.test.ts"),
]
ANCILLARY = [
    ("vitest_real_api_calls", "0277a85df3954d1f83856933991cc5df0b97865c"),
    ("vitest_readability_with_churn", "e8d2b3f06e4b7842d6afee6f356ffcb0a3c05dd7"),
]


class Repository:
    def __init__(self, root):
        self.root = root

    def git(self, *args, **kwargs):
        return subprocess.check_output(["git", "-C", self.root, *args], **kwargs)

    def tree(self, commit):
        result = {}
        for entry in self.git("ls-tree", "-rz", commit).split(b"\0"):
            if entry:
                metadata, path = entry.split(b"\t", 1)
                mode, kind, oid = metadata.decode().split()
                result[path.decode()] = {"mode": mode, "kind": kind, "oid": oid}
        return result

    def changes(self, left, right):
        return sorted(set(self.git("diff", "--name-only", "--no-renames", "-z", left, right).decode().strip("\0").split("\0")) - {""})

    def history(self, left, right):
        data = self.git("log", "--reverse", "--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%B%x1f", "--name-only", left + ".." + right).decode()
        result = []
        for record in data.split("\x1e"):
            if not record.strip():
                continue
            sha, name, email, date, message, paths = record.split("\x1f", 5)
            result.append({"sha": sha.strip(), "author_name": name, "author_email": email, "author_date": date,
                           "message": message.rstrip(), "paths": sorted(set(paths.splitlines()) - {""}),
                           "tests": re.findall(r"^Test-File:\s*(.+)$", message, re.M)})
        return result


def is_test(path):
    return bool(re.search(r"\.test\.[^.]+$", path))


def is_story(path):
    return ".stories." in path


def commit_message(group, source, lane):
    originals = [c for c in source if set(c["paths"]) & set(group["paths"])]
    if group["kind"] == "architecture":
        title = "Introduce shared %s test infrastructure" % lane.removeprefix("vitest_").replace("_", " ")
        body = title + "\n\nConsolidate shared configuration, fixtures, helpers and documentation before individual test conversions."
    elif len(originals) == 1:
        # Preserve the unique original prose and other trailers, collecting test
        # ownership and coauthors together in the final trailer paragraph.
        body = re.sub(r"^(?:Test-File|Co-Authored-By):.*\n?", "", originals[0]["message"], flags=re.M).rstrip()
    else:
        title = "Improve " + group["test"].split("/")[-1] + " for " + lane.removeprefix("vitest_").replace("_", " ")
        body = title + "\n\nCombine the original changes for this test:\n" + "\n".join("- " + c["message"].splitlines()[0] for c in originals)
    coauthors = sorted(set(coauthor for c in originals for coauthor in re.findall(r"^Co-Authored-By:\s*(.+)$", c["message"], re.M)))
    if "Codex <noreply@openai.com>" not in coauthors:
        coauthors.append("Codex <noreply@openai.com>")
    trailers = (["Test-File: " + group["test"]] if group.get("test") else []) + ["Co-Authored-By: " + author for author in coauthors]
    return body + "\n\n" + "\n".join(trailers) + "\n", originals


def plan_lane(repo, name, old_parent, old_head, example):
    paths = repo.changes(old_parent, old_head)
    history = repo.history(old_parent, old_head)
    architecture = [p for p in paths if not is_test(p) and not is_story(p)]
    conversions = sorted(set(paths) - set(architecture))
    ownership, ambiguities = {}, []
    for path in conversions:
        if is_test(path):
            ownership[path] = path
            continue
        candidates = [test.strip() for c in history if path in c["paths"] for test in c["tests"]]
        candidates = list(dict.fromkeys(candidates))
        if not candidates:
            raise RuntimeError("Story has no historical test owner: " + path)
        if len(candidates) > 1:
            # Shared stories belong to the earliest owning conversion; subsequent
            # test commits retain their own final unit-test deltas. Record every
            # historical owner so the choice is reviewable.
            ambiguities.append({"path": path, "primary_owner": candidates[0], "historical_owners": candidates})
        ownership[path] = candidates[0]
    grouped = {}
    for path, test in ownership.items():
        grouped.setdefault(test, []).append(path)
    if example not in grouped:
        raise RuntimeError("Example missing from lane: " + name)
    earliest = {test: min((i for i, c in enumerate(history) if test in c["tests"] or test in c["paths"]), default=len(history)) for test in grouped}
    order = [example] + sorted(set(grouped) - {example}, key=lambda test: (earliest[test], test))
    groups = [{"kind": "architecture", "paths": architecture}]
    groups += [{"kind": "example" if test == example else "conversion", "test": test, "paths": sorted(grouped[test])} for test in order]
    flattened = [p for g in groups for p in g["paths"]]
    if sorted(flattened) != paths or len(flattened) != len(set(flattened)):
        raise RuntimeError("Changed paths must occur exactly once: " + name)
    return {"name": name, "old_parent": old_parent, "old_head": old_head, "example": example,
            "changed_paths": paths, "groups": groups, "original_commits": history,
            "shared_story_ownership": ambiguities}


def prepare(repo, output):
    timestamp = repo.git("show", "-s", "--format=%cI", LANES[-1][1]).decode().strip()
    original_refs = repo.git("show-ref").decode()
    original_status = repo.git("status", "--porcelain=v1", "-z")
    new_parent, old_parent = BASE, BASE
    result = {"base": BASE, "mode": "dangling_objects_only", "lanes": []}
    for name, old_head, example in LANES:
        lane = plan_lane(repo, name, old_parent, old_head, example)
        lane["omitted_original_commits"] = [
            {"sha": c["sha"], "reason": "No paths remain changed in the pinned lane delta (including originally empty commits)."}
            for c in lane["original_commits"] if not set(c["paths"]) & set(lane["changed_paths"])
        ]
        source_tree = repo.tree(old_head)
        lane["new_parent"] = new_parent
        fd, index_path = tempfile.mkstemp(prefix="galaxy-history-index-")
        os.close(fd)
        os.unlink(index_path)
        env = dict(os.environ, GIT_INDEX_FILE=index_path, GIT_COMMITTER_DATE=timestamp, GIT_AUTHOR_DATE=timestamp)
        try:
            repo.git("read-tree", new_parent, env=env)
            current = new_parent
            for group in lane["groups"]:
                records = []
                for path in group["paths"]:
                    blob = source_tree.get(path)
                    records.append((blob["mode"] + " " + blob["oid"] if blob else "0 " + "0" * 40) + "\t" + path + "\0")
                repo.git("update-index", "-z", "--index-info", input="".join(records).encode(), env=env)
                tree = repo.git("write-tree", env=env).decode().strip()
                message, originals = commit_message(group, lane["original_commits"], name)
                author_env = dict(env)
                if originals:
                    author_env.update(GIT_AUTHOR_NAME=originals[0]["author_name"], GIT_AUTHOR_EMAIL=originals[0]["author_email"], GIT_AUTHOR_DATE=originals[0]["author_date"])
                current = repo.git("commit-tree", tree, "-p", current, input=message.encode(), env=author_env).decode().strip()
                group.update(new_commit=current, tree=tree, original_commits=[c["sha"] for c in originals], message=message)
                if group.get("test"):
                    parsed = repo.git("show", "-s", "--format=%(trailers:key=Test-File,valueonly)", current).decode().strip()
                    if parsed != group["test"]:
                        raise RuntimeError("Ownership trailer did not parse: " + current)
            expected_tree = repo.git("rev-parse", old_head + "^{tree}").decode().strip()
            actual_tree = repo.git("rev-parse", current + "^{tree}").decode().strip()
            if expected_tree != actual_tree:
                raise RuntimeError("Lane tree changed: " + name)
            lane.update(new_head=current, exact_tree=actual_tree, verification={"tree_identical": True, "paths_partitioned_exactly_once": True, "ownership_trailers_parse": True})
            result["lanes"].append(lane)
            print("Prepared %s %s (%d commits); exact original tree verified." % (name, current, len(lane["groups"])), flush=True)
            old_parent, new_parent = old_head, current
        finally:
            if os.path.exists(index_path):
                os.unlink(index_path)
    result["ancillary"] = []
    old_read = LANES[0][1]
    new_read = result["lanes"][0]["new_head"]
    for name, old_head in ANCILLARY:
        mapping = {old_read: new_read}
        originals = repo.git("rev-list", "--reverse", old_read + ".." + old_head).decode().splitlines()
        for old in originals:
            parents = repo.git("show", "-s", "--format=%P", old).decode().split()
            if len(parents) != 1 or parents[0] not in mapping:
                raise RuntimeError("Ancillary history must be a direct linear child of readability: " + old)
            metadata = repo.git("show", "-s", "--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI%x00%B", old).decode().split("\0", 6)
            an, ae, ad, cn, ce, cd, _formatted_message = metadata
            message = repo.git("cat-file", "commit", old).split(b"\n\n", 1)[1]
            env = dict(os.environ, GIT_AUTHOR_NAME=an, GIT_AUTHOR_EMAIL=ae, GIT_AUTHOR_DATE=ad,
                       GIT_COMMITTER_NAME=cn, GIT_COMMITTER_EMAIL=ce, GIT_COMMITTER_DATE=cd)
            tree = repo.git("rev-parse", old + "^{tree}").decode().strip()
            mapping[old] = repo.git("commit-tree", tree, "-p", mapping[parents[0]], input=message, env=env).decode().strip()
        new_head = mapping[old_head]
        tree = repo.git("rev-parse", old_head + "^{tree}").decode().strip()
        if repo.git("rev-parse", new_head + "^{tree}").decode().strip() != tree:
            raise RuntimeError("Ancillary final tree changed: " + name)
        result["ancillary"].append({"name": name, "old_head": old_head, "new_head": new_head,
                                    "old_parent": old_read, "new_parent": new_read, "exact_tree": tree,
                                    "commit_mapping": {old: mapping[old] for old in originals},
                                    "verification": {"tree_identical": True, "own_commits_preserved": True}})
    if repo.git("show-ref").decode() != original_refs:
        raise RuntimeError("Refs changed during prepare")
    if repo.git("status", "--porcelain=v1", "-z") != original_status:
        raise RuntimeError("Worktree status changed during prepare")
    result["verification"] = {"refs_unchanged": True, "worktree_status_unchanged": True, "all_lane_trees_identical": True}
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    for lane in result["lanes"]:
        print("%s: %s -> %s; %d commits; architecture %d paths; exact tree %s" % (lane["name"], lane["old_head"], lane["new_head"], len(lane["groups"]), len(lane["groups"][0]["paths"]), lane["exact_tree"]))
    for lane in result["ancillary"]:
        print("%s: %s -> %s; %d own commits; exact tree %s" % (lane["name"], lane["old_head"], lane["new_head"], len(lane["commit_mapping"]), lane["exact_tree"]))
    print("All final trees identical. Refs, repository index and worktree files unchanged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", required=True)
    parser.add_argument("--repo", default="/Users/jxc755/projects/worktrees/galaxy/branch/storybook_interactions")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    prepare(Repository(args.repo), args.output)


if __name__ == "__main__":
    main()
