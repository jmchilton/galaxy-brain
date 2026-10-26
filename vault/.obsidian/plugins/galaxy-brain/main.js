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
var import_obsidian3 = require("obsidian");

// src/agents-view.ts
var import_obsidian = require("obsidian");

// src/agent-routines.ts
var ROUTINES = [
  { file: "GOOD_MORNING.md", label: "\u{1F305} Good morning", prefix: "gm" },
  { file: "TICK.md", label: "\u23F1\uFE0F Tick", prefix: "tick" }
];
var ROUTINE_PROFILE = "Sonnet (medium)";
var tasksPath = (agentDir) => `agents/${agentDir}/TASKS.md`;
function routineLaunch(agentDir, routine) {
  return {
    task: { prompt: `Run ./${routine.file}`, agentDir, profile: ROUTINE_PROFILE },
    name: `${routine.prefix}-${agentDir}`
  };
}

// src/task-cards.ts
function renderTaskCards(el, tasks, actions) {
  const list2 = el.createDiv({ cls: "gb-tasks" });
  if (tasks.length === 0) list2.createDiv({ cls: "gb-tasks-empty", text: "No tasks." });
  tasks.forEach((task, index) => {
    const human = task.kind === "human";
    const cls = ["gb-task", task.status && `gb-task-${task.status}`, task.priority && `gb-task-${task.priority}`, human && "gb-task-human"];
    const card = list2.createDiv({ cls: cls.filter(Boolean).join(" ") });
    const head = card.createDiv({ cls: "gb-task-head" });
    if (task.priority) head.createSpan({ cls: "gb-task-priority", text: task.priority });
    if (task.status) head.createSpan({ cls: "gb-task-status", text: task.status });
    head.createSpan({ cls: "gb-task-meta", text: `${task.agentDir} \xB7 ${human ? "for John" : task.profile ?? actions.defaultProfile}` });
    if (actions.launch && !human) {
      const launch = actions.launch;
      head.createEl("button", { text: "\u{1F680}", attr: { "aria-label": "Launch" } }).onclick = () => launch(task, index);
    }
    const [text2, label] = human ? ["\u2714", "Done"] : ["\u2716", "Remove"];
    head.createEl("button", { text: text2, attr: { "aria-label": label } }).onclick = () => actions.remove(task, index);
    if (task.description) card.createDiv({ cls: "gb-task-description", text: task.description.trim() });
    if (task.link) {
      const text3 = task.link.replace(/^https?:\/\//, "");
      card.createDiv({ cls: "gb-task-link" }).createEl("a", { text: text3, href: task.link, cls: "external-link", attr: { target: "_blank", rel: "noopener" } });
    }
    card.createDiv({ cls: "gb-task-prompt", text: task.prompt.trim() });
  });
}

// src/task-list.ts
var FIELDS = ["prompt", "agent_dir", "profile", "description", "status", "priority", "kind", "link"];
var STATUSES = ["recommended", "idea"];
var PRIORITIES = ["high", "low"];
var KINDS = ["human"];
function parseTasks(data, known) {
  if (data === null || data === void 0) return [];
  if (!Array.isArray(data)) throw new Error("gb-tasks block must be a list of tasks");
  return data.map((entry, i) => {
    const fail = (message) => new Error(`task ${i + 1}: ${message}`);
    if (!entry || typeof entry !== "object") throw fail("not a mapping");
    const extra = Object.keys(entry).find((key) => !FIELDS.includes(key));
    if (extra) throw fail(`unknown field ${extra}`);
    const { prompt, agent_dir: agentDir, profile, description, status, priority, kind, link } = entry;
    if (typeof prompt !== "string" || !prompt.trim()) throw fail("missing prompt");
    if (typeof agentDir !== "string" || !agentDir) throw fail("missing agent_dir");
    if (!known.agentDirs.includes(agentDir)) throw fail(`unknown agent_dir ${agentDir}`);
    if (profile !== void 0 && (typeof profile !== "string" || !known.profiles.includes(profile))) throw fail(`unknown profile ${profile}`);
    if (description !== void 0 && typeof description !== "string") throw fail("description must be text");
    if (status !== void 0 && !STATUSES.includes(status)) throw fail(`unknown status ${status}`);
    if (priority !== void 0 && !PRIORITIES.includes(priority)) throw fail(`unknown priority ${priority}`);
    if (kind !== void 0 && !KINDS.includes(kind)) throw fail(`unknown kind ${kind}`);
    if (kind === "human" && profile !== void 0) throw fail("human task with a profile");
    if (link !== void 0 && (typeof link !== "string" || !/^https?:\/\/\S+$/.test(link))) throw fail("link must be an http(s) URL");
    return {
      prompt,
      agentDir,
      ...profile ? { profile } : {},
      ...description ? { description } : {},
      ...status ? { status } : {},
      ...priority ? { priority } : {},
      ...kind ? { kind } : {},
      ...link ? { link } : {}
    };
  });
}
function taskBlocks(note) {
  const lines = note.split("\n");
  const blocks = [];
  for (let start = 0; start < lines.length; start++) {
    if (lines[start].trim() !== "```gb-tasks") continue;
    const end = lines.findIndex((line, i) => i > start && line.trim() === "```");
    if (end < 0) break;
    blocks.push({ start, end, source: lines.slice(start + 1, end).join("\n") });
    start = end;
  }
  return blocks;
}
function removeTask(note, task, parse, stringify) {
  for (const block of taskBlocks(note)) {
    const entries = parse(block.source);
    if (!Array.isArray(entries)) continue;
    const index = entries.findIndex((entry) => entry?.prompt === task.prompt && entry?.agent_dir === task.agentDir);
    if (index < 0) continue;
    const rest = entries.filter((_, i) => i !== index);
    return replaceBlockBody(note, block.start, block.end, rest.length ? stringify(rest) : "");
  }
  return void 0;
}
var PRIORITY_ORDER = { high: 0, none: 1, low: 2 };
var STATUS_ORDER = { recommended: 0, none: 1, idea: 2 };
function byPriority(tasks) {
  return [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority ?? "none"] - PRIORITY_ORDER[b.priority ?? "none"] || STATUS_ORDER[a.status ?? "none"] - STATUS_ORDER[b.status ?? "none"]
  );
}
function replaceBlockBody(note, fenceStart, fenceEnd, body) {
  const lines = note.split("\n");
  const bodyLines = body ? body.replace(/\n$/, "").split("\n") : [];
  lines.splice(fenceStart + 1, fenceEnd - fenceStart - 1, ...bodyLines);
  return lines.join("\n");
}

