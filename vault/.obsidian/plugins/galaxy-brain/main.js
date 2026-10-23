"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GalaxyBrainPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// ../site/src/lib/records.ts
var RECORD_KINDS = ["branches", "issues", "reviews"];
var DEFAULTS_REPO = "_defaults";
function parseRecordPath(rel) {
  const parts = rel.split("/");
  if (parts[0] !== "repositories" || parts.length < 5) return null;
  const kind = parts[2];
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: parts[1], kind, status: parts[3], id: parts[4], rest: parts.slice(5).join("/") };
}
var STATUS_ORDER = {
  branches: ["active", "merged", "abandoned"],
  issues: ["needs_decision", "queued", "wip", "blocked", "delegated", "closed"],
  reviews: ["active", "archived"]
};
var TERMINAL_STATUSES = /* @__PURE__ */ new Set(["merged", "abandoned", "archived", "closed"]);
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}
function statusLabel(status) {
  return status.replace(/_/g, " ");
}
function recordTitle(body) {
  const m = body?.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}
function compareNames(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return nb - na;
  return a.localeCompare(b, void 0, { sensitivity: "base" });
}
function groupByStatus(records, kind) {
  const byStatus = /* @__PURE__ */ new Map();
  for (const record of records) {
    if (record.kind !== kind) continue;
    byStatus.set(record.status, [...byStatus.get(record.status) ?? [], record]);
  }
  const known = STATUS_ORDER[kind];
  const statuses = [...byStatus.keys()].sort((a, b) => {
    const ia = known.indexOf(a);
    const ib = known.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  return statuses.map((status) => ({
    status,
    records: byStatus.get(status).sort((a, b) => compareNames(a.name, b.name))
  }));
}

// src/launchers.ts
var KEY_LINE = /^(records|status|agent_dir|name|profile):\s*(.*)$/;
var list = (value) => value.split(",").map((item2) => item2.trim()).filter(Boolean);
function parseLaunchers(markdown) {
  const launchers = [];
  for (const section of markdown.split(/^## /m).slice(1)) {
    const [heading = "", ...lines] = section.split("\n");
    const fields = {};
    let i = 0;
    for (; i < lines.length; i++) {
      const match = KEY_LINE.exec(lines[i].trim());
      if (!match) break;
      fields[match[1]] = match[2].trim();
    }
    const prompt = lines.slice(i).join("\n").trim();
    const label = heading.trim();
    if (!label || !fields.records || !fields.agent_dir || !prompt) continue;
    launchers.push({
      label,
      records: list(fields.records),
      statuses: list(fields.status ?? ""),
      agentDir: fields.agent_dir,
      name: fields.name || fields.agent_dir,
      ...fields.profile ? { profile: fields.profile } : {},
      prompt
    });
  }
  return launchers;
}
function recordFromPath(path) {
  const parsed = parseRecordPath(path);
  if (!parsed?.rest) return null;
  const { repo, kind, status, id: name } = parsed;
  return { repo, kind, status, name, dir: ["repositories", repo, kind, status, name].join("/") };
}
var UNTRACKED = "untracked";
function untrackedRecord(repo, kind, number) {
  return { repo, kind, status: UNTRACKED, name: String(number), dir: "" };
}
function launchersFor(launchers, record) {
  return launchers.filter(
    (launcher) => launcher.records.includes(`${record.repo}/${record.kind}`) && (launcher.statuses.includes(record.status) || launcher.statuses.length === 0 && record.status !== UNTRACKED)
  );
}
function fillTemplate(template, record, vaultRoot) {
  const values = {
    repo: record.repo,
    kind: record.kind,
    status: record.status,
    name: record.name,
    record: record.dir ? `${vaultRoot}/${record.dir}` : ""
  };
  return template.replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole);
}

// src/profiles.ts
var FALLBACK_PROFILES = [
  { name: "Claude", agent: "claude", args: [] },
  { name: "Codex", agent: "codex", args: [] }
];
var text = (value) => typeof value === "string" || typeof value === "number" ? String(value) : void 0;
function parseProfiles(data) {
  const entries = data?.profiles;
  if (!Array.isArray(entries)) return [];
  return entries.flatMap((entry) => {
    const name = text(entry?.name);
    const agent = entry?.agent;
    if (!name || agent !== "claude" && agent !== "codex") return [];
    const model = text(entry.model);
    const effort = text(entry.effort);
    const args = Array.isArray(entry.args) ? entry.args.map(String) : [];
    return [{ name, agent, ...model ? { model } : {}, ...effort ? { effort } : {}, args }];
  });
}
function profileArgs(profile) {
  const args = [];
  if (profile.agent === "claude") {
    if (profile.model) args.push("--model", profile.model);
    if (profile.effort) args.push("--effort", profile.effort);
  } else {
    if (profile.model) args.push("-m", profile.model);
    if (profile.effort) args.push("-c", `model_reasoning_effort="${profile.effort}"`);
  }
  return [...args, ...profile.args];
}
function defaultProfile(profiles, launcher) {
  return profiles.find((profile) => profile.name === launcher.profile) ?? profiles[0] ?? FALLBACK_PROFILES[0];
}

// src/record-links.ts
var MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;
function links(body) {
  return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1], url: match[2] }));
}
var escape = (text2) => text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var FORK_OWNER = "jmchilton";
var BRANCHES_ON_UPSTREAM = /* @__PURE__ */ new Set(["foundry"]);
function upstreamOwner(repo, bodies) {
  const pattern = new RegExp(`^https://github\\.com/([^/]+)/${escape(repo)}/(pull|issues)/`);
  const counts = /* @__PURE__ */ new Map();
  for (const link of bodies.flatMap(links)) {
    const owner = pattern.exec(link.url)?.[1];
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([owner]) => owner);
  return ranked.find((owner) => owner !== FORK_OWNER) ?? ranked[0] ?? "galaxyproject";
}
function githubUrl(record, body) {
  const all = links(body);
  const id = escape(record.name);
  const find = (pattern, label) => all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
  const upstream = `https://github.com/${upstreamOwner(record.repo, [body])}/${record.repo}`;
  if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
  if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
  const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
  const forkOwner = BRANCHES_ON_UPSTREAM.has(record.repo) ? upstreamOwner(record.repo, [body]) : FORK_OWNER;
  return find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ?? (statusPr ? `${upstream}/pull/${statusPr}` : void 0) ?? find(new RegExp(`/tree/${id}$`)) ?? `https://github.com/${forkOwner}/${record.repo}/tree/${record.name}`;
}
function worktreeCandidates(record, body, home) {
  const root = `${home}/projects/worktrees/${record.repo}`;
  if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
  if (record.kind !== "branches") return [];
  const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
  return [...listed ? [listed] : [], `${root}/branch/${record.name}`];
}