// src/agents-view.ts
var AGENTS_VIEW = "galaxy-brain-agents";
var ALL_AGENTS = "*";
var AgentsView = class extends import_obsidian.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.agent = ALL_AGENTS;
    this.scheduleRender = (0, import_obsidian.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return AGENTS_VIEW;
  }
  getDisplayText() {
    return this.agent === ALL_AGENTS ? "Agents" : `${this.agent} agent`;
  }
  getIcon() {
    return "bot";
  }
  getState() {
    return { agent: this.agent };
  }
  async setState(state, result) {
    if (typeof state.agent === "string") this.agent = state.agent;
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      if (file.path.startsWith("agents/") && file.path.endsWith("/TASKS.md")) this.scheduleRender();
    };
    this.registerEvent(this.app.vault.on("create", onChange));
    this.registerEvent(this.app.vault.on("modify", onChange));
    this.registerEvent(this.app.vault.on("delete", onChange));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      onChange(file);
      onChange({ path: oldPath });
    }));
    await this.render();
  }
  async render() {
    const dirs = await this.host.agentDirs();
    const profiles = await this.host.loadProfiles();
    const known = { profiles: profiles.map((profile) => profile.name), agentDirs: dirs };
    const all = !dirs.includes(this.agent);
    const shown = all ? dirs : [this.agent];
    const lists = await Promise.all(shown.map((dir) => this.readTasks(dir, known)));
    const routines = await Promise.all(shown.map((dir) => this.routinesFor(dir)));
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: all ? "All agents" : this.agent });
    const select = header.createEl("select", { cls: "dropdown" });
    select.createEl("option", { text: "All agents", value: ALL_AGENTS }).selected = all;
    for (const dir of dirs) select.createEl("option", { text: dir, value: dir }).selected = dir === this.agent;
    select.onchange = () => void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: select.value } });
    if (all) {
      const list2 = root.createEl("ul");
      shown.forEach((dir, i) => {
        const row = list2.createEl("li", { cls: "gbr-record" });
        this.renderRoutineButtons(row.createSpan({ cls: "gbr-actions" }), dir, routines[i]);
        const link = row.createEl("a", { text: dir, cls: "internal-link", href: "#" });
        link.onclick = (event) => {
          event.preventDefault();
          void this.leaf.setViewState({ type: AGENTS_VIEW, state: { agent: dir } });
        };
        const count = lists[i].tasks.length;
        if (count) row.createSpan({ text: `${count} task${count === 1 ? "" : "s"}`, cls: "gbr-tag" });
      });
    } else {
      const bar = root.createDiv({ cls: "gbr-sync" });
      this.renderRoutineButtons(bar, this.agent, routines[0]);
      const file = this.app.vault.getFileByPath(tasksPath(this.agent));
      if (file) {
        const open = bar.createEl("a", { text: "Open TASKS.md", cls: "internal-link", href: "#" });
        open.onclick = (event) => {
          event.preventDefault();
          void this.app.workspace.openLinkText(file.path, "", event.metaKey || event.ctrlKey);
        };
      }
    }
    for (const { source, error } of lists) {
      if (error) root.createDiv({ cls: "gb-tasks-error", text: `${tasksPath(source)}: ${error}` });
    }
    const tasks = byPriority(lists.flatMap((list2) => list2.tasks));
    renderTaskCards(root, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian.Platform.isDesktopApp ? { launch: (_task, i) => void this.host.confirmTask(tasks[i], () => void this.remove(tasks[i])) } : {},
      remove: (_task, i) => void this.remove(tasks[i])
    });
  }
  /** 🌅 / ⏱️ buttons for the routine files the agent dir has; desktop only. */
  renderRoutineButtons(el, dir, routines) {
    if (!import_obsidian.Platform.isDesktopApp) return;
    for (const routine of routines) {
      const { task, name } = routineLaunch(dir, routine);
      const button = el.createEl("button", { text: routine.label, attr: { "aria-label": `Launch ${dir} with ./${routine.file}` } });
      button.onclick = () => void this.host.confirmTask(task, () => {
      }, name);
    }
  }
  async routinesFor(dir) {
    const present = await Promise.all(ROUTINES.map((routine) => this.app.vault.adapter.exists(`agents/${dir}/${routine.file}`)));
    return ROUTINES.filter((_, i) => present[i]);
  }
  async readTasks(dir, known) {
    const file = this.app.vault.getFileByPath(tasksPath(dir));
    if (!file) return { source: dir, tasks: [] };
    try {
      const blocks = taskBlocks(await this.app.vault.cachedRead(file));
      const tasks = blocks.flatMap((block) => parseTasks((0, import_obsidian.parseYaml)(block.source), known));
      return { source: dir, tasks: tasks.map((task) => ({ ...task, source: dir })) };
    } catch (error) {
      return { source: dir, tasks: [], error: error instanceof Error ? error.message : String(error) };
    }
  }
  async remove(task) {
    const file = this.app.vault.getFileByPath(tasksPath(task.source));
    if (!file) return void new import_obsidian.Notice(`${tasksPath(task.source)} is gone`);
    let found = false;
    await this.app.vault.process(file, (note) => {
      const updated = removeTask(note, task, import_obsidian.parseYaml, import_obsidian.stringifyYaml);
      found = updated !== void 0;
      return updated ?? note;
    });
    if (!found) new import_obsidian.Notice("Task already removed");
  }
};

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
var KIND_LABELS = {
  branches: "Branches",
  issues: "Issues",
  reviews: "Reviews"
};
var STATUS_ORDER2 = {
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
  const known = STATUS_ORDER2[kind];
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
function groupingFor(repo, kind) {
  return kind === "branches" ? `repositories/${repo}/branches/MY_BRANCHES.md` : void 0;
}
function resolveLink(from, link) {
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
    const record = parseRecordPath(resolveLink(path, decodeURI(link[1])));
    if (record?.rest && record.repo === repo && record.kind === kind && !section.names.includes(record.id)) section.names.push(record.id);
  }
  return sections;
}
function groupBySections(records, kind, grouping) {
  const ofKind = records.filter((record) => record.kind === kind);
  const byName = new Map(ofKind.map((record) => [record.name, record]));
  const listed = /* @__PURE__ */ new Set();
  const sections = (grouping ?? []).flatMap((section) => {
    const found = section.names.flatMap((name) => {
      const record = byName.get(name);
      if (!record || listed.has(name)) return [];
      listed.add(name);
      return [record];
    });
    return found.length ? [{ key: section.key, label: section.label, records: found }] : [];
  });
  return { sections, rest: ofKind.filter((record) => !listed.has(record.name)) };
}

// src/launchers.ts
var KEY_LINE = /^(status|agent_dir|name|profile):\s*(.*)$/;
var list = (value) => value.split(",").map((item2) => item2.trim()).filter(Boolean);
function launcherScope(path) {
  const [root, repo, kind, file, ...rest] = path.split("/");
  if (root !== "repositories" || file !== "LAUNCHERS.md" || rest.length || !repo) return null;
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: repo === DEFAULTS_REPO ? null : repo, kind };
}
function parseLaunchers(markdown, scope) {
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
    if (!label || !fields.agent_dir || !prompt) continue;
    launchers.push({
      label,
      ...scope,
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
    (launcher) => (launcher.repo ?? record.repo) === record.repo && launcher.kind === record.kind && (launcher.statuses.includes(record.status) || launcher.statuses.length === 0 && record.status !== UNTRACKED)
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

// ../site/src/lib/repository-tabs.ts
var REPOSITORY_TABS = [
  { id: "branches", label: "My branches" },
  { id: "issues", label: "My issues" },
  { id: "reviews", label: "My reviews" },
  { id: "my-drafts", label: "My drafts" },
  { id: "conflicting", label: "Conflicting" },
  { id: "new-prs", label: "New PRs" },
  { id: "undrafted-prs", label: "Out of draft" },
  { id: "new-issues", label: "New issues" }
];
var FORK_OWNER = "jmchilton";
var GITHUB_LISTS = {
  "my-drafts": { list: "pulls", query: (me) => `is:pr is:open author:${me} draft:true`, title: "My open draft PRs on GitHub" },
  // GitHub has no conflict filter.
  conflicting: { list: "pulls", query: (me) => `is:pr is:open author:${me}`, title: "My open PRs on GitHub (it can't filter by conflicts)" },
  "new-prs": { list: "pulls", query: () => "is:pr is:open sort:created-desc", title: "Open PRs, newest first, on GitHub" },
  // GitHub can't sort by ready-for-review time; recently updated non-drafts is the closest.
  "undrafted-prs": { list: "pulls", query: () => "is:pr is:open draft:false sort:updated-desc", title: "Open non-draft PRs, recently updated, on GitHub" },
  "new-issues": { list: "issues", query: () => "is:issue is:open sort:created-desc", title: "Open issues, newest first, on GitHub" }
};
function githubListUrl(owner, repo, tab, me = "@me") {
  const { list: list2, query } = GITHUB_LISTS[tab];
  return `https://github.com/${owner}/${repo}/${list2}?q=${encodeURIComponent(query(me))}`;
}
function githubListTitle(tab) {
  return GITHUB_LISTS[tab].title;
}
var MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;
function githubLinks(body) {
  return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1], url: match[2] }));
}
var escapeRegExp = (text2) => text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function upstreamOwner(repo, bodies) {
  const pattern = new RegExp(`^https://github\\.com/([^/]+)/${escapeRegExp(repo)}/(pull|issues)/`);
  const counts = /* @__PURE__ */ new Map();
  for (const link of bodies.flatMap(githubLinks)) {
    const owner = pattern.exec(link.url)?.[1];
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([owner]) => owner);
  return ranked.find((owner) => owner !== FORK_OWNER) ?? ranked[0] ?? "galaxyproject";
}