// src/repository.ts
function repositoryNames(files) {
  const names = /* @__PURE__ */ new Set();
  for (const file of files) {
    const record = recordFromPath(file.path);
    if (record && record.repo !== DEFAULTS_REPO) names.add(record.repo);
  }
  return [...names].sort();
}
function collectRecords(files, repo, readIndex) {
  const records = /* @__PURE__ */ new Map();
  for (const file of files) {
    const ref = recordFromPath(file.path);
    if (!ref || ref.repo !== repo) continue;
    let record = records.get(ref.dir);
    if (!record) {
      record = { ...ref, title: ref.name, mtime: 0 };
      records.set(ref.dir, record);
    }
    record.mtime = Math.max(record.mtime, file.mtime);
    if (file.path === `${ref.dir}/index.md`) {
      record.indexPath = file.path;
      record.title = recordTitle(readIndex(file.path)) ?? ref.name;
    }
  }
  return [...records.values()];
}
function timeAgo(mtime, now) {
  const minutes = Math.max(0, Math.round((now - mtime) / 6e4));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
function repositorySections(records) {
  return RECORD_KINDS.map((kind) => ({
    kind,
    groups: groupByStatus(records, kind).map(({ status, records: records2 }) => ({
      status,
      collapsed: isTerminalStatus(status),
      records: [...records2].sort((a, b) => b.mtime - a.mtime)
    }))
  })).filter((section) => section.groups.length > 0);
}

// src/repository-view.ts
var import_obsidian = require("obsidian");

// src/github-feed.ts
var FIELDS = "number title url createdAt author { login }";
var FEED_QUERY = `query($owner: String!, $name: String!, $mine: String!) {
  repository(owner: $owner, name: $name) {
    created: pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS} isDraft headRefName }
    }
    updated: pullRequests(states: OPEN, first: 60, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ${FIELDS} isDraft headRefName timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) { nodes { ... on ReadyForReviewEvent { createdAt } } } }
    }
    issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS} }
    }
  }
  mine: search(query: $mine, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { ${FIELDS} isDraft headRefName mergeable } }
  }
}`;
var item = (node, at = node.createdAt) => ({
  number: node.number,
  title: node.title,
  url: node.url,
  author: node.author?.login ?? "ghost",
  at,
  isDraft: node.isDraft ?? false,
  ...node.headRefName ? { branch: node.headRefName } : {}
});
var FEED_FILTERS = {
  newPrs: ["pulls", "is:pr is:open sort:created-desc"],
  // GitHub can't sort by ready-for-review time; recently updated non-drafts is the closest.
  undraftedPrs: ["pulls", "is:pr is:open draft:false sort:updated-desc"],
  issues: ["issues", "is:issue is:open sort:created-desc"],
  myDrafts: ["pulls", "is:pr is:open author:@me draft:true"],
  // GitHub has no conflict filter.
  conflicting: ["pulls", "is:pr is:open author:@me"]
};
function feedUrl(owner, name, feed) {
  const [list2, query] = FEED_FILTERS[feed];
  return `https://github.com/${owner}/${name}/${list2}?q=${encodeURIComponent(query)}`;
}
function feedArgs(owner, name) {
  const mine = `repo:${owner}/${name} is:pr is:open author:@me sort:updated-desc`;
  return ["api", "graphql", "-f", `owner=${owner}`, "-f", `name=${name}`, "-f", `mine=${mine}`, "-f", `query=${FEED_QUERY}`];
}
function parseFeeds(json) {
  const data = JSON.parse(json).data;
  const repository = data.repository;
  const mine = data.mine.nodes;
  const undraftedPrs = repository.updated.nodes.filter((node) => !node.isDraft).flatMap((node) => {
    const readyAt = node.timelineItems?.nodes[0]?.createdAt;
    return readyAt ? [item(node, readyAt)] : [];
  }).sort((a, b) => b.at.localeCompare(a.at));
  return {
    newPrs: repository.created.nodes.map((node) => item(node)),
    undraftedPrs,
    issues: repository.issues.nodes.map((node) => item(node)),
    myDrafts: mine.filter((node) => node.isDraft).map((node) => item(node)),
    conflicting: mine.filter((node) => node.mergeable === "CONFLICTING").map((node) => item(node)),
    unchecked: mine.filter((node) => node.mergeable === "UNKNOWN").length
  };
}
function matchRecords(item2, isIssue, records, bodyOf) {
  const number = String(item2.number);
  return records.filter((record) => {
    if (isIssue) return record.kind === "issues" && record.name === number;
    if (record.kind === "reviews") return record.name === number;
    return record.kind === "branches" && (record.name === item2.branch || githubUrl(record, bodyOf(record)) === item2.url);
  });
}

// src/record-groups.ts
function groupingFor(repo, kind) {
  return kind === "branches" ? `repositories/${repo}/branches/MY_BRANCHES.md` : void 0;
}
function resolve(from, link) {
  const parts = from.split("/").slice(0, -1);
  for (const part of link.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
}
function parseGrouping(text2, path, repo, kind) {
  const sections = [];
  for (const line of text2.split("\n")) {
    const heading = line.match(/^## (.+?)\s*\(`([^`]+)`\)\s*$/);
    if (heading) {
      sections.push({ label: heading[1], key: heading[2], names: [] });
      continue;
    }
    const link = line.match(/^- \[[^\]]*\]\(([^)\s]+)\)/);
    const section = sections[sections.length - 1];
    if (!link || !section) continue;
    const record = recordFromPath(resolve(path, decodeURI(link[1])));
    if (record?.repo === repo && record.kind === kind && !section.names.includes(record.name)) section.names.push(record.name);
  }
  return sections;
}
function groupRecords(records, kind, grouping) {
  const ofKind = records.filter((record) => record.kind === kind);
  const byName = new Map(ofKind.map((record) => [record.name, record]));
  const listed = /* @__PURE__ */ new Set();
  const groups = [];
  for (const section of grouping ?? []) {
    const found = section.names.flatMap((name) => {
      const record = byName.get(name);
      if (!record || listed.has(name)) return [];
      listed.add(name);
      return [record];
    });
    if (found.length) groups.push({ status: section.key, label: section.label, collapsed: false, records: found });
  }
  const rest = ofKind.filter((record) => !listed.has(record.name));
  return [...groups, ...repositorySections(rest).find((section) => section.kind === kind)?.groups ?? []];
}

// src/repository-view.ts
var REPOSITORY_VIEW = "galaxy-brain-repository";
var TABS = [
  { id: "branches", label: "My branches" },
  { id: "issues", label: "My issues" },
  { id: "reviews", label: "My reviews" },
  { id: "my-drafts", label: "My drafts" },
  { id: "conflicting", label: "Conflicting" },
  { id: "new-prs", label: "New PRs" },
  { id: "undrafted-prs", label: "Out of draft" },
  { id: "new-issues", label: "New issues" }
];
var isRecordTab = (tab) => RECORD_KINDS.includes(tab);
var isMine = (tab) => tab === "my-drafts" || tab === "conflicting";
var RECORD_ICONS = { branches: "git-branch", reviews: "file-search", issues: "file-text" };
var FEED_KEYS = {
  "new-prs": "newPrs",
  "undrafted-prs": "undraftedPrs",
  "new-issues": "issues",
  "my-drafts": "myDrafts",
  conflicting: "conflicting"
};
var FEED_LINKS = {
  "new-prs": "Open PRs, newest first, on GitHub",
  "undrafted-prs": "Open non-draft PRs, recently updated, on GitHub",
  "new-issues": "Open issues, newest first, on GitHub",
  "my-drafts": "My open draft PRs on GitHub",
  conflicting: "My open PRs on GitHub (it can't filter by conflicts)"
};
var RECHECK_MS = 5e3;
var RepositoryView = class extends import_obsidian.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.repo = "galaxy";
    this.tab = "branches";
    /** GitHub feeds by repository, fetched on first view and on refresh. */
    this.feeds = /* @__PURE__ */ new Map();
    this.launchers = [];
    /** Status groups toggled away from their default, kept across re-renders. */
    this.toggled = /* @__PURE__ */ new Set();
    this.scheduleRender = (0, import_obsidian.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return REPOSITORY_VIEW;
  }
  getDisplayText() {
    return `${this.repo} records`;
  }
  getIcon() {
    return "library";
  }
  getState() {
    return { repo: this.repo, tab: this.tab };
  }
  async setState(state, result) {
    if (state.repo && state.repo !== this.repo) {
      this.repo = state.repo;
      this.toggled.clear();
    }
    if (state.tab && TABS.some((tab) => tab.id === state.tab)) this.tab = state.tab;
    else if (state.tab === "records") this.tab = "branches";
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      const grouped = isRecordTab(this.tab) && file.path === groupingFor(this.repo, this.tab);
      if (grouped || file.path.startsWith(`repositories/${this.repo}/`)) this.scheduleRender();
    };
    this.registerEvent(this.app.vault.on("create", onChange));
    this.registerEvent(this.app.vault.on("delete", onChange));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      onChange(file);
      onChange({ path: oldPath });
    }));
    this.registerEvent(this.app.metadataCache.on("changed", onChange));
    await this.render();
  }
  async render() {
    const files = this.app.vault.getMarkdownFiles().map((file) => ({ path: file.path, mtime: file.stat.mtime }));
    const bodies = await this.readIndexes(files.map((file) => file.path));
    const records = collectRecords(files, this.repo, (path) => bodies.get(path));
    this.launchers = import_obsidian.Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
    const launchable = new Set(records.filter((record) => this.canLaunch(record)).map((record) => record.dir));
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: this.repo });
    const select = header.createEl("select", { cls: "dropdown" });
    for (const name of repositoryNames(files)) {
      select.createEl("option", { text: name, value: name }).selected = name === this.repo;
    }
    select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value, tab: this.tab } });
    const tabs = import_obsidian.Platform.isDesktopApp ? TABS : TABS.filter((tab) => isRecordTab(tab.id));
    const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : "branches";
    const bar = root.createDiv({ cls: "gbr-tabs" });
    for (const tab of tabs) {
      const count = isRecordTab(tab.id) ? ` (${records.filter((record) => record.kind === tab.id).length})` : "";
      const button = bar.createEl("button", { text: tab.label + count, cls: tab.id === current ? "mod-cta" : "" });
      button.onclick = () => {
        this.tab = tab.id;
        this.app.workspace.requestSaveLayout();
        void this.render();
      };
    }
    if (isRecordTab(current)) this.renderRecords(root, current, records, bodies, launchable, await this.readGrouping(current));
    else this.renderFeed(root, current, records, bodies, launchable, header);
  }
  renderRecords(root, kind, records, bodies, launchable, grouping) {
    const groups = groupRecords(records, kind, grouping);
    if (groups.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
    for (const group of groups) {
      const key = `${kind}/${group.status}`;
      const details = root.createEl("details", { cls: "gbr-group" });
      details.open = group.collapsed === this.toggled.has(key);
      details.ontoggle = () => {
        if (details.open === group.collapsed) this.toggled.add(key);
        else this.toggled.delete(key);
      };
      details.createEl("summary", { text: `${group.label ?? statusLabel(group.status)} (${group.records.length})` });
      const list2 = details.createEl("ul");
      for (const record of group.records) {
        const body = record.indexPath && bodies.get(record.indexPath) || "";
        this.renderRecord(list2, record, body, launchable.has(record.dir));
      }
    }
  }
  renderFeed(root, tab, records, bodies, launchable, header) {
    const state = this.feedState();
    const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh from GitHub" } });
    (0, import_obsidian.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void this.fetchFeeds(true);
    if (state.fetchedAt) header.createSpan({ text: `fetched ${timeAgo(state.fetchedAt, Date.now())}`, cls: "gbr-time" });
    const owner = upstreamOwner(this.repo, [...bodies.values()]);
    root.createEl("p", { cls: "gbr-github-link" }).createEl("a", {
      text: FEED_LINKS[tab],
      href: feedUrl(owner, this.repo, FEED_KEYS[tab]),
      cls: "external-link"
    });
    if (!state.feeds) {
      if (state.error) root.createEl("p", { text: `Could not fetch from GitHub: ${state.error}`, cls: "gbr-empty" });
      else root.createEl("p", { text: "Fetching from GitHub\u2026", cls: "gbr-empty" });
      if (!state.loading && !state.error) void this.fetchFeeds(false);
      return;
    }
    const bodyOf = (record) => record.indexPath && bodies.get(record.indexPath) || "";
    if (tab === "conflicting" && state.checking) {
      root.createEl("p", { text: "Checking for conflicts\u2026", cls: "gbr-empty" });
      return;
    }
    const items = state.feeds[FEED_KEYS[tab]];
    const unchecked = tab === "conflicting" ? state.feeds.unchecked : 0;
    if (unchecked) root.createEl("p", { text: `GitHub hasn't checked ${unchecked} PR(s) yet; refresh to recheck.`, cls: "gbr-empty" });
    if (items.length === 0) root.createEl("p", { text: isMine(tab) ? "None." : "Nothing recent.", cls: "gbr-empty" });
    const list2 = root.createEl("ul");
    for (const item2 of items) {
      const matched = matchRecords(item2, tab === "new-issues", records, bodyOf);
      this.renderFeedItem(list2, item2, tab === "new-issues", matched, bodyOf, launchable);
    }
  }
  renderFeedItem(list2, item2, isIssue, matched, bodyOf, launchable) {
    const row = list2.createEl("li", { cls: "gbr-record" });
    const actions = row.createSpan({ cls: "gbr-actions" });
    row.createEl("a", { text: `#${item2.number} ${item2.title}`, href: item2.url, cls: "external-link" });
    if (item2.isDraft) row.createSpan({ text: "draft", cls: "gbr-tag" });
    row.createSpan({ text: `${item2.author} \xB7 ${timeAgo(Date.parse(item2.at), Date.now())}`, cls: "gbr-time" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (matched.length === 0) {
      const untracked = untrackedRecord(this.repo, isIssue ? "issues" : "reviews", item2.number);
      if (this.canLaunch(untracked)) action("bot", "Launch agent (no record yet)", () => void this.host.pickLauncher(untracked));
    }
    for (const record of matched) {
      const kind = record.kind === "branches" ? "branch" : record.kind === "reviews" ? "review" : "issue";
      action(
        RECORD_ICONS[record.kind],
        `Open ${kind} record ${record.name} (${statusLabel(record.status)})`,
        (event) => void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey)
      );
      if (launchable.has(record.dir)) action("bot", `Launch agent for ${kind} record`, () => void this.host.pickLauncher(record));
      const worktree = this.host.worktreeFor(record, bodyOf(record));
      if (worktree) action("code", `Open ${kind} worktree with Code`, () => this.host.openInCode(worktree));
    }
  }
  feedState() {
    let state = this.feeds.get(this.repo);
    if (!state) this.feeds.set(this.repo, state = {});
    return state;
  }
  async fetchFeeds(force) {
    const state = this.feedState();
    if (state.loading) return state.loading;
    if (!force && state.feeds) return;
    const repo = this.repo;
    state.loading = (async () => {
      try {
        const prefix = `repositories/${repo}/`;
        const bodies = await this.readIndexes(this.app.vault.getMarkdownFiles().map((f) => f.path).filter((p) => p.startsWith(prefix)));
        const owner = upstreamOwner(repo, [...bodies.values()]);
        state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
        state.fetchedAt = Date.now();
        state.error = void 0;
        if (state.feeds.unchecked) {
          state.checking = true;
          if (this.repo === repo) await this.render();
          await sleep(RECHECK_MS);
          state.feeds = parseFeeds(await this.host.runGh(feedArgs(owner, repo)));
          state.fetchedAt = Date.now();
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      } finally {
        state.loading = void 0;
        state.checking = void 0;
      }
      if (this.repo === repo) await this.render();
    })();
    if (force) await this.render();
    return state.loading;
  }
  /** Sections of the repository's grouping file for this kind, if it has one. */
  async readGrouping(kind) {
    const path = groupingFor(this.repo, kind);
    const file = path ? this.app.vault.getFileByPath(path) : null;
    return file ? parseGrouping(await this.app.vault.cachedRead(file), file.path, this.repo, kind) : void 0;
  }
  async readIndexes(paths) {
    const prefix = `repositories/${this.repo}/`;
    const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
    const bodies = /* @__PURE__ */ new Map();
    await Promise.all(indexes.map(async (path) => {
      const file = this.app.vault.getFileByPath(path);
      if (file) bodies.set(path, await this.app.vault.cachedRead(file));
    }));
    return bodies;
  }
  renderRecord(list2, record, body, launchable) {
    const item2 = list2.createEl("li", { cls: "gbr-record" });
    const actions = item2.createSpan({ cls: "gbr-actions" });
    const link = item2.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
    };
    if (record.title !== record.name) item2.createSpan({ text: record.name, cls: "gbr-name" });
    item2.createSpan({ text: timeAgo(record.mtime, Date.now()), cls: "gbr-time" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
    action("github", "Open on GitHub", () => window.open(githubUrl(record, body)));
    const worktree = import_obsidian.Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
    if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
  }
  canLaunch(record) {
    return launchersFor(this.launchers, record).length > 0;
  }
};

// src/main.ts
var LAUNCHERS_PATH = "agents/_shared/LAUNCHERS.md";
var PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
var LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
var CLI_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];
var GalaxyBrainPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.recordActions = /* @__PURE__ */ new WeakMap();
  }
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian2.TFile)) return;
        menu.addItem(
          (item2) => item2.setTitle("Copy contents").setIcon("copy").onClick(() => this.copyContents(file))
        );
        void this.addLaunchItems(menu, file);
      })
    );
    this.addCommand({
      id: "copy-contents",
      name: "Copy contents of current file",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) void this.copyContents(file);
        return true;
      }
    });
    this.registerView(REPOSITORY_VIEW, (leaf) => new RepositoryView(leaf, this));
    this.addRibbonIcon("library", "Open repository records", () => void this.pickRepository());
    this.addCommand({
      id: "open-repository",
      name: "Open repository records",
      callback: () => void this.pickRepository()
    });
    if (!import_obsidian2.Platform.isDesktopApp) return;
    this.addCommand({
      id: "launch-agent",
      name: "Launch agent for this record",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const record = file && recordFromPath(file.path);
        if (!record) return false;
        if (!checking) void this.pickLauncher(record);
        return true;
      }
    });
    const refresh = () => this.refreshRecordActions();
    this.registerEvent(this.app.workspace.on("file-open", refresh));
    this.registerEvent(this.app.workspace.on("layout-change", refresh));
    this.app.workspace.onLayoutReady(refresh);
  }
  async copyContents(file) {
    try {
      await navigator.clipboard.writeText(await this.app.vault.read(file));
      new import_obsidian2.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian2.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
  /** Code, GitHub and agent icons in the header of notes inside a repository record. */
  refreshRecordActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian2.MarkdownView)) continue;
      const record = view.file && recordFromPath(view.file.path);
      const existing = this.recordActions.get(view);
      if (record && !existing) {
        const withRecord = (act) => () => {
          const current = view.file && recordFromPath(view.file.path);
          if (current) void act(current);
        };
        const actions = [
          view.addAction("code", "Open with Code", withRecord((r) => this.openRecordInCode(r))),
          view.addAction("github", "Open on GitHub", withRecord((r) => this.openRecordOnGithub(r))),
          view.addAction("bot", "Launch agent", withRecord((r) => this.pickLauncher(r)))
        ];
        this.recordActions.set(view, actions);
        this.register(() => actions.forEach((action) => action.remove()));
      } else if (!record && existing) {
        existing.forEach((action) => action.remove());
        this.recordActions.delete(view);
      }
    }
  }
  async indexBody(record) {
    const index = this.app.vault.getFileByPath(`${record.dir}/index.md`);
    return index ? this.app.vault.cachedRead(index) : "";
  }
  /** The record's worktree, if one exists on disk. */
  worktreeFor(record, body) {
    const { existsSync } = require("fs");
    const { homedir } = require("os");
    return worktreeCandidates(record, body, homedir()).find((path) => existsSync(path)) ?? null;
  }
  openInCode(path) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    execFile("code", [path], { env: { ...process.env, PATH } }, (error) => {
      if (error) new import_obsidian2.Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 1e4);
    });
  }
  runGh(args) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    return new Promise((resolve2, reject) => {
      execFile("gh", args, { env: { ...process.env, PATH }, timeout: 6e4, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || error.message).trim()));
        else resolve2(stdout);
      });
    });
  }
  async openRecordInCode(record) {
    const worktree = this.worktreeFor(record, await this.indexBody(record));
    if (worktree) this.openInCode(worktree);
    else new import_obsidian2.Notice(`No worktree on disk for ${record.name}`);
  }
  async openRecordOnGithub(record) {
    window.open(githubUrl(record, await this.indexBody(record)));
  }
  async loadLaunchers() {
    const config = this.app.vault.getAbstractFileByPath(LAUNCHERS_PATH);
    if (!(config instanceof import_obsidian2.TFile)) return [];
    return parseLaunchers(await this.app.vault.cachedRead(config));
  }
  async launchersFor(record) {
    return launchersFor(await this.loadLaunchers(), record);
  }
  async openRepository(repo) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
  }
  /** Opens the current record's repository, or asks which one. */
  async pickRepository() {
    const file = this.app.workspace.getActiveFile();
    const current = file && recordFromPath(file.path);
    if (current) return this.openRepository(current.repo);
    const files = this.app.vault.getMarkdownFiles().map((f) => ({ path: f.path, mtime: f.stat.mtime }));
    new ChoiceSuggest(this.app, repositoryNames(files), "Open repository\u2026", (repo) => void this.openRepository(repo)).open();
  }
  async addLaunchItems(menu, file) {
    if (!import_obsidian2.Platform.isDesktopApp) return;
    const record = recordFromPath(file.path);
    if (!record) return;
    for (const launcher of await this.launchersFor(record)) {
      menu.addItem(
        (item2) => item2.setTitle(`Launch: ${launcher.label}`).setIcon("bot").onClick(() => void this.confirmLaunch(launcher, record))
      );
    }
  }
  async pickLauncher(record) {
    const launchers = await this.launchersFor(record);
    if (launchers.length === 0) {
      new import_obsidian2.Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in ${LAUNCHERS_PATH}`);
      return;
    }
    new LauncherSuggest(this.app, launchers, (launcher) => void this.confirmLaunch(launcher, record)).open();
  }
  async loadProfiles() {
    try {
      const profiles = parseProfiles((0, import_obsidian2.parseYaml)(await this.app.vault.adapter.read(PROFILES_PATH)));
      if (profiles.length > 0) return profiles;
    } catch (error) {
      new import_obsidian2.Notice(`Could not read ${PROFILES_PATH}: ${error}`);
    }
    return FALLBACK_PROFILES;
  }
  async confirmLaunch(launcher, record) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const profiles = await this.loadProfiles();
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      name: fillTemplate(launcher.name, record, vaultRoot),
      prompt: fillTemplate(launcher.prompt, record, vaultRoot),
      launch: (profile, name, prompt) => this.launch(vaultRoot, launcher, profile, name, prompt)
    }).open();
  }
  vaultRoot() {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian2.FileSystemAdapter) return adapter.getBasePath();
    new import_obsidian2.Notice("Launching agents needs the desktop app");
    return null;
  }
  launch(vaultRoot, launcher, profile, name, prompt) {
    const { execFile } = require("child_process");
    const started = new import_obsidian2.Notice(`Launching ${profile.name} in ${launcher.agentDir}\u2026`, 0);
    execFile(
      `${vaultRoot}/${LAUNCH_SCRIPT}`,
      [launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)],
      { timeout: 18e4 },
      (error, stdout, stderr) => {
        started.hide();
        if (error) new import_obsidian2.Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15e3);
        else new import_obsidian2.Notice(stdout.trim(), 1e4);
      }
    );
  }
};
var LauncherSuggest = class extends import_obsidian2.FuzzySuggestModal {
  constructor(app, launchers, choose) {
    super(app);
    this.launchers = launchers;
    this.choose = choose;
    this.setPlaceholder("Launch agent\u2026");
  }
  getItems() {
    return this.launchers;
  }
  getItemText(launcher) {
    return launcher.label;
  }
  onChooseItem(launcher) {
    this.choose(launcher);
  }
};
var ChoiceSuggest = class extends import_obsidian2.FuzzySuggestModal {
  constructor(app, choices, placeholder, choose) {
    super(app);
    this.choices = choices;
    this.choose = choose;
    this.setPlaceholder(placeholder);
  }
  getItems() {
    return this.choices;
  }
  getItemText(choice) {
    return choice;
  }
  onChooseItem(choice) {
    this.choose(choice);
  }
};
var LaunchModal = class extends import_obsidian2.Modal {
  constructor(app, launcher, details) {
    super(app);
    this.launcher = launcher;
    this.details = details;
  }
  onOpen() {
    const { launcher } = this;
    let { name, prompt, profile } = this.details;
    this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
    new import_obsidian2.Setting(this.contentEl).setName("Agent name").addText(
      (text2) => text2.setValue(name).onChange((value) => name = value)
    );
    new import_obsidian2.Setting(this.contentEl).setName("Prompt").addTextArea((area) => {
      area.setValue(prompt).onChange((value) => prompt = value);
      area.inputEl.rows = 6;
    }).settingEl.addClass("galaxy-brain-launch-prompt");
    new import_obsidian2.Setting(this.contentEl).addDropdown((dropdown) => {
      for (const option of this.details.profiles) dropdown.addOption(option.name, option.name);
      dropdown.setValue(profile.name).onChange((value) => {
        profile = this.details.profiles.find((option) => option.name === value) ?? profile;
      });
    }).addButton(
      (button) => button.setButtonText("Launch").setCta().onClick(() => {
        this.close();
        this.details.launch(profile, name, prompt);
      })
    ).addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose() {
    this.contentEl.empty();
  }
};