// src/record-links.ts
var BRANCHES_ON_UPSTREAM = /* @__PURE__ */ new Set(["foundry"]);
function githubUrl(record, body) {
  const all = githubLinks(body);
  const id = escapeRegExp(record.name);
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

// src/record-agents.ts
var SYNC_PROCESSES = {
  issues: "PROCESS_SYNC_ISSUE_STATE.md",
  reviews: "PROCESS_SYNC_REVIEW_STATE.md"
};
var SYNC_PROFILE = "Sonnet (medium)";
function parseRecordAgents(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const map = {};
  for (const [repo, kinds] of Object.entries(data)) {
    map[repo] = {};
    if (!kinds || typeof kinds !== "object") continue;
    for (const [kind, agent] of Object.entries(kinds)) {
      if (RECORD_KINDS.includes(kind) && typeof agent === "string") map[repo][kind] = agent;
    }
  }
  return map;
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
    if (!ref || (repo === void 0 ? ref.repo === DEFAULTS_REPO : ref.repo !== repo)) continue;
    let record = records.get(ref.dir);
    if (!record) {
      record = { ...ref, title: ref.name, mtime: 0, created: file.ctime };
      records.set(ref.dir, record);
    }
    record.mtime = Math.max(record.mtime, file.mtime);
    record.created = Math.min(record.created, file.ctime);
    if (file.path === `${ref.dir}/index.md`) {
      record.indexPath = file.path;
      record.indexMtime = file.mtime;
      record.title = recordTitle(readIndex(file.path)) ?? ref.name;
    }
  }
  return [...records.values()];
}
function recentRecords(records, { by, kind, limit = 25 }) {
  const time = (record) => by === "created" ? record.created : record.indexMtime;
  return records.filter((record) => (!kind || record.kind === kind) && time(record) !== void 0).sort((a, b) => time(b) - time(a)).slice(0, limit);
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
var import_obsidian2 = require("obsidian");

// src/github-feed.ts
var FIELDS2 = "number title url createdAt author { login }";
var FEED_QUERY = `query($owner: String!, $name: String!, $mine: String!) {
  repository(owner: $owner, name: $name) {
    created: pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} isDraft headRefName }
    }
    updated: pullRequests(states: OPEN, first: 60, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} isDraft headRefName timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) { nodes { ... on ReadyForReviewEvent { createdAt } } } }
    }
    issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS2} }
    }
  }
  mine: search(query: $mine, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { ${FIELDS2} isDraft headRefName mergeable } }
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
function groupRecords(records, kind, grouping) {
  const { sections, rest } = groupBySections(records, kind, grouping);
  const groups = sections.map(({ key, label, records: records2 }) => ({ status: key, label, collapsed: false, records: records2 }));
  return [...groups, ...repositorySections(rest).find((section) => section.kind === kind)?.groups ?? []];
}

// src/repository-view.ts
var REPOSITORY_VIEW = "galaxy-brain-repository";
var ALL_REPOS = "*";
var RECENT = "recent";
var RECENT_TAB = { id: RECENT, label: "Recent" };
var isRecordTab = (tab) => RECORD_KINDS.includes(tab);
var isMine = (tab) => tab === "my-drafts" || tab === "conflicting";
var RECENT_BY = { created: "Newest", updated: "Recently updated" };
var RECORD_ICONS = { branches: "git-branch", reviews: "file-search", issues: "file-text" };
var RECORD_NOUNS = { branches: "branch", reviews: "review", issues: "issue" };
var FEED_KEYS = {
  "new-prs": "newPrs",
  "undrafted-prs": "undraftedPrs",
  "new-issues": "issues",
  "my-drafts": "myDrafts",
  conflicting: "conflicting"
};
var RECHECK_MS = 5e3;
var RepositoryView = class extends import_obsidian2.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
    this.repo = "galaxy";
    this.tab = "branches";
    this.recentBy = "created";
    /** GitHub feeds by repository, fetched on first view and on refresh. */
    this.feeds = /* @__PURE__ */ new Map();
    this.launchers = [];
    /** Status groups toggled away from their default, kept across re-renders. */
    this.toggled = /* @__PURE__ */ new Set();
    this.scheduleRender = (0, import_obsidian2.debounce)(() => void this.render(), 300, true);
  }
  getViewType() {
    return REPOSITORY_VIEW;
  }
  getDisplayText() {
    return this.repo === ALL_REPOS ? "Recent records" : `${this.repo} records`;
  }
  getIcon() {
    return "library";
  }
  getState() {
    return { repo: this.repo, tab: this.tab, recentBy: this.recentBy, ...this.recentKind ? { recentKind: this.recentKind } : {} };
  }
  async setState(state, result) {
    if (state.repo && state.repo !== this.repo) {
      this.repo = state.repo;
      this.toggled.clear();
    }
    if (state.tab && (state.tab === RECENT || REPOSITORY_TABS.some((tab) => tab.id === state.tab))) this.tab = state.tab;
    else if (state.tab === "records") this.tab = "branches";
    if (state.recentBy && state.recentBy in RECENT_BY) this.recentBy = state.recentBy;
    if ("recentKind" in state) this.recentKind = RECORD_KINDS.find((kind) => kind === state.recentKind);
    await super.setState(state, result);
    await this.render();
  }
  async onOpen() {
    const onChange = (file) => {
      const grouped = isRecordTab(this.tab) && file.path === groupingFor(this.repo, this.tab);
      if (grouped || file.path.startsWith(this.prefix())) this.scheduleRender();
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
    const files = this.app.vault.getMarkdownFiles().map(({ path, stat }) => ({ path, mtime: stat.mtime, ctime: stat.ctime }));
    const all = this.repo === ALL_REPOS;
    const bodies = all ? /* @__PURE__ */ new Map() : await this.readIndexes(files.map((file) => file.path));
    const records = collectRecords(files, all ? void 0 : this.repo, (path) => bodies.get(path));
    this.launchers = import_obsidian2.Platform.isDesktopApp ? await this.host.loadLaunchers() : [];
    const launchable = new Set(records.filter((record) => this.canLaunch(record)).map((record) => record.dir));
    if (this.embed) this.removeChild(this.embed);
    this.embed = this.addChild(new import_obsidian2.Component());
    const root = this.contentEl;
    root.empty();
    root.addClass("galaxy-brain-repository");
    const header = root.createDiv({ cls: "gbr-header" });
    header.createEl("h1", { text: all ? "All repositories" : this.repo });
    const select = header.createEl("select", { cls: "dropdown" });
    select.createEl("option", { text: "All repositories", value: ALL_REPOS }).selected = all;
    for (const name of repositoryNames(files)) {
      select.createEl("option", { text: name, value: name }).selected = name === this.repo;
    }
    select.onchange = () => void this.leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo: select.value, tab: this.tab } });
    const recordTabs = REPOSITORY_TABS.filter((tab) => isRecordTab(tab.id));
    const githubTabs = import_obsidian2.Platform.isDesktopApp ? REPOSITORY_TABS.filter((tab) => !isRecordTab(tab.id)) : [];
    const tabs = all ? [RECENT_TAB] : [...recordTabs, RECENT_TAB, ...githubTabs];
    const current = tabs.some((tab) => tab.id === this.tab) ? this.tab : tabs[0].id;
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
    if (current === RECENT) await this.renderRecent(root, records, bodies, launchable, all);
    else if (isRecordTab(current)) {
      await this.renderSync(root, current);
      this.renderRecords(root, current, records, bodies, launchable, await this.readQueue(current));
    } else this.renderFeed(root, current, records, bodies, launchable, header);
  }
  async renderRecent(root, records, bodies, launchable, all) {
    const controls = root.createDiv({ cls: "gbr-tabs" });
    const choose = (options, value, onChange) => {
      const select = controls.createEl("select", { cls: "dropdown" });
      for (const [key, label] of Object.entries(options)) {
        select.createEl("option", { text: label, value: key }).selected = key === value;
      }
      select.onchange = () => {
        onChange(select.value);
        this.app.workspace.requestSaveLayout();
        void this.render();
      };
    };
    choose(RECENT_BY, this.recentBy, (by) => this.recentBy = by);
    const kinds = { all: "All kinds", ...KIND_LABELS };
    choose(kinds, this.recentKind ?? "all", (kind) => this.recentKind = kind === "all" ? void 0 : kind);
    const recent = recentRecords(records, { by: this.recentBy, kind: this.recentKind });
    const unread = recent.flatMap((record) => record.indexPath && !bodies.has(record.indexPath) ? [record.indexPath] : []);
    for (const [path, body] of await this.readIndexes(unread)) bodies.set(path, body);
    if (recent.length === 0) root.createEl("p", { text: "No records.", cls: "gbr-empty" });
    const list2 = root.createEl("ul");
    for (const record of recent) {
      const body = record.indexPath && bodies.get(record.indexPath) || "";
      const tags = [...all ? [record.repo] : [], ...this.recentKind ? [] : [RECORD_NOUNS[record.kind]], statusLabel(record.status)];
      this.renderRecord(list2, { ...record, title: recordTitle(body) ?? record.title }, body, launchable.has(record.dir), {
        time: this.recentBy === "created" ? record.created : record.indexMtime,
        tags
      });
    }
  }
  renderRecords(root, kind, records, bodies, launchable, queue) {
    const groups = groupRecords(records, kind, queue?.sections);
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
    if (queue) void this.renderQueue(root, queue);
  }
  /** 🔄 Sync button and the last SYNC_REPORT.md, above an issues or reviews tab. */
  async renderSync(root, kind) {
    if (!SYNC_PROCESSES[kind]) return;
    const agent = import_obsidian2.Platform.isDesktopApp ? await this.host.syncAgent(this.repo, kind) : void 0;
    if (agent) {
      const bar = root.createDiv({ cls: "gbr-sync" });
      const button = bar.createEl("button", { text: `\u{1F504} Sync ${kind}`, attr: { "aria-label": `Launch ${agent} to sync ${kind}` } });
      button.onclick = () => void this.host.launchSync(this.repo, kind, agent);
      bar.createSpan({ cls: "gbr-time", text: `${agent} \xB7 ${SYNC_PROFILE}` });
    }
    const report = this.app.vault.getFileByPath(`repositories/${this.repo}/${kind}/SYNC_REPORT.md`);
    if (report) void this.renderQueue(root, { path: report.path, text: await this.app.vault.cachedRead(report), sections: [] });
  }
  /** A note rendered inline: the queue file below its groups, or the sync report. */
  async renderQueue(root, queue) {
    const section = root.createDiv({ cls: "gbr-queue" });
    const heading = section.createDiv({ cls: "gbr-queue-heading" });
    heading.createSpan({ text: queue.path.split("/").pop() });
    const open = heading.createEl("a", { text: "Open note", cls: "internal-link", href: "#" });
    const body = section.createDiv({ cls: "gbr-queue-body markdown-rendered" });
    const openLink = (event, link) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(link, queue.path, event.metaKey || event.ctrlKey);
    };
    open.onclick = (event) => openLink(event, queue.path);
    body.onclick = (event) => {
      const link = event.target.closest("a.internal-link");
      const href = link?.getAttribute("data-href") ?? link?.getAttribute("href");
      if (href) openLink(event, href);
    };
    await import_obsidian2.MarkdownRenderer.render(this.app, queue.text, body, queue.path, this.embed);
  }
  renderFeed(root, tab, records, bodies, launchable, header) {
    const state = this.feedState();
    const refresh = header.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Refresh from GitHub" } });
    (0, import_obsidian2.setIcon)(refresh, "refresh-cw");
    refresh.onclick = () => void this.fetchFeeds(true);
    if (state.fetchedAt) header.createSpan({ text: `fetched ${timeAgo(state.fetchedAt, Date.now())}`, cls: "gbr-time" });
    const owner = upstreamOwner(this.repo, [...bodies.values()]);
    root.createEl("p", { cls: "gbr-github-link" }).createEl("a", {
      text: githubListTitle(tab),
      href: githubListUrl(owner, this.repo, tab),
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
      (0, import_obsidian2.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (matched.length === 0) {
      const untracked = untrackedRecord(this.repo, isIssue ? "issues" : "reviews", item2.number);
      if (this.canLaunch(untracked)) action("bot", "Launch agent (no record yet)", () => void this.host.pickLauncher(untracked));
    }
    for (const record of matched) {
      const kind = RECORD_NOUNS[record.kind];
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
  /** The repository's queue file for this kind, if it has one. */
  async readQueue(kind) {
    const path = groupingFor(this.repo, kind);
    const file = path ? this.app.vault.getFileByPath(path) : null;
    if (!file) return void 0;
    const text2 = await this.app.vault.cachedRead(file);
    return { path: file.path, text: text2, sections: parseGrouping(text2, file.path, this.repo, kind) };
  }
  /** Vault path prefix of the records this view shows. */
  prefix() {
    return this.repo === ALL_REPOS ? "repositories/" : `repositories/${this.repo}/`;
  }
  async readIndexes(paths) {
    const prefix = this.prefix();
    const indexes = paths.filter((path) => path.startsWith(prefix) && path.endsWith("/index.md"));
    const bodies = /* @__PURE__ */ new Map();
    await Promise.all(indexes.map(async (path) => {
      const file = this.app.vault.getFileByPath(path);
      if (file) bodies.set(path, await this.app.vault.cachedRead(file));
    }));
    return bodies;
  }
  renderRecord(list2, record, body, launchable, { time = record.mtime, tags = [] } = {}) {
    const item2 = list2.createEl("li", { cls: "gbr-record" });
    const actions = item2.createSpan({ cls: "gbr-actions" });
    const link = item2.createEl("a", { text: record.title, cls: "internal-link", href: "#" });
    link.onclick = (event) => {
      event.preventDefault();
      void this.app.workspace.openLinkText(record.indexPath ?? record.dir, "", event.metaKey || event.ctrlKey);
    };
    if (record.title !== record.name) item2.createSpan({ text: record.name, cls: "gbr-name" });
    for (const tag of tags) item2.createSpan({ text: tag, cls: "gbr-tag" });
    item2.createSpan({ text: timeAgo(time, Date.now()), cls: "gbr-time" });
    const action = (icon, label, onClick) => {
      const button = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": label } });
      (0, import_obsidian2.setIcon)(button, icon);
      button.onclick = onClick;
    };
    if (launchable) action("bot", "Launch agent", () => void this.host.pickLauncher(record));
    action("github", "Open on GitHub", () => window.open(githubUrl(record, body)));
    const worktree = import_obsidian2.Platform.isDesktopApp ? this.host.worktreeFor(record, body) : null;
    if (worktree) action("code", "Open with Code", () => this.host.openInCode(worktree));
  }
  canLaunch(record) {
    return launchersFor(this.launchers, record).length > 0;
  }
};

// src/main.ts
var PROFILES_PATH = "agents/_shared/AGENT_PROFILES.yml";
var RECORD_AGENTS_PATH = "agents/_shared/RECORD_AGENTS.yml";
var LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
var CLI_BIN_DIRS = ["/usr/local/bin", "/opt/homebrew/bin", "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"];
var GalaxyBrainPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.recordActions = /* @__PURE__ */ new WeakMap();
  }
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian3.TFile)) return;
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
    this.addRibbonIcon("library", "Open a repository's records", () => void this.pickRepository());
    this.addRibbonIcon("layers", "All repository records", () => void this.openRepository(ALL_REPOS));
    this.addCommand({
      id: "open-repository",
      name: "Open a repository's records",
      callback: () => void this.pickRepository()
    });
    this.addCommand({
      id: "open-recent-records",
      name: "All repository records",
      callback: () => void this.openRepository(ALL_REPOS)
    });
    this.registerView(AGENTS_VIEW, (leaf) => new AgentsView(leaf, this));
    this.addRibbonIcon("bot", "Agents: routines and tasks", () => void this.openAgents());
    this.addCommand({
      id: "open-agents",
      name: "Agents: routines and tasks",
      callback: () => void this.openAgents()
    });
    this.registerMarkdownCodeBlockProcessor("gb-tasks", (source, el, ctx) => this.renderTasks(source, el, ctx));
    if (!import_obsidian3.Platform.isDesktopApp) return;
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
      new import_obsidian3.Notice(`Copied ${file.name}`);
    } catch (error) {
      new import_obsidian3.Notice(`Could not copy ${file.name}: ${error}`);
    }
  }
  /** Code, GitHub and agent icons in the header of notes inside a repository record. */
  refreshRecordActions() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian3.MarkdownView)) continue;
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
      if (error) new import_obsidian3.Notice(`Could not run the VS Code \`code\` CLI: ${error.message}`, 1e4);
    });
  }
  runGh(args) {
    const { execFile } = require("child_process");
    const PATH = [...CLI_BIN_DIRS, process.env.PATH].join(":");
    return new Promise((resolve, reject) => {
      execFile("gh", args, { env: { ...process.env, PATH }, timeout: 6e4, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error((stderr || error.message).trim()));
        else resolve(stdout);
      });
    });
  }
  async openRecordInCode(record) {
    const worktree = this.worktreeFor(record, await this.indexBody(record));
    if (worktree) this.openInCode(worktree);
    else new import_obsidian3.Notice(`No worktree on disk for ${record.name}`);
  }
  async openRecordOnGithub(record) {
    window.open(githubUrl(record, await this.indexBody(record)));
  }
  async loadLaunchers() {
    const files = this.app.vault.getMarkdownFiles().flatMap((file) => {
      const scope = launcherScope(file.path);
      return scope ? [{ file, scope }] : [];
    }).sort((a, b) => Number(a.scope.repo === null) - Number(b.scope.repo === null));
    const parsed = await Promise.all(files.map(async ({ file, scope }) => parseLaunchers(await this.app.vault.cachedRead(file), scope)));
    return parsed.flat();
  }
  async launchersFor(record) {
    return launchersFor(await this.loadLaunchers(), record);
  }
  async openRepository(repo) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: REPOSITORY_VIEW, state: { repo }, active: true });
  }
  async openAgents() {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: AGENTS_VIEW, state: { agent: ALL_AGENTS }, active: true });
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
    if (!import_obsidian3.Platform.isDesktopApp) return;
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
      new import_obsidian3.Notice(`No launchers for ${record.repo}/${record.kind} (${record.status}) in repositories/${record.repo}/${record.kind}/LAUNCHERS.md`);
      return;
    }
    new LauncherSuggest(this.app, launchers, (launcher) => void this.confirmLaunch(launcher, record)).open();
  }
  async loadProfiles() {
    try {
      const profiles = parseProfiles((0, import_obsidian3.parseYaml)(await this.app.vault.adapter.read(PROFILES_PATH)));
      if (profiles.length > 0) return profiles;
    } catch (error) {
      new import_obsidian3.Notice(`Could not read ${PROFILES_PATH}: ${error}`);
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
    if (adapter instanceof import_obsidian3.FileSystemAdapter) return adapter.getBasePath();
    new import_obsidian3.Notice("Launching agents needs the desktop app");
    return null;
  }
  async syncAgent(repo, kind) {
    try {
      return parseRecordAgents((0, import_obsidian3.parseYaml)(await this.app.vault.adapter.read(RECORD_AGENTS_PATH)))[repo]?.[kind];
    } catch {
      return void 0;
    }
  }
  async launchSync(repo, kind, agentDir) {
    const prompt = `Sync ${repo} ${kind} per agents/_shared/${SYNC_PROCESSES[kind]} (${repo} only).`;
    await this.confirmTask({ prompt, agentDir, profile: SYNC_PROFILE }, () => {
    });
  }
  /** Agent dirs with a CLAUDE.md, not `_`-prefixed. */
  async agentDirs() {
    const { folders } = await this.app.vault.adapter.list("agents");
    const names = folders.map((folder) => folder.split("/").pop()).filter((name) => !name.startsWith("_"));
    const withClaude = await Promise.all(names.map((name) => this.app.vault.adapter.exists(`agents/${name}/CLAUDE.md`)));
    return names.filter((_, i) => withClaude[i]).sort();
  }
  /** Cards for a ```gb-tasks block: 🚀 launches (and removes on success), ✖ removes. */
  async renderTasks(source, el, ctx) {
    const profiles = await this.loadProfiles();
    let raw;
    let tasks;
    try {
      raw = (0, import_obsidian3.parseYaml)(source);
      tasks = parseTasks(raw, { profiles: profiles.map((p) => p.name), agentDirs: await this.agentDirs() });
    } catch (error) {
      el.createDiv({ cls: "gb-tasks-error", text: `gb-tasks: ${error instanceof Error ? error.message : error}` });
      return;
    }
    const remove = async (index) => {
      const file = this.app.vault.getFileByPath(ctx.sourcePath);
      const section = ctx.getSectionInfo(el);
      if (!file || !section) return void new import_obsidian3.Notice("Could not locate this gb-tasks block");
      const rest = raw.filter((_, i) => i !== index);
      await this.app.vault.process(
        file,
        (note) => replaceBlockBody(note, section.lineStart, section.lineEnd, rest.length ? (0, import_obsidian3.stringifyYaml)(rest) : "")
      );
    };
    renderTaskCards(el, tasks, {
      defaultProfile: profiles[0]?.name ?? "",
      ...import_obsidian3.Platform.isDesktopApp ? { launch: (task, index) => void this.confirmTask(task, () => void remove(index)) } : {},
      remove: (_task, index) => void remove(index)
    });
  }
  /** Launch dialog for a task; launched runs once the agent starts. */
  async confirmTask(task, launched, name = task.agentDir) {
    const vaultRoot = this.vaultRoot();
    if (!vaultRoot) return;
    const profiles = await this.loadProfiles();
    const launcher = { label: "Task", repo: null, kind: "branches", statuses: [], agentDir: task.agentDir, name, prompt: task.prompt, ...task.profile ? { profile: task.profile } : {} };
    new LaunchModal(this.app, launcher, {
      profiles,
      profile: defaultProfile(profiles, launcher),
      name: launcher.name,
      prompt: task.prompt,
      launch: (profile, name2, prompt) => this.launch(vaultRoot, launcher, profile, name2, prompt, launched)
    }).open();
  }
  launch(vaultRoot, launcher, profile, name, prompt, launched) {
    const { execFile } = require("child_process");
    const started = new import_obsidian3.Notice(`Launching ${profile.name} in ${launcher.agentDir}\u2026`, 0);
    execFile(
      `${vaultRoot}/${LAUNCH_SCRIPT}`,
      [launcher.agentDir, profile.agent, name, prompt, ...profileArgs(profile)],
      { timeout: 18e4 },
      (error, stdout, stderr) => {
        started.hide();
        if (error) new import_obsidian3.Notice(`Launch failed: ${(stderr || error.message).trim()}`, 15e3);
        else {
          new import_obsidian3.Notice(stdout.trim(), 1e4);
          launched?.();
        }
      }
    );
  }
};
var LauncherSuggest = class extends import_obsidian3.FuzzySuggestModal {
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
var ChoiceSuggest = class extends import_obsidian3.FuzzySuggestModal {
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
var LaunchModal = class extends import_obsidian3.Modal {
  constructor(app, launcher, details) {
    super(app);
    this.launcher = launcher;
    this.details = details;
  }
  onOpen() {
    const { launcher } = this;
    let { name, prompt, profile } = this.details;
    this.setTitle(`${launcher.label} in ${launcher.agentDir}`);
    new import_obsidian3.Setting(this.contentEl).setName("Agent name").addText(
      (text2) => text2.setValue(name).onChange((value) => name = value)
    );
    new import_obsidian3.Setting(this.contentEl).setName("Prompt").addTextArea((area) => {
      area.setValue(prompt).onChange((value) => prompt = value);
      area.inputEl.rows = 6;
    }).settingEl.addClass("galaxy-brain-launch-prompt");
    new import_obsidian3.Setting(this.contentEl).addDropdown((dropdown) => {
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
